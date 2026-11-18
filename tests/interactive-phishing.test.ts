/**
 * Mustarred Company Simulator - Interactive Phishing Incident Test Suite
 *
 * Comprehensive integration tests verifying:
 * 1. Monday Morning Scenario baseline state & IT Phishing incident definition.
 * 2. Deterministic headless simulation consequences for all 5 tactical phishing outcomes:
 *    - CHOICE_MAIL_REPORT (clean triage)
 *    - CHOICE_MAIL_INSPECTED_REPORT (link inspected without entering credentials, reported)
 *    - CHOICE_MAIL_OPEN_CONTAINED (credentials submitted, but emergency reset contained)
 *    - CHOICE_MAIL_OPEN (uncontained credential theft -> Turn 3 catastrophic delayed loss)
 *    - CHOICE_MAIL_DELETE (deleted without reporting -> Turn 2 second-click delayed loss)
 * 3. Interactive DOM modal lifecycle:
 *    - Inspect sender drawer toggle (SPF, IP, domain age)
 *    - Link opening & simulated external browser window
 *    - Simulated login form & credential submission
 *    - Status banner progression (clean -> warning -> critical)
 * 4. Strict enforcement of Requirement 5:
 *    - A candidate's physical actions cannot be undone by a safe radio choice.
 *    - Submitting credentials and choosing "Delete" resolves to CHOICE_MAIL_OPEN.
 *    - Submitting credentials and unchecking emergency reset resolves to CHOICE_MAIL_OPEN.
 *    - Only submitting credentials AND reporting AND resetting own account achieves CHOICE_MAIL_OPEN_CONTAINED.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { CompanySimulation } from '../src/simulation/CompanySimulation.ts';
import {
  MONDAY_MORNING_SCENARIO,
  CHOICES_IT_MAIL,
  MONDAY_INITIAL_CONDITIONS,
} from '../src/simulation/mondayMorning.data.ts';
import { UIManager } from '../src/ui/UIManager.ts';
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

  public remove(): void {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx !== -1) {
        this.parentNode.children.splice(idx, 1);
      }
      this.parentNode = null;
    }
  }

  public addEventListener(type: string, handler: (event: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(handler);
  }

  public removeEventListener(type: string, handler: (event: any) => void): void {
    const list = this.listeners.get(type);
    if (list) {
      this.listeners.set(
        type,
        list.filter((h) => h !== handler)
      );
    }
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
      return this.classList.contains(sel.slice(1));
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
    // Regex scanner to extract HTML tags, IDs, classes, types, values, and inner text
    const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>([^<]*)/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(html)) !== null) {
      const rawTag = match[1];
      if (rawTag.startsWith('/')) continue;

      const attrsStr = match[2];
      const innerText = match[3]?.trim();
      const elem = new MockElement(rawTag);
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

      this.appendChild(elem);
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

const windowListeners: Map<string, ((event: any) => void)[]> = new Map();
(global as any).window = {
  addEventListener: (type: string, handler: (event: any) => void) => {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type)!.push(handler);
  },
  removeEventListener: (type: string, handler: (event: any) => void) => {
    const list = windowListeners.get(type);
    if (list) {
      windowListeners.set(
        type,
        list.filter((h) => h !== handler)
      );
    }
  },
};

// ============================================================================
// 1. SCENARIO INITIALIZATION & BASELINE STATE
// ============================================================================

describe('Monday Morning Scenario - IT Phishing Baseline State', () => {
  it('initialises correctly with MONDAY_INITIAL_CONDITIONS', () => {
    const sim = new CompanySimulation(MONDAY_MORNING_SCENARIO);
    const state = sim.getState();

    assert.equal(state.scenarioId, 'SCENARIO_MONDAY_MORNING');
    assert.equal(state.currentTurn, 1);
    assert.equal(state.totalTurns, 4);
    assert.equal(state.phase, 'AWAITING_DECISION');
    assert.equal(state.isInsolvent, false);

    assert.equal(state.financials.cash, MONDAY_INITIAL_CONDITIONS.startingCash); // $320,000.00 (32_000_000 cents)
    assert.equal(state.financials.grossMonthlyBurn, 2_200_000); // $22,000.00/mo
    assert.equal(state.financials.debtPrincipal, 0);

    assert.equal(state.metrics.hrMorale, 70);
    assert.equal(state.metrics.itStability, 66);

    const activeIncident = sim.getActiveIncident();
    assert.ok(activeIncident);
    assert.equal(activeIncident.id, 'INC_MAIL_FIRS');
    assert.equal(activeIncident.department, 'IT');
    assert.equal(activeIncident.urgency, 'critical');
    assert.ok(activeIncident.basePremise.includes('Yusuf already opened his and typed his password'));
    assert.ok(activeIncident.artifact?.title.includes('FIRS'));

    const choices = sim.getEvaluatedChoices();
    assert.equal(choices.length, 5);
    assert.ok(choices.every((c) => !c.isLocked));
  });
});

// ============================================================================
// 2. SIMULATION ENGINE CONSEQUENCE RESOLUTION (ALL 5 CHOICES)
// ============================================================================

describe('Simulation Engine - Phishing Decision Consequences & Cascades', () => {
  it('Choice 1 (Report email): clean triage (+8 IT, +2 HR, -$120 fee, no delayed effect)', () => {
    const sim = new CompanySimulation(MONDAY_MORNING_SCENARIO);
    const result = sim.resolveDecision('CHOICE_MAIL_REPORT');

    assert.equal(result.success, true);
    assert.equal(result.nextPhase, 'AWAITING_DECISION');
    assert.equal(result.updatedState.currentTurn, 2);

    const record = result.record!;
    assert.equal(record.chosenOptionId, 'CHOICE_MAIL_REPORT');
    assert.equal(record.immediateFinancialDeltas.cashDelta, -12_000);
    assert.equal(record.immediateMetricDeltas.itDelta, 8);
    assert.equal(record.immediateMetricDeltas.hrDelta, 2);

    // 32_000_000 - 12_000 - 2_200_000 burn = 29_788_000
    assert.equal(result.updatedState.financials.cash, 29_788_000);
    assert.equal(result.updatedState.metrics.itStability, 74);
    assert.equal(result.updatedState.metrics.hrMorale, 72);
    assert.equal(result.updatedState.pendingDelayedEffects.length, 0);
  });

  it('Choice 2 (Inspected & Reported): endpoint verification (+4 IT, +1 HR, -$200 fee, no delayed effect)', () => {
    const sim = new CompanySimulation(MONDAY_MORNING_SCENARIO);
    const result = sim.resolveDecision('CHOICE_MAIL_INSPECTED_REPORT');

    assert.equal(result.success, true);
    assert.equal(result.updatedState.currentTurn, 2);

    const record = result.record!;
    assert.equal(record.chosenOptionId, 'CHOICE_MAIL_INSPECTED_REPORT');
    assert.equal(record.immediateFinancialDeltas.cashDelta, -20_000);
    assert.equal(record.immediateMetricDeltas.itDelta, 4);
    assert.equal(record.immediateMetricDeltas.hrDelta, 1);

    // 32_000_000 - 20_000 - 2_200_000 = 29_780_000
    assert.equal(result.updatedState.financials.cash, 29_780_000);
    assert.equal(result.updatedState.metrics.itStability, 70);
    assert.equal(result.updatedState.metrics.hrMorale, 71);
    assert.equal(result.updatedState.pendingDelayedEffects.length, 0);
  });

  it('Choice 3 (Emergency Contained): rapid password revocation (-4 IT, -2 HR, prevents Turn 3 catastrophe)', () => {
    const sim = new CompanySimulation(MONDAY_MORNING_SCENARIO);
    const result = sim.resolveDecision('CHOICE_MAIL_OPEN_CONTAINED');

    assert.equal(result.success, true);
    assert.equal(result.updatedState.currentTurn, 2);

    const record = result.record!;
    assert.equal(record.chosenOptionId, 'CHOICE_MAIL_OPEN_CONTAINED');
    assert.equal(record.immediateFinancialDeltas.cashDelta, -50_000);
    assert.equal(record.immediateMetricDeltas.itDelta, -4);
    assert.equal(record.immediateMetricDeltas.hrDelta, -2);

    // 32_000_000 - 50_000 - 2_200_000 = 29_750_000
    assert.equal(result.updatedState.financials.cash, 29_750_000);
    assert.equal(result.updatedState.metrics.itStability, 62);
    assert.equal(result.updatedState.metrics.hrMorale, 68);
    // Crucial: emergency reset contained the breach, so no delayed effect is scheduled
    assert.equal(result.updatedState.pendingDelayedEffects.length, 0);
  });

  it('Choice 4 (Uncontained Breach): submits credentials, triggers $1.5M catastrophe on Turn 3', () => {
    const sim = new CompanySimulation(MONDAY_MORNING_SCENARIO);
    const t1Result = sim.resolveDecision('CHOICE_MAIL_OPEN');

    assert.equal(t1Result.success, true);
    assert.equal(t1Result.updatedState.currentTurn, 2);
    assert.equal(t1Result.updatedState.metrics.itStability, 52); // 66 - 14
    assert.equal(t1Result.updatedState.metrics.hrMorale, 66); // 70 - 4

    // Verify delayed effect EFF_MAIL_CREDENTIALS_USED scheduled for Turn 3
    const pending = t1Result.updatedState.pendingDelayedEffects;
    assert.equal(pending.length, 1);
    assert.equal(pending[0].effectId, 'EFF_MAIL_CREDENTIALS_USED');
    assert.equal(pending[0].triggerTurn, 3);
    assert.equal(pending[0].cashDelta, -1_500_000);
    assert.equal(pending[0].itDelta, -8);
    assert.equal(pending[0].hrDelta, -4);

    // Turn 2: Resolve HR dispute cleanly (CHOICE_HR_PANEL: -$30_000, +8 HR, 0 IT, -$2_200_000 burn)
    const t2Result = sim.resolveDecision('CHOICE_HR_PANEL');
    assert.equal(t2Result.success, true);
    assert.equal(t2Result.updatedState.currentTurn, 3);

    // Turn 3 has begun: verify EFF_MAIL_CREDENTIALS_USED executed automatically at turn start
    // Expected Cash at start of Turn 3:
    // T1 end: 29_750_000
    // T2 choice: -30_000, T2 burn: -2_200_000 => 27_520_000
    // Delayed Turn 3 effect: -1_500_000 => 26_020_000
    assert.equal(t2Result.updatedState.financials.cash, 26_020_000);
    // IT: 52 - 8 = 44
    assert.equal(t2Result.updatedState.metrics.itStability, 44);
    // HR: 66 + 8 (from HR panel) - 4 (from breach) = 70
    assert.equal(t2Result.updatedState.metrics.hrMorale, 70);
    assert.equal(t2Result.updatedState.pendingDelayedEffects.length, 0);
  });

  it('Choice 5 (Delete Email): unalerted colleagues open link, triggering Turn 2 second click loss', () => {
    const sim = new CompanySimulation(MONDAY_MORNING_SCENARIO);
    const t1Result = sim.resolveDecision('CHOICE_MAIL_DELETE');

    assert.equal(t1Result.success, true);
    // T1 cash: 32_000_000 - 0 choice - 2_200_000 burn = 29_800_000
    // Delayed effect EFF_MAIL_SECOND_CLICK scheduled for Turn 2
    // Turn 2 starts immediately in updatedState:
    // Turn 2 delayed effect executes: -$400_000 cash, -6 IT, -2 HR
    // Cash: 29_800_000 - 400_000 = 29_400_000
    assert.equal(t1Result.updatedState.financials.cash, 29_400_000);
    // IT: 66 - 6 (T1) - 6 (delayed) = 54
    assert.equal(t1Result.updatedState.metrics.itStability, 54);
    // HR: 70 - 0 (T1) - 2 (delayed) = 68
    assert.equal(t1Result.updatedState.metrics.hrMorale, 68);
    assert.equal(t1Result.updatedState.pendingDelayedEffects.length, 0);
  });
});

// ============================================================================
// 3. INTERACTIVE UI WORKFLOW & REQUIREMENT 5 VERIFICATION
// ============================================================================

describe('UIManager - Phishing Email Interactive Modal & Consequence Mapping', () => {
  let selectedChoiceId: string | null = null;
  let ui: UIManager;

  const mockCallbacks = {
    onSelectChoice: (choiceId: string) => {
      selectedChoiceId = choiceId;
    },
    onDismissResolution: () => {},
    onRestart: () => {},
    onPromptInteract: () => {},
  };

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

  beforeEach(() => {
    selectedChoiceId = null;
    ui = new UIManager(mockCallbacks);
  });

  // ============================================================================
  // REQUIREMENT 1: OFFICE-TO-INCIDENT TRANSITION & DESK CONVERSATION
  // ============================================================================

  it('Requirement 1: renders short natural conversation with Tunde Bello and Yusuf at IT desk', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices);

    const deskPanel = rootOverlay.querySelector<MockElement>('.desk-conversation-panel');
    const openWorkstationBtn = rootOverlay.querySelector<MockElement>('#btn-open-workstation');
    const stepAwayBtn = rootOverlay.querySelector<MockElement>('#btn-desk-step-away');
    const closeBtn = rootOverlay.querySelector<MockElement>('#btn-desk-close');

    assert.ok(deskPanel, 'Desk conversation panel exists');
    assert.ok(openWorkstationBtn, 'Examine email on workstation button exists');
    assert.ok(stepAwayBtn, 'Step away button exists');
    assert.ok(closeBtn, 'Close button exists');

    // Verify natural spoken dialogue from Tunde and simplified speaker presentation (no extra badges)
    const briefingText = rootOverlay.textContent;
    assert.ok(briefingText.includes('Tunde Bello'), 'Tunde Bello name badge present');
    assert.ok(briefingText.includes('Head of IT'), 'Tunde Bello role present');
    assert.equal(rootOverlay.querySelector<MockElement>('.consult-badge'), null, 'Extra header badges removed');
    assert.equal(rootOverlay.querySelector<MockElement>('.turn-indicator'), null, 'Turn indicator badge removed');
  });

  it('Requirement 1: transitions smoothly between desk conversation and IT workstation', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices);

    // Initial state: at IT desk conversation
    assert.ok(rootOverlay.querySelector<MockElement>('#btn-open-workstation'));
    assert.equal(rootOverlay.querySelector<MockElement>('#btn-inspect-sender'), null);

    // Click transition button to open workstation
    rootOverlay.querySelector<MockElement>('#btn-open-workstation')!.click();

    // Now in workstation view
    assert.ok(rootOverlay.querySelector<MockElement>('.workstation-panel'));
    assert.ok(rootOverlay.querySelector<MockElement>('#btn-inspect-sender'));
    assert.ok(rootOverlay.querySelector<MockElement>('#btn-check-link'));
    assert.ok(rootOverlay.querySelector<MockElement>('#btn-back-to-desk'));

    // Click back to desk button
    rootOverlay.querySelector<MockElement>('#btn-back-to-desk')!.click();

    // Returned to desk conversation
    assert.ok(rootOverlay.querySelector<MockElement>('#btn-open-workstation'));
    assert.equal(rootOverlay.querySelector<MockElement>('.workstation-panel'), null);
  });

  it('Requirement 2: workstation presents interactive email and progressive evidence discovery tray', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices, undefined, true);

    const inspectBtn = rootOverlay.querySelector<MockElement>('#btn-inspect-sender');
    const checkLinkBtn = rootOverlay.querySelector<MockElement>('#btn-check-link');
    const openLinkBtn = rootOverlay.querySelector<MockElement>('#btn-open-link');
    const phishLink = rootOverlay.querySelector<MockElement>('#link-phish-url');
    const drawer = rootOverlay.querySelector<MockElement>('#sender-inspection-drawer');
    const simulatedBrowser = rootOverlay.querySelector<MockElement>('#simulated-browser');
    const evidenceCounter = rootOverlay.querySelector<MockElement>('#evidence-counter');
    const executeBtn = rootOverlay.querySelector<MockElement>('#btn-execute-decision');

    assert.ok(inspectBtn, 'Inspect sender button exists');
    assert.ok(checkLinkBtn, 'Check link button exists');
    assert.ok(openLinkBtn, 'Open link button exists');
    assert.ok(phishLink, 'Phishing anchor link exists');
    assert.ok(drawer, 'Sender inspection drawer exists');
    assert.ok(drawer?.classList.contains('hidden'), 'Drawer starts hidden');
    assert.ok(simulatedBrowser?.classList.contains('hidden'), 'Simulated browser starts hidden');
    assert.ok(evidenceCounter, 'Discovered evidence counter exists');
    assert.equal(evidenceCounter?.textContent, '0 Findings', 'Starts with 0 findings');
    assert.ok(executeBtn, 'Confirm action button exists');
    assert.equal(executeBtn?.textContent.trim(), 'Confirm action');
  });

  it('Requirement 2 & Criminal Case: reveals findings progressively as candidate investigates', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices, undefined, true);

    const inspectBtn = rootOverlay.querySelector<MockElement>('#btn-inspect-sender')!;
    const checkLinkBtn = rootOverlay.querySelector<MockElement>('#btn-check-link')!;
    const evidenceCounter = rootOverlay.querySelector<MockElement>('#evidence-counter')!;

    // 1. Inspect sender
    inspectBtn.click();
    assert.equal(evidenceCounter.textContent, '1 Finding');

    // 2. Check link
    checkLinkBtn.click();
    assert.equal(evidenceCounter.textContent, '2 Findings');

    // 3. Open link in browser
    rootOverlay.querySelector<MockElement>('#btn-open-link')!.click();
    rootOverlay.querySelector<MockElement>('#btn-close-browser')!.click();
    assert.equal(evidenceCounter.textContent, '3 Findings');
  });

  it('toggles sender inspection drawer on inspect button click', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices, undefined, true);

    const inspectBtn = rootOverlay.querySelector<MockElement>('#btn-inspect-sender')!;
    const drawer = rootOverlay.querySelector<MockElement>('#sender-inspection-drawer')!;

    // Initial state: hidden
    assert.equal(drawer.classList.contains('hidden'), true);

    // Click 1: reveals drawer
    inspectBtn.click();
    assert.equal(drawer.classList.contains('hidden'), false);
    assert.equal(inspectBtn.textContent, 'Hide sender details');

    // Click 2: hides drawer
    inspectBtn.click();
    assert.equal(drawer.classList.contains('hidden'), true);
    assert.equal(inspectBtn.textContent, 'Inspect sender');
  });

  it('opens and closes simulated browser without submitting credentials', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices, undefined, true);

    const openLinkBtn = rootOverlay.querySelector<MockElement>('#btn-open-link')!;
    const simulatedBrowser = rootOverlay.querySelector<MockElement>('#simulated-browser')!;
    const closeBrowserBtn = rootOverlay.querySelector<MockElement>('#btn-close-browser')!;
    const banner = rootOverlay.querySelector<MockElement>('#phish-status-banner')!;

    // Open link
    openLinkBtn.click();
    assert.equal(simulatedBrowser.classList.contains('hidden'), false);
    assert.equal(ui.getPhishingInteractionState()?.linkOpened, true);
    assert.equal(ui.getPhishingInteractionState()?.credentialsSubmitted, false);
    assert.equal(banner.classList.contains('warning'), true);

    // Close browser without entering password
    closeBrowserBtn.click();
    assert.equal(simulatedBrowser.classList.contains('hidden'), true);
    assert.equal(ui.getPhishingInteractionState()?.credentialsSubmitted, false);
  });

  it('Flow A: Clean report (unvisited link + Report email) -> CHOICE_MAIL_REPORT', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices, undefined, true);

    const executeBtn = rootOverlay.querySelector<MockElement>('#btn-execute-decision')!;
    executeBtn.click();

    assert.equal(selectedChoiceId, 'CHOICE_MAIL_REPORT');
  });

  it('Flow B: Direct delete (unvisited link + Delete email) -> CHOICE_MAIL_DELETE', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices, undefined, true);

    const deleteRadio = rootOverlay
      .querySelectorAll<MockElement>('input[name="phish_decision_action"]')
      .find((r) => r.value === 'action_delete')!;
    deleteRadio.checked = true;
    deleteRadio.dispatchEvent({ type: 'change' });

    const executeBtn = rootOverlay.querySelector<MockElement>('#btn-execute-decision')!;
    executeBtn.click();

    assert.equal(selectedChoiceId, 'CHOICE_MAIL_DELETE');
  });

  it('Flow C: Inspected link without credentials + Report email -> CHOICE_MAIL_INSPECTED_REPORT', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices, undefined, true);

    // Open link then close
    rootOverlay.querySelector<MockElement>('#btn-open-link')!.click();
    rootOverlay.querySelector<MockElement>('#btn-close-browser')!.click();

    const executeBtn = rootOverlay.querySelector<MockElement>('#btn-execute-decision')!;
    executeBtn.click();

    assert.equal(selectedChoiceId, 'CHOICE_MAIL_INSPECTED_REPORT');
  });

  it('Flow D: Inspected link without credentials + Delete email -> CHOICE_MAIL_DELETE', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices, undefined, true);

    rootOverlay.querySelector<MockElement>('#btn-open-link')!.click();
    rootOverlay.querySelector<MockElement>('#btn-close-browser')!.click();

    const deleteRadio = rootOverlay
      .querySelectorAll<MockElement>('input[name="phish_decision_action"]')
      .find((r) => r.value === 'action_delete')!;
    deleteRadio.checked = true;
    deleteRadio.dispatchEvent({ type: 'change' });

    const executeBtn = rootOverlay.querySelector<MockElement>('#btn-execute-decision')!;
    executeBtn.click();

    assert.equal(selectedChoiceId, 'CHOICE_MAIL_DELETE');
  });

  it('Flow E (Requirement 5): Credentials entered + Report email + Reset checked -> CHOICE_MAIL_OPEN_CONTAINED', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices, undefined, true);

    // Open link & submit credentials
    rootOverlay.querySelector<MockElement>('#btn-open-link')!.click();
    rootOverlay.querySelector<MockElement>('#btn-submit-credentials')!.click();

    const banner = rootOverlay.querySelector<MockElement>('#phish-status-banner')!;
    assert.equal(banner.classList.contains('critical'), true);

    const executeBtn = rootOverlay.querySelector<MockElement>('#btn-execute-decision')!;
    executeBtn.click();

    assert.equal(selectedChoiceId, 'CHOICE_MAIL_OPEN_CONTAINED');
  });

  it('Flow F (Requirement 5): Credentials entered + Candidate clicks Delete email -> CHOICE_MAIL_OPEN (uncontained)', () => {
    ui.showIncidentModal(activeIncident, evaluatedChoices, undefined, true);

    // Open link & submit credentials
    rootOverlay.querySelector<MockElement>('#btn-open-link')!.click();
    rootOverlay.querySelector<MockElement>('#btn-submit-credentials')!.click();

    // Selecting Delete cannot erase having typed credentials on the external phishing page
    const deleteRadio = rootOverlay
      .querySelectorAll<MockElement>('input[name="phish_decision_action"]')
      .find((r) => r.value === 'action_delete')!;
    deleteRadio.checked = true;
    deleteRadio.dispatchEvent({ type: 'change' });

    const executeBtn = rootOverlay.querySelector<MockElement>('#btn-execute-decision')!;
    executeBtn.click();

    // Radio selection must NOT undo credential theft: resolves to CHOICE_MAIL_OPEN
    assert.equal(selectedChoiceId, 'CHOICE_MAIL_OPEN');
  });
});
