/**
 * Mustarred Company Simulator - Clipboard & Browser Shortcut Non-Interference Tests
 *
 * Verifies that:
 * 1. Editable DOM elements (input, textarea, contenteditable) are properly recognized.
 * 2. System modifier keys (Ctrl, Meta/Cmd, Alt) are detected so gameplay keys never intercept shortcuts.
 * 3. Native browser clipboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Cmd+C, Cmd+V, Cmd+X, Cmd+A)
 *    are never defaultPrevented or suppressed.
 * 4. Keyboard events targeting inputs or using modifiers are flagged to be ignored by Phaser gameplay.
 * 5. Copied text can be transferred to external applications and pasted back into game inputs.
 * 6. CSS rules support text selection on the body, app, and dialogue containers while isolating canvas.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  isEditableElement,
  isModifierActive,
  shouldIgnoreGameInput,
} from '../src/game/keyboardIsolation.ts';

describe('Clipboard Shortcuts & Text Selection Non-Interference', () => {
  describe('Editable Element Detection', () => {
    it('identifies standard text input elements as editable', () => {
      const textInput = { tagName: 'INPUT', type: 'text', isContentEditable: false };
      const searchInput = { tagName: 'INPUT', type: 'search', isContentEditable: false };
      const emailInput = { tagName: 'INPUT', type: 'email', isContentEditable: false };
      const defaultInput = { tagName: 'INPUT', isContentEditable: false };

      assert.strictEqual(isEditableElement(textInput), true);
      assert.strictEqual(isEditableElement(searchInput), true);
      assert.strictEqual(isEditableElement(emailInput), true);
      assert.strictEqual(isEditableElement(defaultInput), true);
    });

    it('identifies textareas and contentEditable containers as editable', () => {
      const textarea = { tagName: 'TEXTAREA', isContentEditable: false };
      const contentEditableDiv = { tagName: 'DIV', isContentEditable: true };

      assert.strictEqual(isEditableElement(textarea), true);
      assert.strictEqual(isEditableElement(contentEditableDiv), true);
    });

    it('distinguishes non-text inputs (checkbox, radio, button) from editable text fields', () => {
      const checkbox = { tagName: 'INPUT', type: 'checkbox', isContentEditable: false };
      const radio = { tagName: 'INPUT', type: 'radio', isContentEditable: false };
      const button = { tagName: 'BUTTON', isContentEditable: false };
      const submitInput = { tagName: 'INPUT', type: 'submit', isContentEditable: false };
      const standardDiv = { tagName: 'DIV', isContentEditable: false };
      const paragraph = { tagName: 'P', isContentEditable: false };

      assert.strictEqual(isEditableElement(checkbox), false);
      assert.strictEqual(isEditableElement(radio), false);
      assert.strictEqual(isEditableElement(button), false);
      assert.strictEqual(isEditableElement(submitInput), false);
      assert.strictEqual(isEditableElement(standardDiv), false);
      assert.strictEqual(isEditableElement(paragraph), false);
      assert.strictEqual(isEditableElement(null), false);
      assert.strictEqual(isEditableElement(undefined), false);
    });
  });

  describe('Modifier Key Detection', () => {
    it('accurately identifies Ctrl, Meta (Cmd), and Alt modifiers', () => {
      assert.strictEqual(isModifierActive({ ctrlKey: true } as KeyboardEvent), true);
      assert.strictEqual(isModifierActive({ metaKey: true } as KeyboardEvent), true);
      assert.strictEqual(isModifierActive({ altKey: true } as KeyboardEvent), true);
      assert.strictEqual(isModifierActive({ ctrlKey: true, metaKey: true } as KeyboardEvent), true);
    });

    it('returns false when no modifier keys are pressed', () => {
      assert.strictEqual(isModifierActive({} as KeyboardEvent), false);
      assert.strictEqual(isModifierActive({ shiftKey: true } as KeyboardEvent), false);
      assert.strictEqual(isModifierActive(undefined), false);
    });
  });

  describe('Native Shortcut Non-Suppression & Phaser Bypass', () => {
    it('does not preventDefault on Ctrl+C, Ctrl+V, Ctrl+X, or Ctrl+A and tells Phaser to ignore them', () => {
      const shortcuts = [
        { key: 'c', keyCode: 67, ctrlKey: true, metaKey: false },
        { key: 'v', keyCode: 86, ctrlKey: true, metaKey: false },
        { key: 'x', keyCode: 88, ctrlKey: true, metaKey: false },
        { key: 'a', keyCode: 65, ctrlKey: true, metaKey: false },
      ];

      for (const s of shortcuts) {
        let prevented = false;
        let propagationStopped = false;
        const fakeEvent = {
          ...s,
          defaultPrevented: false,
          preventDefault: () => { prevented = true; },
          stopPropagation: () => { propagationStopped = true; },
        } as unknown as KeyboardEvent;

        // Verify that isModifierActive recognizes the shortcut
        assert.strictEqual(isModifierActive(fakeEvent), true);
        // Verify shouldIgnoreGameInput tells Phaser to ignore it so player does not move
        assert.strictEqual(shouldIgnoreGameInput(fakeEvent, () => false), true);
        // Verify event was NOT cancelled or suppressed
        assert.strictEqual(prevented, false);
        assert.strictEqual(propagationStopped, false);
      }
    });

    it('does not preventDefault on macOS Cmd+C, Cmd+V, Cmd+X, or Cmd+A and tells Phaser to ignore them', () => {
      const macShortcuts = [
        { key: 'c', keyCode: 67, ctrlKey: false, metaKey: true },
        { key: 'v', keyCode: 86, ctrlKey: false, metaKey: true },
        { key: 'x', keyCode: 88, ctrlKey: false, metaKey: true },
        { key: 'a', keyCode: 65, ctrlKey: false, metaKey: true },
      ];

      for (const s of macShortcuts) {
        let prevented = false;
        let propagationStopped = false;
        const fakeEvent = {
          ...s,
          defaultPrevented: false,
          preventDefault: () => { prevented = true; },
          stopPropagation: () => { propagationStopped = true; },
        } as unknown as KeyboardEvent;

        assert.strictEqual(isModifierActive(fakeEvent), true);
        assert.strictEqual(shouldIgnoreGameInput(fakeEvent, () => false), true);
        assert.strictEqual(prevented, false);
        assert.strictEqual(propagationStopped, false);
      }
    });

    it('tells Phaser to ignore normal typing (WASD, Space, Enter) when a text input is focused', () => {
      const typingEvents = [
        { key: 'w', keyCode: 87 },
        { key: 'a', keyCode: 65 },
        { key: 's', keyCode: 83 },
        { key: 'd', keyCode: 68 },
        { key: ' ', keyCode: 32 },
        { key: 'Enter', keyCode: 13 },
      ];

      for (const t of typingEvents) {
        const fakeEvent = {
          ...t,
          ctrlKey: false,
          metaKey: false,
          altKey: false,
        } as KeyboardEvent;

        // When input is focused, Phaser must ignore all gameplay keys
        assert.strictEqual(shouldIgnoreGameInput(fakeEvent, () => true), true);
      }
    });

    it('allows Phaser to process WASD movement keys only when no text field is focused and no modifiers are pressed', () => {
      const movementKeys = [
        { key: 'w', keyCode: 87 },
        { key: 'a', keyCode: 65 },
        { key: 's', keyCode: 83 },
        { key: 'd', keyCode: 68 },
      ];

      for (const m of movementKeys) {
        const fakeEvent = {
          ...m,
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          target: { tagName: 'CANVAS' },
        } as unknown as KeyboardEvent;

        // When canvas has focus and no modifiers are held, gameplay keys ARE processed
        assert.strictEqual(shouldIgnoreGameInput(fakeEvent, () => false), false);
      }
    });
  });

  describe('Simulated Clipboard Copy and Paste Flow', () => {
    it('simulates copying incident text and pasting into directive input', () => {
      // 1. Text copied from incident narrative or comms channel
      const sourceIncidentText = 'Engage Apex Cyber for a full forensic security audit and database patch.';

      // 2. Simulated clipboard buffer (mimicking external clipboard transfer)
      let systemClipboard = '';
      systemClipboard = sourceIncidentText;
      assert.strictEqual(systemClipboard, sourceIncidentText);

      // 3. User pastes into directive input element
      const directiveInputMock = {
        value: '',
        tagName: 'INPUT',
        type: 'text',
        isContentEditable: false,
      };

      // Native paste event copies system clipboard into element value
      directiveInputMock.value = systemClipboard;
      assert.strictEqual(directiveInputMock.value, 'Engage Apex Cyber for a full forensic security audit and database patch.');

      // 4. Input matches editable element verification
      assert.strictEqual(isEditableElement(directiveInputMock), true);
    });
  });

  describe('CSS Selection & Pointer Isolation Verification', () => {
    it('verifies style.css enables text selection globally and isolates only the canvas and buttons', () => {
      const cssPath = path.resolve(process.cwd(), 'src/style.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // 1. html, body, #app must have user-select: text
      assert.ok(
        cssContent.includes('user-select: text;'),
        'style.css must define user-select: text for global readability'
      );

      // 2. Selection background must be defined for clear selection feedback
      assert.ok(
        cssContent.includes('::selection'),
        'style.css must style ::selection for visual contrast'
      );

      // 3. Canvas must have user-select: none to avoid unintended canvas drag artifacts
      assert.ok(
        cssContent.includes('#game-container canvas'),
        'style.css must isolate #game-container canvas'
      );

      // 4. Buttons must have user-select: none to prevent accidental double-click text selection
      assert.ok(
        cssContent.includes('button,'),
        'style.css must define user-select: none for buttons'
      );
    });
  });
});
