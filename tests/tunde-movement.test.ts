/**
 * Mustarred Company Simulator - Tunde Bello Movement Routine Test Suite
 *
 * Verifies:
 * 1. Routine coordinates and geometry safety (no collision with IT desks, racks, walls, or characters).
 * 2. Routine state machine transitions (AT_HOME -> WALKING_TO_SECONDARY -> AT_SECONDARY -> WALKING_TO_HOME -> AT_HOME).
 * 3. Smooth position interpolation along walkable clearance aisle (440, 210) <-> (370, 210).
 * 4. Overhead UI synchronization: Tag, Message Icon, and Speech Bubble follow live position.
 * 5. Proximity detection dynamically tracks live position (not a hardcoded coordinate).
 * 6. Stopping during conversations / modals: freezes immediately on lock and resumes on unlock.
 * 7. Emergency safety: routine halts during emergency evacuations.
 * 8. Static code audit of OfficeScene.ts ensuring all required methods and constants are wired.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// SIMULATED TUNDE MOVEMENT ROUTINE HARNESS
// ============================================================================

export type TundeRoutineState =
  | 'AT_HOME'
  | 'WALKING_TO_SECONDARY'
  | 'AT_SECONDARY'
  | 'WALKING_TO_HOME';

interface ITObstacle {
  name: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const IT_OBSTACLES: readonly ITObstacle[] = [
  // Server Racks (West)
  { name: 'Server Rack 1', minX: 88, maxX: 132, minY: 105, maxY: 175 },
  { name: 'Server Rack 2', minX: 88, maxX: 132, minY: 195, maxY: 265 },
  { name: 'Server Rack 3', minX: 88, maxX: 132, minY: 285, maxY: 355 },
  // Upper Workstation (Kelechi)
  { name: 'Upper Workstation Desk', minX: 225, maxX: 335, minY: 155, maxY: 195 },
  // Lower Workstation (Phishing Incident)
  { name: 'Lower Workstation Desk', minX: 220, maxX: 340, minY: 295, maxY: 345 },
  // Central Ops Console
  { name: 'Central Ops Console', minX: 415, maxX: 465, minY: 248, maxY: 292 },
  // Perimeter North Wall
  { name: 'North Perimeter Wall', minX: 0, maxX: 1600, minY: 0, maxY: 24 },
  // East Partition Wall (upper section)
  { name: 'East Wall Top', minX: 540, maxX: 560, minY: 20, maxY: 200 },
  // East Partition Wall (lower section)
  { name: 'East Wall Bottom', minX: 540, maxX: 560, minY: 340, maxY: 500 },
  // South Partition Wall
  { name: 'South Wall', minX: 20, maxX: 540, minY: 480, maxY: 500 },
  // IT Suite North Boundary Partitions (seals out-of-bounds space behind furniture)
  { name: 'IT North Wall Aisle', minX: 335, maxX: 550, minY: 160, maxY: 190 },
  { name: 'IT North Wall Rack', minX: 132, maxX: 225, minY: 145, maxY: 175 },
  { name: 'IT North Wall West Rack', minX: 20, maxX: 132, minY: 145, maxY: 175 },
];

const ALL_OFFICE_OBSTACLES: readonly ITObstacle[] = [
  ...IT_OBSTACLES,
  // Lobby Corridor North Wall (connects IT doorway top at x=550 to HR doorway top at x=1050)
  { name: 'Lobby Corridor North Wall', minX: 550, maxX: 1050, minY: 170, maxY: 200 },
  // HR West Wall (upper section)
  { name: 'HR West Wall Top', minX: 1040, maxX: 1060, minY: 20, maxY: 200 },
  // HR West Wall (lower section)
  { name: 'HR West Wall Bottom', minX: 1040, maxX: 1060, minY: 340, maxY: 500 },
  // HR Suite North Boundary Wall
  { name: 'HR North Wall', minX: 1050, maxX: 1588, minY: 160, maxY: 190 },
];

/**
 * Simulates Arcade Physics step-by-step rectangular body movement with axis-aligned
 * collision separation against static obstacles (matches Phaser 3 Arcade Physics).
 */
function simulatePlayerMovementStep(
  currentPos: { x: number; y: number },
  dx: number,
  dy: number,
  speed: number,
  dtSeconds: number,
  obstacles: readonly ITObstacle[],
  halfSize = 15
): { x: number; y: number; collidedX: boolean; collidedY: boolean } {
  let newX = currentPos.x;
  let newY = currentPos.y;
  let collidedX = false;
  let collidedY = false;

  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return { x: newX, y: newY, collidedX, collidedY };
  }

  const scale = length > 1 ? 1 / length : 1;
  const vx = dx * scale * speed;
  const vy = dy * scale * speed;

  // 1. Horizontal movement and separation
  newX += vx * dtSeconds;
  for (const obs of obstacles) {
    const pMinX = newX - halfSize;
    const pMaxX = newX + halfSize;
    const pMinY = currentPos.y - halfSize;
    const pMaxY = currentPos.y + halfSize;

    if (pMaxX > obs.minX && pMinX < obs.maxX && pMaxY > obs.minY && pMinY < obs.maxY) {
      collidedX = true;
      if (vx > 0) {
        newX = obs.minX - halfSize;
      } else if (vx < 0) {
        newX = obs.maxX + halfSize;
      }
    }
  }

  // 2. Vertical movement and separation
  newY += vy * dtSeconds;
  for (const obs of obstacles) {
    const pMinX = newX - halfSize;
    const pMaxX = newX + halfSize;
    const pMinY = newY - halfSize;
    const pMaxY = newY + halfSize;

    if (pMaxX > obs.minX && pMinX < obs.maxX && pMaxY > obs.minY && pMinY < obs.maxY) {
      collidedY = true;
      if (vy > 0) {
        newY = obs.minY - halfSize;
      } else if (vy < 0) {
        newY = obs.maxY + halfSize;
      }
    }
  }

  return { x: newX, y: newY, collidedX, collidedY };
}

class SimulatedTundeRoutine {
  public static readonly HOME_POS = { x: 440, y: 210 } as const;
  public static readonly SECONDARY_POS = { x: 370, y: 210 } as const;
  public static readonly WALK_DURATION_MS = 2000;
  public static readonly HOME_WAIT_MS = 9000;
  public static readonly SECONDARY_WAIT_MS = 4000;

  public x: number = SimulatedTundeRoutine.HOME_POS.x;
  public y: number = SimulatedTundeRoutine.HOME_POS.y;
  public state: TundeRoutineState = 'AT_HOME';
  public isPaused: boolean = false;
  public isMovementLocked: boolean = false;
  public isEmergencyActive: boolean = false;

  // Attached UI object positions
  public tagX: number = SimulatedTundeRoutine.HOME_POS.x;
  public tagY: number = SimulatedTundeRoutine.HOME_POS.y - 42;
  public messageIconX: number = SimulatedTundeRoutine.HOME_POS.x;
  public messageIconY: number = SimulatedTundeRoutine.HOME_POS.y - 68;
  public speechBubbleX: number = SimulatedTundeRoutine.HOME_POS.x;
  public speechBubbleY: number = SimulatedTundeRoutine.HOME_POS.y - 102;

  // Internal interpolation simulation
  public walkProgress: number = 0; // 0 to 1
  public waitTimerRemainingMs: number = SimulatedTundeRoutine.HOME_WAIT_MS;

  public syncUI(): void {
    this.tagX = this.x;
    this.tagY = this.y - 42;
    this.messageIconX = this.x;
    this.messageIconY = this.y - 68;
    this.speechBubbleX = this.x;
    this.speechBubbleY = this.y - 102;
  }

  public pauseRoutine(): void {
    this.isPaused = true;
  }

  public resumeRoutine(): void {
    if (this.isMovementLocked || this.isEmergencyActive) {
      return;
    }
    this.isPaused = false;
  }

  public setMovementLocked(locked: boolean): void {
    this.isMovementLocked = locked;
    if (locked) {
      this.pauseRoutine();
    } else {
      this.resumeRoutine();
    }
  }

  public getIsNearTunde(playerX: number, playerY: number, speakingRadius: number = 115): boolean {
    const dist = Math.hypot(playerX - this.x, playerY - this.y);
    return dist <= speakingRadius;
  }

  public advanceRoutine(): void {
    if (this.isPaused || this.isMovementLocked || this.isEmergencyActive) {
      return;
    }

    if (this.state === 'AT_HOME') {
      this.state = 'WALKING_TO_SECONDARY';
      this.walkProgress = 0;
    } else if (this.state === 'WALKING_TO_SECONDARY') {
      this.x = SimulatedTundeRoutine.SECONDARY_POS.x;
      this.y = SimulatedTundeRoutine.SECONDARY_POS.y;
      this.syncUI();
      this.state = 'AT_SECONDARY';
      this.waitTimerRemainingMs = SimulatedTundeRoutine.SECONDARY_WAIT_MS;
    } else if (this.state === 'AT_SECONDARY') {
      this.state = 'WALKING_TO_HOME';
      this.walkProgress = 0;
    } else if (this.state === 'WALKING_TO_HOME') {
      this.x = SimulatedTundeRoutine.HOME_POS.x;
      this.y = SimulatedTundeRoutine.HOME_POS.y;
      this.syncUI();
      this.state = 'AT_HOME';
      this.waitTimerRemainingMs = SimulatedTundeRoutine.HOME_WAIT_MS;
    }
  }

  public stepTime(deltaMs: number): void {
    if (this.isPaused || this.isMovementLocked || this.isEmergencyActive) {
      return;
    }

    if (this.state === 'AT_HOME' || this.state === 'AT_SECONDARY') {
      this.waitTimerRemainingMs -= deltaMs;
      if (this.waitTimerRemainingMs <= 0) {
        this.advanceRoutine();
      }
    } else if (this.state === 'WALKING_TO_SECONDARY') {
      this.walkProgress = Math.min(1, this.walkProgress + deltaMs / SimulatedTundeRoutine.WALK_DURATION_MS);
      this.x = SimulatedTundeRoutine.HOME_POS.x + (SimulatedTundeRoutine.SECONDARY_POS.x - SimulatedTundeRoutine.HOME_POS.x) * this.walkProgress;
      this.syncUI();
      if (this.walkProgress >= 1) {
        this.advanceRoutine();
      }
    } else if (this.state === 'WALKING_TO_HOME') {
      this.walkProgress = Math.min(1, this.walkProgress + deltaMs / SimulatedTundeRoutine.WALK_DURATION_MS);
      this.x = SimulatedTundeRoutine.SECONDARY_POS.x + (SimulatedTundeRoutine.HOME_POS.x - SimulatedTundeRoutine.SECONDARY_POS.x) * this.walkProgress;
      this.syncUI();
      if (this.walkProgress >= 1) {
        this.advanceRoutine();
      }
    }
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Tunde Bello Workplace Movement Routine (IT Department)', () => {
  describe('Geometry, Route Clearance & Collision Safety', () => {
    it('verifies primary position (440, 210) has clearance from all obstacles', () => {
      const pos = SimulatedTundeRoutine.HOME_POS;
      assert.equal(pos.x, 440);
      assert.equal(pos.y, 210);

      for (const obs of IT_OBSTACLES) {
        const insideX = pos.x >= obs.minX && pos.x <= obs.maxX;
        const insideY = pos.y >= obs.minY && pos.y <= obs.maxY;
        assert.ok(!(insideX && insideY), `Primary position (440, 210) overlaps obstacle ${obs.name}`);
      }
    });

    it('verifies secondary position (370, 210) has clearance from all obstacles', () => {
      const pos = SimulatedTundeRoutine.SECONDARY_POS;
      assert.equal(pos.x, 370);
      assert.equal(pos.y, 210);

      for (const obs of IT_OBSTACLES) {
        const insideX = pos.x >= obs.minX && pos.x <= obs.maxX;
        const insideY = pos.y >= obs.minY && pos.y <= obs.maxY;
        assert.ok(!(insideX && insideY), `Secondary position (370, 210) overlaps obstacle ${obs.name}`);
      }

      // Clearance checks:
      // Upper Workstation ends at x=335 -> clearance = 370 - 335 = 35px
      assert.ok(pos.x - 335 >= 20, 'At least 20px clearance from upper workstation');
      // Console starts at x=415 -> clearance = 415 - 370 = 45px
      assert.ok(415 - pos.x >= 20, 'At least 20px clearance from IT console');
      // Console top edge is at y=248 -> y=210 is 38px clear to the north
      assert.ok(248 - pos.y >= 20, 'Y position is north of IT console obstacle with at least 20px clearance');
    });

    it('verifies 30x30 player body (Amaka) has full collision clearance at Tunde home and secondary positions and along walk path', () => {
      const halfSize = 15;
      const checkBodyAt = (cx: number, cy: number, label: string) => {
        const pMinX = cx - halfSize;
        const pMaxX = cx + halfSize;
        const pMinY = cy - halfSize;
        const pMaxY = cy + halfSize;

        for (const obs of IT_OBSTACLES) {
          const overlap = pMaxX > obs.minX && pMinX < obs.maxX && pMaxY > obs.minY && pMinY < obs.maxY;
          assert.ok(!overlap, `Amaka 30x30 body at ${label} (${cx}, ${cy}) overlaps obstacle ${obs.name}`);
        }
      };

      // 1. Home position (440, 210)
      checkBodyAt(SimulatedTundeRoutine.HOME_POS.x, SimulatedTundeRoutine.HOME_POS.y, 'HOME_POS');

      // 2. Secondary position (370, 210)
      checkBodyAt(SimulatedTundeRoutine.SECONDARY_POS.x, SimulatedTundeRoutine.SECONDARY_POS.y, 'SECONDARY_POS');

      // 3. Along entire walking path (370..440 at y=210)
      for (let x = SimulatedTundeRoutine.SECONDARY_POS.x; x <= SimulatedTundeRoutine.HOME_POS.x; x += 5) {
        checkBodyAt(x, 210, `path x=${x}`);
      }

      // 4. North clearance aisle behind console (y=205..225, x=360..500)
      for (let x = 360; x <= 500; x += 20) {
        for (let y = 205; y <= 225; y += 10) {
          checkBodyAt(x, y, `aisle (${x}, ${y})`);
        }
      }
    });

    it('verifies horizontal straight-line movement path (440, 210) <-> (370, 210) is 100% collision free', () => {
      // Sample 15 points along the path
      for (let x = 370; x <= 440; x += 5) {
        const y = 210;
        for (const obs of IT_OBSTACLES) {
          const insideX = x >= obs.minX && x <= obs.maxX;
          const insideY = y >= obs.minY && y <= obs.maxY;
          assert.ok(
            !(insideX && insideY),
            `Point (${x}, ${y}) on Tunde's walking path overlaps obstacle ${obs.name}`
          );
        }
      }
    });

    it('verifies Tunde does not block the IT doorway (x=550, y=200..340) or incident workstation (280, 332)', () => {
      const home = SimulatedTundeRoutine.HOME_POS;
      const sec = SimulatedTundeRoutine.SECONDARY_POS;

      // Distance to doorway (x=550)
      assert.ok(550 - home.x >= 100, 'Home position leaves open corridor to lobby entrance');
      assert.ok(550 - sec.x >= 150, 'Secondary position leaves open corridor to lobby entrance');

      // Distance to incident workstation beacon (280, 332)
      const distHomeToIncident = Math.hypot(home.x - 280, home.y - 332);
      const distSecToIncident = Math.hypot(sec.x - 280, sec.y - 332);

      assert.ok(distHomeToIncident > 95, 'Home position does not overlap workstation beacon radius');
      assert.ok(distSecToIncident > 95, 'Secondary position does not overlap workstation beacon radius');
    });
  });

  describe('Routine State Machine & Timing Progression', () => {
    it('initialises at AT_HOME with correct coordinates and attached UI anchors', () => {
      const tunde = new SimulatedTundeRoutine();
      assert.equal(tunde.state, 'AT_HOME');
      assert.equal(tunde.x, 440);
      assert.equal(tunde.y, 210);
      assert.equal(tunde.tagX, 440);
      assert.equal(tunde.tagY, 210 - 42);
      assert.equal(tunde.messageIconX, 440);
      assert.equal(tunde.messageIconY, 210 - 68);
      assert.equal(tunde.speechBubbleX, 440);
      assert.equal(tunde.speechBubbleY, 210 - 102);
      assert.equal(tunde.isPaused, false);
    });

    it('remains at home console during the full wait duration (9 seconds)', () => {
      const tunde = new SimulatedTundeRoutine();

      // 5 seconds pass -> still AT_HOME
      tunde.stepTime(5000);
      assert.equal(tunde.state, 'AT_HOME');
      assert.equal(tunde.x, 440);

      // Remaining 4 seconds pass -> transitions to WALKING_TO_SECONDARY
      tunde.stepTime(4001);
      assert.equal(tunde.state, 'WALKING_TO_SECONDARY');
    });

    it('smoothly interpolates position to secondary location (370, 210) over 2 seconds', () => {
      const tunde = new SimulatedTundeRoutine();
      tunde.stepTime(9001); // Trigger walk
      assert.equal(tunde.state, 'WALKING_TO_SECONDARY');

      // 1 second in (50% progress) -> halfway between 440 and 370 = 405
      tunde.stepTime(1000);
      assert.equal(tunde.state, 'WALKING_TO_SECONDARY');
      assert.equal(Math.round(tunde.x), 405);
      assert.equal(Math.round(tunde.tagX), 405);
      assert.equal(Math.round(tunde.messageIconX), 405);
      assert.equal(Math.round(tunde.speechBubbleX), 405);

      // 1 more second (100% progress) -> arrives at secondary position
      tunde.stepTime(1001);
      assert.equal(tunde.state, 'AT_SECONDARY');
      assert.equal(tunde.x, 370);
      assert.equal(tunde.tagX, 370);
      assert.equal(tunde.messageIconX, 370);
      assert.equal(tunde.speechBubbleX, 370);
    });

    it('pauses at secondary location for 4 seconds then walks back to home console', () => {
      const tunde = new SimulatedTundeRoutine();
      // Jump to AT_SECONDARY
      tunde.stepTime(9001); // Start walk
      tunde.stepTime(2001); // Finish walk
      assert.equal(tunde.state, 'AT_SECONDARY');
      assert.equal(tunde.x, 370);

      // 2 seconds at secondary -> still AT_SECONDARY
      tunde.stepTime(2000);
      assert.equal(tunde.state, 'AT_SECONDARY');

      // 2 more seconds -> transitions to WALKING_TO_HOME
      tunde.stepTime(2001);
      assert.equal(tunde.state, 'WALKING_TO_HOME');

      // Walk back halfway (1 sec) -> x = 405
      tunde.stepTime(1000);
      assert.equal(Math.round(tunde.x), 405);

      // Complete walk back (1 sec) -> arrived AT_HOME
      tunde.stepTime(1001);
      assert.equal(tunde.state, 'AT_HOME');
      assert.equal(tunde.x, 440);
    });
  });

  describe('Conversation Non-Interference & Proximity Tracking', () => {
    it('freezes Tunde immediately when a conversation begins or modal opens', () => {
      const tunde = new SimulatedTundeRoutine();
      tunde.stepTime(9001); // Start walking
      tunde.stepTime(1000); // Walk halfway (x = 405)
      assert.equal(Math.round(tunde.x), 405);

      // Amaka presses E/Space -> modal opens and locks movement
      tunde.setMovementLocked(true);
      assert.equal(tunde.isPaused, true);
      const frozenX = tunde.x;

      // Time passes while player reads dialogue (e.g. 5000ms)
      tunde.stepTime(5000);
      assert.equal(tunde.x, frozenX, 'Tunde did not move while movement was locked');
      assert.equal(tunde.state, 'WALKING_TO_SECONDARY');

      // Conversation ends / player closes modal -> movement unlocks
      tunde.setMovementLocked(false);
      assert.equal(tunde.isPaused, false);

      // Tunde resumes walking to target
      tunde.stepTime(1001);
      assert.equal(tunde.state, 'AT_SECONDARY');
      assert.equal(tunde.x, 370);
    });

    it('dynamically tracks proximity relative to Tundes live position', () => {
      const tunde = new SimulatedTundeRoutine();

      // Case 1: Tunde is AT_HOME (440, 210)
      // Amaka is at (440, 280) -> dist = 70px <= 115px -> near
      assert.equal(tunde.getIsNearTunde(440, 280), true);
      // Amaka is at (300, 210) -> dist = 140px > 115px -> not near
      assert.equal(tunde.getIsNearTunde(300, 210), false);

      // Case 2: Tunde walks to AT_SECONDARY (370, 210)
      tunde.stepTime(9001);
      tunde.stepTime(2001);
      assert.equal(tunde.x, 370);

      // Amaka is at (370, 280) -> dist = 70px <= 115px -> near!
      assert.equal(tunde.getIsNearTunde(370, 280), true);
      // Amaka is at (300, 210) -> dist to 370 = 70px <= 115px -> now near!
      assert.equal(tunde.getIsNearTunde(300, 210), true);
      // Amaka is at (500, 210) -> dist to 370 = 130px > 115px -> not near
      assert.equal(tunde.getIsNearTunde(500, 210), false);
    });

    it('does not advance routine during an active emergency', () => {
      const tunde = new SimulatedTundeRoutine();
      tunde.isEmergencyActive = true;
      tunde.pauseRoutine();

      tunde.advanceRoutine();
      assert.equal(tunde.state, 'AT_HOME');

      tunde.stepTime(20000);
      assert.equal(tunde.state, 'AT_HOME');
      assert.equal(tunde.x, 440);
    });
  });

  describe('OfficeScene.ts Source Code Audit', () => {
    it('verifies OfficeScene.ts defines all required constants and routine methods', () => {
      const officeScenePath = path.resolve('src/game/OfficeScene.ts');
      const source = fs.readFileSync(officeScenePath, 'utf-8');

      // Required constants
      assert.ok(source.includes('TUNDE_HOME_POS'), 'Declares TUNDE_HOME_POS');
      assert.ok(source.includes('TUNDE_SECONDARY_POS'), 'Declares TUNDE_SECONDARY_POS');
      assert.ok(source.includes('TUNDE_WALK_DURATION_MS'), 'Declares TUNDE_WALK_DURATION_MS');
      assert.ok(source.includes('TUNDE_HOME_WAIT_MS'), 'Declares TUNDE_HOME_WAIT_MS');
      assert.ok(source.includes('TUNDE_SECONDARY_WAIT_MS'), 'Declares TUNDE_SECONDARY_WAIT_MS');

      // Required methods
      assert.ok(source.includes('startTundeRoutine'), 'Declares startTundeRoutine');
      assert.ok(source.includes('stopTundeRoutine'), 'Declares stopTundeRoutine');
      assert.ok(source.includes('pauseTundeRoutine'), 'Declares pauseTundeRoutine');
      assert.ok(source.includes('resumeTundeRoutine'), 'Declares resumeTundeRoutine');
      assert.ok(source.includes('advanceTundeRoutine'), 'Declares advanceTundeRoutine');
      assert.ok(source.includes('walkTundeToSecondary'), 'Declares walkTundeToSecondary');
      assert.ok(source.includes('arriveTundeAtSecondary'), 'Declares arriveTundeAtSecondary');
      assert.ok(source.includes('walkTundeToHome'), 'Declares walkTundeToHome');
      assert.ok(source.includes('arriveTundeAtHome'), 'Declares arriveTundeAtHome');
      assert.ok(source.includes('getTundePosition'), 'Declares getTundePosition');
      assert.ok(source.includes('getTundeRoutineState'), 'Declares getTundeRoutineState');
      assert.ok(source.includes('getIsTundeRoutinePaused'), 'Declares getIsTundeRoutinePaused');

      // Dynamic proximity checking
      assert.ok(source.includes('const tundePos = this.getTundePosition()'), 'Proximity check uses getTundePosition');
      assert.ok(source.includes('pauseTundeRoutine()'), 'setMovementLocked pauses routine');
      assert.ok(source.includes('resumeTundeRoutine()'), 'setMovementLocked resumes routine');

      // Northern Playable Area Boundary Obstacles
      assert.ok(source.includes('createObstacle(800, 185, 500, 30'), 'Declares Lobby Corridor North Wall');
      assert.ok(source.includes('createObstacle(442.5, 175, 215, 30'), 'Declares IT North Wall Aisle');
      assert.ok(source.includes('createObstacle(178.5, 160, 93, 30'), 'Declares IT North Wall Rack');
      assert.ok(source.includes('createObstacle(76, 160, 112, 30'), 'Declares IT North Wall West Rack');
      assert.ok(source.includes('createObstacle(1319, 175, 538, 30'), 'Declares HR North Wall');
    });
  });

  describe('Office Boundary Movement & Collision Recovery (IT/Lobby Boundary)', () => {
    const SPEED = 220; // Player speed in pixels per second
    const DT = 0.016;  // ~60 FPS time step (16ms)
    const MAX_HUD_HEIGHT = 110; // Maximum HUD height on desktop and mobile viewports

    it('verifies movement from lobby spawn (800, 420) toward IT funnels smoothly through doorway without entering occluded HUD zone', () => {
      let pos = { x: 800, y: 420 };
      const path: Array<{ x: number; y: number }> = [{ ...pos }];

      // Player holds Up-Left toward IT (dx = -1, dy = -1) for 150 frames (~2.4s)
      for (let step = 0; step < 150; step++) {
        const result = simulatePlayerMovementStep(pos, -1, -1, SPEED, DT, ALL_OFFICE_OBSTACLES);
        pos = { x: result.x, y: result.y };
        path.push({ ...pos });
      }

      // 1. Vertical boundary enforcement: Amaka can never penetrate north of corridor or suite boundaries
      for (const p of path) {
        if (p.x >= 550) {
          assert.ok(
            p.y >= 215 - 0.001,
            `In corridor, player y=${p.y} penetrated north of corridor boundary (minimum allowed y=215)`
          );
        } else {
          assert.ok(
            p.y >= 205 - 0.001,
            `In IT department, player y=${p.y} penetrated north of IT suite boundary (minimum allowed y=205)`
          );
        }

        // 2. HUD topbar clearance: Name tag (p.y - 62, top at p.y - 72) must remain below HUD topbar at all times
        const tagTopY = p.y - 72;
        assert.ok(
          tagTopY >= MAX_HUD_HEIGHT,
          `Player overhead UI at y=${tagTopY} is occluded underneath navigation bar (${MAX_HUD_HEIGHT}px)`
        );
      }

      // 3. Smooth sliding: Amaka slides west along corridor, crosses doorway (x=550) into IT suite (x < 550)
      assert.ok(pos.x < 550, `Player at x=${pos.x} did not enter IT department through doorway at x=550`);
      assert.ok(pos.y <= 220, `Player at y=${pos.y} remained in the walkable aisle height`);

      // 4. Proximity to Tunde Bello (440, 210) is achieved
      const distToTunde = Math.hypot(pos.x - 440, pos.y - 210);
      assert.ok(
        distToTunde <= 115,
        `Player at (${pos.x}, ${pos.y}) is within interaction distance of Tunde Bello (dist=${distToTunde} <= 115)`
      );
    });

    it('verifies boundary collision recovery: player pressed against north wall recovers cleanly in all directions', () => {
      // Position player directly against the corridor boundary wall (y=215, wall maxY=200)
      const againstWall = { x: 700, y: 215 };

      // Recovery 1: Pressing Down (S / Down Arrow) immediately moves south away from the wall
      let posDown = { ...againstWall };
      for (let i = 0; i < 10; i++) {
        const res = simulatePlayerMovementStep(posDown, 0, 1, SPEED, DT, ALL_OFFICE_OBSTACLES);
        posDown = { x: res.x, y: res.y };
      }
      assert.ok(posDown.y > 215, `Player did not recover south: y=${posDown.y} <= 215`);
      assert.ok(posDown.y >= 240, `Player did not advance south sufficiently: y=${posDown.y}`);

      // Recovery 2: Pressing Right (D / Right Arrow) slides eastward along the wall without snagging
      let posRight = { ...againstWall };
      for (let i = 0; i < 10; i++) {
        const res = simulatePlayerMovementStep(posRight, 1, 0, SPEED, DT, ALL_OFFICE_OBSTACLES);
        posRight = { x: res.x, y: res.y };
      }
      assert.equal(Math.round(posRight.y), 215, 'Player y remained steady against the wall');
      assert.ok(posRight.x > 700, `Player did not slide east: x=${posRight.x} <= 700`);

      // Recovery 3: Pressing Left (A / Left Arrow) slides westward along the wall toward IT
      let posLeft = { ...againstWall };
      for (let i = 0; i < 10; i++) {
        const res = simulatePlayerMovementStep(posLeft, -1, 0, SPEED, DT, ALL_OFFICE_OBSTACLES);
        posLeft = { x: res.x, y: res.y };
      }
      assert.equal(Math.round(posLeft.y), 215, 'Player y remained steady against the wall');
      assert.ok(posLeft.x < 700, `Player did not slide west: x=${posLeft.x} >= 700`);

      // Recovery 4: Opposing inputs (holding Up then immediately holding Down) does not stick or lock velocity
      let posBounce = { ...againstWall };
      // Push against wall for 5 frames
      for (let i = 0; i < 5; i++) {
        const res = simulatePlayerMovementStep(posBounce, 0, -1, SPEED, DT, ALL_OFFICE_OBSTACLES);
        posBounce = { x: res.x, y: res.y };
      }
      assert.equal(Math.round(posBounce.y), 215, 'Held against wall at y=215');
      // Immediately reverse direction to Down
      const reverseRes = simulatePlayerMovementStep(posBounce, 0, 1, SPEED, DT, ALL_OFFICE_OBSTACLES);
      assert.ok(reverseRes.y > 215, 'Reversed immediately on the very first frame without sticking');
    });

    it('verifies IT suite northern boundary prevents walking north of Tunde or into out-of-bounds space behind furniture', () => {
      // Amaka standing in front of Tunde at (440, 210)
      let pos = { x: 440, y: 210 };

      // Hold Up toward the north wall of IT
      for (let i = 0; i < 20; i++) {
        const res = simulatePlayerMovementStep(pos, 0, -1, SPEED, DT, ALL_OFFICE_OBSTACLES);
        pos = { x: res.x, y: res.y };
      }

      // Stopped at y=205 (IT North Wall Aisle maxY=190 + halfSize=15)
      assert.equal(Math.round(pos.y), 205, 'Player stopped cleanly at y=205 by IT north partition');
      assert.ok(pos.y >= 205, 'Player cannot penetrate north of y=205 in IT');

      // Overhead tag top at y=205 - 72 = 133 is strictly below HUD topbar (110px)
      assert.ok(pos.y - 72 >= MAX_HUD_HEIGHT, 'Player remains visible below HUD even when pushing north in IT');

      // Immediate recovery south toward IT ops console (440, 270)
      for (let i = 0; i < 20; i++) {
        const res = simulatePlayerMovementStep(pos, 0, 1, SPEED, DT, ALL_OFFICE_OBSTACLES);
        pos = { x: res.x, y: res.y };
      }
      assert.ok(pos.y >= 230, `Player recovered south toward console: y=${pos.y}`);
    });

    it('verifies continuous northern boundary protection across the entire world width (x=0..1600)', () => {
      // Sample test points every 50px across the entire office world at y=215
      for (let x = 50; x <= 1550; x += 50) {
        // Verify that a player moving north from y=215 over 50 frames cannot penetrate into the occluded zone (y < 190)
        let testPos = { x, y: 215 };
        for (let step = 0; step < 50; step++) {
          const res = simulatePlayerMovementStep(testPos, 0, -1, SPEED, DT, ALL_OFFICE_OBSTACLES);
          testPos = { x: res.x, y: res.y };
        }
        assert.ok(
          testPos.y >= 190 - 0.001,
          `At x=${x}, player was able to penetrate north to y=${testPos.y} (must be blocked at y >= 190)`
        );
      }
    });

    it('verifies all department interaction points remain 100% accessible and collision-free', () => {
      const halfSize = 15;
      const verifyPointAccessible = (x: number, y: number, name: string) => {
        const pMinX = x - halfSize;
        const pMaxX = x + halfSize;
        const pMinY = y - halfSize;
        const pMaxY = y + halfSize;

        for (const obs of ALL_OFFICE_OBSTACLES) {
          const overlap = pMaxX > obs.minX && pMinX < obs.maxX && pMaxY > obs.minY && pMinY < obs.maxY;
          assert.ok(!overlap, `Interaction access point "${name}" at (${x}, ${y}) overlaps obstacle ${obs.name}`);
        }
      };

      // 1. Tunde Bello consultation positions
      verifyPointAccessible(440, 210, 'Tunde Home Position');
      verifyPointAccessible(370, 210, 'Tunde Secondary Position');

      // 2. Incident Workstation Beacon consultation position (IT)
      // Player stands adjacent to workstation at (280, 360) (beacon is at 280, 332, radius=95)
      verifyPointAccessible(280, 365, 'IT Incident Workstation Player Stand');
      const distToWorkstation = Math.hypot(280 - 280, 365 - 332);
      assert.ok(distToWorkstation <= 95, `Player at (280, 365) is within 95px radius of workstation beacon`);

      // 3. Lobby corridor signage & spawn point
      verifyPointAccessible(800, 420, 'Lobby Player Spawn');
      verifyPointAccessible(800, 235, 'Corridor Signage Stand');

      // 4. IT and HR Doorway centers
      verifyPointAccessible(550, 270, 'IT Doorway Center');
      verifyPointAccessible(1050, 270, 'HR Doorway Center');
    });
  });
});
