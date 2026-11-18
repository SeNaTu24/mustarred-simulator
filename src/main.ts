/**
 * Mustarred Company Simulator - Main Entry Point & Orchestrator
 *
 * Connects the headless CompanySimulation engine, the Phaser 2D OfficeScene,
 * and the DOM-based UIManager into a unified, responsive interactive application.
 *
 * Incident 1 is answered through a composed response plan: the workbench builds
 * the plan, the evaluator turns it into consequences, and the engine applies them
 * so cash, burn and metrics stay authoritative.
 */

import Phaser from 'phaser';
import { CompanySimulation } from './simulation/CompanySimulation.ts';
import { MONDAY_MORNING_SCENARIO } from './simulation/mondayMorning.data.ts';
import { PHISHING_INTERACTION } from './incidents/phishing/phishingInteraction.data.ts';
import { buildPhishingOutcome } from './incidents/phishing/phishingAftermath.ts';
import type { PhishingOutcome } from './incidents/phishing/phishingAftermath.ts';
import type { ResponseAssessment } from './incidents/responseEvaluator.ts';
import { evaluateResponsePlan } from './incidents/responseEvaluator.ts';
import type { ResponsePlan } from './incidents/interactionModel.ts';
import { buildPhishingReactions } from './ui/phishingComms.ts';
import type { DepartmentKey } from './game/OfficeScene.ts';
import { OfficeScene } from './game/OfficeScene.ts';
import { UIManager } from './ui/UIManager.ts';
import { buildIncidentMemo } from './ui/incidentMemo.ts';
import { COMPANY, departmentLabel, staffForDepartment } from './ui/staff.ts';
import './style.css';

interface CommittedResolution {
  readonly assessment: ResponseAssessment;
  readonly outcome: PhishingOutcome;
  readonly choiceId: string;
}

// 1. Instantiate the authoritative headless simulation engine with the Monday Morning scenario
let sim = new CompanySimulation(MONDAY_MORNING_SCENARIO);
let lastChoiceId: string | null = null;
let lastResolution: CommittedResolution | null = null;

// 2. Instantiate the office world scene
const officeScene = new OfficeScene();

// 3. Forward declarations for orchestrator handlers
let handleOpenIncident: () => void;
let handleSelectChoice: (choiceId: string, additionalInstructions?: string) => void;
let handleCommitResponse: (plan: ResponsePlan) => void;
let handleReturnToOffice: () => void;
let handleDismissResolution: () => void;
let handleRestartSimulation: () => void;

// 4. Instantiate the DOM UI manager with event callbacks
const ui = new UIManager({
  onSelectChoice: (choiceId: string, additionalInstructions?: string) => {
    handleSelectChoice(choiceId, additionalInstructions);
  },
  onCommitResponse: (plan: ResponsePlan) => {
    handleCommitResponse(plan);
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
  onTundeIntroCompleted: () => {
    officeScene.setTundeIntroCompleted(true);
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

  // Freeze character movement while the consultation is open
  officeScene.setMovementLocked(true);
  ui.hideInteractionPrompt();

  const choices = sim.getEvaluatedChoices();
  const interactionSpec =
    incident.id === PHISHING_INTERACTION.incidentId ? PHISHING_INTERACTION : undefined;

  ui.showIncidentModal(incident, choices, interactionSpec);
};

/**
 * Commits a composed response plan: evaluate it, hand the composed impact to the
 * engine, then show the company's reaction and log the memos in the comms hub.
 */
handleCommitResponse = (plan: ResponsePlan) => {
  const incident = sim.getActiveIncident();
  if (!incident || incident.id !== PHISHING_INTERACTION.incidentId) {
    console.warn('[Orchestrator] No phishing incident is awaiting a response.');
    return;
  }

  const assessment = evaluateResponsePlan(PHISHING_INTERACTION, plan);
  const result = sim.resolveDecision(assessment.baseChoiceId, {
    label: assessment.planLabel,
    rationale: assessment.summary,
    impactOverride: assessment.impact,
  });

  if (!result.success) {
    console.warn('[Orchestrator] Engine rejected the response plan:', result.message);
    return;
  }

  lastChoiceId = assessment.baseChoiceId;

  const figures = {
    cashDelta: result.record.immediateFinancialDeltas.cashDelta,
    itDelta: result.record.immediateMetricDeltas.itDelta,
    hrDelta: result.record.immediateMetricDeltas.hrDelta,
  };

  const outcome = buildPhishingOutcome(PHISHING_INTERACTION, plan, assessment, figures);
  lastResolution = { assessment, outcome, choiceId: assessment.baseChoiceId };

  ui.updateHUD(result.updatedState);
  // File the memos quietly: the outcome screen already shows them, and the
  // toasts follow once the player is back in the office.
  outcome.memos.forEach((memo) => ui.addCrossDeptReaction(memo, { silent: true }));

  ui.showIncidentOutcome({
    verdict: assessment.verdict,
    verdictLabel: assessment.verdictLabel,
    headline: assessment.headline,
    summary: assessment.summary,
    maya: outcome.maya,
    memos: outcome.memos,
    vectors: assessment.vectors,
    actions: assessment.actionResults,
    figures,
    minutesSpent: assessment.minutesSpent,
    closeAtMinute: assessment.closeAtMinute,
    officeLabel: outcome.office.label,
    onReturn: () => {
      handleReturnToOffice();
    },
  });
};

/**
 * Legacy path kept for the multi-turn scenario's single-option decisions.
 */
handleSelectChoice = (choiceId: string, _additionalInstructions?: string) => {
  lastChoiceId = choiceId;
  const result = sim.resolveDecision(choiceId);

  if (!result.success) {
    console.warn('[Orchestrator] Decision rejected by simulation engine:', result.message);
    return;
  }

  if (choiceId.startsWith('CHOICE_PHISH_')) {
    const pkg = buildPhishingReactions(choiceId);
    pkg.reactions.forEach((reaction) => {
      ui.addCrossDeptReaction(reaction);
    });
    ui.updateHUD(result.updatedState);
    ui.showResolutionModal(result.record, result.nextPhase, sim.getState().isInsolvent, pkg.reactions);
    return;
  }

  const reaction = buildIncidentMemo(result.record, result.updatedState);
  ui.addCrossDeptReaction(reaction);
  ui.updateHUD(result.updatedState);
  ui.showResolutionModal(result.record, result.nextPhase, sim.getState().isInsolvent, reaction);
};

handleReturnToOffice = () => {
  ui.hideIncidentModal();
  handleDismissResolution();
};

handleDismissResolution = () => {
  ui.hideIncidentModal();

  const state = sim.getState();

  if (state.isInsolvent || (state.phase === 'SIMULATION_COMPLETED' && state.metrics.grade === 'F')) {
    officeScene.setActiveDepartment(null);
    officeScene.setMovementLocked(true);
    officeScene.triggerEmergencyAlert();
    if (state.isInsolvent) {
      ui.showGameOver(
        'OUT OF MONEY',
        `Salaries for the month did not clear. ${COMPANY.md} has called a staff meeting at 4pm.`,
        'The account went to zero at month end. Staff were paid late, two suppliers stopped delivery and the office closed the following Friday.',
        sim.getDecisionHistory()
      );
    } else {
      ui.showGameOver(
        'THE MORNING WENT BADLY',
        'Three decisions, three fires that were still burning on Friday.',
        'The staff dispute went to the union, the regulator asked for records we did not keep, and the contract Chinedu signed still has eleven months to run.',
        sim.getDecisionHistory()
      );
    }
    return;
  }

  if (lastResolution) {
    officeScene.setMovementLocked(false);
    officeScene.applyIncidentOutcome(lastResolution.outcome.office);
    ui.showSequentialToasts(lastResolution.outcome.toasts);
    ui.showDebriefButton(() => {
      officeScene.setMovementLocked(true);
      const report = sim.generatePerformanceReport();
      ui.showPerformanceReport(report);
    });
    return;
  }

  if (state.phase === 'SIMULATION_COMPLETED') {
    officeScene.setActiveDepartment(null);
    officeScene.setMovementLocked(true);
    const report = sim.generatePerformanceReport();
    ui.showPerformanceReport(report);
    return;
  }

  // Advance to next incident — mark the resolved dept and light up the next beacon
  const nextIncident = sim.getActiveIncident();
  const nextDept = (nextIncident?.department as DepartmentKey) ?? null;

  if (lastChoiceId) {
    const resolvedDept = (['IT', 'HR', 'FINANCE', 'LEGAL'] as DepartmentKey[]).find(
      (d) => d === state.decisionLedger[state.decisionLedger.length - 1]?.department
    );
    if (resolvedDept) {
      officeScene.setDepartmentResolved(resolvedDept, 'Decision Made');
    }
  }

  officeScene.setActiveDepartment(nextDept);
  if (nextIncident) {
    ui.notifyNewIncident(nextIncident);
  }
  officeScene.setMovementLocked(false);
};

handleRestartSimulation = () => {
  sim = new CompanySimulation(MONDAY_MORNING_SCENARIO);
  lastChoiceId = null;
  lastResolution = null;

  // Reset Comms Hub and visual alert
  ui.closeIncidentSurfaces();
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

// Light up the first incident beacon and fire the opening toast
const activeIncident = sim.getActiveIncident();
officeScene.setActiveDepartment((activeIncident?.department as DepartmentKey) ?? 'IT');
if (activeIncident) {
  ui.notifyNewIncident(activeIncident);
}

// Fire staggered toasts for all three departments so the player knows
// every desk is on fire simultaneously
const scenario = MONDAY_MORNING_SCENARIO;
scenario.incidents.slice(1).forEach((inc, idx) => {
  const head = staffForDepartment(inc.department);
  setTimeout(() => {
    ui.showToastNotification(
      `${departmentLabel(inc.department)} · waiting on you`,
      head.name,
      head.role,
      inc.title,
      () => { /* player walks over when ready */ }
    );
  }, (idx + 1) * 1200);
});

// Subscribe to simulation events for debugging and logging
sim.subscribe((event) => {
  console.log(`[SimulationEvent] ${event.type}`, event);
});
