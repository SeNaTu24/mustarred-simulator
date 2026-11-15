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
    label: 'Forensic Investigation & Clean Patch',
    description:
      'Retain an external cybersecurity firm to conduct a comprehensive root-cause forensic audit, cleanly patch the zero-day database exploit, and harden production security pipelines.',
    executiveRationale:
      'Prioritizes systemic infrastructure integrity and security posture over short-term capital preservation.',
    baseImpact: {
      cashDelta: -3_000_000, // -$30,000
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -5,
      itDelta: 20,
      operationalExplanation:
        'Engages top-tier forensic consultants. Eradicates the exploit and restores infrastructure confidence (+20 IT Stability), with minor audit overhead (-5 HR Morale) and $30,000 upfront expenditure.',
    },
    learningFeedback: {
      corePrinciple: 'Root-Cause Remediation vs. Technical Debt',
      tradeoffSummary:
        'Investing in thorough technical remediation protects long-term stability and customer trust, though it immediately drains liquid reserves.',
      risksCreated: [
        'Depletes cash reserves by $30,000, tightening financial runway for subsequent quarters.',
      ],
    },
  },
  {
    id: 'CHOICE_1B',
    label: 'Emergency In-House Hotfix & Silent Monitoring',
    description:
      'Instruct internal tech leads to quickly deploy an emergency hotfix and monitor telemetry silently, avoiding expensive forensic consultants and public disclosure.',
    executiveRationale:
      'Conserves immediate liquid capital while attempting rapid operational containment.',
    baseImpact: {
      cashDelta: -500_000, // -$5,000
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 0,
      itDelta: -25,
      operationalExplanation:
        'Applies a quick patch for only $5,000. However, the superficial fix introduces severe technical debt and fragility (-25 IT Stability) and schedules a latent breach risk.',
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
        'The unverified Turn 1 hotfix suffered an unpatched regression during enterprise customer due diligence, leaking sensitive telemetry data and incurring mandatory audit fees.',
    },
    learningFeedback: {
      corePrinciple: 'Compounding Liabilities of Technical Debt',
      tradeoffSummary:
        'Cutting corners on critical infrastructure saves nominal capital today but creates latent delayed failure modes that reappear with greater destructive force.',
      risksCreated: [
        'Schedules a delayed breach liability (DE_HOTFIX_LEAK) for Turn 3 (-$15,000 Cash, -10 IT).',
        'Leaves engineers demoralized and resentful of maintaining brittle, unaddressed tech debt.',
      ],
    },
  },
  {
    id: 'CHOICE_1C',
    label: 'Mandatory All-Hands Emergency Crunch Weekend',
    description:
      'Mandate an uncompensated 72-hour weekend crunch sprint for the entire engineering department to rewrite the compromised data pipeline from scratch.',
    executiveRationale:
      'Eliminates external consultant costs entirely by absorbing the crisis through internal workforce exertion.',
    baseImpact: {
      cashDelta: 0, // $0
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -30,
      itDelta: 15,
      operationalExplanation:
        'Rebuilds the pipeline without spending capital, but the extreme 72-hour crunch severely damages morale (-30 HR Morale) and induces deep organizational resentment.',
    },
    learningFeedback: {
      corePrinciple: 'Human Capital Depletion',
      tradeoffSummary:
        'Treating internal staff as a zero-cost buffer causes acute burnout and retention flight risks, amplifying future operational friction.',
      risksCreated: [
        'Triggers severe burnout (-30 HR Morale), pushing HR near critical deficit.',
        'Activates punitive cross-departmental modifiers in Turn 2 (crunch premium on raises, walkouts on perks).',
      ],
    },
  },
];

// --- Turn 2: HR Department Choices ---
export const CHOICES_TURN_2: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_2A',
    label: 'Market-Rate Salary Calibration & Retention Grants',
    description:
      'Execute an immediate compensation adjustment bringing engineering compensation to the 75th percentile of market parity, accompanied by structured retention bonuses.',
    executiveRationale:
      'Aggressively locks in mission-critical talent by eliminating market compensation discrepancies.',
    baseImpact: {
      cashDelta: -3_500_000, // -$35,000
      grossBurnRateDelta: 600_000, // +$6,000 / month
      debtDelta: 0,
      hrDelta: 20,
      itDelta: 5,
      operationalExplanation:
        'Disburses $35,000 in immediate retention grants and increases monthly burn by $6,000. Resolves employee anxiety and cements key talent (+20 HR Morale, +5 IT Stability).',
    },
    learningFeedback: {
      corePrinciple: 'Structural Overhead Expansion',
      tradeoffSummary:
        'Raising baseline payroll decisively secures talent but structurally shortens financial runway, permanently escalating monthly overhead.',
      risksCreated: [
        'Elevates gross monthly burn to $26,000/mo, leaving minimal financial margin for error.',
      ],
    },
  },
  {
    id: 'CHOICE_2B',
    label: 'Token Perks & Executive Pep Talk ("Pizza Party")',
    description:
      'Host catered team lunches, distribute company swag, grant prestigious title bumps, and deliver an inspiring all-hands address on mission alignment.',
    executiveRationale:
      'Attempts to rebuild morale with symbolic non-monetary perks while strictly conserving liquid capital.',
    baseImpact: {
      cashDelta: -150_000, // -$1,500
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -35,
      itDelta: 0,
      operationalExplanation:
        'Conserves liquid cash ($1,500 cost), but staff perceive superficial perks as insulting during a workload crisis (-35 HR Morale), accelerating quiet quitting.',
    },
    learningFeedback: {
      corePrinciple: 'The Fallacy of Symbolic Placation',
      tradeoffSummary:
        'Superficial gestures during substantive operational distress erode executive credibility and provoke severe disengagement.',
      risksCreated: [
        'Precipitates acute HR morale collapse, dropping the department into critical deficit (<35).',
        'Severely degrades cross-functional collaboration in Turn 3.',
      ],
    },
  },
  {
    id: 'CHOICE_2C',
    label: 'Targeted Retention Package & Career Pathways',
    description:
      'Disburse targeted retention refreshers and defined career advancement tracks strictly to the top 15% most critical technical architects and team leads.',
    executiveRationale:
      'Balances fiscal responsibility with surgical retention defense for mission-critical core positions.',
    baseImpact: {
      cashDelta: -1_500_000, // -$15,000
      grossBurnRateDelta: 100_000, // +$1,000 / month
      debtDelta: 0,
      hrDelta: 5,
      itDelta: 5,
      operationalExplanation:
        'Surgically protects indispensable technical leads with $15,000 upfront and a sustainable $1,000/mo burn increase (+5 HR Morale, +5 IT Stability).',
    },
    learningFeedback: {
      corePrinciple: 'Pragmatic Resource Prioritization',
      tradeoffSummary:
        'Targeted investments safeguard key technical anchors while maintaining capital discipline and runway longevity.',
      risksCreated: [
        'Requires nuanced internal diplomacy to avoid perceived disparity among non-targeted personnel.',
      ],
    },
  },
];

// --- Turn 3: Finance Department Choices ---
export const CHOICES_TURN_3: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_3A',
    label: 'Aggressive Corporate Austerity & Tooling Freeze',
    description:
      'Enact strict cost controls: cancel auxiliary software licenses, freeze all travel and discretionary budgets, terminate staging servers, and halt open requisitions.',
    executiveRationale:
      'Maximizes runway longevity by cutting operating burn immediately without incurring external debt.',
    baseImpact: {
      cashDelta: 0, // $0
      grossBurnRateDelta: -600_000, // -$6,000 / month
      debtDelta: 0,
      hrDelta: -20,
      itDelta: -5,
      operationalExplanation:
        'Slashing operating overhead reduces gross monthly burn by $6,000/mo. However, the loss of essential tooling frustrates staff (-20 HR Morale, -5 IT Stability).',
    },
    learningFeedback: {
      corePrinciple: 'Diminishing Returns of Blunt Austerity',
      tradeoffSummary:
        'Aggressive cost reductions extend runway on paper but can cripple operational velocity and trigger attrition if organizational reserves are already low.',
      risksCreated: [
        'Further depresses staff morale; if already fragile (<45), triggers an acute organizational death spiral.',
      ],
    },
  },
  {
    id: 'CHOICE_3B',
    label: 'Venture Debt Facility ($75k Inflow)',
    description:
      'Draw down a $75,000 venture credit facility at 8.0% APR with contractual $3,500/month principal amortization to inject non-dilutive liquidity.',
    executiveRationale:
      'Injects substantial liquid runway immediately, avoiding operational cutbacks or workforce friction.',
    baseImpact: {
      cashDelta: 7_500_000, // +$75,000
      grossBurnRateDelta: 0,
      debtDelta: 7_500_000, // +$75,000 debt principal
      hrDelta: 0,
      itDelta: 0,
      operationalExplanation:
        'Secures $75,000 in cash and establishes a $75,000 debt balance. Enters service immediately: $4,000 debt service ($500 interest + $3,500 principal) is deducted in current-turn settlement.',
    },
    learningFeedback: {
      corePrinciple: 'The Leverage Trap in Early-Stage Operating Models',
      tradeoffSummary:
        'Debt financing increases top-line cash reserves, but mandatory amortization and interest payments inflate ongoing net burn and trigger severe financial leverage penalties.',
      risksCreated: [
        'Incurs an ongoing debt service burden ($3,976.67/mo next cycle) and a permanent debt leverage penalty, capping financial health at 39.',
      ],
    },
  },
  {
    id: 'CHOICE_3C',
    label: 'Collaborative Cloud Optimization & Architecture Audit',
    description:
      'Engage cross-functional engineering and finance teams to execute a comprehensive cloud architecture audit, retiring zombie instances and optimizing resource allocation.',
    executiveRationale:
      'Targets structural cost efficiencies through cross-departmental technical collaboration rather than arbitrary cuts.',
    baseImpact: {
      cashDelta: -1_000_000, // -$10,000
      grossBurnRateDelta: -200_000, // -$2,000 / month base
      debtDelta: 0,
      hrDelta: 0,
      itDelta: -5,
      operationalExplanation:
        'Invests $10,000 in tooling and audit overhead, cutting baseline cloud burn by $2,000/mo. If engineering morale is high (>70), cross-functional engagement cuts burn by $5,000/mo.',
    },
    learningFeedback: {
      corePrinciple: 'Cross-Functional Structural Efficiency',
      tradeoffSummary:
        'Collaborative structural optimizations yield sustainable operational savings without damaging culture, but strictly require an engaged workforce to execute.',
      risksCreated: [
        'Requires an upfront $10,000 capital expenditure.',
        'Completely unviable (locked) if engineering morale has collapsed (<45).',
      ],
    },
  },
];

// ============================================================================
// 3. CONDITIONAL MODIFIERS TABLE
// ============================================================================

export const DEMO_MODIFIERS: readonly ChoiceModifier[] = [
  // 1. Hotfix tech debt penalty on token perks
  // If Turn 1 hotfix was chosen, selecting token perks causes additional IT destabilization (-15 IT)
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
  // If Turn 1 crunch was chosen, offering a pizza party provokes outrage (-45 HR, -20 IT)
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
  // If Turn 1 crunch was chosen, employees demand an additional $45,000 trust premium,
  // bringing total immediate cost to $80,000 ($35,000 base + $45,000 penalty = -$80,000 cash).
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
  // If HR morale is below 45 at Turn 3, austerity triggers a mass walkout (-30 HR)
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
  // If HR morale is below 45 at Turn 3, engineers refuse voluntary participation
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
  // If HR morale is above 70 at Turn 3, collaborative engagement maximizes burn reduction to -$5,000/mo
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
    title: 'Production Database Vulnerability',
    urgency: 'critical',
    basePremise:
      'Security operations flags an active remote code execution vulnerability in the core customer database cluster. Threat actors are probing the vulnerability.',
    businessContext:
      'The company holds $250,000 in cash reserves with a $20,000/mo burn rate. Leadership must resolve the zero-day exploit before proprietary enterprise data is compromised.',
    narrativeVariants: [
      {
        variantId: 'VAR_IT_DEFAULT',
        conditions: [],
        leadInText:
          'Security monitoring triggers high-severity alerts at 02:00. The infrastructure lead recommends an immediate response strategy before external parties exploit the zero-day.',
      },
    ],
    choices: CHOICES_TURN_1,
  },

  // Turn 2: Key Talent Retention Crisis
  {
    id: 'INC_HR_1',
    turn: 2,
    department: 'HR',
    title: 'Key Talent Retention Crisis',
    urgency: 'urgent',
    basePremise:
      'Competing tech firms have initiated an aggressive recruitment drive targeting your senior infrastructure and full-stack developers.',
    businessContext:
      'Following the operational stress of Turn 1, several key engineers are holding external offers. The Head of People warns that departure of key talent will derail the product roadmap.',
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
          'The engineering department is in open revolt following the uncompensated 72-hour crunch weekend. Multiple tech leads have placed competing offers on the VP of People\'s desk, demanding immediate answers.',
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
          'Frustrations are mounting across the technical team. Developers complain that management prioritizes short-term duct tape over foundational quality, leaving them to field constant operational fires.',
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
          'Following the disciplined forensic audit in Turn 1, engineers respect leadership\'s commitment to quality. However, broader market compensation pressures have prompted recruiters to target your team.',
      },
    ],
    choices: CHOICES_TURN_2,
  },

  // Turn 3: Cash Runway and Cloud Tooling Squeeze
  {
    id: 'INC_FIN_1',
    turn: 3,
    department: 'FINANCE',
    title: 'Q4 Cloud Optimization & Runway Squeeze',
    urgency: 'critical',
    basePremise:
      'Executive leadership convenes for the end-of-year financial review. Operating commitments, infrastructure overhead, and upcoming debt or cash obligations require executive determination.',
    businessContext:
      'The company must guarantee sufficient operating runway into the new fiscal year through debt financing, structural optimization, or aggressive corporate austerity.',
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
          'With employee engagement critically fractured and key departures destabilizing the floor, finance must balance the books without counting on voluntary cross-functional initiatives.',
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
          'Backed by an energized workforce and robust technical foundations, executive leadership has the operational credibility to undertake sophisticated structural efficiencies.',
      },
      {
        variantId: 'VAR_FIN_DEFAULT',
        conditions: [],
        leadInText:
          'Approaching the final financial review of the year, leadership must calibrate liquid cash, debt obligations, and structural monthly burn to ensure enterprise continuity.',
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
