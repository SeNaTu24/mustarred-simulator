/**
 * Mustarred Company Simulator - Communications System Accuracy Audit Tests
 *
 * Verifies that all communications, dialogues, fact grids, and cross-department
 * reactions strictly correspond to the simulation engine invariants, formulas,
 * and scenario data.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CompanySimulation } from '../src/simulation/CompanySimulation.ts';
import {
  CHOICES_TURN_1,
  CHOICES_TURN_2,
  CHOICES_TURN_3,
  DEMO_INITIAL_CONDITIONS,
} from '../src/simulation/mustarredDemo.data.ts';
import {
  INCIDENT_DIALOGUES,
  buildCrossDeptReaction,
  CROSS_DEPT_REACTIONS,
} from '../src/ui/commsData.ts';

describe('Communications Accuracy & Simulation Consistency Audit', () => {
  it('Choice 1A: IT stability delta is +20 (not +25), and post-settlement cash is $200,000 (not $170,000)', () => {
    const choice1A = CHOICES_TURN_1.find((c) => c.id === 'CHOICE_1A');
    assert.ok(choice1A);
    assert.equal(choice1A.baseImpact.itDelta, 20);
    assert.equal(choice1A.baseImpact.cashDelta, -3_000_000); // -$30,000

    const sim = new CompanySimulation();
    const result = sim.resolveDecision('CHOICE_1A');
    assert.equal(result.success, true);
    if (!result.success) return;

    // Starting cash: $250,000. Less $30k fee, less $20k monthly burn = $200,000
    assert.equal(result.updatedState.financials.cash, 20_000_000); // $200,000.00
    assert.equal(result.updatedState.metrics.itStability, 90); // 70 + 20

    // Verify reaction memo constructed from actual state
    const reaction = buildCrossDeptReaction('CHOICE_1A', result.record, result.updatedState);
    assert.ok(reaction.message.includes('$200,000'));
    assert.ok(!reaction.message.includes('$170,000'));
    assert.ok(!reaction.message.includes('+25 IT'));
  });

  it('Choice 1C: HR morale delta is -30 (not -25)', () => {
    const choice1C = CHOICES_TURN_1.find((c) => c.id === 'CHOICE_1C');
    assert.ok(choice1C);
    assert.equal(choice1C.baseImpact.hrDelta, -30);

    const sim = new CompanySimulation();
    const result = sim.resolveDecision('CHOICE_1C');
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.updatedState.metrics.hrMorale, 45); // 75 - 30

    const reaction = buildCrossDeptReaction('CHOICE_1C', result.record, result.updatedState);
    assert.ok(reaction.message.includes('-30 HR'));
    assert.ok(!reaction.message.includes('-25 HR'));
  });

  it('Choice 2B: HR morale delta is -35 base (not -15)', () => {
    const choice2B = CHOICES_TURN_2.find((c) => c.id === 'CHOICE_2B');
    assert.ok(choice2B);
    assert.equal(choice2B.baseImpact.hrDelta, -35);

    const reaction = buildCrossDeptReaction('CHOICE_2B');
    assert.ok(reaction.message.includes('-35 HR'));
    assert.ok(!reaction.message.includes('-15 HR'));
  });

  it('Choice 2A vs Choice 2B: reactions are properly mapped to salary vs perks without swapping', () => {
    const rx2A = CROSS_DEPT_REACTIONS.CHOICE_2A;
    const rx2B = CROSS_DEPT_REACTIONS.CHOICE_2B;

    // 2A is salary adjustment: sent by David Vance (CFO) about payroll burn
    assert.equal(rx2A.choiceId, 'CHOICE_2A');
    assert.equal(rx2A.senderDept, 'FINANCE');
    assert.ok(rx2A.subject.includes('Payroll Burn'));

    // 2B is token perks: sent by Sarah Chen (VP Eng) about staff feedback on perks
    assert.equal(rx2B.choiceId, 'CHOICE_2B');
    assert.equal(rx2B.senderDept, 'IT');
    assert.ok(rx2B.subject.includes('Token Perks'));
  });

  it('Choice 3A: Base IT stability reduction is -5 (not -10), HR reduction is -20, and does not claim automatic collapse', () => {
    const choice3A = CHOICES_TURN_3.find((c) => c.id === 'CHOICE_3A');
    assert.ok(choice3A);
    assert.equal(choice3A.baseImpact.itDelta, -5);
    assert.equal(choice3A.baseImpact.hrDelta, -20);

    const reaction = buildCrossDeptReaction('CHOICE_3A');
    assert.ok(reaction.message.includes('-5 IT'));
    assert.ok(reaction.message.includes('-20 HR'));
    assert.ok(!reaction.message.includes('-10 IT'));
    assert.ok(!reaction.message.includes('collapse'));
  });

  it('Choice 3B: Loan terms are 8.0% APR (not 10%) with $3,500/mo principal repayment', () => {
    assert.equal(DEMO_INITIAL_CONDITIONS.loanTerms?.annualInterestRate, 0.08);
    assert.equal(DEMO_INITIAL_CONDITIONS.loanTerms?.monthlyPrincipalAmortization, 350_000);

    const turn3Dialogue = INCIDENT_DIALOGUES[3];
    assert.ok(turn3Dialogue);
    const qDebt = turn3Dialogue.probingQuestions.find((q) => q.id === 'q3-debt-service');
    assert.ok(qDebt);
    assert.ok(qDebt.answer.includes('8.0%'));
    assert.ok(qDebt.answer.includes('$3,500/mo'));
    assert.ok(!qDebt.answer.includes('10%'));

    const reaction = buildCrossDeptReaction('CHOICE_3B');
    assert.ok(reaction.message.includes('8.0%'));
    assert.ok(reaction.message.includes('$3,500/month'));
    assert.ok(!reaction.message.includes('10%'));
  });

  it('Choice 3C: Checks HR morale (>70) for maximum savings, with base IT delta of -5', () => {
    const choice3C = CHOICES_TURN_3.find((c) => c.id === 'CHOICE_3C');
    assert.ok(choice3C);
    assert.equal(choice3C.baseImpact.itDelta, -5);

    const turn3Dialogue = INCIDENT_DIALOGUES[3];
    assert.ok(turn3Dialogue);
    const qCloud = turn3Dialogue.probingQuestions.find((q) => q.id === 'q3-cloud-locked');
    assert.ok(qCloud);
    assert.ok(qCloud.answer.includes('HR morale is high (> 70)'));
    assert.ok(!qCloud.answer.includes('engineering morale'));

    const reaction = buildCrossDeptReaction('CHOICE_3C');
    assert.ok(reaction.message.includes('-5 IT'));
    assert.ok(!reaction.message.includes('+10 IT'));
    assert.ok(!reaction.message.includes('+5 HR'));
  });
});
