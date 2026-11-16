/**
 * Mustarred Company Simulator - Incident Outcome View
 *
 * The screen shown immediately after a response is authorised. It reports what
 * each measure did, which exposed vectors were closed in time, and what each
 * department says about it. Numbers come from the engine's ledger record.
 */

import type { ActionExecution, VectorOutcome, ResponseVerdict } from '../incidents/responseEvaluator.ts';
import type { LedgerFigures, OutcomeMemo } from '../incidents/outcomeTypes.ts';

export interface OutcomeViewProps {
  readonly verdict: ResponseVerdict;
  readonly verdictLabel: string;
  readonly headline: string;
  readonly summary: string;
  readonly maya: OutcomeMemo;
  readonly memos: readonly OutcomeMemo[];
  readonly vectors: readonly VectorOutcome[];
  readonly actions: readonly ActionExecution[];
  readonly figures: LedgerFigures;
  readonly minutesSpent: number;
  readonly closeAtMinute: number;
  readonly officeLabel: string;
  readonly onReturn: () => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const formatted = `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
  return cents < 0 ? `-${formatted}` : `+${formatted}`;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

const VECTOR_STATE_LABEL: Record<VectorOutcome['state'], string> = {
  CLOSED: 'closed in time',
  TOO_LATE: 'too late',
  BREACHED: 'happened',
};

export class IncidentOutcomeView {
  private readonly props: OutcomeViewProps;
  private root: HTMLElement | null = null;
  private openMemoId: string | null = null;

  constructor(props: OutcomeViewProps) {
    this.props = props;
  }

  public mount(container: HTMLElement): void {
    this.root = document.createElement('div');
    this.root.className = `modal-dialog incident-outcome-dialog is-${this.props.verdict.toLowerCase()}`;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', `Incident outcome: ${this.props.verdictLabel}`);
    container.appendChild(this.root);

    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.render();
  }

  public destroy(): void {
    this.root?.remove();
    this.root = null;
  }

  private handleClick(event: Event): void {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!target) {
      return;
    }
    if (target.dataset.action === 'return') {
      this.props.onReturn();
      return;
    }
    if (target.dataset.action === 'toggle-memo') {
      const id = target.dataset.id ?? '';
      this.openMemoId = this.openMemoId === id ? null : id;
      this.render();
    }
  }

  private render(): void {
    if (!this.root) {
      return;
    }
    const {
      verdictLabel,
      headline,
      summary,
      maya,
      memos,
      vectors,
      actions,
      figures,
      minutesSpent,
      closeAtMinute,
      officeLabel,
    } = this.props;

    const otherMemos = memos.filter((memo) => memo.senderName !== maya.senderName);
    const closed = vectors.filter((vector) => vector.state === 'CLOSED');
    const affected = vectors.filter((vector) => vector.state !== 'CLOSED');

    this.root.innerHTML = `
      <div class="modal-header it bw-header">
        <div class="dept-indicator">
          <div class="colleague-avatar" aria-hidden="true">ML</div>
          <div class="colleague-meta">
            <span class="colleague-name">${escapeHtml(maya.senderName)}</span>
            <span class="colleague-title">${escapeHtml(maya.senderTitle)}</span>
          </div>
        </div>
        <div class="bw-header-right">
          <span class="bw-clock-meta">${minutesSpent} min spent · response landed at ${closeAtMinute} min</span>
        </div>
      </div>

      <div class="bw-body">
        <div class="bw-verdict" role="status">
          <span class="bw-verdict-label">${escapeHtml(verdictLabel)}</span>
          <h2 class="bw-verdict-headline">${escapeHtml(headline)}</h2>
          <p class="bw-verdict-summary">${escapeHtml(summary)}</p>
        </div>

        <blockquote class="bw-maya-quote is-${maya.tone}">
          <p>"${escapeHtml(maya.message)}"</p>
          <footer>${escapeHtml(maya.senderName)} · ${escapeHtml(maya.timestamp)}</footer>
        </blockquote>

        ${
          actions.length > 0
            ? `<section class="bw-section">
          <h3 class="bw-heading">What we carried out</h3>
          <div class="bw-results">
            ${actions
              .map(
                (action) => `
              <div class="bw-result is-${action.status.toLowerCase()}">
                <div class="bw-result-head">
                  <span class="bw-result-label">${escapeHtml(action.label)}</span>
                  <span class="bw-result-status">${escapeHtml(
                    action.status === 'EXECUTED' ? 'done' : action.status === 'PARTIAL' ? 'late' : 'stood down'
                  )}</span>
                </div>
                <p class="bw-result-text">${escapeHtml(action.result)}</p>
                <span class="bw-result-owner">${escapeHtml(action.owner)} · ${escapeHtml(action.system)}</span>
              </div>`
              )
              .join('')}
          </div>
        </section>`
            : ''
        }

        <section class="bw-section">
          <h3 class="bw-heading">Exposure</h3>
          <ul class="bw-vectors">
            ${
              closed.length > 0
                ? closed
                    .map(
                      (vector) => `
                <li class="is-ok"><span class="bw-vector-dot" aria-hidden="true"></span>
                  <span class="bw-vector-label">${escapeHtml(vector.label)}</span>
                  <span class="bw-vector-state">${VECTOR_STATE_LABEL[vector.state]}</span>
                </li>`
                    )
                    .join('')
                : ''
            }
            ${
              affected.length > 0
                ? affected
                    .map(
                      (vector) => `
                <li class="is-${vector.state === 'TOO_LATE' ? 'warn' : 'bad'}"><span class="bw-vector-dot" aria-hidden="true"></span>
                  <span class="bw-vector-label">${escapeHtml(vector.label)}</span>
                  <span class="bw-vector-state">${VECTOR_STATE_LABEL[vector.state]}</span>
                  <span class="bw-vector-detail">${escapeHtml(vector.detail)}</span>
                </li>`
                    )
                    .join('')
                : ''
            }
          </ul>
        </section>

        <section class="bw-section">
          <h3 class="bw-heading">This cycle</h3>
          <div class="bw-figures">
            <div class="bw-figure">
              <span class="bw-figure-label">Cash</span>
              <span class="bw-figure-value ${figures.cashDelta < 0 ? 'is-neg' : 'is-pos'}">${formatMoney(
                figures.cashDelta
              )}</span>
            </div>
            <div class="bw-figure">
              <span class="bw-figure-label">IT stability</span>
              <span class="bw-figure-value ${figures.itDelta < 0 ? 'is-neg' : 'is-pos'}">${signed(figures.itDelta)}</span>
            </div>
            <div class="bw-figure">
              <span class="bw-figure-label">Morale</span>
              <span class="bw-figure-value ${figures.hrDelta < 0 ? 'is-neg' : 'is-pos'}">${signed(figures.hrDelta)}</span>
            </div>
            <div class="bw-figure">
              <span class="bw-figure-label">Office</span>
              <span class="bw-figure-value is-text">${escapeHtml(officeLabel)}</span>
            </div>
          </div>
        </section>

        <section class="bw-section">
          <h3 class="bw-heading">From the departments</h3>
          <div class="bw-memos">
            ${otherMemos
              .map((memo) => {
                const isOpen = this.openMemoId === memo.senderDept;
                return `
              <div class="bw-memo is-${memo.tone}${isOpen ? ' is-open' : ''}">
                <button type="button" class="bw-memo-head" data-action="toggle-memo" data-id="${memo.senderDept}" aria-expanded="${isOpen ? 'true' : 'false'}">
                  <span class="bw-memo-dept">${escapeHtml(memo.senderDept)}</span>
                  <span class="bw-memo-subject">${escapeHtml(memo.subject)}</span>
                  <span class="bw-chevron" aria-hidden="true">${isOpen ? '▾' : '▸'}</span>
                </button>
                ${
                  isOpen
                    ? `<div class="bw-memo-body">
                        <p>${escapeHtml(memo.message)}</p>
                        <span class="bw-memo-meta">${escapeHtml(memo.senderName)} · ${escapeHtml(
                        memo.senderTitle
                      )} · ${escapeHtml(memo.timestamp)}</span>
                      </div>`
                    : ''
                }
              </div>`;
              })
              .join('')}
          </div>
          <p class="bw-help">The full memos are also in the communications hub and as notifications.</p>
        </section>
      </div>

      <div class="bw-footer">
        <div class="bw-footer-state">
          <span class="bw-footer-dot is-ready" aria-hidden="true"></span>
          Response authorised
        </div>
        <div class="bw-footer-actions">
          <button type="button" class="btn btn-primary btn-large" data-action="return">Return to office</button>
        </div>
      </div>
    `;
  }
}
