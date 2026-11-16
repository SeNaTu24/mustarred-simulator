/**
 * Mustarred Company Simulator - Scenario Data: 3-Turn Executive Demo
 *
 * Declarative scenario definition modeling an interconnected corporate crisis
 * across IT, HR, and Finance departments.
 *
 * INVARIANTS:
 * - All monetary values are integer minor currency units (cents).
 * - Normalized metrics are in [0, 100].
 * - Presentation-agnostic: contains zero Phaser, DOM, or browser imports.
 * - Adheres to verbatimModuleSyntax and erasableSyntaxOnly TypeScript rules.
 */

import type {
  ChoiceModifier,
  Incident,
  Scenario,
  ScenarioChoice,
  ScenarioInitialConditions,
} from './types.ts';

// ============================================================================
// 1. INITIAL CONDITIONS
// ============================================================================

export const DEMO_INITIAL_CONDITIONS: ScenarioInitialConditions = {
  startingCash: 25_000_000, // $250,000.00
  startingGrossMonthlyBurn: 2_000_000, // $20,000.00 / month
  startingDebt: 0, // Genuine no-debt baseline
  startingHrMorale: 75,
  startingItStability: 70,
  loanTerms: {
    annualInterestRate: 0.08, // 8.0% APR
    monthlyPrincipalAmortization: 350_000, // $3,500.00 / month
  },
};

// ============================================================================
// 2. INCIDENT CHOICES DEFINITION
// ============================================================================

// --- Turn 1: IT Department Choices ---
export const CHOICES_TURN_1: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_1A',
    label: 'Hire External Security Specialists for Full Forensic Audit & Patch',
    description:
      'Engage an elite cybersecurity firm on an emergency retainer. They will analyze server memory dumps, verify whether customer data was exfiltrated, and build a verified, hardened patch for the database endpoint.',
    executiveRationale:
      'Prioritize root-cause engineering and customer trust over short-term cash preservation.',
    baseImpact: {
      cashDelta: -3_000_000, // -$30,000
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -5,
      itDelta: 20,
      operationalExplanation:
        'Apex Cyber Defense completed a full 48-hour forensic audit and deployed a verified patch. Customer records are secured and infrastructure stability improved significantly, though the $30,000 fee reduces cash reserves and staff spent long hours cooperating with auditors.',
    },
    learningFeedback: {
      corePrinciple: 'Root-Cause Remediation vs. Technical Debt',
      tradeoffSummary:
        'Hiring top specialists completely eradicates the underlying vulnerability and restores operational confidence, but requires a significant upfront cash expenditure that tightens your runway.',
      risksCreated: [
        'Drains $30,000 in liquid reserves, leaving less financial buffer for upcoming quarters.',
      ],
    },
  },
  {
    id: 'CHOICE_1B',
    label: 'Deploy an In-House Emergency Patch & Monitor Silently',
    description:
      'Instruct the backend team to push a quick internal patch tonight to block the vulnerable API call. Avoid hiring external consultants and keep the incident confidential to prevent client alarm.',
    executiveRationale:
      'Conserve cash and contain the problem quickly without outside disruption or public attention.',
    baseImpact: {
      cashDelta: -500_000, // -$5,000
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 0,
      itDelta: -25,
      operationalExplanation:
        'The backend team deployed a quick hotfix for $5,000 in overtime. However, skipping root-cause testing left the codebase fragile and destabilized core systems, leaving latent flaws that could resurface under stress.',
    },
    scheduledDelayedEffect: {
      effectId: 'DE_HOTFIX_LEAK',
      triggerTurn: 3,
      executionStage: 'TURN_START_BEFORE_INCIDENT',
      canTriggerInsolvency: true,
      cashDelta: -1_500_000, // -$15,000
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 0,
      itDelta: -10,
      narrativeDescription:
        'The unverified Turn 1 hotfix failed during an enterprise customer security review, leaking telemetry data and triggering $15,000 in mandatory compliance audit penalties.',
    },
    learningFeedback: {
      corePrinciple: 'The Compounding Cost of Technical Debt',
      tradeoffSummary:
        'Rushing an unverified fix saves money today, but unaddressed structural flaws tend to resurface later with greater operational and financial fallout.',
      risksCreated: [
        'Schedules a delayed breach liability (DE_HOTFIX_LEAK) in Turn 3 (-$15,000 cash, -10 IT stability).',
        'Leaves engineers worried about maintaining brittle, unverified infrastructure.',
      ],
    },
  },
  {
    id: 'CHOICE_1C',
    label: 'Order a Mandatory 72-Hour Weekend Crunch to Rebuild the Service',
    description:
      'Mandate that the entire engineering team work through the weekend on an intensive 72-hour sprint to completely rewrite the compromised authentication and database layer from scratch without external contractors.',
    executiveRationale:
      'Avoid outside consulting fees entirely by relying on existing salaried staff to solve the crisis.',
    baseImpact: {
      cashDelta: 0, // $0
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -30,
      itDelta: 15,
      operationalExplanation:
        'The engineering team rebuilt the authentication service without spending cash reserves. However, the grueling 72-hour weekend sprint exhausted the developers, creating severe morale damage and deep resentment toward executive management.',
    },
    learningFeedback: {
      corePrinciple: 'Human Capital Depletion',
      tradeoffSummary:
        'Treating internal staff as a zero-cost shock absorber protects the balance sheet in the short term, but damages employee retention and makes future operational challenges far more costly.',
      risksCreated: [
        'Severe developer burnout drops team morale close to critical failure thresholds.',
        'Triggers punitive compensation demands in Turn 2 (crunch premium on raises, walkout risk on superficial perks).',
      ],
    },
  },
];

// --- Turn 2: HR Department Choices ---
export const CHOICES_TURN_2: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_2A',
    label: 'Company-Wide Engineering Salary Increase & Retention Bonuses',
    description:
      'Bring technical salaries up to the 75th percentile of market rates across the entire engineering department immediately, backed by guaranteed retention bonus agreements.',
    executiveRationale:
      'Decisively stop key developers from leaving by matching competitive market compensation.',
    baseImpact: {
      cashDelta: -3_500_000, // -$35,000
      grossBurnRateDelta: 600_000, // +$6,000 / month
      debtDelta: 0,
      hrDelta: 20,
      itDelta: 5,
      operationalExplanation:
        'Distributed $35,000 in retention bonuses and raised monthly payroll burn by $6,000. Key engineers declined competitor offers, restoring stability and team morale across technical departments.',
    },
    learningFeedback: {
      corePrinciple: 'Structural Overhead Expansion',
      tradeoffSummary:
        'Permanent payroll increases effectively secure talent, but they permanently increase ongoing monthly burn and shorten your financial runway.',
      risksCreated: [
        'Permanently raises monthly operating burn to $26,000/mo, leaving little room for error if revenue dips.',
      ],
    },
  },
  {
    id: 'CHOICE_2B',
    label: 'Provide Catered Team Lunches, Upgraded Swag & Executive Pep Talk',
    description:
      'Host catered team lunches, distribute premium company apparel, offer senior title promotions, and hold an executive all-hands meeting focusing on company mission and future equity value.',
    executiveRationale:
      'Rebuild morale using low-cost team perks and executive encouragement while strictly conserving cash.',
    baseImpact: {
      cashDelta: -150_000, // -$1,500
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -35,
      itDelta: 0,
      operationalExplanation:
        'Spent $1,500 on team lunches and merchandise. However, during an acute workload and retention crisis, staff viewed superficial perks as dismissive of their real compensation concerns, accelerating departures and disengagement.',
    },
    learningFeedback: {
      corePrinciple: 'The Fallacy of Superficial Perks',
      tradeoffSummary:
        'Providing token perks when staff are facing substantive compensation and workload pressures often backfires, damaging leadership credibility and accelerating turnover.',
      risksCreated: [
        'Triggers a sharp decline in team morale, pushing Human Resources into critical deficit.',
        'Weakens cross-departmental coordination heading into Turn 3.',
      ],
    },
  },
  {
    id: 'CHOICE_2C',
    label: 'Targeted Retention Packages for Indispensable Technical Leads',
    description:
      'Discreetly offer tailored retention bonuses and clear promotion paths exclusively to the top 15% most critical system architects and engineering leads, keeping general payroll unchanged.',
    executiveRationale:
      'Protect indispensable technical anchors while exercising fiscal discipline with general company funds.',
    baseImpact: {
      cashDelta: -1_500_000, // -$15,000
      grossBurnRateDelta: 100_000, // +$1,000 / month
      debtDelta: 0,
      hrDelta: 5,
      itDelta: 5,
      operationalExplanation:
        'Secured agreements with your top technical architects using $15,000 in targeted grants and a sustainable $1,000/mo burn adjustment, maintaining stability while conserving runway.',
    },
    learningFeedback: {
      corePrinciple: 'Targeted Resource Allocation',
      tradeoffSummary:
        'Focused retention packages protect critical institutional knowledge at a manageable cost, balancing runway longevity with core technical capacity.',
      risksCreated: [
        'Requires careful internal discretion to prevent perceptions of favoritism among engineers who did not receive packages.',
      ],
    },
  },
];

// --- Turn 3: Finance Department Choices ---
export const CHOICES_TURN_3: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_3A',
    label: 'Enact Strict Company-Wide Spending Freeze & Austerity Controls',
    description:
      'Freeze all hiring requisitions, eliminate travel and discretionary budgets, downgrade non-critical cloud testing environments, and cancel auxiliary developer software licenses.',
    executiveRationale:
      'Extend operating runway by cutting overhead expenses immediately without taking on external debt.',
    baseImpact: {
      cashDelta: 0, // $0
      grossBurnRateDelta: -600_000, // -$6,000 / month
      debtDelta: 0,
      hrDelta: -20,
      itDelta: -5,
      operationalExplanation:
        'Operating burn was reduced by $6,000/mo. However, the loss of development tooling and travel budgets caused frustration among remaining engineers, reducing productivity and team morale.',
    },
    learningFeedback: {
      corePrinciple: 'The Organizational Limits of Austerity',
      tradeoffSummary:
        'Aggressive cost-cutting extends cash runway on paper, but removing essential operational tools can cripple productivity and trigger resignations if team morale is already fragile.',
      risksCreated: [
        'Depresses staff morale; if already below 45, it triggers an additional HR morale penalty (-30 total).',
      ],
    },
  },
  {
    id: 'CHOICE_3B',
    label: 'Draw Down a $75,000 Venture Debt Credit Facility',
    description:
      'Draw $75,000 from an available venture lending facility at 8.0% annual interest with contractual $3,500/month principal repayments to bolster liquid cash reserves.',
    executiveRationale:
      'Inject immediate liquid cash into the company without diluting equity or enforcing disruptive cost reductions.',
    baseImpact: {
      cashDelta: 7_500_000, // +$75,000
      grossBurnRateDelta: 0,
      debtDelta: 7_500_000, // +$75,000 debt principal
      hrDelta: 0,
      itDelta: 0,
      operationalExplanation:
        'Deposited $75,000 in cash while creating a $75,000 debt obligation. Debt service took effect immediately, with $4,000 ($3,500 principal + $500 interest) deducted during monthly settlement.',
    },
    learningFeedback: {
      corePrinciple: 'The Debt Leverage Trade-Off',
      tradeoffSummary:
        'Debt financing boosts top-line cash reserves immediately, but mandatory monthly principal and interest payments increase net cash burn and heavily penalize long-term financial health.',
      risksCreated: [
        'Creates an ongoing debt service obligation ($3,976.67/mo next cycle) and a permanent debt leverage penalty on your financial rating.',
      ],
    },
  },
  {
    id: 'CHOICE_3C',
    label: 'Conduct Cross-Functional Cloud Optimization & Architecture Audit',
    description:
      'Partner technical leads with finance to audit cloud infrastructure, eliminate idle database instances, optimize server compute allocation, and renegotiate provider contracts.',
    executiveRationale:
      'Achieve sustainable structural savings through collaborative engineering efficiency rather than arbitrary budget cuts.',
    baseImpact: {
      cashDelta: -1_000_000, // -$10,000
      grossBurnRateDelta: -200_000, // -$2,000 / month base
      debtDelta: 0,
      hrDelta: 0,
      itDelta: -5,
      operationalExplanation:
        'Invested $10,000 in profiling tools and migration assistance, cutting ongoing cloud hosting expenses by $2,000/mo. If HR morale is high (>70), cross-functional engagement cuts burn by $5,000/mo.',
    },
    learningFeedback: {
      corePrinciple: 'Collaborative Operational Efficiency',
      tradeoffSummary:
        'Structured infrastructure optimizations deliver lasting reductions in operational expenses without hurting company culture, but require motivated, cooperative engineers to execute.',
      risksCreated: [
        'Requires an upfront $10,000 cash outlay.',
        'Cannot be executed (locked) if HR morale has broken down (<45).',
      ],
    },
  },
];

// ============================================================================
// 3. CONDITIONAL MODIFIERS TABLE
// ============================================================================

export const DEMO_MODIFIERS: readonly ChoiceModifier[] = [
  // 1. Hotfix tech debt penalty on token perks
  {
    modifierId: 'MOD_HOTFIX_TOKEN_PERKS',
    targetChoiceId: 'CHOICE_2B',
    conditions: [
      {
        type: 'DECISION_EQUALS',
        target: 'INC_IT_1',
        value: 'CHOICE_1B',
      },
    ],
    overrideItDelta: -15,
  },

  // 2. Crunch backfire on token perks
  {
    modifierId: 'MOD_CRUNCH_TOKEN_PERKS',
    targetChoiceId: 'CHOICE_2B',
    conditions: [
      {
        type: 'DECISION_EQUALS',
        target: 'INC_IT_1',
        value: 'CHOICE_1C',
      },
    ],
    overrideHrDelta: -45,
    overrideItDelta: -20,
  },

  // 3. Crunch premium on market raises
  {
    modifierId: 'MOD_CRUNCH_MARKET_RAISES',
    targetChoiceId: 'CHOICE_2A',
    conditions: [
      {
        type: 'DECISION_EQUALS',
        target: 'INC_IT_1',
        value: 'CHOICE_1C',
      },
    ],
    overrideCashDelta: -8_000_000, // -$80,000
  },

  // 4. Austerity death spiral in Finance
  {
    modifierId: 'MOD_AUSTERITY_DEATH_SPIRAL',
    targetChoiceId: 'CHOICE_3A',
    conditions: [
      {
        type: 'METRIC_LESS_THAN',
        target: 'hrMorale',
        value: 45,
      },
    ],
    overrideHrDelta: -30,
  },

  // 5. Collaborative Cloud Optimization locked if morale collapsed
  {
    modifierId: 'MOD_COLLAB_CLOUD_LOCKED',
    targetChoiceId: 'CHOICE_3C',
    conditions: [
      {
        type: 'METRIC_LESS_THAN',
        target: 'hrMorale',
        value: 45,
      },
    ],
    isLocked: true,
    lockReason:
      'Engineering morale is too fractured to execute a collaborative architecture audit.',
  },

  // 6. Collaborative Cloud Optimization maximum savings if morale is high
  {
    modifierId: 'MOD_COLLAB_CLOUD_SAVINGS',
    targetChoiceId: 'CHOICE_3C',
    conditions: [
      {
        type: 'METRIC_GREATER_THAN',
        target: 'hrMorale',
        value: 70,
      },
    ],
    overrideGrossBurnRateDelta: -500_000, // -$5,000 / month
  },
];

// ============================================================================
// 4. INCIDENTS DEFINITION
// ============================================================================

export const DEMO_INCIDENTS: readonly Incident[] = [
  // Turn 1: Production Security Incident
  {
    id: 'INC_IT_1',
    turn: 1,
    department: 'IT',
    title: 'Critical Database Exploit Detected',
    urgency: 'critical',
    basePremise:
      'At 02:15 AM, automated monitoring detected unauthorized SQL command injection against our primary production customer database cluster. Lead infrastructure engineer Marcus traced the vulnerability to an unauthenticated API endpoint pushed during last week\'s sprint.',
    businessContext:
      'The database stores sensitive account information, payment tokens, and configuration data for 42 enterprise clients. Attackers are currently probing the endpoint. Management must choose how to secure the system before client data is exposed.',
    narrativeVariants: [
      {
        variantId: 'VAR_IT_DEFAULT',
        conditions: [],
        leadInText:
          'Sarah Chen, Head of Infrastructure, requests an immediate decision from the CEO before the vulnerability is exploited by external threat actors.',
      },
    ],
    choices: CHOICES_TURN_1,
  },

  // Turn 2: Key Talent Retention Crisis
  {
    id: 'INC_HR_1',
    turn: 2,
    department: 'HR',
    title: 'Senior Engineering Retention Crisis',
    urgency: 'urgent',
    basePremise:
      'Elena Rostova, VP of People, reports that three of our senior engineering architects have received formal job offers from competitors offering 25–30% salary increases. Two additional mid-level developers have requested compensation reviews this morning.',
    businessContext:
      'Competitors have given our engineers two weeks to accept. Losing these team leads would halt product development for months, but blanket compensation increases will permanently raise our monthly payroll expenses.',
    narrativeVariants: [
      {
        variantId: 'VAR_HR_AFTER_CRUNCH',
        conditions: [
          {
            type: 'DECISION_EQUALS',
            target: 'INC_IT_1',
            value: 'CHOICE_1C',
          },
        ],
        leadInText:
          'Engineering team morale is at a breaking point after last weekend\'s mandatory 72-hour crunch. Developers feel exhausted and undervalued, and external recruiters are taking full advantage of the frustration.',
      },
      {
        variantId: 'VAR_HR_AFTER_HOTFIX',
        conditions: [
          {
            type: 'DECISION_EQUALS',
            target: 'INC_IT_1',
            value: 'CHOICE_1B',
          },
        ],
        leadInText:
          'Developers are visibly frustrated by having to support an unverified emergency patch. Key engineers complain that management favors short-term duct tape over solid engineering, making competing offers much more attractive.',
      },
      {
        variantId: 'VAR_HR_AFTER_FORENSIC',
        conditions: [
          {
            type: 'DECISION_EQUALS',
            target: 'INC_IT_1',
            value: 'CHOICE_1A',
          },
        ],
        leadInText:
          'Following the external forensic audit, the technical team respects leadership\'s commitment to code quality. However, wider market salary increases have made our senior leads prime targets for headhunters.',
      },
    ],
    choices: CHOICES_TURN_2,
  },

  // Turn 3: Cash Runway and Cloud Tooling Squeeze
  {
    id: 'INC_FIN_1',
    turn: 3,
    department: 'FINANCE',
    title: 'Year-End Capital Strategy & Runway Management',
    urgency: 'critical',
    basePremise:
      'David Vance, Chief Financial Officer, presents the year-end financial review. We must establish our capital strategy for the coming fiscal year to ensure sufficient operating runway for company survival.',
    businessContext:
      'Management must decide whether to secure debt financing, enforce strict spending cuts, or execute an engineering-led cloud optimization audit to balance our books.',
    narrativeVariants: [
      {
        variantId: 'VAR_FIN_LOW_MORALE',
        conditions: [
          {
            type: 'METRIC_LESS_THAN',
            target: 'hrMorale',
            value: 45,
          },
        ],
        leadInText:
          'With engineering morale critically low and team frustration spreading, finance must balance company accounts without relying on voluntary cross-department cooperation.',
      },
      {
        variantId: 'VAR_FIN_HIGH_MORALE',
        conditions: [
          {
            type: 'METRIC_GREATER_THAN',
            target: 'hrMorale',
            value: 70,
          },
        ],
        leadInText:
          'Supported by a dedicated engineering team with high morale, management has the organizational credibility to pursue collaborative technical efficiencies.',
      },
      {
        variantId: 'VAR_FIN_DEFAULT',
        conditions: [],
        leadInText:
          'Approaching the final financial review of the year, leadership must calibrate liquid cash, debt obligations, and monthly operating expenses to guarantee ongoing operations.',
      },
    ],
    choices: CHOICES_TURN_3,
  },
];

// ============================================================================
// 5. MASTER SCENARIO BLUEPRINT
// ============================================================================

export const MUSTARRED_DEMO_SCENARIO: Scenario = {
  id: 'SCENARIO_MUSTARRED_DEMO',
  title: 'Mustarred Executive Simulator: 3-Turn Corporate Crisis',
  targetAudience:
    'Aspiring tech leaders, executive managers, and cross-functional operators.',
  learningObjectives: [
    'Recognize that treating engineering effort as free capital induces compounding technical and cultural debt.',
    'Understand how balance-sheet leverage (venture debt) depresses forward financial health despite nominal cash gains.',
    'Experience bottleneck drag: corporate health collapses when any single department (IT, HR, Finance) enters critical deficit.',
    'Navigate non-linear cascading consequences where early trade-offs govern future option viability.',
  ],
  totalTurns: 3,
  initialConditions: DEMO_INITIAL_CONDITIONS,
  incidents: DEMO_INCIDENTS,
  modifiers: DEMO_MODIFIERS,
};
