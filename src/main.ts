/**
 * Mustarred Company Simulator - Main Entry Point & Orchestrator
 *
 * Connects the headless CompanySimulation engine, the Phaser 2D OfficeScene,
 * and the DOM-based UIManager into a unified, responsive interactive application.
 */

import Phaser from 'phaser';
import { CompanySimulation } from './simulation/CompanySimulation.ts';
import { PHISHING_SCENARIO } from './simulation/phishingIncident.data.ts';
import type { DepartmentKey } from './game/OfficeScene.ts';
import { OfficeScene } from './game/OfficeScene.ts';
import { UIManager } from './ui/UIManager.ts';
import { buildCrossDeptReaction } from './ui/commsData.ts';
import { buildPhishingReactions } from './ui/phishingComms.ts';
import './style.css';

// 1. Instantiate the authoritative headless simulation engine with the Phishing vertical slice
let sim = new CompanySimulation(PHISHING_SCENARIO);
let lastChoiceId: string | null = null;

// 2. Instantiate the office world scene
const officeScene = new OfficeScene();

// 3. Forward declarations for orchestrator handlers
let handleOpenIncident: () => void;
let handleSelectChoice: (choiceId: string, additionalInstructions?: string) => void;
let handleDismissResolution: () => void;
let handleRestartSimulation: () => void;

// 4. Instantiate the DOM UI manager with event callbacks
const ui = new UIManager({
  onSelectChoice: (choiceId: string, additionalInstructions?: string) => {
    handleSelectChoice(choiceId, additionalInstructions);
  },
  onDismissResolution: () => {
    handleDismissResolution();
  },
  onRestart: () => {
    handleRestartSimulation();
  },
  onPromptInteract: () => {
    handleOpenIncident();
  },
  onStepAway: () => {
    officeScene.setMovementLocked(false);
  },
  onVirtualMove: (dx: number, dy: number) => {
    officeScene.setVirtualMovement(dx, dy);
  },
  onVirtualInteract: () => {
    const handled = officeScene.triggerInteractionAction();
    if (!handled && officeScene.getIsPlayerInRange()) {
      handleOpenIncident();
    }
  },
});

// 5. Wire OfficeScene proximity and keyboard interaction callbacks
officeScene.onProximityEnter = (dept: DepartmentKey) => {
  const incident = sim.getActiveIncident();
  if (incident && incident.department === dept) {
    ui.showInteractionPrompt(dept, incident.title);
  }
};

officeScene.onProximityExit = () => {
  ui.hideInteractionPrompt();
};

officeScene.onInteract = (_dept: DepartmentKey) => {
  handleOpenIncident();
};

// ============================================================================
// ORCHESTRATION HANDLERS
// ============================================================================

handleOpenIncident = () => {
  const incident = sim.getActiveIncident();
  if (!incident) {
    return;
  }

  // Freeze character movement while decision modal is open
  officeScene.setMovementLocked(true);
  ui.hideInteractionPrompt();

  // Retrieve dynamically evaluated choices with active modifier locks and deltas
  const choices = sim.getEvaluatedChoices();
  ui.showIncidentModal(incident, choices);
};

handleSelectChoice = (choiceId: string, _additionalInstructions?: string) => {
  lastChoiceId = choiceId;
  const result = sim.resolveDecision(choiceId);

  if (!result.success) {
    console.warn('[Orchestrator] Decision rejected by simulation engine:', result.message);
    return;
  }

  // If this is the Phishing incident, build full cross-department reaction package
  if (choiceId.startsWith('CHOICE_PHISH_')) {
    const pkg = buildPhishingReactions(choiceId);

    // Dispatch all 4 departmental reactions (IT, Finance, HR, Legal) into the Comms Hub
    pkg.reactions.forEach((reaction) => {
      ui.addCrossDeptReaction(reaction);
    });

    // Update executive HUD with post-decision financial & metric state
    ui.updateHUD(result.updatedState);

    // Present resolution aftermath modal showing executive summary and cross-department memos
    ui.showResolutionModal(
      result.record,
      result.nextPhase,
      sim.getState().isInsolvent,
      pkg.reactions
    );
  } else {
    // Fallback for multi-turn scenarios
    const reaction = buildCrossDeptReaction(choiceId, result.record, result.updatedState);
    if (reaction) {
      ui.addCrossDeptReaction(reaction);
    }
    ui.updateHUD(result.updatedState);
    ui.showResolutionModal(
      result.record,
      result.nextPhase,
      sim.getState().isInsolvent,
      reaction
    );
  }
};

handleDismissResolution = () => {
  ui.hideIncidentModal();

  const state = sim.getState();

  // Check for fatal conditions: insolvency or catastrophic collapse (grade F)
  if (state.isInsolvent || (state.phase === 'SIMULATION_COMPLETED' && state.metrics.grade === 'F')) {
    officeScene.setActiveDepartment(null);
    officeScene.setMovementLocked(true);
    officeScene.triggerEmergencyAlert();

    if (state.isInsolvent) {
      ui.showGameOver(
        'ENTERPRISE BANKRUPTCY',
        'The board would like a word. Unfortunately, there is no board anymore.',
        'Cash reserves fell below zero during monthly settlement. Paychecks bounced, vendors cut service, and the company was forced into immediate liquidation.',
        sim.getDecisionHistory()
      );
    } else {
      ui.showGameOver(
        'ORGANIZATIONAL COLLAPSE',
        'Company status: Out of business. Your former engineers are venting on Hacker News.',
        'Severe developer burnout, broken compensation trust, and aggressive austerity reduced team morale to 10/100 and platform stability to 15/100, triggering an irreversible engineering walkout and platform outage.',
        sim.getDecisionHistory()
      );
    }
    return;
  }

  // Phishing Incident Vertical Slice Completion: Return to office & observe company state
  if (lastChoiceId && lastChoiceId.startsWith('CHOICE_PHISH_')) {
    // 1. Restore player movement to allow exploring the changed office
    officeScene.setMovementLocked(false);

    // 2. Transition IT beacon to calm resolved state
    officeScene.setDepartmentResolved('IT', 'Threat Neutralized');

    // 3. Fire sequential toast alerts across IT, Finance, HR, Legal
    const pkg = buildPhishingReactions(lastChoiceId);
    ui.showSequentialToasts(pkg.toastAlerts);

    // 4. Inject debrief button into HUD so player can open performance report at will
    ui.showDebriefButton(() => {
      officeScene.setMovementLocked(true);
      const report = sim.generatePerformanceReport();
      ui.showPerformanceReport(report);
    });

    return;
  }

  // If simulation reached final turn and survived (grades A, B, C, D)
  if (state.phase === 'SIMULATION_COMPLETED') {
    officeScene.setActiveDepartment(null);
    officeScene.setMovementLocked(true);
    const report = sim.generatePerformanceReport();
    ui.showPerformanceReport(report);
    return;
  }

  // Advance active department beacon to match current turn's active incident
  const nextIncident = sim.getActiveIncident();
  const nextDept = (nextIncident?.department as DepartmentKey) ?? null;
  officeScene.setActiveDepartment(nextDept);

  if (nextIncident) {
    ui.notifyNewIncident(nextIncident);
  }

  // Restore player movement for office exploration
  officeScene.setMovementLocked(false);
};

handleRestartSimulation = () => {
  // Reconstruct clean simulation engine from phishing scenario conditions
  sim = new CompanySimulation(PHISHING_SCENARIO);
  lastChoiceId = null;

  // Reset Comms Hub and visual alert
  ui.resetCommsHub();
  officeScene.resetEmergencyAlert();

  // Hide report and refresh HUD
  ui.hidePerformanceReport();
  ui.updateHUD(sim.getState());

  // Reset character to lobby and point active beacon back to IT
  officeScene.resetPlayerPosition();
  const initialIncident = sim.getActiveIncident();
  officeScene.setActiveDepartment((initialIncident?.department as DepartmentKey) ?? 'IT');
  officeScene.setMovementLocked(false);

  if (initialIncident) {
    ui.notifyNewIncident(initialIncident);
  }
};

// ============================================================================
// PHASER GAME BOOT & INITIAL STATE SYNC
// ============================================================================

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [officeScene],
};

// Initialize Phaser game
new Phaser.Game(config);

// Populate HUD immediately with initial state
ui.updateHUD(sim.getState());

// Set initial active department beacon for Turn 1
const activeIncident = sim.getActiveIncident();
officeScene.setActiveDepartment((activeIncident?.department as DepartmentKey) ?? 'IT');
if (activeIncident) {
  ui.notifyNewIncident(activeIncident);
}

// Subscribe to simulation events for debugging and logging
sim.subscribe((event) => {
  console.log(`[SimulationEvent] ${event.type}`, event);
});
