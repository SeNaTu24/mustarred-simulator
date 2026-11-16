/**
 * Mustarred Company Simulator - Headless Simulation Engine
 *
 * Core turn state machine orchestrating cross-departmental decision cycles,
 * modifier resolution, delayed consequence scheduling, cash burn/debt settlements,
 * and immutable decision ledger auditing.
 *
 * INVARIANTS:
 * - Strictly headless: 0 Phaser, 0 DOM, 0 browser API dependencies.
 * - Deterministic: identical inputs produce identical state transitions.
 * - Integer minor currency units (cents) throughout.
 * - Zero state mutation on rejected or locked decisions.
 * - Conforms to verbatimModuleSyntax and erasableSyntaxOnly.
 */

import type {
  Cents,
  ChoiceImpact,
  CompanyGrade,
  CompanyMetrics,
  DecisionLedgerRecord,
  DecisionSubmission,
  DelayedEffect,
  DelayedEffectResolution,
  EvaluatedChoice,
  FinancialState,
  Incident,
  IncidentCondition,
  MetricConditionTarget,
  MetricScore,
  ResolutionResult,
  Scenario,
  SimulationEvent,
  SimulationPhase,
  SimulationState,
  StateSnapshot,
} from './types.ts';

import {
  calculateDebtPaymentBreakdown,
  calculateRequiredSettlementCash,
  clamp,
  evaluateCompanyMetrics,
  evaluateFinancialState,
} from './calculations.ts';

import { MUSTARRED_DEMO_SCENARIO } from './mustarredDemo.data.ts';

// ============================================================================
// PERFORMANCE REPORT INTERFACE
// ============================================================================

export interface DepartmentalSummaries {
  readonly finance: {
    readonly cash: Cents;
    readonly debtPrincipal: Cents;
    readonly runwayMonths: number;
    readonly financialHealth: MetricScore;
  };
  readonly hr: {
    readonly morale: MetricScore;
  };
  readonly it: {
    readonly stability: MetricScore;
  };
}

export interface PerformanceReport {
  readonly scenarioId: string;
  readonly totalTurnsCompleted: number;
  readonly finalGrade: CompanyGrade;
  readonly overallHealthScore: MetricScore;
  readonly rawFinalOverallHealth: number;
  readonly financialState: FinancialState;
  readonly companyMetrics: CompanyMetrics;
  readonly isInsolvent: boolean;
  readonly executiveSummary: string;
  readonly decisionHistory: readonly DecisionLedgerRecord[];
  readonly departmentalSummaries: DepartmentalSummaries;
}

// ============================================================================
// COMPANY SIMULATION ENGINE CLASS
// ============================================================================

export class CompanySimulation {
  private readonly scenario: Scenario;
  private currentTurn: number;
  private phase: SimulationPhase;
  private isInsolvent: boolean;

  // Working state variables
  private cash: Cents;
  private debtPrincipal: Cents;
  private grossMonthlyBurn: Cents;
  private annualInterestRate: number;
  private monthlyPrincipalAmortization: Cents;
  private hasActiveDebt: boolean;

  private hrMorale: MetricScore;
  private itStability: MetricScore;

  private financials!: FinancialState;
  private metrics!: CompanyMetrics;

  private pendingDelayedEffects: DelayedEffect[];
  private currentTurnResolvedDelayedEffects: DelayedEffectResolution[];
  private decisionLedger: DecisionLedgerRecord[];
  private activeIncident: Incident | null;
  private evaluatedChoices: readonly EvaluatedChoice[];

  private readonly listeners: Set<(event: SimulationEvent) => void>;

  constructor(scenario: Scenario = MUSTARRED_DEMO_SCENARIO) {
    this.scenario = scenario;
    this.listeners = new Set();

    this.currentTurn = 1;
    this.phase = 'NOT_STARTED';
    this.isInsolvent = false;

    // Initial operational conditions
    this.cash = scenario.initialConditions.startingCash;
    this.debtPrincipal = scenario.initialConditions.startingDebt;
    this.grossMonthlyBurn = scenario.initialConditions.startingGrossMonthlyBurn;
    this.annualInterestRate = scenario.initialConditions.loanTerms?.annualInterestRate ?? 0;
    this.monthlyPrincipalAmortization =
      scenario.initialConditions.loanTerms?.monthlyPrincipalAmortization ?? 0;
    this.hasActiveDebt = this.debtPrincipal > 0;

    this.hrMorale = scenario.initialConditions.startingHrMorale;
    this.itStability = scenario.initialConditions.startingItStability;

    this.pendingDelayedEffects = [];
    this.currentTurnResolvedDelayedEffects = [];
    this.decisionLedger = [];
    this.activeIncident = null;
    this.evaluatedChoices = [];

    // Compute initial baseline financials and metrics
    this.recomputeFinancialsAndMetrics(true);

    // Auto-prepare Turn 1
    this.start();
  }

  // ==========================================================================
  // PUBLIC ACCESSORS & LIFECYCLE
  // ==========================================================================

  /**
   * Starts the simulation if not already started, transitioning to Turn 1.
   */
  public start(): SimulationState {
    if (this.phase !== 'NOT_STARTED') {
      return this.getState();
    }

    this.emitEvent({
      type: 'SIMULATION_INITIALIZED',
      state: this.getState(),
    });

    this.prepareTurn(this.currentTurn);
    return this.getState();
  }

  /**
   * Returns a complete, immutable snapshot of the simulation state.
   */
  public getState(): SimulationState {
    return {
      scenarioId: this.scenario.id,
      currentTurn: this.currentTurn,
      totalTurns: this.scenario.totalTurns,
      phase: this.phase,
      isInsolvent: this.isInsolvent,
      financials: this.financials,
      metrics: this.metrics,
      pendingDelayedEffects: Object.freeze([...this.pendingDelayedEffects]),
      decisionLedger: Object.freeze([...this.decisionLedger]),
      activeIncident: this.activeIncident,
      evaluatedChoices: this.evaluatedChoices,
    };
  }

  /**
   * Returns the currently active incident, if any.
   */
  public getActiveIncident(): Incident | null {
    return this.activeIncident;
  }

  /**
   * Returns available incidents for the current turn.
   */
  public getAvailableIncidents(): readonly Incident[] {
    return this.activeIncident ? [this.activeIncident] : [];
  }

  /**
   * Returns evaluated choices for the active incident, with locks and overrides applied.
   */
  public getEvaluatedChoices(): readonly EvaluatedChoice[] {
    return this.evaluatedChoices;
  }

  /**
   * Returns the immutable decision ledger (audit trail).
   */
  public getDecisionHistory(): readonly DecisionLedgerRecord[] {
    return Object.freeze([...this.decisionLedger]);
  }

  /**
   * Subscribes a listener callback to simulation lifecycle events.
   * Returns an unsubscribe function.
   */
  public subscribe(listener: (event: SimulationEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ==========================================================================
  // DECISION RESOLUTION
  // ==========================================================================

  /**
   * Resolves a decision by option ID on the active incident.
   */
  public resolveDecision(choiceId: string, submission?: DecisionSubmission): ResolutionResult {
    if (!this.activeIncident) {
      return {
        success: false,
        error: this.isInsolvent ? 'INSOLVENCY_HALT' : 'SIMULATION_NOT_ACTIVE',
        message: 'No active incident is currently awaiting a decision.',
      };
    }
    return this.resolveIncident(this.activeIncident.id, choiceId, submission);
  }

  /**
   * Resolves an incident with a chosen option ID.
   * Guarantees zero state mutation if the operation is invalid or the choice is locked.
   *
   * `submission` is only used for incidents answered through a composed response
   * plan; without it the choice's stored impact is applied exactly as before.
   */
  public resolveIncident(
    incidentId: string,
    choiceId: string,
    submission?: DecisionSubmission
  ): ResolutionResult {
    // 1. Validate simulation phase
    if (this.phase === 'INSOLVENT') {
      return {
        success: false,
        error: 'INSOLVENCY_HALT',
        message: 'Simulation has halted due to enterprise insolvency.',
      };
    }

    if (this.phase === 'SIMULATION_COMPLETED') {
      return {
        success: false,
        error: 'SIMULATION_NOT_ACTIVE',
        message: 'Simulation has already completed all scheduled turns.',
      };
    }

    if (this.phase !== 'AWAITING_DECISION') {
      return {
        success: false,
        error: 'ALREADY_RESOLVED_THIS_TURN',
        message: `Turn ${this.currentTurn} is not currently awaiting a decision.`,
      };
    }

    // 2. Validate incident
    if (!this.activeIncident || this.activeIncident.id !== incidentId) {
      return {
        success: false,
        error: 'INVALID_INCIDENT',
        message: `Incident "${incidentId}" is not active. Expected: "${this.activeIncident?.id ?? 'none'}".`,
      };
    }

    // 3. Validate choice existence
    const evaluatedChoice = this.evaluatedChoices.find((c) => c.id === choiceId);
    if (!evaluatedChoice) {
      return {
        success: false,
        error: 'INVALID_CHOICE',
        message: `Choice "${choiceId}" is not a valid option for incident "${incidentId}".`,
      };
    }

    // 4. Validate lock status (reject without state mutation)
    if (evaluatedChoice.isLocked) {
      return {
        success: false,
        error: 'CHOICE_LOCKED',
        message: `Choice "${evaluatedChoice.label}" (${choiceId}) is locked: ${evaluatedChoice.lockReasons.join('; ')}`,
        lockReasons: evaluatedChoice.lockReasons,
      };
    }

    // 5. Capture pre-decision snapshot
    const stateBefore = this.createStateSnapshot();

    // 6. STAGE C: Apply Immediate Choice Impacts
    const impact: ChoiceImpact = submission?.impactOverride
      ? {
          cashDelta: Math.round(submission.impactOverride.cashDelta),
          grossBurnRateDelta: Math.round(submission.impactOverride.grossBurnRateDelta),
          debtDelta: Math.round(submission.impactOverride.debtDelta),
          hrDelta: submission.impactOverride.hrDelta,
          itDelta: submission.impactOverride.itDelta,
          operationalExplanation: submission.impactOverride.operationalExplanation,
        }
      : evaluatedChoice.effectiveImpact;
    this.cash = (this.cash + impact.cashDelta) as Cents;
    this.grossMonthlyBurn = Math.max(0, this.grossMonthlyBurn + impact.grossBurnRateDelta) as Cents;

    // Debt incurrence
    if (impact.debtDelta > 0) {
      this.debtPrincipal = (this.debtPrincipal + impact.debtDelta) as Cents;
      this.hasActiveDebt = true;
      // Inherit loan terms if not already active
      if (this.annualInterestRate === 0 && this.scenario.initialConditions.loanTerms) {
        this.annualInterestRate = this.scenario.initialConditions.loanTerms.annualInterestRate;
        this.monthlyPrincipalAmortization =
          this.scenario.initialConditions.loanTerms.monthlyPrincipalAmortization;
      }
    }

    this.hrMorale = clamp(0, 100, this.hrMorale + impact.hrDelta);
    this.itStability = clamp(0, 100, this.itStability + impact.itDelta);

    // Schedule delayed effect if specified
    const scheduledList: { readonly effectId: string; readonly triggerTurn: number; readonly description: string }[] = [];
    if (evaluatedChoice.scheduledDelayedEffect) {
      const scheduled = evaluatedChoice.scheduledDelayedEffect;
      const delayedEffect: DelayedEffect = {
        effectId: scheduled.effectId,
        sourceIncidentId: this.activeIncident.id,
        sourceChoiceId: evaluatedChoice.id,
        creationTurn: this.currentTurn,
        triggerTurn: scheduled.triggerTurn,
        executionStage: scheduled.executionStage,
        canTriggerInsolvency: scheduled.canTriggerInsolvency,
        cashDelta: scheduled.cashDelta,
        grossBurnRateDelta: scheduled.grossBurnRateDelta,
        debtDelta: scheduled.debtDelta,
        hrDelta: scheduled.hrDelta,
        itDelta: scheduled.itDelta,
        narrativeDescription: scheduled.narrativeDescription,
      };
      this.pendingDelayedEffects.push(delayedEffect);
      scheduledList.push({
        effectId: delayedEffect.effectId,
        triggerTurn: delayedEffect.triggerTurn,
        description: delayedEffect.narrativeDescription,
      });
    }

    // 7. STAGE D: Monthly Financial Settlement
    const debtDue = calculateDebtPaymentBreakdown(
      this.debtPrincipal,
      this.annualInterestRate,
      this.monthlyPrincipalAmortization
    );

    const requiredSettlement = calculateRequiredSettlementCash(
      this.grossMonthlyBurn,
      debtDue.total
    );

    let isSettlementSuccessful: boolean;
    let postSettlementCash: Cents;
    let grossBurnPaid: Cents;
    let debtServicePaid: Cents;
    let principalAmortized: Cents;
    let interestPaid: Cents;
    let totalCashDeducted: Cents;

    if (this.cash >= requiredSettlement) {
      isSettlementSuccessful = true;
      postSettlementCash = (this.cash - requiredSettlement) as Cents;
      grossBurnPaid = this.grossMonthlyBurn;
      debtServicePaid = debtDue.total;
      principalAmortized = debtDue.principal;
      interestPaid = debtDue.interest;
      totalCashDeducted = requiredSettlement;
    } else {
      isSettlementSuccessful = false;
      postSettlementCash = 0 as Cents;
      this.isInsolvent = true;
      grossBurnPaid = Math.max(0, this.cash) as Cents;
      debtServicePaid = 0 as Cents;
      principalAmortized = 0 as Cents;
      interestPaid = 0 as Cents;
      totalCashDeducted = Math.max(0, this.cash) as Cents;
    }

    // Evaluate authoritative financial state post-settlement
    this.financials = evaluateFinancialState({
      postSettlementCash,
      grossMonthlyBurn: this.grossMonthlyBurn,
      principalBeforeSettlement: this.debtPrincipal,
      annualInterestRate: this.annualInterestRate,
      monthlyPrincipalAmortization: this.monthlyPrincipalAmortization,
      hasActiveDebtAtStartOfCycle: this.hasActiveDebt,
      isSettlementSuccessful,
    });

    // Update committed balances from authoritative transition
    this.cash = this.financials.cash;
    this.debtPrincipal = this.financials.debtPrincipal;
    this.hasActiveDebt = this.financials.debtService.hasActiveDebt;

    // 8. STAGE E: Metric & Health Recomputation
    this.metrics = evaluateCompanyMetrics(
      this.financials.rawFinancialHealth,
      this.hrMorale,
      this.itStability,
      this.cash
    );

    const stateAfter = this.createStateSnapshot();

    // 9. Append Decision Ledger Record
    const record: DecisionLedgerRecord = {
      entryIndex: this.decisionLedger.length,
      turn: this.currentTurn,
      timestamp: Date.now(),
      incidentId: this.activeIncident.id,
      incidentTitle: this.activeIncident.title,
      department: this.activeIncident.department,
      chosenOptionId: evaluatedChoice.id,
      chosenOptionLabel: submission?.label ?? evaluatedChoice.label,
      executiveRationale: submission?.rationale ?? evaluatedChoice.executiveRationale,
      effectiveChoiceImpact: impact,
      immediateFinancialDeltas: {
        cashDelta: impact.cashDelta,
        grossBurnRateDelta: impact.grossBurnRateDelta,
        debtDelta: impact.debtDelta,
      },
      immediateMetricDeltas: {
        hrDelta: impact.hrDelta,
        itDelta: impact.itDelta,
      },
      monthlyBurnDeductionPaid: {
        grossBurnPaid,
        debtServicePaid,
        principalAmortized,
        interestPaid,
        totalCashDeducted,
      },
      debtServiceSnapshot: this.financials.debtService,
      delayedEffectsScheduled: Object.freeze(scheduledList),
      delayedEffectsResolvedThisTurn: Object.freeze([...this.currentTurnResolvedDelayedEffects]),
      businessCausality: impact.operationalExplanation,
      learningFeedback: submission?.learningFeedbackOverride ?? evaluatedChoice.learningFeedback,
      stateBefore,
      stateAfter,
    };

    this.decisionLedger.push(record);
    this.currentTurnResolvedDelayedEffects = [];

    this.emitEvent({
      type: 'DECISION_RESOLVED',
      record,
      state: this.getState(),
    });

    // 10. Advance Turn or Complete Simulation
    if (this.isInsolvent) {
      this.phase = 'INSOLVENT';
      this.activeIncident = null;
      this.evaluatedChoices = [];

      this.emitEvent({
        type: 'INSOLVENCY_TRIGGERED',
        reason: 'Enterprise cash balance depleted; unable to service monthly burn and debt.',
        state: this.getState(),
      });

      this.emitEvent({
        type: 'SIMULATION_COMPLETED',
        finalGrade: 'F',
        finalOverallHealthScore: this.metrics.overallHealthScore,
        rawFinalOverallHealth: this.metrics.rawEffectiveOverallHealth,
        state: this.getState(),
      });
    } else if (this.currentTurn >= this.scenario.totalTurns) {
      this.phase = 'SIMULATION_COMPLETED';
      this.activeIncident = null;
      this.evaluatedChoices = [];

      this.emitEvent({
        type: 'SIMULATION_COMPLETED',
        finalGrade: this.metrics.grade,
        finalOverallHealthScore: this.metrics.overallHealthScore,
        rawFinalOverallHealth: this.metrics.rawEffectiveOverallHealth,
        state: this.getState(),
      });
    } else {
      this.currentTurn += 1;
      this.prepareTurn(this.currentTurn);
    }

    return {
      success: true,
      turn: record.turn,
      record,
      nextPhase: this.phase,
      updatedState: this.getState(),
    };
  }

  // ==========================================================================
  // PERFORMANCE REPORT GENERATION
  // ==========================================================================

  /**
   * Generates a comprehensive performance report for debriefing.
   */
  public generatePerformanceReport(): PerformanceReport {
    const finalGrade = this.metrics.grade;
    const overallHealthScore = this.metrics.overallHealthScore;
    const rawFinalOverallHealth = this.metrics.rawEffectiveOverallHealth;

    let executiveSummary: string;
    if (this.isInsolvent) {
      executiveSummary =
        'Catastrophic Insolvency: The enterprise exhausted all cash reserves and defaulted on operating overhead and debt service obligations, precipitating immediate corporate liquidation.';
    } else if (finalGrade === 'A') {
      executiveSummary =
        'Exemplary Leadership: Maintained disciplined cash runway, robust technical infrastructure, and high organizational engagement, achieving sustainable enterprise stability.';
    } else if (finalGrade === 'B') {
      executiveSummary =
        'Sound Stewardship: Navigated acute cross-departmental trade-offs, preserving solvent operations and acceptable health across all pillars.';
    } else if (finalGrade === 'C') {
      executiveSummary =
        'Vulnerable Operating Model: While solvent, severe compromises in debt leverage or department morale severely capped enterprise resilience.';
    } else if (finalGrade === 'D') {
      executiveSummary =
        'Distressed Condition: Acute departmental collapse created structural bottlenecks, leaving the company vulnerable to immediate market disruption.';
    } else {
      executiveSummary =
        'Organizational Failure: Critical failure in one or more core departments triggered board intervention.';
    }

    return {
      scenarioId: this.scenario.id,
      totalTurnsCompleted: this.decisionLedger.length,
      finalGrade,
      overallHealthScore,
      rawFinalOverallHealth,
      financialState: this.financials,
      companyMetrics: this.metrics,
      isInsolvent: this.isInsolvent,
      executiveSummary,
      decisionHistory: Object.freeze([...this.decisionLedger]),
      departmentalSummaries: {
        finance: {
          cash: this.cash,
          debtPrincipal: this.debtPrincipal,
          runwayMonths: this.financials.effectiveRunwayMonths,
          financialHealth: this.financials.roundedFinancialHealth,
        },
        hr: {
          morale: this.hrMorale,
        },
        it: {
          stability: this.itStability,
        },
      },
    };
  }

  /**
   * Alias for generatePerformanceReport.
   */
  public calculatePerformanceReport(): PerformanceReport {
    return this.generatePerformanceReport();
  }

  // ==========================================================================
  // INTERNAL TURN LIFECYCLE HELPERS
  // ==========================================================================

  /**
   * Prepares a turn: resolves due delayed effects (Stage A), selects contextual narrative,
   * evaluates choices and modifiers (Stage B), and transitions phase.
   */
  private prepareTurn(turn: number): void {
    // STAGE A: Resolve due delayed effects
    this.currentTurnResolvedDelayedEffects = this.resolveDueDelayedEffects(turn);

    // If insolvency was triggered during delayed effects, halt
    if (this.isInsolvent) {
      return;
    }

    // STAGE B: Find incident and evaluate choices
    const incidentBlueprint = this.scenario.incidents.find((i) => i.turn === turn);
    if (!incidentBlueprint) {
      this.phase = 'SIMULATION_COMPLETED';
      this.activeIncident = null;
      this.evaluatedChoices = [];
      return;
    }

    // Select dynamic contextual lead-in
    const dynamicLeadIn = this.selectNarrativeLeadIn(incidentBlueprint);
    this.activeIncident = {
      ...incidentBlueprint,
      businessContext: `${dynamicLeadIn} ${incidentBlueprint.businessContext}`,
    };

    // Evaluate choices and conditional modifiers
    this.evaluatedChoices = this.evaluateChoicesForIncident(incidentBlueprint);
    this.phase = 'AWAITING_DECISION';

    this.emitEvent({
      type: 'TURN_STARTED',
      turn,
      activeIncident: this.activeIncident,
      evaluatedChoices: this.evaluatedChoices,
      state: this.getState(),
    });
  }

  /**
   * Resolves delayed effects scheduled for the current turn in deterministic order.
   */
  private resolveDueDelayedEffects(turn: number): DelayedEffectResolution[] {
    const dueEffects = this.pendingDelayedEffects.filter((e) => e.triggerTurn === turn);
    if (dueEffects.length === 0) {
      return [];
    }

    // Deterministic sort: creation turn FIFO, tie-breaker effectId localeCompare
    dueEffects.sort((a, b) => {
      if (a.creationTurn !== b.creationTurn) {
        return a.creationTurn - b.creationTurn;
      }
      return a.effectId.localeCompare(b.effectId);
    });

    // Remove due effects from pending queue
    this.pendingDelayedEffects = this.pendingDelayedEffects.filter(
      (e) => e.triggerTurn !== turn
    );

    const resolvedResolutions: DelayedEffectResolution[] = [];

    for (const effect of dueEffects) {
      this.cash = (this.cash + effect.cashDelta) as Cents;
      this.grossMonthlyBurn = Math.max(0, this.grossMonthlyBurn + effect.grossBurnRateDelta) as Cents;
      this.debtPrincipal = Math.max(0, this.debtPrincipal + effect.debtDelta) as Cents;
      this.hrMorale = clamp(0, 100, this.hrMorale + effect.hrDelta);
      this.itStability = clamp(0, 100, this.itStability + effect.itDelta);

      const resolution: DelayedEffectResolution = {
        effectId: effect.effectId,
        sourceIncidentId: effect.sourceIncidentId,
        narrativeDescription: effect.narrativeDescription,
        appliedDeltas: {
          cashDelta: effect.cashDelta,
          grossBurnRateDelta: effect.grossBurnRateDelta,
          debtDelta: effect.debtDelta,
          hrDelta: effect.hrDelta,
          itDelta: effect.itDelta,
        },
      };
      resolvedResolutions.push(resolution);

      this.recomputeFinancialsAndMetrics(true);

      this.emitEvent({
        type: 'DELAYED_EFFECT_RESOLVED',
        effect,
        state: this.getState(),
      });

      // Insolvency check from delayed effect
      if (effect.canTriggerInsolvency && this.cash <= 0) {
        this.cash = 0 as Cents;
        this.isInsolvent = true;
        this.phase = 'INSOLVENT';
        this.activeIncident = null;
        this.evaluatedChoices = [];

        this.recomputeFinancialsAndMetrics(false);

        this.emitEvent({
          type: 'INSOLVENCY_TRIGGERED',
          reason: `Delayed liability "${effect.effectId}" triggered insolvency.`,
          state: this.getState(),
        });

        this.emitEvent({
          type: 'SIMULATION_COMPLETED',
          finalGrade: 'F',
          finalOverallHealthScore: this.metrics.overallHealthScore,
          rawFinalOverallHealth: this.metrics.rawEffectiveOverallHealth,
          state: this.getState(),
        });

        break;
      }
    }

    return resolvedResolutions;
  }

  /**
   * Evaluates dynamic narrative variants to select contextual lead-in text.
   */
  private selectNarrativeLeadIn(incident: Incident): string {
    for (const variant of incident.narrativeVariants) {
      if (variant.conditions.length === 0) {
        return variant.leadInText;
      }
      const allMet = variant.conditions.every((c) => this.evaluateCondition(c));
      if (allMet) {
        return variant.leadInText;
      }
    }
    return incident.basePremise;
  }

  /**
   * Evaluates choices for an incident, applying conditional modifiers and collecting lock reasons.
   */
  private evaluateChoicesForIncident(incident: Incident): readonly EvaluatedChoice[] {
    return incident.choices.map((choice) => {
      let cashDelta = choice.baseImpact.cashDelta;
      let grossBurnRateDelta = choice.baseImpact.grossBurnRateDelta;
      let debtDelta = choice.baseImpact.debtDelta;
      let hrDelta = choice.baseImpact.hrDelta;
      let itDelta = choice.baseImpact.itDelta;
      const operationalExplanation = choice.baseImpact.operationalExplanation;

      const lockReasons: string[] = [];
      let isLocked = false;

      // Deterministically sort matching modifiers by modifierId
      const matchingModifiers = this.scenario.modifiers
        .filter((m) => m.targetChoiceId === choice.id)
        .sort((a, b) => a.modifierId.localeCompare(b.modifierId));

      for (const modifier of matchingModifiers) {
        const active = modifier.conditions.every((c) => this.evaluateCondition(c));
        if (active) {
          // Overrides strictly REPLACE base impacts
          if (modifier.overrideCashDelta !== undefined) {
            cashDelta = modifier.overrideCashDelta;
          }
          if (modifier.overrideGrossBurnRateDelta !== undefined) {
            grossBurnRateDelta = modifier.overrideGrossBurnRateDelta;
          }
          if (modifier.overrideHrDelta !== undefined) {
            hrDelta = modifier.overrideHrDelta;
          }
          if (modifier.overrideItDelta !== undefined) {
            itDelta = modifier.overrideItDelta;
          }
          if (modifier.isLocked === true) {
            isLocked = true;
            if (modifier.lockReason && !lockReasons.includes(modifier.lockReason)) {
              lockReasons.push(modifier.lockReason);
            }
          }
        }
      }

      const effectiveImpact: ChoiceImpact = {
        cashDelta,
        grossBurnRateDelta,
        debtDelta,
        hrDelta,
        itDelta,
        operationalExplanation,
      };

      return {
        id: choice.id,
        label: choice.label,
        description: choice.description,
        executiveRationale: choice.executiveRationale,
        effectiveImpact,
        isLocked: isLocked || lockReasons.length > 0,
        lockReasons: Object.freeze(lockReasons),
        scheduledDelayedEffect: choice.scheduledDelayedEffect,
        learningFeedback: choice.learningFeedback,
      };
    });
  }

  /**
   * Evaluates a single incident condition predicate against historical decisions or current metrics.
   */
  private evaluateCondition(condition: IncidentCondition): boolean {
    switch (condition.type) {
      case 'DECISION_EQUALS': {
        const record = this.decisionLedger.find(
          (r) => r.incidentId === condition.target
        );
        return record !== undefined && record.chosenOptionId === condition.value;
      }
      case 'METRIC_LESS_THAN': {
        const metricValue = this.getMetricValue(condition.target);
        return metricValue < condition.value;
      }
      case 'METRIC_GREATER_THAN': {
        const metricValue = this.getMetricValue(condition.target);
        return metricValue > condition.value;
      }
      case 'METRIC_GREATER_THAN_OR_EQUAL': {
        const metricValue = this.getMetricValue(condition.target);
        return metricValue >= condition.value;
      }
      case 'CASH_LESS_THAN': {
        return this.cash < condition.value;
      }
      default: {
        const exhaustive: never = condition;
        throw new Error(`Unhandled condition type: ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  /**
   * Resolves target metric value for condition evaluation.
   */
  private getMetricValue(target: MetricConditionTarget): number {
    switch (target) {
      case 'hrMorale':
        return this.hrMorale;
      case 'itStability':
        return this.itStability;
      case 'financeHealth':
        return this.financials.roundedFinancialHealth;
      default: {
        const exhaustive: never = target;
        throw new Error(`Unhandled metric target: ${exhaustive}`);
      }
    }
  }

  /**
   * Recomputes current financials and company metrics snapshots.
   */
  private recomputeFinancialsAndMetrics(isSettlementSuccessful: boolean): void {
    this.financials = evaluateFinancialState({
      postSettlementCash: this.cash,
      grossMonthlyBurn: this.grossMonthlyBurn,
      principalBeforeSettlement: this.debtPrincipal,
      annualInterestRate: this.annualInterestRate,
      monthlyPrincipalAmortization: this.monthlyPrincipalAmortization,
      hasActiveDebtAtStartOfCycle: this.hasActiveDebt,
      isSettlementSuccessful,
    });

    this.metrics = evaluateCompanyMetrics(
      this.financials.rawFinancialHealth,
      this.hrMorale,
      this.itStability,
      this.cash
    );
  }

  /**
   * Captures an immutable snapshot of internal state.
   */
  private createStateSnapshot(): StateSnapshot {
    return {
      cash: this.cash,
      debtPrincipal: this.debtPrincipal,
      grossMonthlyBurn: this.grossMonthlyBurn,
      projectedNetMonthlyBurn: this.financials.projectedNetMonthlyBurn,
      effectiveRunwayMonths: this.financials.effectiveRunwayMonths,
      rawFinancialHealth: this.financials.rawFinancialHealth,
      roundedFinancialHealth: this.financials.roundedFinancialHealth,
      debtService: this.financials.debtService,
      hrMorale: this.hrMorale,
      itStability: this.itStability,
      rawEffectiveOverallHealth: this.metrics.rawEffectiveOverallHealth,
      overallHealthScore: this.metrics.overallHealthScore,
      grade: this.metrics.grade,
    };
  }

  /**
   * Safely notifies all registered event subscribers.
   */
  private emitEvent(event: SimulationEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[CompanySimulation] Error in event subscriber callback:', err);
      }
    }
  }
}
