/**
 * Mustarred Company Simulator - Scenario: Monday Morning Crisis
 *
 * The CEO sent a company-wide return-to-office mandate and a 15% budget cut
 * announcement over the weekend. By 9 AM Monday, IT, HR, and Finance are all
 * on fire at the same time. The player triages which desk to visit first.
 *
 * Turn 1 → IT:      Two senior engineers submitted resignations over RTO.
 * Turn 2 → HR:      15% cut means terminating 3 contractors mid-project.
 * Turn 3 → FINANCE: The cloud contract flagged for cutting has a $40k ETF.
 *
 * Each decision cascades into the others via conditional modifiers.
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

export const MONDAY_INITIAL_CONDITIONS: ScenarioInitialConditions = {
  startingCash: 32_000_000,        // $320,000 — healthy but not comfortable
  startingGrossMonthlyBurn: 2_200_000, // $22,000/mo
  startingDebt: 0,
  startingHrMorale: 72,
  startingItStability: 68,
  loanTerms: {
    annualInterestRate: 0.08,
    monthlyPrincipalAmortization: 350_000, // $3,500/mo
  },
};

// ============================================================================
// 2. TURN 1 — IT: RTO Engineer Resignations
// ============================================================================

export const CHOICES_IT_RTO: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_RTO_HYBRID',
    label: 'Announce a Formal Hybrid Policy: 3 Days In, 2 Days Remote',
    description:
      'Publish a written hybrid work policy — Tuesday, Wednesday, Thursday in-office, Monday and Friday remote. Withdraw the full RTO mandate and communicate it company-wide before end of day.',
    executiveRationale:
      'Meet engineers halfway. A structured hybrid policy retains talent without fully reversing the mandate.',
    baseImpact: {
      cashDelta: 0,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 15,
      itDelta: 10,
      operationalExplanation:
        'The hybrid announcement stopped both resignations within the hour. Engineers felt heard. Slack sentiment shifted from hostile to cautiously optimistic. No cash cost, but the full RTO goal is permanently off the table.',
    },
    learningFeedback: {
      corePrinciple: 'Structured Flexibility as a Retention Tool',
      tradeoffSummary:
        'A written hybrid policy costs nothing and recovers morale quickly, but permanently concedes the full RTO position and sets a precedent that executive mandates are negotiable.',
      risksCreated: [
        'Sets a precedent that staff pushback can reverse executive decisions.',
        'Managers who wanted full RTO for collaboration reasons will feel undermined.',
      ],
    },
  },
  {
    id: 'CHOICE_RTO_HOLD',
    label: 'Hold the Full RTO Mandate — Offer One-Time $5,000 Relocation Bonus',
    description:
      'Stand firm on full return-to-office. Offer a one-time $5,000 relocation or commute assistance bonus to every employee to soften the transition. Accept that some will still leave.',
    executiveRationale:
      'The mandate exists for a reason. Compensate for the disruption but do not reverse the policy.',
    baseImpact: {
      cashDelta: -2_000_000, // -$20,000 (4 engineers × $5,000)
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -10,
      itDelta: -5,
      operationalExplanation:
        'One of the two engineers accepted the bonus and stayed. The other resigned anyway. Morale across the team dipped — staff see the bonus as a bribe rather than genuine flexibility. $20,000 paid out across the four engineers who requested it.',
    },
    learningFeedback: {
      corePrinciple: 'The Limits of Financial Compensation for Policy Grievances',
      tradeoffSummary:
        'One-time bonuses can retain some staff but rarely address the underlying policy concern. Engineers who care about remote work see cash as a poor substitute for autonomy.',
      risksCreated: [
        'One senior engineer resigned regardless, creating an immediate skills gap.',
        '$20,000 cash outlay with only partial retention outcome.',
      ],
    },
  },
  {
    id: 'CHOICE_RTO_REVERSE',
    label: 'Fully Reverse the RTO Mandate — Remote-First Permanently',
    description:
      'Publicly retract the RTO announcement. Declare the company permanently remote-first. Issue a written apology to staff for the disruption caused by the weekend announcement.',
    executiveRationale:
      'The talent risk outweighs any collaboration benefit. Protect the engineering team at all costs.',
    baseImpact: {
      cashDelta: 0,
      grossBurnRateDelta: -150_000, // -$1,500/mo — office cost reduction
      debtDelta: 0,
      hrDelta: 25,
      itDelta: 5,
      operationalExplanation:
        'Both resignations were immediately withdrawn. Morale surged. The company also saves $1,500/mo in reduced office overhead by formally downsizing the reserved desk footprint. However, the public reversal signals that executive decisions can be overturned by collective pushback.',
    },
    learningFeedback: {
      corePrinciple: 'Executive Credibility vs. Talent Retention',
      tradeoffSummary:
        'Full reversal maximises morale and even reduces burn, but publicly walking back a company-wide mandate damages executive credibility and signals that organised resistance works.',
      risksCreated: [
        'Future policy changes will face immediate organised resistance from staff.',
        'Board and investors may question leadership decisiveness.',
      ],
    },
  },
];

// ============================================================================
// 3. TURN 2 — HR: Contractor Terminations
// ============================================================================

export const CHOICES_HR_CONTRACTORS: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_CONT_PROPER',
    label: 'Terminate with Full Notice Period & Project Handover Documentation',
    description:
      'Give all three contractors their full contractual notice period (4 weeks), pay out accrued obligations, and require structured knowledge transfer documentation before their last day.',
    executiveRationale:
      'Do this properly. The legal and reputational cost of a rushed exit is higher than 4 weeks of contractor fees.',
    baseImpact: {
      cashDelta: -1_800_000, // -$18,000 (3 contractors × 4 weeks notice)
      grossBurnRateDelta: -400_000, // -$4,000/mo after they leave
      debtDelta: 0,
      hrDelta: 5,
      itDelta: 5,
      operationalExplanation:
        'All three contractors completed structured handovers. Permanent staff absorbed the work with minimal disruption. The $18,000 notice period cost is offset by $4,000/mo in ongoing savings. No legal exposure. Internal team morale improved slightly — staff saw leadership handle exits with dignity.',
    },
    learningFeedback: {
      corePrinciple: 'Dignified Exits Protect Culture and Legal Standing',
      tradeoffSummary:
        'Proper notice periods cost more upfront but eliminate legal risk, preserve institutional knowledge, and signal to permanent staff that the company treats people fairly even when cutting costs.',
      risksCreated: [
        '$18,000 upfront cost before savings materialise.',
        'Projects remain partially dependent on contractors for 4 more weeks.',
      ],
    },
  },
  {
    id: 'CHOICE_CONT_IMMEDIATE',
    label: 'Terminate Immediately — Pay Minimum Statutory Obligations Only',
    description:
      'End all three contractor agreements today. Pay only the minimum legally required notice pay. Reassign their work to permanent staff immediately.',
    executiveRationale:
      'The budget cut is urgent. Every week of delay costs money the company does not have.',
    baseImpact: {
      cashDelta: -600_000, // -$6,000 minimum statutory pay
      grossBurnRateDelta: -400_000, // -$4,000/mo immediately
      debtDelta: 0,
      hrDelta: -20,
      itDelta: -10,
      operationalExplanation:
        'Contractors were escorted out same-day. Two of the three had no handover documentation. Permanent engineers inherited undocumented systems and half-finished features. Morale dropped sharply — staff are now worried they could be next. One contractor has already contacted an employment solicitor.',
    },
    learningFeedback: {
      corePrinciple: 'Short-Term Savings vs. Long-Term Operational Debt',
      tradeoffSummary:
        'Immediate termination saves 4 weeks of fees but creates undocumented system debt, legal exposure, and a chilling effect on permanent staff morale that costs far more to repair.',
      risksCreated: [
        'Potential wrongful termination claim from one contractor — legal fees pending.',
        'Two critical systems now have no documentation or handover.',
        'Permanent staff morale drops sharply; some are updating their CVs.',
      ],
    },
  },
  {
    id: 'CHOICE_CONT_SELECTIVE',
    label: 'Retain One Critical Contractor, Terminate Two with Full Notice',
    description:
      'Keep the contractor embedded in the most business-critical system for 3 more months to complete the project. Terminate the other two with full notice and structured handovers.',
    executiveRationale:
      'Cut where it is safe to cut. Protect the one dependency that could cause a production outage if lost abruptly.',
    baseImpact: {
      cashDelta: -1_200_000, // -$12,000 (2 × 4-week notice)
      grossBurnRateDelta: -250_000, // -$2,500/mo (2 of 3 gone)
      debtDelta: 0,
      hrDelta: 10,
      itDelta: 10,
      operationalExplanation:
        'Two contractors exited cleanly with full handovers. The third remains on a 3-month extension to complete the payment gateway migration. Permanent staff appreciated the measured approach. IT stability improved as the critical project continues without disruption.',
    },
    learningFeedback: {
      corePrinciple: 'Risk-Weighted Cost Reduction',
      tradeoffSummary:
        'Selective retention costs more than a full immediate cut but far less than a production incident caused by losing a critical dependency mid-project.',
      risksCreated: [
        'One contractor remains on payroll for 3 more months — partial savings only.',
        'Requires clear project completion criteria to avoid scope creep on the extension.',
      ],
    },
  },
];

// ============================================================================
// 4. TURN 3 — FINANCE: Cloud Contract Early Termination Trap
// ============================================================================

export const CHOICES_FIN_CLOUD: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_CLOUD_WAIT',
    label: 'Honour the Contract — Renegotiate at Natural Renewal in 6 Months',
    description:
      'Do not trigger the early termination clause. Continue paying the current contract rate for 6 months, then renegotiate aggressively at renewal for a 25% reduction.',
    executiveRationale:
      'Paying $40,000 to save $8,000 is not a budget cut — it is a budget disaster. Wait for the natural exit.',
    baseImpact: {
      cashDelta: 0,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 0,
      itDelta: 5,
      operationalExplanation:
        'No ETF triggered. The engineering team continues working on the existing infrastructure without disruption. David has opened renegotiation talks with the vendor for a 25% reduction at renewal. IT stability improves slightly as no migration is required.',
    },
    learningFeedback: {
      corePrinciple: 'Contract Literacy Before Cost-Cutting',
      tradeoffSummary:
        'Reading the contract before acting avoids a $40,000 penalty. Patience at renewal achieves the same savings without the upfront hit.',
      risksCreated: [
        'No immediate burn reduction — the 15% cut target is not fully met this quarter.',
        'Vendor may not agree to the 25% reduction at renewal.',
      ],
    },
  },
  {
    id: 'CHOICE_CLOUD_TERMINATE',
    label: 'Terminate the Contract Now — Pay the $40,000 ETF to Exit Immediately',
    description:
      'Trigger the early termination clause, pay the $40,000 fee, and migrate to a cheaper provider immediately. The new provider saves $3,500/mo, breaking even in roughly 11 months.',
    executiveRationale:
      'The CEO wants cuts now. Pay the penalty, take the hit, and show the board decisive action.',
    baseImpact: {
      cashDelta: -4_000_000, // -$40,000 ETF
      grossBurnRateDelta: -350_000, // -$3,500/mo on new provider
      debtDelta: 0,
      hrDelta: -5,
      itDelta: -15,
      operationalExplanation:
        'The $40,000 ETF was paid and migration began immediately. The engineering team spent two weeks on unplanned migration work, destabilising two services. The new provider is cheaper but the break-even is 11 months away — well past the quarter the CEO wanted savings in.',
    },
    learningFeedback: {
      corePrinciple: 'The True Cost of Reactive Cost-Cutting',
      tradeoffSummary:
        'Paying a penalty to exit a contract early rarely makes financial sense in the short term. The optics of "decisive action" cost $40,000 and 11 months of break-even time.',
      risksCreated: [
        '$40,000 immediate cash hit — larger than the annual savings for the first year.',
        'Two-week unplanned migration destabilises production services (-15 IT).',
        'Engineers resent being pulled off product work for an avoidable migration.',
      ],
    },
  },
  {
    id: 'CHOICE_CLOUD_AUDIT',
    label: 'Freeze New Spend & Run a 2-Week Cloud Waste Audit Instead',
    description:
      'Do not touch the contract. Instead, freeze all new cloud resource provisioning and run a 2-week internal audit to identify idle instances, over-provisioned databases, and unused storage.',
    executiveRationale:
      'Find the waste inside the contract before paying to exit it. Most cloud bills have 20–30% idle spend.',
    baseImpact: {
      cashDelta: -500_000, // -$5,000 audit tooling
      grossBurnRateDelta: -300_000, // -$3,000/mo from waste elimination
      debtDelta: 0,
      hrDelta: 0,
      itDelta: -5,
      operationalExplanation:
        'The audit found $3,000/mo in idle compute and orphaned snapshots. Eliminating them reduces burn without touching the contract or triggering the ETF. The $5,000 tooling cost pays back in under 2 months. Minor IT disruption during the audit as some environments were temporarily resized.',
    },
    learningFeedback: {
      corePrinciple: 'Optimise Before You Exit',
      tradeoffSummary:
        'Cloud waste audits almost always find savings faster and cheaper than contract exits. The constraint is engineering time, not contract terms.',
      risksCreated: [
        'Savings are smaller than a full contract renegotiation would achieve at renewal.',
        'Requires 2 weeks of engineering focus diverted from product work.',
      ],
    },
  },
];

// ============================================================================
// 5. CONDITIONAL MODIFIERS
// ============================================================================

export const MONDAY_MODIFIERS: readonly ChoiceModifier[] = [
  // If RTO was fully reversed, engineers are highly motivated → cloud audit saves more
  {
    modifierId: 'MOD_RTO_REVERSE_AUDIT_BONUS',
    targetChoiceId: 'CHOICE_CLOUD_AUDIT',
    conditions: [{ type: 'DECISION_EQUALS', target: 'INC_RTO_IT', value: 'CHOICE_RTO_REVERSE' }],
    overrideGrossBurnRateDelta: -500_000, // -$5,000/mo instead of -$3,000/mo
  },

  // If contractors were terminated immediately, IT stability is already fragile →
  // cloud termination causes a worse outage
  {
    modifierId: 'MOD_IMMEDIATE_TERM_CLOUD_PENALTY',
    targetChoiceId: 'CHOICE_CLOUD_TERMINATE',
    conditions: [{ type: 'DECISION_EQUALS', target: 'INC_HR_CONTRACTORS', value: 'CHOICE_CONT_IMMEDIATE' }],
    overrideItDelta: -25, // worse than base -15
  },

  // If RTO was held firm and morale is already low, immediate contractor termination
  // pushes HR into critical deficit
  {
    modifierId: 'MOD_RTO_HOLD_IMMEDIATE_TERM',
    targetChoiceId: 'CHOICE_CONT_IMMEDIATE',
    conditions: [{ type: 'DECISION_EQUALS', target: 'INC_RTO_IT', value: 'CHOICE_RTO_HOLD' }],
    overrideHrDelta: -30, // -30 instead of -20
  },

  // Cloud audit is locked if HR morale is critically low — team too fractured to cooperate
  {
    modifierId: 'MOD_LOW_MORALE_AUDIT_LOCKED',
    targetChoiceId: 'CHOICE_CLOUD_AUDIT',
    conditions: [{ type: 'METRIC_LESS_THAN', target: 'hrMorale', value: 45 }],
    isLocked: true,
    lockReason: 'Engineering morale is too low to run a voluntary cross-team audit. Staff are disengaged.',
  },

  // If RTO was reversed AND contractors were handled properly, the wait-and-renegotiate
  // option yields a better deal (vendor senses a stable, happy customer)
  {
    modifierId: 'MOD_GOOD_CULTURE_RENEGOTIATE',
    targetChoiceId: 'CHOICE_CLOUD_WAIT',
    conditions: [
      { type: 'DECISION_EQUALS', target: 'INC_RTO_IT', value: 'CHOICE_RTO_REVERSE' },
      { type: 'DECISION_EQUALS', target: 'INC_HR_CONTRACTORS', value: 'CHOICE_CONT_PROPER' },
    ],
    overrideGrossBurnRateDelta: -200_000, // -$2,000/mo early goodwill discount from vendor
  },
];

// ============================================================================
// 6. INCIDENTS
// ============================================================================

export const MONDAY_INCIDENTS: readonly Incident[] = [
  {
    id: 'INC_RTO_IT',
    turn: 1,
    department: 'IT',
    title: 'RTO Mandate: Two Senior Engineers Resign',
    urgency: 'critical',
    basePremise:
      'At 08:47 AM, Sarah Chen forwarded two formal resignation letters from senior engineers James Okafor and Priya Mehta. Both cite the weekend RTO announcement as the direct reason. Both have competing remote-first offers in hand.',
    businessContext:
      'James owns the authentication service. Priya leads the data pipeline team. Losing both before handovers would halt two critical product workstreams. Sarah needs a policy decision before the 10 AM all-hands standup.',
    narrativeVariants: [
      {
        variantId: 'VAR_RTO_DEFAULT',
        conditions: [],
        leadInText:
          'Sarah Chen is waiting at her desk with two printed resignation letters. The engineering Slack channel has 47 unread messages since 8 AM.',
      },
    ],
    choices: CHOICES_IT_RTO,
  },

  {
    id: 'INC_HR_CONTRACTORS',
    turn: 2,
    department: 'HR',
    title: 'Budget Cut: 3 Contractor Terminations Required',
    urgency: 'urgent',
    basePremise:
      'Elena Rostova has identified the three contractor roles that must be cut to hit the 15% budget reduction target. Two are mid-project: one is 60% through a payment gateway migration, another is the sole owner of the legacy reporting system.',
    businessContext:
      'The contractors are on standard agreements with 4-week notice clauses. Terminating immediately saves money faster but creates legal exposure and leaves two systems without documentation. Elena needs a decision on how to handle the exits.',
    narrativeVariants: [
      {
        variantId: 'VAR_CONT_AFTER_RTO_REVERSE',
        conditions: [{ type: 'DECISION_EQUALS', target: 'INC_RTO_IT', value: 'CHOICE_RTO_REVERSE' }],
        leadInText:
          'The mood in HR is cautiously positive after the RTO reversal. Elena notes that staff are watching closely to see whether the budget cuts are handled with the same care.',
      },
      {
        variantId: 'VAR_CONT_AFTER_RTO_HOLD',
        conditions: [{ type: 'DECISION_EQUALS', target: 'INC_RTO_IT', value: 'CHOICE_RTO_HOLD' }],
        leadInText:
          'Morale is already fragile after the RTO standoff. Elena warns that how these contractor exits are handled will either stabilise or break permanent staff confidence in leadership.',
      },
      {
        variantId: 'VAR_CONT_DEFAULT',
        conditions: [],
        leadInText:
          'Elena Rostova has the termination paperwork ready. She is waiting for your decision on how to proceed before contacting the contractors.',
      },
    ],
    choices: CHOICES_HR_CONTRACTORS,
  },

  {
    id: 'INC_FIN_CLOUD',
    turn: 3,
    department: 'FINANCE',
    title: 'Budget Cut: Cloud Contract Has a $40,000 Early Termination Fee',
    urgency: 'critical',
    basePremise:
      'David Vance discovered a clause in the cloud infrastructure contract that the CEO flagged for cutting: terminating before the 6-month renewal window triggers a $40,000 early termination fee. The contract saves $3,500/mo if exited — but the break-even is 11 months away.',
    businessContext:
      'The CEO wants visible cost cuts this quarter. David has three options: pay the penalty and exit now, wait 6 months for the natural renewal, or run an internal waste audit to find savings inside the existing contract.',
    narrativeVariants: [
      {
        variantId: 'VAR_FIN_LOW_MORALE',
        conditions: [{ type: 'METRIC_LESS_THAN', target: 'hrMorale', value: 45 }],
        leadInText:
          'With team morale critically low, David warns that any option requiring engineering cooperation will be difficult to execute. The cloud audit may not be viable.',
      },
      {
        variantId: 'VAR_FIN_HIGH_MORALE',
        conditions: [{ type: 'METRIC_GREATER_THAN', target: 'hrMorale', value: 70 }],
        leadInText:
          'The team is in good shape. David notes that a collaborative audit is very achievable given current staff engagement levels.',
      },
      {
        variantId: 'VAR_FIN_DEFAULT',
        conditions: [],
        leadInText:
          'David Vance has the contract open on his desk. He has flagged the ETF clause and is waiting for your direction before responding to the CEO.',
      },
    ],
    choices: CHOICES_FIN_CLOUD,
  },
];

// ============================================================================
// 7. SCENARIO PACKAGE
// ============================================================================

export const MONDAY_MORNING_SCENARIO: Scenario = {
  id: 'SCENARIO_MONDAY_MORNING',
  title: 'Mustarred Executive Simulator: Monday Morning Crisis',
  targetAudience: 'Tech executives, engineering managers, and operations leaders.',
  learningObjectives: [
    'Understand how a single poorly communicated policy decision cascades across IT, HR, and Finance simultaneously.',
    'Recognise that cost-cutting without contract literacy creates penalties larger than the savings.',
    'Experience how the order in which you resolve crises affects the options available in later ones.',
    'Navigate the tension between executive credibility and talent retention in a remote-work dispute.',
  ],
  totalTurns: 3,
  initialConditions: MONDAY_INITIAL_CONDITIONS,
  incidents: MONDAY_INCIDENTS,
  modifiers: MONDAY_MODIFIERS,
};
