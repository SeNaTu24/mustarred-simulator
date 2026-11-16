import Phaser from 'phaser';
import {
  isEditableElement,
  isTextInputFocused,
  isModifierActive,
  shouldIgnoreGameInput,
} from './keyboardIsolation.ts';
import type { OfficeOutcome, OfficeTone } from '../incidents/outcomeTypes.ts';

/**
 * Keyboard keys used for 8-directional movement.
 */
interface MovementKeys {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
}

export type DepartmentKey = 'IT' | 'HR' | 'FINANCE' | 'LEGAL';

/**
 * Department interaction coordinates where active beacons and prompts appear.
 */
export const DEPARTMENT_POINTS: Record<DepartmentKey, { readonly x: number; readonly y: number }> = {
  IT: { x: 440, y: 250 }, // IT Security Ops Console (Maya Lin)
  HR: { x: 1380, y: 330 }, // HR Workstation Desk (Elena Rostova)
  FINANCE: { x: 800, y: 850 }, // Grand Executive Oak Desk (David Vance & Tom Bradley)
  LEGAL: { x: 1360, y: 850 }, // Legal & Regulatory Compliance Desk (Rachel Sterling)
};

/**
 * Top-down 2D office environment featuring three distinct departments:
 * IT (Infrastructure/Security), Human Resources (People/Talent), and Finance (Capital/Treasury).
 */
export class OfficeScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerTag!: Phaser.GameObjects.Text;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: MovementKeys;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  // Department beacon objects
  private beaconCircle!: Phaser.GameObjects.Arc;
  private beaconTag!: Phaser.GameObjects.Text;
  private activeDepartment: DepartmentKey | null = null;
  private isPlayerInRange: boolean = false;
  private isMovementLocked: boolean = false;
  private isModifierHeld: boolean = false;

  // Mobile virtual touch movement vector [-1, 1]
  private virtualDx: number = 0;
  private virtualDy: number = 0;

  // Animated department notification system
  private notificationContainer!: Phaser.GameObjects.Container;
  private notificationBadge!: Phaser.GameObjects.Text;
  private notificationRadar1!: Phaser.GameObjects.Arc;
  private notificationRadar2!: Phaser.GameObjects.Arc;
  private isDepartmentResolved: boolean = false;
  private serverLeds: Phaser.GameObjects.Rectangle[] = [];

  // The AP analyst at the centre of the phishing incident, so the office can
  // reflect what happened to his account after the response is authorised.
  private tomTag?: Phaser.GameObjects.Text;
  private tomBody?: Phaser.GameObjects.Rectangle;

  // Emergency collapse visual objects
  private emergencyOverlay!: Phaser.GameObjects.Rectangle;
  private emergencyTween?: Phaser.Tweens.Tween;
  private isEmergencyActive: boolean = false;

  // External integration callbacks
  public onProximityEnter?: (dept: DepartmentKey) => void;
  public onProximityExit?: () => void;
  public onInteract?: (dept: DepartmentKey) => void;

  /** Player movement speed in pixels per second */
  private readonly playerSpeed: number = 220;

  /** Interaction trigger radius in pixels */
  private readonly interactionRadius: number = 95;

  /** Dimensions of the office world */
  public static readonly WORLD_WIDTH: number = 1600;
  public static readonly WORLD_HEIGHT: number = 1200;

  constructor() {
    super({ key: 'OfficeScene' });
  }

  public create(): void {
    // 1. Configure world physics boundaries
    this.physics.world.setBounds(0, 0, OfficeScene.WORLD_WIDTH, OfficeScene.WORLD_HEIGHT);

    // 2. Initialize obstacle static physics group
    this.obstacles = this.physics.add.staticGroup();

    // 3. Render floor foundations, grid, and department zones
    this.buildFloors();

    // 4. Build perimeter and interior partition walls
    this.buildWalls();

    // 5. Place office furniture (desks, server racks, tables, plants)
    this.buildFurniture();

    // 6. Refresh static obstacle physics bodies to guarantee accurate quadtree collision
    this.obstacles.refresh();

    // 7. Spawn department beacon indicator
    this.buildBeacons();

    // 7b. Spawn departmental heads at their dedicated office locations
    this.spawnDepartmentHeads();

    // 8. Spawn player avatar in the main lobby
    this.spawnPlayer(800, 420);

    // 9. Register collisions between dynamic player and static obstacles
    this.physics.add.collider(this.player, this.obstacles);

    // 10. Configure smooth camera tracking within world boundaries
    this.cameras.main.setBounds(0, 0, OfficeScene.WORLD_WIDTH, OfficeScene.WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.0);

    // 11. Register keyboard input listeners (WASD, Arrows, E, Space)
    this.setupInput();

    // 12. Add in-world controls & title overlay
    this.buildWorldLabels();

    // 13. Create full-screen emergency overlay for company collapse
    this.buildEmergencyEffects();

    // 14. Synchronize beacon with initially active department if already set
    this.refreshBeaconDisplay();

    // 15. Start environmental animations (server rack LED blinking)
    this.time.addEvent({
      delay: 240,
      loop: true,
      callback: () => {
        const colors = [0x22c55e, 0x38bdf8, 0xf59e0b, 0x10b981];
        for (const led of this.serverLeds) {
          led.setFillStyle(colors[Math.floor(Math.random() * colors.length)]);
        }
      },
    });
  }

  public override update(): void {
    if (!this.player || !this.player.body) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Halt all movement when input is locked by an open dialog, text editing, modifier keys, or emergency state
    if (this.isMovementLocked || this.isTextInputFocused() || this.isModifierHeld) {
      body.setVelocity(0, 0);
      return;
    }

    let dx = 0;
    let dy = 0;

    // Horizontal movement: A / Left Arrow / D / Right Arrow
    if (this.cursors.left.isDown || this.wasd.a.isDown) {
      dx -= 1;
    }
    if (this.cursors.right.isDown || this.wasd.d.isDown) {
      dx += 1;
    }

    // Vertical movement: W / Up Arrow / S / Down Arrow
    if (this.cursors.up.isDown || this.wasd.w.isDown) {
      dy -= 1;
    }
    if (this.cursors.down.isDown || this.wasd.s.isDown) {
      dy += 1;
    }

    // Combine with virtual movement input from mobile joystick
    dx += this.virtualDx;
    dy += this.virtualDy;

    // Normalize diagonal movement vector so diagonal travel matches linear speed
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      const scale = length > 1 ? 1 / length : 1;
      const vx = dx * scale * this.playerSpeed;
      const vy = dy * scale * this.playerSpeed;
      body.setVelocity(vx, vy);
    } else {
      body.setVelocity(0, 0);
    }

    // Keep the overhead label anchored to the player avatar
    if (this.playerTag) {
      this.playerTag.setPosition(this.player.x, this.player.y - 26);
    }

    // Check proximity to the currently active department terminal
    this.checkDepartmentProximity();
  }

  // ==========================================================================
  // PUBLIC INTEGRATION METHODS
  // ==========================================================================

  /**
   * Sets which department is currently active and awaiting a decision.
   * Repositions and activates the visual beacon.
   */
  public setActiveDepartment(dept: DepartmentKey | null): void {
    this.activeDepartment = dept;
    this.refreshBeaconDisplay();
  }

  /**
   * Freezes or unfreezes player movement (e.g. while a decision modal is open).
   */
  public setMovementLocked(locked: boolean): void {
    this.isMovementLocked = locked;
    if (locked) {
      this.virtualDx = 0;
      this.virtualDy = 0;
      if (this.player?.body) {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      if (this.input?.keyboard) {
        this.input.keyboard.resetKeys();
      }
      return;
    }

    // Handing control back to the player always restores the keyboard. Panels can
    // be torn down while their text field still holds focus, in which case no
    // focusout event arrives and the scene would stay unable to move.
    if (!this.isTextInputFocused() && this.input?.keyboard) {
      this.input.keyboard.enabled = true;
      if (this.input.keyboard.manager) {
        this.input.keyboard.manager.enabled = true;
      }
      this.input.keyboard.resetKeys();
    }
  }

  /**
   * Sets the virtual movement vector [-1, 1] from mobile controls.
   */
  public setVirtualMovement(dx: number, dy: number): void {
    this.virtualDx = dx;
    this.virtualDy = dy;
  }

  /**
   * Returns current virtual movement vector.
   */
  public getVirtualMovement(): { dx: number; dy: number } {
    return { dx: this.virtualDx, dy: this.virtualDy };
  }

  /**
   * Triggers the player's interaction with the nearby active department,
   * identical to pressing [E] or [Space].
   */
  public triggerInteractionAction(): boolean {
    if (this.isMovementLocked || this.isTextInputFocused() || this.isModifierHeld) {
      return false;
    }
    if (this.activeDepartment && this.isPlayerInRange) {
      this.triggerInteractionAnimation(this.activeDepartment, () => {
        this.onInteract?.(this.activeDepartment!);
      });
      return true;
    }
    return false;
  }

  /**
   * Checks whether the player is currently within interaction range of the active department.
   */
  public getIsPlayerInRange(): boolean {
    return this.isPlayerInRange;
  }

  /**
   * Checks whether player movement is currently locked.
   */
  public getIsMovementLocked(): boolean {
    return this.isMovementLocked;
  }

  /**
   * Triggers the dramatic red emergency state when company collapse occurs.
   */
  public triggerEmergencyAlert(): void {
    if (this.isEmergencyActive) {
      return;
    }
    this.isEmergencyActive = true;
    this.setMovementLocked(true);

    // Screen shake
    this.cameras.main.shake(600, 0.012);

    // Pulsing emergency red wash
    if (this.emergencyOverlay) {
      this.emergencyOverlay.setVisible(true);
      if (this.emergencyTween) {
        this.emergencyTween.stop();
      }
      this.emergencyTween = this.tweens.add({
        targets: this.emergencyOverlay,
        fillAlpha: { from: 0.15, to: 0.45 },
        duration: 550,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Emergency beacon styling
    if (this.beaconCircle && this.beaconTag) {
      this.beaconCircle.setFillStyle(0xef4444, 0.45);
      this.beaconCircle.setStrokeStyle(3, 0xff0000, 1.0);
      this.beaconTag.setText('🚨 EMERGENCY EVACUATION');
      this.beaconTag.setBackgroundColor('#ef4444f0');
      this.beaconCircle.setVisible(true);
      this.beaconTag.setVisible(true);
    }
  }

  /**
   * Resets the emergency visual alert state upon simulation restart.
   */
  public resetEmergencyAlert(): void {
    this.isEmergencyActive = false;
    if (this.emergencyTween) {
      this.emergencyTween.stop();
      this.emergencyTween = undefined;
    }
    if (this.emergencyOverlay) {
      this.emergencyOverlay.setFillStyle(0xef4444, 0);
      this.emergencyOverlay.setVisible(false);
    }
  }

  /**
   * Resets player position to the main lobby (used on simulation restart).
   */
  public resetPlayerPosition(): void {
    if (this.player && this.player.body) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.reset(800, 420);
      body.setVelocity(0, 0);
      if (this.playerTag) {
        this.playerTag.setPosition(800, 394);
      }
    }
    this.resetEmergencyAlert();
    this.isMovementLocked = false;
    this.isPlayerInRange = false;
  }

  // ==========================================================================
  // PROXIMITY & BEACONS
  // ==========================================================================

  private buildBeacons(): void {
    // Pulsing glowing ring
    this.beaconCircle = this.add.circle(0, 0, 48, 0x38bdf8, 0.25);
    this.beaconCircle.setStrokeStyle(2, 0x38bdf8, 0.85);
    this.beaconCircle.setDepth(5);
    this.beaconCircle.setVisible(false);

    // Floating indicator tag
    this.beaconTag = this.add.text(0, 0, '⚠️ ACTIVE INCIDENT', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#0284c7e6',
      padding: { x: 7, y: 3 },
    });
    this.beaconTag.setOrigin(0.5, 0.5);
    this.beaconTag.setDepth(6);
    this.beaconTag.setVisible(false);

    // Continuous pulse tween
    this.tweens.add({
      targets: this.beaconCircle,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0.1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // --- ANIMATED OVERHEAD NOTIFICATION SYSTEM ---
    this.notificationContainer = this.add.container(0, 0);
    this.notificationContainer.setDepth(25);
    this.notificationContainer.setVisible(false);

    // Expanding radar ping 1
    this.notificationRadar1 = this.add.circle(0, 0, 24, 0xef4444, 0.35);
    this.notificationRadar1.setStrokeStyle(2, 0xf87171, 0.9);

    // Expanding radar ping 2 (delayed)
    this.notificationRadar2 = this.add.circle(0, 0, 24, 0xef4444, 0.25);
    this.notificationRadar2.setStrokeStyle(1.5, 0xfca5a5, 0.8);

    // High-visibility animated overhead badge
    this.notificationBadge = this.add.text(0, -32, '🚨 PHISHING ALERT — Maya Lin [E/Space]', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#dc2626f0',
      padding: { x: 10, y: 5 },
    });
    this.notificationBadge.setOrigin(0.5, 0.5);
    this.notificationBadge.setStroke('#450a0a', 2);

    this.notificationContainer.add([
      this.notificationRadar1,
      this.notificationRadar2,
      this.notificationBadge,
    ]);

    // Continuous radar wave expansion
    this.tweens.add({
      targets: this.notificationRadar1,
      scaleX: 3.2,
      scaleY: 3.2,
      alpha: 0,
      duration: 1200,
      repeat: -1,
      ease: 'Cubic.easeOut',
    });

    this.tweens.add({
      targets: this.notificationRadar2,
      scaleX: 3.2,
      scaleY: 3.2,
      alpha: 0,
      duration: 1200,
      delay: 600,
      repeat: -1,
      ease: 'Cubic.easeOut',
    });

    // Vertical floating sine-wave bobbing
    this.tweens.add({
      targets: this.notificationContainer,
      y: '-=8',
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Updates department notification to a calm resolved state once incident decision is finalized.
   */
  public setDepartmentResolved(dept: DepartmentKey, label: string = 'Incident Contained'): void {
    this.isDepartmentResolved = true;
    if (this.notificationContainer && this.notificationBadge) {
      const point = DEPARTMENT_POINTS[dept];
      this.notificationContainer.setPosition(point.x, point.y - 15);
      this.notificationBadge.setText(`✅ ${dept}: ${label}`);
      this.notificationBadge.setBackgroundColor('#059669f0');
      this.notificationRadar1.setVisible(false);
      this.notificationRadar2.setVisible(false);
      this.notificationContainer.setVisible(true);
    }
  }

  /**
   * Applies a resolved incident's aftermath to the office: the department marker,
   * the AP analyst's visible status, and a camera jolt when the outcome is bad.
   *
   * Deliberately not built on setDepartmentResolved, so a compromised or ignored
   * incident never shows the green "contained" treatment.
   */
  public applyIncidentOutcome(outcome: OfficeOutcome): void {
    const palette: Record<
      OfficeTone,
      {
        badgePrefix: string;
        badgeBg: string;
        beacon: number;
        beaconLabel: string;
        tomLabel: string;
        tomColor: string;
        tomBg: string;
        tomFill: number;
      }
    > = {
      contained: {
        badgePrefix: '✅ IT: ',
        badgeBg: '#059669f0',
        beacon: 0x34d399,
        beaconLabel: '✅ Incident closed',
        tomLabel: '💼 Tom Bradley (AP) — signed out, talking to HR',
        tomColor: '#6ee7b7',
        tomBg: '#06281eee',
        tomFill: 0x15803d,
      },
      recovering: {
        badgePrefix: '🟡 IT: ',
        badgeBg: '#b45309f0',
        beacon: 0xfbbf24,
        beaconLabel: '🟡 Contained — working the fallout',
        tomLabel: '💼 Tom Bradley (AP) — working from paper',
        tomColor: '#fde68a',
        tomBg: '#241808ee',
        tomFill: 0xb45309,
      },
      compromised: {
        badgePrefix: '🚨 IT: ',
        badgeBg: '#dc2626f0',
        beacon: 0xef4444,
        beaconLabel: '🚨 Breach confirmed',
        tomLabel: '⚠️ Tom Bradley (AP) — account exposed',
        tomColor: '#fca5a5',
        tomBg: '#450a0aee',
        tomFill: 0x991b1b,
      },
      negligent: {
        badgePrefix: '⚠️ IT: ',
        badgeBg: '#991b1bf0',
        beacon: 0xef4444,
        beaconLabel: '⚠️ Session left open',
        tomLabel: '⚠️ Tom Bradley (AP) — still signed in',
        tomColor: '#fca5a5',
        tomBg: '#450a0aee',
        tomFill: 0x7f1d1d,
      },
    };

    const style = palette[outcome.tone];
    this.isDepartmentResolved = true;

    if (this.notificationContainer && this.notificationBadge) {
      const point = DEPARTMENT_POINTS.IT;
      this.notificationContainer.setPosition(point.x, point.y - 96);
      this.notificationBadge.setText(`${style.badgePrefix}${outcome.label}`);
      this.notificationBadge.setBackgroundColor(style.badgeBg);
      this.notificationRadar1.setVisible(false);
      this.notificationRadar2.setVisible(false);
      this.notificationContainer.setVisible(true);
    }

    // The department marker carries the outcome; the "briefing waiting" beacon
    // and its key prompt are retired because there is nothing left to consult.
    if (this.beaconCircle && this.beaconTag) {
      this.beaconCircle.setFillStyle(style.beacon, 0.22);
      this.beaconCircle.setStrokeStyle(2, style.beacon, 0.85);
      this.beaconTag.setText(style.beaconLabel);
      this.beaconTag.setBackgroundColor(style.badgeBg);
      this.beaconTag.setVisible(false);
    }

    if (this.tomTag) {
      this.tomTag.setText(style.tomLabel);
      this.tomTag.setColor(style.tomColor);
      this.tomTag.setBackgroundColor(style.tomBg);
    }
    this.tomBody?.setFillStyle(style.tomFill);

    if (outcome.tone === 'compromised' || outcome.tone === 'negligent') {
      this.cameras.main.shake(320, 0.007);
    }
  }

  /**
   * Plays a brief tactical radar pulse/chime visual effect upon player interaction.
   */
  public triggerInteractionAnimation(dept: DepartmentKey, onComplete?: () => void): void {
    const point = DEPARTMENT_POINTS[dept];
    const wave = this.add.circle(point.x, point.y, 16, 0x38bdf8, 0.7);
    wave.setStrokeStyle(3, 0xffffff, 1);
    wave.setDepth(30);

    this.tweens.add({
      targets: wave,
      scaleX: 4.5,
      scaleY: 4.5,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        wave.destroy();
        onComplete?.();
      },
    });
  }

  private buildEmergencyEffects(): void {
    this.emergencyOverlay = this.add.rectangle(
      800,
      600,
      OfficeScene.WORLD_WIDTH * 2,
      OfficeScene.WORLD_HEIGHT * 2,
      0xef4444,
      0
    );
    this.emergencyOverlay.setDepth(999);
    this.emergencyOverlay.setScrollFactor(0);
    this.emergencyOverlay.setVisible(false);
  }

  private refreshBeaconDisplay(): void {
    if (!this.beaconCircle || !this.beaconTag || !this.notificationContainer) {
      return;
    }

    if (this.isEmergencyActive) {
      return;
    }

    if (!this.activeDepartment) {
      this.beaconCircle.setVisible(false);
      this.beaconTag.setVisible(false);
      if (!this.isDepartmentResolved) {
        this.notificationContainer.setVisible(false);
      }
      return;
    }

    const point = DEPARTMENT_POINTS[this.activeDepartment];
    this.beaconCircle.setPosition(point.x, point.y);
    this.beaconTag.setPosition(point.x, point.y - 58);
    this.beaconTag.setText('💬 Briefing Waiting [E / Space]');

    // Position overhead notification container
    this.notificationContainer.setPosition(point.x, point.y - 20);

    if (this.activeDepartment === 'IT') {
      this.beaconCircle.setFillStyle(0x38bdf8, 0.25);
      this.beaconCircle.setStrokeStyle(2, 0x38bdf8, 0.9);
      this.beaconTag.setBackgroundColor('#0284c7e6');
      if (!this.isDepartmentResolved) {
        this.notificationBadge.setText('🚨 PHISHING ALERT — Maya Lin [E/Space]');
        this.notificationBadge.setBackgroundColor('#dc2626f0');
        this.notificationRadar1.setVisible(true);
        this.notificationRadar2.setVisible(true);
        this.notificationContainer.setVisible(true);
      }
    } else if (this.activeDepartment === 'HR') {
      this.beaconCircle.setFillStyle(0x34d399, 0.25);
      this.beaconCircle.setStrokeStyle(2, 0x34d399, 0.9);
      this.beaconTag.setBackgroundColor('#059669e6');
    } else if (this.activeDepartment === 'FINANCE') {
      this.beaconCircle.setFillStyle(0xfbbf24, 0.25);
      this.beaconCircle.setStrokeStyle(2, 0xfbbf24, 0.9);
      this.beaconTag.setBackgroundColor('#d97706e6');
    } else if (this.activeDepartment === 'LEGAL') {
      this.beaconCircle.setFillStyle(0x818cf8, 0.25);
      this.beaconCircle.setStrokeStyle(2, 0x818cf8, 0.9);
      this.beaconTag.setBackgroundColor('#4338cae6');
    }

    this.beaconCircle.setVisible(true);
    this.beaconTag.setVisible(true);
  }

  private checkDepartmentProximity(): void {
    if (!this.activeDepartment || this.isEmergencyActive) {
      if (this.isPlayerInRange) {
        this.isPlayerInRange = false;
        this.onProximityExit?.();
      }
      return;
    }

    const target = DEPARTMENT_POINTS[this.activeDepartment];
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    const inRange = dist <= this.interactionRadius;

    if (inRange && !this.isPlayerInRange) {
      this.isPlayerInRange = true;
      this.onProximityEnter?.(this.activeDepartment);
    } else if (!inRange && this.isPlayerInRange) {
      this.isPlayerInRange = false;
      this.onProximityExit?.();
    }

    // Trigger decision interaction on E or Space keypress
    if (inRange && !this.isMovementLocked && !this.isTextInputFocused()) {
      if (
        Phaser.Input.Keyboard.JustDown(this.keyE) ||
        Phaser.Input.Keyboard.JustDown(this.keySpace)
      ) {
        this.triggerInteractionAnimation(this.activeDepartment, () => {
          this.onInteract?.(this.activeDepartment!);
        });
      }
    }
  }

  /**
   * Checks whether an element is an editable text element (input, textarea, or contenteditable).
   */
  public isEditableElement(element: unknown): boolean {
    return isEditableElement(element);
  }

  /**
   * Checks whether a text input, textarea, or content-editable field is currently focused.
   */
  public isTextInputFocused(): boolean {
    return isTextInputFocused();
  }

  /**
   * Checks whether a system modifier key (Ctrl, Meta/Cmd, Alt) is pressed.
   */
  public isModifierActive(e?: KeyboardEvent): boolean {
    return isModifierActive(e);
  }

  // ==========================================================================
  // ENVIRONMENT BUILDERS
  // ==========================================================================

  /**
   * Builds the floor layout, subtle carpet grid, and the three department zones.
   */
  private buildFloors(): void {
    const gfx = this.add.graphics();

    // Base background floor (slate)
    gfx.fillStyle(0x0f172a, 1.0);
    gfx.fillRect(0, 0, OfficeScene.WORLD_WIDTH, OfficeScene.WORLD_HEIGHT);

    // Subtle carpet grid lines (40px tiles)
    gfx.lineStyle(1, 0x1e293b, 0.35);
    for (let x = 40; x < OfficeScene.WORLD_WIDTH; x += 40) {
      gfx.moveTo(x, 0);
      gfx.lineTo(x, OfficeScene.WORLD_HEIGHT);
    }
    for (let y = 40; y < OfficeScene.WORLD_HEIGHT; y += 40) {
      gfx.moveTo(0, y);
      gfx.lineTo(OfficeScene.WORLD_WIDTH, y);
    }
    gfx.strokePath();

    // Main Lobby floor accent (slate-800)
    gfx.fillStyle(0x1e293b, 0.85);
    gfx.fillRect(560, 100, 480, 580);

    // Decorative lobby floor rug
    gfx.fillStyle(0x334155, 0.6);
    gfx.fillRoundedRect(680, 320, 240, 200, 12);
    gfx.lineStyle(2, 0x64748b, 0.7);
    gfx.strokeRoundedRect(680, 320, 240, 200, 12);

    // --- Department Zones ---

    // 1. IT Department (Northwest: x: 60..540, y: 60..480)
    gfx.fillStyle(0x0c1e33, 0.95);
    gfx.fillRoundedRect(60, 60, 480, 420, 16);
    gfx.lineStyle(3, 0x0284c7, 0.9);
    gfx.strokeRoundedRect(60, 60, 480, 420, 16);

    // 2. Human Resources (Northeast: x: 1060..1540, y: 60..480)
    gfx.fillStyle(0x06281e, 0.95);
    gfx.fillRoundedRect(1060, 60, 480, 420, 16);
    gfx.lineStyle(3, 0x10b981, 0.9);
    gfx.strokeRoundedRect(1060, 60, 480, 420, 16);

    // 3. Finance Department (Southwest: x: 440..1140, y: 700..1140)
    gfx.fillStyle(0x241808, 0.95);
    gfx.fillRoundedRect(440, 700, 700, 440, 16);
    gfx.lineStyle(3, 0xf59e0b, 0.9);
    gfx.strokeRoundedRect(440, 700, 700, 440, 16);

    // 4. Legal & Regulatory Compliance (Southeast: x: 1180..1540, y: 700..1140)
    gfx.fillStyle(0x0f172a, 0.95);
    gfx.fillRoundedRect(1180, 700, 360, 440, 16);
    gfx.lineStyle(3, 0x818cf8, 0.9);
    gfx.strokeRoundedRect(1180, 700, 360, 440, 16);
  }

  /**
   * Builds the perimeter walls and internal partition walls.
   */
  private buildWalls(): void {
    const wallColor = 0x1e293b;
    const strokeColor = 0x475569;

    // Perimeter boundary walls
    this.createObstacle(800, 12, OfficeScene.WORLD_WIDTH, 24, wallColor, strokeColor);
    this.createObstacle(800, 1188, OfficeScene.WORLD_WIDTH, 24, wallColor, strokeColor);
    this.createObstacle(12, 600, 24, OfficeScene.WORLD_HEIGHT, wallColor, strokeColor);
    this.createObstacle(1588, 600, 24, OfficeScene.WORLD_HEIGHT, wallColor, strokeColor);

    // Interior partitions:
    // IT East Wall (x=550) with 140px doorway between y=200..340
    this.createObstacle(550, 110, 20, 180, wallColor, strokeColor);
    this.createObstacle(550, 420, 20, 160, wallColor, strokeColor);
    // IT South Wall (y=490)
    this.createObstacle(280, 490, 520, 20, wallColor, strokeColor);

    // HR West Wall (x=1050) with 140px doorway between y=200..340
    this.createObstacle(1050, 110, 20, 180, wallColor, strokeColor);
    this.createObstacle(1050, 420, 20, 160, wallColor, strokeColor);
    // HR South Wall (y=490)
    this.createObstacle(1320, 490, 520, 20, wallColor, strokeColor);

    // Finance North Wall (y=690) with grand 200px doorway between x=700..900
    this.createObstacle(230, 690, 420, 20, wallColor, strokeColor);
    this.createObstacle(570, 690, 260, 20, wallColor, strokeColor);
    this.createObstacle(1030, 690, 260, 20, wallColor, strokeColor);

    // Legal North Wall (y=690) and West Partition Wall (x=1170) with 140px entryway
    this.createObstacle(1360, 690, 360, 20, wallColor, strokeColor);
    this.createObstacle(1170, 760, 20, 120, wallColor, strokeColor);
    this.createObstacle(1170, 1060, 20, 140, wallColor, strokeColor);
  }

  /**
   * Places identifiable desks, server racks, meeting furniture, and plants.
   */
  private buildFurniture(): void {
    // --- IT Department Furniture ---
    this.createObstacle(110, 140, 44, 70, 0x0f172a, 0x0284c7, 2);
    this.createObstacle(110, 230, 44, 70, 0x0f172a, 0x0284c7, 2);
    this.createObstacle(110, 320, 44, 70, 0x0f172a, 0x0284c7, 2);

    // Server rack status LEDs with dynamic blinking
    this.serverLeds = [];
    const ledCoords = [
      { x: 100, y: 125 }, { x: 115, y: 125 },
      { x: 100, y: 215 }, { x: 115, y: 215 },
      { x: 100, y: 305 }, { x: 115, y: 305 },
    ];
    for (const pos of ledCoords) {
      const led = this.add.rectangle(pos.x, pos.y, 5, 5, 0x22c55e);
      led.setDepth(6);
      this.serverLeds.push(led);
    }

    // IT Workstations (Desks with monitors)
    this.createObstacle(280, 180, 120, 50, 0x1e293b, 0x38bdf8);
    this.createObstacle(280, 320, 120, 50, 0x1e293b, 0x38bdf8);
    this.add.rectangle(260, 180, 26, 12, 0x0284c7).setStrokeStyle(1, 0xffffff);
    this.add.rectangle(300, 180, 26, 12, 0x0284c7).setStrokeStyle(1, 0xffffff);
    this.add.rectangle(260, 320, 26, 12, 0x0284c7).setStrokeStyle(1, 0xffffff);
    this.add.rectangle(300, 320, 26, 12, 0x0284c7).setStrokeStyle(1, 0xffffff);

    // IT Central Ops Console (Interaction Terminal)
    this.createObstacle(440, 250, 60, 60, 0x0f172a, 0x38bdf8, 2);
    this.add.rectangle(440, 250, 36, 36, 0x0369a1);

    // --- Human Resources Furniture ---
    // Meeting Lounge Sofa & Table
    this.createObstacle(1220, 160, 140, 44, 0x064e3b, 0x10b981, 2);
    this.createObstacle(1220, 240, 80, 50, 0x1f2937, 0x10b981);

    // HR Workstation (Interaction Desk)
    this.createObstacle(1380, 330, 120, 50, 0x1e293b, 0x10b981);
    this.add.rectangle(1380, 330, 30, 16, 0x10b981).setStrokeStyle(1, 0xffffff);

    // Water Cooler & Potted Office Plants
    this.createObstacle(1470, 150, 32, 32, 0xe2e8f0, 0x38bdf8);
    this.add.circle(1470, 150, 10, 0x38bdf8);
    this.createObstacle(1095, 140, 30, 30, 0x78350f, 0x22c55e);
    this.add.circle(1095, 140, 11, 0x22c55e);
    this.createObstacle(1470, 420, 30, 30, 0x78350f, 0x22c55e);
    this.add.circle(1470, 420, 11, 0x22c55e);

    // --- Finance Department Furniture ---
    // Grand Executive Oak Desk (Interaction Point)
    this.createObstacle(800, 850, 180, 60, 0x78350f, 0xf59e0b, 2);
    this.add.rectangle(800, 850, 40, 16, 0xfbbf24).setStrokeStyle(1, 0xffffff);

    // Filing Cabinets & Treasury Safe
    this.createObstacle(540, 800, 46, 80, 0x334155, 0x94a3b8);
    this.createObstacle(540, 920, 46, 80, 0x334155, 0x94a3b8);
    this.createObstacle(1060, 810, 64, 64, 0x0f172a, 0xf59e0b, 2);
    this.add.circle(1060, 810, 14, 0xf59e0b);

    // Financial Analyst Workstations (Tom Bradley at 680, 1030)
    this.createObstacle(680, 1030, 120, 50, 0x1e293b, 0xf59e0b);
    this.add.rectangle(680, 1030, 32, 14, 0xf59e0b).setStrokeStyle(1, 0xffffff);
    this.createObstacle(920, 1030, 120, 50, 0x1e293b, 0xf59e0b);
    this.add.rectangle(920, 1030, 32, 14, 0xf59e0b).setStrokeStyle(1, 0xffffff);

    // --- Legal & Compliance Furniture (Southeast) ---
    // Rachel Sterling Consultation Desk
    this.createObstacle(1360, 850, 160, 56, 0x1e1b4b, 0x818cf8, 2);
    this.add.rectangle(1360, 850, 36, 16, 0x6366f1).setStrokeStyle(1, 0xffffff);

    // Legal Archive Bookcases
    this.createObstacle(1500, 780, 40, 90, 0x0f172a, 0x64748b, 1);
    this.createObstacle(1500, 920, 40, 90, 0x0f172a, 0x64748b, 1);

    // Conference consultation table
    this.createObstacle(1240, 880, 70, 70, 0x1e293b, 0x818cf8, 1);
    this.createObstacle(1500, 1050, 30, 30, 0x78350f, 0x22c55e);
    this.add.circle(1500, 1050, 12, 0x22c55e);

    // --- Main Lobby Furniture ---
    this.createObstacle(800, 560, 140, 44, 0x1e293b, 0x64748b, 1);
    this.add.rectangle(800, 560, 30, 12, 0x94a3b8);
  }

  /**
   * Helper to create a static rectangular obstacle with physics body and visual stroke.
   */
  private createObstacle(
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number,
    strokeColor?: number,
    strokeWidth: number = 1
  ): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, width, height, fillColor);
    if (strokeColor !== undefined) {
      rect.setStrokeStyle(strokeWidth, strokeColor);
    }
    this.obstacles.add(rect);
    return rect;
  }

  /**
   * Spawns distinct, identifiable department heads at their designated desks.
   */
  private spawnDepartmentHeads(): void {
    const textStyle = {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      padding: { x: 6, y: 3 },
    };

    // 1. Maya Lin (Lead Security Engineer) at IT Console
    const mayaBody = this.add.rectangle(440, 210, 26, 26, 0x0284c7);
    mayaBody.setStrokeStyle(2, 0x38bdf8);
    mayaBody.setDepth(8);
    const mayaFace = this.add.rectangle(440, 206, 16, 6, 0x0f172a).setDepth(9);
    const mayaTag = this.add.text(440, 184, '💻 Maya Lin (IT Security Lead)', {
      ...textStyle,
      color: '#38bdf8',
      backgroundColor: '#0c1e33ee',
    });
    mayaTag.setOrigin(0.5, 0.5);
    mayaTag.setDepth(9);

    // 1b. Sarah Chen (VP of Engineering) at IT desk
    const sarahBody = this.add.rectangle(280, 140, 24, 24, 0x0369a1);
    sarahBody.setStrokeStyle(1.5, 0x38bdf8);
    sarahBody.setDepth(8);
    const sarahFace = this.add.rectangle(280, 137, 14, 5, 0x0f172a).setDepth(9);
    const sarahTag = this.add.text(280, 116, '🖥️ Sarah Chen (VP Eng)', {
      ...textStyle,
      color: '#7dd3fc',
      backgroundColor: '#0c1e33ee',
    });
    sarahTag.setOrigin(0.5, 0.5);
    sarahTag.setDepth(9);

    // 2. Elena Rostova (Head of HR) at HR Desk
    const elenaBody = this.add.rectangle(1380, 290, 26, 26, 0x10b981);
    elenaBody.setStrokeStyle(2, 0x34d399);
    elenaBody.setDepth(8);
    const elenaFace = this.add.rectangle(1380, 286, 14, 8, 0x064e3b).setDepth(9);
    const elenaTag = this.add.text(1380, 264, '👥 Elena Rostova (Head of HR)', {
      ...textStyle,
      color: '#34d399',
      backgroundColor: '#06281eee',
    });
    elenaTag.setOrigin(0.5, 0.5);
    elenaTag.setDepth(9);

    // 3. David Vance (Interim CFO) at Executive Finance Desk
    const davidBody = this.add.rectangle(800, 800, 26, 26, 0xf59e0b);
    davidBody.setStrokeStyle(2, 0xfbbf24);
    davidBody.setDepth(8);
    const davidFace = this.add.rectangle(800, 796, 14, 8, 0x78350f).setDepth(9);
    const davidTag = this.add.text(800, 774, '📊 David Vance (Interim CFO)', {
      ...textStyle,
      color: '#fbbf24',
      backgroundColor: '#241808ee',
    });
    davidTag.setOrigin(0.5, 0.5);
    davidTag.setDepth(9);

    // 3b. Tom Bradley (Senior AP Analyst) at Accounts Payable Workstation
    const tomBody = this.add.rectangle(680, 990, 24, 24, 0xb45309);
    tomBody.setStrokeStyle(1.5, 0xfbbf24);
    tomBody.setDepth(8);
    const tomFace = this.add.rectangle(680, 987, 14, 5, 0x451a03).setDepth(9);
    const tomTag = this.add.text(680, 966, '💼 Tom Bradley (AP Analyst)', {
      ...textStyle,
      color: '#fde68a',
      backgroundColor: '#241808ee',
    });
    tomTag.setOrigin(0.5, 0.5);
    tomTag.setDepth(9);
    this.tomTag = tomTag;
    this.tomBody = tomBody;

    // 4. Rachel Sterling (General Counsel) at Legal Desk
    const rachelBody = this.add.rectangle(1360, 810, 26, 26, 0x6366f1);
    rachelBody.setStrokeStyle(2, 0x818cf8);
    rachelBody.setDepth(8);
    const rachelFace = this.add.rectangle(1360, 806, 14, 8, 0x1e1b4b).setDepth(9);
    const rachelTag = this.add.text(1360, 784, '⚖️ Rachel Sterling (General Counsel)', {
      ...textStyle,
      color: '#a5b4fc',
      backgroundColor: '#1e1b4bee',
    });
    rachelTag.setOrigin(0.5, 0.5);
    rachelTag.setDepth(9);

    // Idle breathing / bobbing animation for all representatives
    const characters = [
      { body: mayaBody, face: mayaFace, tag: mayaTag, delay: 0 },
      { body: sarahBody, face: sarahFace, tag: sarahTag, delay: 200 },
      { body: elenaBody, face: elenaFace, tag: elenaTag, delay: 400 },
      { body: davidBody, face: davidFace, tag: davidTag, delay: 600 },
      { body: tomBody, face: tomFace, tag: tomTag, delay: 300 },
      { body: rachelBody, face: rachelFace, tag: rachelTag, delay: 500 },
    ];

    for (const char of characters) {
      this.tweens.add({
        targets: [char.body, char.face, char.tag],
        y: '-=3',
        duration: 1100,
        delay: char.delay,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /**
   * Spawns the player character with dynamic Arcade physics and overhead label.
   */
  private spawnPlayer(x: number, y: number): void {
    this.player = this.add.rectangle(x, y, 32, 32, 0x38bdf8);
    this.player.setStrokeStyle(2, 0xffffff);
    this.player.setDepth(10);

    const innerFace = this.add.rectangle(0, 0, 12, 12, 0x0284c7);
    innerFace.setStrokeStyle(1, 0xffffff);
    innerFace.setDepth(11);

    this.events.on('postupdate', () => {
      innerFace.setPosition(this.player.x, this.player.y);
    });

    this.physics.add.existing(this.player, false);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(30, 30);

    this.playerTag = this.add.text(x, y - 26, 'YOU (CEO)', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#f8fafc',
      backgroundColor: '#0f172acc',
      padding: { x: 5, y: 2 },
    });
    this.playerTag.setOrigin(0.5, 0.5);
    this.playerTag.setDepth(12);
  }

  /**
   * Sets up WASD, Cursor, and interaction key listeners without capturing keys globally.
   * Isolates Phaser keyboard handling so native clipboard shortcuts (Ctrl/Cmd+C, Ctrl/Cmd+V,
   * Ctrl/Cmd+X, Ctrl/Cmd+A) and editable text inputs remain completely uninhibited.
   */
  private setupInput(): void {
    if (!this.input.keyboard) {
      throw new Error('Keyboard plugin is not enabled');
    }

    // Register movement keys WITHOUT key capture so Phaser never intercepts normal browser keys
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    }, false) as Phaser.Types.Input.Keyboard.CursorKeys;

    this.wasd = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }, false) as MovementKeys;

    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false);

    // Disable all global captures so Space, Arrows, and Letters behave naturally in the browser
    this.input.keyboard.disableGlobalCapture();
    this.input.keyboard.clearCaptures();

    // Wrap Phaser KeyboardManager listeners to intercept modifier shortcuts & input fields
    const manager = this.input.keyboard.manager as (Phaser.Input.Keyboard.KeyboardManager & {
      target?: EventTarget;
      onKeyDown?: (event: KeyboardEvent) => void;
      onKeyUp?: (event: KeyboardEvent) => void;
    }) | undefined;

    if (manager && manager.target && typeof manager.onKeyDown === 'function' && typeof manager.onKeyUp === 'function') {
      const target = manager.target;
      const originalOnKeyDown = manager.onKeyDown;
      const originalOnKeyUp = manager.onKeyUp;

      // Detach Phaser's default raw window listeners
      target.removeEventListener('keydown', originalOnKeyDown as EventListener, false);
      target.removeEventListener('keyup', originalOnKeyUp as EventListener, false);

      // Wrapped keydown: drops modifier combinations and editable inputs before Phaser processes them
      const wrappedOnKeyDown = (event: KeyboardEvent) => {
        if (shouldIgnoreGameInput(event, () => this.isTextInputFocused())) {
          this.input.keyboard?.resetKeys();
          return;
        }

        originalOnKeyDown.call(manager, event);
      };

      // Wrapped keyup: drops modifier combinations and editable inputs before Phaser processes them
      const wrappedOnKeyUp = (event: KeyboardEvent) => {
        if (shouldIgnoreGameInput(event, () => this.isTextInputFocused())) {
          this.input.keyboard?.resetKeys();
          return;
        }

        originalOnKeyUp.call(manager, event);
      };

      manager.onKeyDown = wrappedOnKeyDown;
      manager.onKeyUp = wrappedOnKeyUp;

      target.addEventListener('keydown', wrappedOnKeyDown as EventListener, false);
      target.addEventListener('keyup', wrappedOnKeyUp as EventListener, false);

      this.events.once('shutdown', () => {
        target.removeEventListener('keydown', wrappedOnKeyDown as EventListener, false);
        target.removeEventListener('keyup', wrappedOnKeyUp as EventListener, false);
        manager.onKeyDown = originalOnKeyDown;
        manager.onKeyUp = originalOnKeyUp;
      });
    }

    // Monitor modifier key states to ensure player remains still during browser shortcuts
    const updateModifierState = (e: KeyboardEvent) => {
      this.isModifierHeld = !!(e.ctrlKey || e.metaKey || e.altKey);
      if (this.isModifierHeld && this.input.keyboard) {
        this.input.keyboard.resetKeys();
      }
    };

    const resetModifierState = () => {
      this.isModifierHeld = false;
      this.input.keyboard?.resetKeys();
    };

    // Automatically ignore Phaser gameplay shortcuts whenever a text input or textarea is focused
    const onFocusIn = (e: FocusEvent) => {
      if (this.isEditableElement(e.target)) {
        if (this.input.keyboard) {
          this.input.keyboard.enabled = false;
          if (this.input.keyboard.manager) {
            this.input.keyboard.manager.enabled = false;
          }
          this.input.keyboard.resetKeys();
        }
      }
    };

    // Restore gameplay controls when focus leaves the input field
    const onFocusOut = (e: FocusEvent) => {
      if (this.isEditableElement(e.target)) {
        setTimeout(() => {
          if (!this.isTextInputFocused()) {
            if (this.input?.keyboard) {
              this.input.keyboard.enabled = true;
              if (this.input.keyboard.manager) {
                this.input.keyboard.manager.enabled = true;
              }
            }
          }
        }, 0);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', updateModifierState, { capture: true, passive: true });
      window.addEventListener('keyup', updateModifierState, { capture: true, passive: true });
      window.addEventListener('blur', resetModifierState);
      window.addEventListener('focusin', onFocusIn);
      window.addEventListener('focusout', onFocusOut);

      this.events.once('shutdown', () => {
        window.removeEventListener('keydown', updateModifierState, { capture: true });
        window.removeEventListener('keyup', updateModifierState, { capture: true });
        window.removeEventListener('blur', resetModifierState);
        window.removeEventListener('focusin', onFocusIn);
        window.removeEventListener('focusout', onFocusOut);
      });
    }

    // Clicking the game canvas blurs any active text inputs and restores game controls
    this.input.on('pointerdown', () => {
      if (this.isTextInputFocused() && typeof document !== 'undefined') {
        (document.activeElement as HTMLElement)?.blur();
      }
    });
  }

  /**
   * Creates department titles, area subtitles, and corridor signage.
   */
  private buildWorldLabels(): void {
    const textStyle = {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    };

    // IT Department Label (Northwest)
    this.add.text(100, 80, '💻 IT DEPARTMENT', {
      ...textStyle,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#38bdf8',
    });
    this.add.text(100, 108, 'Infrastructure, Security & Cloud Operations', {
      ...textStyle,
      fontSize: '12px',
      color: '#94a3b8',
    });

    // Human Resources Label (Northeast)
    this.add.text(1100, 80, '👥 HUMAN RESOURCES', {
      ...textStyle,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#34d399',
    });
    this.add.text(1100, 108, 'People, Talent & Organizational Morale', {
      ...textStyle,
      fontSize: '12px',
      color: '#94a3b8',
    });

    // Finance Department Label (South)
    this.add.text(480, 720, '📊 FINANCE DEPARTMENT', {
      ...textStyle,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fbbf24',
    });
    this.add.text(480, 748, 'Treasury, Capital Runway & Accounts Payable', {
      ...textStyle,
      fontSize: '12px',
      color: '#94a3b8',
    });

    // Legal & Compliance Label (Southeast)
    this.add.text(1200, 720, '⚖️ LEGAL & COMPLIANCE', {
      ...textStyle,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#818cf8',
    });
    this.add.text(1200, 748, 'Governance, Contracts & Regulatory Duties', {
      ...textStyle,
      fontSize: '12px',
      color: '#94a3b8',
    });

    // Corridor Directional Signage
    this.add.text(800, 220, '← IT OPERATIONS    |    MAIN LOBBY    |    HUMAN RESOURCES →', {
      ...textStyle,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#64748b',
    }).setOrigin(0.5, 0.5);

    this.add.text(800, 640, '↓ FINANCE & TREASURY    |    LEGAL & REGULATORY →', {
      ...textStyle,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#64748b',
    }).setOrigin(0.5, 0.5);

    // Fixed Controls Pill (HUD instruction)
    const controlsText = this.add.text(16, 75, 'Move: [W][A][S][D] / Arrows  |  Interact: [E] or [Space]', {
      ...textStyle,
      fontSize: '11px',
      color: '#e2e8f0',
      backgroundColor: '#0f172ae6',
      padding: { x: 8, y: 5 },
    });
    controlsText.setScrollFactor(0);
    controlsText.setDepth(100);
  }
}
