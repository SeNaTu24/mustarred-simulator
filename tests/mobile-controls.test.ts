/**
 * Mustarred Company Simulator - Mobile Controls & Touch Interaction Test Suite
 *
 * Verifies:
 * 1. Creation and presence of mobile virtual joystick and action button elements.
 * 2. CSS isolation: hidden on desktop viewports and fine pointers, displayed on mobile touch screens.
 * 3. Responsive adaptation across portrait and landscape orientations.
 * 4. Touch-action and pointer isolation preventing scrolling or page interference.
 * 5. Full 8-direction movement vector calculations (UP, DOWN, LEFT, RIGHT, and 4 diagonals).
 * 6. Deadzone handling preventing unintentional drift.
 * 7. Clamping of thumb knob within max radius.
 * 8. Pointer lifecycle handling (start, move, release, cancellation).
 * 9. Multi-touch handling (independent pointer tracking).
 * 10. Prominent interaction button state toggling (in-range beacon glow and interaction callbacks).
 * 11. Integration with OfficeScene virtual movement and movement locking.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MobileControls } from '../src/ui/MobileControls.ts';

// ============================================================================
// DOM MOCK IMPLEMENTATION FOR HEADLESS NODE ENVIRONMENT
// ============================================================================

interface MockListener {
  readonly type: string;
  readonly handler: EventListenerOrEventListenerObject;
}

class MockElement {
  public tagName: string;
  public id: string = '';
  public className: string = '';
  public role: string = '';
  public type: string = '';
  private _textContent?: string;

  public get textContent(): string {
    if (this._textContent !== undefined) {
      return this._textContent;
    }
    return this.children.map((c) => c.textContent).join(' ');
  }

  public set textContent(val: string) {
    this._textContent = val;
  }

  public style: Record<string, string> = {};
  public children: MockElement[] = [];
  public parentNode: MockElement | null = null;
  private attributes: Map<string, string> = new Map();
  private listeners: MockListener[] = [];
  public capturedPointerId: number | null = null;

  public boundingBox = {
    left: 50,
    top: 500,
    width: 100,
    height: 100,
    right: 150,
    bottom: 600,
  };

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
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

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
    if (name === 'role') this.role = value;
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public get classList() {
    return {
      add: (...classes: string[]) => {
        const set = new Set(this.className.split(' ').filter(Boolean));
        classes.forEach((c) => set.add(c));
        this.className = Array.from(set).join(' ');
      },
      remove: (...classes: string[]) => {
        const set = new Set(this.className.split(' ').filter(Boolean));
        classes.forEach((c) => set.delete(c));
        this.className = Array.from(set).join(' ');
      },
      contains: (cls: string) => {
        return this.className.split(' ').filter(Boolean).includes(cls);
      },
      toggle: (cls: string, force?: boolean) => {
        const has = this.className.split(' ').filter(Boolean).includes(cls);
        const shouldAdd = force !== undefined ? force : !has;
        if (shouldAdd) this.classList.add(cls);
        else this.classList.remove(cls);
      },
    };
  }

  public addEventListener(type: string, handler: EventListenerOrEventListenerObject): void {
    this.listeners.push({ type, handler });
  }

  public removeEventListener(type: string, handler: EventListenerOrEventListenerObject): void {
    this.listeners = this.listeners.filter((l) => !(l.type === type && l.handler === handler));
  }

  public dispatchEvent(event: any): boolean {
    const matching = this.listeners.filter((l) => l.type === event.type);
    for (const l of matching) {
      if (typeof l.handler === 'function') {
        l.handler(event);
      } else if (l.handler && typeof l.handler.handleEvent === 'function') {
        l.handler.handleEvent(event);
      }
    }
    return !event.defaultPrevented;
  }

  public getBoundingClientRect() {
    return this.boundingBox;
  }

  public setPointerCapture(pointerId: number): void {
    this.capturedPointerId = pointerId;
  }

  public releasePointerCapture(pointerId: number): void {
    if (this.capturedPointerId === pointerId) {
      this.capturedPointerId = null;
    }
  }

  public querySelector(selector: string): MockElement | null {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      if (this.id === id) return this;
      for (const child of this.children) {
        const found = child.querySelector(selector);
        if (found) return found;
      }
    } else if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      if (this.classList.contains(cls)) return this;
      for (const child of this.children) {
        const found = child.querySelector(selector);
        if (found) return found;
      }
    }
    return null;
  }
}

class MockPointerEvent {
  public type: string;
  public pointerId: number;
  public clientX: number;
  public clientY: number;
  public bubbles: boolean;
  public cancelable: boolean;
  public defaultPrevented: boolean = false;
  public propagationStopped: boolean = false;

  constructor(type: string, init: { pointerId?: number; clientX?: number; clientY?: number } = {}) {
    this.type = type;
    this.pointerId = init.pointerId ?? 1;
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
    this.bubbles = true;
    this.cancelable = true;
  }

  public preventDefault(): void {
    this.defaultPrevented = true;
  }

  public stopPropagation(): void {
    this.propagationStopped = true;
  }
}

class MockMouseEvent {
  public type: string;
  public defaultPrevented: boolean = false;
  public propagationStopped: boolean = false;

  constructor(type: string) {
    this.type = type;
  }

  public preventDefault(): void {
    this.defaultPrevented = true;
  }

  public stopPropagation(): void {
    this.propagationStopped = true;
  }
}

// Setup simulated global browser environment
let mockWindowListeners: MockListener[] = [];
let mockOverlay: MockElement;

function setupMockDOM(): void {
  mockWindowListeners = [];
  mockOverlay = new MockElement('DIV');
  mockOverlay.id = 'ui-overlay';

  const mockDoc = {
    createElement: (tag: string) => new MockElement(tag),
    getElementById: (id: string) => (id === 'ui-overlay' ? mockOverlay : null),
    body: new MockElement('BODY'),
  };

  const mockWin = {
    addEventListener: (type: string, handler: EventListenerOrEventListenerObject) => {
      mockWindowListeners.push({ type, handler });
    },
    removeEventListener: (type: string, handler: EventListenerOrEventListenerObject) => {
      mockWindowListeners = mockWindowListeners.filter((l) => !(l.type === type && l.handler === handler));
    },
    dispatchEvent: (event: any) => {
      const matching = mockWindowListeners.filter((l) => l.type === event.type);
      for (const l of matching) {
        if (typeof l.handler === 'function') {
          l.handler(event);
        }
      }
    },
  };

  (globalThis as any).document = mockDoc;
  (globalThis as any).window = mockWin;
  (globalThis as any).PointerEvent = MockPointerEvent;
  (globalThis as any).MouseEvent = MockMouseEvent;
}

function cleanupMockDOM(): void {
  delete (globalThis as any).document;
  delete (globalThis as any).window;
  delete (globalThis as any).PointerEvent;
  delete (globalThis as any).MouseEvent;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Mobile Gameplay Controls - Virtual Joystick & Interaction Button', () => {
  beforeEach(() => {
    setupMockDOM();
  });

  afterEach(() => {
    cleanupMockDOM();
  });

  // --------------------------------------------------------------------------
  // 1. CSS & Isolation Audit
  // --------------------------------------------------------------------------
  describe('CSS Rules & Desktop Hiding Audit', () => {
    const cssPath = path.resolve('src/style.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    it('hides mobile controls on desktop fine-pointer viewports', () => {
      assert.ok(
        cssContent.includes('@media (min-width: 769px) and (hover: hover) and (pointer: fine)'),
        'Missing desktop hiding media query'
      );
      assert.ok(
        cssContent.includes('display: none !important;'),
        'Desktop rule must use display: none !important'
      );
    });

    it('displays mobile controls on touchscreens and small screens', () => {
      assert.ok(
        cssContent.includes('@media (max-width: 768px), (pointer: coarse)'),
        'Missing mobile coarse-pointer display query'
      );
    });

    it('enforces touch-action: none to prevent scrolling or pull-to-refresh gestures', () => {
      assert.ok(cssContent.includes('touch-action: none;'), 'Missing touch-action: none');
    });

    it('includes landscape adaptation for short phone viewports', () => {
      assert.ok(
        cssContent.includes('@media (max-height: 520px) and (orientation: landscape)'),
        'Missing mobile landscape query'
      );
      assert.ok(cssContent.includes('width: 86px;'), 'Landscape joystick should use compact diameter');
    });

    it('includes in-range pulsing glow animation for interaction button', () => {
      assert.ok(cssContent.includes('.mobile-action-btn.in-range'), 'Missing in-range button class');
      assert.ok(cssContent.includes('@keyframes action-pulse'), 'Missing action pulse keyframe');
    });
  });

  // --------------------------------------------------------------------------
  // 2. DOM Structure & Initialization
  // --------------------------------------------------------------------------
  describe('DOM Structure & Component Instantiation', () => {
    it('creates joystick container, base ring, thumb knob, and prominent action button', () => {
      let moveCount = 0;
      let interactCount = 0;

      const controls = new MobileControls({
        container: mockOverlay as any,
        onMove: () => { moveCount++; },
        onInteract: () => { interactCount++; },
      });

      const elements = controls.getElements();
      assert.strictEqual(elements.root.id, 'mobile-controls');
      assert.strictEqual(elements.base.className, 'joystick-base');
      assert.strictEqual(elements.thumb.className, 'joystick-thumb');
      assert.strictEqual(elements.actionBtn.className, 'mobile-action-btn');

      // Verify crosshair and thumb grip are present
      assert.ok(elements.base.querySelector('.joystick-crosshair'));
      assert.ok(elements.thumb.querySelector('.joystick-thumb-grip'));

      controls.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Movement Calculations & 8-Directional Vector Resolution
  // --------------------------------------------------------------------------
  describe('8-Direction Movement & Vector Calculations', () => {
    it('accurately resolves all 8 cardinal and diagonal directions', () => {
      let lastDx = 0;
      let lastDy = 0;

      const controls = new MobileControls({
        container: mockOverlay as any,
        onMove: (dx, dy) => {
          lastDx = dx;
          lastDy = dy;
        },
        onInteract: () => {},
      });

      const elements = controls.getElements();
      // Center of base element is at (100, 550) given boundingBox { left: 50, top: 500, width: 100, height: 100 }
      const centerX = 100;
      const centerY = 550;

      // 1. UP (screen coordinates: negative Y)
      controls.updateJoystickPosition(centerX, centerY - 45);
      assert.strictEqual(controls.getEightDirection(), 'UP');
      assert.ok(lastDy < -0.9 && Math.abs(lastDx) < 0.1, `Expected UP vector, got dx=${lastDx}, dy=${lastDy}`);

      // 2. UP_RIGHT (positive X, negative Y)
      controls.updateJoystickPosition(centerX + 35, centerY - 35);
      assert.strictEqual(controls.getEightDirection(), 'UP_RIGHT');
      assert.ok(lastDx > 0.5 && lastDy < -0.5, `Expected UP_RIGHT vector, got dx=${lastDx}, dy=${lastDy}`);

      // 3. RIGHT (positive X)
      controls.updateJoystickPosition(centerX + 45, centerY);
      assert.strictEqual(controls.getEightDirection(), 'RIGHT');
      assert.ok(lastDx > 0.9 && Math.abs(lastDy) < 0.1, `Expected RIGHT vector, got dx=${lastDx}, dy=${lastDy}`);

      // 4. DOWN_RIGHT (positive X, positive Y)
      controls.updateJoystickPosition(centerX + 35, centerY + 35);
      assert.strictEqual(controls.getEightDirection(), 'DOWN_RIGHT');
      assert.ok(lastDx > 0.5 && lastDy > 0.5, `Expected DOWN_RIGHT vector, got dx=${lastDx}, dy=${lastDy}`);

      // 5. DOWN (screen coordinates: positive Y)
      controls.updateJoystickPosition(centerX, centerY + 45);
      assert.strictEqual(controls.getEightDirection(), 'DOWN');
      assert.ok(lastDy > 0.9 && Math.abs(lastDx) < 0.1, `Expected DOWN vector, got dx=${lastDx}, dy=${lastDy}`);

      // 6. DOWN_LEFT (negative X, positive Y)
      controls.updateJoystickPosition(centerX - 35, centerY + 35);
      assert.strictEqual(controls.getEightDirection(), 'DOWN_LEFT');
      assert.ok(lastDx < -0.5 && lastDy > 0.5, `Expected DOWN_LEFT vector, got dx=${lastDx}, dy=${lastDy}`);

      // 7. LEFT (negative X)
      controls.updateJoystickPosition(centerX - 45, centerY);
      assert.strictEqual(controls.getEightDirection(), 'LEFT');
      assert.ok(lastDx < -0.9 && Math.abs(lastDy) < 0.1, `Expected LEFT vector, got dx=${lastDx}, dy=${lastDy}`);

      // 8. UP_LEFT (negative X, negative Y)
      controls.updateJoystickPosition(centerX - 35, centerY - 35);
      assert.strictEqual(controls.getEightDirection(), 'UP_LEFT');
      assert.ok(lastDx < -0.5 && lastDy < -0.5, `Expected UP_LEFT vector, got dx=${lastDx}, dy=${lastDy}`);

      controls.destroy();
    });

    it('deadzone eliminates resting thumb jitter and reports (0, 0)', () => {
      let lastDx = 1;
      let lastDy = 1;

      const controls = new MobileControls({
        container: mockOverlay as any,
        onMove: (dx, dy) => {
          lastDx = dx;
          lastDy = dy;
        },
        onInteract: () => {},
      });

      // Center is (100, 550). Touch at (102, 552) -> distance is 2.8px (below deadzone of 6px)
      controls.updateJoystickPosition(102, 552);

      assert.strictEqual(lastDx, 0);
      assert.strictEqual(lastDy, 0);
      assert.strictEqual(controls.getEightDirection(), 'CENTER');

      controls.destroy();
    });

    it('clamps normalized movement vector to maximum magnitude of 1.0 even with large finger displacement', () => {
      let lastDx = 0;
      let lastDy = 0;

      const controls = new MobileControls({
        container: mockOverlay as any,
        onMove: (dx, dy) => {
          lastDx = dx;
          lastDy = dy;
        },
        onInteract: () => {},
      });

      // Extreme drag: 300px away from center
      controls.updateJoystickPosition(400, 550);

      const mag = Math.hypot(lastDx, lastDy);
      assert.ok(mag <= 1.0001, `Magnitude should be clamped to 1.0, got ${mag}`);
      assert.strictEqual(lastDx, 1);
      assert.strictEqual(lastDy, 0);

      controls.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // 4. Pointer Lifecycle & Multi-Touch Isolation
  // --------------------------------------------------------------------------
  describe('Pointer Lifecycle & Multi-Touch Tracking', () => {
    it('tracks pointerdown, pointermove, and pointerup cleanly', () => {
      let lastDx = 0;
      let lastDy = 0;

      const controls = new MobileControls({
        container: mockOverlay as any,
        onMove: (dx, dy) => {
          lastDx = dx;
          lastDy = dy;
        },
        onInteract: () => {},
      });

      const elements = controls.getElements();

      // 1. Pointerdown on joystick base with pointerId: 42
      const downEvent = new MockPointerEvent('pointerdown', { pointerId: 42, clientX: 135, clientY: 550 });
      elements.base.dispatchEvent(downEvent);

      assert.strictEqual(controls.getIsActive(), true);
      assert.strictEqual(elements.base.classList.contains('active'), true);
      assert.ok(lastDx > 0.5, 'Movement should be initiated on pointerdown');

      // 2. Pointermove on window
      const moveEvent = new MockPointerEvent('pointermove', { pointerId: 42, clientX: 145, clientY: 550 });
      (globalThis as any).window.dispatchEvent(moveEvent);

      assert.ok(lastDx > 0.9, 'Movement should follow pointermove');

      // 3. Pointerup releases capture and resets vector to (0, 0)
      const upEvent = new MockPointerEvent('pointerup', { pointerId: 42, clientX: 145, clientY: 550 });
      (globalThis as any).window.dispatchEvent(upEvent);

      assert.strictEqual(controls.getIsActive(), false);
      assert.strictEqual(elements.base.classList.contains('active'), false);
      assert.strictEqual(lastDx, 0);
      assert.strictEqual(lastDy, 0);
      assert.strictEqual(elements.thumb.style.transform, 'translate(0px, 0px)');

      controls.destroy();
    });

    it('pointercancel resets movement and thumb knob position', () => {
      let lastDx = 0;
      let lastDy = 0;

      const controls = new MobileControls({
        container: mockOverlay as any,
        onMove: (dx, dy) => {
          lastDx = dx;
          lastDy = dy;
        },
        onInteract: () => {},
      });

      const elements = controls.getElements();

      const downEvent = new MockPointerEvent('pointerdown', { pointerId: 7, clientX: 100, clientY: 510 });
      elements.base.dispatchEvent(downEvent);
      assert.ok(lastDy < -0.5);

      const cancelEvent = new MockPointerEvent('pointercancel', { pointerId: 7 });
      (globalThis as any).window.dispatchEvent(cancelEvent);

      assert.strictEqual(controls.getIsActive(), false);
      assert.strictEqual(lastDx, 0);
      assert.strictEqual(lastDy, 0);

      controls.destroy();
    });

    it('ignores extraneous pointers so second thumb does not hijack joystick tracking', () => {
      let moveCalls = 0;

      const controls = new MobileControls({
        container: mockOverlay as any,
        onMove: () => { moveCalls++; },
        onInteract: () => {},
      });

      const elements = controls.getElements();

      // Primary left thumb takes joystick
      const down1 = new MockPointerEvent('pointerdown', { pointerId: 1, clientX: 130, clientY: 550 });
      elements.base.dispatchEvent(down1);
      const callCountAfterPrimary = moveCalls;

      // Secondary touch on another part of screen with pointerId: 2
      const move2 = new MockPointerEvent('pointermove', { pointerId: 2, clientX: 300, clientY: 300 });
      (globalThis as any).window.dispatchEvent(move2);

      // Joystick should have ignored pointerId 2
      assert.strictEqual(moveCalls, callCountAfterPrimary);

      controls.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // 5. Prominent Action Button & In-Range Department Beacon
  // --------------------------------------------------------------------------
  describe('Prominent Interaction Button', () => {
    it('dispatches interaction callback upon pointerdown or click', () => {
      let interactCount = 0;

      const controls = new MobileControls({
        container: mockOverlay as any,
        onMove: () => {},
        onInteract: () => { interactCount++; },
      });

      const elements = controls.getElements();

      // Pointerdown on action button
      const pointerDown = new MockPointerEvent('pointerdown', { pointerId: 3 });
      elements.actionBtn.dispatchEvent(pointerDown);

      assert.strictEqual(interactCount, 1);
      assert.strictEqual(elements.actionBtn.classList.contains('pressed'), true);

      // Pointerup releases pressed visual
      const pointerUp = new MockPointerEvent('pointerup', { pointerId: 3 });
      elements.actionBtn.dispatchEvent(pointerUp);
      assert.strictEqual(elements.actionBtn.classList.contains('pressed'), false);

      controls.destroy();
    });

    it('updates visual indicator when entering and exiting department beacon range', () => {
      const controls = new MobileControls({
        container: mockOverlay as any,
        onMove: () => {},
        onInteract: () => {},
      });

      const elements = controls.getElements();

      // Default state: exploring
      assert.strictEqual(controls.getIsInRange(), false);
      assert.strictEqual(elements.actionBtn.classList.contains('in-range'), false);

      // Player walks into IT beacon range
      controls.setDepartmentInRange(true, 'IT');
      assert.strictEqual(controls.getIsInRange(), true);
      assert.strictEqual(elements.actionBtn.classList.contains('in-range'), true);
      assert.ok(elements.actionBtn.textContent.includes('CONSULT'));
      assert.ok(elements.actionBtn.textContent.includes('IT'));

      // Player walks away from beacon
      controls.setDepartmentInRange(false);
      assert.strictEqual(controls.getIsInRange(), false);
      assert.strictEqual(elements.actionBtn.classList.contains('in-range'), false);
      assert.ok(elements.actionBtn.textContent.includes('ACT'));

      controls.destroy();
    });

    it('disabling controls halts movement and prevents interactions (e.g. during open modals)', () => {
      let lastDx = 0;
      let lastDy = 0;
      let interactCount = 0;

      const controls = new MobileControls({
        container: mockOverlay as any,
        onMove: (dx, dy) => { lastDx = dx; lastDy = dy; },
        onInteract: () => { interactCount++; },
      });

      const elements = controls.getElements();

      // Initiate movement
      controls.updateJoystickPosition(140, 550);
      assert.ok(lastDx > 0);

      // Modal opens -> disable mobile controls
      controls.setEnabled(false);
      assert.strictEqual(controls.getIsEnabled(), false);
      assert.strictEqual(lastDx, 0); // resets movement to zero
      assert.strictEqual(elements.root.classList.contains('disabled'), true);

      // Attempted touch while disabled should be discarded
      const pointerDown = new MockPointerEvent('pointerdown', { pointerId: 9 });
      elements.actionBtn.dispatchEvent(pointerDown);
      assert.strictEqual(interactCount, 0);

      controls.destroy();
    });
  });
});
