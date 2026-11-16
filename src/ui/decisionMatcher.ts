/**
 * Mustarred Company Simulator - Decision Matcher
 *
 * Maps open-ended executive text directives to predefined simulation choices.
 *
 * Guarantees:
 * - Deterministic, rule-based semantic and keyword intent analysis.
 * - Requires high confidence threshold before accepting a match.
 * - Rejects ambiguous or unsupported directives with helpful clarification.
 * - Never invents financial effects or mutates simulation rules.
 */

import type { EvaluatedChoice } from '../simulation/types.ts';

export interface MatchResult {
  readonly matched: boolean;
  readonly choiceId?: string;
  readonly matchedChoice?: EvaluatedChoice;
  readonly confidence: number;
  readonly interpretation?: string;
  readonly reason?: 'AMBIGUOUS' | 'LOW_CONFIDENCE' | 'UNSUPPORTED';
  readonly explanation: string;
  readonly suggestedChoices?: readonly EvaluatedChoice[];
}

interface ChoiceIntentRule {
  readonly choiceId: string;
  readonly strongPhrases: readonly string[];
  readonly keywords: readonly string[];
  readonly interpretation: string;
}

const INTENT_RULES: readonly ChoiceIntentRule[] = [
  // --- Turn 1: IT Department ---
  {
    choiceId: 'CHOICE_1A',
    strongPhrases: [
      'hire outside',
      'external consultant',
      'external security',
      'security team',
      'hire external',
      'hire an external',
      'forensic audit',
      'security firm',
      'outside specialists',
      'clean patch',
      'root cause',
      'bring in outside',
      'third party',
      'apex cyber',
      'full audit',
    ],
    keywords: [
      'forensic',
      'external',
      'specialist',
      'consultant',
      'audit',
      'investigation',
      'investigate',
      'security',
      'team',
      'database',
      'vulnerability',
      'specialists',
      'contractors',
      'thorough',
      'experts',
    ],
    interpretation:
      'Retain an external cybersecurity firm to conduct a comprehensive forensic investigation and develop a verified patch.',
  },
  {
    choiceId: 'CHOICE_1B',
    strongPhrases: [
      'quick patch',
      'internal patch',
      'in house',
      'in-house',
      'patch ourselves',
      'quick fix',
      'keep quiet',
      'silently monitor',
      'silent monitoring',
      'temporary fix',
      'emergency patch',
      'duct tape',
      'don\'t tell',
      'hotfix internally',
    ],
    keywords: [
      'hotfix',
      'internal',
      'silently',
      'quick',
      'patch',
      'ourselves',
      'confidential',
      'quiet',
      'overtime',
      'logging',
    ],
    interpretation:
      'Deploy an emergency internal hotfix tonight and monitor telemetry quietly without bringing in external consultants.',
  },
  {
    choiceId: 'CHOICE_1C',
    strongPhrases: [
      'weekend crunch',
      'mandatory crunch',
      'work the weekend',
      'all hands sprint',
      'all-hands sprint',
      'rewrite from scratch',
      'rebuild from scratch',
      '72 hour',
      '72-hour',
      'force engineers',
      'work saturday',
      'work sunday',
    ],
    keywords: [
      'crunch',
      'weekend',
      'mandatory',
      'all-hands',
      'rewrite',
      'rebuild',
      'sprint',
      'overtime',
      'marathon',
      'uncompensated',
    ],
    interpretation:
      'Order a mandatory 72-hour all-hands weekend crunch for the engineering team to rebuild the authentication service internally.',
  },

  // --- Turn 2: HR Department ---
  {
    choiceId: 'CHOICE_2A',
    strongPhrases: [
      'raise salaries',
      'salary increase',
      'pay them more',
      'market rate',
      'retention bonus',
      'retention bonuses',
      'match offers',
      'give raises',
      'pay increase',
      'compensation bump',
      'across the board',
      '75th percentile',
    ],
    keywords: [
      'salary',
      'salaries',
      'raise',
      'raises',
      'compensation',
      'bonuses',
      'payroll',
      'pay',
      'market',
      'bonus',
    ],
    interpretation:
      'Execute a company-wide engineering salary increase to market rates and provide structured retention bonuses.',
  },
  {
    choiceId: 'CHOICE_2B',
    strongPhrases: [
      'pizza party',
      'pep talk',
      'catered lunch',
      'catered food',
      'company swag',
      'merchandise',
      'title bump',
      'title promotions',
      'motivational speech',
      'town hall',
      'all-hands meeting',
      'cheap perks',
    ],
    keywords: [
      'pizza',
      'pep',
      'talk',
      'swag',
      'lunch',
      'perks',
      'perk',
      'apparel',
      'titles',
      'dinner',
      'merch',
      'speeches',
    ],
    interpretation:
      'Offer catered team lunches, company merchandise, title promotions, and deliver an inspiring all-hands address.',
  },
  {
    choiceId: 'CHOICE_2C',
    strongPhrases: [
      'targeted retention',
      'key architects',
      'core leads',
      'top performers',
      'selective bonus',
      'indispensable leads',
      'critical people',
      'surgical retention',
      'top 15',
      'best engineers',
      'only key',
      'senior leads only',
    ],
    keywords: [
      'targeted',
      'selective',
      'architects',
      'leads',
      'key',
      'critical',
      'surgical',
      'top',
      'indispensable',
      'core',
    ],
    interpretation:
      'Discreetly offer targeted retention bonuses and promotion pathways exclusively to indispensable core technical architects.',
  },

  // --- Turn 3: Finance Department ---
  {
    choiceId: 'CHOICE_3A',
    strongPhrases: [
      'cut spending',
      'freeze spending',
      'spending freeze',
      'spending cut',
      'hiring freeze',
      'cancel licenses',
      'slash budget',
      'austerity controls',
      'corporate austerity',
      'eliminate travel',
      'cut costs',
      'tighten belt',
    ],
    keywords: [
      'austerity',
      'freeze',
      'cut',
      'cuts',
      'cancel',
      'licenses',
      'slash',
      'budget',
      'travel',
      'overhead',
      'spending',
    ],
    interpretation:
      'Enforce strict company-wide austerity: freeze hiring, cancel auxiliary software licenses, and eliminate discretionary budgets.',
  },
  {
    choiceId: 'CHOICE_3B',
    strongPhrases: [
      'venture debt',
      'debt facility',
      'credit facility',
      'take a loan',
      'borrow money',
      '75k loan',
      '75,000 loan',
      '75k debt',
      'borrow 75',
      'line of credit',
      'draw down debt',
    ],
    keywords: [
      'debt',
      'loan',
      'borrow',
      'credit',
      'facility',
      '75k',
      '75000',
      'lender',
      'financing',
      'repayments',
    ],
    interpretation:
      'Draw down a $75,000 venture debt credit facility at 8% APR to boost liquid cash reserves.',
  },
  {
    choiceId: 'CHOICE_3C',
    strongPhrases: [
      'cloud optimization',
      'cloud audit',
      'optimize cloud',
      'aws audit',
      'audit infrastructure',
      'zombie instances',
      'idle servers',
      'server audit',
      'cloud costs',
      'hosting optimization',
      'collaborate with engineers',
    ],
    keywords: [
      'cloud',
      'optimize',
      'optimization',
      'audit',
      'servers',
      'hosting',
      'zombie',
      'compute',
      'infrastructure',
      'instances',
      'aws',
    ],
    interpretation:
      'Engage engineering and finance teams to execute a comprehensive cloud architecture audit to eliminate wasted hosting overhead.',
  },

  // --- Incident 1: Phishing Attack ---
  {
    choiceId: 'CHOICE_PHISH_LOCKDOWN',
    strongPhrases: [
      'lock down',
      'lock account',
      'disable account',
      'revoke session',
      'revoke tokens',
      'kill session',
      'cut connection',
      'terminate session',
      'block ip',
      'sever connection',
      'freeze account',
      'freeze wire',
      'freeze payments',
      'reset password',
      'invalidate tokens',
      'kick attacker',
      'force logout',
      'isolate account',
      'disconnect',
      'immediate lockout',
      'revoke sso',
      'revoke his',
      'terminate his',
      'lock tom',
      'lock his',
      'lock account',
      'cut the session',
      'kill the session',
    ],
    keywords: [
      'lock',
      'lockdown',
      'revoke',
      'disable',
      'terminate',
      'sever',
      'disconnect',
      'kill',
      'block',
      'freeze',
      'quarantine',
      'isolate',
      'sso',
      'tokens',
      'session',
      'sessions',
      'credential',
      'credentials',
    ],
    interpretation:
      'Immediately sever active sessions, revoke Tom Bradley\'s SSO credentials, and freeze Accounts Payable payment endpoints.',
  },
  {
    choiceId: 'CHOICE_PHISH_MONITOR',
    strongPhrases: [
      'monitor session',
      'watch session',
      'observe attacker',
      'trace connection',
      'trace ip',
      'silent monitoring',
      'keep watching',
      'honeypot',
      'trace intruder',
      'packet capture',
      'gather intel',
      'observe silently',
      'spy on attacker',
      'track adversary',
    ],
    keywords: [
      'monitor',
      'surveillance',
      'trace',
      'packet',
      'observe',
      'watch',
      'track',
      'honeypot',
      'intel',
      'logging',
    ],
    interpretation:
      'Silently monitor and trace the adversary\'s active session with verbose packet capture to identify their infrastructure and targets.',
  },
  {
    choiceId: 'CHOICE_PHISH_VERIFY',
    strongPhrases: [
      'call tom',
      'contact tom',
      'call the employee',
      'ask tom',
      'speak with tom',
      'reach out to tom',
      'phone tom',
      'verify with tom',
      'confirm with employee',
      'interview tom',
      'check with tom',
      'talk to employee',
      'call his desk',
      'verify login',
    ],
    keywords: [
      'tom',
      'bradley',
      'call',
      'phone',
      'contact',
      'verify',
      'interview',
      'confirm',
      'speak',
      'talk',
      'ask',
      'desk',
    ],
    interpretation:
      'Call Tom Bradley directly at his desk to confirm whether he authorized the Frankfurt login before taking disruptive action.',
  },
  {
    choiceId: 'CHOICE_PHISH_IGNORE',
    strongPhrases: [
      'ignore alert',
      'false positive',
      'vpn glitch',
      'ignore this',
      'routing glitch',
      'dismiss alert',
      'do nothing',
      'business as usual',
      'leave it alone',
      'cloud sync',
      'isp glitch',
      'no action',
      'normal operations',
      'routine traffic',
    ],
    keywords: [
      'ignore',
      'dismiss',
      'glitch',
      'false',
      'positive',
      'nothing',
      'skip',
      'bypass',
      'routine',
      'unaltered',
    ],
    interpretation:
      'Dismiss the incident as an offshore VPN routing anomaly or false positive and maintain normal business operations.',
  },
];

/**
 * Evaluates raw player text against available choices for an incident.
 */
export function matchPlayerDirective(
  rawInput: string,
  availableChoices: readonly EvaluatedChoice[]
): MatchResult {
  const text = rawInput.trim().toLowerCase();

  // If input is too short or empty
  if (text.length < 4) {
    return {
      matched: false,
      confidence: 0,
      reason: 'LOW_CONFIDENCE',
      explanation: 'Please provide more detail about your proposed executive directive.',
      suggestedChoices: availableChoices,
    };
  }

  const availableIds = new Set(availableChoices.map((c) => c.id));
  const activeRules = INTENT_RULES.filter((rule) => availableIds.has(rule.choiceId));

  // Score each matching candidate rule
  interface ScoredRule {
    rule: ChoiceIntentRule;
    score: number;
  }

  const scored: ScoredRule[] = [];

  for (const rule of activeRules) {
    let score = 0;

    // Check strong multi-word phrases (high confidence)
    for (const phrase of rule.strongPhrases) {
      if (text.includes(phrase)) {
        score += 0.55;
      }
    }

    // Check individual keywords
    const words = text.split(/[\s,.;:!?\-–—"'/()\\[\\]]+/);
    for (const kw of rule.keywords) {
      if (words.includes(kw)) {
        score += 0.18;
      } else if (text.includes(kw)) {
        score += 0.1;
      }
    }

    // Cap at 1.0
    const finalScore = Math.min(1.0, score);
    if (finalScore > 0) {
      scored.push({ rule, score: finalScore });
    }
  }

  // Sort candidates by score descending
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      matched: false,
      confidence: 0,
      reason: 'UNSUPPORTED',
      explanation:
        'The executive team could not map your directive to an actionable company strategy for this incident.',
      suggestedChoices: availableChoices,
    };
  }

  const top = scored[0];
  const second = scored[1];

  // If ambiguous (both have substantial matches, or scores are too close)
  if (
    second &&
    ((top.score >= 0.45 && second.score >= 0.45) ||
      (top.score >= 0.4 && top.score - second.score < 0.2))
  ) {
    const choiceA = availableChoices.find((c) => c.id === top.rule.choiceId);
    const choiceB = availableChoices.find((c) => c.id === second.rule.choiceId);
    const suggestions = [choiceA, choiceB].filter((c): c is EvaluatedChoice => c !== undefined);

    return {
      matched: false,
      confidence: top.score,
      reason: 'AMBIGUOUS',
      explanation: `Your directive appears to combine or conflict between multiple strategies: "${choiceA?.label}" and "${choiceB?.label}". Please clarify your intent or select an option directly.`,
      suggestedChoices: suggestions,
    };
  }

  // Threshold for high-confidence match
  if (top.score < 0.4) {
    return {
      matched: false,
      confidence: top.score,
      reason: 'LOW_CONFIDENCE',
      explanation:
        'Your proposal does not provide enough specific direction for the management team to execute with confidence. Please be more specific or choose an available option.',
      suggestedChoices: availableChoices,
    };
  }

  const matchedChoice = availableChoices.find((c) => c.id === top.rule.choiceId);
  if (!matchedChoice) {
    return {
      matched: false,
      confidence: 0,
      reason: 'UNSUPPORTED',
      explanation: 'Matched choice is not available for the active incident.',
      suggestedChoices: availableChoices,
    };
  }

  return {
    matched: true,
    choiceId: top.rule.choiceId,
    matchedChoice,
    confidence: top.score,
    interpretation: top.rule.interpretation,
    explanation: `Your proposal corresponds to: "${matchedChoice.label}".`,
  };
}
