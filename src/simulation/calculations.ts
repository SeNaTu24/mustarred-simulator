/**
 * Mustarred Company Simulator - Pure Calculation Functions
 *
 * Headless, deterministic mathematical functions for financial runway,
 * debt servicing, bottleneck-penalized company health, and grade evaluation.
 *
 * INVARIANTS:
 * - All monetary values are integer minor currency units (cents). Non-integer values are rejected.
 * - Non-negative invariants are enforced on debt principal, burn rate, and loan parameters.
 * - Cash may be negative because acute insolvency is a modeled simulation state.
 * - Normalized metrics must be finite numbers in [0, 100]; invalid inputs are strictly rejected.
 * - Functions are strictly pure and do not mutate inputs.
 */

import type {
  Cents,
  CompanyGrade,
  CompanyMetrics,
  DebtPaymentBreakdown,
  DebtServiceState,
  FinancialState,
  MetricScore,
} from './types.ts';

// ============================================================================
// 1. VALIDATION & SANITIZATION HELPERS
// ============================================================================

/**
 * Validates that a monetary value is a finite integer representing minor currency units (cents).
 * Allows negative values (e.g. cash during insolvency or negative cash deltas).
 * Throws a TypeError if non-integer or non-finite.
 */
export function assertIntegerCents(value: number, paramName: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new TypeError(
      `[SimulationCalculationError] ${paramName} must be a finite integer number of cents. Received: ${value}`
    );
  }
}

/**
 * Validates that a monetary value is a finite, non-negative integer representing minor currency units (cents).
 * Used for debt principal, gross burn, debt payments, and contractual amortization.
 * Throws TypeError if non-integer and RangeError if negative.
 */
export function assertNonNegativeIntegerCents(value: number, paramName: string): void {
  assertIntegerCents(value, paramName);
  if (value < 0) {
    throw new RangeError(
      `[SimulationCalculationError] ${paramName} cannot be negative. Received: ${value}`
    );
  }
}

/**
 * Validates that an annual interest rate is a finite, non-negative decimal fraction (e.g., 0.08 for 8% APR).
 * Rejects negative rates rather than silently treating them as zero.
 */
export function assertValidAnnualInterestRate(rate: number, paramName: string): void {
  if (!Number.isFinite(rate) || rate < 0) {
    throw new RangeError(
      `[SimulationCalculationError] ${paramName} must be a finite, non-negative decimal fraction. Received: ${rate}`
    );
  }
}

/**
 * Validates that an input metric score (HR morale, IT stability, raw financial health)
 * is a finite number in the valid normalized range [0, 100].
 * Rejects invalid inputs rather than silently clamping them.
 */
export function assertMetricInput(value: number, paramName: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError(
      `[SimulationCalculationError] ${paramName} must be a finite number between 0 and 100. Received: ${value}`
    );
  }
}

/**
 * Clamps a legitimately calculated numeric output between a minimum and maximum boundary.
 */
export function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// 2. DEBT SERVICING & PROJECTION CALCULATIONS
// ============================================================================

/**
 * Calculates monthly interest accrued on outstanding principal at an annual interest rate:
 * interest = round(principal * (annualInterestRate / 12)).
 * Interest is rounded to the nearest integer minor unit (cent).
 */
export function calculateMonthlyInterest(
  principal: Cents,
  annualInterestRate: number
): Cents {
  assertNonNegativeIntegerCents(principal, 'principal');
  assertValidAnnualInterestRate(annualInterestRate, 'annualInterestRate');

  if (principal === 0 || annualInterestRate === 0) {
    return 0;
  }
  const monthlyRate = annualInterestRate / 12;
  return Math.round(principal * monthlyRate);
}

/**
 * Calculates contractual principal repayment for the current payment cycle,
 * ensuring repayment cannot exceed the outstanding principal balance.
 */
export function calculateContractualPrincipalRepayment(
  principal: Cents,
  contractualMonthlyAmortization: Cents
): Cents {
  assertNonNegativeIntegerCents(principal, 'principal');
  assertNonNegativeIntegerCents(
    contractualMonthlyAmortization,
    'contractualMonthlyAmortization'
  );

  if (principal === 0 || contractualMonthlyAmortization === 0) {
    return 0;
  }
  return Math.min(principal, contractualMonthlyAmortization);
}

/**
 * Computes a complete debt payment breakdown (interest, principal, total)
 * for a given principal balance, interest rate, and amortization schedule.
 */
export function calculateDebtPaymentBreakdown(
  principal: Cents,
  annualInterestRate: number,
  contractualMonthlyAmortization: Cents
): DebtPaymentBreakdown {
  assertNonNegativeIntegerCents(principal, 'principal');
  assertValidAnnualInterestRate(annualInterestRate, 'annualInterestRate');
  assertNonNegativeIntegerCents(
    contractualMonthlyAmortization,
    'contractualMonthlyAmortization'
  );

  if (principal === 0) {
    return { interest: 0, principal: 0, total: 0 };
  }
  const interest = calculateMonthlyInterest(principal, annualInterestRate);
  const principalPaid = calculateContractualPrincipalRepayment(
    principal,
    contractualMonthlyAmortization
  );
  return {
    interest,
    principal: principalPaid,
    total: interest + principalPaid,
  };
}

/**
 * Calculates total cash required to satisfy the current turn's settlement:
 * gross monthly burn + contractual debt service due.
 */
export function calculateRequiredSettlementCash(
  grossMonthlyBurn: Cents,
  debtServiceDueTotal: Cents
): Cents {
  assertNonNegativeIntegerCents(grossMonthlyBurn, 'grossMonthlyBurn');
  assertNonNegativeIntegerCents(debtServiceDueTotal, 'debtServiceDueTotal');
  return grossMonthlyBurn + debtServiceDueTotal;
}

/**
 * Pure transition function calculating the complete DebtServiceState for a turn.
 * Distinguishes current-period payments from projected next-turn obligations,
 * strictly conditioned on whether the caller's cash settlement succeeded.
 *
 * SETTLEMENT OUTCOMES:
 * 1. Successful Settlement (isSettlementSuccessful = true):
 *    - Current interest and contractual principal are recorded in currentTurnPaid.
 *    - Post-payment principal is reduced: max(0, principalBeforeSettlement - principalPaid).
 *    - Projected next turn debt service is derived from postPaymentPrincipal.
 *    - If postPaymentPrincipal reaches 0: hasActiveDebt remains true for this settlement record,
 *      recording the final payment, while projectedNextTurn becomes zero.
 *      Contractual terms (interest rate and amortization) are preserved for the audit trail.
 *
 * 2. Failed Settlement / Default (isSettlementSuccessful = false):
 *    - The company lacked sufficient cash to pay its debt service.
 *    - NO principal repayment is recorded: currentTurnPaid = { interest: 0, principal: 0, total: 0 }.
 *    - Post-payment principal is NOT reduced: postPaymentPrincipal = principalBeforeSettlement.
 *    - Projected next turn reflects the full unserviced principal.
 *    - hasActiveDebt remains true (debt is active and in default).
 *
 * 3. Genuine No-Debt State (hasActiveDebtAtStartOfCycle = false AND principal = 0):
 *    - hasActiveDebt = false.
 *    - All amounts, interest rates, and amortization requirements are strictly zero.
 */
export function calculateDebtServiceState(params: {
  readonly principalBeforeSettlement: Cents;
  readonly annualInterestRate: number;
  readonly monthlyPrincipalAmortization: Cents;
  readonly hasActiveDebtAtStartOfCycle: boolean;
  readonly isSettlementSuccessful: boolean;
}): DebtServiceState {
  const {
    principalBeforeSettlement,
    annualInterestRate,
    monthlyPrincipalAmortization,
    hasActiveDebtAtStartOfCycle,
    isSettlementSuccessful,
  } = params;

  if (typeof isSettlementSuccessful !== 'boolean') {
    throw new TypeError(
      `[SimulationCalculationError] isSettlementSuccessful must be a boolean. Received: ${isSettlementSuccessful}`
    );
  }

  assertNonNegativeIntegerCents(principalBeforeSettlement, 'principalBeforeSettlement');
  assertValidAnnualInterestRate(annualInterestRate, 'annualInterestRate');
  assertNonNegativeIntegerCents(monthlyPrincipalAmortization, 'monthlyPrincipalAmortization');

  const hasActiveDebt = hasActiveDebtAtStartOfCycle || principalBeforeSettlement > 0;

  // Genuine no-debt state
  if (!hasActiveDebt || principalBeforeSettlement === 0) {
    return {
      hasActiveDebt: false,
      currentTurnPaid: { interest: 0, principal: 0, total: 0 },
      postPaymentPrincipal: 0,
      projectedNextTurn: { interest: 0, principal: 0, total: 0 },
      annualInterestRate: 0,
      monthlyPrincipalAmortization: 0,
    };
  }

  // Failed settlement (Insolvency / Default): no payment made, principal preserved
  if (!isSettlementSuccessful) {
    const projectedDue = calculateDebtPaymentBreakdown(
      principalBeforeSettlement,
      annualInterestRate,
      monthlyPrincipalAmortization
    );

    return {
      hasActiveDebt: true,
      currentTurnPaid: { interest: 0, principal: 0, total: 0 },
      postPaymentPrincipal: principalBeforeSettlement,
      projectedNextTurn: projectedDue,
      annualInterestRate,
      monthlyPrincipalAmortization,
    };
  }

  // Successful settlement: payment recorded, principal reduced
  const currentTurnPaid = calculateDebtPaymentBreakdown(
    principalBeforeSettlement,
    annualInterestRate,
    monthlyPrincipalAmortization
  );

  const postPaymentPrincipal = Math.max(
    0,
    principalBeforeSettlement - currentTurnPaid.principal
  );

  const projectedNextTurn =
    postPaymentPrincipal > 0
      ? calculateDebtPaymentBreakdown(
          postPaymentPrincipal,
          annualInterestRate,
          monthlyPrincipalAmortization
        )
      : { interest: 0, principal: 0, total: 0 };

  return {
    hasActiveDebt: true,
    currentTurnPaid,
    postPaymentPrincipal,
    projectedNextTurn,
    // Contractual terms preserved for audit even if postPaymentPrincipal reached 0 this turn
    annualInterestRate,
    monthlyPrincipalAmortization,
  };
}

// ============================================================================
// 3. RUNWAY & FINANCIAL HEALTH CALCULATIONS
// ============================================================================

/**
 * Calculates effective forward-looking runway in months as:
 * postSettlementCash / max(1, projectedNetMonthlyBurn).
 *
 * NOTE: Must be evaluated using post-settlement cash.
 * If cash <= 0, runway is 0.0 months.
 */
export function calculateEffectiveRunway(
  postSettlementCash: Cents,
  projectedNetMonthlyBurn: Cents
): number {
  assertIntegerCents(postSettlementCash, 'postSettlementCash');
  assertNonNegativeIntegerCents(projectedNetMonthlyBurn, 'projectedNetMonthlyBurn');

  if (postSettlementCash <= 0) {
    return 0;
  }
  const safeBurn = Math.max(1, projectedNetMonthlyBurn);
  return postSettlementCash / safeBurn;
}

/**
 * Continuous, piecewise base runway score function (C^0 continuous everywhere):
 * - R <= 0: 0.0
 * - 0 < R < 6: R * (50 / 6) = 8.3333... * R
 * - 6 <= R < 12: 50 + (R - 6) * 5.0
 * - 12 <= R <= 18: 80 + (R - 12) * (20 / 6)
 * - R > 18: 100.0
 */
export function calculateBaseRunwayScore(runwayMonths: number): number {
  if (!Number.isFinite(runwayMonths)) {
    throw new TypeError(
      `[SimulationCalculationError] runwayMonths must be a finite number. Received: ${runwayMonths}`
    );
  }
  if (runwayMonths <= 0) {
    return 0;
  }
  if (runwayMonths < 6) {
    return runwayMonths * (50 / 6);
  }
  if (runwayMonths < 12) {
    return 50 + (runwayMonths - 6) * 5.0;
  }
  if (runwayMonths <= 18) {
    return 80 + (runwayMonths - 12) * (20 / 6);
  }
  return 100;
}

/**
 * Calculates the debt leverage penalty applied against the base runway score.
 * Formula: min(35, 25 * (debt / max(1, cash)) + 15 * (projectedDebtService / max(1, projectedNetBurn)))
 *
 * NOTE: Evaluated using post-settlement cash and post-payment remaining principal.
 */
export function calculateDebtLeveragePenalty(
  postPaymentDebtPrincipal: Cents,
  postSettlementCash: Cents,
  projectedDebtServiceTotal: Cents,
  projectedNetMonthlyBurn: Cents
): number {
  assertNonNegativeIntegerCents(postPaymentDebtPrincipal, 'postPaymentDebtPrincipal');
  assertIntegerCents(postSettlementCash, 'postSettlementCash');
  assertNonNegativeIntegerCents(projectedDebtServiceTotal, 'projectedDebtServiceTotal');
  assertNonNegativeIntegerCents(projectedNetMonthlyBurn, 'projectedNetMonthlyBurn');

  if (postPaymentDebtPrincipal === 0) {
    return 0;
  }

  const safeCash = Math.max(1, postSettlementCash);
  const safeBurn = Math.max(1, projectedNetMonthlyBurn);

  const principalRatio = postPaymentDebtPrincipal / safeCash;
  const serviceRatio = projectedDebtServiceTotal / safeBurn;

  const rawPenalty = 25 * principalRatio + 15 * serviceRatio;
  return Math.min(35, rawPenalty);
}

/**
 * Calculates authoritative raw and rounded financial health scores:
 * rawFinancialHealth = clamp(0, 100, baseRunwayScore - debtLeveragePenalty)
 * roundedFinancialHealth = Math.round(rawFinancialHealth)
 */
export function calculateFinancialHealth(
  baseRunwayScore: number,
  debtLeveragePenalty: number
): {
  readonly rawFinancialHealth: number;
  readonly roundedFinancialHealth: MetricScore;
} {
  if (!Number.isFinite(baseRunwayScore) || baseRunwayScore < 0 || baseRunwayScore > 100) {
    throw new RangeError(
      `[SimulationCalculationError] baseRunwayScore must be in [0, 100]. Received: ${baseRunwayScore}`
    );
  }
  if (!Number.isFinite(debtLeveragePenalty) || debtLeveragePenalty < 0 || debtLeveragePenalty > 35) {
    throw new RangeError(
      `[SimulationCalculationError] debtLeveragePenalty must be in [0, 35]. Received: ${debtLeveragePenalty}`
    );
  }

  const rawFinancialHealth = clamp(0, 100, baseRunwayScore - debtLeveragePenalty);
  const roundedFinancialHealth = Math.round(rawFinancialHealth);
  return { rawFinancialHealth, roundedFinancialHealth };
}

/**
 * Evaluates the complete FinancialState.
 *
 * CASH SETTLEMENT CONTRACT:
 * The caller (simulation engine) is strictly responsible for determining settlement viability
 * and executing cash deduction prior to calling this function:
 *   1. Calculate required settlement: grossMonthlyBurn + debtServiceDue.total
 *   2. If cashBeforeSettlement >= requiredSettlement:
 *        isSettlementSuccessful = true
 *        postSettlementCash = cashBeforeSettlement - requiredSettlement
 *   3. If cashBeforeSettlement < requiredSettlement:
 *        isSettlementSuccessful = false
 *        postSettlementCash = 0 (insolvency triggered; no principal repaid)
 *
 * Passing postSettlementCash and isSettlementSuccessful guarantees that:
 * 1. Current-turn burn and debt service are deducted exactly once.
 * 2. Principal is only reduced if the company actually paid it.
 * 3. Forward runway and financial health accurately reflect post-settlement solvency.
 */
export function evaluateFinancialState(params: {
  readonly postSettlementCash: Cents;
  readonly grossMonthlyBurn: Cents;
  readonly principalBeforeSettlement: Cents;
  readonly annualInterestRate: number;
  readonly monthlyPrincipalAmortization: Cents;
  readonly hasActiveDebtAtStartOfCycle: boolean;
  readonly isSettlementSuccessful: boolean;
}): FinancialState {
  const { postSettlementCash, grossMonthlyBurn, isSettlementSuccessful } = params;

  if (typeof isSettlementSuccessful !== 'boolean') {
    throw new TypeError(
      `[SimulationCalculationError] isSettlementSuccessful must be a boolean. Received: ${isSettlementSuccessful}`
    );
  }

  assertIntegerCents(postSettlementCash, 'postSettlementCash');
  assertNonNegativeIntegerCents(grossMonthlyBurn, 'grossMonthlyBurn');

  // 1. Resolve debt servicing transition conditioned on settlement success
  const debtService = calculateDebtServiceState({
    principalBeforeSettlement: params.principalBeforeSettlement,
    annualInterestRate: params.annualInterestRate,
    monthlyPrincipalAmortization: params.monthlyPrincipalAmortization,
    hasActiveDebtAtStartOfCycle: params.hasActiveDebtAtStartOfCycle,
    isSettlementSuccessful,
  });

  // 2. Compute forward-looking projected monthly burn
  const projectedNetMonthlyBurn =
    grossMonthlyBurn + debtService.projectedNextTurn.total;

  // 3. Forward runway based on post-settlement cash
  const effectiveRunwayMonths = calculateEffectiveRunway(
    postSettlementCash,
    projectedNetMonthlyBurn
  );

  // 4. Base runway score
  const baseRunwayScore = calculateBaseRunwayScore(effectiveRunwayMonths);

  // 5. Debt leverage penalty based on post-payment principal and post-settlement cash
  const debtLeveragePenalty = calculateDebtLeveragePenalty(
    debtService.postPaymentPrincipal,
    postSettlementCash,
    debtService.projectedNextTurn.total,
    projectedNetMonthlyBurn
  );

  // 6. Authoritative financial health values
  const { rawFinancialHealth, roundedFinancialHealth } =
    calculateFinancialHealth(baseRunwayScore, debtLeveragePenalty);

  return {
    cash: postSettlementCash,
    debtPrincipal: debtService.postPaymentPrincipal,
    grossMonthlyBurn,
    debtService,
    projectedNetMonthlyBurn,
    effectiveRunwayMonths,
    baseRunwayScore,
    debtLeveragePenalty,
    rawFinancialHealth,
    roundedFinancialHealth,
  };
}

// ============================================================================
// 4. COMPANY HEALTH & BOTTLENECK CALCULATIONS
// ============================================================================

/**
 * Evaluates critical deficit penalty for any department falling below threshold (35):
 * sum(max(0, 35 - metric)^1.25) across rawFinancialHealth, hrMorale, and itStability.
 */
export function calculateCriticalDeficitPenalty(
  rawFinancialHealth: number,
  hrMorale: MetricScore,
  itStability: MetricScore
): number {
  assertMetricInput(rawFinancialHealth, 'rawFinancialHealth');
  assertMetricInput(hrMorale, 'hrMorale');
  assertMetricInput(itStability, 'itStability');

  const threshold = 35;
  const finDeficit = Math.max(0, threshold - rawFinancialHealth);
  const hrDeficit = Math.max(0, threshold - hrMorale);
  const itDeficit = Math.max(0, threshold - itStability);

  return (
    Math.pow(finDeficit, 1.25) +
    Math.pow(hrDeficit, 1.25) +
    Math.pow(itDeficit, 1.25)
  );
}

/**
 * Calculates composite company health with bottleneck protection:
 * 1. Weighted base = 0.35 * rawFin + 0.35 * HR + 0.30 * IT
 * 2. Critical deficit penalty subtracted
 * 3. Weakest-link ceiling: min(base - penalty, weakestMetric * 1.6)
 * 4. Bounded in [0, 100]
 *
 * Preserves rawEffectiveOverallHealth and overallHealthScore separately.
 */
export function calculateCompanyHealth(
  rawFinancialHealth: number,
  hrMorale: MetricScore,
  itStability: MetricScore
): {
  readonly weakestLinkMetric: number;
  readonly criticalDeficitPenalty: number;
  readonly rawEffectiveOverallHealth: number;
  readonly overallHealthScore: MetricScore;
} {
  assertMetricInput(rawFinancialHealth, 'rawFinancialHealth');
  assertMetricInput(hrMorale, 'hrMorale');
  assertMetricInput(itStability, 'itStability');

  const weightedBase =
    0.35 * rawFinancialHealth + 0.35 * hrMorale + 0.3 * itStability;
  const weakestLinkMetric = Math.min(rawFinancialHealth, hrMorale, itStability);
  const criticalDeficitPenalty = calculateCriticalDeficitPenalty(
    rawFinancialHealth,
    hrMorale,
    itStability
  );

  const penalizedScore = weightedBase - criticalDeficitPenalty;
  const ceilingScore = weakestLinkMetric * 1.6;

  const rawEffectiveOverallHealth = clamp(
    0,
    100,
    Math.min(penalizedScore, ceilingScore)
  );
  const overallHealthScore = Math.round(rawEffectiveOverallHealth);

  return {
    weakestLinkMetric,
    criticalDeficitPenalty,
    rawEffectiveOverallHealth,
    overallHealthScore,
  };
}

// ============================================================================
// 5. EXECUTIVE GRADING EVALUATION
// ============================================================================

/**
 * Strictly evaluates corporate performance tier ('A' | 'B' | 'C' | 'D' | 'F')
 * according to the approved rules:
 * - Grade F: cash <= 0 OR weakestLinkMetric < 20 OR overallHealthScore < 35
 * - Grade D: weakestLinkMetric < 30 OR overallHealthScore < 50
 * - Grade C: weakestLinkMetric < 45 OR overallHealthScore < 65
 * - Grade B: weakestLinkMetric < 60 OR overallHealthScore < 80
 * - Grade A: overallHealthScore >= 80 AND weakestLinkMetric >= 60 AND cash > 0
 */
export function evaluateCompanyGrade(
  overallHealthScore: MetricScore,
  weakestLinkMetric: number,
  cash: Cents
): CompanyGrade {
  assertIntegerCents(cash, 'cash');
  assertMetricInput(overallHealthScore, 'overallHealthScore');

  if (!Number.isFinite(weakestLinkMetric) || weakestLinkMetric < 0 || weakestLinkMetric > 100) {
    throw new RangeError(
      `[SimulationCalculationError] weakestLinkMetric must be in [0, 100]. Received: ${weakestLinkMetric}`
    );
  }

  // Hard failure: insolvency, acute department collapse, or overall failure score
  if (cash <= 0 || weakestLinkMetric < 20 || overallHealthScore < 35) {
    return 'F';
  }
  // Distressed: department below 30 or score below 50
  if (weakestLinkMetric < 30 || overallHealthScore < 50) {
    return 'D';
  }
  // Vulnerable
  if (weakestLinkMetric < 45 || overallHealthScore < 65) {
    return 'C';
  }
  // Sound / Stable
  if (weakestLinkMetric < 60 || overallHealthScore < 80) {
    return 'B';
  }
  // Exemplary
  return 'A';
}

/**
 * Evaluates the full operational CompanyMetrics snapshot.
 */
export function evaluateCompanyMetrics(
  rawFinancialHealth: number,
  hrMorale: MetricScore,
  itStability: MetricScore,
  cash: Cents
): CompanyMetrics {
  assertMetricInput(rawFinancialHealth, 'rawFinancialHealth');
  assertMetricInput(hrMorale, 'hrMorale');
  assertMetricInput(itStability, 'itStability');
  assertIntegerCents(cash, 'cash');

  const healthResults = calculateCompanyHealth(
    rawFinancialHealth,
    hrMorale,
    itStability
  );

  const grade = evaluateCompanyGrade(
    healthResults.overallHealthScore,
    healthResults.weakestLinkMetric,
    cash
  );

  return {
    hrMorale,
    itStability,
    weakestLinkMetric: healthResults.weakestLinkMetric,
    criticalDeficitPenalty: healthResults.criticalDeficitPenalty,
    rawEffectiveOverallHealth: healthResults.rawEffectiveOverallHealth,
    overallHealthScore: healthResults.overallHealthScore,
    grade,
  };
}
