/**
 * Mustarred Company Simulator - Core Simulation Types
 *
 * Headless, presentation-agnostic TypeScript definitions.
 * All monetary values are represented as integer minor currency units (cents).
 * Health and operational metrics are normalized on a 0-100 scale.
 *
 * Adheres to strict TypeScript compiler flags:
 * - erasableSyntaxOnly: true (no runtime enums, namespaces, or parameter properties)
 * - verbatimModuleSyntax: true (type-only exports and imports)
 */

// ============================================================================
// 1. PRIMITIVE ALIASES & IDENTIFIERS
// ============================================================================

/**
 * Monetary value in integer minor currency units (cents).
 * E.g., USD $250,000.00 is represented as integer 25_000_000.
 *
 * INVARIANT: All monetary properties MUST be integer values.
 * Runtime validation in the simulation engine must strictly reject any fractional
 * or non-integer monetary inputs or deltas (e.g., using Number.isInteger()).
 */
export type Cents = number;

/**
 * Normalized corporate health or morale score bounded between 0 and 100.
 */
export type MetricScore = number;

/**
 * Primary organizational departments modeled in the corporate simulation.
 */
export type DepartmentId = 'HR' | 'IT' | 'FINANCE';

/**
 * Categorical performance rating bands awarded at completion or evaluation.
 */
export type CompanyGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Lifecycle phase of the simulation engine.
 */
export type SimulationPhase =
  | 'NOT_STARTED'
  | 'AWAITING_DECISION'
  | 'TURN_COMPLETED'
  | 'SIMULATION_COMPLETED'
  | 'INSOLVENT';

/**
 * Urgency classification of an operational incident.
 */
export type IncidentUrgency = 'routine' | 'urgent' | 'critical';

// ============================================================================
// 2. FINANCIAL & DEBT STATE
// ============================================================================

/**
 * Breakdown of a debt service cash flow into interest and principal amortization.
 */
export interface DebtPaymentBreakdown {
  readonly interest: Cents;
  readonly principal: Cents;
  readonly total: Cents;
}

/**
 * Authoritative debt servicing state, distinguishing actual payments made during
 * the current settlement cycle from forward-looking obligations based on remaining principal.
 */
export interface DebtServiceState {
  /**
   * True if debt existed or was originated during the current settlement cycle.
   *
   * Semantics:
   * - It remains true for the current cycle even if postPaymentPrincipal reaches zero
   *   upon final full repayment (in which case currentTurnPaid is non-zero, but
   *   projectedNextTurn becomes zero).
   * - In a genuine no-debt cycle, hasActiveDebt is false, postPaymentPrincipal is zero,
   *   and all debt-service amounts (current and projected) are strictly zero.
   */
  readonly hasActiveDebt: boolean;
  /**
   * Actual debt service paid during the current turn's monthly burn deduction.
   * Zero if no debt was active at the start of the settlement cycle.
   */
  readonly currentTurnPaid: DebtPaymentBreakdown;
  /**
   * Outstanding debt principal remaining immediately after the current turn's payment.
   * Zero if debt was never incurred or was fully amortized.
   */
  readonly postPaymentPrincipal: Cents;
  /**
   * Projected forward-looking debt service due in the upcoming monthly cycle based on
   * postPaymentPrincipal. Zero if postPaymentPrincipal is zero.
   */
  readonly projectedNextTurn: DebtPaymentBreakdown;
  /**
   * Annualized contractual interest rate as a decimal fraction (e.g. 0.08 for 8% APR).
   * Zero if no debt facility is active.
   */
  readonly annualInterestRate: number;
  /**
   * Contractual monthly principal amortization due when debt is active.
   * Zero if no debt facility is active.
   */
  readonly monthlyPrincipalAmortization: Cents;
}

/**
 * Authoritative financial state for the enterprise.
 * Holds the single authoritative source of raw and rounded financial health.
 */
export interface FinancialState {
  /** Total unencumbered liquid cash on balance sheet in minor units (cents). */
  readonly cash: Cents;
  /** Outstanding debt principal owed in minor units (cents). Matches debtService.postPaymentPrincipal. */
  readonly debtPrincipal: Cents;
  /** Monthly gross operating overhead (payroll, cloud infrastructure, facilities) in cents. */
  readonly grossMonthlyBurn: Cents;
  /** Current and projected debt servicing obligations. */
  readonly debtService: DebtServiceState;
  /**
   * Total projected net monthly cash outflow for the upcoming cycle:
   * grossMonthlyBurn + debtService.projectedNextTurn.total
   */
  readonly projectedNetMonthlyBurn: Cents;
  /**
   * Effective forward runway in months based on projected net burn:
   * cash / max(1, projectedNetMonthlyBurn)
   */
  readonly effectiveRunwayMonths: number;
  /** Base runway score (0-100) before debt penalty. */
  readonly baseRunwayScore: number;
  /** Debt leverage penalty subtracted from base runway score. */
  readonly debtLeveragePenalty: number;
  /**
   * Authoritative raw financial health value (floating-point number in [0, 100]),
   * computed directly as clamp(0, 100, baseRunwayScore - debtLeveragePenalty).
   * This is the exact calculation input used by company-health and bottleneck logic.
   */
  readonly rawFinancialHealth: number;
  /**
   * Rounded integer financial health score (0-100) for UI display and grading thresholds:
   * Math.round(rawFinancialHealth).
   */
  readonly roundedFinancialHealth: MetricScore;
}

// ============================================================================
// 3. COMPANY HEALTH & METRICS
// ============================================================================

/**
 * Operational health profile of the company.
 *
 * NOTE: Financial health is maintained authoritatively in FinancialState
 * (FinancialState.rawFinancialHealth and FinancialState.roundedFinancialHealth).
 * Company-health and bottleneck calculations read directly from FinancialState.
 */
export interface CompanyMetrics {
  /** Employee morale, engagement, and talent retention index (0-100). */
  readonly hrMorale: MetricScore;
  /** IT infrastructure stability, security posture, and code debt index (0-100). */
  readonly itStability: MetricScore;
  /**
   * Weakest link among the three department metrics:
   * min(financials.rawFinancialHealth, hrMorale, itStability).
   */
  readonly weakestLinkMetric: number;
  /** Compounding penalty applied when any department drops below critical threshold (35). */
  readonly criticalDeficitPenalty: number;
  /**
   * Unrounded effective overall company health value in [0, 100] after applying:
   * 1. Weighted base score (35% Fin, 35% HR, 30% IT)
   * 2. Critical deficit penalty (P_crit)
   * 3. Weakest-link ceiling (M_min * 1.6)
   * 4. [0, 100] clamping
   */
  readonly rawEffectiveOverallHealth: number;
  /**
   * Rounded integer overall company health score (0-100) for UI display and grading:
   * Math.round(rawEffectiveOverallHealth).
   */
  readonly overallHealthScore: MetricScore;
  /** Executive performance tier ('A' | 'B' | 'C' | 'D' | 'F'). */
  readonly grade: CompanyGrade;
}

// ============================================================================
// 4. DELAYED EFFECTS & DISCRIMINATED CONDITIONS
// ============================================================================

/**
 * An asynchronous consequence scheduled to trigger on a future turn.
 */
export interface DelayedEffect {
  readonly effectId: string;
  readonly sourceIncidentId: string;
  readonly sourceChoiceId: string;
  readonly creationTurn: number;
  readonly triggerTurn: number;
  readonly executionStage: 'TURN_START_BEFORE_INCIDENT';
  readonly canTriggerInsolvency: boolean;
  readonly cashDelta: Cents;
  readonly grossBurnRateDelta: Cents;
  readonly debtDelta: Cents;
  readonly hrDelta: number;
  readonly itDelta: number;
  readonly narrativeDescription: string;
}

/**
 * Department metric keys that can be evaluated in condition predicates.
 *
 * NOTE ON 'financeHealth' TARGET:
 * Evaluated conditions compare against FinancialState.roundedFinancialHealth (0-100 integer score).
 * FinancialState.rawFinancialHealth remains reserved for internal mathematical formulas.
 */
export type MetricConditionTarget = 'hrMorale' | 'itStability' | 'financeHealth';

/**
 * Condition checking whether a specific choice was selected in a previous incident.
 */
export interface DecisionEqualsCondition {
  readonly type: 'DECISION_EQUALS';
  /** The incident ID to inspect (e.g., 'INC_IT_1'). */
  readonly target: string;
  /** The expected choice ID (e.g., 'CHOICE_1A'). */
  readonly value: string;
}

/**
 * Condition checking whether a department metric is strictly below a threshold.
 */
export interface MetricLessThanCondition {
  readonly type: 'METRIC_LESS_THAN';
  readonly target: MetricConditionTarget;
  /** Normalized score threshold (0-100). */
  readonly value: number;
}

/**
 * Condition checking whether a department metric is strictly above a threshold.
 */
export interface MetricGreaterThanCondition {
  readonly type: 'METRIC_GREATER_THAN';
  readonly target: MetricConditionTarget;
  /** Normalized score threshold (0-100). */
  readonly value: number;
}

/**
 * Condition checking whether a department metric is greater than or equal to a threshold.
 */
export interface MetricGreaterThanOrEqualCondition {
  readonly type: 'METRIC_GREATER_THAN_OR_EQUAL';
  readonly target: MetricConditionTarget;
  /** Normalized score threshold (0-100). */
  readonly value: number;
}

/**
 * Condition checking whether cash reserves are strictly below a threshold in cents.
 */
export interface CashLessThanCondition {
  readonly type: 'CASH_LESS_THAN';
  readonly target: 'cash';
  /** Cash balance threshold in integer minor currency units (cents). */
  readonly value: Cents;
}

/**
 * Strictly discriminated union for all scenario conditions.
 * Prevents invalid target/value pairings at compile time.
 */
export type IncidentCondition =
  | DecisionEqualsCondition
  | MetricLessThanCondition
  | MetricGreaterThanCondition
  | MetricGreaterThanOrEqualCondition
  | CashLessThanCondition;

// ============================================================================
// 5. INCIDENT CHOICES & MODIFIERS
// ============================================================================

/**
 * Rule modifying a choice's impacts or availability when all conditions are met.
 */
export interface ChoiceModifier {
  readonly modifierId: string;
  readonly targetChoiceId: string;
  /** All conditions must evaluate to true (strict AND semantics). */
  readonly conditions: readonly IncidentCondition[];
  /** Replaces the choice's base cashDelta in minor units if active. */
  readonly overrideCashDelta?: Cents;
  /** Replaces the choice's base grossBurnRateDelta in minor units if active. */
  readonly overrideGrossBurnRateDelta?: Cents;
  /** Replaces the choice's base hrDelta if active. */
  readonly overrideHrDelta?: number;
  /** Replaces the choice's base itDelta if active. */
  readonly overrideItDelta?: number;
  /** Locks the choice if active. */
  readonly isLocked?: boolean;
  /** Pedagogical explanation for why this choice is locked under current conditions. */
  readonly lockReason?: string;
}

/**
 * Direct operational and balance-sheet impact of a decision.
 */
export interface ChoiceImpact {
  readonly cashDelta: Cents;
  readonly grossBurnRateDelta: Cents;
  readonly debtDelta: Cents;
  readonly hrDelta: number;
  readonly itDelta: number;
  readonly operationalExplanation: string;
}

/**
 * Pedagogical feedback accompanying each decision option.
 */
export interface LearningFeedback {
  readonly corePrinciple: string;
  readonly tradeoffSummary: string;
  readonly risksCreated: readonly string[];
}

/**
 * Blueprint definition of an option within an incident.
 */
export interface ScenarioChoice {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly executiveRationale: string;
  readonly baseImpact: ChoiceImpact;
  /** Optional delayed consequence scheduled upon selecting this option. */
  readonly scheduledDelayedEffect?: Omit<
    DelayedEffect,
    'creationTurn' | 'sourceIncidentId' | 'sourceChoiceId'
  >;
  readonly learningFeedback: LearningFeedback;
}

/**
 * Evaluated runtime representation of an incident choice after all active
 * modifiers have been resolved by the engine.
 */
export interface EvaluatedChoice {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly executiveRationale: string;
  readonly effectiveImpact: ChoiceImpact;
  readonly isLocked: boolean;
  /** Deterministic, deduplicated list of reasons if locked by one or more modifiers. */
  readonly lockReasons: readonly string[];
  readonly scheduledDelayedEffect?: Omit<
    DelayedEffect,
    'creationTurn' | 'sourceIncidentId' | 'sourceChoiceId'
  >;
  readonly learningFeedback: LearningFeedback;
}

// ============================================================================
// 6. INCIDENTS & SCENARIO BLUEPRINT
// ============================================================================

/**
 * Contextual narrative lead-in conditioned on previous player decisions.
 */
export interface NarrativeVariant {
  readonly variantId: string;
  readonly conditions: readonly IncidentCondition[];
  readonly leadInText: string;
}

/**
 * An organizational dilemma presented to the executive on a specific turn.
 */
export interface Incident {
  readonly id: string;
  readonly turn: number;
  readonly department: DepartmentId;
  readonly title: string;
  readonly urgency: IncidentUrgency;
  readonly basePremise: string;
  readonly businessContext: string;
  readonly narrativeVariants: readonly NarrativeVariant[];
  readonly choices: readonly ScenarioChoice[];
}

/**
 * Starting operational and financial baseline for a scenario.
 */
export interface ScenarioInitialConditions {
  readonly startingCash: Cents;
  readonly startingGrossMonthlyBurn: Cents;
  readonly startingDebt: Cents;
  readonly startingHrMorale: MetricScore;
  readonly startingItStability: MetricScore;
  readonly loanTerms?: {
    readonly annualInterestRate: number;
    readonly monthlyPrincipalAmortization: Cents;
  };
}

/**
 * Self-contained, declarative scenario package authored for training.
 */
export interface Scenario {
  readonly id: string;
  readonly title: string;
  readonly targetAudience: string;
  readonly learningObjectives: readonly string[];
  readonly totalTurns: number;
  readonly initialConditions: ScenarioInitialConditions;
  readonly incidents: readonly Incident[];
  readonly modifiers: readonly ChoiceModifier[];
}

// ============================================================================
// 7. DECISION LEDGER (AUDIT TRAIL)
// ============================================================================

/**
 * Comprehensive financial and organizational state snapshot captured before and after decisions.
 * Preserves complete debt-service state and unrounded calculation values.
 */
export interface StateSnapshot {
  readonly cash: Cents;
  readonly debtPrincipal: Cents;
  readonly grossMonthlyBurn: Cents;
  readonly projectedNetMonthlyBurn: Cents;
  readonly effectiveRunwayMonths: number;
  readonly rawFinancialHealth: number;
  readonly roundedFinancialHealth: MetricScore;
  readonly debtService: DebtServiceState;
  readonly hrMorale: MetricScore;
  readonly itStability: MetricScore;
  readonly rawEffectiveOverallHealth: number;
  readonly overallHealthScore: MetricScore;
  readonly grade: CompanyGrade;
}

/**
 * Audit record of a delayed consequence that resolved on a given turn.
 */
export interface DelayedEffectResolution {
  readonly effectId: string;
  readonly sourceIncidentId: string;
  readonly narrativeDescription: string;
  readonly appliedDeltas: {
    readonly cashDelta: Cents;
    readonly grossBurnRateDelta: Cents;
    readonly debtDelta: Cents;
    readonly hrDelta: number;
    readonly itDelta: number;
  };
}

/**
 * Immutable historical record of an executive decision and its resulting cascade.
 */
export interface DecisionLedgerRecord {
  readonly entryIndex: number;
  readonly turn: number;
  readonly timestamp: number;
  readonly incidentId: string;
  readonly incidentTitle: string;
  readonly department: DepartmentId;
  readonly chosenOptionId: string;
  readonly chosenOptionLabel: string;
  readonly executiveRationale: string;
  /** Effective impacts after all active modifiers were applied. */
  readonly effectiveChoiceImpact: ChoiceImpact;
  /** Immediate financial deltas applied from the choice. */
  readonly immediateFinancialDeltas: {
    readonly cashDelta: Cents;
    readonly grossBurnRateDelta: Cents;
    readonly debtDelta: Cents;
  };
  /** Immediate metric deltas applied from the choice. */
  readonly immediateMetricDeltas: {
    readonly hrDelta: number;
    readonly itDelta: number;
  };
  /** Operating burn and debt service actually deducted during this turn's monthly settlement. */
  readonly monthlyBurnDeductionPaid: {
    readonly grossBurnPaid: Cents;
    readonly debtServicePaid: Cents;
    readonly principalAmortized: Cents;
    readonly interestPaid: Cents;
    readonly totalCashDeducted: Cents;
  };
  /** Full debt servicing state immediately after this turn's monthly settlement. */
  readonly debtServiceSnapshot: DebtServiceState;
  /** Delayed consequences scheduled into the queue by this decision. */
  readonly delayedEffectsScheduled: readonly {
    readonly effectId: string;
    readonly triggerTurn: number;
    readonly description: string;
  }[];
  /** Delayed consequences that resolved at turn start before this decision. */
  readonly delayedEffectsResolvedThisTurn: readonly DelayedEffectResolution[];
  readonly businessCausality: string;
  readonly learningFeedback: LearningFeedback;
  readonly stateBefore: StateSnapshot;
  readonly stateAfter: StateSnapshot;
}

// ============================================================================
// 8. SIMULATION STATE & API CONTRACTS
// ============================================================================

/**
 * Complete snapshot of the headless simulation at any point in time.
 */
export interface SimulationState {
  readonly scenarioId: string;
  readonly currentTurn: number;
  readonly totalTurns: number;
  readonly phase: SimulationPhase;
  readonly isInsolvent: boolean;
  readonly financials: FinancialState;
  readonly metrics: CompanyMetrics;
  readonly pendingDelayedEffects: readonly DelayedEffect[];
  readonly decisionLedger: readonly DecisionLedgerRecord[];
  /** Active incident for currentTurn, with contextual narrative selected. */
  readonly activeIncident: Incident | null;
  /** Evaluated choices for activeIncident, including lock state and combined lock reasons. */
  readonly evaluatedChoices: readonly EvaluatedChoice[];
}

/**
 * Result returned when submitting a decision to the simulation engine.
 */
export type ResolutionResult =
  | {
      readonly success: true;
      readonly turn: number;
      readonly record: DecisionLedgerRecord;
      readonly nextPhase: SimulationPhase;
      readonly updatedState: SimulationState;
    }
  | {
      readonly success: false;
      readonly error:
        | 'SIMULATION_NOT_ACTIVE'
        | 'ALREADY_RESOLVED_THIS_TURN'
        | 'INVALID_INCIDENT'
        | 'INVALID_CHOICE'
        | 'CHOICE_LOCKED'
        | 'INSOLVENCY_HALT';
      readonly message: string;
      readonly lockReasons?: readonly string[];
    };

// ============================================================================
// 9. EVENT EMISSION SYSTEM
// ============================================================================

export type SimulationEventType =
  | 'SIMULATION_INITIALIZED'
  | 'TURN_STARTED'
  | 'DELAYED_EFFECT_RESOLVED'
  | 'DECISION_RESOLVED'
  | 'INSOLVENCY_TRIGGERED'
  | 'SIMULATION_COMPLETED';

export type SimulationEvent =
  | {
      readonly type: 'SIMULATION_INITIALIZED';
      readonly state: SimulationState;
    }
  | {
      readonly type: 'TURN_STARTED';
      readonly turn: number;
      readonly activeIncident: Incident;
      readonly evaluatedChoices: readonly EvaluatedChoice[];
      readonly state: SimulationState;
    }
  | {
      readonly type: 'DELAYED_EFFECT_RESOLVED';
      readonly effect: DelayedEffect;
      readonly state: SimulationState;
    }
  | {
      readonly type: 'DECISION_RESOLVED';
      readonly record: DecisionLedgerRecord;
      readonly state: SimulationState;
    }
  | {
      readonly type: 'INSOLVENCY_TRIGGERED';
      readonly reason: string;
      readonly state: SimulationState;
    }
  | {
      readonly type: 'SIMULATION_COMPLETED';
      readonly finalGrade: CompanyGrade;
      readonly finalOverallHealthScore: MetricScore;
      readonly rawFinalOverallHealth: number;
      readonly state: SimulationState;
    };
