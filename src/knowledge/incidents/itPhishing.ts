/**
 * Mustarred Company Simulator - IT Phishing Incident Knowledge Package
 *
 * Grounded strictly in the active SCENARIO_MONDAY_MORNING (INC_MAIL_FIRS),
 * Tunde Bello dialogue system (phishingDialogue.ts), and workstation telemetry (UIManager.ts).
 *
 * Implements:
 * 1. Incident facts with explicit certainty classification (CONFIRMED, REPORTED, SUSPECTED, UNKNOWN)
 * 2. Chronological incident timeline events
 * 3. Evidence items and their discovery requirements
 * 4. Epistemic perspectives separating objective truth, character knowledge, and unverified hypotheses
 * 5. Associated regulatory assertions and verification status
 */

import {
  REG_BLAMELESS_INCIDENT_REPORTING,
  REG_NDPA_72H_NOTIFICATION,
  REG_NDPA_BREACH_REGISTER,
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

export const FACT_IT_EMAIL_ARRIVED: ScenarioFact = {
  id: 'FACT_IT_EMAIL_ARRIVED',
  incidentId: 'INC_MAIL_FIRS',
  category: 'COMMUNICATION',
  statement:
    'A tax clearance email with subject "FIRS Tax Clearance — action required" arrived at 08:52 AM copying 11 staff in Accounts and Operations.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Confirmed in SCENARIO_MONDAY_MORNING turn 1 artifact metadata.',
};

export const FACT_IT_ELEVEN_RECIPIENTS: ScenarioFact = {
  id: 'FACT_IT_ELEVEN_RECIPIENTS',
  incidentId: 'INC_MAIL_FIRS',
  category: 'COMMUNICATION',
  statement:
    'Eleven staff members across Accounts and Operations were copied on the phishing email.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Confirmed by email recipient header and Yusuf Ibrahim follow-up statement.',
};

export const FACT_IT_INTERACTION_UNCONFIRMED_AT_START: ScenarioFact = {
  id: 'FACT_IT_INTERACTION_UNCONFIRMED_AT_START',
  incidentId: 'INC_MAIL_FIRS',
  category: 'CREDENTIAL_STATUS',
  statement:
    'At incident arrival, employee interaction with the email link or attachment has not been verified.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Established in incident opening premise and Tunde Bello opening desk briefing.',
};

export const FACT_IT_SENDER_SUSPICIOUS: ScenarioFact = {
  id: 'FACT_IT_SENDER_SUSPICIOUS',
  incidentId: 'INC_MAIL_FIRS',
  category: 'TECHNICAL_INFRASTRUCTURE',
  statement:
    'The sender domain firs-gov.com.ng and the urgent 12 noon deadline match classic phishing pressure tactics.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'DIALOGUE_SPEECH',
  notes: 'Identified by Tunde Bello during opening desk conversation.',
};

export const FACT_IT_WORKSTATION_LOADED: ScenarioFact = {
  id: 'FACT_IT_WORKSTATION_LOADED',
  incidentId: 'INC_MAIL_FIRS',
  category: 'TECHNICAL_INFRASTRUCTURE',
  statement:
    'The suspicious message and raw technical routing headers are loaded on the IT workstation terminal for forensic inspection.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'DIALOGUE_SPEECH',
  notes: 'Stated by Tunde Bello at the IT desk before workstation transition.',
};

export const FACT_IT_SENDER_FORGED: ScenarioFact = {
  id: 'FACT_IT_SENDER_FORGED',
  incidentId: 'INC_MAIL_FIRS',
  category: 'TECHNICAL_INFRASTRUCTURE',
  statement:
    'The domain firs-gov.com.ng was registered 3 days ago, routing via Russian relay 185.220.101.44 with failing SPF and no DKIM signature.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'WORKSTATION_TELEMETRY',
  notes: 'Verified via workstation sender drawer inspection.',
};

export const FACT_IT_LINK_HARVESTS_CREDENTIALS: ScenarioFact = {
  id: 'FACT_IT_LINK_HARVESTS_CREDENTIALS',
  incidentId: 'INC_MAIL_FIRS',
  category: 'TECHNICAL_INFRASTRUCTURE',
  statement:
    'The target URL http://firs-gov.com.ng/portal/tax-clearance is an unencrypted HTTP page posting corporate credentials to /api/collect-credentials.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'WORKSTATION_TELEMETRY',
  notes: 'Verified via workstation link drawer analysis and simulated portal inspection.',
};

export const FACT_IT_FIRS_IMPERSONATION: ScenarioFact = {
  id: 'FACT_IT_FIRS_IMPERSONATION',
  incidentId: 'INC_MAIL_FIRS',
  category: 'COMMUNICATION',
  statement:
    'The message falsely impersonates the Federal Inland Revenue Service (FIRS) to harvest enterprise login credentials.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'SCENARIO_SPEC',
  notes: 'Confirmed by forged domain and fake corporate credential form.',
};

export const FACT_IT_YUSUF_ADMISSION: ScenarioFact = {
  id: 'FACT_IT_YUSUF_ADMISSION',
  incidentId: 'INC_MAIL_FIRS',
  category: 'CREDENTIAL_STATUS',
  statement:
    'Yusuf Ibrahim in Accounts opened the link and entered his corporate password on the external page.',
  objectiveTruth: true,
  certainty: 'REPORTED',
  source: 'DIALOGUE_SPEECH',
  notes:
    'Reported via Finance telephone call following Yusuf\'s verbal admission. Classified as REPORTED rather than CONFIRMED until directory authentication logs or token traces are audited.',
};

export const FACT_IT_AMAKA_INSPECTION_ONLY: ScenarioFact = {
  id: 'FACT_IT_AMAKA_INSPECTION_ONLY',
  incidentId: 'INC_MAIL_FIRS',
  category: 'CREDENTIAL_STATUS',
  statement:
    'Amaka Obi\'s workstation inspection visited the link without entering or submitting any corporate credentials.',
  objectiveTruth: true,
  certainty: 'CONFIRMED',
  source: 'WORKSTATION_TELEMETRY',
  notes: 'Default baseline state when candidate inspects workstation telemetry without submitting credentials.',
};

export const FACT_IT_AMAKA_SUBMITTED_CREDENTIALS: ScenarioFact = {
  id: 'FACT_IT_AMAKA_SUBMITTED_CREDENTIALS',
  incidentId: 'INC_MAIL_FIRS',
  category: 'CREDENTIAL_STATUS',
  statement:
    'Corporate credentials were submitted on the simulated phishing portal from Amaka Obi\'s workstation terminal during testing.',
  objectiveTruth: false,
  certainty: 'SUSPECTED',
  source: 'WORKSTATION_TELEMETRY',
  notes: 'Branch-specific fact; only becomes true if the candidate explicitly enters credentials into the simulation portal.',
};

export const FACT_IT_OTHER_RECIPIENTS_INTERACTED: ScenarioFact = {
  id: 'FACT_IT_OTHER_RECIPIENTS_INTERACTED',
  incidentId: 'INC_MAIL_FIRS',
  category: 'CREDENTIAL_STATUS',
  statement:
    'Whether any of the other 10 recipients in Accounts or Operations interacted with the email or entered credentials.',
  objectiveTruth: false,
  certainty: 'UNKNOWN',
  source: 'SCENARIO_SPEC',
  notes: 'Acknowledged open investigation question; requires comprehensive mailbox and gateway log audit.',
};

export const FACT_IT_PAYMENT_CONSOLE_EXPLOITED: ScenarioFact = {
  id: 'FACT_IT_PAYMENT_CONSOLE_EXPLOITED',
  incidentId: 'INC_MAIL_FIRS',
  category: 'FINANCIAL_IMPACT',
  statement:
    'Whether the adversary has already accessed internal vendor payment consoles using compromised credentials.',
  objectiveTruth: false,
  certainty: 'UNKNOWN',
  source: 'SCENARIO_SPEC',
  notes:
    'At Turn 1, treasury confirms no wire has left company accounts; uncontained exposure allows exploitation by Turn 3.',
};

export const FACT_IT_MALWARE_ON_ENDPOINT: ScenarioFact = {
  id: 'FACT_IT_MALWARE_ON_ENDPOINT',
  incidentId: 'INC_MAIL_FIRS',
  category: 'TECHNICAL_INFRASTRUCTURE',
  statement:
    'Whether visiting the unencrypted external site delivered drive-by malware payloads or persistent session tokens to endpoints.',
  objectiveTruth: false,
  certainty: 'UNKNOWN',
  source: 'SCENARIO_SPEC',
  notes: 'Endpoint scan is recommended, but no malicious binary download has been confirmed.',
};

export const FACT_IT_NDPA_NOTIFICATION_MANDATORY: ScenarioFact = {
  id: 'FACT_IT_NDPA_NOTIFICATION_MANDATORY',
  incidentId: 'INC_MAIL_FIRS',
  category: 'REGULATORY',
  statement:
    'Whether personal data breach notification to the NDPC within 72 hours is legally mandatory for this incident.',
  objectiveTruth: false,
  certainty: 'UNKNOWN',
  source: 'DIALOGUE_SPEECH',
  notes:
    'Requires establishing what information was accessed, assessing risk to affected individuals, and documenting findings. Cannot be concluded solely from technical containment.',
};

export const ALL_IT_PHISHING_FACTS: readonly ScenarioFact[] = [
  FACT_IT_EMAIL_ARRIVED,
  FACT_IT_ELEVEN_RECIPIENTS,
  FACT_IT_INTERACTION_UNCONFIRMED_AT_START,
  FACT_IT_SENDER_SUSPICIOUS,
  FACT_IT_WORKSTATION_LOADED,
  FACT_IT_SENDER_FORGED,
  FACT_IT_LINK_HARVESTS_CREDENTIALS,
  FACT_IT_FIRS_IMPERSONATION,
  FACT_IT_YUSUF_ADMISSION,
  FACT_IT_AMAKA_INSPECTION_ONLY,
  FACT_IT_AMAKA_SUBMITTED_CREDENTIALS,
  FACT_IT_OTHER_RECIPIENTS_INTERACTED,
  FACT_IT_PAYMENT_CONSOLE_EXPLOITED,
  FACT_IT_MALWARE_ON_ENDPOINT,
  FACT_IT_NDPA_NOTIFICATION_MANDATORY,
];

// ============================================================================
// 2. TIMELINE EVENTS
// ============================================================================

export const IT_PHISHING_TIMELINE: readonly IncidentTimelineEvent[] = [
  {
    time: '~3 days ago',
    description: 'Adversary registers fraudulent domain firs-gov.com.ng and configures routing via Russian relay.',
    source: 'WORKSTATION_TELEMETRY',
    certainty: 'CONFIRMED',
  },
  {
    time: '08:52 AM',
    description: 'Phishing email with subject "FIRS Tax Clearance — action required" arrives, copying 11 staff.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
  {
    time: '~09:00 AM',
    description: 'Yusuf Ibrahim opens link from his workstation and enters his corporate password.',
    source: 'DIALOGUE_SPEECH',
    certainty: 'REPORTED',
  },
  {
    time: '~09:10 AM',
    description: 'Finance flags email to IT; Tunde Bello identifies suspicious sender headers and urgency pressure tactic.',
    source: 'DIALOGUE_SPEECH',
    certainty: 'CONFIRMED',
  },
  {
    time: '~09:15 AM',
    description: 'Amaka Obi speaks with Tunde at IT desk; Tunde loads email on workstation terminal for joint triage.',
    source: 'DIALOGUE_SPEECH',
    certainty: 'CONFIRMED',
  },
  {
    time: '~09:20 AM',
    description: 'Workstation inspection confirms Russian relay IP 185.220.101.44, SPF failure, and credential harvesting URL.',
    source: 'WORKSTATION_TELEMETRY',
    certainty: 'CONFIRMED',
  },
  {
    time: '~09:25 AM',
    description: 'Finance calls Tunde with Yusuf\'s admission of link opening and password submission.',
    source: 'DIALOGUE_SPEECH',
    certainty: 'REPORTED',
  },
  {
    time: '~09:40 AM',
    description: 'If contained, Tunde blocks firs-gov.com.ng on perimeter gateway and resets Yusuf\'s Active Directory account.',
    source: 'SCENARIO_SPEC',
    certainty: 'CONFIRMED',
  },
];

// ============================================================================
// 3. EVIDENCE ITEMS & DISCOVERY REQUIREMENTS
// ============================================================================

export const EV_IT_EMAIL_ARTIFACT: EvidenceItem = {
  id: 'EV_IT_EMAIL_ARTIFACT',
  incidentId: 'INC_MAIL_FIRS',
  title: 'FIRS Tax Clearance Phishing Email',
  description:
    'Email message in corporate inbox claiming 2025 tax clearance certificate is ready with an urgent 12 noon deadline.',
  discoveryRequirement: 'STARTING_CONTEXT',
  revealedFactIds: [
    'FACT_IT_EMAIL_ARRIVED',
    'FACT_IT_ELEVEN_RECIPIENTS',
    'FACT_IT_INTERACTION_UNCONFIRMED_AT_START',
  ],
  technicalDetails: {
    from: 'FIRS e-Services <support@firs-gov.com.ng>',
    subject: 'FIRS Tax Clearance — action required',
    recipients: '11 recipients across Accounts and Operations',
    receivedTime: '08:52 AM',
  },
};

export const EV_IT_TUNDE_DESK_BRIEFING: EvidenceItem = {
  id: 'EV_IT_TUNDE_DESK_BRIEFING',
  incidentId: 'INC_MAIL_FIRS',
  title: 'Tunde Bello Initial Desk Briefing',
  description:
    'Tunde notes the sender domain and noon deadline match pressure tactics and invites Amaka to inspect raw headers on the terminal.',
  discoveryRequirement: 'ASK_TUNDE_DESK',
  revealedFactIds: ['FACT_IT_SENDER_SUSPICIOUS', 'FACT_IT_WORKSTATION_LOADED'],
};

export const EV_IT_SENDER_HEADERS: EvidenceItem = {
  id: 'EV_IT_SENDER_HEADERS',
  incidentId: 'INC_MAIL_FIRS',
  title: 'Workstation Technical Routing Headers',
  description:
    'Workstation sender drawer analysis reveals forged sender headers, Russian relay routing, and failed SPF verification.',
  discoveryRequirement: 'INSPECT_EMAIL_HEADER',
  revealedFactIds: ['FACT_IT_SENDER_FORGED', 'FACT_IT_FIRS_IMPERSONATION'],
  technicalDetails: {
    senderDomain: 'firs-gov.com.ng (registered 3 days ago)',
    mailServer: '185.220.101.44 (Russian Federation relay)',
    spfRecord: 'fail (does not match designated FIRS mail servers)',
    dkimSignature: 'none (unsigned message)',
    returnPath: '<bounce@mail-relay-185-220-101-44.ru>',
  },
};

export const EV_IT_LINK_TARGET: EvidenceItem = {
  id: 'EV_IT_LINK_TARGET',
  incidentId: 'INC_MAIL_FIRS',
  title: 'Workstation Link Target Analysis',
  description:
    'Workstation link drawer analysis reveals unencrypted HTTP destination designed to capture corporate credentials.',
  discoveryRequirement: 'INSPECT_LINK_TARGET',
  revealedFactIds: ['FACT_IT_LINK_HARVESTS_CREDENTIALS'],
  technicalDetails: {
    targetUrl: 'http://firs-gov.com.ng/portal/tax-clearance',
    protocol: 'HTTP (unencrypted)',
    formAction: 'POST /api/collect-credentials',
    capturedFields: 'Corporate Email, Corporate Password',
  },
};

export const EV_IT_PORTAL_VISIT: EvidenceItem = {
  id: 'EV_IT_PORTAL_VISIT',
  incidentId: 'INC_MAIL_FIRS',
  title: 'Simulated Portal Visit Telemetry',
  description:
    'Simulated browser renders spoofed FIRS login interface; workstation inspection verifies no credentials were typed from this terminal.',
  discoveryRequirement: 'SIMULATE_PORTAL_VISIT',
  revealedFactIds: ['FACT_IT_LINK_HARVESTS_CREDENTIALS', 'FACT_IT_AMAKA_INSPECTION_ONLY'],
};

export const EV_IT_PORTAL_SUBMISSION: EvidenceItem = {
  id: 'EV_IT_PORTAL_SUBMISSION',
  incidentId: 'INC_MAIL_FIRS',
  title: 'Simulated Portal Credential Submission',
  description:
    'Submitting credentials into the test portal exposes corporate credentials from the testing workstation terminal.',
  discoveryRequirement: 'SUBMIT_PORTAL_CREDENTIALS',
  revealedFactIds: ['FACT_IT_AMAKA_SUBMITTED_CREDENTIALS'],
};

export const EV_IT_FINANCE_CALL: EvidenceItem = {
  id: 'EV_IT_FINANCE_CALL',
  incidentId: 'INC_MAIL_FIRS',
  title: 'Finance Department Admission Call',
  description:
    'Finance calls Tunde to disclose that Yusuf Ibrahim opened the link and admitted entering his corporate password.',
  discoveryRequirement: 'FINANCE_FOLLOWUP_CALL',
  revealedFactIds: ['FACT_IT_YUSUF_ADMISSION'],
};

export const EV_IT_CONTAINMENT_OUTCOME: EvidenceItem = {
  id: 'EV_IT_CONTAINMENT_OUTCOME',
  incidentId: 'INC_MAIL_FIRS',
  title: 'Post-Incident Containment Debrief',
  description:
    'Tunde confirms gateway block and account reset; Amaka confirms compliance breach register documentation and NDPA risk assessment obligations.',
  discoveryRequirement: 'OUTCOME_DEBRIEF',
  revealedFactIds: [],
};

export const ALL_IT_PHISHING_EVIDENCE: readonly EvidenceItem[] = [
  EV_IT_EMAIL_ARTIFACT,
  EV_IT_TUNDE_DESK_BRIEFING,
  EV_IT_SENDER_HEADERS,
  EV_IT_LINK_TARGET,
  EV_IT_PORTAL_VISIT,
  EV_IT_PORTAL_SUBMISSION,
  EV_IT_FINANCE_CALL,
  EV_IT_CONTAINMENT_OUTCOME,
];

// ============================================================================
// 4. EPISTEMIC PERSPECTIVES
// ============================================================================

export const IT_PHISHING_EPISTEMIC_PERSPECTIVE = {
  objectiveScenarioTruth: [
    'FACT_IT_EMAIL_ARRIVED',
    'FACT_IT_ELEVEN_RECIPIENTS',
    'FACT_IT_INTERACTION_UNCONFIRMED_AT_START',
    'FACT_IT_SENDER_SUSPICIOUS',
    'FACT_IT_WORKSTATION_LOADED',
    'FACT_IT_SENDER_FORGED',
    'FACT_IT_LINK_HARVESTS_CREDENTIALS',
    'FACT_IT_FIRS_IMPERSONATION',
    'FACT_IT_YUSUF_ADMISSION',
    'FACT_IT_AMAKA_INSPECTION_ONLY',
  ],
  tundeInitialKnowledge: [
    'FACT_IT_EMAIL_ARRIVED',
    'FACT_IT_INTERACTION_UNCONFIRMED_AT_START',
    'FACT_IT_SENDER_SUSPICIOUS',
    'FACT_IT_WORKSTATION_LOADED',
    'FACT_IT_ELEVEN_RECIPIENTS',
  ],
  tundePostAdmissionKnowledge: [
    'FACT_IT_EMAIL_ARRIVED',
    'FACT_IT_INTERACTION_UNCONFIRMED_AT_START',
    'FACT_IT_SENDER_SUSPICIOUS',
    'FACT_IT_WORKSTATION_LOADED',
    'FACT_IT_ELEVEN_RECIPIENTS',
    'FACT_IT_SENDER_FORGED',
    'FACT_IT_LINK_HARVESTS_CREDENTIALS',
    'FACT_IT_FIRS_IMPERSONATION',
    'FACT_IT_YUSUF_ADMISSION',
  ],
  candidateInitialKnowledge: [
    'FACT_IT_EMAIL_ARRIVED',
    'FACT_IT_ELEVEN_RECIPIENTS',
    'FACT_IT_INTERACTION_UNCONFIRMED_AT_START',
  ],
  unverifiedHypotheses: [
    'FACT_IT_OTHER_RECIPIENTS_INTERACTED',
    'FACT_IT_PAYMENT_CONSOLE_EXPLOITED',
    'FACT_IT_MALWARE_ON_ENDPOINT',
    'FACT_IT_NDPA_NOTIFICATION_MANDATORY',
  ],
} as const;

// ============================================================================
// 5. AGGREGATED INCIDENT KNOWLEDGE PACKAGE
// ============================================================================

export const IT_PHISHING_KNOWLEDGE_PACKAGE: IncidentKnowledgePackage = {
  incidentId: 'INC_MAIL_FIRS',
  title: 'A phishing mail is sitting in your inbox',
  department: 'IT',
  timeline: IT_PHISHING_TIMELINE,
  facts: ALL_IT_PHISHING_FACTS,
  evidence: ALL_IT_PHISHING_EVIDENCE,
  epistemicPerspective: IT_PHISHING_EPISTEMIC_PERSPECTIVE,
  regulatoryReferences: [
    REG_NDPA_BREACH_REGISTER,
    REG_NDPA_72H_NOTIFICATION,
    REG_BLAMELESS_INCIDENT_REPORTING,
  ],
};
