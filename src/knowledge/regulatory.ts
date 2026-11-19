/**
 * Mustarred Company Simulator - Regulatory Knowledge & Verification Tracking
 *
 * Captures statutory and internal policy references asserted in the active scenario.
 *
 * Strict Requirement:
 * In accordance with Phase 1 specifications, legal references are NOT treated as
 * independently verified. Their provenance (source) and verification status are
 * accurately recorded as unverified assertions pending formal counsel review.
 */

import type { RegulatoryReference } from './types.ts';

export const REG_NDPA_BREACH_REGISTER: RegulatoryReference = {
  id: 'REG_NDPA_BREACH_REGISTER',
  instrument: 'Nigeria Data Protection Act (NDPA) 2023',
  sectionOrRule: 'Section 40 (Personal Data Breach Notification & Documentation)',
  assertedPrinciple:
    'Data controllers must record all personal data breaches in an internal breach register, detailing the facts, its potential effects, and remedial actions taken, irrespective of whether external notification is required.',
  source: 'DIALOGUE_SPEECH',
  verificationStatus: 'STATUTORY_REFERENCE_UNVERIFIED',
  verificationNotes:
    'Asserted by CCO Amaka Obi in dialogue as a standard compliance obligation under the NDPA 2023. While reflecting statutory principles of Section 40, its exact application to this specific factual incident has not been independently verified by qualified Nigerian legal counsel.',
};

export const REG_NDPA_72H_NOTIFICATION: RegulatoryReference = {
  id: 'REG_NDPA_72H_NOTIFICATION',
  instrument: 'Nigeria Data Protection Act (NDPA) 2023',
  sectionOrRule: 'Section 40(2) (Notification to the Commission & Assessment of Risk)',
  assertedPrinciple:
    'Data controllers must establish what information was accessed, assess the risk to affected data subjects, document their findings, and determine whether regulatory notification to the NDPC within 72 hours is required under applicable law. Technical containment alone does not eliminate the duty to assess and document risk.',
  source: 'DIALOGUE_SPEECH',
  verificationStatus: 'STATUTORY_REFERENCE_UNVERIFIED',
  verificationNotes:
    'Framed in Amaka Obi\'s outcome debrief to ensure factual and legal accuracy. While consistent with statutory risk assessment requirements, the legal threshold for mandatory filing in this specific breach scenario has not been independently verified by qualified counsel.',
};

export const REG_BLAMELESS_INCIDENT_REPORTING: RegulatoryReference = {
  id: 'REG_BLAMELESS_INCIDENT_REPORTING',
  instrument: 'Mustarred Internal Cybersecurity & Compliance Practice',
  sectionOrRule: 'Incident Reporting Protocol (Internal Scenario Baseline)',
  assertedPrinciple:
    'Rapid, blameless disclosure of credential compromise drastically reduces adversary dwell time, enabling IT to revoke active session tokens and reset accounts before lateral movement or unauthorized financial transactions can occur.',
  source: 'SCENARIO_SPEC',
  verificationStatus: 'INTERNAL_POLICY_UNVERIFIED',
  verificationNotes:
    'Internal compliance culture and operational principle asserted in the scenario learning feedback (CHOICE_MAIL_OPEN_CONTAINED). Does not represent a formally audited or externally verified corporate policy manual.',
};

// ============================================================================
// HR INCIDENT REGULATORY & POLICY REFERENCES
// ============================================================================

export const REG_HR_HANDBOOK_DISCIPLINARY: RegulatoryReference = {
  id: 'REG_HR_HANDBOOK_DISCIPLINARY',
  instrument: 'Mustarred Employee Handbook',
  sectionOrRule: 'Disciplinary Procedure & Fair Hearing Policy',
  assertedPrinciple:
    'Our handbook says a written panel before any sanction. Statements must be taken from both sides and two witnesses, with findings rendered in writing before executive action.',
  source: 'SCENARIO_SPEC',
  verificationStatus: 'INTERNAL_POLICY_UNVERIFIED',
  verificationNotes:
    'Internal policy procedure asserted in Turn 2 scenario brief and executive rationale. Internal handbook terms have not been independently audited against statutory labor standard regulations.',
};

export const REG_LABOUR_FAIR_HEARING: RegulatoryReference = {
  id: 'REG_LABOUR_FAIR_HEARING',
  instrument: 'Nigerian Labour Law & Trade Union Standards',
  sectionOrRule: 'Procedural Fairness & Summary Dismissal Challenge',
  assertedPrinciple:
    'Summary dismissal of an employee without procedural fair hearing, investigation of witnesses, or adherence to contractual handbook procedures exposes the company to wrongful termination challenges by trade unions or the National Industrial Court.',
  source: 'SCENARIO_SPEC',
  verificationStatus: 'STATUTORY_REFERENCE_UNVERIFIED',
  verificationNotes:
    'Asserted in learning feedback for CHOICE_HR_DISMISS. Reflects standard fair hearing principles under Nigerian industrial relations, but specific exposure has not been reviewed by employment law counsel.',
};

// ============================================================================
// FINANCE INCIDENT REGULATORY & POLICY REFERENCES
// ============================================================================

export const REG_FIN_VENDOR_SIGNING_AUTHORITY: RegulatoryReference = {
  id: 'REG_FIN_VENDOR_SIGNING_AUTHORITY',
  instrument: 'Mustarred Corporate Governance & Procurement Policy',
  sectionOrRule: 'Vendor Contract Execution & Legal Review Thresholds',
  assertedPrinciple:
    'Multi-year vendor supply commitments must be submitted to the Company Secretary for legal review at least 7 days before signature, prohibiting single-officer execution at vendor premises.',
  source: 'SCENARIO_SPEC',
  verificationStatus: 'INTERNAL_POLICY_UNVERIFIED',
  verificationNotes:
    'Asserted in Turn 3 outcome explanation for CHOICE_FIN_ABSORB. Represents internal corporate governance safeguard rather than statutory requirement.',
};

export const REG_COMMERCIAL_TERMINATION_PENALTY: RegulatoryReference = {
  id: 'REG_COMMERCIAL_TERMINATION_PENALTY',
  instrument: 'Nigerian Contract Law & Commercial Practice',
  sectionOrRule: 'Liquidated Damages vs Unenforceable Penalty Clauses',
  assertedPrinciple:
    'Commercial early termination clauses imposing a 40% lump sum penalty on remaining contract value are standard in long-term supply agreements but may be subject to challenge if construed as punitive rather than a genuine pre-estimate of vendor loss.',
  source: 'SCENARIO_SPEC',
  verificationStatus: 'STATUTORY_REFERENCE_UNVERIFIED',
  verificationNotes:
    'Derived from Clause 9.3 of the Rainoil Energy Services supply agreement and executive tradeoff analysis. Legal enforceability in Nigerian commercial arbitration remains unverified.',
};

// ============================================================================
// LEGAL INCIDENT REGULATORY & POLICY REFERENCES
// ============================================================================

export const REG_LEGAL_NDPA_72H_CLIENT_CLOCK: RegulatoryReference = {
  id: 'REG_LEGAL_NDPA_72H_CLIENT_CLOCK',
  instrument: 'Nigeria Data Protection Act (NDPA) 2023 / NDPR',
  sectionOrRule: 'Section 40 (Third-Party Processor Breach Notification Clock)',
  assertedPrinciple:
    'A data controller\'s statutory 72-hour notification clock commences from the moment the controller is informed of a credible breach by its processor, and cannot be tolled pending receipt of the processor\'s complete forensic report.',
  source: 'SCENARIO_SPEC',
  verificationStatus: 'STATUTORY_REFERENCE_UNVERIFIED',
  verificationNotes:
    'Asserted in executive rationale and learning feedback for CHOICE_LEGAL_NOTIFY ("The clock starts when you are told, not when you are sure"). Regulatory interpretation has not been formally confirmed by the NDPC.',
};

export const REG_LEGAL_CUSTOMER_BREACH_NOTICE: RegulatoryReference = {
  id: 'REG_LEGAL_CUSTOMER_BREACH_NOTICE',
  instrument: 'Nigeria Data Protection Act (NDPA) 2023',
  sectionOrRule: 'Section 40(3) (Direct Notice to Affected Data Subjects)',
  assertedPrinciple:
    'Where a personal data breach is likely to result in high risk to data subjects\' rights and freedoms (such as exposure of payment card credentials), the controller must notify affected data subjects directly and without undue delay.',
  source: 'SCENARIO_SPEC',
  verificationStatus: 'STATUTORY_REFERENCE_UNVERIFIED',
  verificationNotes:
    'Reflected in Greenspring Foods client advisory context. Exact statutory trigger threshold under NDPA Section 40(3) has not been verified by outside legal counsel.',
};

export const ALL_REGULATORY_REFERENCES: readonly RegulatoryReference[] = [
  REG_NDPA_BREACH_REGISTER,
  REG_NDPA_72H_NOTIFICATION,
  REG_BLAMELESS_INCIDENT_REPORTING,
  REG_HR_HANDBOOK_DISCIPLINARY,
  REG_LABOUR_FAIR_HEARING,
  REG_FIN_VENDOR_SIGNING_AUTHORITY,
  REG_COMMERCIAL_TERMINATION_PENALTY,
  REG_LEGAL_NDPA_72H_CLIENT_CLOCK,
  REG_LEGAL_CUSTOMER_BREACH_NOTICE,
];
