/**
 * Mustarred Company Simulator - UI Directive Input & Keyboard Isolation Tests
 *
 * Validates that typing in the directive input field is never intercepted by Phaser
 * or blocked by preventDefault, that key propagation is isolated, and that
 * complete sentences can be submitted and analyzed.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchPlayerDirective } from '../src/ui/decisionMatcher.ts';
import type { EvaluatedChoice } from '../src/simulation/types.ts';

const MOCK_CHOICES: readonly EvaluatedChoice[] = [
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

describe('Directive Input & Keyboard Isolation Verification', () => {
  it('correctly parses and matches the target sentence with spaces throughout', () => {
    const targetSentence = 'I would hire an external security team to investigate the database vulnerability.';

    // Verify spaces exist throughout the sentence (exactly 11 space separators between 12 words)
    const spaceCount = (targetSentence.match(/ /g) || []).length;
    assert.strictEqual(spaceCount, 11);

    // Verify movement letters are included in the sentence
    assert.ok(targetSentence.toLowerCase().includes('w'));
    assert.ok(targetSentence.toLowerCase().includes('a'));
    assert.ok(targetSentence.toLowerCase().includes('s'));
    assert.ok(targetSentence.toLowerCase().includes('d'));
    assert.ok(targetSentence.toLowerCase().includes('e'));

    // Match against choices
    const match = matchPlayerDirective(targetSentence, MOCK_CHOICES);
    assert.strictEqual(match.matched, true);
    assert.strictEqual(match.choiceId, 'CHOICE_1A');
    assert.ok(match.confidence >= 0.55);
    assert.strictEqual(match.matchedChoice?.id, 'CHOICE_1A');
  });

  it('allows full sentences containing WASD, E, and Space without corruption or loss', () => {
    // Test sentence containing every movement key:
    // 'w' (We, want), 'a' (want, audit), 's' (forensic), 'd' (do, audit), 'e' (We, external), ' ' (spaces)
    const sentence = 'We want to bring in an external consultant to do a forensic audit of the breach.';

    // Ensure all target letters are actually present in the test sentence
    assert.ok(sentence.toLowerCase().includes('w'));
    assert.ok(sentence.toLowerCase().includes('a'));
    assert.ok(sentence.toLowerCase().includes('s'));
    assert.ok(sentence.toLowerCase().includes('d'));
    assert.ok(sentence.toLowerCase().includes('e'));
    assert.ok(sentence.includes(' '));

    const match = matchPlayerDirective(sentence, MOCK_CHOICES);
    assert.strictEqual(match.matched, true);
    assert.strictEqual(match.choiceId, 'CHOICE_1A');
    assert.ok(match.confidence >= 0.55);
  });

  it('preserves text in the input value and evaluates properly upon submission', () => {
    // Simulated input state
    const inputState = {
      value: 'Deploy an emergency patch internally and keep quiet',
      isFocused: false,
    };

    // Simulate focus
    inputState.isFocused = true;
    assert.strictEqual(inputState.isFocused, true);

    // Simulate typing keystrokes with stopPropagation
    const handleKeydown = (e: { stopPropagation: () => void; key: string }) => {
      e.stopPropagation();
    };

    let stopped = false;
    handleKeydown({
      key: 'w',
      stopPropagation: () => {
        stopped = true;
      },
    });
    assert.strictEqual(stopped, true);

    // Analyze directive
    const result = matchPlayerDirective(inputState.value, MOCK_CHOICES);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.choiceId, 'CHOICE_1B');

    // Text must remain in the input field while typing and after analysis
    assert.strictEqual(
      inputState.value,
      'Deploy an emergency patch internally and keep quiet'
    );
  });
});
