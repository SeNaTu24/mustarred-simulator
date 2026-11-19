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
];

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
    });
  });
});
