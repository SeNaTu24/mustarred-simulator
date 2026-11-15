/**
 * Mustarred Company Simulator - Calculation Layer Test Suite
 *
 * Comprehensive tests for deterministic calculation functions using Node's native test runner (node:test).
 *
 * STRUCTURE:
 * 1. Debt Service & Amortization Unit Tests
 * 2. Runway, Leverage Penalty & Financial Health Unit Tests
 * 3. Company Health, Deficits, Bottlenecks & Executive Grading Unit Tests
 * 4. Input Validation & Error Handling Tests
 * 5. Strategic Paths Turn-by-Turn Verification (Path A, Path B, Path C)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertIntegerCents,
  assertNonNegativeIntegerCents,
  assertValidAnnualInterestRate,
  assertMetricInput,
  clamp,
  calculateMonthlyInterest,
  calculateContractualPrincipalRepayment,
  calculateDebtPaymentBreakdown,
  calculateRequiredSettlementCash,
  calculateDebtServiceState,
  calculateEffectiveRunway,
  calculateBaseRunwayScore,
  calculateDebtLeveragePenalty,
  calculateFinancialHealth,
  evaluateFinancialState,
  calculateCriticalDeficitPenalty,
  calculateCompanyHealth,
  evaluateCompanyGrade,
  evaluateCompanyMetrics,
} from '../src/simulation/calculations.ts';

import type { Cents, MetricScore } from '../src/simulation/types.ts';

// ============================================================================
// 1. DEBT SERVICE & AMORTIZATION UNIT TESTS
// ============================================================================
describe('Debt Service & Amortization Unit Tests', () => {
  it('calculateMonthlyInterest: computes monthly interest with round-to-nearest-cent', () => {
    // $100,000 at 8% APR: 10,000,000 * (0.08 / 12) = 66,666.666... -> 66,667 cents ($666.67)
    assert.equal(calculateMonthlyInterest(10_000_000, 0.08), 66_667);

    // $75,000 at 8% APR: 7,500,000 * (0.08 / 12) = 50,000 cents ($500.00 exact)
    assert.equal(calculateMonthlyInterest(7_500_000, 0.08), 50_000);

    // $71,500 at 8% APR: 7,150,000 * (0.08 / 12) = 47,666.666... -> 47,667 cents ($476.67)
    assert.equal(calculateMonthlyInterest(7_150_000, 0.08), 47_667);

    // Zero principal produces zero interest
    assert.equal(calculateMonthlyInterest(0, 0.08), 0);

    // Zero interest rate produces zero interest
    assert.equal(calculateMonthlyInterest(10_000_000, 0.0), 0);
  });

  it('calculateContractualPrincipalRepayment: caps repayment at outstanding principal', () => {
    // Contractual amortization $3,500 on $75,000 debt -> $3,500 (350,000 cents)
    assert.equal(calculateContractualPrincipalRepayment(7_500_000, 350_000), 350_000);

    // Contractual amortization $3,500 on $2,000 debt -> $2,000 (capped at outstanding)
    assert.equal(calculateContractualPrincipalRepayment(200_000, 350_000), 200_000);

    // Exact equal repayment
    assert.equal(calculateContractualPrincipalRepayment(350_000, 350_000), 350_000);

    // Zero principal
    assert.equal(calculateContractualPrincipalRepayment(0, 350_000), 0);

    // Zero amortization
    assert.equal(calculateContractualPrincipalRepayment(7_500_000, 0), 0);
  });

  it('calculateDebtPaymentBreakdown: combines interest and capped principal', () => {
    const breakdown = calculateDebtPaymentBreakdown(7_500_000, 0.08, 350_000);
    assert.equal(breakdown.interest, 50_000);
    assert.equal(breakdown.principal, 350_000);
    assert.equal(breakdown.total, 400_000);

    // Zero principal produces all zeros
    const zeroBreakdown = calculateDebtPaymentBreakdown(0, 0.08, 350_000);
    assert.deepEqual(zeroBreakdown, { interest: 0, principal: 0, total: 0 });
  });

  it('calculateRequiredSettlementCash: sums gross burn and debt service due', () => {
    // Gross burn $26,000 + debt service $4,000 = $30,000 (3,000,000 cents)
    assert.equal(calculateRequiredSettlementCash(2_600_000, 400_000), 3_000_000);
    assert.equal(calculateRequiredSettlementCash(2_000_000, 0), 2_000_000);
  });

  it('calculateDebtServiceState: handles successful settlement', () => {
    const result = calculateDebtServiceState({
      principalBeforeSettlement: 7_500_000,
      annualInterestRate: 0.08,
      monthlyPrincipalAmortization: 350_000,
      hasActiveDebtAtStartOfCycle: true,
      isSettlementSuccessful: true,
    });

    assert.equal(result.hasActiveDebt, true);
    assert.equal(result.currentTurnPaid.interest, 50_000);
    assert.equal(result.currentTurnPaid.principal, 350_000);
    assert.equal(result.currentTurnPaid.total, 400_000);
    assert.equal(result.postPaymentPrincipal, 7_150_000);
    assert.equal(result.projectedNextTurn.interest, 47_667);
    assert.equal(result.projectedNextTurn.principal, 350_000);
    assert.equal(result.projectedNextTurn.total, 397_667);
    assert.equal(result.annualInterestRate, 0.08);
    assert.equal(result.monthlyPrincipalAmortization, 350_000);
  });

  it('calculateDebtServiceState: handles failed settlement without reducing principal', () => {
    const result = calculateDebtServiceState({
      principalBeforeSettlement: 7_500_000,
      annualInterestRate: 0.08,
      monthlyPrincipalAmortization: 350_000,
      hasActiveDebtAtStartOfCycle: true,
      isSettlementSuccessful: false,
    });

    assert.equal(result.hasActiveDebt, true);
    // Zero payment made
    assert.deepEqual(result.currentTurnPaid, { interest: 0, principal: 0, total: 0 });
    // Principal strictly preserved
    assert.equal(result.postPaymentPrincipal, 7_500_000);
    // Forward obligation still reflects the full unreduced principal
    assert.equal(result.projectedNextTurn.interest, 50_000);
    assert.equal(result.projectedNextTurn.principal, 350_000);
    assert.equal(result.projectedNextTurn.total, 400_000);
  });

  it('calculateDebtServiceState: handles final repayment cycle and preserves audit trail', () => {
    // Final payment where balance equals amortization ($3,500 balance, $3,500 amort)
    const result = calculateDebtServiceState({
      principalBeforeSettlement: 350_000,
      annualInterestRate: 0.08,
      monthlyPrincipalAmortization: 350_000,
      hasActiveDebtAtStartOfCycle: true,
      isSettlementSuccessful: true,
    });

    assert.equal(result.hasActiveDebt, true); // true for the settlement record of this cycle
    assert.equal(result.currentTurnPaid.interest, 2_333); // 350,000 * (0.08 / 12) = 2333.33 -> 2333
    assert.equal(result.currentTurnPaid.principal, 350_000);
    assert.equal(result.currentTurnPaid.total, 352_333);
    assert.equal(result.postPaymentPrincipal, 0); // Debt fully extinguished
    assert.deepEqual(result.projectedNextTurn, { interest: 0, principal: 0, total: 0 }); // Zero future obligations
    // Contractual terms preserved for audit
    assert.equal(result.annualInterestRate, 0.08);
    assert.equal(result.monthlyPrincipalAmortization, 350_000);
  });

  it('calculateDebtServiceState: handles genuine no-debt baseline', () => {
    const result = calculateDebtServiceState({
      principalBeforeSettlement: 0,
      annualInterestRate: 0,
      monthlyPrincipalAmortization: 0,
      hasActiveDebtAtStartOfCycle: false,
      isSettlementSuccessful: true,
    });

    assert.equal(result.hasActiveDebt, false);
    assert.deepEqual(result.currentTurnPaid, { interest: 0, principal: 0, total: 0 });
    assert.equal(result.postPaymentPrincipal, 0);
    assert.deepEqual(result.projectedNextTurn, { interest: 0, principal: 0, total: 0 });
    assert.equal(result.annualInterestRate, 0);
    assert.equal(result.monthlyPrincipalAmortization, 0);
  });
});

// ============================================================================
// 2. RUNWAY, LEVERAGE PENALTY & FINANCIAL HEALTH UNIT TESTS
// ============================================================================
describe('Runway, Leverage Penalty & Financial Health Unit Tests', () => {
  it('calculateEffectiveRunway: computes ratio and handles zero/negative cash', () => {
    // $138,000 cash on $16,000 burn -> 8.625 months
    assert.equal(calculateEffectiveRunway(13_800_000, 1_600_000), 8.625);

    // Zero cash -> 0.0
    assert.equal(calculateEffectiveRunway(0, 1_600_000), 0);

    // Negative cash (insolvent) -> 0.0
    assert.equal(calculateEffectiveRunway(-500_000, 1_600_000), 0);

    // Zero burn protection (avoids division by zero)
    assert.equal(calculateEffectiveRunway(10_000_000, 0), 10_000_000);
  });

  it('calculateBaseRunwayScore: verifies continuous piecewise function across boundaries', () => {
    // R <= 0 -> 0.0
    assert.equal(calculateBaseRunwayScore(-1), 0);
    assert.equal(calculateBaseRunwayScore(0), 0);

    // Segment 1 (0 < R < 6): R * (50 / 6)
    assert.equal(calculateBaseRunwayScore(3), 25);
    const justBelow6 = 5.999;
    assert.ok(Math.abs(calculateBaseRunwayScore(justBelow6) - 49.991666) < 1e-4);

    // Boundary at R = 6: must equal 50.0 exactly from both sides (C^0 continuity)
    assert.equal(calculateBaseRunwayScore(6), 50);

    // Segment 2 (6 <= R < 12): 50 + (R - 6) * 5.0
    const justAbove6 = 6.001;
    assert.ok(Math.abs(calculateBaseRunwayScore(justAbove6) - 50.005) < 1e-4);
    assert.equal(calculateBaseRunwayScore(8.625), 50 + (8.625 - 6) * 5); // 63.125
    assert.equal(calculateBaseRunwayScore(9), 65);
    const justBelow12 = 11.999;
    assert.ok(Math.abs(calculateBaseRunwayScore(justBelow12) - 79.995) < 1e-4);

    // Boundary at R = 12: must equal 80.0 exactly from both sides (C^0 continuity)
    assert.equal(calculateBaseRunwayScore(12), 80);

    // Segment 3 (12 <= R <= 18): 80 + (R - 12) * (20 / 6)
    const justAbove12 = 12.001;
    assert.ok(Math.abs(calculateBaseRunwayScore(justAbove12) - 80.003333) < 1e-4);
    assert.equal(calculateBaseRunwayScore(15), 90);
    const justBelow18 = 17.999;
    assert.ok(Math.abs(calculateBaseRunwayScore(justBelow18) - 99.996666) < 1e-4);

    // Boundary at R = 18: must equal 100.0
    assert.equal(calculateBaseRunwayScore(18), 100);

    // Segment 4 (R > 18): capped at 100.0
    assert.equal(calculateBaseRunwayScore(18.001), 100);
    assert.equal(calculateBaseRunwayScore(24), 100);
    assert.equal(calculateBaseRunwayScore(100), 100);
  });

  it('calculateDebtLeveragePenalty: computes penalty, zero-debt, and 35 cap', () => {
    // Zero debt -> 0.0
    assert.equal(calculateDebtLeveragePenalty(0, 18_400_000, 397_667, 2_997_667), 0);

    // Path C values: $71,500 debt, $184,000 cash, $3,976.67 debt svc, $29,976.67 burn
    // 25 * (71,500 / 184,000) + 15 * (3,976.67 / 29,976.67) = 9.71467 + 1.98988 = 11.70455
    const penalty = calculateDebtLeveragePenalty(7_150_000, 18_400_000, 397_667, 2_997_667);
    assert.ok(Math.abs(penalty - 11.70455) < 1e-3);

    // Massive leverage capped at 35
    const cappedPenalty = calculateDebtLeveragePenalty(100_000_000, 1_000_000, 5_000_000, 5_000_000);
    assert.equal(cappedPenalty, 35);

    // Negative/zero cash with debt -> capped at 35 (safeCash = max(1, cash))
    const zeroCashPenalty = calculateDebtLeveragePenalty(7_150_000, 0, 397_667, 2_997_667);
    assert.equal(zeroCashPenalty, 35);
  });

  it('calculateFinancialHealth: clamps [0, 100] and rounds correctly', () => {
    // Normal case: 50.6905 runway score - 11.7046 penalty = 38.9859 -> 39
    const normal = calculateFinancialHealth(50.6905, 11.7046);
    assert.ok(Math.abs(normal.rawFinancialHealth - 38.9859) < 1e-3);
    assert.equal(normal.roundedFinancialHealth, 39);

    // Maximum health
    const maxHealth = calculateFinancialHealth(100, 0);
    assert.equal(maxHealth.rawFinancialHealth, 100);
    assert.equal(maxHealth.roundedFinancialHealth, 100);

    // Clamping below zero: 10 runway score - 35 penalty -> 0
    const clampedHealth = calculateFinancialHealth(10, 35);
    assert.equal(clampedHealth.rawFinancialHealth, 0);
    assert.equal(clampedHealth.roundedFinancialHealth, 0);

    // Half-up rounding checks
    assert.equal(calculateFinancialHealth(62.5, 0).roundedFinancialHealth, 63);
    assert.equal(calculateFinancialHealth(62.4, 0).roundedFinancialHealth, 62);
  });

  it('evaluateFinancialState: executes full state evaluation with postSettlementCash', () => {
    const finState = evaluateFinancialState({
      postSettlementCash: 13_800_000,
      grossMonthlyBurn: 1_600_000,
      principalBeforeSettlement: 0,
      annualInterestRate: 0,
      monthlyPrincipalAmortization: 0,
      hasActiveDebtAtStartOfCycle: false,
      isSettlementSuccessful: true,
    });

    assert.equal(finState.cash, 13_800_000);
    assert.equal(finState.debtPrincipal, 0);
    assert.equal(finState.grossMonthlyBurn, 1_600_000);
    assert.equal(finState.projectedNetMonthlyBurn, 1_600_000);
    assert.equal(finState.effectiveRunwayMonths, 8.625);
    assert.equal(finState.debtLeveragePenalty, 0);
    assert.equal(finState.roundedFinancialHealth, 63);
  });
});

// ============================================================================
// 3. COMPANY HEALTH, DEFICITS, BOTTLENECKS & EXECUTIVE GRADING UNIT TESTS
// ============================================================================
describe('Company Health, Deficits, Bottlenecks & Executive Grading Unit Tests', () => {
  it('calculateCriticalDeficitPenalty: computes sum(max(0, 35 - M)^1.25)', () => {
    // No deficit when all metrics >= 35
    assert.equal(calculateCriticalDeficitPenalty(35, 35, 35), 0);
    assert.equal(calculateCriticalDeficitPenalty(63, 75, 90), 0);

    // Single deficit: HR = 10 -> (35 - 10)^1.25 = 25^1.25 = 55.901699...
    const singleDeficit = calculateCriticalDeficitPenalty(80, 10, 80);
    assert.ok(Math.abs(singleDeficit - 55.9017) < 1e-3);

    // Double deficit: HR = 10 (25^1.25 = 55.9017) + IT = 15 (20^1.25 = 42.2949) = 98.1966
    const doubleDeficit = calculateCriticalDeficitPenalty(82, 10, 15);
    assert.ok(Math.abs(doubleDeficit - 98.1966) < 1e-3);
  });

  it('calculateCompanyHealth: applies weighted base, penalty, bottleneck ceiling, and clamping', () => {
    // Path A: Fin 63.125, HR 75, IT 90 -> weightedBase = 0.35*63.125 + 0.35*75 + 0.30*90 = 75.34375
    // Weakest link = 63.125 >= 35 (penalty = 0), ceiling = 63.125 * 1.6 = 101.0 -> raw = 75.34375 -> rounded = 75
    const pathA = calculateCompanyHealth(63.125, 75, 90);
    assert.equal(pathA.overallHealthScore, 75);
    assert.equal(pathA.criticalDeficitPenalty, 0);
    assert.equal(pathA.weakestLinkMetric, 63.125);

    // Bottleneck ceiling active test: Fin 80, HR 80, IT 30
    // weightedBase = 0.35*80 + 0.35*80 + 0.30*30 = 28 + 28 + 9 = 65
    // penalty = (35 - 30)^1.25 = 7.4767
    // penalizedScore = 65 - 7.4767 = 57.5233
    // ceilingScore = 30 * 1.6 = 48.0
    // min(57.5233, 48.0) = 48.0 -> raw = 48.0, rounded = 48
    const ceilingActive = calculateCompanyHealth(80, 80, 30);
    assert.equal(ceilingActive.overallHealthScore, 48);
    assert.equal(ceilingActive.rawEffectiveOverallHealth, 48);

    // Collapse to zero: Fin 82, HR 10, IT 15 -> penalizedScore = 36.54 - 98.20 < 0 -> clamped to 0
    const collapsed = calculateCompanyHealth(81.5476, 10, 15);
    assert.equal(collapsed.overallHealthScore, 0);
    assert.equal(collapsed.rawEffectiveOverallHealth, 0);
  });

  it('evaluateCompanyGrade: verifies every tier boundary and override conditions', () => {
    const cash = 10_000_000; // $100k positive cash

    // Grade F hard overrides:
    // 1. Insolvency (cash <= 0)
    assert.equal(evaluateCompanyGrade(85, 80, 0), 'F');
    assert.equal(evaluateCompanyGrade(85, 80, -100_000), 'F');

    // 2. Acute department collapse (weakestLinkMetric < 20)
    assert.equal(evaluateCompanyGrade(75, 19, cash), 'F');
    assert.equal(evaluateCompanyGrade(75, 19.99, cash), 'F');

    // 3. Overall health collapse (overallHealthScore < 35)
    assert.equal(evaluateCompanyGrade(34, 40, cash), 'F');

    // Grade D: weakestLinkMetric < 30 OR overallHealthScore < 50
    assert.equal(evaluateCompanyGrade(49, 35, cash), 'D');
    assert.equal(evaluateCompanyGrade(60, 20, cash), 'D');
    assert.equal(evaluateCompanyGrade(60, 29.99, cash), 'D');

    // Grade C: weakestLinkMetric < 45 OR overallHealthScore < 65
    assert.equal(evaluateCompanyGrade(50, 45, cash), 'C');
    assert.equal(evaluateCompanyGrade(64, 50, cash), 'C');
    assert.equal(evaluateCompanyGrade(70, 30, cash), 'C');
    assert.equal(evaluateCompanyGrade(70, 44.99, cash), 'C');

    // Grade B: weakestLinkMetric < 60 OR overallHealthScore < 80
    assert.equal(evaluateCompanyGrade(65, 60, cash), 'B');
    assert.equal(evaluateCompanyGrade(79, 65, cash), 'B');
    assert.equal(evaluateCompanyGrade(85, 45, cash), 'B');
    assert.equal(evaluateCompanyGrade(85, 59.99, cash), 'B');

    // Grade A: overallHealthScore >= 80 AND weakestLinkMetric >= 60 AND cash > 0
    assert.equal(evaluateCompanyGrade(80, 60, cash), 'A');
    assert.equal(evaluateCompanyGrade(85, 75, cash), 'A');
    assert.equal(evaluateCompanyGrade(100, 100, cash), 'A');
  });

  it('evaluateCompanyMetrics: creates integrated CompanyMetrics record', () => {
    const metrics = evaluateCompanyMetrics(63.125, 75, 90, 13_800_000);
    assert.equal(metrics.hrMorale, 75);
    assert.equal(metrics.itStability, 90);
    assert.equal(metrics.overallHealthScore, 75);
    assert.equal(metrics.grade, 'B');
  });
});

// ============================================================================
// 4. INPUT VALIDATION & ERROR HANDLING TESTS
// ============================================================================
describe('Input Validation & Error Handling Tests', () => {
  it('assertIntegerCents: rejects non-integers, NaN, and Infinity', () => {
    assert.throws(() => assertIntegerCents(100.5, 'cash'), TypeError);
    assert.throws(() => assertIntegerCents(NaN, 'cash'), TypeError);
    assert.throws(() => assertIntegerCents(Infinity, 'cash'), TypeError);
    assert.throws(() => assertIntegerCents(-Infinity, 'cash'), TypeError);
    // Integer cents (positive, zero, negative) are accepted
    assert.doesNotThrow(() => assertIntegerCents(100, 'cash'));
    assert.doesNotThrow(() => assertIntegerCents(0, 'cash'));
    assert.doesNotThrow(() => assertIntegerCents(-100, 'cash'));
  });

  it('assertNonNegativeIntegerCents: rejects negative values', () => {
    assert.throws(() => assertNonNegativeIntegerCents(-1, 'debtPrincipal'), RangeError);
    assert.throws(() => assertNonNegativeIntegerCents(-100, 'grossBurn'), RangeError);
    assert.doesNotThrow(() => assertNonNegativeIntegerCents(0, 'debtPrincipal'));
    assert.doesNotThrow(() => assertNonNegativeIntegerCents(100, 'debtPrincipal'));
  });

  it('assertValidAnnualInterestRate: rejects negative and non-finite rates', () => {
    assert.throws(() => assertValidAnnualInterestRate(-0.01, 'rate'), RangeError);
    assert.throws(() => assertValidAnnualInterestRate(NaN, 'rate'), RangeError);
    assert.throws(() => assertValidAnnualInterestRate(Infinity, 'rate'), RangeError);
    assert.doesNotThrow(() => assertValidAnnualInterestRate(0, 'rate'));
    assert.doesNotThrow(() => assertValidAnnualInterestRate(0.08, 'rate'));
  });

  it('assertMetricInput: rejects metrics outside [0, 100]', () => {
    assert.throws(() => assertMetricInput(-0.1, 'hrMorale'), RangeError);
    assert.throws(() => assertMetricInput(100.1, 'hrMorale'), RangeError);
    assert.throws(() => assertMetricInput(NaN, 'hrMorale'), RangeError);
    assert.throws(() => assertMetricInput(Infinity, 'hrMorale'), RangeError);
    assert.doesNotThrow(() => assertMetricInput(0, 'hrMorale'));
    assert.doesNotThrow(() => assertMetricInput(50, 'hrMorale'));
    assert.doesNotThrow(() => assertMetricInput(100, 'hrMorale'));
  });

  it('isSettlementSuccessful: mandatory boolean validation', () => {
    // calculateDebtServiceState rejects missing or invalid boolean
    assert.throws(
      () =>
        calculateDebtServiceState({
          principalBeforeSettlement: 100_000,
          annualInterestRate: 0.08,
          monthlyPrincipalAmortization: 10_000,
          hasActiveDebtAtStartOfCycle: true,
          // @ts-expect-error Testing runtime rejection of missing mandatory boolean
          isSettlementSuccessful: undefined,
        }),
      TypeError
    );

    // evaluateFinancialState rejects missing or invalid boolean
    assert.throws(
      () =>
        evaluateFinancialState({
          postSettlementCash: 100_000,
          grossMonthlyBurn: 10_000,
          principalBeforeSettlement: 0,
          annualInterestRate: 0,
          monthlyPrincipalAmortization: 0,
          hasActiveDebtAtStartOfCycle: false,
          // @ts-expect-error Testing runtime rejection of missing mandatory boolean
          isSettlementSuccessful: 'true',
        }),
      TypeError
    );
  });
});

// ============================================================================
// 5. STRATEGIC PATHS TURN-BY-TURN HARNESS & VERIFICATION
// ============================================================================
/**
 * Standalone test harness simulating the agreed turn-by-turn cash flows,
 * burn modifications, and debt transitions to verify final outcomes across all 3 paths.
 */
describe('Strategic Paths Turn-by-Turn Verification', () => {
  // Common initial conditions: $250,000 cash, $20,000/mo gross burn, HR 75, IT 70, Debt $0
  const INITIAL_CONDITIONS = {
    cash: 25_000_000 as Cents,
    grossBurn: 2_000_000 as Cents,
    debtPrincipal: 0 as Cents,
    hrMorale: 75 as MetricScore,
    itStability: 70 as MetricScore,
  };

  it('Path A — Balanced Steward: achieves Grade B with 8.625mo runway and 75 health', () => {
    // -------------------------------------------------------------
    // Turn 1: CHOICE_1A (Comprehensive Forensic Audit)
    // Choice impact: -$30k cash, +20 IT, -5 HR
    // -------------------------------------------------------------
    let cash = (INITIAL_CONDITIONS.cash - 3_000_000) as Cents; // $220,000
    let hr = (INITIAL_CONDITIONS.hrMorale - 5) as MetricScore; // 70
    let it = (INITIAL_CONDITIONS.itStability + 20) as MetricScore; // 90
    let grossBurn = INITIAL_CONDITIONS.grossBurn; // $20,000/mo

    // T1 Settlement: Gross burn $20,000, Debt $0
    const t1Required = calculateRequiredSettlementCash(grossBurn, 0);
    assert.equal(cash >= t1Required, true);
    cash = (cash - t1Required) as Cents; // $200,000

    const t1FinState = evaluateFinancialState({
      postSettlementCash: cash,
      grossMonthlyBurn: grossBurn,
      principalBeforeSettlement: 0,
      annualInterestRate: 0,
      monthlyPrincipalAmortization: 0,
      hasActiveDebtAtStartOfCycle: false,
      isSettlementSuccessful: true,
    });
    assert.equal(t1FinState.cash, 20_000_000); // $200,000
    assert.equal(t1FinState.effectiveRunwayMonths, 10.0);

    // -------------------------------------------------------------
    // Turn 2: CHOICE_2C (Targeted Retention Package)
    // Choice impact: -$15k cash, +$1k/mo burn, +5 HR, +5 IT
    // -------------------------------------------------------------
    cash = (cash - 1_500_000) as Cents; // $185,000
    grossBurn = (grossBurn + 100_000) as Cents; // $21,000/mo
    hr = (hr + 5) as MetricScore; // 75
    it = (it + 5) as MetricScore; // 95

    // T2 Settlement: Gross burn $21,000
    const t2Required = calculateRequiredSettlementCash(grossBurn, 0);
    assert.equal(cash >= t2Required, true);
    cash = (cash - t2Required) as Cents; // $164,000

    const t2FinState = evaluateFinancialState({
      postSettlementCash: cash,
      grossMonthlyBurn: grossBurn,
      principalBeforeSettlement: 0,
      annualInterestRate: 0,
      monthlyPrincipalAmortization: 0,
      hasActiveDebtAtStartOfCycle: false,
      isSettlementSuccessful: true,
    });
    assert.equal(t2FinState.cash, 16_400_000); // $164,000

    // -------------------------------------------------------------
    // Turn 3: CHOICE_3C (Collaborative Cloud Optimization)
    // Choice impact: -$10k cash, -$5k/mo burn (via >70 HR modifier), 0 HR, -5 IT
    // -------------------------------------------------------------
    cash = (cash - 1_000_000) as Cents; // $154,000
    grossBurn = (grossBurn - 500_000) as Cents; // $16,000/mo
    it = (it - 5) as MetricScore; // 90
    // HR remains 75

    // T3 Settlement: Gross burn $16,000
    const t3Required = calculateRequiredSettlementCash(grossBurn, 0);
    assert.equal(cash >= t3Required, true);
    cash = (cash - t3Required) as Cents; // $138,000

    const t3FinState = evaluateFinancialState({
      postSettlementCash: cash,
      grossMonthlyBurn: grossBurn,
      principalBeforeSettlement: 0,
      annualInterestRate: 0,
      monthlyPrincipalAmortization: 0,
      hasActiveDebtAtStartOfCycle: false,
      isSettlementSuccessful: true,
    });

    // Path A Final Assertions:
    assert.equal(t3FinState.cash, 13_800_000); // Final cash: $138,000
    assert.equal(t3FinState.debtPrincipal, 0); // Debt: $0
    assert.equal(t3FinState.projectedNetMonthlyBurn, 1_600_000); // Projected monthly burn: $16,000
    assert.equal(t3FinState.effectiveRunwayMonths, 8.625); // Runway: 8.625 months
    assert.equal(t3FinState.roundedFinancialHealth, 63); // Financial health: 63
    assert.equal(hr, 75); // HR: 75
    assert.equal(it, 90); // IT: 90

    const companyMetrics = evaluateCompanyMetrics(
      t3FinState.rawFinancialHealth,
      hr,
      it,
      t3FinState.cash
    );

    assert.equal(companyMetrics.overallHealthScore, 75); // Company health: 75
    assert.equal(companyMetrics.grade, 'B'); // Grade: B
  });

  it('Path B — Austerity CFO / Toxic: collapses to Grade F with 0 company health', () => {
    // -------------------------------------------------------------
    // Turn 1: CHOICE_1B (Minimal Internal Hotfix)
    // Choice impact: -$5k cash, -25 IT, 0 HR (Schedules DE_HOTFIX_LEAK for Turn 3)
    // -------------------------------------------------------------
    let cash = (INITIAL_CONDITIONS.cash - 500_000) as Cents; // $245,000
    let hr = INITIAL_CONDITIONS.hrMorale; // 75
    let it = (INITIAL_CONDITIONS.itStability - 25) as MetricScore; // 45
    let grossBurn = INITIAL_CONDITIONS.grossBurn; // $20,000/mo

    // T1 Settlement: Gross burn $20,000
    cash = (cash - grossBurn) as Cents; // $225,000

    // -------------------------------------------------------------
    // Turn 2: CHOICE_2B (Pizza Party & Token Perks)
    // Choice impact: -$1.5k cash, -35 HR base, -15 IT (via hotfix modifier)
    // -------------------------------------------------------------
    cash = (cash - 150_000) as Cents; // $223,500
    hr = (hr - 35) as MetricScore; // 40
    it = (it - 15) as MetricScore; // 30

    // T2 Settlement: Gross burn $20,000
    cash = (cash - grossBurn) as Cents; // $203,500

    // -------------------------------------------------------------
    // Turn 3:
    // Stage A: Delayed effect executes: -$15k cash, -10 IT
    // -------------------------------------------------------------
    cash = (cash - 1_500_000) as Cents; // $188,500
    it = (it - 10) as MetricScore; // 20

    // Stage B/C: CHOICE_3A (Austerity Freeze)
    // Choice impact: -$6k/mo burn ($14,000/mo), -30 HR (override via <45 HR modifier), -5 IT
    grossBurn = (grossBurn - 600_000) as Cents; // $14,000/mo
    hr = (hr - 30) as MetricScore; // 10
    it = (it - 5) as MetricScore; // 15

    // T3 Settlement: Gross burn $14,000
    cash = (cash - grossBurn) as Cents; // $174,500

    const t3FinState = evaluateFinancialState({
      postSettlementCash: cash,
      grossMonthlyBurn: grossBurn,
      principalBeforeSettlement: 0,
      annualInterestRate: 0,
      monthlyPrincipalAmortization: 0,
      hasActiveDebtAtStartOfCycle: false,
      isSettlementSuccessful: true,
    });

    // Path B Final Assertions:
    assert.equal(t3FinState.cash, 17_450_000); // Final cash: $174,500
    assert.equal(t3FinState.debtPrincipal, 0); // Debt: $0
    assert.equal(t3FinState.projectedNetMonthlyBurn, 1_400_000); // Projected monthly burn: $14,000
    assert.ok(Math.abs(t3FinState.effectiveRunwayMonths - 12.4643) < 1e-3); // Runway: ~12.464 months
    assert.equal(t3FinState.roundedFinancialHealth, 82); // Financial health: 82 (81.5476)
    assert.equal(hr, 10); // HR: 10
    assert.equal(it, 15); // IT: 15

    const companyMetrics = evaluateCompanyMetrics(
      t3FinState.rawFinancialHealth,
      hr,
      it,
      t3FinState.cash
    );

    // Deficit penalty = 25^1.25 + 20^1.25 = 98.20 -> pulls health below 0 -> clamped to 0
    assert.equal(companyMetrics.overallHealthScore, 0); // Company health: 0
    assert.equal(companyMetrics.grade, 'F'); // Grade: F (both from score < 35 and HR/IT < 20)
  });

  it('Path C — Leveraged Spender: verifies debt origination, servicing, leverage penalty, and Grade B', () => {
    // -------------------------------------------------------------
    // Turn 1: CHOICE_1A (Comprehensive Forensic Audit)
    // -------------------------------------------------------------
    let cash = (INITIAL_CONDITIONS.cash - 3_000_000) as Cents; // $220,000
    let hr = (INITIAL_CONDITIONS.hrMorale - 5) as MetricScore; // 70
    let it = (INITIAL_CONDITIONS.itStability + 20) as MetricScore; // 90
    let grossBurn = INITIAL_CONDITIONS.grossBurn; // $20,000/mo

    cash = (cash - grossBurn) as Cents; // $200,000

    // -------------------------------------------------------------
    // Turn 2: CHOICE_2A (Market-Rate Salary Calibration)
    // Choice impact: -$35k cash, +$6k/mo burn ($26,000/mo), +20 HR, +5 IT
    // -------------------------------------------------------------
    cash = (cash - 3_500_000) as Cents; // $165,000
    grossBurn = (grossBurn + 600_000) as Cents; // $26,000/mo
    hr = (hr + 20) as MetricScore; // 90
    it = (it + 5) as MetricScore; // 95

    cash = (cash - grossBurn) as Cents; // $139,000

    // -------------------------------------------------------------
    // Turn 3: CHOICE_3B (Venture Debt Facility)
    // Choice impact: +$75k cash, loan originated ($75k principal, 8% APR, $3.5k/mo amort)
    // -------------------------------------------------------------
    cash = (cash + 7_500_000) as Cents; // $214,000 cash before settlement
    const loanPrincipal = 7_500_000 as Cents; // $75,000
    const annualInterestRate = 0.08;
    const monthlyPrincipalAmortization = 350_000 as Cents; // $3,500/mo

    // T3 Debt Service Due: interest $500 (50,000 cents), principal $3,500 (350,000 cents), total $4,000 (400,000 cents)
    const t3DebtDue = calculateDebtPaymentBreakdown(
      loanPrincipal,
      annualInterestRate,
      monthlyPrincipalAmortization
    );
    assert.equal(t3DebtDue.interest, 50_000);
    assert.equal(t3DebtDue.principal, 350_000);
    assert.equal(t3DebtDue.total, 400_000);

    // Required settlement: gross burn $26,000 + debt service $4,000 = $30,000
    const t3Required = calculateRequiredSettlementCash(grossBurn, t3DebtDue.total);
    assert.equal(t3Required, 3_000_000);
    assert.equal(cash >= t3Required, true);

    // Settle cash: $214,000 - $30,000 = $184,000
    const postSettlementCash = (cash - t3Required) as Cents;
    assert.equal(postSettlementCash, 18_400_000);

    // Full financial evaluation:
    const t3FinState = evaluateFinancialState({
      postSettlementCash,
      grossMonthlyBurn: grossBurn,
      principalBeforeSettlement: loanPrincipal,
      annualInterestRate,
      monthlyPrincipalAmortization,
      hasActiveDebtAtStartOfCycle: true,
      isSettlementSuccessful: true,
    });

    // Path C Final Assertions:
    assert.equal(t3FinState.cash, 18_400_000); // Final cash: $184,000
    assert.equal(t3FinState.debtPrincipal, 7_150_000); // Remaining debt: $71,500
    assert.equal(t3FinState.debtService.currentTurnPaid.total, 400_000); // Current-turn debt service paid: $4,000
    assert.equal(t3FinState.debtService.projectedNextTurn.total, 397_667); // Projected next-turn debt service: ~$3,976.67
    assert.equal(t3FinState.projectedNetMonthlyBurn, 2_997_667); // Projected monthly burn: ~$29,976.67
    assert.ok(Math.abs(t3FinState.effectiveRunwayMonths - 6.1381) < 1e-3); // Runway: ~6.138 months
    assert.ok(Math.abs(t3FinState.debtLeveragePenalty - 11.7046) < 1e-3); // Debt leverage penalty: ~11.70
    assert.equal(t3FinState.roundedFinancialHealth, 39); // Financial health: 39 (raw 38.9859)
    assert.equal(hr, 90); // HR: 90
    assert.equal(it, 95); // IT: 95

    // Check Company Health & Weakest-link Ceiling:
    // 1. Weighted base score: 0.35 * 38.9859 + 0.35 * 90 + 0.30 * 95 = 73.645 -> Math.round is 74
    // 2. Bottleneck ceiling: weakestMetric * 1.6 = 38.9859 * 1.6 = 62.377 -> Math.round is 62
    // The pure calculateCompanyHealth function strictly enforces min(penalizedScore, weakestMetric * 1.6):
    const companyHealth = calculateCompanyHealth(
      t3FinState.rawFinancialHealth,
      hr,
      it
    );

    assert.equal(companyHealth.weakestLinkMetric, t3FinState.rawFinancialHealth);
    assert.ok(Math.abs(companyHealth.rawEffectiveOverallHealth - 62.3776) < 1e-3);
    assert.equal(companyHealth.overallHealthScore, 62);

    // Executive grade evaluation:
    // Under the approved rules: weakestLinkMetric < 45 OR overallHealthScore < 65 -> Grade C.
    // In Path C, financial health is 38.986 (< 45), and overall health is 62 (< 65).
    // Therefore, evaluateCompanyGrade strictly evaluates to 'C'.
    const actualGrade = evaluateCompanyGrade(
      companyHealth.overallHealthScore,
      companyHealth.weakestLinkMetric,
      postSettlementCash
    );
    assert.equal(actualGrade, 'C');

    // Even if overallHealthScore were 74 (without the 1.6x bottleneck ceiling),
    // weakestLinkMetric is 38.986 (< 45), which still deterministically yields Grade C:
    const gradeWithoutCeiling = evaluateCompanyGrade(74, companyHealth.weakestLinkMetric, postSettlementCash);
    assert.equal(gradeWithoutCeiling, 'C');
  });
});
