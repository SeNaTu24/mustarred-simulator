/**
 * Mustarred Company Simulator - Incident Interaction Model
 *
 * Presentation-agnostic description of how a player interrogates and responds to
 * one incident. An incident authors a spec of this shape; the workbench UI renders
 * whatever controls the spec declares, and the response evaluator turns the
 * resulting plan into operational consequences.
 *
 * Nothing in this file knows about phishing, Phaser or the DOM, so future
 * incidents (fraud, outage, harassment complaint) can reuse the same surface.
 */

// ============================================================================
// 1. SHARED VOCABULARY
// ============================================================================

/** Departments that can own a piece of incident response. */
export type IncidentDepartment = 'IT' | 'HR' | 'FINANCE' | 'LEGAL';

/** Where an inspected evidence record came from. Drives the record layout. */
export type EvidenceKind = 'email' | 'login' | 'account' | 'payment' | 'alert';

/** How sure the record is. Keeps the UI honest about inference vs fact. */
export type EvidenceCertainty = 'confirmed' | 'unverified';

/** Neutral impact values an option can carry. Cents for money, points for metrics. */
export interface ImpactVector {
  readonly cashDelta: number;
  readonly burnDelta: number;
  readonly itDelta: number;
  readonly hrDelta: number;
}

export const ZERO_IMPACT: ImpactVector = {
  cashDelta: 0,
  burnDelta: 0,
  itDelta: 0,
  hrDelta: 0,
};

// ============================================================================
// 2. EVIDENCE
// ============================================================================

/** One labelled field inside an evidence record (email header, ledger row, ...). */
export interface EvidenceField {
  readonly label: string;
  readonly value: string;
  /** Renders identifiers, IPs and timestamps in the monospace treatment. */
  readonly mono?: boolean;
  readonly tone?: 'neutral' | 'alert' | 'ok';
}

/** A factual observation the player can draw from a record. */
export interface EvidenceObservation {
  readonly text: string;
  readonly vectorId?: string;
  readonly certainty: EvidenceCertainty;
}

export interface EvidenceRecord {
  readonly id: string;
  readonly kind: EvidenceKind;
  readonly title: string;
  readonly source: string;
  readonly summary: string;
  /** Minutes added to the incident clock the first time this record is inspected. */
  readonly inspectMinutes: number;
  /** Request id that must be completed before this record can be opened. */
  readonly requiresRequestId?: string;
  readonly inspectedByDefault?: boolean;
  readonly fields: readonly EvidenceField[];
  readonly body?: readonly string[];
  readonly observations: readonly EvidenceObservation[];
}

/**
 * An out-of-band request the player has to make before some records exist
 * (call the AP analyst, ask treasury to pull the queue). Costs clock time.
 */
export interface EvidenceRequest {
  readonly id: string;
  readonly label: string;
  readonly ask: string;
  readonly costMinutes: number;
  readonly unlocksRecordIds: readonly string[];
  readonly reply: string;
}

// ============================================================================
// 3. THREAT VECTORS
// ============================================================================

/**
 * A thing the attacker can still do. Vectors are the real state of the incident:
 * an approach that does not close a vector leaks damage, and delaying action
 * lets a vector reach its exposure minute before the response lands.
 */
export interface ThreatVector {
  readonly id: string;
  readonly label: string;
  /** Minutes from now until the attacker completes this action. */
  readonly exposureMinute: number;
  /** What happens if the vector is never closed. */
  readonly breachCopy: string;
  /** What happens if the response closes it, but too late. */
  readonly tooLateCopy: string;
  /** What remains true if the response leaves it open but nobody exploited it yet. */
  readonly latentCopy: string;
  readonly breachImpact: ImpactVector;
  readonly critical: boolean;
}

// ============================================================================
// 4. RESPONSE CONTROLS
// ============================================================================

/**
 * A genuinely different approach to the incident. Exactly one is chosen.
 * `delayMinutes` is how long the approach takes before any action lands.
 */
export interface StrategyOption {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  /** Engine choice id used as the authoritative baseline record. */
  readonly baseChoiceId: string;
  readonly delayMinutes: number;
  readonly closesVectors: readonly string[];
  readonly opensVectors: readonly string[];
  readonly impact: ImpactVector;
  /** True when the approach refuses to close anything regardless of actions. */
  readonly blocksAllActions?: boolean;
}

/** A single operational measure. Several can be selected together. */
export interface ContainmentAction {
  readonly id: string;
  readonly label: string;
  readonly owner: IncidentDepartment | 'JOINT';
  readonly system: string;
  readonly detail: string;
  /** What the owner reports back once the measure has run its course. */
  readonly resultCopy: string;
  readonly impact: ImpactVector;
  readonly closesVectors: readonly string[];
  /** Vectors whose damage is partly absorbed when they breach anyway. */
  readonly mitigatesVectors?: readonly string[];
  /** Rough operational disruption weight, used for the "what it cost us" verdict. */
  readonly disruption: number;
  /** Marks measures that also remove the ability to work. */
  readonly haltsOperations?: boolean;
}

/** A dropdown the player must set, e.g. who owns the response. */
export interface AssignmentSlot {
  readonly id: string;
  readonly label: string;
  readonly help: string;
  readonly defaultOptionId: string;
  readonly options: readonly AssignmentOption[];
}

export interface AssignmentOption {
  readonly id: string;
  readonly label: string;
  readonly note: string;
  readonly impact: ImpactVector;
  readonly closesVectors: readonly string[];
  readonly disruption: number;
  readonly haltsOperations?: boolean;
}

// ============================================================================
// 5. FREE-TEXT DIRECTIVES
// ============================================================================

/** Distinct meanings the interpreter can extract from a typed order. */
export type DirectiveIntent =
  | 'REVOKE_SESSION'
  | 'RESET_CREDENTIALS'
  | 'BLOCK_SOURCE'
  | 'SUSPEND_PAYMENTS'
  | 'CONTACT_BANK'
  | 'PURGE_PERSISTENCE'
  | 'PRESERVE_EVIDENCE'
  | 'DESTROY_EVIDENCE'
  | 'NOTIFY_LEGAL'
  | 'NOTIFY_STAFF'
  | 'INVESTIGATE'
  | 'VERIFY_EMPLOYEE'
  | 'MONITOR_SESSION'
  | 'DISMISS'
  | 'WIDEN_LOCKDOWN'
  | 'PUNISH_EMPLOYEE'
  | 'UNRECOGNIZED';

export type DirectivePolarity = 'DO' | 'DONT';
export type DirectiveUrgency = 'NOW' | 'SOON' | 'LATER';

/** Lexicon rule: the phrases that express one meaning for a given incident. */
export interface DirectiveRule {
  readonly intent: DirectiveIntent;
  readonly patterns: readonly string[];
  readonly actionIds: readonly string[];
  readonly strategyId?: string;
  readonly requestIds?: readonly string[];
  /** Literal restatement shown back to the player. Never states an outcome. */
  readonly restatement: string;
  /** Requires a named target to be actionable ("lock" alone is ambiguous). */
  readonly requiresTarget?: boolean;
  /** Shown when the order is understood but carries operational risk. */
  readonly riskNote?: string;
  /** Marks orders that end the incident without acting. */
  readonly isPassive?: boolean;
  /** Direct cost of the order itself, on top of any measure it triggers. */
  readonly impact?: ImpactVector;
}

export interface DirectiveTargetPhrase {
  readonly id: string;
  readonly label: string;
  readonly patterns: readonly string[];
  readonly actionIds?: readonly string[];
  readonly scopeOptionId?: string;
  /** Records that can be requested by naming this target in an investigative order. */
  readonly requestIds?: readonly string[];
}

export interface DirectiveConflictPair {
  readonly a: DirectiveIntent;
  readonly b: DirectiveIntent;
  readonly message: string;
}

export interface DirectiveStrategyConflict {
  readonly strategyId: string;
  readonly intent: DirectiveIntent;
  readonly message: string;
}

export interface DirectiveLexicon {
  readonly rules: readonly DirectiveRule[];
  readonly targets: readonly DirectiveTargetPhrase[];
  readonly conflicts: readonly DirectiveConflictPair[];
  readonly strategyConflicts?: readonly DirectiveStrategyConflict[];
  /** Bare verbs that carry no target, e.g. "lock", "handle", "stop". */
  readonly ambiguousVerbs: readonly string[];
  readonly negations: readonly string[];
  readonly nowMarkers: readonly string[];
  readonly laterMarkers: readonly string[];
  /** Words that carry no operational meaning and are stripped before judging relevance. */
  readonly fillerWords: readonly string[];
}

// ============================================================================
// 6. DIRECTIVE INTERPRETATION RESULT
// ============================================================================

export interface DirectiveClause {
  readonly text: string;
  readonly intent: DirectiveIntent;
  readonly polarity: DirectivePolarity;
  readonly urgency: DirectiveUrgency;
  readonly targetIds: readonly string[];
  readonly actionIds: readonly string[];
  readonly requestIds: readonly string[];
  readonly strategyId?: string;
  readonly resolved: boolean;
}

export type DirectiveIssueKind =
  | 'AMBIGUOUS'
  | 'CONFLICT'
  | 'UNSUPPORTED'
  | 'DANGEROUS'
  | 'INVESTIGATION_ONLY';

export interface DirectiveIssueOption {
  readonly id: string;
  readonly label: string;
  readonly actionIds: readonly string[];
}

export interface DirectiveIssue {
  readonly kind: DirectiveIssueKind;
  readonly title: string;
  readonly message: string;
  readonly clauseText?: string;
  readonly conflictActionId?: string;
  readonly options?: readonly DirectiveIssueOption[];
}

export interface DirectiveInterpretation {
  readonly raw: string;
  readonly clauses: readonly DirectiveClause[];
  readonly intents: readonly DirectiveIntent[];
  readonly actionIds: readonly string[];
  readonly requestIds: readonly string[];
  readonly strategyId?: string;
  readonly issues: readonly DirectiveIssue[];
  readonly restatement: string;
  readonly confidence: number;
  readonly isRelevant: boolean;
}

// ============================================================================
// 7. THE SPEC
// ============================================================================

export interface ColleagueProfile {
  readonly name: string;
  readonly role: string;
  readonly initials: string;
  readonly department: IncidentDepartment;
}

export interface IncidentClock {
  /** Wall-clock label when the incident opens, e.g. "09:14". */
  readonly startLabel: string;
  /** Minutes already elapsed before the player stepped in. */
  readonly startOffsetMinutes: number;
}

export interface IncidentInteractionSpec {
  readonly incidentId: string;
  readonly title: string;
  readonly urgencyLabel: string;
  readonly colleague: ColleagueProfile;
  readonly clock: IncidentClock;
  readonly situation: {
    readonly speech: readonly string[];
    readonly fields: readonly EvidenceField[];
    readonly unresolved: readonly string[];
  };
  readonly evidence: readonly EvidenceRecord[];
  readonly requests: readonly EvidenceRequest[];
  readonly vectors: readonly ThreatVector[];
  readonly strategies: readonly StrategyOption[];
  readonly actions: readonly ContainmentAction[];
  readonly slots: readonly AssignmentSlot[];
  readonly directive: {
    readonly placeholder: string;
    readonly examples: readonly string[];
  };
  readonly lexicon: DirectiveLexicon;
  readonly labels: {
    readonly authorize: string;
    readonly review: string;
  };
}

// ============================================================================
// 8. THE PLAYER'S PLAN
// ============================================================================

export interface ResponsePlan {
  readonly incidentId: string;
  readonly strategyId: string;
  readonly actionIds: readonly string[];
  readonly slotValues: Readonly<Record<string, string>>;
  readonly directiveText: string;
  readonly interpretation: DirectiveInterpretation;
  readonly inspectedRecordIds: readonly string[];
  readonly completedRequestIds: readonly string[];
  readonly minutesSpent: number;
}
