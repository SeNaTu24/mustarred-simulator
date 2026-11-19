/**
 * Mustarred Company Simulator - Legal Client Breach Incident Knowledge Package
 *
 * Grounded strictly in the active SCENARIO_MONDAY_MORNING (INC_LEGAL_CLIENT),
 * Greenspring Foods client communication, and Nigerian data protection principles.
 *
 * Implements:
 * 1. Incident facts with explicit certainty classification (CONFIRMED, REPORTED, SUSPECTED, UNKNOWN)
 * 2. Chronological incident timeline events
 * 3. Evidence items and their discovery requirements
 * 4. Epistemic perspectives separating objective truth, character knowledge, and unverified hypotheses
 * 5. Associated regulatory assertions and verification status
 */

import {
  REG_LEGAL_CUSTOMER_BREACH_NOTICE,
  REG_LEGAL_NDPA_72H_CLIENT_CLOCK,
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

export const FACT_LEGAL_CLIENT_NOTIFICATION: ScenarioFact = {
  id: 'FACT_LEGAL_CLIENT_NOTIFICATION',
  incidentId: 'INC_LEGAL_CLIENT',
  category: 'COMMUNICATION',
  statement:
    'Greenspring Foods was notified this morning by its card processor that a staff account was compromised and customer card details may have been accessed.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Confirmed in turn 4 premise and client email artifact.',
};

export const FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED: ScenarioFact = {
  id: 'FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED',
  incidentId: 'INC_LEGAL_CLIENT',
  category: 'TECHNICAL_INFRASTRUCTURE',
  statement:
    'The third-party payment processor claims the credential compromise is contained and that a comprehensive incident report will follow.',
  objectiveTruth: true,
  certainty: 'REPORTED',
  source: 'SCENARIO_SPEC',
  notes: 'Reported by processor to client MD Ifeoma Balogun; independent technical verification pending.',
};

export const FACT_LEGAL_CUSTOMER_VOLUME: ScenarioFact = {
  id: 'FACT_LEGAL_CUSTOMER_VOLUME',
  incidentId: 'INC_LEGAL_CLIENT',
  category: 'REGULATORY',
  statement:
    'The payment processor estimates approximately 4,000 customer payment card records were stored in the compromised system.',
  objectiveTruth: true,
  certainty: 'REPORTED',
  source: 'SCENARIO_SPEC',
  notes: 'Reported by processor and confirmed by Ifeoma Balogun during consultation.',
};

export const FACT_LEGAL_BOARD_MEETING_TIME: ScenarioFact = {
  id: 'FACT_LEGAL_BOARD_MEETING_TIME',
  incidentId: 'INC_LEGAL_CLIENT',
  category: 'COMMUNICATION',
  statement:
    'The Greenspring Foods Board of Directors is convening an emergency meeting at 2:00 PM today to decide their corporate response.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Stated by client MD Ifeoma Balogun in opening line and email artifact.',
};

export const FACT_LEGAL_CUSTOMERS_INQUIRING: ScenarioFact = {
  id: 'FACT_LEGAL_CUSTOMERS_INQUIRING',
  incidentId: 'INC_LEGAL_CLIENT',
  category: 'COMMUNICATION',
  statement:
    'Greenspring Foods customers have already begun calling company offices asking about account security and unauthorized transactions.',
  objectiveTruth: true,
  certainty: 'REPORTED',
  source: 'SCENARIO_SPEC',
  notes: 'Reported by Ifeoma Balogun in urgent communication.',
};

export const FACT_LEGAL_72H_CLOCK_STARTED: ScenarioFact = {
  id: 'FACT_LEGAL_72H_CLOCK_STARTED',
  incidentId: 'INC_LEGAL_CLIENT',
  category: 'REGULATORY',
  statement:
    'The statutory 72-hour regulatory notification clock commenced when the processor informed Greenspring Foods, not when the processor\'s complete forensic report arrives.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Core legal principle asserted in CHOICE_LEGAL_NOTIFY executive rationale and learning feedback.',
};

export const FACT_LEGAL_CONTROLLER_LIABILITY: ScenarioFact = {
  id: 'FACT_LEGAL_CONTROLLER_LIABILITY',
  incidentId: 'INC_LEGAL_CLIENT',
  category: 'REGULATORY',
  statement:
    'Greenspring Foods is the statutory data controller and remains legally accountable to regulators and affected data subjects, regardless of processor fault.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Established in turn 4 business context.',
};

export const FACT_LEGAL_AFFECTED_CUSTOMER_LIST_ABSENT: ScenarioFact = {
  id: 'FACT_LEGAL_AFFECTED_CUSTOMER_LIST_ABSENT',
  incidentId: 'INC_LEGAL_CLIENT',
  category: 'CREDENTIAL_STATUS',
  statement:
    'The processor has not yet delivered a specific list of individual names or card numbers affected by the credential compromise.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Confirmed by Ifeoma Balogun during follow-up consultation.',
};

export const FACT_LEGAL_CARD_DATA_EXFILTRATION_EXTENT: ScenarioFact = {
  id: 'FACT_LEGAL_CARD_DATA_EXFILTRATION_EXTENT',
  incidentId: 'INC_LEGAL_CLIENT',
  category: 'CREDENTIAL_STATUS',
  statement:
    'Whether CVV security codes and full primary account numbers (PANs) were copied versus masked transaction records is not yet verified.',
  objectiveTruth: false,
  certainty: 'UNKNOWN',
  source: 'SCENARIO_SPEC',
  notes: 'Technical detail pending processor\'s detailed forensic report.',
};

export const FACT_LEGAL_REGULATORY_LATE_FILING_FINDING: ScenarioFact = {
  id: 'FACT_LEGAL_REGULATORY_LATE_FILING_FINDING',
  incidentId: 'INC_LEGAL_CLIENT',
  category: 'REGULATORY',
  statement:
    'Waiting until day four for the processor\'s report risks exceeding statutory notification deadlines and incurring an adverse late-filing finding.',
  objectiveTruth: true,
  certainty: 'SUSPECTED',
  source: 'SCENARIO_SPEC',
  notes: 'Identified in CHOICE_LEGAL_WAIT operational explanation and learning feedback.',
};

export const ALL_LEGAL_CLIENT_FACTS: readonly ScenarioFact[] = [
  FACT_LEGAL_CLIENT_NOTIFICATION,
  FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED,
  FACT_LEGAL_CUSTOMER_VOLUME,
  FACT_LEGAL_BOARD_MEETING_TIME,
  FACT_LEGAL_CUSTOMERS_INQUIRING,
  FACT_LEGAL_72H_CLOCK_STARTED,
  FACT_LEGAL_CONTROLLER_LIABILITY,
  FACT_LEGAL_AFFECTED_CUSTOMER_LIST_ABSENT,
  FACT_LEGAL_CARD_DATA_EXFILTRATION_EXTENT,
  FACT_LEGAL_REGULATORY_LATE_FILING_FINDING,
];

// ============================================================================
// 2. TIMELINE EVENTS
// ============================================================================

export const LEGAL_CLIENT_TIMELINE: readonly IncidentTimelineEvent[] = [
  {
    time: 'Earlier this morning',
    description:
      'Card processor detects compromised staff account; alerts Greenspring Foods that ~4,000 card records were exposed and claims containment.',
    source: 'SCENARIO_SPEC',
    certainty: 'REPORTED',
  },
  {
    time: '~10:00 AM',
    description:
      'Greenspring Foods customers begin calling company offices asking about account security and transaction inquiries.',
    source: 'SCENARIO_SPEC',
    certainty: 'REPORTED',
  },
  {
    time: '10:20 AM',
    description:
      'Greenspring MD Ifeoma Balogun emails Amaka Obi requesting urgent legal and regulatory counsel ahead of the board meeting.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
  {
    time: '10:30 AM',
    description:
      'Funmi Adeyemi and Amaka Obi evaluate client exposure and statutory notification obligations under the 72-hour regulatory rule.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
  {
    time: '02:00 PM (Scheduled)',
    description:
      'Greenspring Foods Board of Directors convenes to determine corporate and customer communication response.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
];

// ============================================================================
// 3. EVIDENCE ITEMS
// ============================================================================

export const EV_LEGAL_STARTING_BRIEF: EvidenceItem = {
  id: 'EV_LEGAL_STARTING_BRIEF',
  incidentId: 'INC_LEGAL_CLIENT',
  title: 'Client Crisis Briefing — Greenspring Foods',
  description:
    'Briefing on the third-party processor compromise, the 4,000 affected customers, the 2:00 PM board meeting, and Greenspring\'s non-delegable controller liability.',
  discoveryRequirement: 'STARTING_CONTEXT',
  revealedFactIds: [
    'FACT_LEGAL_CLIENT_NOTIFICATION',
    'FACT_LEGAL_BOARD_MEETING_TIME',
    'FACT_LEGAL_CONTROLLER_LIABILITY',
  ],
};

export const EV_LEGAL_CLIENT_EMAIL: EvidenceItem = {
  id: 'EV_LEGAL_CLIENT_EMAIL',
  incidentId: 'INC_LEGAL_CLIENT',
  title: 'Urgent Client Email — Ifeoma Balogun',
  description:
    'Email received at 10:20 AM from Ifeoma Balogun detailing processor claims of containment, customer inquiries, and seeking guidance on statutory duties.',
  discoveryRequirement: 'READ_INCIDENT_ARTIFACT',
  revealedFactIds: [
    'FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED',
    'FACT_LEGAL_CUSTOMERS_INQUIRING',
  ],
  technicalDetails: {
    sender: 'Ifeoma Balogun, MD (Greenspring Foods)',
    recipient: 'Amaka Obi (Chief Compliance Officer)',
    timestamp: '10:20 AM',
    subject: 'Greenspring Foods — urgent',
  },
};

export const EV_LEGAL_PROCESSOR_ALERT: EvidenceItem = {
  id: 'EV_LEGAL_PROCESSOR_ALERT',
  incidentId: 'INC_LEGAL_CLIENT',
  title: 'Processor Scope & Customer Volume',
  description:
    'Ifeoma Balogun confirms that ~4,000 customer records were in scope, no itemized customer list has been provided, and the 72-hour regulatory clock is running.',
  discoveryRequirement: 'ASK_INCIDENT_INTERVIEW',
  revealedFactIds: [
    'FACT_LEGAL_CUSTOMER_VOLUME',
    'FACT_LEGAL_AFFECTED_CUSTOMER_LIST_ABSENT',
    'FACT_LEGAL_72H_CLOCK_STARTED',
  ],
};

export const EV_LEGAL_RESOLUTION_OUTCOME: EvidenceItem = {
  id: 'EV_LEGAL_RESOLUTION_OUTCOME',
  incidentId: 'INC_LEGAL_CLIENT',
  title: 'Client Advice & Regulatory Debrief',
  description:
    'Post-decision aftermath recording client filing timeliness, customer communication efficacy, and regulatory posture.',
  discoveryRequirement: 'OUTCOME_DEBRIEF',
  revealedFactIds: [],
};

export const ALL_LEGAL_CLIENT_EVIDENCE: readonly EvidenceItem[] = [
  EV_LEGAL_STARTING_BRIEF,
  EV_LEGAL_CLIENT_EMAIL,
  EV_LEGAL_PROCESSOR_ALERT,
  EV_LEGAL_RESOLUTION_OUTCOME,
];

// ============================================================================
// 4. EPISTEMIC PERSPECTIVES
// ============================================================================

export const LEGAL_CLIENT_EPISTEMIC_PERSPECTIVE = {
  objectiveScenarioTruth: [
    'FACT_LEGAL_CLIENT_NOTIFICATION',
    'FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED',
    'FACT_LEGAL_CUSTOMER_VOLUME',
    'FACT_LEGAL_BOARD_MEETING_TIME',
    'FACT_LEGAL_CUSTOMERS_INQUIRING',
    'FACT_LEGAL_72H_CLOCK_STARTED',
    'FACT_LEGAL_CONTROLLER_LIABILITY',
    'FACT_LEGAL_AFFECTED_CUSTOMER_LIST_ABSENT',
  ],
  candidateInitialKnowledge: [
    'FACT_LEGAL_CLIENT_NOTIFICATION',
    'FACT_LEGAL_BOARD_MEETING_TIME',
    'FACT_LEGAL_CONTROLLER_LIABILITY',
  ],
  unverifiedHypotheses: [
    'FACT_LEGAL_CARD_DATA_EXFILTRATION_EXTENT',
    'FACT_LEGAL_REGULATORY_LATE_FILING_FINDING',
  ],
  departmentHeadInitialKnowledge: [
    'FACT_LEGAL_CLIENT_NOTIFICATION',
    'FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED',
    'FACT_LEGAL_CUSTOMER_VOLUME',
    'FACT_LEGAL_BOARD_MEETING_TIME',
    'FACT_LEGAL_CUSTOMERS_INQUIRING',
    'FACT_LEGAL_72H_CLOCK_STARTED',
    'FACT_LEGAL_CONTROLLER_LIABILITY',
    'FACT_LEGAL_AFFECTED_CUSTOMER_LIST_ABSENT',
  ],
} as const;

// ============================================================================
// 5. AGGREGATED INCIDENT KNOWLEDGE PACKAGE
// ============================================================================

export const LEGAL_CLIENT_KNOWLEDGE_PACKAGE: IncidentKnowledgePackage = {
  incidentId: 'INC_LEGAL_CLIENT',
  title: 'Your client\'s payment processor has been breached',
  department: 'LEGAL',
  timeline: LEGAL_CLIENT_TIMELINE,
  facts: ALL_LEGAL_CLIENT_FACTS,
  evidence: ALL_LEGAL_CLIENT_EVIDENCE,
  epistemicPerspective: LEGAL_CLIENT_EPISTEMIC_PERSPECTIVE,
  regulatoryReferences: [
    REG_LEGAL_NDPA_72H_CLIENT_CLOCK,
    REG_LEGAL_CUSTOMER_BREACH_NOTICE,
  ],
};
