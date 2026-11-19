/**
 * Mustarred Company Simulator - Finance Diesel Agreement Incident Knowledge Package
 *
 * Grounded strictly in the active SCENARIO_MONDAY_MORNING (INC_FIN_DIESEL),
 * procurement contract artifact, and executive financial governance rules.
 *
 * Implements:
 * 1. Incident facts with explicit certainty classification (CONFIRMED, REPORTED, SUSPECTED, UNKNOWN)
 * 2. Chronological incident timeline events
 * 3. Evidence items and their discovery requirements
 * 4. Epistemic perspectives separating objective truth, character knowledge, and unverified hypotheses
 * 5. Associated regulatory assertions and verification status
 */

import {
  REG_COMMERCIAL_TERMINATION_PENALTY,
  REG_FIN_VENDOR_SIGNING_AUTHORITY,
} from '../regulatory.ts';
import type {
  EvidenceItem,
  IncidentKnowledgePackage,
  IncidentTimelineEvent,
  ScenarioFact,
} from '../types.ts';

// ============================================================================
// 1. SCENARIO FACTS
// ============================================================================

export const FACT_FIN_CONTRACT_SIGNED: ScenarioFact = {
  id: 'FACT_FIN_CONTRACT_SIGNED',
  incidentId: 'INC_FIN_DIESEL',
  category: 'FINANCIAL_IMPACT',
  statement:
    'Finance Manager Chinedu Eze signed a 24-month exclusive Diesel Supply Agreement with Rainoil Energy Services last month at the vendor\'s office.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Confirmed in turn 3 premise and contract artifact metadata.',
};

export const FACT_FIN_MARKET_PRICE_DROP: ScenarioFact = {
  id: 'FACT_FIN_MARKET_PRICE_DROP',
  incidentId: 'INC_FIN_DIESEL',
  category: 'FINANCIAL_IMPACT',
  statement:
    'Market diesel prices have dropped significantly since execution, and a competing supplier has quoted prices 20% lower than the contract rate.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Confirmed in turn 3 premise and business context.',
};

export const FACT_FIN_MD_COST_CUT_MANDATE: ScenarioFact = {
  id: 'FACT_FIN_MD_COST_CUT_MANDATE',
  incidentId: 'INC_FIN_DIESEL',
  category: 'FINANCIAL_IMPACT',
  statement:
    'Managing Director Folake Adebayo has mandated company-wide operational cost cuts this quarter.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Confirmed in turn 3 business context.',
};

export const FACT_FIN_LEGAL_NEVER_REVIEWED: ScenarioFact = {
  id: 'FACT_FIN_LEGAL_NEVER_REVIEWED',
  incidentId: 'INC_FIN_DIESEL',
  category: 'REGULATORY',
  statement:
    'Company Secretary Funmi Adeyemi never reviewed the contract prior to signature; the document reached her desk a week later already stamped.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Stated by Funmi Adeyemi in turn 3 consultation.',
};

export const FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY: ScenarioFact = {
  id: 'FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY',
  incidentId: 'INC_FIN_DIESEL',
  category: 'FINANCIAL_IMPACT',
  statement:
    'Clause 9.3 stipulates that early termination requires Mustarred to pay 40% of the total value of the remaining months (~$9,000 / N900,000).',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Documented in Clause 9 contract artifact and CHOICE_FIN_EXIT pricing.',
};

export const FACT_FIN_CLAUSE_9_4_AUTO_RENEWAL: ScenarioFact = {
  id: 'FACT_FIN_CLAUSE_9_4_AUTO_RENEWAL',
  incidentId: 'INC_FIN_DIESEL',
  category: 'REGULATORY',
  statement:
    'Clause 9.4 automatically renews the supply agreement for a further 12 months unless written termination notice is served at least 60 days before expiry.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Documented in Clause 9 contract artifact.',
};

export const FACT_FIN_GOVERNANCE_CONTROL_DEFICIT: ScenarioFact = {
  id: 'FACT_FIN_GOVERNANCE_CONTROL_DEFICIT',
  incidentId: 'INC_FIN_DIESEL',
  category: 'REGULATORY',
  statement:
    'Mustarred lacked an enforced internal control requiring mandatory legal pre-signature review for long-term commercial commitments.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Highlighted in CHOICE_FIN_ABSORB operational explanation and learning feedback.',
};

export const FACT_FIN_SUPPLIER_RENEGOTIATION_RESPONSE: ScenarioFact = {
  id: 'FACT_FIN_SUPPLIER_RENEGOTIATION_RESPONSE',
  incidentId: 'INC_FIN_DIESEL',
  category: 'FINANCIAL_IMPACT',
  statement:
    'Rainoil Energy Services\' willingness to adjust unit pricing or waive the exit penalty is unknown prior to entering negotiations.',
  objectiveTruth: false,
  certainty: 'UNKNOWN',
  source: 'SCENARIO_SPEC',
  notes: 'Tradeoff unknown: vendor may drop clause but maintain unit price.',
};

export const FACT_FIN_COMPETITOR_DELIVERY_STABILITY: ScenarioFact = {
  id: 'FACT_FIN_COMPETITOR_DELIVERY_STABILITY',
  incidentId: 'INC_FIN_DIESEL',
  category: 'TECHNICAL_INFRASTRUCTURE',
  statement:
    'Whether the cheaper competitor can ensure continuous diesel delivery during immediate vendor switchover is not independently verified.',
  objectiveTruth: true,
  certainty: 'SUSPECTED',
  source: 'SCENARIO_SPEC',
  notes: 'Reflected in CHOICE_FIN_EXIT risk of temporary generator operations during switchover.',
};

export const ALL_FIN_DIESEL_FACTS: readonly ScenarioFact[] = [
  FACT_FIN_CONTRACT_SIGNED,
  FACT_FIN_MARKET_PRICE_DROP,
  FACT_FIN_MD_COST_CUT_MANDATE,
  FACT_FIN_LEGAL_NEVER_REVIEWED,
  FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY,
  FACT_FIN_CLAUSE_9_4_AUTO_RENEWAL,
  FACT_FIN_GOVERNANCE_CONTROL_DEFICIT,
  FACT_FIN_SUPPLIER_RENEGOTIATION_RESPONSE,
  FACT_FIN_COMPETITOR_DELIVERY_STABILITY,
];

// ============================================================================
// 2. TIMELINE EVENTS
// ============================================================================

export const FIN_DIESEL_TIMELINE: readonly IncidentTimelineEvent[] = [
  {
    time: '14 October',
    description:
      'Finance Manager Chinedu Eze executes a 24-month exclusive Diesel Supply Agreement at Rainoil Energy Services\' office without legal review.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
  {
    time: '21 October',
    description:
      'Executed and stamped agreement reaches Company Secretary Funmi Adeyemi\'s desk a week after execution.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
  {
    time: 'Recent Weeks',
    description:
      'Market diesel prices drop; competing vendor submits quote 20% cheaper than the contracted rate.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
  {
    time: 'Turn 3 Monday',
    description:
      'MD Folake Adebayo demands quarterly cost reductions; Chinedu photocopies Clause 9 revealing the 40% termination penalty and auto-renewal term.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
];

// ============================================================================
// 3. EVIDENCE ITEMS
// ============================================================================

export const EV_FIN_STARTING_BRIEF: EvidenceItem = {
  id: 'EV_FIN_STARTING_BRIEF',
  incidentId: 'INC_FIN_DIESEL',
  title: 'Diesel Contract Summary — Finance Office',
  description:
    'Chinedu Eze outlines the 24-month contract, the 20% cheaper alternative quote, and the MD\'s quarterly cost-cutting directive.',
  discoveryRequirement: 'STARTING_CONTEXT',
  revealedFactIds: [
    'FACT_FIN_CONTRACT_SIGNED',
    'FACT_FIN_MARKET_PRICE_DROP',
    'FACT_FIN_MD_COST_CUT_MANDATE',
  ],
};

export const EV_FIN_CLAUSE_9_ARTIFACT: EvidenceItem = {
  id: 'EV_FIN_CLAUSE_9_ARTIFACT',
  incidentId: 'INC_FIN_DIESEL',
  title: 'Diesel Supply Agreement — Clause 9',
  description:
    'Photocopy of Clause 9 showing 9.3 (40% remaining contract value penalty for early termination) and 9.4 (12-month auto-renewal with 60 days notice).',
  discoveryRequirement: 'READ_INCIDENT_ARTIFACT',
  revealedFactIds: [
    'FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY',
    'FACT_FIN_CLAUSE_9_4_AUTO_RENEWAL',
  ],
  technicalDetails: {
    vendor: 'Rainoil Energy Services',
    customer: 'Mustarred Ltd',
    term: '24 months (signed 14 October)',
    clause_9_3: 'Early termination requires 40% payment of remaining monthly value',
    clause_9_4: 'Automatic 12-month renewal unless 60 days written notice given',
  },
};

export const EV_FIN_LEGAL_BYPASS_STATEMENT: EvidenceItem = {
  id: 'EV_FIN_LEGAL_BYPASS_STATEMENT',
  incidentId: 'INC_FIN_DIESEL',
  title: 'Funmi Adeyemi Pre-Execution Statement',
  description:
    'Company Secretary Funmi Adeyemi confirms on speaker that she never saw the agreement before signature and highlights the lack of pre-signature legal review controls.',
  discoveryRequirement: 'ASK_INCIDENT_INTERVIEW',
  revealedFactIds: [
    'FACT_FIN_LEGAL_NEVER_REVIEWED',
    'FACT_FIN_GOVERNANCE_CONTROL_DEFICIT',
  ],
};

export const EV_FIN_RESOLUTION_OUTCOME: EvidenceItem = {
  id: 'EV_FIN_RESOLUTION_OUTCOME',
  incidentId: 'INC_FIN_DIESEL',
  title: 'Procurement Resolution & Governance Outcome',
  description:
    'Post-decision aftermath recording renegotiation results, penalty payouts, or procurement control reforms.',
  discoveryRequirement: 'OUTCOME_DEBRIEF',
  revealedFactIds: [],
};

export const ALL_FIN_DIESEL_EVIDENCE: readonly EvidenceItem[] = [
  EV_FIN_STARTING_BRIEF,
  EV_FIN_CLAUSE_9_ARTIFACT,
  EV_FIN_LEGAL_BYPASS_STATEMENT,
  EV_FIN_RESOLUTION_OUTCOME,
];

// ============================================================================
// 4. EPISTEMIC PERSPECTIVES
// ============================================================================

export const FIN_DIESEL_EPISTEMIC_PERSPECTIVE = {
  objectiveScenarioTruth: [
    'FACT_FIN_CONTRACT_SIGNED',
    'FACT_FIN_MARKET_PRICE_DROP',
    'FACT_FIN_MD_COST_CUT_MANDATE',
    'FACT_FIN_LEGAL_NEVER_REVIEWED',
    'FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY',
    'FACT_FIN_CLAUSE_9_4_AUTO_RENEWAL',
    'FACT_FIN_GOVERNANCE_CONTROL_DEFICIT',
  ],
  candidateInitialKnowledge: [
    'FACT_FIN_CONTRACT_SIGNED',
    'FACT_FIN_MARKET_PRICE_DROP',
    'FACT_FIN_MD_COST_CUT_MANDATE',
  ],
  unverifiedHypotheses: [
    'FACT_FIN_SUPPLIER_RENEGOTIATION_RESPONSE',
    'FACT_FIN_COMPETITOR_DELIVERY_STABILITY',
  ],
  departmentHeadInitialKnowledge: [
    'FACT_FIN_CONTRACT_SIGNED',
    'FACT_FIN_MARKET_PRICE_DROP',
    'FACT_FIN_MD_COST_CUT_MANDATE',
    'FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY',
    'FACT_FIN_CLAUSE_9_4_AUTO_RENEWAL',
  ],
} as const;

// ============================================================================
// 5. AGGREGATED INCIDENT KNOWLEDGE PACKAGE
// ============================================================================

export const FIN_DIESEL_KNOWLEDGE_PACKAGE: IncidentKnowledgePackage = {
  incidentId: 'INC_FIN_DIESEL',
  title: 'The diesel contract nobody read',
  department: 'FINANCE',
  timeline: FIN_DIESEL_TIMELINE,
  facts: ALL_FIN_DIESEL_FACTS,
  evidence: ALL_FIN_DIESEL_EVIDENCE,
  epistemicPerspective: FIN_DIESEL_EPISTEMIC_PERSPECTIVE,
  regulatoryReferences: [
    REG_FIN_VENDOR_SIGNING_AUTHORITY,
    REG_COMMERCIAL_TERMINATION_PENALTY,
  ],
};
