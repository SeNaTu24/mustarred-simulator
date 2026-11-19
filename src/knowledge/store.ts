/**
 * Mustarred Company Simulator - Knowledge Base Store & Query Selectors
 *
 * Provides typed, immutable accessors for querying:
 * - Scenario facts by certainty, incident, and objective truth
 * - Evidence items and their discovery actions
 * - Character knowledge profiles and epistemic stages
 * - Regulatory references and verification status
 * - Chronological incident timelines
 *
 * Pure, deterministic functions with zero external side effects or UI dependencies.
 */

import { ALL_CHARACTER_PROFILES } from './characters.ts';
import { COMPANY_KNOWLEDGE } from './company.ts';
import { IT_PHISHING_KNOWLEDGE_PACKAGE } from './incidents/itPhishing.ts';
import { HR_DISPUTE_KNOWLEDGE_PACKAGE } from './incidents/hrDispute.ts';
import { FIN_DIESEL_KNOWLEDGE_PACKAGE } from './incidents/finDiesel.ts';
import { LEGAL_CLIENT_KNOWLEDGE_PACKAGE } from './incidents/legalClient.ts';
import { ALL_REGULATORY_REFERENCES } from './regulatory.ts';
import type {
  CharacterKnowledgeProfile,
  DiscoveryAction,
  EvidenceItem,
  FactCertainty,
  IncidentTimelineEvent,
  KnowledgeBase,
  RegulatoryReference,
  ScenarioFact,
} from './types.ts';

// ============================================================================
// TOP-LEVEL KNOWLEDGE BASE AGGREGATE
// ============================================================================

export const KNOWLEDGE_BASE: KnowledgeBase = {
  company: COMPANY_KNOWLEDGE,
  characters: ALL_CHARACTER_PROFILES,
  incidents: {
    INC_MAIL_FIRS: IT_PHISHING_KNOWLEDGE_PACKAGE,
    INC_HR_DISPUTE: HR_DISPUTE_KNOWLEDGE_PACKAGE,
    INC_FIN_DIESEL: FIN_DIESEL_KNOWLEDGE_PACKAGE,
    INC_LEGAL_CLIENT: LEGAL_CLIENT_KNOWLEDGE_PACKAGE,
  },
  regulatory: ALL_REGULATORY_REFERENCES,
};

export function getKnowledgeBase(): KnowledgeBase {
  return KNOWLEDGE_BASE;
}

// ============================================================================
// FACT SELECTORS
// ============================================================================

export function getAllFacts(): readonly ScenarioFact[] {
  return Object.values(KNOWLEDGE_BASE.incidents).flatMap((pkg) => pkg.facts);
}

export function getFactById(factId: string): ScenarioFact | undefined {
  return getAllFacts().find((fact) => fact.id === factId);
}

export function getFactsByIncident(incidentId: string): readonly ScenarioFact[] {
  const pkg = KNOWLEDGE_BASE.incidents[incidentId];
  return pkg ? pkg.facts : [];
}

export function getFactsByCertainty(
  certainty: FactCertainty,
  incidentId?: string
): readonly ScenarioFact[] {
  const source = incidentId ? getFactsByIncident(incidentId) : getAllFacts();
  return source.filter((fact) => fact.certainty === certainty);
}

export function getObjectiveTruths(incidentId?: string): readonly ScenarioFact[] {
  const source = incidentId ? getFactsByIncident(incidentId) : getAllFacts();
  return source.filter((fact) => fact.objectiveTruth);
}

export function getUnverifiedFacts(incidentId?: string): readonly ScenarioFact[] {
  const source = incidentId ? getFactsByIncident(incidentId) : getAllFacts();
  return source.filter(
    (fact) => fact.certainty === 'UNKNOWN' || fact.certainty === 'SUSPECTED'
  );
}

// ============================================================================
// EVIDENCE SELECTORS
// ============================================================================

export function getAllEvidence(): readonly EvidenceItem[] {
  return Object.values(KNOWLEDGE_BASE.incidents).flatMap((pkg) => pkg.evidence);
}

export function getEvidenceById(evidenceId: string): EvidenceItem | undefined {
  return getAllEvidence().find((item) => item.id === evidenceId);
}

export function getEvidenceByAction(
  action: DiscoveryAction,
  incidentId?: string
): readonly EvidenceItem[] {
  const pool = incidentId
    ? KNOWLEDGE_BASE.incidents[incidentId]?.evidence ?? []
    : getAllEvidence();
  return pool.filter((item) => item.discoveryRequirement === action);
}

// ============================================================================
// CHARACTER KNOWLEDGE SELECTORS
// ============================================================================

export function getCharacterProfile(characterId: string): CharacterKnowledgeProfile | undefined {
  return KNOWLEDGE_BASE.characters[characterId];
}

export function getCharacterKnownFacts(
  characterId: string,
  stage: 'initial' | 'post_admission' = 'initial'
): readonly ScenarioFact[] {
  const profile = getCharacterProfile(characterId);
  if (!profile) return [];

  if (characterId === 'tunde-bello') {
    const pkg = KNOWLEDGE_BASE.incidents.INC_MAIL_FIRS;
    const factIds =
      stage === 'post_admission'
        ? pkg.epistemicPerspective.tundePostAdmissionKnowledge ?? []
        : pkg.epistemicPerspective.tundeInitialKnowledge ?? [];

    return factIds
      .map((id) => getFactById(id))
      .filter((fact): fact is ScenarioFact => fact !== undefined);
  }

  // Generic lookup for other character profiles
  const ids = profile.initialKnownFactIds;
  return ids
    .map((id) => getFactById(id))
    .filter((fact): fact is ScenarioFact => fact !== undefined);
}

// ============================================================================
// REGULATORY & TIMELINE SELECTORS
// ============================================================================

export function getRegulatoryReferences(): readonly RegulatoryReference[] {
  return KNOWLEDGE_BASE.regulatory;
}

export function getRegulatoryReferenceById(id: string): RegulatoryReference | undefined {
  return KNOWLEDGE_BASE.regulatory.find((ref) => ref.id === id);
}

export function getTimelineForIncident(incidentId: string): readonly IncidentTimelineEvent[] {
  const pkg = KNOWLEDGE_BASE.incidents[incidentId];
  return pkg ? pkg.timeline : [];
}
