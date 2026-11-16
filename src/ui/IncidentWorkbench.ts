/**
 * Mustarred Company Simulator - Incident Workbench
 *
 * Renders one incident consultation and assembles the player's response plan.
 * It is deliberately generic: it reads an IncidentInteractionSpec and draws
 * whatever controls that spec declares (evidence, requests, approach, measures,
 * assignment slots, free-text order). All incident content lives in data.
 *
 * The component never decides consequences. It only reports the plan the player
 * committed, and it refuses to authorise a plan the evaluator calls incoherent.
 */

import type {
  ContainmentAction,
  DirectiveInterpretation,
  EvidenceField,
  EvidenceRecord,
  EvidenceRequest,
  IncidentInteractionSpec,
  ResponsePlan,
} from '../incidents/interactionModel.ts';
import { interpretDirective } from '../incidents/directiveInterpreter.ts';
import { findPlanProblems } from '../incidents/responseEvaluator.ts';

export type WorkbenchView = 'situation' | 'evidence' | 'order' | 'review';

export interface WorkbenchCallbacks {
  readonly onCommit: (plan: ResponsePlan) => void;
  readonly onStepAway: () => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatClock(startLabel: string, minutes: number): string {
  const [rawHours, rawMinutes] = startLabel.split(':');
  const base = Number(rawHours) * 60 + Number(rawMinutes) + minutes;
  const hours = Math.floor(base / 60) % 24;
  const mins = base % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function renderFields(fields: readonly EvidenceField[]): string {
  return fields
    .map(
      (field) => `
        <div class="bw-field${field.tone === 'alert' ? ' is-alert' : field.tone === 'ok' ? ' is-ok' : ''}">
          <dt>${escapeHtml(field.label)}</dt>
          <dd${field.mono ? ' class="bw-mono"' : ''}>${escapeHtml(field.value)}</dd>
        </div>`
    )
    .join('');
}

export class IncidentWorkbench {
  private readonly spec: IncidentInteractionSpec;
  private readonly callbacks: WorkbenchCallbacks;
  private root: HTMLElement | null = null;

  private view: WorkbenchView = 'situation';
  private openRecordId: string | null = null;
  private readonly inspected: Set<string>;
  private readonly completedRequests = new Set<string>();
  private lastRequestReply: EvidenceRequest | null = null;

  private strategyId: string | null = null;
  private readonly actionIds = new Set<string>();
  private readonly slotValues: Record<string, string> = {};
  private directiveText = '';
  private interpretation: DirectiveInterpretation | null = null;
  private readonly resolvedClauses = new Set<string>();
  private assignmentOpen = false;
  private directiveDirty = false;
  private refocusDirective = false;

  constructor(spec: IncidentInteractionSpec, callbacks: WorkbenchCallbacks) {
    this.spec = spec;
    this.callbacks = callbacks;
    this.inspected = new Set(
      spec.evidence.filter((record) => record.inspectedByDefault).map((record) => record.id)
    );
    for (const slot of spec.slots) {
      this.slotValues[slot.id] = slot.defaultOptionId;
    }
  }

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------

  private get minutesSpent(): number {
    const inspectionCost = this.spec.evidence
      .filter((record) => this.inspected.has(record.id))
      .reduce((sum, record) => sum + record.inspectMinutes, 0);
    const requestCost = this.spec.requests
      .filter((request) => this.completedRequests.has(request.id))
      .reduce((sum, request) => sum + request.costMinutes, 0);
    return inspectionCost + requestCost;
  }

  private get closeAtMinute(): number {
    const strategy = this.spec.strategies.find((entry) => entry.id === this.strategyId);
    return this.minutesSpent + (strategy?.delayMinutes ?? 0);
  }

  private buildPlan(): ResponsePlan {
    const interpretation =
      this.interpretation ??
      interpretDirective(this.directiveText, {
        lexicon: this.spec.lexicon,
        selectedActionIds: Array.from(this.actionIds),
        selectedStrategyId: this.strategyId ?? undefined,
        resolvedClauseTexts: Array.from(this.resolvedClauses),
      });

    return {
      incidentId: this.spec.incidentId,
      strategyId: this.strategyId ?? '',
      actionIds: Array.from(this.actionIds),
      slotValues: { ...this.slotValues },
      directiveText: this.directiveText,
      interpretation,
      inspectedRecordIds: Array.from(this.inspected),
      completedRequestIds: Array.from(this.completedRequests),
      minutesSpent: this.minutesSpent,
    };
  }

  private refreshInterpretation(): void {
    this.interpretation = interpretDirective(this.directiveText, {
      lexicon: this.spec.lexicon,
      selectedActionIds: Array.from(this.actionIds),
      selectedStrategyId: this.strategyId ?? undefined,
      resolvedClauseTexts: Array.from(this.resolvedClauses),
    });

    // A typed order that only makes sense under one approach adopts it, so the
    // player does not have to repeat themselves in the controls. An approach
    // already chosen is never replaced silently.
    if (!this.strategyId && this.interpretation.strategyId) {
      this.strategyId = this.interpretation.strategyId;
    }

    this.directiveDirty = false;
  }

  /** Records the player's written order asked for are pulled straight away, at a cost. */
  private applyDirectiveRequests(): void {
    const interpretation = this.interpretation;
    if (!interpretation) {
      return;
    }
    let newest: EvidenceRequest | null = null;
    for (const requestId of interpretation.requestIds) {
      if (this.completedRequests.has(requestId)) {
        continue;
      }
      const request = this.spec.requests.find((entry) => entry.id === requestId);
      if (!request) {
        continue;
      }
      this.completedRequests.add(request.id);
      for (const recordId of request.unlocksRecordIds) {
        this.inspected.add(recordId);
      }
      newest = request;
    }
    this.lastRequestReply = newest;
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  public mount(container: HTMLElement): void {
    this.root = document.createElement('div');
    this.root.className = 'modal-dialog incident-workbench-dialog';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', `${this.spec.title} — consultation with ${this.spec.colleague.name}`);
    container.appendChild(this.root);

    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.addEventListener('change', (event) => this.handleChange(event));
    this.root.addEventListener('input', (event) => this.handleInput(event));
    this.root.addEventListener('keydown', (event) => this.handleKeyDown(event));

    this.render();
  }

  public destroy(): void {
    this.root?.remove();
    this.root = null;
  }

  // --------------------------------------------------------------------------
  // EVENT HANDLING
  // --------------------------------------------------------------------------

  private handleClick(event: Event): void {
    const clicked = event.target as HTMLElement | null;
    // Radio and checkbox inputs are handled on `change`; a click on the label
    // would otherwise fire this handler twice for the same toggle.
    if (clicked?.tagName === 'INPUT' && (clicked as HTMLInputElement).type !== 'text') {
      return;
    }
    const target = clicked?.closest<HTMLElement>('[data-action]');
    if (!target) {
      return;
    }
    const action = target.dataset.action ?? '';
    const id = target.dataset.id ?? '';

    switch (action) {
      case 'view':
        this.view = id as WorkbenchView;
        this.openRecordId = null;
        this.render();
        break;
      case 'open-record':
        this.openRecordId = id;
        if (!this.inspected.has(id)) {
          this.inspected.add(id);
        }
        this.render();
        break;
      case 'close-record':
        this.openRecordId = null;
        this.render();
        break;
      case 'complete-request': {
        const request = this.spec.requests.find((entry) => entry.id === id);
        if (request && !this.completedRequests.has(request.id)) {
          this.completedRequests.add(request.id);
          for (const recordId of request.unlocksRecordIds) {
            this.inspected.add(recordId);
          }
          this.lastRequestReply = request;
          this.render();
        }
        break;
      }
      case 'drop-action':
        this.actionIds.delete(id);
        this.refreshInterpretation();
        this.render();
        break;
      case 'clear-directive':
        this.directiveText = '';
        this.interpretation = null;
        this.directiveDirty = false;
        this.render();
        break;
      case 'use-example': {
        const example = this.spec.directive.examples[Number(id)];
        if (example) {
          this.directiveText = example;
          this.refreshInterpretation();
          this.applyDirectiveRequests();
          this.refocusDirective = true;
          this.render();
        }
        break;
      }
      case 'interpret':
        this.refreshInterpretation();
        this.applyDirectiveRequests();
        this.refocusDirective = true;
        this.render();
        break;
      case 'clarify': {
        const issue = this.interpretation?.issues[Number(id)];
        const optionId = target.dataset.option ?? '';
        const option = issue?.options?.find((entry) => entry.id === optionId);
        if (issue && option) {
          for (const actionId of option.actionIds) {
            this.actionIds.add(actionId);
          }
          if (issue.clauseText) {
            this.resolvedClauses.add(issue.clauseText);
          }
          this.refreshInterpretation();
          this.render();
        }
        break;
      }
      case 'toggle-assignment':
        this.assignmentOpen = !this.assignmentOpen;
        this.render();
        break;
      case 'review': {
        if (this.directiveText.trim() && this.directiveDirty) {
          this.refreshInterpretation();
          this.applyDirectiveRequests();
        }
        this.view = 'review';
        this.directiveDirty = false;
        this.render();
        break;
      }
      case 'authorize': {
        if (this.directiveText.trim() && this.directiveDirty) {
          this.refreshInterpretation();
          this.applyDirectiveRequests();
        }
        const plan = this.buildPlan();
        if (findPlanProblems(this.spec, plan).length > 0) {
          this.view = 'review';
          this.render();
          return;
        }
        this.callbacks.onCommit(plan);
        break;
      }
      case 'step-away':
        this.callbacks.onStepAway();
        break;
      default:
        break;
    }
  }

  private handleChange(event: Event): void {
    const element = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!element) {
      return;
    }

    if (element.tagName === 'SELECT') {
      const slotId = (element as HTMLSelectElement).dataset.slot;
      if (slotId) {
        this.slotValues[slotId] = element.value;
        this.render();
      }
      return;
    }

    const input = element as HTMLInputElement;
    if (input.type === 'radio' && input.name === 'bw-strategy') {
      this.strategyId = input.value;
      if (this.interpretation) {
        this.refreshInterpretation();
      }
      this.render();
      return;
    }

    if (input.type === 'checkbox') {
      if (input.checked) {
        this.actionIds.add(input.value);
      } else {
        this.actionIds.delete(input.value);
      }
      if (this.interpretation) {
        this.refreshInterpretation();
      }
      this.render();
    }
  }

  private handleInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement | null;
    if (input?.id === 'bw-directive-input') {
      this.directiveText = input.value;
      this.directiveDirty = true;
    }
  }

  private handleKeyDown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const target = keyboardEvent.target as HTMLElement | null;
    if (target?.id === 'bw-directive-input' && keyboardEvent.key === 'Enter' && (keyboardEvent.metaKey || keyboardEvent.ctrlKey)) {
      keyboardEvent.preventDefault();
      this.refreshInterpretation();
      this.applyDirectiveRequests();
      this.render();
    }
  }

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  private render(): void {
    if (!this.root) {
      return;
    }
    const scrollTop = this.root.querySelector('.bw-body')?.scrollTop ?? 0;

    this.root.innerHTML = `
      ${this.renderHeader()}
      ${this.renderNav()}
      <div class="bw-body" tabindex="0">
        ${this.renderBody()}
      </div>
      ${this.renderFooter()}
    `;

    const body = this.root.querySelector<HTMLElement>('.bw-body');
    if (body) {
      body.scrollTop = scrollTop;
    }
    const directive = this.root.querySelector<HTMLTextAreaElement>('#bw-directive-input');
    if (directive && this.directiveText) {
      directive.value = this.directiveText;
      if (this.refocusDirective) {
        directive.focus();
        directive.setSelectionRange(directive.value.length, directive.value.length);
      }
    }
    this.refocusDirective = false;
  }

  private renderHeader(): string {
    const { colleague, clock } = this.spec;
    return `
      <div class="modal-header it bw-header">
        <div class="dept-indicator">
          <div class="colleague-avatar" aria-hidden="true">${escapeHtml(colleague.initials)}</div>
          <div class="colleague-meta">
            <span class="colleague-name">${escapeHtml(colleague.name)}</span>
            <span class="colleague-title">${escapeHtml(colleague.role)}</span>
          </div>
        </div>
        <div class="bw-header-right">
          <div class="bw-clock" aria-label="Incident clock">
            <span class="bw-clock-time bw-mono">${formatClock(clock.startLabel, this.minutesSpent)}</span>
            <span class="bw-clock-meta">${this.minutesSpent} min spent · ${this.closeAtMinute} min to act</span>
          </div>
          <button class="btn-step-away-x" type="button" data-action="step-away" title="Step away (Esc)">✕ Step away</button>
        </div>
      </div>
      <div class="bw-titlerow">
        <h2 class="bw-title">${escapeHtml(this.spec.title)}</h2>
        <span class="bw-urgency">${escapeHtml(this.spec.urgencyLabel)}</span>
      </div>
    `;
  }

  private renderNav(): string {
    const tabs: { id: WorkbenchView; label: string }[] = [
      { id: 'situation', label: 'Situation' },
      { id: 'evidence', label: `Evidence ${this.inspected.size}/${this.spec.evidence.length}` },
      { id: 'order', label: 'Response' },
    ];
    if (this.view === 'review') {
      tabs.push({ id: 'review', label: 'Review' });
    }
    return `
      <nav class="bw-nav" aria-label="Incident sections">
        ${tabs
          .map(
            (tab) => `
          <button
            type="button"
            class="bw-nav-btn${this.view === tab.id ? ' is-active' : ''}"
            data-action="view"
            data-id="${tab.id}"
            aria-current="${this.view === tab.id ? 'page' : 'false'}"
          >${escapeHtml(tab.label)}</button>`
          )
          .join('')}
      </nav>
    `;
  }

  private renderBody(): string {
    switch (this.view) {
      case 'evidence':
        return this.openRecordId ? this.renderRecord(this.openRecordId) : this.renderEvidenceList();
      case 'order':
        return this.renderOrder();
      case 'review':
        return this.renderReview();
      case 'situation':
      default:
        return this.renderSituation();
    }
  }

  // ---- situation -----------------------------------------------------------

  private renderSituation(): string {
    const { situation } = this.spec;
    const quickRecords = this.spec.evidence.slice(0, 2);

    return `
      <section class="bw-section">
        <div class="bw-speech">
          ${situation.speech.map((line) => `<p class="spoken-briefing">"${escapeHtml(line)}"</p>`).join('')}
        </div>
      </section>

      <section class="bw-section">
        <h3 class="bw-heading">Known</h3>
        <dl class="bw-fields">
          ${renderFields(situation.fields)}
        </dl>
      </section>

      <section class="bw-section">
        <h3 class="bw-heading">Not confirmed</h3>
        <ul class="bw-unresolved">
          ${situation.unresolved.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </section>

      <section class="bw-section">
        <h3 class="bw-heading">Records</h3>
        <div class="bw-record-list compact">
          ${quickRecords.map((record) => this.renderRecordRow(record)).join('')}
        </div>
        <button type="button" class="bw-link" data-action="view" data-id="evidence">All evidence (${this.spec.evidence.length} records)</button>
      </section>
    `;
  }

  // ---- evidence ------------------------------------------------------------

  private renderEvidenceList(): string {
    const lockedRequests = this.spec.requests.filter(
      (request) => !this.completedRequests.has(request.id)
    );

    return `
      <section class="bw-section">
        <h3 class="bw-heading">Records</h3>
        <div class="bw-record-list">
          ${this.spec.evidence.map((record) => this.renderRecordRow(record)).join('')}
        </div>
      </section>

      ${
        lockedRequests.length > 0
          ? `<section class="bw-section">
        <h3 class="bw-heading">Records you have to ask for</h3>
        <div class="bw-request-list">
          ${lockedRequests
            .map(
              (request) => `
            <div class="bw-request">
              <div class="bw-request-text">
                <strong>${escapeHtml(request.ask)}</strong>
                <span>${escapeHtml(request.label)} · costs ${request.costMinutes} min</span>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" data-action="complete-request" data-id="${request.id}">
                Ask
              </button>
            </div>`
            )
            .join('')}
        </div>
      </section>`
          : ''
      }

      ${
        this.lastRequestReply
          ? `<div class="bw-reply" role="status">
              <span class="bw-reply-sender">${escapeHtml(this.spec.colleague.name)}</span>
              <p>${escapeHtml(this.lastRequestReply.reply)}</p>
            </div>`
          : ''
      }
    `;
  }

  private renderRecordRow(record: EvidenceRecord): string {
    const isInspected = this.inspected.has(record.id);
    const request = record.requiresRequestId
      ? this.spec.requests.find((entry) => entry.id === record.requiresRequestId)
      : undefined;
    const isLocked = Boolean(request && !this.completedRequests.has(request.id));

    const cost = isLocked
      ? `${request?.costMinutes ?? 0} min to obtain`
      : isInspected
      ? 'Read'
      : `${record.inspectMinutes} min to read`;

    return `
      <button
        type="button"
        class="bw-record${isLocked ? ' is-locked' : isInspected ? ' is-read' : ''}"
        data-action="${isLocked ? 'complete-request' : 'open-record'}"
        data-id="${isLocked ? request?.id ?? '' : record.id}"
      >
        <span class="bw-record-kind">${escapeHtml(record.kind)}</span>
        <span class="bw-record-main">
          <span class="bw-record-title">${escapeHtml(record.title)}</span>
          <span class="bw-record-summary">${escapeHtml(record.summary)}</span>
        </span>
        <span class="bw-record-cost">${escapeHtml(cost)}</span>
      </button>
    `;
  }

  private renderRecord(recordId: string): string {
    const record = this.spec.evidence.find((entry) => entry.id === recordId);
    if (!record) {
      return '';
    }
    return `
      <section class="bw-section bw-record-detail">
        <button type="button" class="bw-link" data-action="close-record">← Records</button>
        <div class="bw-record-head">
          <span class="bw-record-kind">${escapeHtml(record.kind)}</span>
          <h3 class="bw-heading">${escapeHtml(record.title)}</h3>
          <p class="bw-record-source">${escapeHtml(record.source)}</p>
        </div>
        <dl class="bw-fields">
          ${renderFields(record.fields)}
        </dl>
        ${
          record.body
            ? `<div class="bw-doc">${record.body.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</div>`
            : ''
        }
        <div class="bw-observations">
          <h4 class="bw-subheading">What it shows</h4>
          <ul>
            ${record.observations
              .map(
                (observation) => `
              <li class="is-${observation.certainty}">
                ${escapeHtml(observation.text)}
                <span class="bw-certainty">${observation.certainty === 'confirmed' ? 'confirmed' : 'needs checking'}</span>
              </li>`
              )
              .join('')}
          </ul>
        </div>
      </section>
    `;
  }

  // ---- order ---------------------------------------------------------------

  private renderOrder(): string {
    const selectedStrategy = this.spec.strategies.find((entry) => entry.id === this.strategyId);
    const fromOrder = new Set(this.interpretation?.actionIds ?? []);
    const actionGroups: { owner: string; actions: ContainmentAction[] }[] = [];
    for (const action of this.spec.actions) {
      const owner = action.owner === 'JOINT' ? 'Joint' : action.owner;
      const group = actionGroups.find((entry) => entry.owner === owner);
      if (group) {
        group.actions = [...group.actions, action];
      } else {
        actionGroups.push({ owner, actions: [action] });
      }
    }

    return `
      <section class="bw-section">
        <h3 class="bw-heading">Approach</h3>
        <fieldset class="bw-strategies">
          <legend class="bw-visually-hidden">Response approach</legend>
          ${this.spec.strategies
            .map(
              (strategy) => `
            <label class="bw-strategy${this.strategyId === strategy.id ? ' is-selected' : ''}">
              <input
                type="radio"
                name="bw-strategy"
                value="${strategy.id}"
                data-action="strategy"
                data-id="${strategy.id}"
                ${this.strategyId === strategy.id ? 'checked' : ''}
              />
              <span class="bw-strategy-body">
                <span class="bw-strategy-title">${escapeHtml(strategy.title)}</span>
                <span class="bw-strategy-summary">${escapeHtml(strategy.summary)}</span>
              </span>
              <span class="bw-strategy-delay">${
                strategy.delayMinutes === 0 ? 'immediate' : `+${strategy.delayMinutes} min`
              }</span>
            </label>`
            )
            .join('')}
        </fieldset>
        ${
          selectedStrategy
            ? `<p class="bw-note">With this approach everything lands at ${this.closeAtMinute} minute${
                this.closeAtMinute === 1 ? '' : 's'
              }.</p>`
            : ''
        }
      </section>

      <section class="bw-section">
        <h3 class="bw-heading">Measures</h3>
        <fieldset class="bw-actions">
          <legend class="bw-visually-hidden">Containment measures</legend>
          ${actionGroups
            .map(
              (group) => `
            <div class="bw-action-group">
              <h4 class="bw-subheading">${escapeHtml(group.owner)}</h4>
              ${group.actions
                .map(
                  (action) => `
                <label class="bw-action${this.actionIds.has(action.id) ? ' is-selected' : ''}">
                  <input
                    type="checkbox"
                    value="${action.id}"
                    data-action="toggle-action"
                    data-id="${action.id}"
                    ${this.actionIds.has(action.id) ? 'checked' : ''}
                  />
                  <span class="bw-action-body">
                    <span class="bw-action-title">${escapeHtml(action.label)}${
                      fromOrder.has(action.id) && !this.actionIds.has(action.id)
                        ? '<span class="bw-action-tag">from your order</span>'
                        : ''
                    }</span>
                    <span class="bw-action-system">${escapeHtml(action.system)}</span>
                    <span class="bw-action-detail">${escapeHtml(action.detail)}</span>
                  </span>
                </label>`
                )
                .join('')}
            </div>`
            )
            .join('')}
        </fieldset>
      </section>

      <section class="bw-section">
        <button
          type="button"
          class="bw-disclosure${this.assignmentOpen ? ' is-open' : ''}"
          data-action="toggle-assignment"
          aria-expanded="${this.assignmentOpen ? 'true' : 'false'}"
        >
          <span>Assignment</span>
          <span class="bw-disclosure-value">${escapeHtml(
            this.spec.slots
              .map((slot) => {
                const option = slot.options.find((entry) => entry.id === this.slotValues[slot.id]);
                return option?.label ?? '';
              })
              .join(' · ')
          )}</span>
          <span class="bw-chevron" aria-hidden="true">${this.assignmentOpen ? '▾' : '▸'}</span>
        </button>
        ${
          this.assignmentOpen
            ? `<div class="bw-assignment">
          ${this.spec.slots
            .map(
              (slot) => `
            <div class="bw-slot">
              <label for="bw-slot-${slot.id}">${escapeHtml(slot.label)}</label>
              <select id="bw-slot-${slot.id}" data-slot="${slot.id}" class="bw-select">
                ${slot.options
                  .map(
                    (option) => `
                  <option value="${option.id}" ${this.slotValues[slot.id] === option.id ? 'selected' : ''}>
                    ${escapeHtml(option.label)}
                  </option>`
                  )
                  .join('')}
              </select>
              <p class="bw-slot-help">${escapeHtml(
                slot.options.find((entry) => entry.id === this.slotValues[slot.id])?.note ?? slot.help
              )}</p>
            </div>`
            )
            .join('')}
        </div>`
            : ''
        }
      </section>

      <section class="bw-section">
        <label class="bw-heading" for="bw-directive-input">Your order</label>
        <textarea
          id="bw-directive-input"
          class="bw-textarea"
          rows="3"
          placeholder="${escapeHtml(this.spec.directive.placeholder)}"
          aria-describedby="bw-directive-help"
        >${escapeHtml(this.directiveText)}</textarea>
        <p class="bw-help" id="bw-directive-help">
          Maya reads it back before she acts. Ctrl or Cmd + Enter to interpret.
        </p>
        <div class="bw-examples">
          ${this.spec.directive.examples
            .map(
              (example, index) =>
                `<button type="button" class="bw-chip" data-action="use-example" data-id="${index}">${escapeHtml(
                  example
                )}</button>`
            )
            .join('')}
        </div>
        <div class="bw-directive-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-action="interpret">Interpret order</button>
          ${
            this.directiveText
              ? '<button type="button" class="bw-link" data-action="clear-directive">Clear</button>'
              : ''
          }
        </div>
        ${this.renderInterpretation()}
      </section>
    `;
  }

  private renderInterpretation(): string {
    if (!this.directiveText.trim()) {
      return '';
    }
    if (!this.interpretation) {
      return `<p class="bw-interp-pending">Not read yet. Press Interpret order.</p>`;
    }

    const interpretation = this.interpretation;
    const issues = interpretation.issues;
    // A clause the player has already resolved no longer produces a meaning of
    // its own, but it is settled rather than unusable.
    const resolvedOnly =
      !interpretation.isRelevant && issues.length === 0 && this.resolvedClauses.size > 0;

    return `
      <div class="bw-interp" aria-live="polite">
        <div class="bw-interp-head">
          <strong>${
            resolvedOnly
              ? 'Settled'
              : interpretation.isRelevant
              ? 'Read as'
              : 'Can\'t act on this'
          }</strong>
          <span class="bw-interp-confidence">${
            resolvedOnly
              ? 'clear'
              : interpretation.confidence >= 0.7
              ? 'clear'
              : interpretation.confidence >= 0.4
              ? 'partly clear'
              : 'unclear'
          }</span>
        </div>
        ${
          resolvedOnly
            ? '<p class="bw-help">Settled. The measure is ticked above.</p>'
            : ''
        }
        ${
          interpretation.restatement
            ? `<p class="bw-interp-restatement">${escapeHtml(interpretation.restatement)}.</p>`
            : ''
        }
        ${
          interpretation.actionIds.length > 0
            ? `<ul class="bw-interp-actions">
                ${interpretation.actionIds
                  .map((actionId) => {
                    const action = this.spec.actions.find((entry) => entry.id === actionId);
                    return action ? `<li>${escapeHtml(action.label)}</li>` : '';
                  })
                  .join('')}
              </ul>`
            : ''
        }
        ${issues
          .map(
            (issue, index) => `
          <div class="bw-issue is-${issue.kind.toLowerCase()}">
            <strong>${escapeHtml(issue.title)}</strong>
            <p>${escapeHtml(issue.message)}</p>
            ${
              issue.kind === 'AMBIGUOUS' && issue.options
                ? `<div class="bw-issue-options">
                    ${issue.options
                      .map(
                        (option) => `
                      <button type="button" class="btn btn-secondary btn-sm" data-action="clarify" data-id="${index}" data-option="${option.id}">
                        ${escapeHtml(option.label)}
                      </button>`
                      )
                      .join('')}
                  </div>`
                : ''
            }
            ${
              issue.kind === 'CONFLICT'
                ? `<div class="bw-issue-options">
                    ${
                      issue.conflictActionId
                        ? `<button type="button" class="btn btn-secondary btn-sm" data-action="drop-action" data-id="${issue.conflictActionId}">
                            Remove that measure
                          </button>`
                        : ''
                    }
                    <button type="button" class="btn btn-secondary btn-sm" data-action="clear-directive">Rewrite the order</button>
                  </div>`
                : ''
            }
            ${
              issue.kind === 'UNSUPPORTED'
                ? `<p class="bw-issue-note">Your text stays. Or set it with the controls.</p>`
                : ''
            }
          </div>`
          )
          .join('')}
      </div>
    `;
  }

  // ---- review --------------------------------------------------------------

  private renderReview(): string {
    const plan = this.buildPlan();
    const problems = findPlanProblems(this.spec, plan);
    const strategy = this.spec.strategies.find((entry) => entry.id === this.strategyId);
    const actions = this.spec.actions.filter(
      (action) => this.actionIds.has(action.id) || plan.interpretation.actionIds.includes(action.id)
    );
    const directiveIssues = plan.interpretation.issues.filter(
      (issue) => issue.kind === 'UNSUPPORTED' || issue.kind === 'DANGEROUS' || issue.kind === 'INVESTIGATION_ONLY'
    );

    return `
      <section class="bw-section">
        <h3 class="bw-heading">The order</h3>
        <dl class="bw-fields">
          <div class="bw-field">
            <dt>Approach</dt>
            <dd>${escapeHtml(strategy?.title ?? 'Not selected')}</dd>
          </div>
          <div class="bw-field">
            <dt>Measures</dt>
            <dd>${
              actions.length === 0
                ? 'None'
                : actions.map((action) => escapeHtml(action.label)).join('<br />')
            }</dd>
          </div>
          ${this.spec.slots
            .map((slot) => {
              const option = slot.options.find((entry) => entry.id === this.slotValues[slot.id]);
              return `<div class="bw-field"><dt>${escapeHtml(slot.label)}</dt><dd>${escapeHtml(
                option?.label ?? ''
              )}</dd></div>`;
            })
            .join('')}
          <div class="bw-field">
            <dt>Clock</dt>
            <dd>${this.minutesSpent} min spent · lands at ${this.closeAtMinute} min</dd>
          </div>
        </dl>
      </section>

      ${
        this.directiveText.trim()
          ? `<section class="bw-section">
        <h3 class="bw-heading">What you wrote</h3>
        <p class="bw-quote">"${escapeHtml(this.directiveText.trim())}"</p>
        ${
          plan.interpretation.restatement
            ? `<p class="bw-help">Read as: ${escapeHtml(plan.interpretation.restatement)}.</p>`
            : ''
        }
        ${directiveIssues
          .map(
            (issue) => `
          <div class="bw-issue is-${issue.kind.toLowerCase()}">
            <strong>${escapeHtml(issue.title)}</strong>
            <p>${escapeHtml(issue.message)}</p>
          </div>`
          )
          .join('')}
      </section>`
          : ''
      }

      ${
        problems.length > 0
          ? `<section class="bw-section">
        <h3 class="bw-heading">Before this goes out</h3>
        <div class="bw-problems">
          ${problems
            .map(
              (problem) => `
            <div class="bw-issue is-${problem.kind.toLowerCase()}">
              <strong>${escapeHtml(problem.title)}</strong>
              <p>${escapeHtml(problem.message)}</p>
            </div>`
            )
            .join('')}
        </div>
      </section>`
          : `<p class="bw-ready" role="status">Ready to issue. Nothing has run yet.</p>`
      }
    `;
  }

  // ---- footer --------------------------------------------------------------

  private renderFooter(): string {
    const plan = this.buildPlan();
    const problems = findPlanProblems(this.spec, plan);
    const canAuthorize = problems.length === 0;
    const measureCount = new Set([
      ...this.actionIds,
      ...(this.interpretation?.actionIds ?? []),
    ]).size;

    let primary = '';
    let secondary = '';

    if (this.view === 'situation') {
      primary = `<button type="button" class="btn btn-primary" data-action="view" data-id="evidence">Open evidence</button>`;
      secondary = `<button type="button" class="btn btn-secondary" data-action="view" data-id="order">Write the response</button>`;
    } else if (this.view === 'evidence') {
      primary = `<button type="button" class="btn btn-primary" data-action="view" data-id="order">Write the response</button>`;
      secondary = `<button type="button" class="btn btn-secondary" data-action="view" data-id="situation">Back to situation</button>`;
    } else if (this.view === 'order') {
      primary = `<button type="button" class="btn btn-primary" data-action="review">${escapeHtml(
        this.spec.labels.review
      )}</button>`;
      secondary = `<button type="button" class="btn btn-secondary" data-action="step-away">Step away</button>`;
    } else {
      primary = `<button type="button" class="btn btn-primary btn-large" data-action="authorize" ${
        canAuthorize ? '' : 'disabled aria-disabled="true"'
      }>${escapeHtml(this.spec.labels.authorize)}</button>`;
      secondary = `<button type="button" class="btn btn-secondary" data-action="view" data-id="order">Back to edit</button>`;
    }

    return `
      <div class="bw-footer">
        <div class="bw-footer-state">
          <span class="bw-footer-dot is-${this.strategyId ? 'ready' : 'empty'}" aria-hidden="true"></span>
          ${escapeHtml(
            this.strategyId
              ? `${measureCount} measure${measureCount === 1 ? '' : 's'} selected`
              : 'No approach selected'
          )}
        </div>
        <div class="bw-footer-actions">
          ${secondary}
          ${primary}
        </div>
      </div>
    `;
  }
}
