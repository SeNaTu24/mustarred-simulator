/**
 * Mustarred Company Simulator - HR Workplace Assault Incident Knowledge Package
 *
 * Grounded strictly in the active SCENARIO_MONDAY_MORNING (INC_HR_DISPUTE),
 * staff registry (src/ui/staff.ts), and employee handbook disciplinary rules.
 *
 * Implements:
 * 1. Incident facts with explicit certainty classification (CONFIRMED, REPORTED, SUSPECTED, UNKNOWN)
 * 2. Chronological incident timeline events
 * 3. Evidence items and their discovery requirements
 * 4. Epistemic perspectives separating objective truth, character knowledge, and unverified hypotheses
 * 5. Associated regulatory assertions and verification status
 */

import {
  REG_HR_HANDBOOK_DISCIPLINARY,
  REG_LABOUR_FAIR_HEARING,
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

export const FACT_HR_DISPUTE_PREMISE: ScenarioFact = {
  id: 'FACT_HR_DISPUTE_PREMISE',
  incidentId: 'INC_HR_DISPUTE',
  category: 'PERSONNEL',
  statement:
    'Supervisor Musa slapped office assistant Blessing Etim over a missing dispatch bag in the workplace.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Confirmed in turn 2 premise and initial briefing.',
};

export const FACT_HR_WITNESSES_PRESENT: ScenarioFact = {
  id: 'FACT_HR_WITNESSES_PRESENT',
  incidentId: 'INC_HR_DISPUTE',
  category: 'PERSONNEL',
  statement:
    'Chidi from dispatch saw the altercation directly, the cleaner was present in the room, and the gate man heard shouting from the area.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Corroborated by Blessing Etim in her written statement and follow-up consultation.',
};

export const FACT_HR_BLESSING_STATEMENT_TAKEN: ScenarioFact = {
  id: 'FACT_HR_BLESSING_STATEMENT_TAKEN',
  incidentId: 'INC_HR_DISPUTE',
  category: 'COMMUNICATION',
  statement:
    'Head of People Ngozi Okafor took a signed written statement from Blessing Etim at 10:05 AM in the People Office.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Documented in turn 2 artifact metadata.',
};

export const FACT_HR_DISPATCH_BAG_CLAIM: ScenarioFact = {
  id: 'FACT_HR_DISPATCH_BAG_CLAIM',
  incidentId: 'INC_HR_DISPUTE',
  category: 'PERSONNEL',
  statement:
    'Blessing stated she had already handed the dispatch bag to the dispatch rider before Musa came to her desk shouting.',
  objectiveTruth: true,
  certainty: 'REPORTED',
  source: 'SCENARIO_SPEC',
  notes: 'Reported in Blessing\'s written statement; rider verification pending.',
};

export const FACT_HR_POLICE_REPORT_THREAT: ScenarioFact = {
  id: 'FACT_HR_POLICE_REPORT_THREAT',
  incidentId: 'INC_HR_DISPUTE',
  category: 'REGULATORY',
  statement:
    'Blessing reported that her brother intends to report the physical assault to the Nigerian Police.',
  objectiveTruth: true,
  certainty: 'REPORTED',
  source: 'SCENARIO_SPEC',
  notes: 'Reported verbally by Blessing during consultation with leadership.',
};

export const FACT_HR_HANDBOOK_MANDATES_PANEL: ScenarioFact = {
  id: 'FACT_HR_HANDBOOK_MANDATES_PANEL',
  incidentId: 'INC_HR_DISPUTE',
  category: 'REGULATORY',
  statement:
    'The Mustarred Employee Handbook requires a formal written disciplinary panel and fair hearing with statements from both sides and two witnesses before any punitive sanction is applied.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Established in turn 2 business context and executive rationale.',
};

export const FACT_HR_FLOOR_SCRUTINY: ScenarioFact = {
  id: 'FACT_HR_FLOOR_SCRUTINY',
  incidentId: 'INC_HR_DISPUTE',
  category: 'PERSONNEL',
  statement:
    'The office floor is closely watching how company leadership handles physical violence between a supervisor and a junior staff member.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Stated in turn 2 business context.',
};

export const FACT_HR_MUSA_STATEMENT_STATUS: ScenarioFact = {
  id: 'FACT_HR_MUSA_STATEMENT_STATUS',
  incidentId: 'INC_HR_DISPUTE',
  category: 'PERSONNEL',
  statement:
    'Musa has not yet provided formal written testimony prior to convening the disciplinary panel.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Confirmed by Ngozi Okafor having only Blessing\'s statement at incident start.',
};

export const FACT_HR_MUSA_INTENT_OR_DEFENSE: ScenarioFact = {
  id: 'FACT_HR_MUSA_INTENT_OR_DEFENSE',
  incidentId: 'INC_HR_DISPUTE',
  category: 'PERSONNEL',
  statement:
    'Musa\'s specific factual defense or justification for the confrontation is not yet established.',
  objectiveTruth: false,
  certainty: 'UNKNOWN',
  source: 'SCENARIO_SPEC',
  notes: 'Unverified until Musa presents evidence before the panel.',
};

export const FACT_HR_STAFF_PETITION_RISK: ScenarioFact = {
  id: 'FACT_HR_STAFF_PETITION_RISK',
  incidentId: 'INC_HR_DISPUTE',
  category: 'PERSONNEL',
  statement:
    'Settling informally without a written record risks staff viewing the company as shielding an abusive supervisor, leading to collective grievance petitions.',
  objectiveTruth: true,
  certainty: 'SUSPECTED',
  source: 'SCENARIO_SPEC',
  notes: 'Identified in tradeoff summary and delayed consequence EFF_STAFF_PETITION.',
};

export const FACT_HR_SUMMARY_DISMISSAL_UNION_CHALLENGE: ScenarioFact = {
  id: 'FACT_HR_SUMMARY_DISMISSAL_UNION_CHALLENGE',
  incidentId: 'INC_HR_DISPUTE',
  category: 'REGULATORY',
  statement:
    'Dismissing Musa without adhering to handbook procedural steps exposes the company to an unfair dismissal challenge by the trade union representative.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Confirmed in CHOICE_HR_DISMISS operational explanation.',
};

export const ALL_HR_DISPUTE_FACTS: readonly ScenarioFact[] = [
  FACT_HR_DISPUTE_PREMISE,
  FACT_HR_WITNESSES_PRESENT,
  FACT_HR_BLESSING_STATEMENT_TAKEN,
  FACT_HR_DISPATCH_BAG_CLAIM,
  FACT_HR_POLICE_REPORT_THREAT,
  FACT_HR_HANDBOOK_MANDATES_PANEL,
  FACT_HR_FLOOR_SCRUTINY,
  FACT_HR_MUSA_STATEMENT_STATUS,
  FACT_HR_MUSA_INTENT_OR_DEFENSE,
  FACT_HR_STAFF_PETITION_RISK,
  FACT_HR_SUMMARY_DISMISSAL_UNION_CHALLENGE,
];

// ============================================================================
// 2. TIMELINE EVENTS
// ============================================================================

export const HR_DISPUTE_TIMELINE: readonly IncidentTimelineEvent[] = [
  {
    time: '~09:30 AM',
    description:
      'Musa confronts Blessing at her desk demanding a missing dispatch bag; Blessing states she already handed it to the dispatch rider.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
  {
    time: '~09:35 AM',
    description:
      'Musa slaps Blessing on her left cheek in front of Chidi from dispatch and the cleaner; the gate man hears shouting from the area.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
  {
    time: '~09:50 AM',
    description:
      'Blessing reports the physical assault to Head of People Ngozi Okafor; mentions her brother wants to report it to the police.',
    source: 'SCENARIO_SPEC',
    certainty: 'REPORTED',
  },
  {
    time: '10:05 AM',
    description:
      'Ngozi Okafor takes a written statement from Blessing in the People Office and reviews the Employee Handbook disciplinary procedure.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
];

// ============================================================================
// 3. EVIDENCE ITEMS
// ============================================================================

export const EV_HR_STARTING_BRIEF: EvidenceItem = {
  id: 'EV_HR_STARTING_BRIEF',
  incidentId: 'INC_HR_DISPUTE',
  title: 'Dispute Briefing — People Office',
  description:
    'Ngozi Okafor briefs leadership on the physical altercation between Musa and Blessing and reviews the Employee Handbook panel requirement.',
  discoveryRequirement: 'STARTING_CONTEXT',
  revealedFactIds: [
    'FACT_HR_DISPUTE_PREMISE',
    'FACT_HR_HANDBOOK_MANDATES_PANEL',
    'FACT_HR_FLOOR_SCRUTINY',
  ],
};

export const EV_HR_BLESSING_STATEMENT: EvidenceItem = {
  id: 'EV_HR_BLESSING_STATEMENT',
  incidentId: 'INC_HR_DISPUTE',
  title: 'Written Statement — Blessing Etim',
  description:
    'Signed written statement taken by Ngozi Okafor detailing Musa\'s verbal shouting, the physical slap on the left cheek, and witnesses present.',
  discoveryRequirement: 'READ_INCIDENT_ARTIFACT',
  revealedFactIds: [
    'FACT_HR_BLESSING_STATEMENT_TAKEN',
    'FACT_HR_DISPATCH_BAG_CLAIM',
  ],
  technicalDetails: {
    officer: 'Ngozi Okafor (Head of People)',
    timestamp: '10:05 AM',
    complainant: 'Blessing Etim (Office Assistant)',
    accused: 'Musa (Supervisor)',
    witnesses: 'Chidi (Dispatch), Cleaner',
  },
};

export const EV_HR_WITNESS_INTERVIEW_CHIDI: EvidenceItem = {
  id: 'EV_HR_WITNESS_INTERVIEW_CHIDI',
  incidentId: 'INC_HR_DISPUTE',
  title: 'Witness Corroboration & Police Warning',
  description:
    'Blessing confirms that Chidi from dispatch saw the whole thing and the gate man heard shouting, while reiterating her brother\'s intention to contact the police.',
  discoveryRequirement: 'ASK_INCIDENT_INTERVIEW',
  revealedFactIds: [
    'FACT_HR_WITNESSES_PRESENT',
    'FACT_HR_POLICE_REPORT_THREAT',
  ],
};

export const EV_HR_RESOLUTION_OUTCOME: EvidenceItem = {
  id: 'EV_HR_RESOLUTION_OUTCOME',
  incidentId: 'INC_HR_DISPUTE',
  title: 'Disciplinary Action & Floor Outcome',
  description:
    'Post-decision aftermath recording immediate operational adjustments, shift reallocations, and staff reactions.',
  discoveryRequirement: 'OUTCOME_DEBRIEF',
  revealedFactIds: [],
};

export const ALL_HR_DISPUTE_EVIDENCE: readonly EvidenceItem[] = [
  EV_HR_STARTING_BRIEF,
  EV_HR_BLESSING_STATEMENT,
  EV_HR_WITNESS_INTERVIEW_CHIDI,
  EV_HR_RESOLUTION_OUTCOME,
];

// ============================================================================
// 4. EPISTEMIC PERSPECTIVES
// ============================================================================

export const HR_DISPUTE_EPISTEMIC_PERSPECTIVE = {
  objectiveScenarioTruth: [
    'FACT_HR_DISPUTE_PREMISE',
    'FACT_HR_WITNESSES_PRESENT',
    'FACT_HR_BLESSING_STATEMENT_TAKEN',
    'FACT_HR_DISPATCH_BAG_CLAIM',
    'FACT_HR_POLICE_REPORT_THREAT',
    'FACT_HR_HANDBOOK_MANDATES_PANEL',
    'FACT_HR_FLOOR_SCRUTINY',
    'FACT_HR_MUSA_STATEMENT_STATUS',
    'FACT_HR_SUMMARY_DISMISSAL_UNION_CHALLENGE',
  ],
  candidateInitialKnowledge: [
    'FACT_HR_DISPUTE_PREMISE',
    'FACT_HR_HANDBOOK_MANDATES_PANEL',
    'FACT_HR_FLOOR_SCRUTINY',
  ],
  unverifiedHypotheses: [
    'FACT_HR_MUSA_INTENT_OR_DEFENSE',
    'FACT_HR_STAFF_PETITION_RISK',
  ],
  departmentHeadInitialKnowledge: [
    'FACT_HR_DISPUTE_PREMISE',
    'FACT_HR_BLESSING_STATEMENT_TAKEN',
    'FACT_HR_DISPATCH_BAG_CLAIM',
    'FACT_HR_WITNESSES_PRESENT',
    'FACT_HR_POLICE_REPORT_THREAT',
    'FACT_HR_HANDBOOK_MANDATES_PANEL',
    'FACT_HR_FLOOR_SCRUTINY',
    'FACT_HR_MUSA_STATEMENT_STATUS',
  ],
} as const;

// ============================================================================
// 5. AGGREGATED INCIDENT KNOWLEDGE PACKAGE
// ============================================================================

export const HR_DISPUTE_KNOWLEDGE_PACKAGE: IncidentKnowledgePackage = {
  incidentId: 'INC_HR_DISPUTE',
  title: 'A supervisor slapped the office assistant',
  department: 'HR',
  timeline: HR_DISPUTE_TIMELINE,
  facts: ALL_HR_DISPUTE_FACTS,
  evidence: ALL_HR_DISPUTE_EVIDENCE,
  epistemicPerspective: HR_DISPUTE_EPISTEMIC_PERSPECTIVE,
  regulatoryReferences: [
    REG_HR_HANDBOOK_DISCIPLINARY,
    REG_LABOUR_FAIR_HEARING,
  ],
};
