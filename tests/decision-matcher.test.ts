/**
 * Mustarred Company Simulator - Decision Matcher Unit Tests
 *
 * Validates natural language directive mapping to deterministic simulation choices.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchPlayerDirective } from '../src/ui/decisionMatcher.ts';
import type { EvaluatedChoice } from '../src/simulation/types.ts';

const MOCK_TURN_1_CHOICES: readonly EvaluatedChoice[] = [
  {
    id: 'CHOICE_1A',
    label: 'Forensic Audit & Clean Patch (Apex Cyber)',
    description: 'Engage external security consultants.',
    immediateCashDelta: -3_000_000,
    monthlyBurnDelta: 0,
    debtDelta: 0,
    itDelta: 25,
    hrDelta: 0,
    delayedEffects: [],
    isLocked: false,
    lockReasons: [],
  },
  {
    id: 'CHOICE_1B',
    label: 'Internal Emergency Patch & Silent Monitoring',
    description: 'Direct core engineering to hotfix the endpoint.',
    immediateCashDelta: -500_000,
    monthlyBurnDelta: 0,
    debtDelta: 0,
    itDelta: 10,
    hrDelta: -5,
    delayedEffects: [],
    isLocked: false,
    lockReasons: [],
  },
  {
    id: 'CHOICE_1C',
    label: 'Mandatory 72-Hour All-Hands Crunch',
    description: 'Lock developers into a weekend sprint.',
    immediateCashDelta: 0,
    monthlyBurnDelta: 0,
    debtDelta: 0,
    itDelta: 20,
    hrDelta: -25,
    delayedEffects: [],
    isLocked: false,
    lockReasons: [],
  },
];

const MOCK_TURN_3_CHOICES: readonly EvaluatedChoice[] = [
  {
    id: 'CHOICE_3A',
    label: 'Operating Austerity: Cancel Tools & SaaS Subscriptions',
    description: 'Cut operational SaaS licenses.',
    immediateCashDelta: 0,
    monthlyBurnDelta: -600_000,
    debtDelta: 0,
    itDelta: -10,
    hrDelta: -20,
    delayedEffects: [],
    isLocked: false,
    lockReasons: [],
  },
  {
    id: 'CHOICE_3B',
    label: 'Venture Debt Facility ($75,000 Bridge Loan)',
    description: 'Accept venture debt term sheet.',
    immediateCashDelta: 7_500_000,
    monthlyBurnDelta: 0,
    debtDelta: 7_500_000,
    itDelta: 0,
    hrDelta: 0,
    delayedEffects: [],
    isLocked: false,
    lockReasons: [],
  },
  {
    id: 'CHOICE_3C',
    label: 'Collaborative Cloud Architecture Overhaul',
    description: 'Work with engineering to optimize infrastructure.',
    immediateCashDelta: -1_000_000,
    monthlyBurnDelta: -300_000,
    debtDelta: 0,
    itDelta: 10,
    hrDelta: 5,
    delayedEffects: [],
    isLocked: true,
    lockReasons: ['Engineering morale is too fractured to execute a collaborative architecture audit.'],
  },
];

describe('Decision Matcher - Natural Language Intent Parsing', () => {
  it('correctly matches external security consultant directive for Turn 1 (Choice 1A)', () => {
    const result = matchPlayerDirective('Bring in an outside cybersecurity firm to audit the breach and patch it', MOCK_TURN_1_CHOICES);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.choiceId, 'CHOICE_1A');
    assert.ok(result.confidence >= 0.55);
  });

  it('correctly matches internal hotfix directive for Turn 1 (Choice 1B)', () => {
    const result = matchPlayerDirective('Let our team deploy a quick emergency patch in house and keep quiet', MOCK_TURN_1_CHOICES);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.choiceId, 'CHOICE_1B');
    assert.ok(result.confidence >= 0.55);
  });

  it('correctly matches mandatory weekend crunch directive for Turn 1 (Choice 1C)', () => {
    const result = matchPlayerDirective('Order a mandatory weekend crunch sprint to rewrite the whole auth service', MOCK_TURN_1_CHOICES);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.choiceId, 'CHOICE_1C');
    assert.ok(result.confidence >= 0.55);
  });

  it('correctly identifies locked choices in Turn 3 (Choice 3C)', () => {
    const result = matchPlayerDirective('Optimize cloud architecture collaboratively with our developers', MOCK_TURN_3_CHOICES);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.choiceId, 'CHOICE_3C');
    assert.strictEqual(result.matchedChoice?.isLocked, true);
    assert.ok(result.matchedChoice?.lockReasons.length > 0);
  });

  it('correctly detects bridge loan / venture debt directive for Turn 3 (Choice 3B)', () => {
    const result = matchPlayerDirective('Take the 75k bridge loan venture debt term sheet from Horizon Capital', MOCK_TURN_3_CHOICES);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.choiceId, 'CHOICE_3B');
    assert.ok(result.confidence >= 0.55);
  });

  it('flags ambiguous directives that mix conflicting options', () => {
    const result = matchPlayerDirective('Hire external consultant but also do a mandatory weekend crunch sprint', MOCK_TURN_1_CHOICES);
    assert.strictEqual(result.matched, false);
    assert.strictEqual(result.reason, 'AMBIGUOUS');
    assert.ok(result.explanation.includes('multiple strategies'));
  });

  it('gracefully rejects irrelevant, empty or off-topic directives', () => {
    const result1 = matchPlayerDirective('', MOCK_TURN_1_CHOICES);
    assert.strictEqual(result1.matched, false);

    const result2 = matchPlayerDirective('order pizza for lunch and go to the park', MOCK_TURN_1_CHOICES);
    assert.strictEqual(result2.matched, false);
    assert.strictEqual(result2.reason, 'UNSUPPORTED');
  });
});
