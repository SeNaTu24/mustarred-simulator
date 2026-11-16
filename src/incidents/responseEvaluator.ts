/**
 * Mustarred Company Simulator - Response Evaluator
 *
 * Turns a committed response plan into operational consequences.
 *
 * The model is deliberately small and explainable:
 * - Every incident has threat vectors. A vector is something the operator can
 *   still do, and it has a minute at which it completes.
 * - A plan closes some vectors and leaves others. Closure lands at
 *   `minutes spent investigating + the approach's own delay`, so thorough
 *   investigation and slow approaches can land after a vector has already fired.
 * - Whatever fires produces the damage declared by the incident data. Nothing
 *   here invents amounts.
 *
 * The result is handed to the simulation engine as a composed impact, so the
 * authoritative cash / burn / metric accounting still happens in the engine.
 */

import type {
  ContainmentAction,
  DirectiveIntent,
  ImpactVector,
  IncidentInteractionSpec,
  ResponsePlan,
  StrategyOption,
  ThreatVector,
} from './interactionModel.ts';

// ============================================================================
// 1. OUTCOME TYPES
// ============================================================================

export type VectorState = 'CLOSED' | 'TOO_LATE' | 'BREACHED';

export interface VectorOutcome {
  readonly vectorId: string;
  readonly label: string;
  readonly state: VectorState;
  readonly detail: string;
  readonly tone: 'ok' | 'warn' | 'bad';
}

export type ResponseVerdict =
  | 'CONTAINED'
  | 'CONTAINED_AT_COST'
  | 'PARALYSED'
  | 'PARTIAL'
  | 'COMPROMISED'
  | 'NEGLIGENT';

export type ActionStatus = 'EXECUTED' | 'PARTIAL' | 'STAND_DOWN';

export interface ActionExecution {
  readonly actionId: string;
  readonly label: string;
  readonly owner: string;
  readonly system: string;
  readonly status: ActionStatus;
  readonly result: string;
}

export interface ComposedImpact {
  readonly cashDelta: number;
  readonly grossBurnRateDelta: number;
  readonly debtDelta: number;
  readonly itDelta: number;
  readonly hrDelta: number;
  readonly operationalExplanation: string;
}

export interface ResponseAssessment {
  readonly incidentId: string;
  readonly verdict: ResponseVerdict;
  readonly verdictLabel: string;
  readonly headline: string;
  readonly summary: string;
  readonly planLabel: string;
  readonly baseChoiceId: string;
  readonly impact: ComposedImpact;
  readonly vectors: readonly VectorOutcome[];
  readonly actionResults: readonly ActionExecution[];
  readonly latentRisks: readonly string[];
  readonly minutesSpent: number;
  readonly closeAtMinute: number;
  readonly disruption: number;
  readonly haltsOperations: boolean;
  readonly directive: {
    readonly restatement: string;
    readonly acceptedMeasures: readonly string[];
    readonly rejected: readonly string[];
  };
}

export type PlanProblemKind =
  | 'NO_STRATEGY'
  | 'STAND_DOWN_WITH_MEASURES'
  | 'DIRECTIVE_CONFLICT'
  | 'DIRECTIVE_AMBIGUOUS';

export interface PlanProblem {
  readonly kind: PlanProblemKind;
  readonly title: string;
  readonly message: string;
}

const VERDICT_COPY: Record<ResponseVerdict, { label: string; headline: string; summary: string }> = {
  CONTAINED: {
    label: 'Contained',
    headline: 'Closed before they used it.',
    summary: 'Access was cut and the payment queue was checked.',
  },
  CONTAINED_AT_COST: {
    label: 'Contained at a cost',
    headline: 'Closed, and it cost the morning.',
    summary: 'The threat stopped. Overtime, bank fees and a morning of approvals went with it.',
  },
  PARALYSED: {
    label: 'Locked down',
    headline: 'Locked down wider than the incident.',
    summary: 'Nobody can use the account, and nobody can approve anything either.',
  },
  PARTIAL: {
    label: 'Partly contained',
    headline: 'Closed, after they got one thing done.',
    summary: 'Access is closed. They used the window first.',
  },
  COMPROMISED: {
    label: 'Compromised',
    headline: 'What we left open was used.',
    summary: 'The measures landed. The exposure we did not close is a real loss now.',
  },
  NEGLIGENT: {
    label: 'Not acted on',
    headline: 'Treated as noise. Never closed.',
    summary: 'Nothing ran. The session is still authenticated with payments inside it.',
  },
};

const MITIGATION_FACTOR = 0.5;
const MIN_MITIGATION_FACTOR = 0.25;

// ============================================================================
// 2. PLAN RESOLUTION HELPERS
// ============================================================================

export function resolveStrategy(
  spec: IncidentInteractionSpec,
  plan: ResponsePlan
): StrategyOption | undefined {
  return spec.strategies.find((strategy) => strategy.id === plan.strategyId);
}

function resolveActions(spec: IncidentInteractionSpec, plan: ResponsePlan): ContainmentAction[] {
  const ids = new Set<string>([...plan.actionIds, ...plan.interpretation.actionIds]);
  return spec.actions.filter((action) => ids.has(action.id));
}

function resolvedSlotOptions(
  spec: IncidentInteractionSpec,
  plan: ResponsePlan
): { disruption: number; haltsOperations: boolean; closes: string[]; impact: ImpactVector; labels: string[] } {
  let disruption = 0;
  let haltsOperations = false;
  const closes: string[] = [];
  const labels: string[] = [];
  let cashDelta = 0;
  let burnDelta = 0;
  let itDelta = 0;
  let hrDelta = 0;

  for (const slot of spec.slots) {
    const value = plan.slotValues[slot.id] ?? slot.defaultOptionId;
    const option = slot.options.find((entry) => entry.id === value) ?? slot.options[0];
    if (!option) {
      continue;
    }
    disruption += option.disruption;
    haltsOperations = haltsOperations || Boolean(option.haltsOperations);
    closes.push(...option.closesVectors);
    labels.push(option.label);
    cashDelta += option.impact.cashDelta;
    burnDelta += option.impact.burnDelta;
    itDelta += option.impact.itDelta;
    hrDelta += option.impact.hrDelta;
  }

  return {
    disruption,
    haltsOperations,
    closes,
    impact: { cashDelta, burnDelta, itDelta, hrDelta },
    labels,
  };
}

/** Direct cost of instructions that carry a price of their own (deleting records, etc.). */
function directiveImpact(spec: IncidentInteractionSpec, plan: ResponsePlan): ImpactVector {
  let cashDelta = 0;
  let burnDelta = 0;
  let itDelta = 0;
  let hrDelta = 0;
  const applied = new Set<DirectiveIntent>();
  for (const clause of plan.interpretation.clauses) {
    if (clause.polarity !== 'DO' || applied.has(clause.intent)) {
      continue;
    }
    const rule = spec.lexicon.rules.find((entry) => entry.intent === clause.intent);
    if (!rule?.impact) {
      continue;
    }
    applied.add(clause.intent);
    cashDelta += rule.impact.cashDelta;
    burnDelta += rule.impact.burnDelta;
    itDelta += rule.impact.itDelta;
    hrDelta += rule.impact.hrDelta;
  }
  return { cashDelta, burnDelta, itDelta, hrDelta };
}

function mitigationFactorFor(
  vector: ThreatVector,
  actions: readonly ContainmentAction[]
): number {
  const count = actions.filter((action) => action.mitigatesVectors?.includes(vector.id)).length;
  if (count === 0) {
    return 1;
  }
  return Math.max(MIN_MITIGATION_FACTOR, MITIGATION_FACTOR ** count);
}

function scaleImpact(impact: ImpactVector, factor: number): ImpactVector {
  if (factor >= 1) {
    return impact;
  }
  return {
    cashDelta: Math.round(impact.cashDelta * factor),
    burnDelta: Math.round(impact.burnDelta * factor),
    itDelta: Math.round(impact.itDelta * factor),
    hrDelta: Math.round(impact.hrDelta * factor),
  };
}

// ============================================================================
// 3. PLAN VALIDATION (used to gate authorisation)
// ============================================================================

/**
 * Problems that make a plan non-executable. These are about coherence, not
 * about whether the plan is a good idea — a deliberately risky plan is valid.
 */
export function findPlanProblems(spec: IncidentInteractionSpec, plan: ResponsePlan): PlanProblem[] {
  const problems: PlanProblem[] = [];
  const strategy = resolveStrategy(spec, plan);

  if (!strategy) {
    problems.push({
      kind: 'NO_STRATEGY',
      title: 'Pick an approach',
      message: 'Maya needs to know which way you want it handled.',
    });
  }

  const selectedMeasureIds = new Set([...plan.actionIds, ...plan.interpretation.actionIds]);
  if (strategy?.blocksAllActions && selectedMeasureIds.size > 0) {
    problems.push({
      kind: 'STAND_DOWN_WITH_MEASURES',
      title: 'Approach and measures disagree',
      message: `"${strategy.title}" tells IT to stand down, but you have ticked measures. Pick one.`,
    });
  }

  for (const issue of plan.interpretation.issues) {
    if (issue.kind === 'CONFLICT') {
      problems.push({
        kind: 'DIRECTIVE_CONFLICT',
        title: issue.title,
        message: issue.message,
      });
    }
    if (issue.kind === 'AMBIGUOUS') {
      problems.push({
        kind: 'DIRECTIVE_AMBIGUOUS',
        title: issue.title,
        message: issue.message,
      });
    }
  }

  return problems;
}

// ============================================================================
// 4. EVALUATION
// ============================================================================

/**
 * Evaluates a committed plan against the incident's vectors and returns the
 * composed consequences plus the narrative the report needs.
 */
export function evaluateResponsePlan(
  spec: IncidentInteractionSpec,
  plan: ResponsePlan
): ResponseAssessment {
  const strategy = resolveStrategy(spec, plan) ?? spec.strategies[0];
  const standingDown = Boolean(strategy?.blocksAllActions);
  const actions = standingDown ? [] : resolveActions(spec, plan);
  const slots = resolvedSlotOptions(spec, plan);
  const directiveCost = directiveImpact(spec, plan);
  const closeAtMinute = plan.minutesSpent + (strategy?.delayMinutes ?? 0);

  // ---- vectors -------------------------------------------------------------
  const closedVectors = new Set<string>([
    ...(strategy?.closesVectors ?? []),
    ...slots.closes,
    ...actions.flatMap((action) => action.closesVectors),
  ]);

  const vectors: VectorOutcome[] = [];
  let breachCash = 0;
  let breachBurn = 0;
  let breachIt = 0;
  let breachHr = 0;
  let longestVectorCopy = '';

  const addBreach = (vector: ThreatVector, factor: number) => {
    const scaled = scaleImpact(vector.breachImpact, factor);
    breachCash += scaled.cashDelta;
    breachBurn += scaled.burnDelta;
    breachIt += scaled.itDelta;
    breachHr += scaled.hrDelta;
  };

  for (const vector of spec.vectors) {
    const factor = mitigationFactorFor(vector, actions);
    if (closedVectors.has(vector.id)) {
      if (closeAtMinute <= vector.exposureMinute) {
        vectors.push({
          vectorId: vector.id,
          label: vector.label,
          state: 'CLOSED',
          detail: `Closed at ${closeAtMinute} minutes, before the ${vector.exposureMinute}-minute mark.`,
          tone: 'ok',
        });
      } else {
        addBreach(vector, factor);
        if (!longestVectorCopy) {
          longestVectorCopy = vector.tooLateCopy;
        }
        vectors.push({
          vectorId: vector.id,
          label: vector.label,
          state: 'TOO_LATE',
          detail: vector.tooLateCopy,
          tone: 'warn',
        });
      }
      continue;
    }

    addBreach(vector, factor);
    if (!longestVectorCopy && vector.critical) {
      longestVectorCopy = vector.breachCopy;
    }
    vectors.push({
      vectorId: vector.id,
      label: vector.label,
      state: 'BREACHED',
      detail: factor < 1 ? `${vector.breachCopy} Our records limited part of the damage.` : vector.breachCopy,
      tone: 'bad',
    });
  }

  // ---- composition ---------------------------------------------------------
  const cashDelta =
    (standingDown ? 0 : (strategy?.impact.cashDelta ?? 0)) +
    actions.reduce((sum, action) => sum + action.impact.cashDelta, 0) +
    slots.impact.cashDelta +
    directiveCost.cashDelta +
    breachCash;
  const burnDelta =
    (standingDown ? 0 : (strategy?.impact.burnDelta ?? 0)) +
    actions.reduce((sum, action) => sum + action.impact.burnDelta, 0) +
    slots.impact.burnDelta +
    directiveCost.burnDelta +
    breachBurn;
  const itDelta =
    (standingDown ? 0 : (strategy?.impact.itDelta ?? 0)) +
    actions.reduce((sum, action) => sum + action.impact.itDelta, 0) +
    slots.impact.itDelta +
    directiveCost.itDelta +
    breachIt;
  const hrDelta =
    (standingDown ? 0 : (strategy?.impact.hrDelta ?? 0)) +
    actions.reduce((sum, action) => sum + action.impact.hrDelta, 0) +
    slots.impact.hrDelta +
    directiveCost.hrDelta +
    breachHr;

  const disruption = actions.reduce((sum, action) => sum + action.disruption, 0) + slots.disruption;
  const haltsOperations =
    slots.haltsOperations || actions.some((action) => Boolean(action.haltsOperations));

  // ---- verdict -------------------------------------------------------------
  const breached = vectors.filter((vector) => vector.state !== 'CLOSED');
  const criticalBreaches = vectors.filter(
    (vector) =>
      vector.state !== 'CLOSED' &&
      (spec.vectors.find((entry) => entry.id === vector.vectorId)?.critical ?? false)
  );

  let verdict: ResponseVerdict;
  if (standingDown) {
    verdict = 'NEGLIGENT';
  } else if (haltsOperations && breached.length === 0) {
    verdict = 'PARALYSED';
  } else if (criticalBreaches.length >= 2 || breached.length >= 3) {
    verdict = 'COMPROMISED';
  } else if (breached.length > 0) {
    verdict = 'PARTIAL';
  } else if (disruption >= 12) {
    verdict = 'CONTAINED_AT_COST';
  } else {
    verdict = 'CONTAINED';
  }

  // ---- action results ------------------------------------------------------
  const actionResults: ActionExecution[] = actions.map((action) => {
    const lateVector = action.closesVectors
      .map((id) => vectors.find((vector) => vector.vectorId === id))
      .find((outcome) => outcome?.state === 'TOO_LATE');
    if (lateVector) {
      return {
        actionId: action.id,
        label: action.label,
        owner: action.owner,
        system: action.system,
        status: 'PARTIAL',
        result: `${action.resultCopy} It landed at ${closeAtMinute} minutes, after the ${lateVector.label.toLowerCase()} had already happened.`,
      };
    }
    return {
      actionId: action.id,
      label: action.label,
      owner: action.owner,
      system: action.system,
      status: 'EXECUTED',
      result: action.resultCopy,
    };
  });

  const directiveMeasures = plan.interpretation.clauses
    .filter((clause) => clause.polarity === 'DO' && clause.actionIds.length > 0)
    .map((clause) => clause.text);

  // ---- narrative -----------------------------------------------------------
  const explanationParts: string[] = [];
  if (standingDown) {
    explanationParts.push('IT stood down on your instruction. Nothing ran and the session is still open.');
  } else {
    explanationParts.push(
      `${actions.length === 0 ? 'The approach ran on its own' : `${actions.length} measure${actions.length === 1 ? '' : 's'} executed`}. Everything was in place ${closeAtMinute} minute${closeAtMinute === 1 ? '' : 's'} in.`
    );
  }
  if (longestVectorCopy) {
    explanationParts.push(longestVectorCopy);
  }
  const tooLate = vectors.filter((vector) => vector.state === 'TOO_LATE');
  if (tooLate.length > 0) {
    explanationParts.push(
      `${tooLate.length} measure${tooLate.length === 1 ? '' : 's'} landed after they had already used the window.`
    );
  }
  if (breached.length === 0) {
    explanationParts.push('Nothing was taken after it landed.');
  }

  // A response that landed in time but left something open reads differently
  // from one that arrived after the damage was already done.
  const missedWindow = vectors.some((vector) => vector.state === 'TOO_LATE');
  const headline =
    verdict === 'COMPROMISED' && missedWindow
      ? 'It had already happened when the response landed.'
      : VERDICT_COPY[verdict].headline;
  const summary =
    verdict === 'COMPROMISED' && missedWindow
      ? 'They had time inside the account. We are dealing with what they did.'
      : VERDICT_COPY[verdict].summary;

  return {
    incidentId: spec.incidentId,
    verdict,
    verdictLabel: VERDICT_COPY[verdict].label,
    headline,
    summary,
    planLabel: buildPlanLabel(strategy, actions, slots.labels),
    baseChoiceId: strategy?.baseChoiceId ?? spec.strategies[0]?.baseChoiceId ?? '',
    impact: {
      cashDelta: Math.round(cashDelta),
      grossBurnRateDelta: Math.round(burnDelta),
      debtDelta: 0,
      itDelta: Math.round(itDelta),
      hrDelta: Math.round(hrDelta),
      operationalExplanation: explanationParts.join(' '),
    },
    vectors,
    actionResults,
    latentRisks: breached.map((vector) => vector.detail),
    minutesSpent: plan.minutesSpent,
    closeAtMinute,
    disruption,
    haltsOperations,
    directive: {
      restatement: plan.interpretation.restatement,
      acceptedMeasures: directiveMeasures,
      rejected: plan.interpretation.issues
        .filter((issue) => issue.kind === 'UNSUPPORTED')
        .map((issue) => issue.clauseText ?? issue.message),
    },
  };
}

function buildPlanLabel(
  strategy: StrategyOption | undefined,
  actions: readonly ContainmentAction[],
  slotLabels: readonly string[]
): string {
  const parts: string[] = [strategy?.title ?? 'Response'];
  if (actions.length > 0) {
    parts.push(`${actions.length} measure${actions.length === 1 ? '' : 's'}`);
  }
  if (slotLabels.length > 0) {
    parts.push(slotLabels.join(' · '));
  }
  return parts.join(' — ');
}
