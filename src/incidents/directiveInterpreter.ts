/**
 * Mustarred Company Simulator - Directive Interpreter
 *
 * Turns a plain-English executive instruction into structured meaning:
 * who/what is being acted on, whether it is an order or a prohibition,
 * how urgent it is, and whether it can be executed at all.
 *
 * Design rules:
 * - Meaning is resolved per clause, not by counting keywords across the sentence.
 * - Negation flips an intent instead of being ignored.
 * - A verb without an object is reported as ambiguous rather than guessed.
 * - Consequences are never stated here; only what was understood.
 */

import type {
  DirectiveClause,
  DirectiveIntent,
  DirectiveInterpretation,
  DirectiveIssue,
  DirectiveIssueOption,
  DirectiveLexicon,
  DirectivePolarity,
  DirectiveRule,
  DirectiveUrgency,
} from './interactionModel.ts';

/**
 * Clause-level opposites. Used so "don't revoke the session, keep watching"
 * is read as one coherent order instead of two contradictory ones.
 */
const OPPOSITE_INTENTS: Partial<Record<DirectiveIntent, DirectiveIntent>> = {
  REVOKE_SESSION: 'MONITOR_SESSION',
  MONITOR_SESSION: 'REVOKE_SESSION',
  PRESERVE_EVIDENCE: 'DESTROY_EVIDENCE',
  DESTROY_EVIDENCE: 'PRESERVE_EVIDENCE',
  WIDEN_LOCKDOWN: 'DISMISS',
  DISMISS: 'WIDEN_LOCKDOWN',
};

/** Meaningful clause boundary: sentence ends, commas, and coordinating words. */
const CLAUSE_BOUNDARY =
  /[.;!?\n]+|\s+and\s+then\s+|\s+then\s+|,\s*(?:and\s+)?|\s+and\s+|\s+but\s+|\s+also\s+|\s+plus\s+/;

export interface InterpretOptions {
  readonly lexicon: DirectiveLexicon;
  /** Measures the player already ticked, used to detect contradictions. */
  readonly selectedActionIds?: readonly string[];
  /** Approach the player already picked, used to detect contradictions. */
  readonly selectedStrategyId?: string;
  /** Clauses the player has already clarified; their ambiguity is settled. */
  readonly resolvedClauseTexts?: readonly string[];
}

export interface InterpretedDirective extends DirectiveInterpretation {
  /** True when the order can be authorised as written. */
  readonly isBlocking: boolean;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Word-boundary phrase test that tolerates apostrophes and punctuation. */
function hasPhrase(haystack: string, phrase: string): boolean {
  if (!phrase) {
    return false;
  }
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(phrase)}([^a-z0-9]|$)`);
  return pattern.test(haystack);
}

function longestMatchedPattern(haystack: string, patterns: readonly string[]): number {
  let longest = 0;
  for (const pattern of patterns) {
    if (pattern.length > longest && hasPhrase(haystack, pattern)) {
      longest = pattern.length;
    }
  }
  return longest;
}

function splitClauses(normalized: string): string[] {
  return normalized
    .split(CLAUSE_BOUNDARY)
    .map((clause) => clause.replace(/^[-–—:,\s]+|[-–—:,\s]+$/g, '').trim())
    .filter((clause) => clause.length >= 2);
}

function detectPolarity(clause: string, negations: readonly string[]): DirectivePolarity {
  return negations.some((marker) => hasPhrase(clause, marker)) ? 'DONT' : 'DO';
}

function detectUrgency(
  clause: string,
  nowMarkers: readonly string[],
  laterMarkers: readonly string[]
): DirectiveUrgency {
  if (nowMarkers.some((marker) => hasPhrase(clause, marker))) {
    return 'NOW';
  }
  if (laterMarkers.some((marker) => hasPhrase(clause, marker))) {
    return 'LATER';
  }
  return 'SOON';
}

/**
 * Words that carry no operational meaning on their own: filler, negation
 * markers, and the incident's own target vocabulary. Token comparison is used
 * instead of substring stripping so short fillers ("a", "an") cannot shred
 * real words.
 */
function noiseWords(lexicon: DirectiveLexicon): Set<string> {
  const phrases = [
    ...lexicon.fillerWords,
    ...lexicon.negations,
    ...lexicon.targets.flatMap((target) => [...target.patterns, target.label]),
  ];
  const words = new Set<string>();
  for (const phrase of phrases) {
    for (const word of phrase.split(/[^a-z']+/)) {
      if (word) {
        words.add(word.replace(/'/g, ''));
      }
    }
  }
  return words;
}

/** Meaningful words left in a clause once noise vocabulary is removed. */
function meaningfulWords(
  clause: string,
  lexicon: DirectiveLexicon,
  noise: ReadonlySet<string>
): string[] {
  return clause
    .split(/[^a-z']+/)
    .map((word) => word.replace(/'/g, ''))
    .filter((word) => word.length >= 3 && !noise.has(word) && !lexicon.fillerWords.includes(word));
}

function bestRuleForClause(
  clause: string,
  rules: readonly DirectiveRule[]
): { rule: DirectiveRule; score: number } | undefined {
  let best: { rule: DirectiveRule; score: number } | undefined;
  for (const rule of rules) {
    const score = longestMatchedPattern(clause, rule.patterns);
    if (score > 0 && (!best || score > best.score)) {
      best = { rule, score };
    }
  }
  return best;
}

function targetOptionsFor(lexicon: DirectiveLexicon): DirectiveIssueOption[] {
  return lexicon.targets
    .filter((target) => (target.actionIds?.length ?? 0) > 0)
    .map((target) => ({
      id: target.id,
      label: target.label,
      actionIds: target.actionIds ?? [],
    }));
}

function conflictIssues(
  effectiveIntents: ReadonlySet<DirectiveIntent>,
  lexicon: DirectiveLexicon
): DirectiveIssue[] {
  const issues: DirectiveIssue[] = [];
  for (const pair of lexicon.conflicts) {
    if (effectiveIntents.has(pair.a) && effectiveIntents.has(pair.b)) {
      issues.push({
        kind: 'CONFLICT',
        title: 'These two orders clash',
        message: pair.message,
      });
    }
  }
  return issues;
}

function strategyConflictIssues(
  effectiveIntents: ReadonlySet<DirectiveIntent>,
  options: InterpretOptions
): DirectiveIssue[] {
  const table = options.lexicon.strategyConflicts ?? [];
  const selected = options.selectedStrategyId;
  if (!selected) {
    return [];
  }
  const issues: DirectiveIssue[] = [];
  for (const entry of table) {
    if (entry.strategyId !== selected) {
      continue;
    }
    if (effectiveIntents.has(entry.intent)) {
      issues.push({
        kind: 'CONFLICT',
        title: 'Does not match your approach',
        message: entry.message,
      });
    }
  }
  return issues;
}

function selectionConflictIssues(
  clauses: readonly DirectiveClause[],
  selectedActionIds: readonly string[]
): DirectiveIssue[] {
  if (selectedActionIds.length === 0) {
    return [];
  }
  const issues: DirectiveIssue[] = [];
  for (const clause of clauses) {
    if (clause.polarity !== 'DONT') {
      continue;
    }
    for (const actionId of clause.actionIds) {
      if (selectedActionIds.includes(actionId)) {
        issues.push({
          kind: 'CONFLICT',
          title: 'This cancels a measure you ticked',
          message: `You typed "${clause.text}", which reads as don't do that. The measure is still ticked above.`,
          clauseText: clause.text,
          conflictActionId: actionId,
        });
      }
    }
  }
  return issues;
}

function buildClause(
  text: string,
  lexicon: DirectiveLexicon,
  resolvedClauseTexts: readonly string[],
  issues: DirectiveIssue[]
): DirectiveClause {
  const polarity = detectPolarity(text, lexicon.negations);
  const urgency = detectUrgency(text, lexicon.nowMarkers, lexicon.laterMarkers);
  const targetIds = lexicon.targets
    .filter((target) => target.patterns.some((pattern) => hasPhrase(text, pattern)))
    .map((target) => target.id);
  const resolved = resolvedClauseTexts.some((entry) => entry === text);

  const matched = bestRuleForClause(text, lexicon.rules);
  if (!matched) {
    const ambiguousVerb = lexicon.ambiguousVerbs.find((verb) => hasPhrase(text, verb));
    if (ambiguousVerb && !resolved) {
      issues.push({
        kind: 'AMBIGUOUS',
        title: 'Which one?',
        message: `"${text}" doesn't say what to act on.`,
        clauseText: text,
        options: targetOptionsFor(lexicon),
      });
      return {
        text,
        intent: 'UNRECOGNIZED',
        polarity,
        urgency,
        targetIds,
        actionIds: [],
        requestIds: [],
        resolved,
      };
    }
    return {
      text,
      intent: 'UNRECOGNIZED',
      polarity,
      urgency,
      targetIds,
      actionIds: [],
      requestIds: [],
      resolved,
    };
  }

  const { rule } = matched;
  // Only the verb decides which measure runs. Targets name where it lands, and
  // their measures are offered as clarification options instead, so a passing
  // mention ("warn the AP team about the payments queue") cannot widen a lockdown.
  const actionIds = [...rule.actionIds];

  if (rule.requiresTarget && targetIds.length === 0 && !resolved) {
    issues.push({
      kind: 'AMBIGUOUS',
      title: 'Which one?',
      message: `"${text}" could land in more than one place.`,
      clauseText: text,
      options: targetOptionsFor(lexicon),
    });
  }

  if (rule.riskNote && polarity === 'DO') {
    issues.push({
      kind: 'DANGEROUS',
      title: 'Risky, but understood',
      message: rule.riskNote,
      clauseText: text,
    });
  }

  const requestIds = Array.from(
    new Set([
      ...(rule.requestIds ?? []),
      ...(rule.intent === 'INVESTIGATE'
        ? lexicon.targets
            .filter((target) => targetIds.includes(target.id))
            .flatMap((target) => target.requestIds ?? [])
        : []),
    ])
  );

  return {
    text,
    intent: rule.intent,
    polarity,
    urgency,
    targetIds,
    actionIds,
    requestIds,
    strategyId: rule.strategyId,
    resolved,
  };
}

/**
 * Interprets a typed executive order against an incident's lexicon.
 */
export function interpretDirective(raw: string, options: InterpretOptions): InterpretedDirective {
  const { lexicon } = options;
  const selectedActionIds = options.selectedActionIds ?? [];
  const resolvedClauseTexts = options.resolvedClauseTexts ?? [];
  const normalized = normalizeText(raw);

  if (!normalized) {
    return {
      raw,
      clauses: [],
      intents: [],
      actionIds: [],
      requestIds: [],
      issues: [],
      restatement: '',
      confidence: 0,
      isRelevant: false,
      isBlocking: false,
    };
  }

  const issues: DirectiveIssue[] = [];
  const clauses: DirectiveClause[] = [];
  const noise = noiseWords(lexicon);

  for (const text of splitClauses(normalized)) {
    if (meaningfulWords(text, lexicon, noise).length === 0) {
      continue;
    }
    const clause = buildClause(text, lexicon, resolvedClauseTexts, issues);
    if (clause.intent === 'UNRECOGNIZED') {
      // A clause the player has already clarified is settled, not noise.
      if (clause.resolved) {
        continue;
      }
      const hasAmbiguity = issues.some(
        (issue) => issue.kind === 'AMBIGUOUS' && issue.clauseText === text
      );
      if (!hasAmbiguity) {
        issues.push({
          kind: 'UNSUPPORTED',
          title: 'Nothing to act on',
          message: `Maya can't do anything with "${text}". Phrase it as an order, or use the controls.`,
          clauseText: text,
        });
      }
      continue;
    }
    clauses.push(clause);
  }

  const intents = Array.from(new Set(clauses.map((clause) => clause.intent)));
  const effectiveIntents = new Set<DirectiveIntent>();
  for (const clause of clauses) {
    if (clause.polarity === 'DO') {
      effectiveIntents.add(clause.intent);
    } else {
      effectiveIntents.add(OPPOSITE_INTENTS[clause.intent] ?? clause.intent);
    }
  }

  issues.push(...conflictIssues(effectiveIntents, lexicon));
  issues.push(...strategyConflictIssues(effectiveIntents, options));
  issues.push(...selectionConflictIssues(clauses, selectedActionIds));

  const doClauses = clauses.filter((clause) => clause.polarity === 'DO');
  const actionIds = Array.from(new Set(doClauses.flatMap((clause) => clause.actionIds)));
  const requestIds = Array.from(new Set(doClauses.flatMap((clause) => clause.requestIds)));
  const strategyIds = Array.from(
    new Set(doClauses.map((clause) => clause.strategyId).filter((id): id is string => Boolean(id)))
  );

  const passiveOrder = doClauses.some(
    (clause) => lexicon.rules.find((rule) => rule.intent === clause.intent)?.isPassive
  );

  if (doClauses.length > 0 && actionIds.length === 0 && !passiveOrder) {
    const onlyInvestigating = intents.every(
      (intent) => intent === 'INVESTIGATE' || intent === 'VERIFY_EMPLOYEE'
    );
    issues.push({
      kind: 'INVESTIGATION_ONLY',
      title: onlyInvestigating ? 'That only gathers information' : 'No measure attached',
      message: onlyInvestigating
        ? 'Maya can pull the records, but nothing is contained yet.'
        : 'Maya understands it. There is no measure behind it.',
    });
  }

  const restatement = doClauses
    .map((clause) => lexicon.rules.find((rule) => rule.intent === clause.intent)?.restatement)
    .filter((entry): entry is string => Boolean(entry))
    .join('; ');

  const ambiguous = issues.some((issue) => issue.kind === 'AMBIGUOUS');
  const conflicting = issues.some((issue) => issue.kind === 'CONFLICT');
  let confidence = clauses.length === 0 ? 0 : Math.min(1, 0.55 + 0.15 * clauses.length);
  if (ambiguous) {
    confidence *= 0.75;
  }
  if (issues.some((issue) => issue.kind === 'UNSUPPORTED')) {
    confidence = Math.max(0, confidence - 0.15);
  }

  return {
    raw,
    clauses,
    intents,
    actionIds,
    requestIds,
    strategyId: strategyIds.length === 1 ? strategyIds[0] : undefined,
    issues,
    restatement,
    confidence: Number(confidence.toFixed(2)),
    isRelevant: clauses.length > 0,
    isBlocking: ambiguous || conflicting,
  };
}

/** Convenience for UI: the first issue of a given kind. */
export function findIssue(
  interpretation: DirectiveInterpretation,
  kind: DirectiveIssue['kind']
): DirectiveIssue | undefined {
  return interpretation.issues.find((issue) => issue.kind === kind);
}
