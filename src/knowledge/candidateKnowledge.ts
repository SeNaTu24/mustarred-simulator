/**
 * Mustarred Company Simulator - Candidate Knowledge & Discovery Tracking
 *
 * Implements Phase 2 candidate discovery tracking:
 * - Tracks facts and evidence uncovered through investigation actions
 * - Initializes strictly with the candidate's starting context
 * - Persists discoveries across UI transitions (desk, workstation, office floor)
 * - Prevents duplicate discoveries and ensures typing questions cannot unlock hidden evidence
 * - Gated disclosure: Yusuf's admission requires the actual Finance follow-up event
 *
 * Grounded strictly in Phase 1 knowledge-base schemas with zero external AI dependencies.
 */

import { getEvidenceByAction, getEvidenceById, getFactById, getKnowledgeBase } from './store.ts';
import type { DiscoveryAction, EvidenceItem, ScenarioFact } from './types.ts';

// ============================================================================
// 1. DISCOVERY EVENT & SNAPSHOT TYPES
// ============================================================================

/**
 * Log entry capturing a discrete candidate investigation discovery.
 */
export interface CandidateDiscoveryEvent {
  readonly action: DiscoveryAction;
  readonly evidenceId: string;
  readonly revealedFactIds: readonly string[];
  readonly timestamp: number;
}

/**
 * Serialized snapshot of the candidate's current knowledge state.
 */
export interface CandidateKnowledgeSnapshot {
  readonly incidentId: string;
  readonly discoveredFactIds: readonly string[];
  readonly discoveredEvidenceIds: readonly string[];
  readonly performedActions: readonly DiscoveryAction[];
  readonly history: readonly CandidateDiscoveryEvent[];
}

// ============================================================================
// 2. CANDIDATE KNOWLEDGE TRACKER
// ============================================================================

export class CandidateKnowledgeTracker {
  public readonly incidentId: string;
  private readonly factIds: Set<string> = new Set();
  private readonly evidenceIds: Set<string> = new Set();
  private readonly actions: Set<DiscoveryAction> = new Set();
  private readonly historyEvents: CandidateDiscoveryEvent[] = [];

  constructor(incidentId: string = 'INC_MAIL_FIRS') {
    this.incidentId = incidentId;
    this.initializeStartingKnowledge();
  }

  /**
   * Initializes state with only the candidate's legitimate starting knowledge.
   */
  private initializeStartingKnowledge(): void {
    const kb = getKnowledgeBase();
    const pkg = kb.incidents[this.incidentId];
    if (pkg) {
      this.actions.add('STARTING_CONTEXT');

      // Add starting context evidence
      const startingEvidence = getEvidenceByAction('STARTING_CONTEXT', this.incidentId);
      for (const ev of startingEvidence) {
        this.evidenceIds.add(ev.id);
        for (const factId of ev.revealedFactIds) {
          this.factIds.add(factId);
        }
        this.historyEvents.push({
          action: 'STARTING_CONTEXT',
          evidenceId: ev.id,
          revealedFactIds: [...ev.revealedFactIds],
          timestamp: Date.now(),
        });
      }

      // Add starting facts from epistemic perspective
      for (const factId of pkg.epistemicPerspective.candidateInitialKnowledge) {
        this.factIds.add(factId);
      }
    }
  }

  /**
   * Records an investigation action and unlocks associated evidence and facts.
   * Idempotent: Does not duplicate entries if the action has already been performed.
   *
   * @param action The investigation discovery action performed.
   * @returns Array of newly revealed fact IDs (empty if already recorded or none revealed).
   */
  public recordDiscovery(action: DiscoveryAction): readonly string[] {
    // Idempotency: Prevent duplicate action recording
    if (this.actions.has(action)) {
      return [];
    }

    this.actions.add(action);
    const evidenceItems = getEvidenceByAction(action, this.incidentId);
    const newlyDiscovered: string[] = [];

    for (const ev of evidenceItems) {
      this.evidenceIds.add(ev.id);
      for (const factId of ev.revealedFactIds) {
        if (!this.factIds.has(factId)) {
          this.factIds.add(factId);
          newlyDiscovered.push(factId);
        }
      }

      this.historyEvents.push({
        action,
        evidenceId: ev.id,
        revealedFactIds: [...ev.revealedFactIds],
        timestamp: Date.now(),
      });
    }

    return newlyDiscovered;
  }

  /**
   * Checks whether the candidate has discovered a specific fact ID.
   */
  public hasFact(factId: string): boolean {
    return this.factIds.has(factId);
  }

  /**
   * Checks whether the candidate has discovered a specific evidence ID.
   */
  public hasEvidence(evidenceId: string): boolean {
    return this.evidenceIds.has(evidenceId);
  }

  /**
   * Checks whether the candidate has performed a specific discovery action.
   */
  public hasAction(action: DiscoveryAction): boolean {
    return this.actions.has(action);
  }

  /**
   * Returns all fact IDs discovered by the candidate.
   */
  public getDiscoveredFactIds(): readonly string[] {
    return Array.from(this.factIds);
  }

  /**
   * Returns all full ScenarioFact records discovered by the candidate.
   */
  public getDiscoveredFacts(): readonly ScenarioFact[] {
    return Array.from(this.factIds)
      .map((id) => getFactById(id))
      .filter((f): f is ScenarioFact => f !== undefined);
  }

  /**
   * Returns all evidence IDs discovered by the candidate.
   */
  public getDiscoveredEvidenceIds(): readonly string[] {
    return Array.from(this.evidenceIds);
  }

  /**
   * Returns all EvidenceItem records discovered by the candidate.
   */
  public getDiscoveredEvidence(): readonly EvidenceItem[] {
    return Array.from(this.evidenceIds)
      .map((id) => getEvidenceById(id))
      .filter((e): e is EvidenceItem => e !== undefined);
  }

  /**
   * Returns all discovery actions performed by the candidate.
   */
  public getPerformedActions(): readonly DiscoveryAction[] {
    return Array.from(this.actions);
  }

  /**
   * Returns the chronological log of discovery events.
   */
  public getHistory(): readonly CandidateDiscoveryEvent[] {
    return [...this.historyEvents];
  }

  /**
   * Returns an immutable snapshot of candidate knowledge state.
   */
  public getSnapshot(): CandidateKnowledgeSnapshot {
    return {
      incidentId: this.incidentId,
      discoveredFactIds: this.getDiscoveredFactIds(),
      discoveredEvidenceIds: this.getDiscoveredEvidenceIds(),
      performedActions: this.getPerformedActions(),
      history: this.getHistory(),
    };
  }

  /**
   * Resets knowledge state back to initial starting conditions.
   */
  public reset(): void {
    this.factIds.clear();
    this.evidenceIds.clear();
    this.actions.clear();
    this.historyEvents.length = 0;
    this.initializeStartingKnowledge();
  }
}
