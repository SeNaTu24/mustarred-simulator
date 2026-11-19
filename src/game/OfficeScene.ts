import Phaser from 'phaser';
import {
  isEditableElement,
  isTextInputFocused,
  isModifierActive,
  shouldIgnoreGameInput,
} from './keyboardIsolation.ts';
import type { OfficeOutcome, OfficeTone } from '../incidents/outcomeTypes.ts';
import { PLAYER, STAFF } from '../ui/staff.ts';
import amakaFrontUrl from '../assets/amaka_front.png';
import amakaRightUrl from '../assets/amaka_right.png';
import amakaBackUrl from '../assets/amaka_back.png';
import amakaLeftUrl from '../assets/amaka_left.png';
import itWorkstationUrl from '../assets/it-workstation.png';

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
 * Tunde Bello's movement routine states in the IT department.
 */
export type TundeRoutineState =
  | 'AT_HOME'
  | 'WALKING_TO_SECONDARY'
  | 'AT_SECONDARY'
  | 'WALKING_TO_HOME';

/**
 * Department interaction coordinates where active beacons and prompts appear.
 */
export const DEPARTMENT_POINTS: Record<DepartmentKey, { readonly x: number; readonly y: number }> = {
  IT: { x: 280, y: 332 }, // Illustrated IT Workstation (phishing incident)
  HR: { x: 1380, y: 330 }, // People desk (Ngozi Okafor)
  FINANCE: { x: 800, y: 850 }, // Finance desk (Chinedu Eze)
  LEGAL: { x: 1360, y: 850 }, // Legal desk (Funmi Adeyemi)
};

/**
 * Configuration options for rendering a clean cartoon-style human character.
 */
interface CartoonCharacterConfig {
  x: number;
  y: number;
  skinTone: number;
  hairStyle: 'bun' | 'fade' | 'crop' | 'gele' | 'parted' | 'glasses_crop' | 'ponytail';
  hairColor: number;
  torsoColor: number;
  trouserColor: number;
  accentType?: 'necklace' | 'lanyard' | 'pearls' | 'tie' | 'badge' | 'brooch';
  accentColor?: number;
  hasGlasses?: boolean;
  hasEarrings?: boolean;
  earringColor?: number;
  nameTag: string;
  tagColor: string;
  tagBg: string;
  tagBorder: string;
  depth?: number;
}

/**
 * Top-down 2D office environment featuring four distinct departments:
 * IT (Infrastructure/Security), Human Resources (People/Talent), Finance (Capital/Treasury),
 * and Legal & Compliance (Governance/Contracts).
 *
 * Rendered in a clean, modern, cartoon style inspired by Criminal Case.
 */
export class OfficeScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerVisuals!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private currentFacing: 'front' | 'right' | 'back' | 'left' = 'front';
  private lastMoveTime: number = 0;
  private playerTag!: Phaser.GameObjects.Text;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: MovementKeys;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  // Department beacon objects
  private beaconCircle!: Phaser.GameObjects.Arc;
  private beaconHalo1!: Phaser.GameObjects.Arc;
  private beaconHalo2!: Phaser.GameObjects.Arc;
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

  // Tunde position constants and timings
  public static readonly TUNDE_HOME_POS = { x: 440, y: 210 } as const;
  public static readonly TUNDE_SECONDARY_POS = { x: 370, y: 210 } as const;
  public static readonly TUNDE_WALK_DURATION_MS: number = 2000;
  public static readonly TUNDE_HOME_WAIT_MS: number = 9000;
  public static readonly TUNDE_SECONDARY_WAIT_MS: number = 4000;

  // Tunde character and routine visual objects
  private tundeContainer!: Phaser.GameObjects.Container;
  private tundeTag!: Phaser.GameObjects.Text;
  private tundeMessageIcon!: Phaser.GameObjects.Container;
  private tundeSpeechBubble!: Phaser.GameObjects.Container;
  private isTundeConversationResolved: boolean = false;
  private isTundeIntroCompleted: boolean = false;
  private hasTundeCalledOut: boolean = false;
  private tundeCalloutTimer?: Phaser.Time.TimerEvent;
  private tundeCalloutTween?: Phaser.Tweens.Tween;

  // Tunde movement routine state
  private tundeRoutineState: TundeRoutineState = 'AT_HOME';
  private tundeRoutineTimer?: Phaser.Time.TimerEvent;
  private tundeMovementTween?: Phaser.Tweens.Tween;
  private isTundeRoutinePaused: boolean = false;

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

  public preload(): void {
    this.load.image('amaka_front', amakaFrontUrl);
    this.load.image('amaka_right', amakaRightUrl);
    this.load.image('amaka_back', amakaBackUrl);
    this.load.image('amaka_left', amakaLeftUrl);
    this.load.image('it_workstation', itWorkstationUrl);
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
      if (this.playerVisuals) {
        this.playerVisuals.setRotation(0);
      }
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

      // Determine movement direction: front, back, right, or left
      let targetFacing = this.currentFacing;
      if (Math.abs(dy) >= Math.abs(dx)) {
        targetFacing = dy > 0 ? 'front' : 'back';
      } else {
        targetFacing = dx > 0 ? 'right' : 'left';
      }
      this.setPlayerFacing(targetFacing);
      this.lastMoveTime = this.time.now;

      // Subtle cartoon walking sway animation
      if (this.playerVisuals) {
        this.playerVisuals.setRotation(Math.sin(this.time.now * 0.015) * 0.05);
      }
    } else {
      body.setVelocity(0, 0);
      if (this.playerVisuals) {
        this.playerVisuals.setRotation(0);
      }
      // Return to front-facing when idle after standing still for 1.2s
      if (this.time.now - this.lastMoveTime > 1200) {
        this.setPlayerFacing('front');
      }
    }

    // Keep visual avatar and overhead label synchronized with dynamic physics body
    if (this.playerVisuals) {
      this.playerVisuals.setPosition(this.player.x, this.player.y);
    }
    if (this.playerTag) {
      this.playerTag.setPosition(this.player.x, this.player.y - 62);
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
    if (dept !== 'IT') {
      this.dismissTundeSpeechBubble();
    }
    this.refreshBeaconDisplay();
  }

  /**
   * Freezes or unfreezes player movement (e.g. while a decision modal is open).
   */
  public setMovementLocked(locked: boolean): void {
    this.isMovementLocked = locked;
    if (locked) {
      this.dismissTundeSpeechBubble();
      this.pauseTundeRoutine();
      this.virtualDx = 0;
      this.virtualDy = 0;
      if (this.player?.body) {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      if (this.playerVisuals) {
        this.playerVisuals.setRotation(0);
      }
      this.setPlayerFacing('front');
      if (this.input?.keyboard) {
        this.input.keyboard.resetKeys();
      }
      return;
    }

    this.resumeTundeRoutine();

    // Handing control back to the player always restores the keyboard.
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
      this.dismissTundeSpeechBubble();
      this.pauseTundeRoutine();
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
      if (this.playerVisuals) {
        this.playerVisuals.setPosition(800, 420);
        this.playerVisuals.setRotation(0);
      }
      this.setPlayerFacing('front');
      if (this.playerTag) {
        this.playerTag.setPosition(800, 358);
      }
    }
    this.resetEmergencyAlert();
    this.isMovementLocked = false;
    this.isPlayerInRange = false;
    this.hasTundeCalledOut = false;
    this.isTundeConversationResolved = false;
    this.isTundeIntroCompleted = false;
    this.dismissTundeSpeechBubble();
    if (this.tundeMessageIcon) {
      this.tundeMessageIcon.setVisible(true);
    }
    this.stopTundeRoutine();
    this.setTundePosition(OfficeScene.TUNDE_HOME_POS.x, OfficeScene.TUNDE_HOME_POS.y);
    this.tundeRoutineState = 'AT_HOME';
    this.isTundeRoutinePaused = false;
    this.startTundeRoutine();
  }

  // ==========================================================================
  // PROXIMITY & BEACONS
  // ==========================================================================

  private buildBeacons(): void {
    // Subtle concentric pulsing glowing rings on the office carpet
    this.beaconHalo1 = this.add.circle(0, 0, 56, 0x38bdf8, 0.18);
    this.beaconHalo1.setStrokeStyle(1.5, 0x38bdf8, 0.6);
    this.beaconHalo1.setDepth(4);
    this.beaconHalo1.setVisible(false);

    this.beaconHalo2 = this.add.circle(0, 0, 40, 0x38bdf8, 0.22);
    this.beaconHalo2.setStrokeStyle(2, 0x38bdf8, 0.85);
    this.beaconHalo2.setDepth(5);
    this.beaconHalo2.setVisible(false);

    this.beaconCircle = this.add.circle(0, 0, 22, 0x0284c7, 0.45);
    this.beaconCircle.setStrokeStyle(2, 0xffffff, 0.9);
    this.beaconCircle.setDepth(5);
    this.beaconCircle.setVisible(false);

    // Floating indicator tag
    this.beaconTag = this.add.text(0, 0, '⚠️ ACTIVE INCIDENT', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#0284c7e6',
      padding: { x: 8, y: 4 },
    });
    this.beaconTag.setOrigin(0.5, 0.5);
    this.beaconTag.setDepth(6);
    this.beaconTag.setVisible(false);

    // Continuous pulse tweens for concentric rings
    this.tweens.add({
      targets: this.beaconHalo1,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0.05,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: this.beaconHalo2,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0.1,
      duration: 1000,
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
    this.notificationBadge = this.add.text(0, -32, `🚨 ${STAFF.IT.name} — needs you [E/Space]`, {
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
    if (dept === 'IT') {
      this.setTundeConversationResolved(true);
    }
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
   */
  public applyIncidentOutcome(outcome: OfficeOutcome): void {
    this.setTundeConversationResolved(true);
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
        tomLabel: '💼 Yusuf (Accounts) — password reset, at his desk',
        tomColor: '#6ee7b7',
        tomBg: '#06281eee',
        tomFill: 0x15803d,
      },
      recovering: {
        badgePrefix: '🟡 IT: ',
        badgeBg: '#b45309f0',
        beacon: 0xfbbf24,
        beaconLabel: '🟡 Contained — working the fallout',
        tomLabel: '💼 Yusuf (Accounts) — working from paper',
        tomColor: '#fde68a',
        tomBg: '#241808ee',
        tomFill: 0xb45309,
      },
      compromised: {
        badgePrefix: '🚨 IT: ',
        badgeBg: '#dc2626f0',
        beacon: 0xef4444,
        beaconLabel: '🚨 Breach confirmed',
        tomLabel: '⚠️ Yusuf (Accounts) — account exposed',
        tomColor: '#fca5a5',
        tomBg: '#450a0aee',
        tomFill: 0x991b1b,
      },
      negligent: {
        badgePrefix: '⚠️ IT: ',
        badgeBg: '#991b1bf0',
        beacon: 0xef4444,
        beaconLabel: '⚠️ Session left open',
        tomLabel: '⚠️ Yusuf (Accounts) — still signed in',
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
      this.beaconHalo1.setVisible(false);
      this.beaconHalo2.setVisible(false);
      this.beaconTag.setVisible(false);
      if (!this.isDepartmentResolved) {
        this.notificationContainer.setVisible(false);
      }
      return;
    }

    const point = DEPARTMENT_POINTS[this.activeDepartment];
    this.beaconCircle.setPosition(point.x, point.y);
    this.beaconHalo1.setPosition(point.x, point.y);
    this.beaconHalo2.setPosition(point.x, point.y);
    this.beaconTag.setPosition(point.x, point.y - 58);
    this.beaconTag.setText('💬 Briefing Waiting [E / Space]');

    // Position overhead notification container
    this.notificationContainer.setPosition(point.x, point.y - 20);

    if (this.activeDepartment === 'IT') {
      this.beaconHalo1.setStrokeStyle(1.5, 0x38bdf8, 0.6);
      this.beaconHalo2.setStrokeStyle(2, 0x38bdf8, 0.85);
      this.beaconCircle.setFillStyle(0x0284c7, 0.45);
      this.beaconTag.setBackgroundColor('#0284c7e6');
      if (!this.isDepartmentResolved) {
        this.notificationBadge.setText(`🚨 ${STAFF.IT.name} — needs you [E/Space]`);
        this.notificationBadge.setBackgroundColor('#dc2626f0');
        this.notificationRadar1.setVisible(true);
        this.notificationRadar2.setVisible(true);
        this.notificationContainer.setVisible(true);
      }
    } else if (this.activeDepartment === 'HR') {
      this.beaconHalo1.setStrokeStyle(1.5, 0x34d399, 0.6);
      this.beaconHalo2.setStrokeStyle(2, 0x34d399, 0.85);
      this.beaconCircle.setFillStyle(0x059669, 0.45);
      this.beaconTag.setBackgroundColor('#059669e6');
    } else if (this.activeDepartment === 'FINANCE') {
      this.beaconHalo1.setStrokeStyle(1.5, 0xfbbf24, 0.6);
      this.beaconHalo2.setStrokeStyle(2, 0xfbbf24, 0.85);
      this.beaconCircle.setFillStyle(0xd97706, 0.45);
      this.beaconTag.setBackgroundColor('#d97706e6');
    } else if (this.activeDepartment === 'LEGAL') {
      this.beaconHalo1.setStrokeStyle(1.5, 0x818cf8, 0.6);
      this.beaconHalo2.setStrokeStyle(2, 0x818cf8, 0.85);
      this.beaconCircle.setFillStyle(0x4338ca, 0.45);
      this.beaconTag.setBackgroundColor('#4338cae6');
    }

    this.beaconCircle.setVisible(true);
    this.beaconHalo1.setVisible(true);
    this.beaconHalo2.setVisible(true);
    this.beaconTag.setVisible(true);
  }

  private checkDepartmentProximity(): void {
    if (!this.activeDepartment || this.isEmergencyActive) {
      if (this.isPlayerInRange) {
        this.isPlayerInRange = false;
        this.onProximityExit?.();
      }
      this.dismissTundeSpeechBubble();
      return;
    }

    const target = DEPARTMENT_POINTS[this.activeDepartment];
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    const tundePos = this.getTundePosition();
    const distToTunde = this.activeDepartment === 'IT'
      ? Phaser.Math.Distance.Between(this.player.x, this.player.y, tundePos.x, tundePos.y)
      : Infinity;
    const isNearTunde = distToTunde <= 115;
    const inRange = dist <= this.interactionRadius || isNearTunde;

    // One-time proximity greeting from Tunde during an active IT incident
    const canTriggerGreeting =
      this.activeDepartment === 'IT' &&
      isNearTunde &&
      !this.hasTundeCalledOut &&
      !this.isTundeConversationResolved &&
      !this.isDepartmentResolved &&
      !this.isTundeIntroCompleted &&
      !this.isMovementLocked &&
      !this.isEmergencyActive &&
      !this.isTextInputFocused();

    if (canTriggerGreeting) {
      this.triggerTundeCallout();
    }

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
        this.dismissTundeSpeechBubble();
        this.pauseTundeRoutine();
        this.triggerInteractionAnimation(this.activeDepartment, () => {
          this.onInteract?.(this.activeDepartment!);
        });
      }
    }
  }

  /**
   * Updates Tunde's in-world speech bubble to acknowledge that the introductory
   * conversation was finished.
   */
  public setTundeIntroCompleted(completed: boolean = true): void {
    this.isTundeIntroCompleted = completed;
    if (completed) {
      this.hasTundeCalledOut = true;
      this.dismissTundeSpeechBubble();
    }
  }

  /**
   * Resolves Tunde's message icon and hides speech bubble once the incident is contained.
   */
  public setTundeConversationResolved(resolved: boolean = true): void {
    this.isTundeConversationResolved = resolved;
    if (this.tundeMessageIcon) {
      this.tundeMessageIcon.setVisible(!resolved);
    }
    this.dismissTundeSpeechBubble();
  }

  /**
   * Triggers Tunde's one-time proximity speech bubble greeting.
   * Displays "Amaka, do you have a minute?" and auto-hides after ~4 seconds.
   */
  public triggerTundeCallout(): void {
    this.hasTundeCalledOut = true;
    if (!this.tundeSpeechBubble) {
      return;
    }

    const tundePos = this.getTundePosition();
    this.tundeSpeechBubble.setPosition(tundePos.x, tundePos.y - 102);

    const bubbleTxt = this.tundeSpeechBubble.getByName('bubbleText') as Phaser.GameObjects.Text | null;
    bubbleTxt?.setText('“Amaka, do you have a minute?”');

    if (this.tundeCalloutTimer) {
      this.tundeCalloutTimer.remove(false);
      this.tundeCalloutTimer = undefined;
    }
    if (this.tundeCalloutTween) {
      this.tundeCalloutTween.stop();
      this.tundeCalloutTween = undefined;
    }

    this.tundeSpeechBubble.setAlpha(1);
    this.tundeSpeechBubble.setVisible(true);

    if (this.time && typeof this.time.delayedCall === 'function') {
      this.tundeCalloutTimer = this.time.delayedCall(4000, () => {
        this.hideTundeSpeechBubble();
      });
    }
  }

  /**
   * Smoothly fades out and hides Tunde's speech bubble after the display duration.
   */
  public hideTundeSpeechBubble(): void {
    if (!this.tundeSpeechBubble || !this.tundeSpeechBubble.visible) {
      return;
    }

    if (this.tweens && typeof this.tweens.add === 'function') {
      this.tundeCalloutTween = this.tweens.add({
        targets: this.tundeSpeechBubble,
        alpha: 0,
        duration: 400,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (this.tundeSpeechBubble) {
            this.tundeSpeechBubble.setVisible(false);
            this.tundeSpeechBubble.setAlpha(1);
          }
          this.tundeCalloutTween = undefined;
        },
      });
    } else {
      this.tundeSpeechBubble.setVisible(false);
      this.tundeSpeechBubble.setAlpha(1);
    }
  }

  /**
   * Immediately dismisses and cancels any timers/tweens for Tunde's speech bubble.
   */
  public dismissTundeSpeechBubble(): void {
    if (this.tundeCalloutTimer) {
      this.tundeCalloutTimer.remove(false);
      this.tundeCalloutTimer = undefined;
    }
    if (this.tundeCalloutTween) {
      this.tundeCalloutTween.stop();
      this.tundeCalloutTween = undefined;
    }
    if (this.tundeSpeechBubble) {
      this.tundeSpeechBubble.setVisible(false);
      this.tundeSpeechBubble.setAlpha(1);
    }
  }

  /**
   * Returns whether Tunde has already triggered his initial greeting during this event.
   */
  public getHasTundeCalledOut(): boolean {
    return this.hasTundeCalledOut;
  }

  /**
   * Returns whether Tunde's speech bubble is currently visible.
   */
  public isTundeSpeechBubbleVisible(): boolean {
    return Boolean(this.tundeSpeechBubble && this.tundeSpeechBubble.visible);
  }

  /**
   * Returns the current text inside Tunde's speech bubble.
   */
  public getTundeSpeechBubbleText(): string {
    const bubbleTxt = this.tundeSpeechBubble?.getByName('bubbleText') as Phaser.GameObjects.Text | null;
    return bubbleTxt?.text ?? '';
  }

  /**
   * Returns whether Amaka is currently within speaking distance of Tunde Bello.
   */
  public getIsNearTunde(): boolean {
    if (!this.player) return false;
    const tundePos = this.getTundePosition();
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, tundePos.x, tundePos.y) <= 115;
  }

  // ==========================================================================
  // TUNDE BELLO MOVEMENT ROUTINE (IT DEPARTMENT)
  // ==========================================================================

  /**
   * Starts Tunde's periodic workplace movement routine in the IT department.
   */
  public startTundeRoutine(): void {
    this.stopTundeRoutine();
    this.tundeRoutineState = 'AT_HOME';
    this.isTundeRoutinePaused = false;
    this.scheduleTundeNextStep(OfficeScene.TUNDE_HOME_WAIT_MS);
  }

  /**
   * Stops any active movement tween or scheduled transition timers.
   */
  public stopTundeRoutine(): void {
    if (this.tundeMovementTween) {
      this.tundeMovementTween.stop();
      this.tundeMovementTween = undefined;
    }
    if (this.tundeRoutineTimer) {
      this.tundeRoutineTimer.remove(false);
      this.tundeRoutineTimer = undefined;
    }
  }

  /**
   * Pauses Tunde's movement routine (e.g. while Amaka is conversing or when a modal is open).
   */
  public pauseTundeRoutine(): void {
    this.isTundeRoutinePaused = true;
    if (this.tundeMovementTween && this.tundeMovementTween.isPlaying()) {
      this.tundeMovementTween.pause();
    }
    if (this.tundeRoutineTimer) {
      this.tundeRoutineTimer.paused = true;
    }
  }

  /**
   * Resumes Tunde's routine once dialogue modals close and player movement restores.
   */
  public resumeTundeRoutine(): void {
    if (this.isMovementLocked || this.isEmergencyActive) {
      return;
    }
    this.isTundeRoutinePaused = false;
    if (this.tundeMovementTween && this.tundeMovementTween.isPaused()) {
      this.tundeMovementTween.resume();
    }
    if (this.tundeRoutineTimer && this.tundeRoutineTimer.paused) {
      this.tundeRoutineTimer.paused = false;
    }
  }

  /**
   * Schedules the next routine transition after a delay.
   */
  private scheduleTundeNextStep(delayMs: number): void {
    if (this.tundeRoutineTimer) {
      this.tundeRoutineTimer.remove(false);
      this.tundeRoutineTimer = undefined;
    }
    if (this.time && typeof this.time.delayedCall === 'function') {
      this.tundeRoutineTimer = this.time.delayedCall(delayMs, () => {
        this.advanceTundeRoutine();
      });
      if (this.isTundeRoutinePaused || this.isMovementLocked || this.isEmergencyActive) {
        this.tundeRoutineTimer.paused = true;
      }
    }
  }

  /**
   * Advances Tunde's routine state machine to the next phase.
   */
  public advanceTundeRoutine(): void {
    if (this.isTundeRoutinePaused || this.isMovementLocked || this.isEmergencyActive) {
      return;
    }

    if (this.tundeRoutineState === 'AT_HOME') {
      this.walkTundeToSecondary();
    } else if (this.tundeRoutineState === 'WALKING_TO_SECONDARY') {
      this.arriveTundeAtSecondary();
    } else if (this.tundeRoutineState === 'AT_SECONDARY') {
      this.walkTundeToHome();
    } else if (this.tundeRoutineState === 'WALKING_TO_HOME') {
      this.arriveTundeAtHome();
    }
  }

  /**
   * Smoothly walks Tunde from his home console to the secondary monitoring spot.
   */
  public walkTundeToSecondary(): void {
    if (this.isTundeRoutinePaused || this.isMovementLocked || this.isEmergencyActive) {
      return;
    }
    this.tundeRoutineState = 'WALKING_TO_SECONDARY';
    this.moveTundeTo(OfficeScene.TUNDE_SECONDARY_POS.x, OfficeScene.TUNDE_WALK_DURATION_MS, () => {
      this.arriveTundeAtSecondary();
    });
  }

  /**
   * Handler for Tunde arriving at the secondary inspection position.
   */
  public arriveTundeAtSecondary(): void {
    if (this.tundeMovementTween) {
      this.tundeMovementTween.stop();
      this.tundeMovementTween = undefined;
    }
    this.setTundePosition(OfficeScene.TUNDE_SECONDARY_POS.x, OfficeScene.TUNDE_SECONDARY_POS.y);
    this.tundeRoutineState = 'AT_SECONDARY';
    this.scheduleTundeNextStep(OfficeScene.TUNDE_SECONDARY_WAIT_MS);
  }

  /**
   * Smoothly walks Tunde from the secondary position back to his home console.
   */
  public walkTundeToHome(): void {
    if (this.isTundeRoutinePaused || this.isMovementLocked || this.isEmergencyActive) {
      return;
    }
    this.tundeRoutineState = 'WALKING_TO_HOME';
    this.moveTundeTo(OfficeScene.TUNDE_HOME_POS.x, OfficeScene.TUNDE_WALK_DURATION_MS, () => {
      this.arriveTundeAtHome();
    });
  }

  /**
   * Handler for Tunde returning to his home console desk.
   */
  public arriveTundeAtHome(): void {
    if (this.tundeMovementTween) {
      this.tundeMovementTween.stop();
      this.tundeMovementTween = undefined;
    }
    this.setTundePosition(OfficeScene.TUNDE_HOME_POS.x, OfficeScene.TUNDE_HOME_POS.y);
    this.tundeRoutineState = 'AT_HOME';
    this.scheduleTundeNextStep(OfficeScene.TUNDE_HOME_WAIT_MS);
  }

  /**
   * Moves Tunde and all attached UI overhead objects (name tag, message icon, speech bubble)
   * horizontally to targetX with smooth easing.
   */
  private moveTundeTo(targetX: number, durationMs: number, onComplete: () => void): void {
    if (this.tundeMovementTween) {
      this.tundeMovementTween.stop();
      this.tundeMovementTween = undefined;
    }

    const targets: Phaser.GameObjects.GameObject[] = [];
    if (this.tundeContainer) targets.push(this.tundeContainer);
    if (this.tundeTag) targets.push(this.tundeTag);
    if (this.tundeMessageIcon) targets.push(this.tundeMessageIcon);
    if (this.tundeSpeechBubble) targets.push(this.tundeSpeechBubble);

    if (targets.length === 0 || !this.tweens || typeof this.tweens.add !== 'function') {
      this.setTundePosition(targetX, OfficeScene.TUNDE_HOME_POS.y);
      onComplete();
      return;
    }

    this.tundeMovementTween = this.tweens.add({
      targets,
      x: targetX,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tundeMovementTween = undefined;
        onComplete();
      },
    });

    if (this.isTundeRoutinePaused || this.isMovementLocked || this.isEmergencyActive) {
      this.tundeMovementTween.pause();
    }
  }

  /**
   * Instantly positions Tunde and his attached UI objects at (x, y).
   */
  public setTundePosition(x: number, y: number): void {
    if (this.tundeContainer) {
      this.tundeContainer.setPosition(x, y);
    }
    if (this.tundeTag) {
      this.tundeTag.setPosition(x, y - 42);
    }
    if (this.tundeMessageIcon) {
      this.tundeMessageIcon.setPosition(x, y - 68);
    }
    if (this.tundeSpeechBubble) {
      this.tundeSpeechBubble.setPosition(x, y - 102);
    }
  }

  /**
   * Returns Tunde's current live coordinates.
   */
  public getTundePosition(): { x: number; y: number } {
    if (this.tundeContainer) {
      return { x: this.tundeContainer.x, y: this.tundeContainer.y };
    }
    return { x: OfficeScene.TUNDE_HOME_POS.x, y: OfficeScene.TUNDE_HOME_POS.y };
  }

  /**
   * Returns Tunde's current routine state.
   */
  public getTundeRoutineState(): TundeRoutineState {
    return this.tundeRoutineState;
  }

  /**
   * Returns whether Tunde's routine is currently paused.
   */
  public getIsTundeRoutinePaused(): boolean {
    return this.isTundeRoutinePaused;
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
   * Builds the floor layout, subtle carpet grid, and the four department zones.
   * Uses distinct, upscale carpet textures and colors inspired by Criminal Case.
   */
  /**
   * Builds the floor layout, subtle tile patterns, and the four department zones.
   * Creates a bright, modern, cartoon-style workplace with warm, cozy accents.
   */
  private buildFloors(): void {
    const gfx = this.add.graphics();

    // 1. Base architectural floor (warm modern light-beige / soft sand ceramic)
    gfx.fillStyle(0xf4efe6, 1.0);
    gfx.fillRect(0, 0, OfficeScene.WORLD_WIDTH, OfficeScene.WORLD_HEIGHT);

    // 2. Subtle architectural tile pattern (60px ceramic tiles with gentle warm grout)
    gfx.lineStyle(1, 0xe2dcd0, 0.45);
    for (let x = 60; x < OfficeScene.WORLD_WIDTH; x += 60) {
      gfx.moveTo(x, 0);
      gfx.lineTo(x, OfficeScene.WORLD_HEIGHT);
    }
    for (let y = 60; y < OfficeScene.WORLD_HEIGHT; y += 60) {
      gfx.moveTo(0, y);
      gfx.lineTo(OfficeScene.WORLD_WIDTH, y);
    }
    gfx.strokePath();

    // 3. Central Reception & Lobby Runner (Warm polished maple-terrazzo with warm brass trim)
    gfx.fillStyle(0xebe2d4, 0.95);
    gfx.fillRect(560, 100, 480, 580);

    // Warm brass / honey inlay borders along lobby pathway
    gfx.lineStyle(2, 0xc4af90, 0.85);
    gfx.moveTo(560, 100);
    gfx.lineTo(560, 680);
    gfx.moveTo(1040, 100);
    gfx.lineTo(1040, 680);
    gfx.strokePath();

    // Soft lobby inner accent line
    gfx.lineStyle(1, 0xdbccb6, 0.6);
    gfx.moveTo(568, 100);
    gfx.lineTo(568, 680);
    gfx.moveTo(1032, 100);
    gfx.lineTo(1032, 680);
    gfx.strokePath();

    // Elegant lobby welcome area rug (soft textured warm oat with woven border)
    gfx.fillStyle(0xdfd7ca, 0.85);
    gfx.fillRoundedRect(680, 320, 240, 200, 12);
    gfx.lineStyle(2, 0xbfa888, 0.9);
    gfx.strokeRoundedRect(680, 320, 240, 200, 12);
    gfx.lineStyle(1, 0xd0c4b2, 0.6);
    gfx.strokeRoundedRect(688, 328, 224, 184, 8);

    // --- Department Zones (Bright, cozy, modern commercial carpets with soft borders) ---

    // 1. IT Department (Northwest: x: 60..540, y: 60..480)
    // Soft contemporary mist-slate carpet with tailored steel-blue woven border
    gfx.fillStyle(0xdbe5ee, 0.95);
    gfx.fillRoundedRect(60, 60, 480, 420, 16);
    gfx.lineStyle(2.5, 0x94a6b8, 0.9);
    gfx.strokeRoundedRect(60, 60, 480, 420, 16);
    gfx.lineStyle(1, 0xb0c2d4, 0.5);
    gfx.strokeRoundedRect(70, 70, 460, 400, 10);

    // 2. Human Resources (Northeast: x: 1060..1540, y: 60..480)
    // Calming botanical sage-mint woven carpet with soft eucalyptus border
    gfx.fillStyle(0xdcece2, 0.95);
    gfx.fillRoundedRect(1060, 60, 480, 420, 16);
    gfx.lineStyle(2.5, 0x86b29b, 0.9);
    gfx.strokeRoundedRect(1060, 60, 480, 420, 16);
    gfx.lineStyle(1, 0xa3c8b4, 0.5);
    gfx.strokeRoundedRect(1070, 70, 460, 400, 10);

    // 3. Finance Department (Southwest: x: 440..1140, y: 700..1140)
    // Warm executive toasted-oat carpet with warm caramel-brass border
    gfx.fillStyle(0xefe7db, 0.95);
    gfx.fillRoundedRect(440, 700, 700, 440, 16);
    gfx.lineStyle(2.5, 0xc8a578, 0.9);
    gfx.strokeRoundedRect(440, 700, 700, 440, 16);
    gfx.lineStyle(1, 0xdec6a2, 0.5);
    gfx.strokeRoundedRect(450, 710, 680, 420, 10);

    // 4. Legal & Regulatory Compliance (Southeast: x: 1180..1540, y: 700..1140)
    // Dignified soft heather-slate carpet with gentle muted indigo border
    gfx.fillStyle(0xe2e3f0, 0.95);
    gfx.fillRoundedRect(1180, 700, 360, 440, 16);
    gfx.lineStyle(2.5, 0x9aa0cb, 0.9);
    gfx.strokeRoundedRect(1180, 700, 360, 440, 16);
    gfx.lineStyle(1, 0xb8bddc, 0.5);
    gfx.strokeRoundedRect(1190, 710, 340, 420, 10);
  }

  /**
   * Builds the perimeter walls and internal partition walls.
   * Preserves exact obstacle collision boxes, and adds gentle 3D top-capping,
   * soft floor drop-shadows, and natural baseboards.
   */
  private buildWalls(): void {
    const wallColor = 0x2d3748;
    const strokeColor = 0x1a202c;

    // 1. Soft wall drop shadows on the floor (gives gentle 3D depth to partitions)
    const shadowGfx = this.add.graphics();
    shadowGfx.setDepth(2);
    shadowGfx.fillStyle(0x000000, 0.08);

    // Drop shadows along southern & eastern edges of partition walls
    shadowGfx.fillRect(556, 114, 8, 180);
    shadowGfx.fillRect(556, 424, 8, 160);
    shadowGfx.fillRect(280, 496, 520, 8);

    shadowGfx.fillRect(1056, 114, 8, 180);
    shadowGfx.fillRect(1056, 424, 8, 160);
    shadowGfx.fillRect(1320, 496, 520, 8);

    shadowGfx.fillRect(230, 696, 420, 8);
    shadowGfx.fillRect(570, 696, 260, 8);
    shadowGfx.fillRect(1030, 696, 260, 8);

    shadowGfx.fillRect(1360, 696, 360, 8);
    shadowGfx.fillRect(1176, 764, 8, 120);
    shadowGfx.fillRect(1176, 1064, 8, 140);

    // Drop shadows along southern edges of northern boundary partition walls
    shadowGfx.fillRect(550, 200, 500, 8); // Lobby corridor north wall
    shadowGfx.fillRect(335, 190, 215, 8); // IT suite north wall (aisle)
    shadowGfx.fillRect(132, 175, 93, 8);  // IT suite north wall (rack-to-desk)
    shadowGfx.fillRect(20, 175, 112, 8);  // IT suite north wall (west server rack cap)
    shadowGfx.fillRect(1050, 190, 538, 8); // HR suite north wall

    // 2. Perimeter boundary walls (exact collision coordinates preserved)
    this.createObstacle(800, 12, OfficeScene.WORLD_WIDTH, 24, wallColor, strokeColor);
    this.createObstacle(800, 1188, OfficeScene.WORLD_WIDTH, 24, wallColor, strokeColor);
    this.createObstacle(12, 600, 24, OfficeScene.WORLD_HEIGHT, wallColor, strokeColor);
    this.createObstacle(1588, 600, 24, OfficeScene.WORLD_HEIGHT, wallColor, strokeColor);

    // 3. Interior partitions (exact collision coordinates preserved)
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

    // Northern Playable Area Boundary Walls (encloses corridor and suites to prevent HUD occlusion)
    // Lobby Corridor North Wall: connects IT entrance to HR entrance above doorways (y=200)
    this.createObstacle(800, 185, 500, 30, wallColor, strokeColor);
    // IT Suite North Walls: closes off out-of-bounds space above Tunde aisle, Kelechi workstation, and server racks
    this.createObstacle(442.5, 175, 215, 30, wallColor, strokeColor);
    this.createObstacle(178.5, 160, 93, 30, wallColor, strokeColor);
    this.createObstacle(76, 160, 112, 30, wallColor, strokeColor);
    // HR Suite North Wall: closes off out-of-bounds space across the entire suite (y=190)
    this.createObstacle(1319, 175, 538, 30, wallColor, strokeColor);

    // 4. Architectural 3D top-capping and natural department-themed baseboard trims
    const trim = this.add.graphics();
    trim.setDepth(6);

    // Lighter 3D top-cap trim on partition walls
    trim.fillStyle(0x4a5568, 0.85);
    trim.fillRect(542, 20, 4, 180);
    trim.fillRect(542, 340, 4, 160);
    trim.fillRect(70, 482, 480, 4);

    trim.fillRect(1042, 20, 4, 180);
    trim.fillRect(1042, 340, 4, 160);
    trim.fillRect(1060, 482, 520, 4);

    trim.fillRect(70, 682, 420, 4);
    trim.fillRect(440, 682, 260, 4);
    trim.fillRect(900, 682, 260, 4);
    trim.fillRect(1180, 682, 360, 4);

    // Top-cap trim on northern boundary partition walls
    trim.fillRect(550, 170, 500, 4);
    trim.fillRect(335, 160, 215, 4);
    trim.fillRect(132, 145, 93, 4);
    trim.fillRect(20, 145, 112, 4);
    trim.fillRect(1050, 160, 538, 4);

    // Subtle, natural baseboard trims (no harsh neon colors)
    // IT baseboard trim (soft steel-slate)
    trim.fillStyle(0x718096, 0.6);
    trim.fillRect(60, 480, 480, 3);
    trim.fillRect(538, 60, 3, 140);
    trim.fillRect(538, 340, 3, 140);
    trim.fillRect(335, 188, 215, 3);
    trim.fillRect(132, 173, 93, 3);
    trim.fillRect(20, 173, 112, 3);

    // Lobby north baseboard trim (warm brass / slate)
    trim.fillStyle(0xa0aec0, 0.6);
    trim.fillRect(550, 198, 500, 3);

    // HR baseboard trim (soft sage green)
    trim.fillStyle(0x688b77, 0.6);
    trim.fillRect(1060, 480, 480, 3);
    trim.fillRect(1058, 60, 3, 140);
    trim.fillRect(1058, 340, 3, 140);
    trim.fillRect(1050, 188, 538, 3);

    // Finance baseboard trim (warm caramel oak)
    trim.fillStyle(0x9b7b59, 0.6);
    trim.fillRect(440, 700, 260, 3);
    trim.fillRect(900, 700, 240, 3);

    // Legal baseboard trim (soft muted indigo)
    trim.fillStyle(0x757b9e, 0.6);
    trim.fillRect(1180, 700, 360, 3);
    trim.fillRect(1178, 820, 3, 100);
  }

  /**
   * Helper to create a static rectangular obstacle with physics body.
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
   * Renders a recognizable cartoon potted office plant (Monstera / Fiddle-leaf Fig)
   * in a terracotta pot with multi-layered leafy cutouts.
   */
  private createPottedPlant(x: number, y: number): void {
    const plantContainer = this.add.container(x, y);
    plantContainer.setDepth(7);

    // Terracotta pot base and rim
    const potBase = this.add.rectangle(0, 4, 22, 18, 0xb45309).setStrokeStyle(1.5, 0x78350f);
    const potRim = this.add.rectangle(0, -6, 26, 6, 0xd97706).setStrokeStyle(1.5, 0x78350f);
    const soil = this.add.ellipse(0, -6, 20, 4, 0x3f200c);

    // Lush Monstera leaves with vibrant green tones
    const leaf1 = this.add.ellipse(-7, -13, 14, 10, 0x15803d);
    leaf1.setRotation(-0.35);
    const leaf2 = this.add.ellipse(7, -13, 14, 10, 0x16a34a);
    leaf2.setRotation(0.35);
    const leaf3 = this.add.ellipse(0, -18, 16, 11, 0x22c55e);
    const leafCenter = this.add.ellipse(0, -12, 10, 8, 0x86efac);

    plantContainer.add([potBase, potRim, soil, leaf1, leaf2, leaf3, leafCenter]);
  }

  /**
   * Renders a cartoon computer workstation with thin-bezel display, glowing screen,
   * keyboard, mousepad, and mouse.
   */
  private createComputerStation(
    x: number,
    y: number,
    screenTheme: 'it' | 'finance' | 'hr' | 'legal'
  ): void {
    const deskItem = this.add.container(x, y);
    deskItem.setDepth(6);

    // Monitor stand and thin-bezel screen
    const stand = this.add.rectangle(0, 6, 8, 4, 0x94a3b8);
    const monitorFrame = this.add.rectangle(0, -2, 28, 16, 0x0f172a).setStrokeStyle(1.5, 0xe2e8f0);

    // Theme-specific illuminated cartoon display
    let screenColor = 0x0c1e33;
    let accentLineColor = 0x38bdf8;
    if (screenTheme === 'finance') {
      screenColor = 0x241808;
      accentLineColor = 0xf59e0b;
    } else if (screenTheme === 'hr') {
      screenColor = 0x06281e;
      accentLineColor = 0x34d399;
    } else if (screenTheme === 'legal') {
      screenColor = 0x1e1b4b;
      accentLineColor = 0xa5b4fc;
    }

    const screen = this.add.rectangle(0, -2, 24, 12, screenColor);
    const line1 = this.add.rectangle(-4, -4, 12, 2, accentLineColor);
    const line2 = this.add.rectangle(0, -1, 16, 2, 0xffffff);
    const line3 = this.add.rectangle(-2, 2, 14, 2, accentLineColor);

    // Keyboard & mouse
    const keyboard = this.add.rectangle(0, 12, 18, 6, 0x334155).setStrokeStyle(1, 0x64748b);
    const spacebar = this.add.rectangle(0, 13, 8, 1.5, 0xffffff);
    const mousepad = this.add.rectangle(13, 12, 6, 7, 0x1e293b);
    const mouse = this.add.rectangle(13, 12, 3, 4, 0xe2e8f0);

    deskItem.add([stand, monitorFrame, screen, line1, line2, line3, keyboard, spacebar, mousepad, mouse]);
  }

  /**
   * Places recognizable cartoon-style office furniture: desks, swivel chairs, computers,
   * server racks with glass glare, water cooler, filing cabinets, treasury safe, and plants.
   * All physics coordinates and bounds are preserved exactly.
   */
  private buildFurniture(): void {
    // --- 1. IT Department Furniture (Northwest) ---

    // 3 IT Server Racks (Exact physics obstacles preserved)
    this.createObstacle(110, 140, 44, 70, 0x0f172a, 0x0284c7, 2);
    this.createObstacle(110, 230, 44, 70, 0x0f172a, 0x0284c7, 2);
    this.createObstacle(110, 320, 44, 70, 0x0f172a, 0x0284c7, 2);

    // Cartoon server rack glass reflection sheens & ventilation slats
    const rackGfx = this.add.graphics();
    rackGfx.setDepth(5);
    for (const ry of [140, 230, 320]) {
      // Horizontal rack blade dividers
      rackGfx.lineStyle(1, 0x1e293b, 0.9);
      for (let offset = -24; offset <= 24; offset += 8) {
        rackGfx.moveTo(94, ry + offset);
        rackGfx.lineTo(126, ry + offset);
      }
      // Diagonal cyan glass glare gleam
      rackGfx.fillStyle(0x38bdf8, 0.15);
      rackGfx.fillTriangle(92, ry - 32, 128, ry + 10, 92, ry - 10);
    }
    rackGfx.strokePath();

    // Dynamic blinking server rack status LEDs
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

    // IT Workstations
    // Upper workstation (280, 175): 110x40 obstacle leaves a wide 53px vertical clearance aisle to Ops Console (minY=248)
    this.createObstacle(280, 175, 110, 40, 0x000000, undefined, 0).setAlpha(0);
    // Lower workstation (280, 320): preserve exact 120x50 physics collision obstacle, hide geometric visual
    this.createObstacle(280, 320, 120, 50, 0x000000, undefined, 0).setAlpha(0);

    // Illustrated cartoon artwork for upper IT workstation (Kelechi Umeh's desk)
    const upperStationImg = this.add.image(280, 192, 'it_workstation');
    upperStationImg.setDisplaySize(130, 75);
    upperStationImg.setDepth(6);

    // Illustrated cartoon artwork for lower IT workstation (incident workstation)
    const itStationImg = this.add.image(280, 332, 'it_workstation');
    itStationImg.setDisplaySize(130, 75);
    itStationImg.setDepth(6);

    // IT Central Ops Console (Interaction Terminal at 440, 270, bounds: x: 415..465, y: 248..292)
    // Sized and positioned to give Amaka's 30x30 body 23px clearance north of console at Tunde's home pos (440, 210)
    this.createObstacle(440, 270, 50, 44, 0x0f172a, 0x38bdf8, 2);
    const opsConsole = this.add.rectangle(440, 270, 44, 44, 0x0369a1).setStrokeStyle(1.5, 0x7dd3fc).setDepth(5);
    const opsRadar = this.add.circle(440, 270, 14, 0x0c1e33).setStrokeStyle(1.5, 0x38bdf8).setDepth(6);
    const opsSweep = this.add.line(440, 270, 0, 0, 10, -8, 0x22c55e).setLineWidth(1.5).setDepth(6);
    void opsConsole; void opsRadar; void opsSweep;

    // --- 2. Human Resources Furniture (Northeast) ---

    // Meeting Lounge Sofa (Plush emerald green with tufting and throw pillows)
    this.createObstacle(1220, 160, 140, 44, 0x064e3b, 0x10b981, 2);
    // Sofa cushions & pillows
    const sofaBack = this.add.rectangle(1220, 145, 134, 12, 0x047857).setStrokeStyle(1, 0x34d399).setDepth(5);
    const pillow1 = this.add.ellipse(1160, 160, 12, 16, 0xfbcfe8).setRotation(0.2).setDepth(5);
    const pillow2 = this.add.ellipse(1280, 160, 12, 16, 0xfef08a).setRotation(-0.2).setDepth(5);
    void sofaBack; void pillow1; void pillow2;

    // Coffee Table (Blonde Scandinavian oak with tea set)
    this.createObstacle(1220, 240, 80, 50, 0x1f2937, 0x10b981);
    const teapot = this.add.circle(1215, 240, 7, 0xf8fafc).setStrokeStyle(1, 0x94a3b8).setDepth(5);
    const teaCup1 = this.add.circle(1230, 235, 4, 0xf8fafc).setDepth(5);
    const teaCup2 = this.add.circle(1230, 245, 4, 0xf8fafc).setDepth(5);
    void teapot; void teaCup1; void teaCup2;

    // HR Workstation (Ngozi Okafor's interaction desk)
    this.createObstacle(1380, 330, 120, 50, 0x1e293b, 0x10b981);
    const hrChair = this.add.circle(1380, 365, 12, 0x047857).setStrokeStyle(2, 0x34d399).setDepth(4);
    this.createComputerStation(1380, 330, 'hr');
    // HR candidate files folder on desk
    const hrFolder = this.add.rectangle(1340, 330, 16, 12, 0xfef08a).setStrokeStyle(1, 0xd97706).setDepth(6);
    void hrChair; void hrFolder;

    // Water Cooler (Translucent blue water jug with bubbles & cup dispenser)
    this.createObstacle(1470, 150, 32, 32, 0xe2e8f0, 0x38bdf8);
    const coolerBottle = this.add.ellipse(1470, 144, 20, 16, 0x38bdf8, 0.75).setStrokeStyle(1.5, 0x0284c7).setDepth(6);
    const coolerBubble = this.add.circle(1470, 142, 2.5, 0xffffff, 0.9).setDepth(7);
    const tapRed = this.add.circle(1466, 158, 2, 0xef4444).setDepth(6);
    const tapBlue = this.add.circle(1474, 158, 2, 0x3b82f6).setDepth(6);
    void coolerBottle; void coolerBubble; void tapRed; void tapBlue;

    // Lush Potted Office Plants
    this.createPottedPlant(1095, 140);
    this.createPottedPlant(1470, 420);
    this.createObstacle(1095, 140, 30, 30, 0x78350f, 0x22c55e);
    this.createObstacle(1470, 420, 30, 30, 0x78350f, 0x22c55e);

    // --- 3. Finance Department Furniture (Southwest) ---

    // Grand Executive Mahogany Desk (Chinedu Eze's CFO Desk)
    this.createObstacle(800, 850, 180, 60, 0x5c2b0e, 0xf59e0b, 2);
    // Executive leather high-back chair
    const cfoChair = this.add.rectangle(800, 890, 26, 16, 0x1f2937).setStrokeStyle(2, 0xf59e0b).setDepth(4);
    // Classic banker's green glass desk lamp
    const lampBase = this.add.circle(735, 845, 5, 0xf59e0b).setDepth(6);
    const lampShade = this.add.rectangle(735, 840, 14, 6, 0x15803d).setStrokeStyle(1, 0x86efac).setDepth(6);
    // Dual widescreen financial charts
    this.createComputerStation(800, 850, 'finance');
    // Leather desk blotter
    const blotter = this.add.rectangle(800, 850, 90, 40, 0x1c1917, 0.5).setStrokeStyle(1, 0xf59e0b).setDepth(5);
    void cfoChair; void lampBase; void lampShade; void blotter;

    // Filing Cabinets (Brushed charcoal steel with brass pull handles)
    this.createObstacle(540, 800, 46, 80, 0x334155, 0x94a3b8);
    this.createObstacle(540, 920, 46, 80, 0x334155, 0x94a3b8);
    // Brass drawer pulls and card label frames
    const cabinetGfx = this.add.graphics();
    cabinetGfx.setDepth(5);
    for (const cy of [800, 920]) {
      for (let dy = -28; dy <= 28; dy += 19) {
        cabinetGfx.lineStyle(1, 0x1e293b, 0.9);
        cabinetGfx.strokeRect(522, cy + dy - 8, 36, 16);
        cabinetGfx.fillStyle(0xf59e0b, 0.9);
        cabinetGfx.fillRect(536, cy + dy - 2, 8, 3);
      }
    }
    cabinetGfx.strokePath();

    // Heavy Steel Treasury Safe (Combination dial & 3-spoke vault handle)
    this.createObstacle(1060, 810, 64, 64, 0x0f172a, 0xf59e0b, 2);
    const safeDoor = this.add.circle(1060, 810, 22, 0x1e293b).setStrokeStyle(2, 0x94a3b8).setDepth(5);
    const safeDial = this.add.circle(1060, 810, 8, 0xf8fafc).setStrokeStyle(1.5, 0x0f172a).setDepth(6);
    const safeHandle = this.add.circle(1060, 810, 4, 0xf59e0b).setDepth(6);
    // Vault corner rivets
    const rivet1 = this.add.circle(1034, 784, 2, 0x94a3b8).setDepth(5);
    const rivet2 = this.add.circle(1086, 784, 2, 0x94a3b8).setDepth(5);
    const rivet3 = this.add.circle(1034, 836, 2, 0x94a3b8).setDepth(5);
    const rivet4 = this.add.circle(1086, 836, 2, 0x94a3b8).setDepth(5);
    void safeDoor; void safeDial; void safeHandle; void rivet1; void rivet2; void rivet3; void rivet4;

    // Financial Analyst Workstations
    // Yusuf Ibrahim's Accounts Payable Desk (680, 1030)
    this.createObstacle(680, 1030, 120, 50, 0x1e293b, 0xf59e0b);
    const yusufChair = this.add.circle(680, 1065, 11, 0xb45309).setStrokeStyle(2, 0xfbbf24).setDepth(4);
    this.createComputerStation(680, 1030, 'finance');
    // Calculator and ledger book on Yusuf's desk
    const calculator = this.add.rectangle(645, 1030, 12, 14, 0x0f172a).setStrokeStyle(1, 0x94a3b8).setDepth(6);
    const ledger = this.add.rectangle(715, 1030, 14, 18, 0x78350f).setStrokeStyle(1, 0xf59e0b).setDepth(6);
    void yusufChair; void calculator; void ledger;

    // Second Finance Desk (920, 1030)
    this.createObstacle(920, 1030, 120, 50, 0x1e293b, 0xf59e0b);
    const finChair2 = this.add.circle(920, 1065, 11, 0x78350f).setStrokeStyle(2, 0xfbbf24).setDepth(4);
    this.createComputerStation(920, 1030, 'finance');
    void finChair2;

    // --- 4. Legal & Compliance Furniture (Southeast) ---

    // Funmi Adeyemi's Consultation Desk (Walnut wood with navy leather inlay)
    this.createObstacle(1360, 850, 160, 56, 0x1e1b4b, 0x818cf8, 2);
    const legalChair = this.add.rectangle(1360, 890, 24, 16, 0x312e81).setStrokeStyle(2, 0xa5b4fc).setDepth(4);
    this.createComputerStation(1360, 850, 'legal');
    // Miniature Scales of Justice ornament on desk
    const scalesStand = this.add.line(1305, 848, 0, -6, 0, 6, 0xfbbf24).setLineWidth(2).setDepth(6);
    const scalesBeam = this.add.line(1305, 842, -6, 0, 6, 0, 0xfbbf24).setLineWidth(1.5).setDepth(6);
    const scalePanL = this.add.circle(1299, 846, 3, 0xfbbf24).setDepth(6);
    const scalePanR = this.add.circle(1311, 846, 3, 0xfbbf24).setDepth(6);
    void legalChair; void scalesStand; void scalesBeam; void scalePanL; void scalePanR;

    // Legal Archive Bookcases (Rich dark mahogany with colourful law books)
    this.createObstacle(1500, 780, 40, 90, 0x1e1208, 0x64748b, 1);
    this.createObstacle(1500, 920, 40, 90, 0x1e1208, 0x64748b, 1);
    const bookGfx = this.add.graphics();
    bookGfx.setDepth(5);
    const bookColors = [0x991b1b, 0x1e3a8a, 0x14532d, 0x854d0e, 0x4c1d95];
    for (const by of [780, 920]) {
      for (let shelf = -32; shelf <= 32; shelf += 21) {
        bookGfx.lineStyle(1.5, 0x78350f, 1);
        bookGfx.moveTo(1482, by + shelf + 8);
        bookGfx.lineTo(1518, by + shelf + 8);
        // Books on shelf
        for (let bx = 1484; bx <= 1514; bx += 6) {
          const col = bookColors[Math.floor(Math.random() * bookColors.length)];
          bookGfx.fillStyle(col, 0.95);
          bookGfx.fillRect(bx, by + shelf - 6, 5, 14);
        }
      }
    }
    bookGfx.strokePath();

    // Round Consultation Table
    this.createObstacle(1240, 880, 70, 70, 0x1e293b, 0x818cf8, 1);
    const roundTable = this.add.circle(1240, 880, 32, 0x1e1b4b).setStrokeStyle(2, 0x6366f1).setDepth(5);
    const carafe = this.add.circle(1240, 880, 5, 0x38bdf8, 0.8).setStrokeStyle(1, 0xffffff).setDepth(6);
    void roundTable; void carafe;

    // Potted plant in Legal
    this.createPottedPlant(1500, 1050);
    this.createObstacle(1500, 1050, 30, 30, 0x78350f, 0x22c55e);

    // --- 5. Main Lobby Reception Bench ---
    this.createObstacle(800, 560, 140, 44, 0x1e293b, 0x64748b, 1);
    const benchCushion = this.add.rectangle(800, 560, 130, 34, 0x334155).setStrokeStyle(1.5, 0x94a3b8).setDepth(5);
    const lobbyMag = this.add.rectangle(800, 560, 20, 14, 0x38bdf8).setStrokeStyle(1, 0xffffff).setDepth(6);
    void benchCushion; void lobbyMag;
  }

  /**
   * Helper function to build a friendly, clean cartoon-style human character
   * inspired by Criminal Case (expressive eyes, styled hair, accessories, and distinct attire).
   */
  private createCartoonCharacter(config: CartoonCharacterConfig): {
    container: Phaser.GameObjects.Container;
    torso: Phaser.GameObjects.Rectangle;
    tag: Phaser.GameObjects.Text;
  } {
    const container = this.add.container(config.x, config.y);
    container.setDepth(config.depth ?? 9);

    // 1. Soft Drop Shadow
    const shadow = this.add.ellipse(0, 15, 26, 10, 0x000000, 0.28);
    container.add(shadow);

    // 2. Stylish Office Shoes
    const leftShoe = this.add.rectangle(-5, 14, 7, 5, 0x0f172a);
    const rightShoe = this.add.rectangle(5, 14, 7, 5, 0x0f172a);
    container.add([leftShoe, rightShoe]);

    // 3. Trousers / Skirt
    const legs = this.add.rectangle(0, 8, 18, 11, config.trouserColor);
    container.add(legs);

    // 4. Torso (Suit Jacket / Shirt / Blouse)
    const torso = this.add.rectangle(0, -2, 22, 16, config.torsoColor);
    container.add(torso);

    // 5. Collar, Necktie, Necklace or Lanyard Accents
    if (config.accentType === 'necklace') {
      // Cream blouse neckline + golden necklace
      const blouse = this.add.triangle(0, -7, -4, -10, 4, -10, 0, -4, 0xfdf8f6);
      const necklace = this.add.circle(0, -4, 2, config.accentColor ?? 0xfbbf24);
      container.add([blouse, necklace]);
    } else if (config.accentType === 'tie') {
      // White shirt collar + silk tie
      const collarL = this.add.triangle(-3, -8, -5, -10, -1, -10, -3, -6, 0xffffff);
      const collarR = this.add.triangle(3, -8, 1, -10, 5, -10, 3, -6, 0xffffff);
      const tie = this.add.polygon(
        0,
        -1,
        [0, -6, 3, -4, 2, 4, 0, 7, -2, 4, -3, -4],
        config.accentColor ?? 0xf59e0b
      );
      container.add([collarL, collarR, tie]);
    } else if (config.accentType === 'pearls') {
      // Elegant pearl necklace + golden buttons
      const p1 = this.add.circle(-4, -6, 1.5, 0xf8fafc);
      const p2 = this.add.circle(-1.5, -4.5, 1.5, 0xf8fafc);
      const p3 = this.add.circle(1.5, -4.5, 1.5, 0xf8fafc);
      const p4 = this.add.circle(4, -6, 1.5, 0xf8fafc);
      const btn1 = this.add.circle(0, -1, 1.2, config.accentColor ?? 0xfbbf24);
      const btn2 = this.add.circle(0, 3, 1.2, config.accentColor ?? 0xfbbf24);
      container.add([p1, p2, p3, p4, btn1, btn2]);
    } else if (config.accentType === 'lanyard') {
      // IT lanyard with security access card
      const lanyardL = this.add
        .line(0, 0, -3, -9, 0, -1, config.accentColor ?? 0x0284c7)
        .setLineWidth(1.5);
      const lanyardR = this.add
        .line(0, 0, 3, -9, 0, -1, config.accentColor ?? 0x0284c7)
        .setLineWidth(1.5);
      const badge = this.add.rectangle(0, 1, 6, 7, 0xffffff).setStrokeStyle(1, 0x94a3b8);
      const badgePhoto = this.add.rectangle(0, 0, 4, 3, config.accentColor ?? 0x0284c7);
      container.add([lanyardL, lanyardR, badge, badgePhoto]);
    } else if (config.accentType === 'brooch') {
      // Lavender blouse + silver brooch
      const blouse = this.add.triangle(0, -7, -4, -10, 4, -10, 0, -4, 0xc4b5fd);
      const brooch = this.add.circle(5, -6, 2, config.accentColor ?? 0xe2e8f0);
      container.add([blouse, brooch]);
    }

    // 6. Arms and Hands
    const leftArm = this.add.rectangle(-11, -2, 6, 12, config.torsoColor);
    const rightArm = this.add.rectangle(11, -2, 6, 12, config.torsoColor);
    const leftHand = this.add.circle(-11, 5, 3.2, config.skinTone);
    const rightHand = this.add.circle(11, 5, 3.2, config.skinTone);
    container.add([leftArm, rightArm, leftHand, rightHand]);

    // 7. Neck
    const neck = this.add.rectangle(0, -9, 7, 5, config.skinTone);
    container.add(neck);

    // 8. Head
    const head = this.add.circle(0, -17, 10.5, config.skinTone);
    container.add(head);

    // 9. Face: Eyes, Pupils, Highlights, Eyebrows, Smile
    const eyeWhiteL = this.add.ellipse(-3.5, -18, 4.5, 5, 0xffffff);
    const eyeWhiteR = this.add.ellipse(3.5, -18, 4.5, 5, 0xffffff);
    const pupilL = this.add.circle(-3.5, -17.5, 1.8, 0x0f172a);
    const pupilR = this.add.circle(3.5, -17.5, 1.8, 0x0f172a);
    const glintL = this.add.circle(-4.2, -18.5, 0.7, 0xffffff);
    const glintR = this.add.circle(2.8, -18.5, 0.7, 0xffffff);
    const browL = this.add.line(0, 0, -5.5, -21.5, -1.5, -22, 0x1e150f).setLineWidth(1.5);
    const browR = this.add.line(0, 0, 1.5, -22, 5.5, -21.5, 0x1e150f).setLineWidth(1.5);
    const smile = this.add.arc(0, -14, 3, 20, 160, false, 0x000000, 0);
    smile.setStrokeStyle(1.5, 0x3b1c0c);

    container.add([eyeWhiteL, eyeWhiteR, pupilL, pupilR, glintL, glintR, browL, browR, smile]);

    // 10. Glasses (if specified)
    if (config.hasGlasses) {
      const rimL = this.add
        .rectangle(-3.5, -17.5, 7, 6, 0x000000, 0)
        .setStrokeStyle(1.5, 0x38bdf8);
      const rimR = this.add
        .rectangle(3.5, -17.5, 7, 6, 0x000000, 0)
        .setStrokeStyle(1.5, 0x38bdf8);
      const bridge = this.add.line(0, 0, -0.5, -17.5, 0.5, -17.5, 0x38bdf8).setLineWidth(1.5);
      container.add([rimL, rimR, bridge]);
    }

    // 11. Earrings (if specified)
    if (config.hasEarrings) {
      const earL = this.add.circle(-10.5, -16, 2, config.earringColor ?? 0xfbbf24);
      const earR = this.add.circle(10.5, -16, 2, config.earringColor ?? 0xfbbf24);
      container.add([earL, earR]);
    }

    // 12. Hairstyle
    if (config.hairStyle === 'bun') {
      // Amaka's stylish braided crown bun
      const hairBase = this.add.arc(0, -19, 11, 160, 380, false, config.hairColor, 1);
      const bun = this.add.circle(0, -28, 6.5, config.hairColor);
      const clasp = this.add.ellipse(0, -23, 7, 3, config.accentColor ?? 0xfbbf24);
      container.add([hairBase, bun, clasp]);
    } else if (config.hairStyle === 'fade') {
      // Tunde's clean modern fade
      const hairTop = this.add.ellipse(0, -25, 16, 9, config.hairColor);
      const sideFadeL = this.add.rectangle(-10, -21, 3, 7, config.hairColor, 0.6);
      const sideFadeR = this.add.rectangle(10, -21, 3, 7, config.hairColor, 0.6);
      container.add([hairTop, sideFadeL, sideFadeR]);
    } else if (config.hairStyle === 'crop') {
      // Kelechi's textured afro crop
      const crop = this.add.circle(0, -24, 10, config.hairColor);
      container.add(crop);
    } else if (config.hairStyle === 'gele') {
      // Ngozi's vibrant emerald Nigerian Gele / headwrap
      const geleBase = this.add.ellipse(0, -24, 25, 12, config.accentColor ?? 0x047857);
      const geleFold1 = this.add.ellipse(0, -26, 22, 9, 0x065f46);
      const geleFold2 = this.add.ellipse(0, -28, 18, 7, 0x059669);
      const geleBand = this.add.line(0, 0, -11, -21, 11, -21, 0xfbbf24).setLineWidth(2);
      container.add([geleBase, geleFold1, geleFold2, geleBand]);
    } else if (config.hairStyle === 'parted') {
      // Chinedu's executive side-part and mustache
      const hairTop = this.add.ellipse(0, -25, 18, 9, config.hairColor);
      const mustache = this.add.rectangle(0, -11.5, 6, 2, config.hairColor);
      container.add([hairTop, mustache]);
    } else if (config.hairStyle === 'glasses_crop') {
      // Yusuf's neat cropped hair
      const hairTop = this.add.ellipse(0, -24, 17, 8, config.hairColor);
      container.add(hairTop);
    } else if (config.hairStyle === 'ponytail') {
      // Funmi's sleek professional micro-braids
      const hairTop = this.add.arc(0, -19, 11, 170, 370, false, config.hairColor, 1);
      const hairBack = this.add.rectangle(0, -8, 8, 14, config.hairColor);
      const silverClip = this.add.rectangle(0, -14, 9, 2.5, 0xe2e8f0);
      container.add([hairBack, hairTop, silverClip]);
    }

    // 13. Overhead Badge Tag (anchored cleanly above character's head)
    const tag = this.add.text(config.x, config.y - 42, config.nameTag, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: config.tagColor,
      backgroundColor: config.tagBg,
      padding: { x: 7, y: 3 },
    });
    tag.setOrigin(0.5, 0.5);
    tag.setDepth(11);
    tag.setStroke(config.tagBorder, 1.5);

    return { container, torso, tag };
  }

  /**
   * Spawns distinct, cartoon-style Nigerian department representatives at their desks
   * with idle breathing animations and expressive character designs.
   */
  private spawnDepartmentHeads(): void {
    // 1. Tunde Bello (IT Operations Lead) at IT Console (440, 210)
    const tunde = this.createCartoonCharacter({
      x: OfficeScene.TUNDE_HOME_POS.x,
      y: OfficeScene.TUNDE_HOME_POS.y,
      skinTone: 0x5c3317,
      hairStyle: 'fade',
      hairColor: 0x110b07,
      torsoColor: 0x0f172a,
      trouserColor: 0x1e293b,
      accentType: 'lanyard',
      accentColor: 0x0284c7,
      nameTag: `💻 ${STAFF.IT.name} (${STAFF.IT.role})`,
      tagColor: '#38bdf8',
      tagBg: '#0c1e33ee',
      tagBorder: '#0284c7',
    });
    this.tundeContainer = tunde.container;
    this.tundeTag = tunde.tag;

    // Animated message icon above Tunde when he has an unresolved conversation
    this.tundeMessageIcon = this.add.container(
      OfficeScene.TUNDE_HOME_POS.x,
      OfficeScene.TUNDE_HOME_POS.y - 68
    );
    this.tundeMessageIcon.setDepth(12);

    const iconBg = this.add.circle(0, 0, 11, 0x0284c7, 0.95);
    iconBg.setStrokeStyle(1.5, 0x38bdf8);
    const iconText = this.add.text(0, 0, '💬', {
      fontSize: '12px',
    }).setOrigin(0.5, 0.5);
    this.tundeMessageIcon.add([iconBg, iconText]);

    this.tweens.add({
      targets: this.tundeMessageIcon,
      y: '-=5',
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // In-world speech bubble shown when Amaka is near Tunde
    this.tundeSpeechBubble = this.add.container(
      OfficeScene.TUNDE_HOME_POS.x,
      OfficeScene.TUNDE_HOME_POS.y - 102
    );
    this.tundeSpeechBubble.setDepth(16);

    const bubbleBg = this.add
      .rectangle(0, 0, 240, 28, 0xffffff, 0.98)
      .setStrokeStyle(1.5, 0x0284c7);
    bubbleBg.setName('bubbleBg');
    const bubblePointer = this.add.triangle(0, 14, -6, 0, 6, 0, 0, 6, 0xffffff);
    const bubblePointerStroke = this.add.line(0, 14, -6, 0, 0, 6, 0x0284c7).setLineWidth(1.5);
    const bubblePointerStroke2 = this.add.line(0, 14, 6, 0, 0, 6, 0x0284c7).setLineWidth(1.5);
    const bubbleText = this.add.text(0, 0, '“Amaka, do you have a minute?”', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#0f172a',
    }).setOrigin(0.5, 0.5);
    bubbleText.setName('bubbleText');

    this.tundeSpeechBubble.add([
      bubbleBg,
      bubblePointer,
      bubblePointerStroke,
      bubblePointerStroke2,
      bubbleText,
    ]);
    this.tundeSpeechBubble.setVisible(false);

    // Start Tunde's workplace movement routine
    this.startTundeRoutine();

    // 1b. Kelechi Umeh (Systems Engineer) at IT Workstation (280, 140)
    const kelechi = this.createCartoonCharacter({
      x: 280,
      y: 140,
      skinTone: 0x693e20,
      hairStyle: 'crop',
      hairColor: 0x150d08,
      torsoColor: 0x334155,
      trouserColor: 0x475569,
      accentType: 'lanyard',
      accentColor: 0x0284c7,
      nameTag: '🖥️ Kelechi Umeh (Systems)',
      tagColor: '#7dd3fc',
      tagBg: '#0c1e33ee',
      tagBorder: '#0369a1',
    });

    // 2. Ngozi Okafor (Head of People) at HR Desk (1380, 290)
    const ngozi = this.createCartoonCharacter({
      x: 1380,
      y: 290,
      skinTone: 0x935b34,
      hairStyle: 'gele',
      hairColor: 0x1a120b,
      torsoColor: 0x047857,
      trouserColor: 0x064e3b,
      accentType: 'pearls',
      accentColor: 0xfbbf24,
      hasEarrings: true,
      earringColor: 0xfbbf24,
      nameTag: `👥 ${STAFF.HR.name} (${STAFF.HR.role})`,
      tagColor: '#34d399',
      tagBg: '#06281eee',
      tagBorder: '#10b981',
    });

    // 3. Chinedu Eze (Chief Financial Officer) at Finance Desk (800, 800)
    const chinedu = this.createCartoonCharacter({
      x: 800,
      y: 800,
      skinTone: 0x522e1b,
      hairStyle: 'parted',
      hairColor: 0x120c08,
      torsoColor: 0x1e1b4b,
      trouserColor: 0x1e1b4b,
      accentType: 'tie',
      accentColor: 0xf59e0b,
      nameTag: `📊 ${STAFF.FINANCE.name} (${STAFF.FINANCE.role})`,
      tagColor: '#fbbf24',
      tagBg: '#241808ee',
      tagBorder: '#d97706',
    });

    // 3b. Yusuf Ibrahim (Senior Accounts Officer) at Accounts Payable Workstation (680, 990)
    const yusuf = this.createCartoonCharacter({
      x: 680,
      y: 990,
      skinTone: 0x6e3c1b,
      hairStyle: 'glasses_crop',
      hairColor: 0x160e0a,
      torsoColor: 0x60a5fa,
      trouserColor: 0x1e293b,
      accentType: 'tie',
      accentColor: 0x1e293b,
      hasGlasses: true,
      nameTag: '💼 Yusuf Ibrahim (Accounts)',
      tagColor: '#fde68a',
      tagBg: '#241808ee',
      tagBorder: '#b45309',
    });
    // Wire Yusuf's tag and torso for dynamic aftermath updates
    this.tomTag = yusuf.tag;
    this.tomBody = yusuf.torso;

    // 4. Funmi Adeyemi (Legal Counsel & Company Secretary) at Legal Desk (1360, 810)
    const funmi = this.createCartoonCharacter({
      x: 1360,
      y: 810,
      skinTone: 0x5f361f,
      hairStyle: 'ponytail',
      hairColor: 0x140d09,
      torsoColor: 0x312e81,
      trouserColor: 0x1e1b4b,
      accentType: 'brooch',
      accentColor: 0xe2e8f0,
      hasEarrings: true,
      earringColor: 0xe2e8f0,
      nameTag: `⚖️ ${STAFF.LEGAL.name} (${STAFF.LEGAL.role})`,
      tagColor: '#a5b4fc',
      tagBg: '#1e1b4bee',
      tagBorder: '#6366f1',
    });

    // Gentle cartoon breathing / idle bobbing animation for all representatives
    const characters = [
      { container: tunde.container, tag: tunde.tag, delay: 0 },
      { container: kelechi.container, tag: kelechi.tag, delay: 200 },
      { container: ngozi.container, tag: ngozi.tag, delay: 400 },
      { container: chinedu.container, tag: chinedu.tag, delay: 600 },
      { container: yusuf.container, tag: yusuf.tag, delay: 300 },
      { container: funmi.container, tag: funmi.tag, delay: 500 },
    ];

    for (const char of characters) {
      this.tweens.add({
        targets: [char.container, char.tag],
        y: '-=3',
        duration: 1200,
        delay: char.delay,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /**
   * Spawns the player character (Amaka Obi, CCO) as a cartoon figure
   * with dynamic Arcade physics and overhead label.
   */
  private spawnPlayer(x: number, y: number): void {
    // Hidden Arcade physics rectangle body preserving 30x30 collision bounding box
    this.player = this.add.rectangle(x, y, 30, 30, 0x000000, 0);
    this.physics.add.existing(this.player, false);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(30, 30);
    body.setMaxVelocity(this.playerSpeed, this.playerSpeed);
    body.setBounce(0, 0);

    // Amaka Obi's cartoon visual container
    this.playerVisuals = this.add.container(x, y);
    this.playerVisuals.setDepth(10);

    // Soft drop shadow beneath feet
    const shadow = this.add.ellipse(0, 15, 26, 10, 0x000000, 0.28);
    this.playerVisuals.add(shadow);

    // Cartoon Sprite (Amaka Obi)
    this.playerSprite = this.add.sprite(0, 15, 'amaka_front');
    this.playerSprite.setOrigin(0.5, 0.98);
    this.playerSprite.setDisplaySize(34, 74);
    this.playerVisuals.add(this.playerSprite);
    this.currentFacing = 'front';
    this.lastMoveTime = this.time.now;

    // Overhead player tag
    this.playerTag = this.add.text(x, y - 62, `${PLAYER.name.toUpperCase()} (CCO)`, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#f8fafc',
      backgroundColor: '#0f172acc',
      padding: { x: 6, y: 3 },
    });
    this.playerTag.setOrigin(0.5, 0.5);
    this.playerTag.setDepth(12);
    this.playerTag.setStroke('#38bdf8', 1.5);
  }

  /**
   * Sets Amaka's current facing direction texture ('front', 'right', 'back', 'left').
   */
  private setPlayerFacing(direction: 'front' | 'right' | 'back' | 'left'): void {
    if (this.currentFacing !== direction && this.playerSprite) {
      this.currentFacing = direction;
      this.playerSprite.setTexture(`amaka_${direction}`);
      this.playerSprite.setDisplaySize(34, 74);
    }
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
    this.cursors = this.input.keyboard.addKeys(
      {
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      },
      false
    ) as Phaser.Types.Input.Keyboard.CursorKeys;

    this.wasd = this.input.keyboard.addKeys(
      {
        w: Phaser.Input.Keyboard.KeyCodes.W,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        d: Phaser.Input.Keyboard.KeyCodes.D,
      },
      false
    ) as MovementKeys;

    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false);

    // Disable all global captures so Space, Arrows, and Letters behave naturally in the browser
    this.input.keyboard.disableGlobalCapture();
    this.input.keyboard.clearCaptures();

    // Wrap Phaser KeyboardManager listeners to intercept modifier shortcuts & input fields
    const manager = this.input.keyboard.manager as
      | (Phaser.Input.Keyboard.KeyboardManager & {
          target?: EventTarget;
          onKeyDown?: (event: KeyboardEvent) => void;
          onKeyUp?: (event: KeyboardEvent) => void;
        })
      | undefined;

    if (
      manager &&
      manager.target &&
      typeof manager.onKeyDown === 'function' &&
      typeof manager.onKeyUp === 'function'
    ) {
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
   * Creates upscale corporate suite plaques and corridor wayfinding signs
   * to replace plain technical diagram headers.
   */
  private buildWorldLabels(): void {
    const textStyle = {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    };

    // Helper to render an elegant acrylic door plaque above each department suite
    const createSuitePlaque = (
      x: number,
      y: number,
      width: number,
      suiteCode: string,
      title: string,
      subtitle: string,
      accentColor: number,
      textColor: string
    ) => {
      const plaque = this.add.container(x, y);
      plaque.setDepth(6);

      // Subtle drop shadow behind plaque
      const shadow = this.add
        .rectangle(0, 3, width, 40, 0x000000, 0.14);

      const bg = this.add
        .rectangle(0, 0, width, 40, 0x1e293b, 0.95)
        .setStrokeStyle(1.5, accentColor);
      const titleText = this.add
        .text(-width / 2 + 12, -10, `${suiteCode} · ${title}`, {
          ...textStyle,
          fontSize: '13px',
          fontStyle: 'bold',
          color: textColor,
        })
        .setOrigin(0, 0);
      const subText = this.add
        .text(-width / 2 + 12, 6, subtitle, {
          ...textStyle,
          fontSize: '10px',
          color: '#94a3b8',
        })
        .setOrigin(0, 0);

      plaque.add([shadow, bg, titleText, subText]);
    };

    // 1. IT Operations Suite Plaque
    createSuitePlaque(
      210,
      95,
      270,
      'SUITE 101',
      'IT OPERATIONS',
      'Cloud Architecture & Security Systems',
      0x0284c7,
      '#38bdf8'
    );

    // 2. People & Culture Suite Plaque
    createSuitePlaque(
      1210,
      95,
      270,
      'SUITE 102',
      'PEOPLE & CULTURE',
      'Talent, Morale & Internal Operations',
      0x10b981,
      '#34d399'
    );

    // 3. Treasury & Finance Suite Plaque
    createSuitePlaque(
      600,
      735,
      290,
      'SUITE 201',
      'TREASURY & FINANCE',
      'Capital Runway, Accounts Payable & Audit',
      0xd97706,
      '#fbbf24'
    );

    // 4. Legal & Regulatory Suite Plaque
    createSuitePlaque(
      1330,
      735,
      280,
      'SUITE 202',
      'LEGAL & COMPLIANCE',
      'Corporate Governance & Statutory Duties',
      0x6366f1,
      '#a5b4fc'
    );

    // Corridor Directional Signage (clean frosted white pill for crisp contrast against light floor)
    this.add
      .text(800, 220, '← IT OPERATIONS    |    MAIN LOBBY    |    PEOPLE & TALENT →', {
        ...textStyle,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#334155',
        backgroundColor: '#ffffffea',
        padding: { x: 14, y: 5 },
      })
      .setOrigin(0.5, 0.5)
      .setStroke('#cbd5e1', 1);

    this.add
      .text(800, 640, '↓ TREASURY & FINANCE    |    LEGAL & REGULATORY →', {
        ...textStyle,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#334155',
        backgroundColor: '#ffffffea',
        padding: { x: 14, y: 5 },
      })
      .setOrigin(0.5, 0.5)
      .setStroke('#cbd5e1', 1);

    // Fixed Controls Pill (HUD instruction)
    const controlsText = this.add.text(
      16,
      75,
      'Move: [W][A][S][D] / Arrows  |  Interact: [E] or [Space]',
      {
        ...textStyle,
        fontSize: '11px',
        color: '#e2e8f0',
        backgroundColor: '#0f172ae6',
        padding: { x: 8, y: 5 },
      }
    );
    controlsText.setScrollFactor(0);
    controlsText.setDepth(100);
  }
}
