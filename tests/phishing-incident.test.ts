/**
 * Mustarred Company Simulator - First Playable Incident Unit & Integration Tests
 *
 * Verifies the complete playable Phishing Attack incident:
 * 1. Headless simulation engine execution of all 4 tactical choices.
 * 2. Deterministic state transitions, cash deltas, burn deductions, and metric changes.
 * 3. Natural language intent matching for phishing directives.
 * 4. Deterministic cross-department reactions across IT, Finance, HR, and Legal.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CompanySimulation } from '../src/simulation/CompanySimulation.ts';
import {
  PHISHING_SCENARIO,
  PHISHING_CHOICES,
  PHISHING_INITIAL_CONDITIONS,
} from '../src/simulation/phishingIncident.data.ts';
import { matchPlayerDirective } from '../src/ui/decisionMatcher.ts';
import { buildPhishingReactions } from '../src/ui/phishingComms.ts';
import type { EvaluatedChoice } from '../src/simulation/types.ts';

describe('Phishing Attack Incident - Headless Simulation Engine', () => {
  it('initialises correctly with Phishing Scenario baseline state', () => {
    const sim = new CompanySimulation(PHISHING_SCENARIO);
    const state = sim.getState();

    assert.equal(state.currentTurn, 1);
    assert.equal(state.totalTurns, 1);
    assert.equal(state.phase, 'AWAITING_DECISION');
    assert.equal(state.isInsolvent, false);

    assert.equal(state.financials.cash, PHISHING_INITIAL_CONDITIONS.startingCash); // $250,000.00
    assert.equal(state.financials.grossMonthlyBurn, 2_000_000); // $20,000.00/mo
    assert.equal(state.financials.debtPrincipal, 0);

    assert.equal(state.metrics.itStability, 70);
    assert.equal(state.metrics.hrMorale, 75);

    const activeIncident = sim.getActiveIncident();
    assert.ok(activeIncident);
    assert.equal(activeIncident.id, 'INC_PHISH_1');
    assert.equal(activeIncident.department, 'IT');
    assert.equal(activeIncident.urgency, 'critical');

    const choices = sim.getEvaluatedChoices();
    assert.equal(choices.length, 4);
    assert.ok(choices.every((c) => !c.isLocked));
  });

  it('Choice 1 (Lockdown): rapidly contains threat (-$3k cash, +15 IT, -5 HR)', () => {
    const sim = new CompanySimulation(PHISHING_SCENARIO);
    const result = sim.resolveDecision('CHOICE_PHISH_LOCKDOWN');

    assert.equal(result.success, true);
    assert.equal(result.nextPhase, 'SIMULATION_COMPLETED');

    const record = result.record!;
    assert.equal(record.chosenOptionId, 'CHOICE_PHISH_LOCKDOWN');
    assert.equal(record.immediateFinancialDeltas.cashDelta, -300_000); // -$3,000 off-cycle fees
    assert.equal(record.immediateMetricDeltas.itDelta, 15);
    assert.equal(record.immediateMetricDeltas.hrDelta, -5);

    // Monthly burn deduction paid: $20,000 (2_000_000 cents)
    assert.equal(record.monthlyBurnDeductionPaid.totalCashDeducted, 2_000_000);

    // Ending Cash: $250,000 - $3,000 - $20,000 = $227,000 (22_700_000 cents)
    assert.equal(result.updatedState.financials.cash, 22_700_000);
    assert.equal(result.updatedState.metrics.itStability, 85);
    assert.equal(result.updatedState.metrics.hrMorale, 70);
    assert.equal(result.updatedState.isInsolvent, false);

    const report = sim.generatePerformanceReport();
    assert.equal(report.isInsolvent, false);
    assert.equal(report.finalGrade, 'B');
  });

  it('Choice 2 (Monitor): adversary exfiltrates wire funds (-$25k cash, -15 IT, 0 HR)', () => {
    const sim = new CompanySimulation(PHISHING_SCENARIO);
    const result = sim.resolveDecision('CHOICE_PHISH_MONITOR');

    assert.equal(result.success, true);
    const record = result.record!;
    assert.equal(record.immediateFinancialDeltas.cashDelta, -2_500_000); // -$25,000 wire loss
    assert.equal(record.immediateMetricDeltas.itDelta, -15);
    assert.equal(record.immediateMetricDeltas.hrDelta, 0);

    // Ending Cash: $250,000 - $25,000 - $20,000 = $205,000 (20_500_000 cents)
    assert.equal(result.updatedState.financials.cash, 20_500_000);
    assert.equal(result.updatedState.metrics.itStability, 55);
    assert.equal(result.updatedState.metrics.hrMorale, 75);
  });

  it('Choice 3 (Verify): confirms with Tom before kill (-$5k cash, -5 IT, +5 HR)', () => {
    const sim = new CompanySimulation(PHISHING_SCENARIO);
    const result = sim.resolveDecision('CHOICE_PHISH_VERIFY');

    assert.equal(result.success, true);
    const record = result.record!;
    assert.equal(record.immediateFinancialDeltas.cashDelta, -500_000); // -$5,000 audit cost
    assert.equal(record.immediateMetricDeltas.itDelta, -5);
    assert.equal(record.immediateMetricDeltas.hrDelta, 5);

    // Ending Cash: $250,000 - $5,000 - $20,000 = $225,000 (22_500_000 cents)
    assert.equal(result.updatedState.financials.cash, 22_500_000);
    assert.equal(result.updatedState.metrics.itStability, 65);
    assert.equal(result.updatedState.metrics.hrMorale, 80);
  });

  it('Choice 4 (Ignore): catastrophic failure from complacency (-$45k cash, -30 IT, -20 HR)', () => {
    const sim = new CompanySimulation(PHISHING_SCENARIO);
    const result = sim.resolveDecision('CHOICE_PHISH_IGNORE');

    assert.equal(result.success, true);
    const record = result.record!;
    assert.equal(record.immediateFinancialDeltas.cashDelta, -4_500_000); // -$45,000 ACH fraud
    assert.equal(record.immediateMetricDeltas.itDelta, -30);
    assert.equal(record.immediateMetricDeltas.hrDelta, -20);

    // Ending Cash: $250,000 - $45,000 - $20,000 = $185,000 (18_500_000 cents)
    assert.equal(result.updatedState.financials.cash, 18_500_000);
    assert.equal(result.updatedState.metrics.itStability, 40);
    assert.equal(result.updatedState.metrics.hrMorale, 55);
  });
});

describe('Phishing Attack Incident - Decision Matcher & Natural Language Directives', () => {
  const evaluatedChoices: readonly EvaluatedChoice[] = PHISHING_CHOICES.map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    isLocked: false,
    lockReasons: [],
    effectiveImpact: c.baseImpact,
  }));

  it('correctly matches immediate session revocation directive (CHOICE_PHISH_LOCKDOWN)', () => {
    const text = 'Immediately terminate Tom Bradley session and revoke his SSO tokens';
    const match = matchPlayerDirective(text, evaluatedChoices);

    assert.equal(match.matched, true);
    assert.equal(match.choiceId, 'CHOICE_PHISH_LOCKDOWN');
    assert.ok(match.confidence >= 0.5);
  });

  it('correctly matches passive monitoring directive (CHOICE_PHISH_MONITOR)', () => {
    const text = 'Keep the session open and silently monitor packet capture to trace the intruder';
    const match = matchPlayerDirective(text, evaluatedChoices);

    assert.equal(match.matched, true);
    assert.equal(match.choiceId, 'CHOICE_PHISH_MONITOR');
    assert.ok(match.confidence >= 0.5);
  });

  it('correctly matches employee verification directive (CHOICE_PHISH_VERIFY)', () => {
    const text = 'Call Tom Bradley at his desk right now and ask him if he clicked a spoofed link';
    const match = matchPlayerDirective(text, evaluatedChoices);

    assert.equal(match.matched, true);
    assert.equal(match.choiceId, 'CHOICE_PHISH_VERIFY');
    assert.ok(match.confidence >= 0.5);
  });

  it('correctly matches false positive dismissal directive (CHOICE_PHISH_IGNORE)', () => {
    const text = 'This is probably just a false positive from a VPN routing glitch, ignore the alert';
    const match = matchPlayerDirective(text, evaluatedChoices);

    assert.equal(match.matched, true);
    assert.equal(match.choiceId, 'CHOICE_PHISH_IGNORE');
    assert.ok(match.confidence >= 0.5);
  });
});

describe('Phishing Attack Incident - Cross-Department Communications Package', () => {
  it('generates authentic reactions across IT, Finance, HR, and Legal for CHOICE_PHISH_LOCKDOWN', () => {
    const pkg = buildPhishingReactions('CHOICE_PHISH_LOCKDOWN');

    assert.equal(pkg.choiceId, 'CHOICE_PHISH_LOCKDOWN');
    assert.equal(pkg.reactions.length, 4);

    const depts = pkg.reactions.map((r) => r.senderDept);
    assert.deepEqual(depts, ['IT', 'FINANCE', 'HR', 'LEGAL']);

    const itReaction = pkg.reactions.find((r) => r.senderDept === 'IT')!;
    assert.equal(itReaction.senderName, 'Maya Lin');
    assert.equal(itReaction.tone, 'positive');
    assert.ok(itReaction.message.includes('185.220.101.44'));

    const finReaction = pkg.reactions.find((r) => r.senderDept === 'FINANCE')!;
    assert.equal(finReaction.senderName, 'David Vance');
    assert.ok(finReaction.message.includes('$3,000'));

    const legalReaction = pkg.reactions.find((r) => r.senderDept === 'LEGAL')!;
    assert.equal(legalReaction.senderName, 'Rachel Sterling');
    assert.ok(legalReaction.message.includes('GDPR Article 33'));

    assert.equal(pkg.toastAlerts.length, 4);
  });

  it('generates critical breach notifications across all departments for CHOICE_PHISH_MONITOR', () => {
    const pkg = buildPhishingReactions('CHOICE_PHISH_MONITOR');

    assert.equal(pkg.reactions.length, 4);
    const finReaction = pkg.reactions.find((r) => r.senderDept === 'FINANCE')!;
    assert.equal(finReaction.tone, 'critical');
    assert.ok(finReaction.message.includes('$25,000'));

    const legalReaction = pkg.reactions.find((r) => r.senderDept === 'LEGAL')!;
    assert.equal(legalReaction.tone, 'critical');
    assert.ok(legalReaction.subject.includes('72-Hour Regulatory Breach Notice Required'));
    assert.ok(legalReaction.message.includes('GDPR Art. 33'));
  });

  it('generates employee cooperation memo for CHOICE_PHISH_VERIFY', () => {
    const pkg = buildPhishingReactions('CHOICE_PHISH_VERIFY');

    assert.equal(pkg.reactions.length, 4);
    const finReaction = pkg.reactions.find((r) => r.senderDept === 'FINANCE')!;
    assert.equal(finReaction.senderName, 'Tom Bradley');
    assert.ok(finReaction.message.includes('mortified'));

    const hrReaction = pkg.reactions.find((r) => r.senderDept === 'HR')!;
    assert.equal(hrReaction.tone, 'positive');
    assert.ok(hrReaction.subject.includes('High-Trust Reporting Culture'));
  });

  it('generates willful negligence inquiry memos for CHOICE_PHISH_IGNORE', () => {
    const pkg = buildPhishingReactions('CHOICE_PHISH_IGNORE');

    assert.equal(pkg.reactions.length, 4);
    const legalReaction = pkg.reactions.find((r) => r.senderDept === 'LEGAL')!;
    assert.equal(legalReaction.tone, 'critical');
    assert.ok(legalReaction.message.includes('willful neglect'));
  });
});
