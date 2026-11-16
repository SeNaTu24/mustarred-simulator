/**
 * Mustarred Company Simulator - Mobile Controls Module
 *
 * Provides dedicated, tactile on-screen controls for mobile and touch devices:
 * - Bottom-left 8-direction virtual joystick with analog sensitivity and deadzone clamping
 * - Bottom-right prominent interaction button triggering department consultations (matching E/Space)
 * - Multi-touch tracking ensuring independent joystick and action button pointer lifecycles
 * - Responsive layout adaptation for portrait and landscape orientations
 * - Desktop isolation: hidden automatically on desktop viewports and fine-cursor mice
 */

export type EightDirection =
  | 'CENTER'
  | 'UP'
  | 'UP_RIGHT'
  | 'RIGHT'
  | 'DOWN_RIGHT'
  | 'DOWN'
  | 'DOWN_LEFT'
  | 'LEFT'
  | 'UP_LEFT';

export interface MobileControlsOptions {
  readonly onMove: (dx: number, dy: number) => void;
  readonly onInteract: () => void;
  readonly container?: HTMLElement;
}

export class MobileControls {
  private readonly rootEl: HTMLElement;
  private readonly joystickContainer: HTMLElement;
  private readonly baseEl: HTMLElement;
  private readonly thumbEl: HTMLElement;
  private readonly actionContainer: HTMLElement;
  private readonly actionBtn: HTMLButtonElement;
  private readonly actionIcon: HTMLElement;
  private readonly actionLabel: HTMLElement;
  private readonly actionHint: HTMLElement;

  private readonly onMoveCallback: (dx: number, dy: number) => void;
  private readonly onInteractCallback: () => void;

  // Joystick state
  private activeJoystickPointerId: number | null = null;
  private currentDx: number = 0;
  private currentDy: number = 0;
  private maxRadius: number = 44; // pixels
  private deadzone: number = 6; // pixels
  private isEnabled: boolean = true;
  private isInRange: boolean = false;
  private lastInteractTime: number = 0;

  // Bound event listeners for clean teardown
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundPointerCancel: (e: PointerEvent) => void;
  private boundActionDown: (e: PointerEvent) => void;
  private boundActionUp: (e: PointerEvent) => void;
  private boundActionClick: (e: MouseEvent) => void;

  constructor(options: MobileControlsOptions) {
    this.onMoveCallback = options.onMove;
    this.onInteractCallback = options.onInteract;

    const parent = options.container ?? document.getElementById('ui-overlay') ?? document.body;

    // 1. Root container
    this.rootEl = document.createElement('div');
    this.rootEl.id = 'mobile-controls';
    this.rootEl.className = 'mobile-controls';
    this.rootEl.setAttribute('role', 'region');
    this.rootEl.setAttribute('aria-label', 'Mobile Touch Controls');

    // 2. Left: Virtual Joystick Container
    this.joystickContainer = document.createElement('div');
    this.joystickContainer.className = 'joystick-container';

    this.baseEl = document.createElement('div');
    this.baseEl.className = 'joystick-base';
    this.baseEl.setAttribute('aria-hidden', 'true');

    // Crosshair directional guides
    const crosshair = document.createElement('div');
    crosshair.className = 'joystick-crosshair';
    this.baseEl.appendChild(crosshair);

    // Draggable thumb knob
    this.thumbEl = document.createElement('div');
    this.thumbEl.className = 'joystick-thumb';
    const thumbGrip = document.createElement('div');
    thumbGrip.className = 'joystick-thumb-grip';
    this.thumbEl.appendChild(thumbGrip);
    this.baseEl.appendChild(this.thumbEl);
    this.joystickContainer.appendChild(this.baseEl);

    // Directional hint label under joystick
    const joystickHint = document.createElement('div');
    joystickHint.className = 'joystick-hint';
    joystickHint.textContent = 'MOVE';
    this.joystickContainer.appendChild(joystickHint);

    // 3. Right: Interaction Action Button Container
    this.actionContainer = document.createElement('div');
    this.actionContainer.className = 'mobile-action-container';

    this.actionBtn = document.createElement('button');
    this.actionBtn.type = 'button';
    this.actionBtn.className = 'mobile-action-btn';
    this.actionBtn.setAttribute('aria-label', 'Interact with department');

    this.actionIcon = document.createElement('span');
    this.actionIcon.className = 'mobile-action-icon';
    this.actionIcon.textContent = '⚡';

    this.actionLabel = document.createElement('span');
    this.actionLabel.className = 'mobile-action-label';
    this.actionLabel.textContent = 'ACT [E]';

    this.actionHint = document.createElement('span');
    this.actionHint.className = 'mobile-action-hint';
    this.actionHint.textContent = 'EXPLORE';

    this.actionBtn.appendChild(this.actionIcon);
    this.actionBtn.appendChild(this.actionLabel);
    this.actionBtn.appendChild(this.actionHint);
    this.actionContainer.appendChild(this.actionBtn);

    // Assemble into root overlay
    this.rootEl.appendChild(this.joystickContainer);
    this.rootEl.appendChild(this.actionContainer);
    parent.appendChild(this.rootEl);

    // 4. Bind event handlers
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundPointerCancel = this.handlePointerCancel.bind(this);

    this.boundActionDown = this.handleActionPointerDown.bind(this);
    this.boundActionUp = this.handleActionPointerUp.bind(this);
    this.boundActionClick = this.handleActionClick.bind(this);

    this.attachListeners();
  }

  /**
   * Attaches pointer and touch event listeners.
   */
  private attachListeners(): void {
    // Joystick events on the base element
    this.baseEl.addEventListener('pointerdown', this.boundPointerDown, { passive: false });
    window.addEventListener('pointermove', this.boundPointerMove, { passive: false });
    window.addEventListener('pointerup', this.boundPointerUp, { passive: false });
    window.addEventListener('pointercancel', this.boundPointerCancel, { passive: false });

    // Action button events
    this.actionBtn.addEventListener('pointerdown', this.boundActionDown, { passive: false });
    this.actionBtn.addEventListener('pointerup', this.boundActionUp, { passive: false });
    this.actionBtn.addEventListener('pointercancel', this.boundActionUp, { passive: false });
    this.actionBtn.addEventListener('click', this.boundActionClick);
  }

  // ==========================================================================
  // JOYSTICK POINTER EVENT HANDLERS
  // ==========================================================================

  private handlePointerDown(e: PointerEvent): void {
    if (!this.isEnabled) return;
    if (this.activeJoystickPointerId !== null) return;

    e.preventDefault();
    e.stopPropagation();

    this.activeJoystickPointerId = e.pointerId;
    try {
      this.baseEl.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore in environments where setPointerCapture is unsupported or mocked
    }

    this.baseEl.classList.add('active');
    this.updateJoystickPosition(e.clientX, e.clientY);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isEnabled) return;
    if (this.activeJoystickPointerId === null || e.pointerId !== this.activeJoystickPointerId) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    this.updateJoystickPosition(e.clientX, e.clientY);
  }

  private handlePointerUp(e: PointerEvent): void {
    if (this.activeJoystickPointerId === null || e.pointerId !== this.activeJoystickPointerId) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    this.resetJoystick();
  }

  private handlePointerCancel(e: PointerEvent): void {
    if (this.activeJoystickPointerId === null || e.pointerId !== this.activeJoystickPointerId) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    this.resetJoystick();
  }

  /**
   * Computes joystick vector from client coordinates, applies deadzone, clamps to maxRadius,
   * updates the thumb knob transform, and invokes the movement callback.
   */
  public updateJoystickPosition(clientX: number, clientY: number): void {
    const rect = this.baseEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rawDx = clientX - centerX;
    const rawDy = clientY - centerY;
    const distance = Math.hypot(rawDx, rawDy);

    let clampedX = 0;
    let clampedY = 0;
    let normDx = 0;
    let normDy = 0;

    if (distance >= this.deadzone) {
      const clampedDist = Math.min(distance, this.maxRadius);
      const dirX = rawDx / distance;
      const dirY = rawDy / distance;

      clampedX = dirX * clampedDist;
      clampedY = dirY * clampedDist;

      // Normalize between [0, 1] relative to active travel range
      const effectiveDist = (clampedDist - this.deadzone) / (this.maxRadius - this.deadzone);
      const clampedNorm = Math.min(1, Math.max(0, effectiveDist));
      normDx = dirX * clampedNorm;
      normDy = dirY * clampedNorm;
    }

    this.currentDx = normDx;
    this.currentDy = normDy;

    // Smooth visual thumb offset
    this.thumbEl.style.transform = `translate(${clampedX.toFixed(1)}px, ${clampedY.toFixed(1)}px)`;

    // Dispatch movement to OfficeScene
    this.onMoveCallback(normDx, normDy);
  }

  /**
   * Resets the joystick knob back to the center and stops player movement.
   */
  public resetJoystick(): void {
    if (this.activeJoystickPointerId !== null) {
      try {
        this.baseEl.releasePointerCapture?.(this.activeJoystickPointerId);
      } catch {
        // Safe fallback
      }
      this.activeJoystickPointerId = null;
    }

    this.baseEl.classList.remove('active');
    this.thumbEl.style.transform = 'translate(0px, 0px)';
    this.currentDx = 0;
    this.currentDy = 0;

    this.onMoveCallback(0, 0);
  }

  // ==========================================================================
  // ACTION BUTTON EVENT HANDLERS
  // ==========================================================================

  private handleActionPointerDown(e: PointerEvent): void {
    if (!this.isEnabled) return;
    e.preventDefault();
    e.stopPropagation();

    this.actionBtn.classList.add('pressed');
    this.triggerInteract();
  }

  private handleActionPointerUp(e: PointerEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.actionBtn.classList.remove('pressed');
  }

  private handleActionClick(e: MouseEvent): void {
    if (!this.isEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    this.triggerInteract();
  }

  /**
   * Debounced trigger for interaction action to prevent double-firing from pointerdown + click.
   */
  public triggerInteract(): void {
    if (!this.isEnabled) return;
    const now = Date.now();
    if (now - this.lastInteractTime < 250) {
      return;
    }
    this.lastInteractTime = now;
    this.onInteractCallback();
  }

  // ==========================================================================
  // PUBLIC CONTROLLER API
  // ==========================================================================

  /**
   * Updates the action button visual state based on whether the player is in range of an active beacon.
   */
  public setDepartmentInRange(inRange: boolean, deptName?: string): void {
    this.isInRange = inRange;
    if (inRange) {
      this.actionBtn.classList.add('in-range');
      this.actionIcon.textContent = '💬';
      this.actionLabel.textContent = 'CONSULT [E]';
      this.actionHint.textContent = deptName ? deptName.toUpperCase() : 'IN RANGE';
    } else {
      this.actionBtn.classList.remove('in-range');
      this.actionIcon.textContent = '⚡';
      this.actionLabel.textContent = 'ACT [E]';
      this.actionHint.textContent = 'EXPLORE';
    }
  }

  /**
   * Enables or disables touch controls (e.g. while modal dialogs are open).
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.resetJoystick();
      this.rootEl.classList.add('disabled');
    } else {
      this.rootEl.classList.remove('disabled');
    }
  }

  /**
   * Programmatically controls visibility of the mobile control layer.
   */
  public setVisible(visible: boolean): void {
    if (visible) {
      this.rootEl.classList.remove('hidden');
    } else {
      this.resetJoystick();
      this.rootEl.classList.add('hidden');
    }
  }

  /**
   * Returns current normalized movement vector.
   */
  public getVector(): { dx: number; dy: number } {
    return { dx: this.currentDx, dy: this.currentDy };
  }

  /**
   * Evaluates the current active 8-directional classification.
   */
  public getEightDirection(): EightDirection {
    const { dx, dy } = this.getVector();
    const length = Math.hypot(dx, dy);
    if (length < 0.15) {
      return 'CENTER';
    }

    // Screen coordinates: positive dy is DOWN, negative dy is UP
    const deg = Math.atan2(dy, dx) * (180 / Math.PI);

    if (deg >= -22.5 && deg < 22.5) {
      return 'RIGHT';
    }
    if (deg >= 22.5 && deg < 67.5) {
      return 'DOWN_RIGHT';
    }
    if (deg >= 67.5 && deg < 112.5) {
      return 'DOWN';
    }
    if (deg >= 112.5 && deg < 157.5) {
      return 'DOWN_LEFT';
    }
    if (deg >= 157.5 || deg < -157.5) {
      return 'LEFT';
    }
    if (deg >= -157.5 && deg < -112.5) {
      return 'UP_LEFT';
    }
    if (deg >= -112.5 && deg < -67.5) {
      return 'UP';
    }
    if (deg >= -67.5 && deg < -22.5) {
      return 'UP_RIGHT';
    }

    return 'CENTER';
  }

  public getIsActive(): boolean {
    return this.activeJoystickPointerId !== null;
  }

  public getIsInRange(): boolean {
    return this.isInRange;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public getElements(): {
    root: HTMLElement;
    base: HTMLElement;
    thumb: HTMLElement;
    actionBtn: HTMLButtonElement;
  } {
    return {
      root: this.rootEl,
      base: this.baseEl,
      thumb: this.thumbEl,
      actionBtn: this.actionBtn,
    };
  }

  /**
   * Cleanly unregisters event listeners and removes DOM elements.
   */
  public destroy(): void {
    this.resetJoystick();

    this.baseEl.removeEventListener('pointerdown', this.boundPointerDown);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointercancel', this.boundPointerCancel);

    this.actionBtn.removeEventListener('pointerdown', this.boundActionDown);
    this.actionBtn.removeEventListener('pointerup', this.boundActionUp);
    this.actionBtn.removeEventListener('pointercancel', this.boundActionUp);
    this.actionBtn.removeEventListener('click', this.boundActionClick);

    this.rootEl.remove();
  }
}
