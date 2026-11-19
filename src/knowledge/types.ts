/**
 * Mustarred Company Simulator - Knowledge Base Domain Types
 *
 * Foundational type definitions establishing:
 * 1. Company and department structures
 * 2. Character identities, responsibilities, and epistemic boundaries
 * 3. Incident facts, categories, and timeline events
 * 4. Evidence and discovery requirements
 * 5. Fact certainty (CONFIRMED, REPORTED, SUSPECTED, UNKNOWN)
 * 6. Regulatory references and provenance/verification status
 *
 * Strictly independent of UI rendering, DOM elements, and external AI providers.
 */

import type { DepartmentId } from '../simulation/types.ts';

// ============================================================================
// 1. FACT CERTAINTY & PROVENANCE
// ============================================================================

/**
 * Epistemological status of a piece of information within the simulation.
 */
export type FactCertainty =
  | 'CONFIRMED'  // Directly verified technical ground truth or established scenario premise
  | 'REPORTED'   // Reported by an individual or external party; not yet independently verified
  | 'SUSPECTED'  // Inferred or hypothesized based on preliminary indicators
  | 'UNKNOWN';   // Acknowledged open question where the truth is not yet established

/**
 * Provenance tracking indicating where information originated in the simulator.
 */
export type KnowledgeSource =
  | 'SCENARIO_SPEC'         // Defined in SCENARIO_MONDAY_MORNING (mondayMorning.data.ts)
  | 'STAFF_REGISTRY'        // Defined in staff.ts
  | 'WORKSTATION_TELEMETRY' // Defined in workstation inspection data (UIManager.ts)
  | 'DIALOGUE_SPEECH'       // Spoken in character dialogue (phishingDialogue.ts)
  | 'STATUTORY_TEXT';       // External statute or regulation cited by characters

/**
 * Verification status of regulatory, legal, or policy references.
 * Explicitly records whether a statutory claim has been independently verified.
 */
export type RegulatoryVerificationStatus =
  | 'STATUTORY_REFERENCE_UNVERIFIED' // Cited from statute (e.g. NDPA 2023) without independent legal counsel validation
  | 'INTERNAL_POLICY_UNVERIFIED'    // Cited from internal company guidelines without formal legal review
  | 'SCENARIO_ASSERTION';           // Stated in scenario dialogue or feedback as an educational working premise

/**
 * Domain category for scenario facts.
 */
export type FactCategory =
  | 'COMMUNICATION'
  | 'TECHNICAL_INFRASTRUCTURE'
  | 'CREDENTIAL_STATUS'
  | 'FINANCIAL_IMPACT'
  | 'PERSONNEL'
  | 'REGULATORY';

// ============================================================================
// 2. FACTS, TIMELINE & DISCOVERY REQUIREMENTS
// ============================================================================

/**
 * An atomic scenario fact representing an objective truth, a character belief, or an unverified claim.
 */
export interface ScenarioFact {
  readonly id: string;
  readonly incidentId: string;
  readonly category: FactCategory;
  readonly statement: string;
  readonly objectiveTruth: boolean;
  readonly certainty: FactCertainty;
  readonly source: KnowledgeSource;
  readonly notes?: string;
}

/**
 * Sequential events marking the chronological development of an incident.
 */
export interface IncidentTimelineEvent {
  readonly time: string;
  readonly description: string;
  readonly source: KnowledgeSource;
  readonly certainty: FactCertainty;
}

/**
 * Actions required by a candidate or investigator to reveal an evidence item.
 */
export type DiscoveryAction =
  | 'STARTING_CONTEXT'          // Present in initial incident briefing / premise
  | 'ASK_TUNDE_DESK'            // Discovered by conversing with Tunde at the IT desk
  | 'INSPECT_EMAIL_HEADER'      // Discovered by inspecting sender headers on workstation terminal
  | 'INSPECT_LINK_TARGET'       // Discovered by inspecting link target drawer on workstation terminal
  | 'SIMULATE_PORTAL_VISIT'     // Discovered by visiting the simulated phishing link
  | 'SUBMIT_PORTAL_CREDENTIALS' // Discovered by submitting credentials on the simulated portal
  | 'FINANCE_FOLLOWUP_CALL'     // Discovered when Finance reports Yusuf's admission to Tunde
  | 'OUTCOME_DEBRIEF'           // Discovered during post-incident resolution debrief
  | 'READ_INCIDENT_ARTIFACT'    // Discovered by reviewing the attached document artifact
  | 'ASK_INCIDENT_INTERVIEW';   // Discovered by interviewing witness / colleague present

/**
 * An inspectable or discoverable item of evidence in the scenario.
 */
export interface EvidenceItem {
  readonly id: string;
  readonly incidentId: string;
  readonly title: string;
  readonly description: string;
  readonly discoveryRequirement: DiscoveryAction;
  readonly revealedFactIds: readonly string[];
  readonly technicalDetails?: Readonly<Record<string, string>>;
}

/**
 * Legal or regulatory principle cited in the scenario, along with its provenance and verification status.
 */
export interface RegulatoryReference {
  readonly id: string;
  readonly instrument: string;
  readonly sectionOrRule?: string;
  readonly assertedPrinciple: string;
  readonly source: KnowledgeSource;
  readonly verificationStatus: RegulatoryVerificationStatus;
  readonly verificationNotes: string;
}

// ============================================================================
// 3. COMPANY, DEPARTMENTS & CHARACTERS
// ============================================================================

/**
 * Department-level knowledge profile.
 */
export interface DepartmentKnowledge {
  readonly id: DepartmentId;
  readonly name: string;
  readonly headId: string;
  readonly primaryResponsibilities: readonly string[];
  readonly systemsOwned: readonly string[];
}

/**
 * Enterprise-level knowledge profile for Mustarred Ltd.
 * Maps directly to COMPANY in src/ui/staff.ts.
 */
export interface CompanyKnowledge {
  readonly name: string;
  readonly legalName: string;
  readonly city: string;
  readonly md: string;
  readonly departments: readonly DepartmentKnowledge[];
}

/**
 * Conditional fact learned by a character upon a specific event.
 */
export interface ConditionalFact {
  readonly factId: string;
  readonly conditionDescription: string;
}

/**
 * Character identity, responsibilities, and epistemic boundaries.
 */
export interface CharacterKnowledgeProfile {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly department: DepartmentId | 'COMPLIANCE';
  readonly primaryResponsibilities: readonly string[];
  /** Fact IDs known to this character at the start of the incident */
  readonly initialKnownFactIds: readonly string[];
  /** Facts this character learns conditionally as the scenario progresses */
  readonly conditionalKnowledge?: readonly ConditionalFact[];
  /** Facts this character explicitly does not know or cannot verify */
  readonly unknownFactIds: readonly string[];
}

// ============================================================================
// 4. EPISTEMIC PERSPECTIVES & INCIDENT PACKAGES
// ============================================================================

/**
 * Epistemic perspective defining boundaries between objective ground reality and character beliefs.
 */
export interface EpistemicPerspective {
  readonly objectiveScenarioTruth: readonly string[];
  readonly candidateInitialKnowledge: readonly string[];
  readonly unverifiedHypotheses: readonly string[];
  /** Knowledge known by the department head / primary character at incident opening */
  readonly departmentHeadInitialKnowledge?: readonly string[];
  readonly departmentHeadPostDisclosureKnowledge?: readonly string[];
  /** IT backwards compatibility */
  readonly tundeInitialKnowledge?: readonly string[];
  readonly tundePostAdmissionKnowledge?: readonly string[];
}

/**
 * Aggregated knowledge package for a specific scenario incident.
 */
export interface IncidentKnowledgePackage {
  readonly incidentId: string;
  readonly title: string;
  readonly department: DepartmentId;
  readonly timeline: readonly IncidentTimelineEvent[];
  readonly facts: readonly ScenarioFact[];
  readonly evidence: readonly EvidenceItem[];
  readonly epistemicPerspective: EpistemicPerspective;
  readonly regulatoryReferences: readonly RegulatoryReference[];
}

/**
 * Top-level knowledge base registry interface.
 */
export interface KnowledgeBase {
  readonly company: CompanyKnowledge;
  readonly characters: Readonly<Record<string, CharacterKnowledgeProfile>>;
  readonly incidents: Readonly<Record<string, IncidentKnowledgePackage>>;
  readonly regulatory: readonly RegulatoryReference[];
}
