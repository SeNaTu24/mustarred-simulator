import Phaser from 'phaser';

/**
 * Keyboard keys used for 8-directional movement.
 */
interface MovementKeys {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
}

/**
 * Top-down 2D office environment featuring three distinct departments:
 * IT (Infrastructure/Security), HR (People/Operations), and Finance (Capital/Treasury).
 */
export class OfficeScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerTag!: Phaser.GameObjects.Text;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: MovementKeys;

  /** Player movement speed in pixels per second */
  private readonly playerSpeed: number = 220;

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

    // 7. Spawn player avatar in the central atrium
    this.spawnPlayer(800, 420);

    // 8. Register collisions between dynamic player and static obstacles
    this.physics.add.collider(this.player, this.obstacles);

    // 9. Configure smooth camera tracking within world boundaries
    this.cameras.main.setBounds(0, 0, OfficeScene.WORLD_WIDTH, OfficeScene.WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.0);

    // 10. Register keyboard input listeners (WASD + Arrow keys)
    this.setupInput();

    // 11. Add in-world controls & title overlay
    this.buildWorldLabels();
  }

  public override update(): void {
    if (!this.player || !this.player.body) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
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

    // Normalize diagonal movement vector so diagonal travel matches linear speed
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      const vx = (dx / length) * this.playerSpeed;
      const vy = (dy / length) * this.playerSpeed;
      body.setVelocity(vx, vy);
    } else {
      body.setVelocity(0, 0);
    }

    // Keep the overhead label anchored to the player avatar
    if (this.playerTag) {
      this.playerTag.setPosition(this.player.x, this.player.y - 26);
    }
  }

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

    // Central Atrium / Corridor floor accent (slate-800)
    gfx.fillStyle(0x1e293b, 0.85);
    gfx.fillRect(560, 100, 480, 580);

    // Decorative lobby floor rug
    gfx.fillStyle(0x334155, 0.6);
    gfx.fillRoundedRect(680, 320, 240, 200, 12);
    gfx.lineStyle(2, 0x64748b, 0.7);
    gfx.strokeRoundedRect(680, 320, 240, 200, 12);

    // --- Department Zones ---

    // 1. IT Department (Northwest Wing: x: 60..540, y: 60..480)
    gfx.fillStyle(0x0c1e33, 0.95);
    gfx.fillRoundedRect(60, 60, 480, 420, 16);
    gfx.lineStyle(3, 0x0284c7, 0.9);
    gfx.strokeRoundedRect(60, 60, 480, 420, 16);

    // 2. HR Department (Northeast Wing: x: 1060..1540, y: 60..480)
    gfx.fillStyle(0x06281e, 0.95);
    gfx.fillRoundedRect(1060, 60, 480, 420, 16);
    gfx.lineStyle(3, 0x10b981, 0.9);
    gfx.strokeRoundedRect(1060, 60, 480, 420, 16);

    // 3. Finance Department (South Wing: x: 440..1160, y: 700..1140)
    gfx.fillStyle(0x241808, 0.95);
    gfx.fillRoundedRect(440, 700, 720, 440, 16);
    gfx.lineStyle(3, 0xf59e0b, 0.9);
    gfx.strokeRoundedRect(440, 700, 720, 440, 16);
  }

  /**
   * Builds the perimeter walls and internal partition walls.
   */
  private buildWalls(): void {
    const wallColor = 0x1e293b;
    const strokeColor = 0x475569;

    // Perimeter boundary walls
    // Top
    this.createObstacle(800, 12, OfficeScene.WORLD_WIDTH, 24, wallColor, strokeColor);
    // Bottom
    this.createObstacle(800, 1188, OfficeScene.WORLD_WIDTH, 24, wallColor, strokeColor);
    // Left
    this.createObstacle(12, 600, 24, OfficeScene.WORLD_HEIGHT, wallColor, strokeColor);
    // Right
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
    this.createObstacle(1370, 690, 420, 20, wallColor, strokeColor);
  }

  /**
   * Places identifiable desks, server racks, meeting furniture, and plants.
   */
  private buildFurniture(): void {
    // --- IT Department Furniture ---
    // 3 Server Racks (tall, high-security infrastructure)
    this.createObstacle(110, 140, 44, 70, 0x0f172a, 0x0284c7, 2);
    this.createObstacle(110, 230, 44, 70, 0x0f172a, 0x0284c7, 2);
    this.createObstacle(110, 320, 44, 70, 0x0f172a, 0x0284c7, 2);

    // Server rack status indicators (visual LEDs)
    const itLeds = this.add.graphics();
    itLeds.fillStyle(0x22c55e, 1);
    itLeds.fillRect(100, 125, 4, 4);
    itLeds.fillRect(115, 125, 4, 4);
    itLeds.fillRect(100, 215, 4, 4);
    itLeds.fillRect(115, 215, 4, 4);
    itLeds.fillStyle(0x38bdf8, 1);
    itLeds.fillRect(100, 305, 4, 4);
    itLeds.fillRect(115, 305, 4, 4);

    // IT Workstations (Desks with monitors)
    this.createObstacle(280, 180, 120, 50, 0x1e293b, 0x38bdf8);
    this.createObstacle(280, 320, 120, 50, 0x1e293b, 0x38bdf8);

    // Dual monitors on IT desks
    this.add.rectangle(260, 180, 26, 12, 0x0284c7).setStrokeStyle(1, 0xffffff);
    this.add.rectangle(300, 180, 26, 12, 0x0284c7).setStrokeStyle(1, 0xffffff);
    this.add.rectangle(260, 320, 26, 12, 0x0284c7).setStrokeStyle(1, 0xffffff);
    this.add.rectangle(300, 320, 26, 12, 0x0284c7).setStrokeStyle(1, 0xffffff);

    // IT Central Ops Console
    this.createObstacle(440, 250, 60, 60, 0x0f172a, 0x38bdf8, 2);
    this.add.rectangle(440, 250, 36, 36, 0x0369a1);

    // --- HR Department Furniture ---
    // Meeting Lounge Sofa
    this.createObstacle(1220, 160, 140, 44, 0x064e3b, 0x10b981, 2);

    // Coffee / Consultation Table
    this.createObstacle(1220, 240, 80, 50, 0x1f2937, 0x10b981);

    // HR Desks (People Operations team)
    this.createObstacle(1380, 330, 120, 50, 0x1e293b, 0x10b981);
    this.add.rectangle(1380, 330, 30, 16, 0x10b981).setStrokeStyle(1, 0xffffff);

    // Water Cooler (meeting fixture)
    this.createObstacle(1470, 150, 32, 32, 0xe2e8f0, 0x38bdf8);
    this.add.circle(1470, 150, 10, 0x38bdf8);

    // Potted Office Plants
    this.createObstacle(1095, 140, 30, 30, 0x78350f, 0x22c55e);
    this.add.circle(1095, 140, 11, 0x22c55e);
    this.createObstacle(1470, 420, 30, 30, 0x78350f, 0x22c55e);
    this.add.circle(1470, 420, 11, 0x22c55e);

    // --- Finance Department Furniture ---
    // Grand Executive Oak Desk
    this.createObstacle(800, 850, 180, 60, 0x78350f, 0xf59e0b, 2);
    this.add.rectangle(800, 850, 40, 16, 0xfbbf24).setStrokeStyle(1, 0xffffff);

    // Filing Cabinets (Audit & Financial records)
    this.createObstacle(540, 800, 46, 80, 0x334155, 0x94a3b8);
    this.createObstacle(540, 920, 46, 80, 0x334155, 0x94a3b8);

    // Heavy Treasury Safe / Vault
    this.createObstacle(1060, 810, 64, 64, 0x0f172a, 0xf59e0b, 2);
    this.add.circle(1060, 810, 14, 0xf59e0b);

    // Financial Analyst Workstations
    this.createObstacle(680, 1030, 120, 50, 0x1e293b, 0xf59e0b);
    this.add.rectangle(680, 1030, 32, 14, 0xf59e0b).setStrokeStyle(1, 0xffffff);
    this.createObstacle(920, 1030, 120, 50, 0x1e293b, 0xf59e0b);
    this.add.rectangle(920, 1030, 32, 14, 0xf59e0b).setStrokeStyle(1, 0xffffff);

    // --- Central Atrium Furniture ---
    // Reception / Directory Desk
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
   * Spawns the player character with dynamic Arcade physics and overhead label.
   */
  private spawnPlayer(x: number, y: number): void {
    // Player avatar: 32x32 bright blue square with a crisp white border
    this.player = this.add.rectangle(x, y, 32, 32, 0x38bdf8);
    this.player.setStrokeStyle(2, 0xffffff);
    this.player.setDepth(10);

    // Inner marker indicating character avatar focus
    const innerFace = this.add.rectangle(0, 0, 12, 12, 0x0284c7);
    innerFace.setStrokeStyle(1, 0xffffff);
    innerFace.setDepth(11);

    // Keep the inner face centered on player
    this.events.on('postupdate', () => {
      innerFace.setPosition(this.player.x, this.player.y);
    });

    // Enable dynamic arcade physics body
    this.physics.add.existing(this.player, false);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(30, 30);

    // Overhead tag: "YOU (CEO)"
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
   * Sets up WASD and Cursor key input listeners.
   */
  private setupInput(): void {
    if (!this.input.keyboard) {
      throw new Error('Keyboard plugin is not enabled');
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys;
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

    // HR Department Label (Northeast)
    this.add.text(1100, 80, '👥 HR DEPARTMENT', {
      ...textStyle,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#34d399',
    });
    this.add.text(1100, 108, 'People, Morale & Talent Retention', {
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
    this.add.text(480, 748, 'Treasury, Debt Amortization & Cash Runway', {
      ...textStyle,
      fontSize: '12px',
      color: '#94a3b8',
    });

    // Corridor Directional Signage
    this.add.text(800, 220, '← IT WING    |    CENTRAL ATRIUM    |    HR WING →', {
      ...textStyle,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#64748b',
    }).setOrigin(0.5, 0.5);

    this.add.text(800, 640, '↓ FINANCE WING (TREASURY)', {
      ...textStyle,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#64748b',
    }).setOrigin(0.5, 0.5);

    // Fixed Controls Pill (HUD instruction)
    const controlsText = this.add.text(16, 16, 'Controls: [W][A][S][D] or Arrow Keys to move', {
      ...textStyle,
      fontSize: '12px',
      color: '#e2e8f0',
      backgroundColor: '#0f172ae6',
      padding: { x: 10, y: 6 },
    });
    controlsText.setScrollFactor(0);
    controlsText.setDepth(100);
  }
}
