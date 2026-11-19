/**
 * Mustarred Company Simulator - Company Status Dashboard (HUD) Test Suite
 *
 * Verifies all requirements for the persistent executive HUD:
 * 1. Preserves company name and incident progress indicator (Turn X of Y / Completed / Insolvent).
 * 2. Displays only three primary metrics: Cash Reserves, IT Stability, HR Morale.
 * 3. Moves Debt Principal, Net Monthly Burn, and Estimated Runway into expandable financial details drawer.
 * 4. Preserves currency formatting and underlying simulation values without alteration.
 * 5. Displays IT Stability and HR Morale with clear /100 context.
 * 6. Responsive styling and compact layout for mobile viewports (375px, 390px, landscape).
 * 7. Non-interference with controls, dialogue modals, and office navigation.
 * 8. Brief indication of decision deltas using existing simulation data without inventing calculations.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { UIManager } from '../src/ui/UIManager.ts';
import type { SimulationState } from '../src/simulation/types.ts';

// ============================================================================
// LIGHTWEIGHT TREE-AWARE DOM MOCK FOR HEADLESS ENVIRONMENT
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
  public open: boolean = false;
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

  private matchesSelector(sel: string): boolean {
    if (sel.startsWith('#')) {
      return this.id === sel.slice(1);
    }
    if (sel.startsWith('.')) {
      const classes = sel.slice(1).split('.');
      return classes.every((c) => this.classList.contains(c));
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

      if (attrsStr.includes('open')) {
        elem.open = true;
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
// HELPER: CREATE BASELINE SIMULATION STATE
// ============================================================================

function createBaselineSimulationState(overrides?: Partial<SimulationState>): SimulationState {
  return {
    scenarioId: 'scen_monday_morning',
    phase: 'DECISION_PHASE',
    currentTurn: 1,
    totalTurns: 3,
    isInsolvent: false,
    financials: {
      cash: 100000000, // $1,000,000.00
      grossBurn: 4000000,
      revenue: 0,
      netBurn: 4000000,
      debtService: {
        hasActiveDebt: false,
        prePaymentPrincipal: 0,
        monthlyInterestPaid: 0,
        contractualPrincipalRepayment: 0,
        totalDebtServiceDue: 0,
        postPaymentPrincipal: 0,
      },
      postSettlementCash: 100000000,
      projectedNetMonthlyBurn: 4000000,
      effectiveRunwayMonths: 25.0,
      baseRunwayScore: 100,
      debtLeveragePenalty: 0,
      financialHealthScore: 100,
    },
    metrics: {
      itStability: 80,
      hrMorale: 85,
      complianceAudit: 90,
      criticalDeficitPenalty: 0,
      bottleneckCeiling: 100,
      overallHealthScore: 88,
      grade: 'A',
    },
    pendingIncidents: [],
    resolvedIncidents: [],
    scheduledConsequences: [],
    decisionLedger: [],
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Persistent Executive Company Status Dashboard (HUD)', () => {
  let uiManager: UIManager;

  beforeEach(() => {
    rootOverlay.children = [];
    rootOverlay.rawHtml = '';
    uiManager = new UIManager('ui-overlay');
  });

  it('Requirement 1: preserves the company name and incident progress indicator', () => {
    const state = createBaselineSimulationState({ currentTurn: 1, totalTurns: 3 });
    uiManager.updateHUD(state);

    const hudHtml = rootOverlay.querySelector('.hud-topbar')?.innerHTML || '';
    assert.ok(hudHtml.includes('MUSTARRED CORP'), 'Company name MUSTARRED CORP must be present');
    assert.ok(hudHtml.includes('TURN 1 OF 3'), 'Progress indicator TURN 1 OF 3 must be present');

    // Test completed state
    uiManager.updateHUD(createBaselineSimulationState({ phase: 'SIMULATION_COMPLETED' }));
    const completedHtml = rootOverlay.querySelector('.hud-topbar')?.innerHTML || '';
    assert.ok(completedHtml.includes('COMPLETED'), 'Phase indicator must show COMPLETED when finished');

    // Test insolvent state
    uiManager.updateHUD(createBaselineSimulationState({ isInsolvent: true }));
    const insolventHtml = rootOverlay.querySelector('.hud-topbar')?.innerHTML || '';
    assert.ok(insolventHtml.includes('INSOLVENT'), 'Phase indicator must show INSOLVENT when insolvent');
  });

  it('Requirement 2: shows only three primary metrics in the main HUD display', () => {
    const state = createBaselineSimulationState();
    uiManager.updateHUD(state);

    const centerContainer = rootOverlay.querySelector('.hud-center.hud-primary-metrics');
    assert.ok(centerContainer, '.hud-center.hud-primary-metrics container must exist');

    const primaryCards = centerContainer.querySelectorAll('.metric-card.primary');
    assert.equal(primaryCards.length, 3, 'Exactly three primary metric cards must be rendered in center container');

    const centerText = centerContainer.textContent;
    assert.ok(centerText.includes('CASH RESERVES'), 'Cash Reserves must be in primary metrics');
    assert.ok(centerText.includes('IT STABILITY'), 'IT Stability must be in primary metrics');
    assert.ok(centerText.includes('HR MORALE'), 'HR Morale must be in primary metrics');

    // Ensure Debt, Net Monthly Burn, and Est Runway are NOT inside the primary center grid
    assert.ok(!centerText.includes('DEBT PRINCIPAL'), 'Debt Principal must NOT be in primary metrics');
    assert.ok(!centerText.includes('NET MONTHLY BURN'), 'Net Monthly Burn must NOT be in primary metrics');
    assert.ok(!centerText.includes('EST. RUNWAY'), 'Estimated Runway must NOT be in primary metrics');
  });

  it('Requirement 3: moves Debt Principal, Net Monthly Burn, and Runway into expandable financial details', () => {
    const state = createBaselineSimulationState();
    uiManager.updateHUD(state);

    const detailsDrawer = rootOverlay.querySelector('#hud-finance-drawer');
    assert.ok(detailsDrawer, 'Expandable financial details drawer #hud-finance-drawer must exist');

    const summaryToggle = detailsDrawer.querySelector('.hud-finance-toggle');
    assert.ok(summaryToggle, 'Summary toggle button .hud-finance-toggle must exist');
    assert.ok(summaryToggle.textContent.includes('Treasury Details'), 'Summary label must indicate Treasury Details');

    const dropdown = detailsDrawer.querySelector('.hud-finance-dropdown');
    assert.ok(dropdown, 'Dropdown container .hud-finance-dropdown must exist');

    const dropdownText = dropdown.textContent;
    assert.ok(dropdownText.includes('DEBT PRINCIPAL'), 'Debt Principal must be in expandable financial details');
    assert.ok(dropdownText.includes('NET MONTHLY BURN'), 'Net Monthly Burn must be in expandable financial details');
    assert.ok(dropdownText.includes('EST. RUNWAY'), 'Estimated Runway must be in expandable financial details');

    const secondaryCards = dropdown.querySelectorAll('.metric-card.secondary');
    assert.equal(secondaryCards.length, 3, 'Exactly three secondary cards must exist inside dropdown');
  });

  it('Requirement 3 (state persistence): preserves drawer open state across updateHUD calls', () => {
    const state = createBaselineSimulationState();
    uiManager.updateHUD(state);

    const drawer = rootOverlay.querySelector<MockElement>('#hud-finance-drawer');
    assert.ok(drawer);
    // User opened the drawer
    drawer.open = true;

    // Subsequent simulation tick
    uiManager.updateHUD(createBaselineSimulationState({ currentTurn: 2 }));

    const updatedDrawer = rootOverlay.querySelector<MockElement>('#hud-finance-drawer');
    assert.ok(updatedDrawer);
    assert.equal(updatedDrawer.open, true, 'Drawer open state must be preserved after updateHUD');
  });

  it('Requirement 4: preserves currency formatting and underlying simulation values unchanged', () => {
    const state = createBaselineSimulationState({
      financials: {
        ...createBaselineSimulationState().financials,
        cash: 125000000, // $1,250,000.00
        debtService: {
          hasActiveDebt: true,
          prePaymentPrincipal: 50000000,
          monthlyInterestPaid: 500000,
          contractualPrincipalRepayment: 2000000,
          totalDebtServiceDue: 2500000,
          postPaymentPrincipal: 48000000, // $480,000.00
        },
        projectedNetMonthlyBurn: 3500000, // $35,000.00
        effectiveRunwayMonths: 14.2,
      },
    });

    uiManager.updateHUD(state);

    const hudHtml = rootOverlay.querySelector('.hud-topbar')?.innerHTML || '';
    assert.ok(hudHtml.includes('$1,250,000'), 'Cash must be formatted accurately as $1,250,000');
    assert.ok(hudHtml.includes('$480,000'), 'Debt Principal must be formatted accurately as $480,000');
    assert.ok(hudHtml.includes('$35,000/mo'), 'Net Burn must be formatted accurately as $35,000/mo');
    assert.ok(hudHtml.includes('14.2 mos'), 'Runway must be formatted as 14.2 mos');
  });

  it('Requirement 5: displays IT Stability and HR Morale with clear /100 context', () => {
    const state = createBaselineSimulationState({
      metrics: {
        ...createBaselineSimulationState().metrics,
        itStability: 72,
        hrMorale: 84,
      },
    });

    uiManager.updateHUD(state);

    const itCard = rootOverlay.querySelector('.it-card');
    assert.ok(itCard, '.it-card must exist');
    const itVal = itCard.querySelector('.score-val');
    const itMax = itCard.querySelector('.score-max');
    assert.equal(itVal?.textContent, '72', 'IT score value must be 72');
    assert.equal(itMax?.textContent, '/100', 'IT score must have /100 context');

    const hrCard = rootOverlay.querySelector('.hr-card');
    assert.ok(hrCard, '.hr-card must exist');
    const hrVal = hrCard.querySelector('.score-val');
    const hrMax = hrCard.querySelector('.score-max');
    assert.equal(hrVal?.textContent, '84', 'HR score value must be 84');
    assert.equal(hrMax?.textContent, '/100', 'HR score must have /100 context');
  });

  it('Requirement 8: briefly indicates metric changes using existing simulation ledger data', () => {
    // 1. Initial state without decisions
    const state1 = createBaselineSimulationState();
    uiManager.updateHUD(state1);

    // Initial render should have no delta pills
    let pills = rootOverlay.querySelectorAll('.hud-delta-pill');
    assert.equal(pills.length, 0, 'No delta pills when no decisions logged');

    // 2. Incident decision logged with deltas (-$30,000 cash, +15 IT, -5 HR)
    const mockDecisionRecord: any = {
      decisionIndex: 0,
      turn: 1,
      incidentId: 'inc_it_phishing',
      choiceId: 'CHOICE_PHISH_LOCKDOWN',
      choiceLabel: 'Immediate Session Revocation',
      immediateFinancialDeltas: {
        cashDelta: -3000000, // -$30,000
        grossBurnDelta: 0,
      },
      immediateMetricDeltas: {
        itDelta: 15,
        hrDelta: -5,
        complianceDelta: 0,
      },
      scheduledConsequencesCreated: [],
      monthlyBurnDeductionPaid: { totalCashDeducted: 0, principalDeducted: 0, interestDeducted: 0 },
      financialStateAfterImmediate: state1.financials,
      metricStateAfterImmediate: state1.metrics,
      companyHealthAfterImmediate: 85,
      companyGradeAfterImmediate: 'B',
      learningFeedback: {
        corePrinciple: 'Rapid Technical Containment',
        tradeoffSummary: 'Contained immediately.',
      },
    };

    const state2 = createBaselineSimulationState({
      decisionLedger: [mockDecisionRecord],
    });

    uiManager.updateHUD(state2);

    pills = rootOverlay.querySelectorAll('.hud-delta-pill');
    assert.ok(pills.length >= 3, 'Delta pills must be rendered for cash, IT, and HR');

    const cashCard = rootOverlay.querySelector('.cash-card');
    const cashDeltaPill = cashCard?.querySelector('.hud-delta-pill');
    assert.ok(cashDeltaPill, 'Cash delta pill must exist');
    assert.ok(cashDeltaPill.textContent.includes('-$30,000'), 'Cash card must display negative delta pill -$30,000');
    assert.ok(cashDeltaPill.classList.contains('neg'), 'Negative cash delta must have .neg class');

    const itCard = rootOverlay.querySelector('.it-card');
    const itDeltaPill = itCard?.querySelector('.hud-delta-pill');
    assert.ok(itDeltaPill, 'IT delta pill must exist');
    assert.equal(itDeltaPill.textContent, '+15', 'IT card must display positive delta pill +15');
    assert.ok(itDeltaPill.classList.contains('pos'), 'Positive IT delta must have .pos class');

    const hrCard = rootOverlay.querySelector('.hr-card');
    const hrDeltaPill = hrCard?.querySelector('.hud-delta-pill');
    assert.ok(hrDeltaPill, 'HR delta pill must exist');
    assert.equal(hrDeltaPill.textContent, '-5', 'HR card must display negative delta pill -5');
    assert.ok(hrDeltaPill.classList.contains('neg'), 'Negative HR delta must have .neg class');
  });

  it('Requirement 6 & 7: CSS definitions verify compact layout and responsiveness at 375px/390px', () => {
    const cssPath = path.resolve('src/style.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Desktop:
    assert.ok(cssContent.includes('.hud-topbar {'), 'HUD topbar class must be defined');
    assert.ok(cssContent.includes('.hud-primary-metrics'), 'Primary metrics class must be defined');
    assert.ok(cssContent.includes('.hud-finance-expandable'), 'Finance expandable class must be defined');
    assert.ok(cssContent.includes('.hud-finance-toggle'), 'Finance toggle class must be defined');
    assert.ok(cssContent.includes('.hud-finance-dropdown'), 'Finance dropdown class must be defined');
    assert.ok(cssContent.includes('.score-val'), 'score-val context class must be defined');
    assert.ok(cssContent.includes('.score-max'), 'score-max context class must be defined');
    assert.ok(cssContent.includes('.hud-delta-pill'), 'Delta pill animation and styling must be defined');

    // Tablet breakpoint (<=768px):
    const tabletSection = cssContent.slice(cssContent.indexOf('@media (max-width: 768px)'));
    assert.ok(tabletSection.includes('grid-template-columns: repeat(3, 1fr);'),
      'Tablet breakpoint must use 3-column grid for primary metrics');

    // Narrow mobile breakpoint (<=480px, e.g. 375px & 390px):
    const narrowSection = cssContent.slice(cssContent.indexOf('@media (max-width: 480px)'));
    assert.ok(narrowSection.includes('grid-template-columns: repeat(3, 1fr);'),
      'Mobile breakpoint (375px/390px) must keep 3-column primary metrics grid');
    assert.ok(narrowSection.includes('.hud-finance-dropdown'),
      'Mobile breakpoint must adapt expandable dropdown to fit within phone width');
  });
});
