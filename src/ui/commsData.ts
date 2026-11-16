/**
 * Mustarred Company Simulator - Organisational Communications & Dialogue Data
 */

import type { DecisionLedgerRecord, SimulationState } from '../simulation/types.ts';

export interface DepartmentHead {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly department: 'IT' | 'HR' | 'FINANCE' | 'LEGAL';
  readonly avatarColor: string;
  readonly officeDesk: { readonly x: number; readonly y: number };
}

export const DEPARTMENT_HEADS: Record<'IT' | 'HR' | 'FINANCE' | 'LEGAL', DepartmentHead> = {
  IT: {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    role: 'VP of Engineering',
    department: 'IT',
    avatarColor: '#0284c7',
    officeDesk: { x: 440, y: 210 },
  },
  HR: {
    id: 'elena-rostova',
    name: 'Elena Rostova',
    role: 'Head of Human Resources',
    department: 'HR',
    avatarColor: '#10b981',
    officeDesk: { x: 1380, y: 290 },
  },
  FINANCE: {
    id: 'david-vance',
    name: 'David Vance',
    role: 'Interim Chief Financial Officer',
    department: 'FINANCE',
    avatarColor: '#f59e0b',
    officeDesk: { x: 800, y: 800 },
  },
  LEGAL: {
    id: 'rachel-sterling',
    name: 'Rachel Sterling',
    role: 'General Counsel & Compliance Lead',
    department: 'LEGAL',
    avatarColor: '#8b5cf6',
    officeDesk: { x: 1360, y: 920 },
  },
};

export interface ProbingQuestion {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category: 'TECHNICAL' | 'FINANCIAL' | 'PERSONNEL' | 'RISK';
}

export interface CheckboxOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly defaultChecked: boolean;
}

export interface IncidentDialogue {
  readonly incidentId: string;
  readonly department: 'IT' | 'HR' | 'FINANCE';
  readonly head: DepartmentHead;
  readonly subject: string;
  readonly timestamp: string;
  readonly briefingLead: string;
  readonly confirmedFacts: readonly string[];
  readonly uncertainties: readonly string[];
  readonly businessImpact: string;
  readonly headRecommendation: {
    readonly choiceId: string;
    readonly title: string;
    readonly rationale: string;
  };
  readonly probingQuestions: readonly ProbingQuestion[];
  readonly controlConfig: {
    readonly sectionTitle: string;
    readonly checklistLabel: string;
    readonly checkboxes: readonly CheckboxOption[];
    readonly directivePlaceholder: string;
  };
}

export const INCIDENT_DIALOGUES: Record<number | string, IncidentDialogue> = {
  // ── Original 3-turn demo (keyed by turn number) ──────────────────────────
  1: {
    incidentId: 'INC_IT_1',
    department: 'IT',
    head: DEPARTMENT_HEADS.IT,
    subject: 'Critical: Unauthorized Database Query Exploit Detected',
    timestamp: 'Turn 1 · 02:15 AM',
    briefingLead:
      'Lead infrastructure engineer Marcus detected unauthorized SQL command injection against our primary production customer database cluster at 02:15 AM. The vulnerability stems from an unauthenticated API endpoint deployed in last week\'s sprint.',
    confirmedFacts: [
      'Automated monitoring detected unauthorized SQL command injection attempts against the primary database cluster.',
      'Lead infrastructure engineer Marcus traced the vulnerability to an unauthenticated API endpoint deployed last week.',
      'The database cluster stores sensitive account information, payment tokens, and configuration data for 42 enterprise clients.',
      'Attackers are actively probing the endpoint; management must act before customer records are compromised or exfiltrated.',
    ],
    uncertainties: [
      'Whether threat actors have already exfiltrated table records or are still mapping database schemas.',
      'Whether secondary microservices or endpoints share the same unauthenticated query handler.',
    ],
    businessImpact:
      'If enterprise client records or payment tokens are compromised, the company faces severe regulatory penalties, contractual breach liabilities, and client terminations.',
    headRecommendation: {
      choiceId: 'CHOICE_1A',
      title: 'Forensic Audit & Hardened Patch (Apex Cyber Defense)',
      rationale:
        'Engaging Apex Cyber Defense costs $30,000 upfront, but they provide certified forensic analysis, verify database integrity, and deploy an authoritative hardened patch (+20 IT) without burning out internal staff.',
    },
    probingQuestions: [
      {
        id: 'q1-data-risk',
        question: 'Sarah, what customer data is at risk if attackers exploit this database endpoint?',
        answer:
          'The database cluster houses account information, configuration schemas, and payment tokens for 42 enterprise accounts. Attackers are currently injecting SQL queries to probe permissions. If they bypass input validation, client records could be dumped or corrupted. We need to secure it before data is exposed.',
        category: 'RISK',
      },
      {
        id: 'q1-internal',
        question: 'Can our internal engineering team rewrite the database and auth layer over the weekend without outside contractors?',
        answer:
          'Choice 1C avoids external consulting bills ($0 cash cost), but requires a grueling 72-hour weekend crunch. Our engineers are already stretched thin; forcing an uncompensated sprint will severely deplete team morale (-30 HR) and leave lasting resentment, even if it stabilizes the service (+15 IT).',
        category: 'TECHNICAL',
      },
      {
        id: 'q1-hotfix',
        question: 'What happens if we deploy an in-house emergency hotfix tonight and monitor silently?',
        answer:
          'Deploying an in-house hotfix costs only $5,000 in overtime, but skipping comprehensive root-cause analysis destabilizes the platform (-25 IT). Worse, rushing an unverified fix leaves latent vulnerabilities that can fail later under enterprise security scrutiny.',
        category: 'FINANCIAL',
      },
    ],
    controlConfig: {
      sectionTitle: 'IT Security Operational Controls',
      checklistLabel: 'Authorized Implementation Safeguards',
      checkboxes: [
        {
          id: 'cb_isolate_endpoint',
          label: 'Deploy strict query parameter validation on the vulnerable endpoint',
          description: 'Blocks anomalous SQL patterns while the patch or audit is executed.',
          defaultChecked: true,
        },
        {
          id: 'cb_infra_logging',
          label: 'Enable verbose database query logging and connection tracing',
          description: 'Captures all inbound payloads to identify exploit signatures.',
          defaultChecked: true,
        },
        {
          id: 'cb_client_monitoring',
          label: 'Place enterprise database pipelines under heightened anomaly monitoring',
          description: 'Alerts on abnormal data read volumes or schema queries.',
          defaultChecked: false,
        },
      ],
      directivePlaceholder:
        'e.g. Hire external specialists to audit the database, or deploy an in-house hotfix...',
    },
  },

  2: {
    incidentId: 'INC_HR_1',
    department: 'HR',
    head: DEPARTMENT_HEADS.HR,
    subject: 'Critical: Senior Engineering Retention Crisis & Market Offers',
    timestamp: 'Turn 2 · 09:30 AM',
    briefingLead:
      'We have a serious retention emergency. Three of our senior engineering architects have received formal job offers from competitors offering 25-30% salary increases, and two mid-level developers submitted compensation review requests this morning.',
    confirmedFacts: [
      'Three senior engineering architects have formal competitor offers with 25-30% salary increases.',
      'Two mid-level developers have submitted compensation review requests this morning.',
      'Competitors have given our engineers a strict two-week acceptance deadline.',
      'Losing these team leads would halt product development for months and jeopardize client deliverables.',
    ],
    uncertainties: [
      'How many additional engineers will pursue outside offers if market compensation concerns are left unaddressed.',
      'Whether non-targeted staff will express dissatisfaction if retention packages are awarded selectively.',
    ],
    businessImpact:
      'Departure of core system architects would halt roadmap delivery for months, trigger emergency contractor expenses, and jeopardize enterprise service-level commitments.',
    headRecommendation: {
      choiceId: 'CHOICE_2A',
      title: 'Company-Wide Engineering Salary Increase & Retention Bonuses',
      rationale:
        'Bringing technical salaries to the 75th percentile with retention bonuses halts departures decisively (+20 HR, +5 IT). While it costs $35,000 upfront ($80,000 if the team endured a Turn 1 crunch) and adds $6,000/mo permanently to payroll burn, it secures the team.',
    },
    probingQuestions: [
      {
        id: 'q2-selective',
        question: 'Elena, can we offer retention grants selectively to our most indispensable leads instead of everyone?',
        answer:
          'Choice 2C offers targeted retention grants to our top 15% system architects for $15,000 upfront and a sustainable $1,000/mo burn increase (+5 HR, +5 IT). It protects our core technical capacity while conserving cash, but requires discretion to avoid perceived favoritism.',
        category: 'PERSONNEL',
      },
      {
        id: 'q2-culture',
        question: 'What if we provide catered team lunches, upgraded company swag, and title promotions instead of raises?',
        answer:
          'Choice 2B costs only $1,500, but superficial perks during a real compensation crisis will severely backfire. Staff perceive token gestures as dismissive of market realities, crashing morale by 35 points (-35 HR). If we just put them through a weekend crunch in Turn 1, the backlash is catastrophic (-45 HR, -20 IT).',
        category: 'RISK',
      },
      {
        id: 'q2-budget',
        question: 'How will company-wide raises and retention bonuses affect our financial runway?',
        answer:
          'Choice 2A requires $35,000 in bonuses and adds $6,000/mo permanently to gross burn (+20 HR, +5 IT). However, if we subjected the team to a mandatory weekend crunch last turn, engineers will demand an acute retention premium, requiring $80,000 upfront rather than $35,000.',
        category: 'FINANCIAL',
      },
    ],
    controlConfig: {
      sectionTitle: 'Human Resources Workforce Policy',
      checklistLabel: 'Staff Retention Directives',
      checkboxes: [
        {
          id: 'cb_stay_interviews',
          label: 'Conduct structured retention interviews with key technical architects',
          description: 'Identifies operational bottlenecks, tooling deficits, and sprint workload.',
          defaultChecked: true,
        },
        {
          id: 'cb_discretion_clause',
          label: 'Maintain executive discretion regarding individual retention agreements',
          description: 'Prevents compensation friction between specialized and general engineering teams.',
          defaultChecked: true,
        },
        {
          id: 'cb_benchmarking',
          label: 'Benchmark all technical roles against current regional 75th percentile salary data',
          description: 'Establishes transparent, objective compensation standards across departments.',
          defaultChecked: false,
        },
      ],
      directivePlaceholder:
        'e.g. Raise engineering salaries to market rates, or offer targeted bonuses to key staff...',
    },
  },

  3: {
    incidentId: 'INC_FIN_1',
    department: 'FINANCE',
    head: DEPARTMENT_HEADS.FINANCE,
    subject: 'Executive Treasury Review: Capital Strategy & Operating Runway',
    timestamp: 'Turn 3 · 02:00 PM',
    briefingLead:
      'We are conducting our year-end financial review to establish forward capital strategy. We must calibrate liquid cash, debt obligations, and monthly operating expenses to guarantee ongoing company operations.',
    confirmedFacts: [
      'Year-end financial review requires establishing forward capital strategy and securing sufficient operating runway.',
      'Cloud infrastructure hosting and software tooling represent our largest discretionary operating costs.',
      'An approved $75,000 venture debt credit facility term sheet is available at 8.0% APR with $3,500/mo principal amortization.',
    ],
    uncertainties: [
      'Whether upcoming client subscription renewals and cash settlements will close without unexpected delays.',
      'How severely aggressive tooling reductions will affect engineering productivity and team velocity.',
    ],
    businessImpact:
      'Depleting cash reserves below monthly gross burn and debt obligations triggers immediate insolvency and company liquidation. Taking on debt increases monthly payment commitments, while severe austerity degrades team morale.',
    headRecommendation: {
      choiceId: 'CHOICE_3B',
      title: 'Draw Down $75,000 Venture Debt Credit Facility',
      rationale:
        'Drawing the $75,000 credit facility injects immediate cash reserves to buffer operations without diluting equity or cutting staff. However, contractual debt service requires $3,500/mo in principal amortization plus 8.0% APR interest, and incurs a debt leverage penalty on our financial rating.',
    },
    probingQuestions: [
      {
        id: 'q3-debt-service',
        question: 'David, what are the exact loan terms and monthly repayment commitments for the venture debt?',
        answer:
          'The credit facility provides $75,000 cash upfront at 8.0% annual interest (APR) with contractual monthly principal repayments of $3,500/mo. In our first monthly settlement, debt service requires $4,000 ($3,500 principal + $500 interest). In addition, carrying debt imposes a leverage penalty on our financial health score.',
        category: 'FINANCIAL',
      },
      {
        id: 'q3-austerity',
        question: 'What are the consequences of enacting a strict spending freeze and austerity controls?',
        answer:
          'Choice 3A eliminates $6,000/mo of gross burn with $0 upfront cost, extending our runway. However, cutting software licenses and developer tooling reduces IT stability by 5 and HR morale by 20 (-5 IT, -20 HR). Furthermore, if HR morale is already fragile (< 45), austerity triggers an additional -10 HR penalty (-30 total), risking severe operational disruption.',
        category: 'RISK',
      },
      {
        id: 'q3-cloud-locked',
        question: 'How does the collaborative cloud optimization initiative operate, and what are its requirements?',
        answer:
          'Choice 3C requires $10,000 upfront and temporarily dips IT stability by 5 during reconfiguration, but delivers a permanent $2,000/mo reduction in gross cloud burn. If HR morale is high (> 70), strong cross-functional engagement achieves maximum savings of $5,000/mo. However, if HR morale is critically low (< 45), the option is locked because the team is too fractured to cooperate.',
        category: 'TECHNICAL',
      },
    ],
    controlConfig: {
      sectionTitle: 'Treasury & Operating Cost Directives',
      checklistLabel: 'Executive Spending Safeguards',
      checkboxes: [
        {
          id: 'cb_audit_subscriptions',
          label: 'Freeze recurring software renewals exceeding $250/mo pending executive review',
          description: 'Prevents automatic rollover of auxiliary licenses and tools.',
          defaultChecked: true,
        },
        {
          id: 'cb_hiring_freeze',
          label: 'Enforce selective hiring approval on non-critical departmental positions',
          description: 'Prevents headcount growth until operating runway targets are met.',
          defaultChecked: true,
        },
        {
          id: 'cb_treasury_sweep',
          label: 'Consolidate liquid working capital balances into high-yield escrow',
          description: 'Maximizes yield on operational reserves pending monthly settlements.',
          defaultChecked: false,
        },
      ],
      directivePlaceholder:
        'e.g. Cut software subscriptions, draw venture debt facility, or optimize cloud costs...',
    },
  },

  // ── Monday Morning Crisis (keyed by incident id) ─────────────────────────
  'INC_RTO_IT': {
    incidentId: 'INC_RTO_IT',
    department: 'IT',
    head: DEPARTMENT_HEADS.IT,
    subject: 'URGENT: Two Senior Engineers Resigned Over RTO Mandate',
    timestamp: 'Monday · 08:47 AM',
    briefingLead:
      'James Okafor and Priya Mehta both submitted formal resignations this morning citing the weekend RTO announcement. James owns our authentication service. Priya leads the data pipeline. We need a policy decision before the 10 AM standup or this gets worse.',
    confirmedFacts: [
      'James Okafor (Auth Service Lead) submitted a written resignation at 08:31 AM citing the RTO mandate.',
      'Priya Mehta (Data Pipeline Lead) submitted a written resignation at 08:44 AM with a competing remote-first offer in hand.',
      'Both engineers have critical system ownership with no documented handover plans.',
      'The engineering Slack channel has 47 unread messages since 8 AM — sentiment is overwhelmingly negative.',
      'Three other engineers have requested 1:1s with Sarah today.',
    ],
    uncertainties: [
      'Whether the three engineers requesting 1:1s are also considering leaving.',
      'Whether a hybrid compromise will satisfy James and Priya or whether they have already mentally committed to leaving.',
    ],
    businessImpact:
      'Losing James and Priya before handovers halts the authentication roadmap and the data pipeline migration. Emergency contractor replacements would cost $15,000-$25,000 and take 4-6 weeks to onboard.',
    headRecommendation: {
      choiceId: 'CHOICE_RTO_HYBRID',
      title: 'Announce a Formal Hybrid Policy (3 In, 2 Remote)',
      rationale:
        'A written hybrid policy costs nothing, stops both resignations, and recovers morale without fully reversing the mandate. It is the only option that protects both the talent and the company\'s credibility.',
    },
    probingQuestions: [
      {
        id: 'q-rto-james',
        question: 'Sarah, is James actually going to leave or is this a negotiating tactic?',
        answer:
          'James has a signed offer letter from a fully remote fintech. He showed it to me. This is not a bluff. He has been commuting 90 minutes each way and the RTO announcement was the final straw. Priya is in the same position — she has two kids in school and the commute is not workable for her schedule.',
        category: 'PERSONNEL',
      },
      {
        id: 'q-rto-cost',
        question: 'What does it actually cost us if both of them leave?',
        answer:
          'James is the only person who fully understands the OAuth token rotation logic. Replacing him takes 6 weeks minimum and $20,000 in contractor fees. Priya\'s pipeline feeds the billing system — if it breaks during a handover gap, we have a revenue recognition problem. The real cost of losing both is $40,000-$60,000 in replacement and disruption.',
        category: 'FINANCIAL',
      },
      {
        id: 'q-rto-others',
        question: 'How many other engineers are likely to follow if we hold the mandate?',
        answer:
          'Based on the Slack sentiment and the three 1:1 requests, I estimate 2-3 more engineers are actively considering their options. If James and Priya leave and we hold firm, I would expect at least one more resignation within two weeks.',
        category: 'RISK',
      },
    ],
    controlConfig: {
      sectionTitle: 'Remote Work Policy Decision',
      checklistLabel: 'Communication Safeguards',
      checkboxes: [
        {
          id: 'cb_rto_written',
          label: 'Issue the policy decision in writing before the 10 AM standup',
          description: 'Verbal announcements in a crisis create ambiguity. Written policy is binding.',
          defaultChecked: true,
        },
        {
          id: 'cb_rto_1on1',
          label: 'Have Sarah personally call James and Priya before the all-hands',
          description: 'Direct outreach before a public announcement prevents further escalation.',
          defaultChecked: true,
        },
        {
          id: 'cb_rto_manager',
          label: 'Brief all engineering managers on the decision before staff are notified',
          description: 'Managers should not learn about policy changes at the same time as their reports.',
          defaultChecked: false,
        },
      ],
      directivePlaceholder:
        'e.g. Announce hybrid policy, hold the mandate with a bonus, or fully reverse to remote-first...',
    },
  },

  'INC_HR_CONTRACTORS': {
    incidentId: 'INC_HR_CONTRACTORS',
    department: 'HR',
    head: DEPARTMENT_HEADS.HR,
    subject: 'Budget Cut: 3 Contractor Terminations — Legal Exposure on 2 Mid-Project Exits',
    timestamp: 'Monday · 10:15 AM',
    briefingLead:
      'The 15% budget cut requires terminating three contractors. Two are mid-project: one is 60% through a payment gateway migration, another is the sole owner of the legacy reporting system. Both have 4-week notice clauses. Terminating immediately saves money faster but creates real legal and operational risk.',
    confirmedFacts: [
      'Three contractor roles must be cut to achieve the 15% budget reduction target.',
      'Contractor A (payment gateway migration) is 60% through a business-critical project with no documentation.',
      'Contractor B (legacy reporting) is the sole person who understands the reporting system codebase.',
      'Contractor C (QA automation) has a self-contained role with full documentation — low-risk exit.',
      'All three contracts include a 4-week notice clause with statutory minimum pay obligations.',
    ],
    uncertainties: [
      'Whether Contractor A can complete adequate handover documentation in 4 weeks.',
      'Whether one of the contractors will pursue a wrongful termination claim if exited without full notice.',
    ],
    businessImpact:
      'Immediate termination of Contractor A mid-project risks a payment gateway outage. Losing Contractor B without documentation creates a reporting system black box that could take months to reverse-engineer.',
    headRecommendation: {
      choiceId: 'CHOICE_CONT_SELECTIVE',
      title: 'Retain One Critical Contractor, Terminate Two with Full Notice',
      rationale:
        'Keeping Contractor A for 3 more months to finish the gateway migration costs less than a production incident. Terminating B and C with full notice eliminates legal risk and preserves institutional knowledge through proper handovers.',
    },
    probingQuestions: [
      {
        id: 'q-cont-legal',
        question: 'Elena, what is our actual legal exposure if we terminate immediately without full notice?',
        answer:
          'Contractor B has already mentioned to a colleague that they know an employment solicitor. If we exit without the contractual notice period, they have a straightforward breach of contract claim. Legal fees alone would run $8,000-$15,000 even if we win. Paying the 4-week notice is cheaper than defending the claim.',
        category: 'RISK',
      },
      {
        id: 'q-cont-morale',
        question: 'How will permanent staff react to seeing contractors walked out same-day?',
        answer:
          'After this morning\'s RTO situation, the team is already on edge. A same-day escort-out will be interpreted as a signal that nobody is safe. I have already had two permanent engineers ask me privately whether their roles are at risk. A visible, abrupt exit will accelerate that anxiety significantly.',
        category: 'PERSONNEL',
      },
      {
        id: 'q-cont-gateway',
        question: 'What happens to the payment gateway project if we lose Contractor A immediately?',
        answer:
          'The gateway migration is 60% complete. The remaining 40% includes the fraud detection integration and the bank reconciliation logic — both are undocumented. If we lose Contractor A now, the project stalls for at least 6 weeks while a replacement gets up to speed. That delay costs more in engineering time than 4 weeks of contractor fees.',
        category: 'TECHNICAL',
      },
    ],
    controlConfig: {
      sectionTitle: 'Contractor Exit Policy',
      checklistLabel: 'Exit Process Safeguards',
      checkboxes: [
        {
          id: 'cb_cont_handover',
          label: 'Require written handover documentation as a condition of final payment',
          description: 'Ensures institutional knowledge is captured before the contractor leaves.',
          defaultChecked: true,
        },
        {
          id: 'cb_cont_legal',
          label: 'Have Rachel Sterling review all termination letters before they are sent',
          description: 'Legal review prevents contractual errors that create liability.',
          defaultChecked: true,
        },
        {
          id: 'cb_cont_comms',
          label: 'Communicate the exits to permanent staff before contractors are notified',
          description: 'Prevents rumours and allows managers to address team concerns proactively.',
          defaultChecked: false,
        },
      ],
      directivePlaceholder:
        'e.g. Terminate with full notice, exit immediately, or retain the critical contractor...',
    },
  },

  'INC_FIN_CLOUD': {
    incidentId: 'INC_FIN_CLOUD',
    department: 'FINANCE',
    head: DEPARTMENT_HEADS.FINANCE,
    subject: 'Budget Cut Blocked: Cloud Contract Has $40,000 Early Termination Fee',
    timestamp: 'Monday · 11:30 AM',
    briefingLead:
      'The cloud infrastructure contract the CEO flagged for cutting has a $40,000 early termination fee buried in Section 14.3. The contract saves $3,500/mo if we exit — but we would not break even for 11 months. I need your direction before I respond to the CEO.',
    confirmedFacts: [
      'The cloud contract has a $40,000 early termination fee if cancelled before the 6-month renewal window.',
      'The natural renewal date is in 6 months — exiting then costs nothing.',
      'Switching to the cheaper provider saves $3,500/mo but the break-even on the ETF is 11.4 months.',
      'An internal waste audit on the existing contract could identify $2,000-$5,000/mo in idle compute.',
      'The CEO has asked for visible cost cuts this quarter in the board report.',
    ],
    uncertainties: [
      'Whether the vendor would waive or reduce the ETF if approached directly.',
      'How much idle compute the audit would actually find — estimates range from $2,000 to $5,000/mo.',
    ],
    businessImpact:
      'Paying the $40,000 ETF to save $3,500/mo is a net loss for the first 11 months. Doing nothing leaves the CEO\'s cost-cut directive unaddressed. The audit is the middle path but requires engineering time.',
    headRecommendation: {
      choiceId: 'CHOICE_CLOUD_WAIT',
      title: 'Honour the Contract and Renegotiate at Renewal',
      rationale:
        'Paying $40,000 to save $3,500/mo is not a cost cut — it is a $40,000 expense. Waiting 6 months and renegotiating aggressively at renewal achieves the same outcome without the penalty.',
    },
    probingQuestions: [
      {
        id: 'q-fin-etf',
        question: 'David, is there any way to negotiate the ETF down with the vendor?',
        answer:
          'I called their account manager this morning. They are willing to reduce the ETF to $25,000 if we commit to a 12-month contract with the new provider they partner with. That is still a worse deal than waiting for the natural renewal. I would not recommend it.',
        category: 'FINANCIAL',
      },
      {
        id: 'q-fin-audit',
        question: 'How confident are you in the waste audit finding real savings?',
        answer:
          'Based on our last infrastructure review 18 months ago, we had about 22% idle compute. Cloud usage has grown since then and we have never cleaned it up. I am confident the audit finds at least $2,000/mo. If the engineering team is engaged, $4,000-$5,000/mo is realistic. The $5,000 tooling cost pays back in 5 weeks.',
        category: 'TECHNICAL',
      },
      {
        id: 'q-fin-ceo',
        question: 'How do I explain to the CEO that we cannot cut the cloud contract this quarter?',
        answer:
          'Frame it as contract literacy protecting the company from a $40,000 mistake. Present the audit as the alternative — it delivers real savings this quarter without the penalty. The board will respect a CFO who reads the contract before cutting it.',
        category: 'RISK',
      },
    ],
    controlConfig: {
      sectionTitle: 'Cloud Cost Strategy',
      checklistLabel: 'Financial Governance Safeguards',
      checkboxes: [
        {
          id: 'cb_fin_contract',
          label: 'Document the ETF clause and share it with the CEO before any decision',
          description: 'Ensures the CEO is making an informed decision, not a reactive one.',
          defaultChecked: true,
        },
        {
          id: 'cb_fin_freeze',
          label: 'Freeze all new cloud resource provisioning immediately',
          description: 'Stops the bill growing while the audit or renegotiation is underway.',
          defaultChecked: true,
        },
        {
          id: 'cb_fin_vendor',
          label: 'Request a formal ETF waiver in writing from the vendor',
          description: 'Creates a paper trail and occasionally results in a goodwill reduction.',
          defaultChecked: false,
        },
      ],
      directivePlaceholder:
        'e.g. Wait for renewal, pay the ETF and exit now, or run a waste audit...',
    },
  },
};

export interface CrossDeptReaction {
  readonly choiceId: string;
  readonly senderName: string;
  readonly senderTitle: string;
  readonly senderDept: 'IT' | 'HR' | 'FINANCE' | 'LEGAL';
  readonly subject: string;
  readonly timestamp: string;
  readonly message: string;
  readonly tone: 'warning' | 'critical' | 'info' | 'positive';
}

function formatCents(cents: number): string {
  const isNegative = cents < 0;
  const absDollars = Math.abs(cents) / 100;
  const formatted = absDollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return isNegative ? `-${formatted}` : formatted;
}

export function buildCrossDeptReaction(
  choiceId: string,
  record?: DecisionLedgerRecord,
  state?: SimulationState
): CrossDeptReaction {
  switch (choiceId) {
    // ── Original demo choices ─────────────────────────────────────────────
    case 'CHOICE_1A': {
      const cashText = state ? ` Cash reserves stand at ${formatCents(state.financials.cash)}.` : '';
      return {
        choiceId,
        senderName: 'David Vance',
        senderTitle: 'Interim CFO',
        senderDept: 'FINANCE',
        subject: 'Treasury Note: $30,000 Specialist Retainer Disbursed',
        timestamp: 'Turn 1 · 11:30 AM',
        message: `The $30,000 invoice for Apex Cyber Defense has cleared treasury. While certified external security was necessary to verify database integrity and protect enterprise contracts (+20 IT), our liquid cushion has taken a significant hit.${cashText} We have far less margin for unexpected expenses in upcoming quarters.`,
        tone: 'warning',
      };
    }
    case 'CHOICE_1B': {
      return {
        choiceId,
        senderName: 'Marcus Vance',
        senderTitle: 'Lead Infrastructure Engineer',
        senderDept: 'IT',
        subject: 'Internal Memo: In-House Patch Deployed — Latent Technical Debt',
        timestamp: 'Turn 1 · 10:45 AM',
        message:
          'The internal hotfix has been pushed to production and exploit attempts against the database endpoint are currently blocked. However, we only patched the immediate entry point for $5,000 in overtime. Without deep root-cause verification, our underlying infrastructure remains fragile (-25 IT). If clients or compliance auditors conduct a formal security review later, unresolved flaws could resurface.',
        tone: 'info',
      };
    }
    case 'CHOICE_1C': {
      return {
        choiceId,
        senderName: 'Elena Rostova',
        senderTitle: 'Head of Human Resources',
        senderDept: 'HR',
        subject: 'Urgent: Engineering Team Burnout Following 72-Hour Weekend Crunch',
        timestamp: 'Turn 1 · 06:15 PM',
        message:
          'The engineering team worked through the weekend on a grueling 72-hour sprint to rebuild the service. While it avoided upfront cash expenses, the toll on personnel is severe. Developers are exhausted and demoralized. Team morale dropped sharply (-30 HR), and staff frustration is palpable across the department. If management expects engineers to absorb future crises as free labor, we will face acute retention problems.',
        tone: 'critical',
      };
    }
    case 'CHOICE_2A': {
      const upfrontCost = record ? Math.abs(record.immediateFinancialDeltas.cashDelta) : 3_500_000;
      const costFormatted = formatCents(upfrontCost);
      const burnFormatted = state ? `${formatCents(state.financials.grossMonthlyBurn)}/mo` : '$26,000/mo';
      const cashText = state ? ` Cash reserves stand at ${formatCents(state.financials.cash)}.` : '';
      return {
        choiceId,
        senderName: 'David Vance',
        senderTitle: 'Interim CFO',
        senderDept: 'FINANCE',
        subject: 'Treasury Alert: Fixed Payroll Burn Increased',
        timestamp: 'Turn 2 · 02:45 PM',
        message: `Elena's market salary adjustments have halted senior developer departures (+20 HR), but ongoing payroll obligations have increased. Monthly gross burn is now ${burnFormatted}, and upfront bonuses required ${costFormatted}.${cashText} We will need disciplined revenue execution to sustain this overhead.`,
        tone: 'warning',
      };
    }
    case 'CHOICE_2B': {
      const hrDrop = record ? Math.abs(record.immediateMetricDeltas.hrDelta) : 35;
      return {
        choiceId,
        senderName: 'Sarah Chen',
        senderTitle: 'VP of Engineering',
        senderDept: 'IT',
        subject: 'Staff Feedback: Token Perks Poorly Received by Developers',
        timestamp: 'Turn 2 · 04:30 PM',
        message: `The team lunches and company swag were perceived as dismissive by engineers facing real workload and compensation pressures. Senior architects with competing offers felt leadership dodged substantive retention concerns. HR morale dropped sharply (-${hrDrop} HR). Multiple senior engineers are actively interviewing, and team cohesion is in critical condition.`,
        tone: 'critical',
      };
    }
    case 'CHOICE_2C': {
      return {
        choiceId,
        senderName: 'Elena Rostova',
        senderTitle: 'Head of Human Resources',
        senderDept: 'HR',
        subject: 'Targeted Retention Agreements Secured for Core Technical Leads',
        timestamp: 'Turn 2 · 03:15 PM',
        message:
          'Targeted retention packages ($15,000 in upfront grants plus a manageable $1,000/mo payroll adjustment) have been accepted by our indispensable system architects. Key technical leads have agreed to stay and anchor our roadmap. By avoiding a blanket payroll expansion, we conserved cash while stabilizing critical systems (+5 HR, +5 IT). Maintaining internal confidentiality remains essential.',
        tone: 'positive',
      };
    }
    case 'CHOICE_3A': {
      const hrDelta = record ? record.immediateMetricDeltas.hrDelta : -20;
      const itDelta = record ? record.immediateMetricDeltas.itDelta : -5;
      return {
        choiceId,
        senderName: 'Sarah Chen',
        senderTitle: 'VP of Engineering',
        senderDept: 'IT',
        subject: 'Operations Report: Austerity Controls Enacted Across Engineering',
        timestamp: 'Turn 3 · 04:15 PM',
        message: `The spending freeze reduced operating burn by $6,000/mo, providing vital breathing room for company cash. However, eliminating auxiliary software licenses, cloud sandboxes, and developer travel has degraded engineering morale (${hrDelta} HR) and will slow incident response times (${itDelta} IT). While operating runway has been extended, the team is operating under significant tooling constraints.`,
        tone: 'warning',
      };
    }
    case 'CHOICE_3B': {
      const cashText = state
        ? ` Cash reserves stand at ${formatCents(state.financials.cash)}, with total debt principal at ${formatCents(state.financials.debtPrincipal)}.`
        : '';
      return {
        choiceId,
        senderName: 'David Vance',
        senderTitle: 'Interim CFO',
        senderDept: 'FINANCE',
        subject: 'Treasury Report: $75,000 Venture Debt Facility Drawn',
        timestamp: 'Turn 3 · 04:45 PM',
        message: `The $75,000 venture lending facility has been disbursed into our accounts.${cashText} Loan terms are 8.0% annual interest with contractual principal repayments of $3,500/month. Note that monthly debt service will add approximately $4,000 to our settlement cash requirements next month, and the balance-sheet leverage imposes a penalty on our financial rating.`,
        tone: 'info',
      };
    }
    case 'CHOICE_3C': {
      const burnSaved = record ? Math.abs(record.immediateFinancialDeltas.grossBurnRateDelta) : 200_000;
      const burnSavedFormatted = formatCents(burnSaved);
      const itDelta = record ? record.immediateMetricDeltas.itDelta : -5;
      return {
        choiceId,
        senderName: 'Sarah Chen',
        senderTitle: 'VP of Engineering',
        senderDept: 'IT',
        subject: 'Infrastructure Audit: Cloud Optimization Savings Applied',
        timestamp: 'Turn 3 · 05:00 PM',
        message: `The engineering team completed the cloud infrastructure audit and compute optimization for $10,000 upfront. By decommissioning idle server instances and optimizing cluster provisioning, we permanently reduced gross monthly burn by ${burnSavedFormatted}/mo. While reconfiguring production environments caused minor temporary friction (${itDelta} IT), our ongoing hosting expenses are sustainably lower.`,
        tone: 'positive',
      };
    }

    // ── Monday Morning: RTO ───────────────────────────────────────────────
    case 'CHOICE_RTO_HYBRID': {
      return {
        choiceId,
        senderName: 'Elena Rostova',
        senderTitle: 'Head of Human Resources',
        senderDept: 'HR',
        subject: 'Staff Update: Hybrid Policy Announced — Resignations Withdrawn',
        timestamp: 'Monday · 09:52 AM',
        message:
          'James and Priya both withdrew their resignations within 20 minutes of the written hybrid policy going out. Slack sentiment has shifted. Three other engineers cancelled their 1:1 requests. The 3-in / 2-remote structure is now the official policy of record.',
        tone: 'positive',
      };
    }
    case 'CHOICE_RTO_HOLD': {
      return {
        choiceId,
        senderName: 'Sarah Chen',
        senderTitle: 'VP of Engineering',
        senderDept: 'IT',
        subject: 'Engineering Update: One Resignation Stands — Handover Required',
        timestamp: 'Monday · 10:05 AM',
        message:
          'Priya accepted the relocation bonus and will stay. James declined and is serving his notice period. We need to start an emergency handover of the auth service this week. Morale is fragile — the team sees the bonus as a bribe rather than a genuine response to their concerns.',
        tone: 'warning',
      };
    }
    case 'CHOICE_RTO_REVERSE': {
      return {
        choiceId,
        senderName: 'David Vance',
        senderTitle: 'Interim CFO',
        senderDept: 'FINANCE',
        subject: 'Treasury Note: Office Footprint Reduction Saves $1,500/mo',
        timestamp: 'Monday · 10:20 AM',
        message:
          'With the permanent remote-first policy confirmed, I have initiated a desk footprint reduction with the building manager. We will save $1,500/mo in reserved workspace fees starting next month. Both resignations withdrawn. Engineering morale is the highest it has been in months.',
        tone: 'positive',
      };
    }

    // ── Monday Morning: Contractors ───────────────────────────────────────
    case 'CHOICE_CONT_PROPER': {
      return {
        choiceId,
        senderName: 'Rachel Sterling',
        senderTitle: 'General Counsel',
        senderDept: 'LEGAL',
        subject: 'Legal Clearance: Contractor Exits Processed Without Exposure',
        timestamp: 'Monday · 02:30 PM',
        message:
          'All three termination letters have been reviewed and issued with full contractual notice. Handover documentation requirements are written into the exit agreements. No legal exposure. The structured process also sent a positive signal to permanent staff about how the company handles exits.',
        tone: 'positive',
      };
    }
    case 'CHOICE_CONT_IMMEDIATE': {
      return {
        choiceId,
        senderName: 'Rachel Sterling',
        senderTitle: 'General Counsel',
        senderDept: 'LEGAL',
        subject: 'Legal Alert: Contractor B Has Contacted an Employment Solicitor',
        timestamp: 'Monday · 03:15 PM',
        message:
          'Contractor B reached out to an employment solicitor within two hours of being escorted out. We have a potential breach of contract claim. I am estimating $8,000-$12,000 in legal fees to defend even if we win. Two critical systems also have no handover documentation — engineering is already struggling.',
        tone: 'critical',
      };
    }
    case 'CHOICE_CONT_SELECTIVE': {
      return {
        choiceId,
        senderName: 'Sarah Chen',
        senderTitle: 'VP of Engineering',
        senderDept: 'IT',
        subject: 'Engineering Update: Gateway Migration Continues — Two Clean Exits',
        timestamp: 'Monday · 02:45 PM',
        message:
          'Contractors B and C completed structured handovers and exited cleanly. Contractor A remains on a 3-month extension to finish the payment gateway migration. The team appreciated the measured approach — it showed leadership understands which risks are worth taking.',
        tone: 'positive',
      };
    }

    // ── Monday Morning: Cloud Contract ────────────────────────────────────
    case 'CHOICE_CLOUD_WAIT': {
      return {
        choiceId,
        senderName: 'David Vance',
        senderTitle: 'Interim CFO',
        senderDept: 'FINANCE',
        subject: 'Treasury Update: ETF Avoided — Renegotiation Scheduled at Renewal',
        timestamp: 'Monday · 04:00 PM',
        message:
          'No early termination fee triggered. I have briefed the CEO on the contract clause and framed the renewal renegotiation as the cost-cut strategy for Q3. The vendor has been put on notice that we will be seeking a 25% reduction. Engineering continues without any migration disruption.',
        tone: 'info',
      };
    }
    case 'CHOICE_CLOUD_TERMINATE': {
      const itDelta = record ? record.immediateMetricDeltas.itDelta : -15;
      return {
        choiceId,
        senderName: 'Sarah Chen',
        senderTitle: 'VP of Engineering',
        senderDept: 'IT',
        subject: 'Engineering Alert: Unplanned Migration Destabilised Two Services',
        timestamp: 'Monday · 05:30 PM',
        message: `The $40,000 ETF was paid and migration started immediately. Two services went into degraded state during the provider switch. The team spent two unplanned weeks on migration instead of product work (${itDelta} IT). Break-even on the ETF is 11 months away — well past the quarter the CEO wanted savings in.`,
        tone: 'critical',
      };
    }
    case 'CHOICE_CLOUD_AUDIT': {
      const burnSaved = record ? Math.abs(record.immediateFinancialDeltas.grossBurnRateDelta) : 300_000;
      return {
        choiceId,
        senderName: 'David Vance',
        senderTitle: 'Interim CFO',
        senderDept: 'FINANCE',
        subject: `Cloud Audit Complete: ${formatCents(burnSaved)}/mo in Waste Eliminated`,
        timestamp: 'Monday · 05:00 PM',
        message: `The 2-week audit identified idle compute, orphaned snapshots, and over-provisioned databases. Eliminating them saves ${formatCents(burnSaved)}/mo with no contract changes and no ETF. The $5,000 tooling cost pays back in under 2 months. No migration required.`,
        tone: 'positive',
      };
    }

    default:
      return {
        choiceId,
        senderName: 'Corporate Administration',
        senderTitle: 'Operations Lead',
        senderDept: 'IT',
        subject: 'Executive Decision Recorded',
        timestamp: 'Turn Aftermath',
        message: 'The executive decision has been authorized and implementation is underway.',
        tone: 'info',
      };
  }
}

export const CROSS_DEPT_REACTIONS: Record<string, CrossDeptReaction> = {
  CHOICE_1A: buildCrossDeptReaction('CHOICE_1A'),
  CHOICE_1B: buildCrossDeptReaction('CHOICE_1B'),
  CHOICE_1C: buildCrossDeptReaction('CHOICE_1C'),
  CHOICE_2A: buildCrossDeptReaction('CHOICE_2A'),
  CHOICE_2B: buildCrossDeptReaction('CHOICE_2B'),
  CHOICE_2C: buildCrossDeptReaction('CHOICE_2C'),
  CHOICE_3A: buildCrossDeptReaction('CHOICE_3A'),
  CHOICE_3B: buildCrossDeptReaction('CHOICE_3B'),
  CHOICE_3C: buildCrossDeptReaction('CHOICE_3C'),
  CHOICE_RTO_HYBRID: buildCrossDeptReaction('CHOICE_RTO_HYBRID'),
  CHOICE_RTO_HOLD: buildCrossDeptReaction('CHOICE_RTO_HOLD'),
  CHOICE_RTO_REVERSE: buildCrossDeptReaction('CHOICE_RTO_REVERSE'),
  CHOICE_CONT_PROPER: buildCrossDeptReaction('CHOICE_CONT_PROPER'),
  CHOICE_CONT_IMMEDIATE: buildCrossDeptReaction('CHOICE_CONT_IMMEDIATE'),
  CHOICE_CONT_SELECTIVE: buildCrossDeptReaction('CHOICE_CONT_SELECTIVE'),
  CHOICE_CLOUD_WAIT: buildCrossDeptReaction('CHOICE_CLOUD_WAIT'),
  CHOICE_CLOUD_TERMINATE: buildCrossDeptReaction('CHOICE_CLOUD_TERMINATE'),
  CHOICE_CLOUD_AUDIT: buildCrossDeptReaction('CHOICE_CLOUD_AUDIT'),
};
