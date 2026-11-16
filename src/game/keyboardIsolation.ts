/**
 * Mustarred Company Simulator - Keyboard & Clipboard Isolation Utilities
 *
 * Provides pure DOM and event helpers to decouple browser clipboard shortcuts
 * and editable text inputs from Phaser's gameplay key processing.
 */

/**
 * Checks whether an element is an editable text field (input text/search/etc., textarea, or contenteditable).
 */
export function isEditableElement(element: unknown): boolean {
  if (!element || typeof element !== 'object') return false;
  const el = element as HTMLElement;
  if (el.isContentEditable) return true;
  const tag = el.tagName?.toUpperCase();
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const inputType = (el as HTMLInputElement).type?.toLowerCase() || 'text';
    const nonTextTypes = ['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image', 'range', 'color'];
    return !nonTextTypes.includes(inputType);
  }
  return false;
}

/**
 * Checks whether a text input, textarea, or content-editable field is currently focused in the DOM.
 */
export function isTextInputFocused(): boolean {
  if (typeof document === 'undefined') return false;
  let active = document.activeElement as HTMLElement | null;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement as HTMLElement | null;
  }
  return isEditableElement(active);
}

/**
 * Checks whether a system modifier key (Ctrl, Meta/Cmd, Alt) is pressed.
 */
export function isModifierActive(e?: KeyboardEvent): boolean {
  if (!e) return false;
  return !!(e.ctrlKey || e.metaKey || e.altKey);
}

/**
 * Determines whether a keyboard event should be ignored by Phaser gameplay controls.
 * Drops modifier shortcuts (e.g. Ctrl+C, Ctrl+V, Ctrl+A) and any typing originating from text fields.
 */
export function shouldIgnoreGameInput(
  event: KeyboardEvent,
  checkInputFocused: () => boolean = isTextInputFocused
): boolean {
  if (isModifierActive(event)) return true;
  if (checkInputFocused() || isEditableElement(event.target)) return true;
  return false;
}
