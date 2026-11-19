/**
 * Mustarred Company Simulator - Character Knowledge & Epistemic Profiles
 *
 * Establishes character identities, operational responsibilities, initial knowledge,
 * conditional discoveries, and explicit boundaries for the IT phishing incident.
 *
 * Reuses existing definitions from src/ui/staff.ts without introducing new characters.
 */

import { COMPANY, PLAYER, STAFF } from '../ui/staff.ts';
import type { CharacterKnowledgeProfile } from './types.ts';

export const TUNDE_BELLO_PROFILE: CharacterKnowledgeProfile = {
  id: 'tunde-bello',
  name: STAFF.IT.name,
  role: STAFF.IT.role,
  department: 'IT',
  primaryResponsibilities: [
    'Edge perimeter gateway firewall and DNS blocking',
    'Mail server filtering, routing inspection, and domain quarantine',
    'Active Directory user accounts, session token revocation, and password resets',
    'Endpoint security telemetry and workstation forensic triage',
  ],
  initialKnownFactIds: [
    'FACT_IT_EMAIL_ARRIVED',
    'FACT_IT_ELEVEN_RECIPIENTS',
    'FACT_IT_INTERACTION_UNCONFIRMED_AT_START',
    'FACT_IT_SENDER_SUSPICIOUS',
    'FACT_IT_WORKSTATION_LOADED',
  ],
  conditionalKnowledge: [
    {
      factId: 'FACT_IT_SENDER_FORGED',
      conditionDescription: 'Confirmed when technical headers are inspected on the workstation terminal',
    },
    {
      factId: 'FACT_IT_LINK_HARVESTS_CREDENTIALS',
      conditionDescription: 'Confirmed when link target drawer is inspected or phishing portal is visited',
    },
    {
      factId: 'FACT_IT_YUSUF_ADMISSION',
      conditionDescription: 'Confirmed when Finance phone call alerts Tunde that Yusuf admitted typing his password',
    },
    {
      factId: 'FACT_IT_AMAKA_SUBMITTED_CREDENTIALS',
      conditionDescription: 'Confirmed if Amaka explicitly submitted corporate credentials on the simulation test page',
    },
  ],
  unknownFactIds: [
    'FACT_IT_OTHER_RECIPIENTS_INTERACTED',
    'FACT_IT_PAYMENT_CONSOLE_EXPLOITED',
    'FACT_IT_MALWARE_ON_ENDPOINT',
    'FACT_IT_NDPA_NOTIFICATION_MANDATORY',
  ],
};

export const AMAKA_OBI_PROFILE: CharacterKnowledgeProfile = {
  id: 'amaka-obi',
  name: PLAYER.name,
  role: PLAYER.role,
  department: PLAYER.department,
  primaryResponsibilities: [
    'Statutory regulatory compliance oversight under the NDPA',
    'Internal compliance breach register maintenance and risk evaluation',
    'Executive incident escalation and corporate governance advice',
  ],
  initialKnownFactIds: [
    'FACT_IT_EMAIL_ARRIVED',
    'FACT_IT_ELEVEN_RECIPIENTS',
    'FACT_IT_INTERACTION_UNCONFIRMED_AT_START',
  ],
  conditionalKnowledge: [
    {
      factId: 'FACT_IT_SENDER_SUSPICIOUS',
      conditionDescription: 'Learned by discussing the email at Tunde Bello\'s desk',
    },
    {
      factId: 'FACT_IT_SENDER_FORGED',
      conditionDescription: 'Learned by inspecting sender technical headers on the workstation terminal',
    },
    {
      factId: 'FACT_IT_LINK_HARVESTS_CREDENTIALS',
      conditionDescription: 'Learned by inspecting target URL or simulated portal at the workstation terminal',
    },
    {
      factId: 'FACT_IT_YUSUF_ADMISSION',
      conditionDescription: 'Learned when Tunde discloses that Finance reported Yusuf entered his password',
    },
  ],
  unknownFactIds: [
    'FACT_IT_OTHER_RECIPIENTS_INTERACTED',
    'FACT_IT_PAYMENT_CONSOLE_EXPLOITED',
    'FACT_IT_MALWARE_ON_ENDPOINT',
    'FACT_IT_NDPA_NOTIFICATION_MANDATORY',
  ],
};

export const YUSUF_IBRAHIM_PROFILE: CharacterKnowledgeProfile = {
  id: 'yusuf-ibrahim',
  name: 'Yusuf Ibrahim',
  role: 'Senior Accounts Officer',
  department: 'FINANCE',
  primaryResponsibilities: [
    'Accounts payable processing and vendor invoice management',
    'Handling corporate tax documentation inquiries from Finance',
  ],
  initialKnownFactIds: [
    'FACT_IT_EMAIL_ARRIVED',
    'FACT_IT_ELEVEN_RECIPIENTS',
    'FACT_IT_YUSUF_ADMISSION',
  ],
  unknownFactIds: [
    'FACT_IT_SENDER_FORGED',
    'FACT_IT_OTHER_RECIPIENTS_INTERACTED',
    'FACT_IT_PAYMENT_CONSOLE_EXPLOITED',
  ],
};

// ============================================================================
// HR INCIDENT CHARACTERS
// ============================================================================

export const NGOZI_OKAFOR_PROFILE: CharacterKnowledgeProfile = {
  id: 'ngozi-okafor',
  name: STAFF.HR.name,
  role: STAFF.HR.role,
  department: 'HR',
  primaryResponsibilities: [
    'Staff welfare, workplace relations, and grievance resolution',
    'Employee Handbook enforcement and formal disciplinary panel administration',
    'Witness statement documentation and procedural fair hearing oversight',
  ],
  initialKnownFactIds: [
    'FACT_HR_DISPUTE_PREMISE',
    'FACT_HR_WITNESSES_PRESENT',
    'FACT_HR_BLESSING_STATEMENT_TAKEN',
    'FACT_HR_DISPATCH_BAG_CLAIM',
    'FACT_HR_POLICE_REPORT_THREAT',
    'FACT_HR_HANDBOOK_MANDATES_PANEL',
    'FACT_HR_FLOOR_SCRUTINY',
    'FACT_HR_MUSA_STATEMENT_STATUS',
  ],
  unknownFactIds: [
    'FACT_HR_MUSA_INTENT_OR_DEFENSE',
    'FACT_HR_STAFF_PETITION_RISK',
  ],
};

export const BLESSING_ETIM_PROFILE: CharacterKnowledgeProfile = {
  id: 'blessing-etim',
  name: 'Blessing Etim',
  role: 'Office Assistant',
  department: 'HR',
  primaryResponsibilities: [
    'Office dispatch coordination, parcel sorting, and administrative support',
  ],
  initialKnownFactIds: [
    'FACT_HR_DISPUTE_PREMISE',
    'FACT_HR_WITNESSES_PRESENT',
    'FACT_HR_BLESSING_STATEMENT_TAKEN',
    'FACT_HR_DISPATCH_BAG_CLAIM',
    'FACT_HR_POLICE_REPORT_THREAT',
  ],
  unknownFactIds: [
    'FACT_HR_MUSA_STATEMENT_STATUS',
    'FACT_HR_MUSA_INTENT_OR_DEFENSE',
  ],
};

export const MUSA_SUPERVISOR_PROFILE: CharacterKnowledgeProfile = {
  id: 'musa-supervisor',
  name: 'Musa',
  role: 'Supervisor',
  department: 'HR',
  primaryResponsibilities: [
    'Operations shift supervision, floor team scheduling, and dispatch oversight',
  ],
  initialKnownFactIds: [
    'FACT_HR_DISPUTE_PREMISE',
    'FACT_HR_WITNESSES_PRESENT',
  ],
  unknownFactIds: [
    'FACT_HR_BLESSING_STATEMENT_TAKEN',
    'FACT_HR_POLICE_REPORT_THREAT',
    'FACT_HR_STAFF_PETITION_RISK',
  ],
};

export const CHIDI_DISPATCH_PROFILE: CharacterKnowledgeProfile = {
  id: 'chidi-dispatch',
  name: 'Chidi',
  role: 'Dispatch Officer',
  department: 'HR',
  primaryResponsibilities: [
    'Logistics handling, dispatch bag tracking, and vendor rider handoffs',
  ],
  initialKnownFactIds: [
    'FACT_HR_DISPUTE_PREMISE',
    'FACT_HR_WITNESSES_PRESENT',
    'FACT_HR_DISPATCH_BAG_CLAIM',
  ],
  unknownFactIds: [
    'FACT_HR_POLICE_REPORT_THREAT',
    'FACT_HR_MUSA_STATEMENT_STATUS',
  ],
};

// ============================================================================
// FINANCE INCIDENT CHARACTERS
// ============================================================================

export const CHINEDU_EZE_PROFILE: CharacterKnowledgeProfile = {
  id: 'chinedu-eze',
  name: STAFF.FINANCE.name,
  role: STAFF.FINANCE.role,
  department: 'FINANCE',
  primaryResponsibilities: [
    'Treasury operations, liquid cash management, and bank debt servicing',
    'Accounts payable authorization and monthly operating burn rate management',
    'Commercial procurement agreements and vendor payment terms',
  ],
  initialKnownFactIds: [
    'FACT_FIN_CONTRACT_SIGNED',
    'FACT_FIN_MARKET_PRICE_DROP',
    'FACT_FIN_MD_COST_CUT_MANDATE',
    'FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY',
    'FACT_FIN_CLAUSE_9_4_AUTO_RENEWAL',
  ],
  unknownFactIds: [
    'FACT_FIN_SUPPLIER_RENEGOTIATION_RESPONSE',
    'FACT_FIN_COMPETITOR_DELIVERY_STABILITY',
  ],
};

export const FOLAKE_ADEBAYO_PROFILE: CharacterKnowledgeProfile = {
  id: 'folake-adebayo',
  name: COMPANY.md,
  role: 'Managing Director',
  department: 'COMPLIANCE',
  primaryResponsibilities: [
    'Executive leadership, strategic direction, and shareholder value creation',
    'Quarterly enterprise performance reviews and cost reduction targets',
  ],
  initialKnownFactIds: [
    'FACT_FIN_MD_COST_CUT_MANDATE',
    'FACT_HR_FLOOR_SCRUTINY',
  ],
  unknownFactIds: [
    'FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY',
    'FACT_FIN_LEGAL_NEVER_REVIEWED',
  ],
};

// ============================================================================
// LEGAL INCIDENT CHARACTERS
// ============================================================================

export const FUNMI_ADEYEMI_PROFILE: CharacterKnowledgeProfile = {
  id: 'funmi-adeyemi',
  name: STAFF.LEGAL.name,
  role: STAFF.LEGAL.role,
  department: 'LEGAL',
  primaryResponsibilities: [
    'Commercial contract review, legal risk management, and governance compliance',
    'Corporate secretarial filings, board documentation, and regulatory compliance',
    'External client legal advisory and data breach regulatory guidance',
  ],
  initialKnownFactIds: [
    'FACT_FIN_LEGAL_NEVER_REVIEWED',
    'FACT_FIN_GOVERNANCE_CONTROL_DEFICIT',
    'FACT_LEGAL_CLIENT_NOTIFICATION',
    'FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED',
    'FACT_LEGAL_CUSTOMER_VOLUME',
    'FACT_LEGAL_BOARD_MEETING_TIME',
    'FACT_LEGAL_CUSTOMERS_INQUIRING',
    'FACT_LEGAL_72H_CLOCK_STARTED',
    'FACT_LEGAL_CONTROLLER_LIABILITY',
    'FACT_LEGAL_AFFECTED_CUSTOMER_LIST_ABSENT',
  ],
  unknownFactIds: [
    'FACT_FIN_SUPPLIER_RENEGOTIATION_RESPONSE',
    'FACT_LEGAL_CARD_DATA_EXFILTRATION_EXTENT',
    'FACT_LEGAL_REGULATORY_LATE_FILING_FINDING',
  ],
};

export const IFEOMA_BALOGUN_PROFILE: CharacterKnowledgeProfile = {
  id: 'ifeoma-balogun',
  name: 'Ifeoma Balogun',
  role: 'MD, Greenspring Foods',
  department: 'LEGAL',
  primaryResponsibilities: [
    'Executive leadership and board stewardship of client Greenspring Foods',
    'Customer relations and crisis communication during vendor incidents',
  ],
  initialKnownFactIds: [
    'FACT_LEGAL_CLIENT_NOTIFICATION',
    'FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED',
    'FACT_LEGAL_CUSTOMER_VOLUME',
    'FACT_LEGAL_BOARD_MEETING_TIME',
    'FACT_LEGAL_CUSTOMERS_INQUIRING',
    'FACT_LEGAL_AFFECTED_CUSTOMER_LIST_ABSENT',
  ],
  unknownFactIds: [
    'FACT_LEGAL_72H_CLOCK_STARTED',
    'FACT_LEGAL_CARD_DATA_EXFILTRATION_EXTENT',
    'FACT_LEGAL_REGULATORY_LATE_FILING_FINDING',
  ],
};

export const ALL_CHARACTER_PROFILES: Readonly<Record<string, CharacterKnowledgeProfile>> = {
  'tunde-bello': TUNDE_BELLO_PROFILE,
  'amaka-obi': AMAKA_OBI_PROFILE,
  'yusuf-ibrahim': YUSUF_IBRAHIM_PROFILE,
  'ngozi-okafor': NGOZI_OKAFOR_PROFILE,
  'blessing-etim': BLESSING_ETIM_PROFILE,
  'musa-supervisor': MUSA_SUPERVISOR_PROFILE,
  'chidi-dispatch': CHIDI_DISPATCH_PROFILE,
  'chinedu-eze': CHINEDU_EZE_PROFILE,
  'funmi-adeyemi': FUNMI_ADEYEMI_PROFILE,
  'ifeoma-balogun': IFEOMA_BALOGUN_PROFILE,
  'folake-adebayo': FOLAKE_ADEBAYO_PROFILE,
};
