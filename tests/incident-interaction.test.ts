/**
 * Mustarred Company Simulator - Incident Interaction Tests
 *
 * Covers the reusable interaction layer behind Incident 1:
 * 1. Free-text directives are interpreted by clause, including negation,
 *    ambiguity, contradictions and irrelevant input.
 * 2. A composed response plan produces consequences from the incident's own
 *    threat vectors, with different plans producing different verdicts.
 * 3. The composed impact is applied by the real simulation engine, and the
 *    audit trail records what the executive actually ordered.
 * 4. The aftermath differs per outcome instead of reusing one success memo.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CompanySimulation } from '../src/simulation/CompanySimulation.ts';
import { PHISHING_SCENARIO } from '../src/simulation/phishingIncident.data.ts';
import { PHISHING_INTERACTION } from '../src/incidents/phishing/phishingInteraction.data.ts';
import { interpretDirective } from '../src/incidents/directiveInterpreter.ts';
import { evaluateResponsePlan, findPlanProblems } from '../src/incidents/responseEvaluator.ts';
import { buildPhishingOutcome } from '../src/incidents/phishing/phishingAftermath.ts';
import type { ResponsePlan } from '../src/incidents/interactionModel.ts';

const SPEC = PHISHING_INTERACTION;

/** A complete, proportionate response: every exposure closed, nothing widened. */
const CLEAN_ACTIONS = [
  'ACT_REVOKE_SESSIONS',
  'ACT_RESET_CREDENTIALS',
  'ACT_SUSPEND_WIRES',
  'ACT_PURGE_FORWARDING',
  'ACT_BRIEF_STAFF',
];

interface PlanOverrides {
  strategyId?: string;
  actionIds?: string[];
  minutesSpent?: number;
  directiveText?: string;
  slotValues?: Record<string, string>;
}

function buildPlan(overrides: PlanOverrides = {}): ResponsePlan {
  const directiveText = overrides.directiveText ?? '';
  const interpretation = interpretDirective(directiveText, {
    lexicon: SPEC.lexicon,
    selectedActionIds: overrides.actionIds ?? [],
    selectedStrategyId: overrides.strategyId,
  });

  return {
    incidentId: SPEC.incidentId,
    strategyId: overrides.strategyId ?? '',
    actionIds: overrides.actionIds ?? [],
    slotValues: overrides.slotValues ?? {
      SLOT_OWNER: 'OWNER_IT',
      SLOT_SCOPE: 'SCOPE_TOM',
      SLOT_PRIORITY: 'PRIORITY_HIGH',
    },
    directiveText,
    interpretation,
    inspectedRecordIds: [],
    completedRequestIds: [],
    minutesSpent: overrides.minutesSpent ?? 0,
  };
}

// ============================================================================
// 1. DIRECTIVE INTERPRETATION
// ============================================================================

describe('Directive interpreter - free text is read by meaning', () => {
  it('turns a containment order into the matching measure', () => {
    const result = interpretDirective("Disable Tom's account immediately.", {
      lexicon: SPEC.lexicon,
    });

    assert.equal(result.isRelevant, true);
    assert.ok(result.intents.includes('REVOKE_SESSION'));
    assert.ok(result.actionIds.includes('ACT_REVOKE_SESSIONS'));
    assert.equal(result.clauses[0]?.urgency, 'NOW');
    assert.equal(result.issues.filter((issue) => issue.kind === 'AMBIGUOUS').length, 0);
    assert.equal(result.isBlocking, false);
  });

  it('reads an investigative order as a request for records, not as a response', () => {
    const result = interpretDirective('Check whether the attacker accessed the payment system.', {
      lexicon: SPEC.lexicon,
    });

    assert.ok(result.intents.includes('INVESTIGATE'));
    assert.ok(result.requestIds.includes('REQ_TREASURY'));
    assert.equal(result.actionIds.length, 0);
    assert.ok(result.issues.some((issue) => issue.kind === 'INVESTIGATION_ONLY'));
  });

  it('extracts two measures from a compound order', () => {
    const result = interpretDirective('Contact the bank and temporarily suspend outgoing transfers.', {
      lexicon: SPEC.lexicon,
    });

    assert.ok(result.intents.includes('CONTACT_BANK'));
    assert.ok(result.intents.includes('SUSPEND_PAYMENTS'));
    assert.ok(result.actionIds.includes('ACT_SUSPEND_WIRES'));
  });

  it('asks for a target when the order names no system', () => {
    const result = interpretDirective('Lock it down.', { lexicon: SPEC.lexicon });

    const ambiguous = result.issues.find((issue) => issue.kind === 'AMBIGUOUS');
    assert.ok(ambiguous);
    assert.ok((ambiguous.options?.length ?? 0) >= 2);
    assert.equal(result.isBlocking, true);
  });

  it('flags an order that cuts the session and keeps it open at the same time', () => {
    const result = interpretDirective('Revoke his session but keep the session open to watch him.', {
      lexicon: SPEC.lexicon,
    });

    assert.ok(result.issues.some((issue) => issue.kind === 'CONFLICT'));
    assert.equal(result.isBlocking, true);
  });

  it('treats "do not revoke, keep watching" as one coherent instruction', () => {
    const result = interpretDirective("Don't revoke the session, keep watching him", {
      lexicon: SPEC.lexicon,
    });

    assert.equal(result.issues.some((issue) => issue.kind === 'CONFLICT'), false);
    assert.ok(result.intents.includes('MONITOR_SESSION'));
    assert.equal(result.actionIds.length, 0);
  });

  it('reports an irrelevant message as unusable and keeps it out of the plan', () => {
    const result = interpretDirective('Where are we having lunch today?', { lexicon: SPEC.lexicon });

    assert.equal(result.isRelevant, false);
    assert.equal(result.actionIds.length, 0);
    assert.ok(result.issues.some((issue) => issue.kind === 'UNSUPPORTED'));
  });

  it('understands a dangerous order and says what it costs us', () => {
    const result = interpretDirective('Delete the logs and fire Tom.', { lexicon: SPEC.lexicon });

    const dangerous = result.issues.filter((issue) => issue.kind === 'DANGEROUS');
    assert.equal(dangerous.length, 2);
    assert.ok(result.intents.includes('DESTROY_EVIDENCE'));
    assert.ok(result.intents.includes('PUNISH_EMPLOYEE'));
  });

  it('detects a typed order that cancels a selected measure', () => {
    const result = interpretDirective("Don't suspend the transfers", {
      lexicon: SPEC.lexicon,
      selectedActionIds: ['ACT_SUSPEND_WIRES'],
    });

    const conflict = result.issues.find((issue) => issue.kind === 'CONFLICT');
    assert.ok(conflict);
    assert.equal(conflict.conflictActionId, 'ACT_SUSPEND_WIRES');
  });

  it('detects a typed order that contradicts the chosen approach', () => {
    const result = interpretDirective('Revoke his session now', {
      lexicon: SPEC.lexicon,
      selectedStrategyId: 'STRAT_TRACE',
    });

    assert.ok(result.issues.some((issue) => issue.kind === 'CONFLICT'));
  });
});

// ============================================================================
// 2. RESPONSE EVALUATION
// ============================================================================

describe('Response evaluator - the plan decides the consequence', () => {
  it('closes the exposure for a fast containment plan', () => {
    const plan = buildPlan({
      strategyId: 'STRAT_CONTAIN_NOW',
      actionIds: CLEAN_ACTIONS,
      minutesSpent: 2,
    });
    const assessment = evaluateResponsePlan(SPEC, plan);

    assert.equal(assessment.verdict, 'CONTAINED');
    assert.equal(assessment.vectors.every((vector) => vector.state === 'CLOSED'), true);
    assert.equal(assessment.closeAtMinute, 2);
    assert.equal(assessment.impact.cashDelta, -(180_000 + 240_000 + 120_000 + 90_000 + 40_000));
    assert.ok(assessment.impact.itDelta > 0);
  });

  it('loses the mailbox rule when the same actions land after the window', () => {
    const plan = buildPlan({
      strategyId: 'STRAT_CONTAIN_NOW',
      actionIds: CLEAN_ACTIONS,
      minutesSpent: 9,
    });
    const assessment = evaluateResponsePlan(SPEC, plan);

    const mailbox = assessment.vectors.find((vector) => vector.vectorId === 'VEC_MAILBOX');
    const wire = assessment.vectors.find((vector) => vector.vectorId === 'VEC_WIRE');
    assert.equal(mailbox?.state, 'TOO_LATE');
    assert.equal(wire?.state, 'TOO_LATE');
    assert.equal(assessment.verdict, 'COMPROMISED');
    assert.ok(assessment.latentRisks.length > 0);
  });

  it('charges the delayed approach for the minutes it burns', () => {
    const plan = buildPlan({
      strategyId: 'STRAT_VERIFY_FIRST',
      actionIds: CLEAN_ACTIONS,
      minutesSpent: 2,
    });
    const assessment = evaluateResponsePlan(SPEC, plan);

    // 2 minutes spent + 4 minutes of verification = 6 minutes to act
    assert.equal(assessment.closeAtMinute, 6);
    assert.equal(assessment.vectors.find((v) => v.vectorId === 'VEC_MAILBOX')?.state, 'TOO_LATE');
    assert.equal(assessment.vectors.find((v) => v.vectorId === 'VEC_WIRE')?.state, 'CLOSED');
    assert.equal(assessment.verdict, 'PARTIAL');
  });

  it('treats standing down as no action at all', () => {
    const plan = buildPlan({
      strategyId: 'STRAT_DISMISS',
      actionIds: ['ACT_REVOKE_SESSIONS'],
      minutesSpent: 0,
    });
    const assessment = evaluateResponsePlan(SPEC, plan);

    assert.equal(assessment.verdict, 'NEGLIGENT');
    assert.equal(assessment.actionResults.length, 0);
    assert.equal(
      assessment.vectors.every((vector) => vector.state === 'BREACHED'),
      true
    );
    assert.ok(assessment.impact.cashDelta <= -4_000_000);
    assert.equal(findPlanProblems(SPEC, plan).some((p) => p.kind === 'STAND_DOWN_WITH_MEASURES'), true);
  });

  it('absorbs part of the damage when the record was sealed first', () => {
    const unmitigated = evaluateResponsePlan(
      SPEC,
      buildPlan({ strategyId: 'STRAT_TRACE', minutesSpent: 0 })
    );
    const mitigated = evaluateResponsePlan(
      SPEC,
      buildPlan({
        strategyId: 'STRAT_TRACE',
        actionIds: ['ACT_PRESERVE_LOGS', 'ACT_NOTIFY_LEGAL'],
        minutesSpent: 0,
      })
    );

    assert.ok(mitigated.impact.cashDelta > unmitigated.impact.cashDelta);
  });

  it('locks the company down without claiming a clean containment', () => {
    const plan = buildPlan({
      strategyId: 'STRAT_CONTAIN_NOW',
      actionIds: CLEAN_ACTIONS,
      minutesSpent: 1,
      slotValues: {
        SLOT_OWNER: 'OWNER_IT',
        SLOT_SCOPE: 'SCOPE_COMPANY',
        SLOT_PRIORITY: 'PRIORITY_ALL_HANDS',
      },
    });
    const assessment = evaluateResponsePlan(SPEC, plan);

    assert.equal(assessment.verdict, 'PARALYSED');
    assert.equal(assessment.haltsOperations, true);
    assert.ok(assessment.impact.hrDelta <= -10);
  });

  it('refuses a plan with no approach', () => {
    const problems = findPlanProblems(SPEC, buildPlan({}));
    assert.ok(problems.some((problem) => problem.kind === 'NO_STRATEGY'));
  });

  it('applies the cost of a dangerous typed order', () => {
    const plan = buildPlan({
      strategyId: 'STRAT_CONTAIN_NOW',
      actionIds: ['ACT_REVOKE_SESSIONS', 'ACT_SUSPEND_WIRES'],
      minutesSpent: 1,
      directiveText: 'Fire Tom for this.',
    });
    const assessment = evaluateResponsePlan(SPEC, plan);

    assert.ok(assessment.impact.hrDelta < 0);
  });
});

// ============================================================================
// 3. ENGINE INTEGRATION
// ============================================================================

describe('Engine integration - composed impact is authoritative', () => {
  it('applies the composed plan and records what was ordered', () => {
    const sim = new CompanySimulation(PHISHING_SCENARIO);
    const plan = buildPlan({
      strategyId: 'STRAT_CONTAIN_NOW',
      actionIds: ['ACT_REVOKE_SESSIONS', 'ACT_SUSPEND_WIRES'],
      minutesSpent: 2,
    });
    const assessment = evaluateResponsePlan(SPEC, plan);

    const result = sim.resolveDecision(assessment.baseChoiceId, {
      label: assessment.planLabel,
      rationale: assessment.summary,
      impactOverride: assessment.impact,
    });

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.record.chosenOptionLabel, assessment.planLabel);
    assert.equal(result.record.immediateFinancialDeltas.cashDelta, assessment.impact.cashDelta);
    assert.equal(result.record.immediateMetricDeltas.itDelta, assessment.impact.itDelta);

    // 250,000 starting cash + composed delta, then the monthly burn settlement
    assert.equal(
      result.updatedState.financials.cash,
      25_000_000 + assessment.impact.cashDelta - 2_000_000
    );
    assert.equal(result.nextPhase, 'SIMULATION_COMPLETED');
  });

  it('leaves the stored choice impact untouched when no plan is submitted', () => {
    const sim = new CompanySimulation(PHISHING_SCENARIO);
    const result = sim.resolveDecision('CHOICE_PHISH_LOCKDOWN');

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }
    assert.equal(result.record.immediateFinancialDeltas.cashDelta, -300_000);
    assert.equal(result.updatedState.financials.cash, 22_700_000);
  });
});

// ============================================================================
// 4. AFTERMATH
// ============================================================================

describe('Aftermath - the company reacts to the actual outcome', () => {
  const containedPlan = buildPlan({
    strategyId: 'STRAT_CONTAIN_NOW',
    actionIds: [...CLEAN_ACTIONS, 'ACT_PRESERVE_LOGS'],
    minutesSpent: 1,
  });
  const negligentPlan = buildPlan({ strategyId: 'STRAT_DISMISS', minutesSpent: 0 });

  const contained = evaluateResponsePlan(SPEC, containedPlan);
  const negligent = evaluateResponsePlan(SPEC, negligentPlan);

  it('writes different memos for a clean containment and a dismissal', () => {
    const containedOutcome = buildPhishingOutcome(SPEC, containedPlan, contained);
    const negligentOutcome = buildPhishingOutcome(SPEC, negligentPlan, negligent);

    assert.equal(containedOutcome.office.tone, 'contained');
    assert.equal(negligentOutcome.office.tone, 'negligent');
    assert.notEqual(containedOutcome.maya.subject, negligentOutcome.maya.subject);
    assert.notEqual(containedOutcome.maya.message, negligentOutcome.maya.message);
    assert.notEqual(
      containedOutcome.memos.find((memo) => memo.senderDept === 'FINANCE')?.subject,
      negligentOutcome.memos.find((memo) => memo.senderDept === 'FINANCE')?.subject
    );
  });

  it('keeps Legal out of the notification duty only when nothing was exported', () => {
    const containedLegal = buildPhishingOutcome(SPEC, containedPlan, contained).memos.find(
      (memo) => memo.senderDept === 'LEGAL'
    );
    const negligentLegal = buildPhishingOutcome(SPEC, negligentPlan, negligent).memos.find(
      (memo) => memo.senderDept === 'LEGAL'
    );

    assert.equal(containedLegal?.tone, 'positive');
    assert.equal(negligentLegal?.tone, 'critical');
  });

  it('reports cash movement from the ledger rather than recomputing it', () => {
    const outcome = buildPhishingOutcome(SPEC, containedPlan, contained, {
      cashDelta: -123_456,
      itDelta: 9,
      hrDelta: -2,
    });

    assert.ok(outcome.maya.message.includes('-$1,235'));
  });
});
