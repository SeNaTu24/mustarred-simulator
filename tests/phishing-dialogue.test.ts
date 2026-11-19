/**
 * Mustarred Company Simulator - Hybrid Workplace Drama Dialogue Test Suite
 *
 * Verifies:
 * 1. Dialogue definitions, prompts, and candidate response options for the IT phishing incident.
 * 2. Grounded follow-up dialogue adapting to candidate choices and gathered evidence.
 * 3. Workplace drama conversation DOM lifecycle, opening choice selection, and workstation transitions.
 * 4. State persistence: intro dialogue does not restart when stepping away or returning from workstation.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  TUNDE_OPENING_LINE,
  TUNDE_SPEECH_BUBBLE_PROMPT,
  PHISHING_OPENING_OPTIONS,
  getOpeningOption,
  getTundeFollowupDialogue,
  getFollowupExchange,
  getPhishingOutcomeConversation,
  answerTundeQuestion,
  type PhishingOpeningOptionId,
} from '../src/ui/phishingDialogue.ts';

import { UIManager } from '../src/ui/UIManager.ts';
import { MONDAY_MORNING_SCENARIO, CHOICES_IT_MAIL } from '../src/simulation/mondayMorning.data.ts';
import type { EvaluatedChoice, Incident } from '../src/simulation/types.ts';

// ============================================================================
// LIGHTWEIGHT DOM MOCK FOR HEADLESS NODE ENVIRONMENT
// ============================================================================

class MockElement {
  public tagName: string;
  public id: string = '';
  public className: string = '';
  public type: string = '';
  public name: string = '';
  public value: string = '';
  public checked: boolean = false;
  public title: string = '';
  private _textContent: string = '';
  public children: MockElement[] = [];
  public parentNode: MockElement | null = null;
  public listeners: Map<string, ((event: any) => void)[]> = new Map();
  public rawHtml: string = '';

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  public get textContent(): string {
    if (this._textContent) return this._textContent;
    const childText = this.children.map((c) => c.textContent).filter(Boolean).join(' ');
    if (childText) return childText;
    return this.rawHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  public set textContent(val: string) {
    this._textContent = val;
  }

  public get innerHTML(): string {
    return this.rawHtml || this._textContent;
  }

  public set innerHTML(html: string) {
    this.rawHtml = html;
    this.children = [];
    this._textContent = '';
    this.parseAndBuildChildren(html);
  }

  public appendChild(child: MockElement): MockElement {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  public addEventListener(type: string, handler: (event: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(handler);
  }

  public dispatchEvent(event: { type: string; defaultPrevented?: boolean; preventDefault?: () => void }): boolean {
    const list = this.listeners.get(event.type) || [];
    for (const h of list) {
      h(event);
    }
    return true;
  }

  public click(): void {
    const evt = {
      type: 'click',
      defaultPrevented: false,
      preventDefault: () => {
        evt.defaultPrevented = true;
      },
    };
    this.dispatchEvent(evt);
  }

  public submit(): void {
    const evt = {
      type: 'submit',
      defaultPrevented: false,
      preventDefault: () => {
        evt.defaultPrevented = true;
      },
    };
    this.dispatchEvent(evt);
  }

  public get classList() {
    return {
      add: (...classes: string[]) => {
        const set = new Set(this.className.split(/\s+/).filter(Boolean));
        classes.forEach((c) => set.add(c));
        this.className = Array.from(set).join(' ');
      },
      remove: (...classes: string[]) => {
        const set = new Set(this.className.split(/\s+/).filter(Boolean));
        classes.forEach((c) => set.delete(c));
        this.className = Array.from(set).join(' ');
      },
      contains: (cls: string) => {
        return this.className.split(/\s+/).filter(Boolean).includes(cls);
      },
    };
  }

  public querySelector<T extends MockElement = MockElement>(selector: string): T | null {
    const matches = this.querySelectorAll<T>(selector);
    return matches.length > 0 ? matches[0] : null;
  }

  public querySelectorAll<T extends MockElement = MockElement>(selector: string): T[] {
    const results: T[] = [];
    this.matchSelectorRecursive(selector, results);
    return results;
  }

  public closest<T extends MockElement = MockElement>(selector: string): T | null {
    let curr: MockElement | null = this;
    while (curr) {
      if (curr.matchesSelector(selector)) {
        return curr as unknown as T;
      }
      curr = curr.parentNode;
    }
    return null;
  }

  private matchesSelector(sel: string): boolean {
    if (sel.startsWith('#')) {
      return this.id === sel.slice(1);
    }
    if (sel.startsWith('.')) {
      const classes = sel.slice(1).split('.');
      return classes.every((c) => this.classList.contains(c));
    }
    if (sel.startsWith('input[name=')) {
      const match = sel.match(/input\[name="?([^"\]]+)"?\]/);
      if (match) {
        return this.tagName === 'INPUT' && this.name === match[1];
      }
    }
    return this.tagName.toLowerCase() === sel.toLowerCase();
  }

  private matchSelectorRecursive<T extends MockElement>(sel: string, acc: T[]): void {
    for (const child of this.children) {
      if (child.matchesSelector(sel)) {
        acc.push(child as unknown as T);
      }
      child.matchSelectorRecursive(sel, acc);
    }
  }

  private parseAndBuildChildren(html: string): void {
    const tagRegex = /<(\/)?([a-zA-Z0-9\-]+)([^>]*)>([^<]*)/g;
    let match: RegExpExecArray | null;
    const stack: MockElement[] = [this];
    const voidTags = new Set(['IMG', 'INPUT', 'BR', 'HR', 'META', 'LINK']);

    while ((match = tagRegex.exec(html)) !== null) {
      const isClosing = Boolean(match[1]);
      const rawTag = match[2].toUpperCase();
      const attrsStr = match[3];
      const innerText = match[4]?.trim();

      if (isClosing) {
        if (stack.length > 1 && stack[stack.length - 1].tagName === rawTag) {
          stack.pop();
        }
        continue;
      }

      const elem = new MockElement(rawTag);
      elem.rawHtml = match[0];
      if (innerText) {
        elem.textContent = innerText;
      }

      const idMatch = attrsStr.match(/id=["']([^"']*)["']/);
      if (idMatch) elem.id = idMatch[1];

      const classMatch = attrsStr.match(/class=["']([^"']*)["']/);
      if (classMatch) elem.className = classMatch[1];

      const typeMatch = attrsStr.match(/type=["']([^"']*)["']/);
      if (typeMatch) elem.type = typeMatch[1];

      const nameMatch = attrsStr.match(/name=["']([^"']*)["']/);
      if (nameMatch) elem.name = nameMatch[1];

      const valMatch = attrsStr.match(/value=["']([^"']*)["']/);
      if (valMatch) elem.value = valMatch[1];

      if (attrsStr.includes('checked')) {
        elem.checked = true;
      }

      const parent = stack[stack.length - 1];
      parent.appendChild(elem);

      if (!voidTags.has(rawTag)) {
        stack.push(elem);
      }
    }
  }
}

// Global DOM setup
const rootOverlay = new MockElement('DIV');
rootOverlay.id = 'ui-overlay';

(global as any).document = {
  getElementById: (id: string) => (id === 'ui-overlay' ? rootOverlay : rootOverlay.querySelector(`#${id}`)),
  createElement: (tagName: string) => new MockElement(tagName),
};

(global as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};

// ============================================================================
// TESTS
// ============================================================================

describe('Hybrid Workplace-Drama Dialogue System', () => {
  const activeIncident: Incident = MONDAY_MORNING_SCENARIO.incidents[0];
  const evaluatedChoices: readonly EvaluatedChoice[] = CHOICES_IT_MAIL.map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    immediateCashDelta: c.baseImpact.cashDelta,
    monthlyBurnDelta: c.baseImpact.grossBurnRateDelta,
    debtDelta: c.baseImpact.debtDelta,
    itDelta: c.baseImpact.itDelta,
    hrDelta: c.baseImpact.hrDelta,
    delayedEffects: [],
    isLocked: false,
    lockReasons: [],
    isDefault: c.isDefault ?? false,
    scheduledDelayedEffect: c.scheduledDelayedEffect,
    learningFeedback: c.learningFeedback,
  }));

  describe('Dialogue Content & Options Specifications', () => {
    it('defines in-world speech bubble and Tunde opening spoken line', () => {
      assert.equal(TUNDE_SPEECH_BUBBLE_PROMPT, 'Amaka, do you have a minute?');
      assert.equal(
        TUNDE_OPENING_LINE,
        "Amaka, do you have a moment? Finance received an email about a tax clearance certificate. The sender looks suspicious, and I'd like us to assess the risk before taking further action."
      );
    });

    it('provides exactly the 3 required candidate response choices without premature revelation', () => {
      assert.equal(PHISHING_OPENING_OPTIONS.length, 3);
      const ids = PHISHING_OPENING_OPTIONS.map((o) => o.id);
      assert.deepEqual(ids, ['interacted_yet', 'what_suspicious', 'examine_first']);

      const optInteracted = getOpeningOption('interacted_yet');
      assert.ok(optInteracted);
      assert.equal(optInteracted?.amakaLine, 'Has anyone interacted with the email?');
      assert.ok(optInteracted?.tundeResponse.includes("We haven't confirmed whether anyone interacted with it yet"));
      assert.equal(optInteracted?.tundeResponse.includes('entered his password'), false, 'Does not reveal password prematurely');

      const optSuspicious = getOpeningOption('what_suspicious');
      assert.ok(optSuspicious);
      assert.equal(optSuspicious?.amakaLine, 'What made you suspicious?');
      assert.ok(optSuspicious?.tundeResponse.includes('sender domain and routing headers'));
      assert.equal(optSuspicious?.tundeResponse.includes('entered his password'), false, 'Does not reveal password prematurely');

      const optExamine = getOpeningOption('examine_first');
      assert.ok(optExamine);
      assert.equal(optExamine?.amakaLine, "Let's examine the message first.");
      assert.ok(optExamine?.tundeResponse.includes("loaded on the workstation terminal now"));
      assert.equal(optExamine?.tundeResponse.includes('entered his password'), false, 'Does not reveal password prematurely');
    });

    it('supports legacy aliases and returns undefined for invalid IDs', () => {
      assert.ok(getOpeningOption('opened_yet'));
      assert.ok(getOpeningOption('dont_touch'));
      assert.ok(getOpeningOption('show_email'));
      assert.equal(getOpeningOption('unknown' as PhishingOpeningOptionId), undefined);
    });

    it('adapts follow-up dialogue dynamically to investigation state', () => {
      // 1. Credentials submitted
      const credText = getTundeFollowupDialogue(undefined, { credentialsSubmitted: true });
      assert.ok(credText.includes('Yusuf admitted he opened the link and entered his password'));
      assert.ok(credText.includes('your simulation test submitted credentials'));
      assert.ok(credText.includes('revoking active session tokens'));
      assert.ok(credText.includes('evaluate personal data exposure under the NDPA'));

      // 2. Link opened
      const linkText = getTundeFollowupDialogue(undefined, { linkOpened: true });
      assert.ok(linkText.includes('Yusuf opened the link and may have submitted his password'));
      assert.ok(linkText.includes('fortunately your machine submitted nothing'));
      assert.ok(linkText.includes('technical containment'));
      assert.ok(linkText.includes('NDPA guidelines'));

      // 3. Sender inspected
      const senderText = getTundeFollowupDialogue(undefined, { isSenderInspected: true });
      assert.ok(senderText.includes('Yusuf admitted he opened the link and may have entered his password'));
      assert.ok(senderText.includes('Russian relay'));
      assert.ok(senderText.includes('resetting Yusuf\'s account and blocking the domain'));
      assert.ok(senderText.includes('compliance register under the NDPA'));

      // 4. Default / uninspected
      const defText = getTundeFollowupDialogue(undefined, {});
      assert.ok(defText.includes('Finance just reported that Yusuf opened the link'));
      assert.ok(defText.includes('session revocation and perimeter blocking'));
      assert.ok(defText.includes('NDPA exposure'));
    });

    it('provides structured follow-up exchange dividing technical containment from compliance responsibilities', () => {
      const exchange = getFollowupExchange({ credentialsSubmitted: true });
      assert.ok(exchange.tundeLine.includes('Yusuf admitted'));
      assert.ok(exchange.amakaLine.includes('compliance incident register'));
      assert.ok(exchange.amakaLine.includes('NDPA'));
      assert.ok(exchange.tundeClosing.includes('containment directive'));
    });

    it('provides branch-specific outcome conversations for all decision branches without unsupported claims', () => {
      // 1. Standard Report
      const rep = getPhishingOutcomeConversation('CHOICE_MAIL_REPORT');
      assert.equal(rep.branch, 'proper_reporting');
      assert.ok(rep.tundeLine.includes('Perimeter gateway blocked the domain'));
      assert.ok(rep.amakaLine.includes('compliance breach register'));
      assert.ok(rep.amakaLine.includes('Yusuf may have entered his password before containment began'));
      assert.equal(rep.amakaLine.includes('no credentials or corporate data were transmitted'), false);
      assert.equal(rep.amakaLine.includes('NDPA is not triggered'), false);
      assert.ok(rep.amakaLine.includes('establish what information was accessed'));
      assert.ok(rep.amakaLine.includes('assess the risk to affected individuals'));
      assert.ok(rep.amakaLine.includes('document our findings'));
      assert.ok(rep.amakaLine.includes('determine whether regulatory notification is required under applicable law'));

      // 2. Inspected Report
      const insp = getPhishingOutcomeConversation('CHOICE_MAIL_INSPECTED_REPORT');
      assert.equal(insp.branch, 'proper_reporting');
      assert.ok(insp.tundeLine.includes('Gateway block is active'));
      assert.ok(insp.amakaLine.includes('Yusuf\'s potential password submission remains an active exposure'));
      assert.equal(insp.amakaLine.includes('no corporate data or credentials were transmitted'), false);
      assert.ok(insp.amakaLine.includes('establish what information was accessed'));
      assert.ok(insp.amakaLine.includes('assess the risk to affected individuals'));
      assert.ok(insp.amakaLine.includes('document our findings'));
      assert.ok(insp.amakaLine.includes('determine whether regulatory notification is required under applicable law'));

      // 3. Credential exposure disclosed & contained
      const contained = getPhishingOutcomeConversation('CHOICE_MAIL_OPEN_CONTAINED');
      assert.equal(contained.branch, 'disclosed_containment');
      assert.ok(contained.tundeLine.includes('killed active sessions and forced password resets'));
      assert.ok(contained.amakaLine.includes('Immediate disclosure prevented a catastrophic payment fraud event'));
      assert.ok(contained.amakaLine.includes('establish what information was accessed'));
      assert.ok(contained.amakaLine.includes('assess the risk to affected individuals'));
      assert.ok(contained.amakaLine.includes('determine whether regulatory notification is required under applicable law'));

      // 4. Delete unescalated
      const del = getPhishingOutcomeConversation('CHOICE_MAIL_DELETE');
      assert.equal(del.branch, 'deleted_unescalated');
      assert.ok(del.tundeLine.includes('Deleting the email from your inbox'));
      assert.ok(del.amakaLine.includes('Deleting without escalation breaches our compliance duties'));
      assert.ok(del.amakaLine.includes('assess the risk to affected individuals'));
      assert.ok(del.amakaLine.includes('determine whether regulatory notification is required under applicable law'));

      // 5. Open concealed
      const open = getPhishingOutcomeConversation('CHOICE_MAIL_OPEN');
      assert.equal(open.branch, 'deleted_unescalated');
      assert.ok(open.tundeLine.includes('still has active access'));
      assert.ok(open.amakaLine.includes('Concealing credential exposure'));
      assert.ok(open.amakaLine.includes('assess the critical risk to affected individuals'));
      assert.ok(open.amakaLine.includes('determine whether regulatory notification is required under applicable law'));
    });
  });

  describe('UI Dialogue Lifecycle & State Machine', () => {
    let ui: UIManager;
    let tundeIntroCompletedFired: boolean;
    let stepAwayFired: boolean;

    beforeEach(() => {
      tundeIntroCompletedFired = false;
      stepAwayFired = false;
      rootOverlay.innerHTML = '';

      ui = new UIManager({
        onSelectChoice: () => {},
        onDismissResolution: () => {},
        onRestart: () => {},
        onPromptInteract: () => {},
        onStepAway: () => {
          stepAwayFired = true;
        },
        onTundeIntroCompleted: () => {
          tundeIntroCompletedFired = true;
        },
      });
    });

    it('shows the 3 dialogue response buttons upon initial arrival at Tunde\'s desk', () => {
      ui.showIncidentModal(activeIncident, evaluatedChoices);

      const opt1 = rootOverlay.querySelector<MockElement>('#btn-dialogue-opt-interacted_yet');
      const opt2 = rootOverlay.querySelector<MockElement>('#btn-dialogue-opt-what_suspicious');
      const opt3 = rootOverlay.querySelector<MockElement>('#btn-dialogue-opt-examine_first');

      assert.ok(opt1, 'Option 1 (Has anyone interacted with the email) exists');
      assert.ok(opt2, 'Option 2 (What made you suspicious) exists');
      assert.ok(opt3, 'Option 3 (Let\'s examine the message first) exists');

      // Spoken opening line from Tunde is displayed
      const text = rootOverlay.textContent;
      assert.ok(text.includes('Finance received an email about a tax clearance certificate'));
      assert.ok(text.includes('Examine email on IT workstation'));
    });

    it('updates dialogue to display candidate choice and advances to Tunde\'s response upon selecting an option', () => {
      ui.showIncidentModal(activeIncident, evaluatedChoices);

      // Select "Has anyone interacted with the email?"
      const optBtn = rootOverlay.querySelector<MockElement>('#btn-dialogue-opt-interacted_yet');
      optBtn!.click();

      // Step 2: Dialogue now displays Amaka's spoken line and Continue button
      const amakaText = rootOverlay.textContent;
      assert.ok(amakaText.includes('Has anyone interacted with the email?'));
      const continueBtn = rootOverlay.querySelector<MockElement>('#btn-dialogue-continue');
      assert.ok(continueBtn, 'Continue button is present to advance conversation one line at a time');

      // Click Continue to advance to Tunde's response
      continueBtn!.click();

      // Step 3: Tunde's direct answer is now displayed without premature revelation
      const tundeText = rootOverlay.textContent;
      assert.ok(tundeText.includes("We haven't confirmed whether anyone interacted with it yet"));
      assert.equal(tundeText.includes('entered his password'), false);

      // Check state
      const state = ui.getPhishingInteractionState();
      assert.equal(state?.openingResponse, 'interacted_yet');
      assert.equal(state?.introCompleted, undefined);
    });

    it('transitions to IT workstation and marks introCompleted when clicking action button', () => {
      ui.showIncidentModal(activeIncident, evaluatedChoices);

      // Select an option first
      rootOverlay.querySelector<MockElement>('#btn-dialogue-opt-examine_first')!.click();

      // Click examine email on workstation
      const openWorkstationBtn = rootOverlay.querySelector<MockElement>('#btn-open-workstation');
      assert.ok(openWorkstationBtn);
      openWorkstationBtn!.click();

      // Check callback and state
      assert.equal(tundeIntroCompletedFired, true, 'onTundeIntroCompleted callback was triggered');
      const state = ui.getPhishingInteractionState();
      assert.equal(state?.introCompleted, true);
      assert.equal(state?.openingResponse, 'examine_first');

      // Workstation is now mounted
      assert.ok(rootOverlay.querySelector<MockElement>('.workstation-panel'));
      assert.ok(rootOverlay.querySelector<MockElement>('#btn-back-to-desk'));
    });

    it('returns to desk conversation with grounded followup dialogue without replaying opening prompt', () => {
      ui.showIncidentModal(activeIncident, evaluatedChoices);

      // Select opening option and proceed to workstation
      rootOverlay.querySelector<MockElement>('#btn-dialogue-opt-what_suspicious')!.click();
      rootOverlay.querySelector<MockElement>('#btn-open-workstation')!.click();

      // Inspect sender on workstation to gather evidence
      rootOverlay.querySelector<MockElement>('#btn-inspect-sender')!.click();

      // Return to desk conversation
      rootOverlay.querySelector<MockElement>('#btn-back-to-desk')!.click();

      // We should be at the desk conversation panel
      assert.ok(rootOverlay.querySelector<MockElement>('.desk-conversation-panel'));
      assert.equal(rootOverlay.querySelector<MockElement>('.workstation-panel'), null);

      // Opening choices are NOT displayed again
      assert.equal(rootOverlay.querySelector<MockElement>('#btn-dialogue-opt-what_suspicious'), null);

      // Follow-up dialogue reflects that sender was inspected and reveals Yusuf's compromise
      const text = rootOverlay.textContent;
      assert.ok(text.includes('Yusuf admitted he opened the link'));
      assert.ok(text.includes('Russian relay'));
      assert.ok(text.includes('Return to IT workstation'));

      // Advance through structured dialogue
      const continueBtn = rootOverlay.querySelector<MockElement>('#btn-dialogue-continue');
      assert.ok(continueBtn);
      continueBtn!.click();

      // Amaka's compliance line is displayed
      const amakaFollowup = rootOverlay.textContent;
      assert.ok(amakaFollowup.includes('compliance incident register'));
      assert.ok(amakaFollowup.includes('NDPA'));
    });

    it('preserves conversation progress and choice when candidate steps away to office floor and returns', () => {
      ui.showIncidentModal(activeIncident, evaluatedChoices);

      // Select option and enter workstation
      rootOverlay.querySelector<MockElement>('#btn-dialogue-opt-interacted_yet')!.click();
      rootOverlay.querySelector<MockElement>('#btn-open-workstation')!.click();

      // Step away to office
      rootOverlay.querySelector<MockElement>('#btn-investigation-step-away')!.click();
      assert.equal(stepAwayFired, true);

      // State is preserved in UIManager
      const state = ui.getPhishingInteractionState();
      assert.equal(state?.introCompleted, true);
      assert.equal(state?.openingResponse, 'interacted_yet');

      // Candidate walks back and interacts with Tunde / workstation again
      ui.showIncidentModal(activeIncident, evaluatedChoices);

      // Should display follow-up conversation acknowledging what was done, not restarting intro
      assert.equal(rootOverlay.querySelector<MockElement>('#btn-dialogue-opt-interacted_yet'), null);
      const text = rootOverlay.textContent;
      assert.ok(text.includes('Yusuf'));
      assert.ok(text.includes('Return to IT workstation'));
    });

    it('renders professional decision card action labels on workstation matching investigation state', () => {
      ui.showIncidentModal(activeIncident, evaluatedChoices);
      rootOverlay.querySelector<MockElement>('#btn-open-workstation')!.click();

      // 1. Unopened state: standard report & delete without proper escalation
      let text = rootOverlay.textContent;
      assert.ok(text.includes('Report the suspicious message and coordinate containment'));
      assert.ok(text.includes('Delete the message without proper escalation'));

      // 2. Link opened state
      rootOverlay.querySelector<MockElement>('#btn-open-link')!.click();
      rootOverlay.querySelector<MockElement>('#btn-close-browser')!.click();
      text = rootOverlay.textContent;
      assert.ok(text.includes('Report that the link was opened and request further checks'));
      assert.ok(text.includes('Delete the message without proper escalation'));

      // 3. Credentials submitted state
      rootOverlay.querySelector<MockElement>('#btn-open-link')!.click();
      rootOverlay.querySelector<MockElement>('#btn-submit-credentials')!.click();
      text = rootOverlay.textContent;
      assert.ok(text.includes('Immediately disclose credential exposure and initiate containment'));
      assert.ok(text.includes('Delete the message without proper escalation'));
    });

    it('renders post-incident debrief conversation and enriched learning feedback in resolution modal', () => {
      const record = {
        turn: 1,
        incidentId: 'INC_MAIL_FIRS',
        chosenOptionId: 'CHOICE_MAIL_REPORT',
        chosenOptionLabel: 'Report the suspicious message and coordinate containment',
        executiveRationale: 'Immediate reporting ensures company-wide perimeter containment.',
        effectiveChoiceImpact: {
          operationalExplanation: 'Tunde blocked the sender and reset Yusuf\'s credentials.',
          cashDelta: -12000,
          grossBurnRateDelta: 0,
          debtDelta: 0,
          hrDelta: 2,
          itDelta: 8,
        },
        immediateFinancialDeltas: { cashDelta: -12000, grossBurnRateDelta: 0, debtDelta: 0 },
        immediateMetricDeltas: { hrDelta: 2, itDelta: 8 },
        monthlyBurnDeductionPaid: { totalCashDeducted: 100000, operationsCash: 70000, loanPrincipalCash: 30000 },
        delayedEffectsScheduled: [],
        delayedEffectsResolvedThisTurn: [],
        businessCausality: 'Triage complete',
        learningFeedback: {
          corePrinciple: 'Prompt reporting and perimeter containment protect the entire organization',
          tradeoffSummary: 'Reporting the message without interacting allowed IT to block the malicious domain.',
          risksCreated: [
            'Preserve email headers and gateway logs in the incident register for audit',
            'Verify whether any of the other 10 recipients interacted with the message',
          ],
        },
        stateBefore: {} as any,
        stateAfter: {} as any,
      };

      ui.showResolutionModal(record as any, 'TURN_INCIDENT_ACTIVE' as any, false);

      const modalBackdrop = rootOverlay.querySelector<MockElement>('.modal-backdrop')!;
      assert.ok(modalBackdrop.className.includes('is-resolution-overlay'), 'modalContainer has is-resolution-overlay class');
      const outcomeElem = rootOverlay.querySelector<MockElement>('.resolution-outcome-dialogue');
      assert.ok(outcomeElem, 'Outcome dialogue container is rendered');
      assert.ok(rootOverlay.querySelector<MockElement>('.outcome-action-summary'), 'Action summary rendered');
      assert.ok(rootOverlay.querySelector<MockElement>('.compact-health-strip'), 'Compact health strip rendered');
      assert.ok(rootOverlay.querySelector<MockElement>('.compact-takeaway-card'), 'Compact takeaway card rendered');
      assert.ok(rootOverlay.querySelector<MockElement>('.resolution-expandable-details'), 'Expandable details rendered');

      const text = rootOverlay.textContent;
      assert.ok(text.includes('Tunde Bello · Head of IT'));
      assert.ok(text.includes('Amaka Obi · Chief Compliance Officer'));
      assert.ok(text.includes('Perimeter gateway blocked the domain'));
      assert.ok(text.includes('compliance breach register'));
      assert.ok(rootOverlay.querySelector<MockElement>('.takeaway-escalation'));
      assert.ok(text.includes('Preserve email headers and gateway logs'));
    });
  });

  describe('Tunde Proximity Speech Bubble Greeting Lifecycle & State Machine', () => {
    interface SimulatedCalloutScene {
      activeDepartment: string | null;
      playerX: number;
      playerY: number;
      isMovementLocked: boolean;
      isEmergencyActive: boolean;
      isTextInputFocused: boolean;
      hasTundeCalledOut: boolean;
      isTundeConversationResolved: boolean;
      isTundeIntroCompleted: boolean;
      isDepartmentResolved: boolean;
      bubbleVisible: boolean;
      bubbleAlpha: number;
      bubbleText: string;
      timerMs: number | null;
    }

    function createSimulatedScene(): SimulatedCalloutScene {
      return {
        activeDepartment: 'IT',
        playerX: 800,
        playerY: 420,
        isMovementLocked: false,
        isEmergencyActive: false,
        isTextInputFocused: false,
        hasTundeCalledOut: false,
        isTundeConversationResolved: false,
        isTundeIntroCompleted: false,
        isDepartmentResolved: false,
        bubbleVisible: false,
        bubbleAlpha: 1,
        bubbleText: '“Amaka, do you have a minute?”',
        timerMs: null,
      };
    }

    function checkProximity(scene: SimulatedCalloutScene): void {
      if (!scene.activeDepartment || scene.isEmergencyActive) {
        dismissBubble(scene);
        return;
      }

      const distToTunde =
        scene.activeDepartment === 'IT'
          ? Math.hypot(scene.playerX - 440, scene.playerY - 210)
          : Infinity;
      const isNearTunde = distToTunde <= 115;

      const canTriggerGreeting =
        scene.activeDepartment === 'IT' &&
        isNearTunde &&
        !scene.hasTundeCalledOut &&
        !scene.isTundeConversationResolved &&
        !scene.isDepartmentResolved &&
        !scene.isTundeIntroCompleted &&
        !scene.isMovementLocked &&
        !scene.isEmergencyActive &&
        !scene.isTextInputFocused;

      if (canTriggerGreeting) {
        triggerCallout(scene);
      }
    }

    function triggerCallout(scene: SimulatedCalloutScene): void {
      scene.hasTundeCalledOut = true;
      scene.bubbleText = '“Amaka, do you have a minute?”';
      scene.bubbleAlpha = 1;
      scene.bubbleVisible = true;
      scene.timerMs = 4000;
    }

    function advanceTimer(scene: SimulatedCalloutScene, ms: number): void {
      if (scene.timerMs !== null) {
        scene.timerMs -= ms;
        if (scene.timerMs <= 0) {
          scene.timerMs = null;
          // Fade out completed
          scene.bubbleAlpha = 0;
          scene.bubbleVisible = false;
        }
      }
    }

    function dismissBubble(scene: SimulatedCalloutScene): void {
      scene.timerMs = null;
      scene.bubbleVisible = false;
      scene.bubbleAlpha = 1;
    }

    it('triggers speech bubble with "Amaka, do you have a minute?" when first approaching Tunde', () => {
      const scene = createSimulatedScene();
      assert.equal(scene.hasTundeCalledOut, false);
      assert.equal(scene.bubbleVisible, false);

      // Amaka is at lobby (800, 420) — dist to (440, 210) ~ 417px
      checkProximity(scene);
      assert.equal(scene.hasTundeCalledOut, false);
      assert.equal(scene.bubbleVisible, false);

      // Amaka moves within Tunde speaking distance (450, 220) — dist ~ 14px <= 115px
      scene.playerX = 450;
      scene.playerY = 220;
      checkProximity(scene);

      assert.equal(scene.hasTundeCalledOut, true);
      assert.equal(scene.bubbleVisible, true);
      assert.equal(scene.bubbleText, '“Amaka, do you have a minute?”');
      assert.equal(scene.timerMs, 4000);
      assert.equal(scene.isMovementLocked, false, 'Amaka movement remains unlocked');
    });

    it('auto-hides the speech bubble after 4 seconds', () => {
      const scene = createSimulatedScene();
      scene.playerX = 450;
      scene.playerY = 220;
      checkProximity(scene);

      assert.equal(scene.bubbleVisible, true);

      // Advance 2 seconds — still visible
      advanceTimer(scene, 2000);
      assert.equal(scene.bubbleVisible, true);

      // Advance remaining 2 seconds — auto-hides
      advanceTimer(scene, 2000);
      assert.equal(scene.bubbleVisible, false);
      assert.equal(scene.timerMs, null);
    });

    it('triggers only once per session and does not re-trigger when stepping away and returning', () => {
      const scene = createSimulatedScene();
      scene.playerX = 450;
      scene.playerY = 220;
      checkProximity(scene);
      assert.equal(scene.hasTundeCalledOut, true);

      // Auto-hide fires after 4s
      advanceTimer(scene, 4000);
      assert.equal(scene.bubbleVisible, false);

      // Amaka steps away to the lobby
      scene.playerX = 800;
      scene.playerY = 420;
      checkProximity(scene);
      assert.equal(scene.bubbleVisible, false);

      // Amaka returns near Tunde again
      scene.playerX = 450;
      scene.playerY = 220;
      checkProximity(scene);

      // Does NOT re-trigger
      assert.equal(scene.bubbleVisible, false);
      assert.equal(scene.hasTundeCalledOut, true);
    });

    it('does not trigger greeting if a modal is already open (movement locked)', () => {
      const scene = createSimulatedScene();
      scene.isMovementLocked = true; // Modal is open
      scene.playerX = 450;
      scene.playerY = 220;

      checkProximity(scene);
      assert.equal(scene.hasTundeCalledOut, false);
      assert.equal(scene.bubbleVisible, false);
    });

    it('immediately dismisses active speech bubble if a modal opens or interaction occurs', () => {
      const scene = createSimulatedScene();
      scene.playerX = 450;
      scene.playerY = 220;
      checkProximity(scene);
      assert.equal(scene.bubbleVisible, true);

      // User presses E/Space or opens modal -> locks movement
      scene.isMovementLocked = true;
      dismissBubble(scene);

      assert.equal(scene.bubbleVisible, false);
      assert.equal(scene.timerMs, null);
    });

    it('does not trigger greeting if incident is resolved or department is resolved', () => {
      const scene = createSimulatedScene();
      scene.isTundeConversationResolved = true;
      scene.playerX = 450;
      scene.playerY = 220;

      checkProximity(scene);
      assert.equal(scene.hasTundeCalledOut, false);
      assert.equal(scene.bubbleVisible, false);
    });

    it('resets callout state when simulation restarts so greeting can fire in new session', () => {
      const scene = createSimulatedScene();
      scene.playerX = 450;
      scene.playerY = 220;
      checkProximity(scene);
      assert.equal(scene.hasTundeCalledOut, true);

      // Restart simulation
      scene.playerX = 800;
      scene.playerY = 420;
      scene.hasTundeCalledOut = false;
      scene.isTundeConversationResolved = false;
      scene.isTundeIntroCompleted = false;
      dismissBubble(scene);

      // In the new session, approaching Tunde triggers callout again
      scene.playerX = 450;
      scene.playerY = 220;
      checkProximity(scene);
      assert.equal(scene.hasTundeCalledOut, true);
      assert.equal(scene.bubbleVisible, true);
    });
  });

  // ==========================================================================
  // TYPED QUESTIONS & NATURAL LANGUAGE INQUIRY SYSTEM
  // ==========================================================================

  describe('Typed Questions & Natural Language Inquiry System', () => {
    describe('Question Interpretation Across Natural Variations', () => {
      it('interprets variations of incident premise (what happened)', () => {
        const q1 = answerTundeQuestion('What happened?');
        assert.equal(q1.category, 'what_happened');
        assert.ok(q1.response.includes('Tax Clearance Certificate'));
        assert.ok(q1.response.includes('12 noon'));

        const q2 = answerTundeQuestion("Tell me what's going on");
        assert.equal(q2.category, 'what_happened');

        const q3 = answerTundeQuestion('What is the situation?');
        assert.equal(q3.category, 'what_happened');

        const q4 = answerTundeQuestion('Why did you call me here?');
        assert.equal(q4.category, 'what_happened');
      });

      it('interprets variations of Yusuf’s actions and employee involvement', () => {
        const q1 = answerTundeQuestion('What did Yusuf do?');
        assert.equal(q1.category, 'yusuf_actions');

        const q2 = answerTundeQuestion('Did Yusuf click the link?');
        assert.equal(q2.category, 'yusuf_actions');

        const q3 = answerTundeQuestion('Has anyone in Finance interacted with the email?');
        assert.equal(q3.category, 'yusuf_actions');

        const q4 = answerTundeQuestion('Did Yusuf enter his password?');
        assert.equal(q4.category, 'yusuf_actions');
      });

      it('interprets variations of email authenticity and sender legitimacy', () => {
        const q1 = answerTundeQuestion('Is this email authentic?');
        assert.equal(q1.category, 'email_authenticity');

        const q2 = answerTundeQuestion('Is it a fake email?');
        assert.equal(q2.category, 'email_authenticity');

        const q3 = answerTundeQuestion('Is this really from the FIRS?');
        assert.equal(q3.category, 'email_authenticity');

        const q4 = answerTundeQuestion('Is the sender legitimate?');
        assert.equal(q4.category, 'email_authenticity');
      });

      it('interprets variations of available evidence and forensic headers', () => {
        const q1 = answerTundeQuestion('What evidence do we have?');
        assert.equal(q1.category, 'available_evidence');

        const q2 = answerTundeQuestion('What do we know so far?');
        assert.equal(q2.category, 'available_evidence');

        const q3 = answerTundeQuestion('Have you checked the technical headers?');
        assert.equal(q3.category, 'available_evidence');

        const q4 = answerTundeQuestion('What are our findings?');
        assert.equal(q4.category, 'available_evidence');
      });

      it('interprets variations of account access and network compromise', () => {
        const q1 = answerTundeQuestion('Are our corporate accounts compromised?');
        assert.equal(q1.category, 'account_access');

        const q2 = answerTundeQuestion('Were passwords stolen?');
        assert.equal(q2.category, 'account_access');

        const q3 = answerTundeQuestion('Did they breach our network?');
        assert.equal(q3.category, 'account_access');

        const q4 = answerTundeQuestion('Is our system hacked?');
        assert.equal(q4.category, 'account_access');
      });

      it('interprets variations of immediate risks and business impacts', () => {
        const q1 = answerTundeQuestion('What are the immediate risks?');
        assert.equal(q1.category, 'immediate_risks');
        assert.ok(q1.response.includes('Business Email Compromise'));
        assert.ok(q1.response.includes('wire'));

        const q2 = answerTundeQuestion('Could we lose money from this?');
        assert.equal(q2.category, 'immediate_risks');

        const q3 = answerTundeQuestion('What is the worst-case scenario?');
        assert.equal(q3.category, 'immediate_risks');
      });

      it('interprets variations of next steps and recommendations', () => {
        const q1 = answerTundeQuestion('What should we do next?');
        assert.equal(q1.category, 'next_steps');

        const q2 = answerTundeQuestion('What do you recommend?');
        assert.equal(q2.category, 'next_steps');

        const q3 = answerTundeQuestion('How do we handle this?');
        assert.equal(q3.category, 'next_steps');
      });

      it('interprets NDPA compliance and breach register inquiries', () => {
        const q1 = answerTundeQuestion('Do we need to notify under the NDPA?');
        assert.equal(q1.category, 'ndpa_compliance');
        assert.ok(q1.response.includes('Nigeria Data Protection Act'));
        assert.ok(q1.response.includes('breach register'));

        const q2 = answerTundeQuestion('Should this be recorded in our compliance register?');
        assert.equal(q2.category, 'ndpa_compliance');
      });

      it('handles polite greetings and salutations naturally', () => {
        const q1 = answerTundeQuestion('Good morning Tunde');
        assert.equal(q1.category, 'greeting');
        assert.ok(q1.response.includes('Good morning'));

        const q2 = answerTundeQuestion('Hello');
        assert.equal(q2.category, 'greeting');
      });

      it('handles ambiguous or off-topic questions without inventing facts', () => {
        const q1 = answerTundeQuestion('What is the weather like in Abuja?');
        assert.equal(q1.category, 'ambiguous');
        assert.ok(q1.response.includes('accurate information'));
        assert.ok(q1.response.includes('clarify'));

        const q2 = answerTundeQuestion('Who won the football match yesterday?');
        assert.equal(q2.category, 'ambiguous');

        const q3 = answerTundeQuestion('   ');
        assert.equal(q3.category, 'ambiguous');
      });
    });

    describe('Information Boundaries Verification', () => {
      it('before terminal inspection: does not claim investigation is complete or reveal workstation facts prematurely', () => {
        const uninspectedState = {
          isSenderInspected: false,
          isLinkInspected: false,
          linkOpened: false,
          credentialsSubmitted: false,
          introCompleted: false,
        };

        // Yusuf's actions: must not claim Yusuf definitely typed his password
        const yusufAnswer = answerTundeQuestion('Did Yusuf enter his password?', uninspectedState);
        assert.ok(yusufAnswer.response.includes("haven't confirmed whether Yusuf or anyone else in Finance opened"));
        assert.equal(yusufAnswer.response.includes('Yusuf admitted'), false, 'Must not claim admission before terminal check');

        // Email authenticity: must not cite Russian relay IP before inspection
        const authAnswer = answerTundeQuestion('Is this email fake?', uninspectedState);
        assert.ok(authAnswer.response.includes('firs.gov.ng'));
        assert.ok(authAnswer.response.includes('firs-gov.com.ng'));
        assert.equal(authAnswer.response.includes('185.220.101.44'), false, 'Must not cite Russian relay before inspection');

        // Evidence: must state evidence is the email message waiting on workstation
        const evAnswer = answerTundeQuestion('What evidence do we have?', uninspectedState);
        assert.ok(evAnswer.response.includes('loaded on the workstation terminal waiting for us'));
        assert.equal(evAnswer.response.includes('Terminal inspection confirmed'), false);

        // Account access: must not claim confirmed network breach
        const accessAnswer = answerTundeQuestion('Are our systems hacked?', uninspectedState);
        assert.ok(accessAnswer.response.includes("don't have evidence of an active network breach"));
      });

      it('after terminal inspection: cites confirmed forensic findings and Yusuf’s admission', () => {
        const inspectedState = {
          isSenderInspected: true,
          isLinkInspected: true,
          linkOpened: true,
          introCompleted: true,
        };

        // Yusuf's actions: confirms Yusuf admitted clicking and typing password
        const yusufAnswer = answerTundeQuestion('What did Yusuf do?', inspectedState);
        assert.ok(yusufAnswer.response.includes('Yusuf admitted he opened the link'));
        assert.ok(yusufAnswer.response.includes('revoke his active sessions'));

        // Email authenticity: confirms definitive fake citing Russian relay and SPF failure
        const authAnswer = answerTundeQuestion('Is this email authentic?', inspectedState);
        assert.ok(authAnswer.response.includes('Russian relay'));
        assert.ok(authAnswer.response.includes('185.220.101.44'));
        assert.ok(authAnswer.response.includes('SPF failed'));

        // Evidence: confirms workstation inspection findings
        const evAnswer = answerTundeQuestion('What evidence do we have?', inspectedState);
        assert.ok(evAnswer.response.includes('Russian relay'));
        assert.ok(evAnswer.response.includes('failed SPF'));
      });

      it('when credentials submitted during testing: explicitly addresses corporate account exposure', () => {
        const credsState = {
          isSenderInspected: true,
          isLinkInspected: true,
          linkOpened: true,
          credentialsSubmitted: true,
          introCompleted: true,
        };

        const accessAnswer = answerTundeQuestion('Were credentials stolen?', credsState);
        assert.ok(accessAnswer.response.includes('corporate credentials were submitted to the attacker'));
        assert.ok(accessAnswer.response.includes('Active session tokens were transmitted'));
      });
    });

    describe('UI Input & Conversation Thread Lifecycle in Desk Modal', () => {
      let uiManager: UIManager;
      let selectedChoice: string | null = null;

      beforeEach(() => {
        rootOverlay.children = [];
        rootOverlay.rawHtml = '';
        selectedChoice = null;
        uiManager = new UIManager({
          onSelectChoice: (choiceId) => {
            selectedChoice = choiceId;
          },
          onDismissResolution: () => {},
          onRestart: () => {},
          onPromptInteract: () => {},
        });
      });

      it('renders the question input bar alongside existing dialogue choices in desk conversation', () => {
        uiManager.showIncidentModal(activeIncident, evaluatedChoices);

        const askBar = rootOverlay.querySelector('.cinematic-ask-bar');
        assert.ok(askBar, '.cinematic-ask-bar container must exist');

        const askInput = rootOverlay.querySelector<MockElement>('#input-ask-tunde');
        assert.ok(askInput, '#input-ask-tunde input element must exist');

        const askBtn = rootOverlay.querySelector('#btn-submit-question');
        assert.ok(askBtn, '#btn-submit-question submit button must exist');

        // Existing dialogue choices must remain present
        const choiceBtns = rootOverlay.querySelectorAll('.dialogue-choice-btn');
        assert.equal(choiceBtns.length, 3, 'All 3 preset dialogue options must remain accessible');

        // Workstation button must remain present
        const wsBtn = rootOverlay.querySelector('#btn-open-workstation');
        assert.ok(wsBtn, '#btn-open-workstation must remain present');
      });

      it('submitting a question renders a short, readable conversation thread and does not mutate simulation state', () => {
        uiManager.showIncidentModal(activeIncident, evaluatedChoices);

        const askForm = rootOverlay.querySelector<MockElement>('#form-ask-tunde');
        const askInput = rootOverlay.querySelector<MockElement>('#input-ask-tunde');
        assert.ok(askForm && askInput);

        // Candidate types a question
        askInput.value = 'What did Yusuf do?';
        askForm.submit();

        // Conversation thread must be rendered
        const thread = rootOverlay.querySelector('.cinematic-speech-thread');
        assert.ok(thread, '.cinematic-speech-thread must be rendered after submitting a question');

        const candidateBubble = rootOverlay.querySelector('.candidate-bubble');
        assert.ok(candidateBubble, 'Candidate question bubble must be rendered');
        assert.ok(candidateBubble.textContent.includes('What did Yusuf do?'), 'Candidate question text must appear');

        const tundeBubble = rootOverlay.querySelector('.tunde-bubble');
        assert.ok(tundeBubble, 'Tunde answer bubble must be rendered');
        assert.ok(tundeBubble.textContent.includes("haven't confirmed whether Yusuf"));

        // Must NOT trigger a decision or call onSelectChoice
        assert.equal(selectedChoice, null, 'Typing a question must NOT trigger an operational choice');

        // Workstation button and preset choices remain accessible
        assert.ok(rootOverlay.querySelector('#btn-open-workstation'));
        assert.equal(rootOverlay.querySelectorAll('.dialogue-choice-btn').length, 3);
      });

      it('submitting a follow-up question updates the conversation thread cleanly', () => {
        uiManager.showIncidentModal(activeIncident, evaluatedChoices);

        const askForm = rootOverlay.querySelector<MockElement>('#form-ask-tunde');
        const askInput = rootOverlay.querySelector<MockElement>('#input-ask-tunde');
        assert.ok(askForm && askInput);

        // First question
        askInput.value = 'What happened?';
        askForm.submit();

        let candidateBubble = rootOverlay.querySelector('.candidate-bubble');
        assert.ok(candidateBubble?.textContent.includes('What happened?'));

        // Second follow-up question
        const updatedForm = rootOverlay.querySelector<MockElement>('#form-ask-tunde');
        const updatedInput = rootOverlay.querySelector<MockElement>('#input-ask-tunde');
        assert.ok(updatedForm && updatedInput);

        updatedInput.value = 'What are the immediate risks?';
        updatedForm.submit();

        candidateBubble = rootOverlay.querySelector('.candidate-bubble');
        assert.ok(candidateBubble?.textContent.includes('What are the immediate risks?'));

        const tundeBubble = rootOverlay.querySelector('.tunde-bubble');
        assert.ok(tundeBubble?.textContent.includes('Business Email Compromise'));
      });

      it('clicking a preset option resets active question view and displays structured Amaka/Tunde lines', () => {
        uiManager.showIncidentModal(activeIncident, evaluatedChoices);

        // Ask a question first
        const askForm = rootOverlay.querySelector<MockElement>('#form-ask-tunde');
        const askInput = rootOverlay.querySelector<MockElement>('#input-ask-tunde');
        assert.ok(askForm && askInput);
        askInput.value = 'Is it fake?';
        askForm.submit();

        assert.ok(rootOverlay.querySelector('.cinematic-speech-thread'));

        // Now click preset option "What made you suspicious?"
        const suspiciousBtn = rootOverlay.querySelector<MockElement>('#btn-dialogue-opt-what_suspicious');
        assert.ok(suspiciousBtn);
        suspiciousBtn.click();

        // Speech thread is replaced by Amaka's line
        const speechText = rootOverlay.querySelector('.cinematic-speech-text');
        assert.ok(speechText);
        assert.ok(speechText.textContent.includes('What made you suspicious?'));
      });

      it('empty or whitespace question submission does nothing and does not break display', () => {
        uiManager.showIncidentModal(activeIncident, evaluatedChoices);

        const askForm = rootOverlay.querySelector<MockElement>('#form-ask-tunde');
        const askInput = rootOverlay.querySelector<MockElement>('#input-ask-tunde');
        assert.ok(askForm && askInput);

        askInput.value = '    ';
        askForm.submit();

        // Still renders standard opening speech bubble
        const speechText = rootOverlay.querySelector('.cinematic-speech-text');
        assert.ok(speechText);
        assert.ok(speechText.textContent.includes(TUNDE_OPENING_LINE));
      });
    });
  });
});
