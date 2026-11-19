/**
 * Mustarred Company Simulator - Knowledge Base Unit Tests
 *
 * Verifies:
 * 1. Data integrity: Company, departments, facts, evidence, and character profiles.
 * 2. Fact certainty: Strict classification of CONFIRMED, REPORTED, SUSPECTED, and UNKNOWN facts.
 * 3. Character knowledge: Epistemic boundaries for Tunde Bello across investigation stages.
 * 4. Discovery requirements: Valid mapping of discovery actions to evidence items and revealed facts.
 * 5. Regulatory references: Accurate provenance and unverified verification status.
 * 6. Store selectors: Correct query filtering and lookup functionality.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ALL_CHARACTER_PROFILES,
  ALL_IT_PHISHING_EVIDENCE,
  ALL_IT_PHISHING_FACTS,
  ALL_HR_DISPUTE_EVIDENCE,
  ALL_HR_DISPUTE_FACTS,
  HR_DISPUTE_KNOWLEDGE_PACKAGE,
  HR_DISPUTE_TIMELINE,
  ALL_FIN_DIESEL_EVIDENCE,
  ALL_FIN_DIESEL_FACTS,
  FIN_DIESEL_KNOWLEDGE_PACKAGE,
  FIN_DIESEL_TIMELINE,
  ALL_LEGAL_CLIENT_EVIDENCE,
  ALL_LEGAL_CLIENT_FACTS,
  LEGAL_CLIENT_KNOWLEDGE_PACKAGE,
  LEGAL_CLIENT_TIMELINE,
  ALL_REGULATORY_REFERENCES,
  REG_HR_HANDBOOK_DISCIPLINARY,
  REG_LABOUR_FAIR_HEARING,
  REG_FIN_VENDOR_SIGNING_AUTHORITY,
  REG_COMMERCIAL_TERMINATION_PENALTY,
  REG_LEGAL_NDPA_72H_CLIENT_CLOCK,
  REG_LEGAL_CUSTOMER_BREACH_NOTICE,
  COMPANY_KNOWLEDGE,
  CandidateKnowledgeTracker,
  IT_PHISHING_EPISTEMIC_PERSPECTIVE,
  IT_PHISHING_KNOWLEDGE_PACKAGE,
  IT_PHISHING_TIMELINE,
  getAllFacts,
  getCharacterKnownFacts,
  getCharacterProfile,
  getEvidenceByAction,
  getEvidenceById,
  getFactById,
  getFactsByCertainty,
  getFactsByIncident,
  getKnowledgeBase,
  getObjectiveTruths,
  getRegulatoryReferences,
  getTimelineForIncident,
  getUnverifiedFacts,
} from '../src/knowledge/index.ts';
import {
  answerTundeQuestion,
  getTundeFollowupDialogue,
  getFollowupExchange,
} from '../src/ui/phishingDialogue.ts';
import { MONDAY_MORNING_SCENARIO } from '../src/simulation/mondayMorning.data.ts';

describe('Knowledge Base - Data Integrity & Enterprise Profile', () => {
  it('loads company knowledge matching active scenario baseline', () => {
    const kb = getKnowledgeBase();
    assert.strictEqual(kb.company.name, 'Mustarred');
    assert.strictEqual(kb.company.legalName, 'Mustarred Ltd');
    assert.strictEqual(kb.company.city, 'Lekki Phase 1, Lagos');
    assert.strictEqual(kb.company.md, 'Mrs. Folake Adebayo');
    assert.strictEqual(kb.company.departments.length, 4);

    const deptIds = kb.company.departments.map((d) => d.id);
    assert.deepStrictEqual(deptIds, ['IT', 'HR', 'FINANCE', 'LEGAL']);
  });

  it('defines IT department with grounded responsibilities and systems', () => {
    const itDept = COMPANY_KNOWLEDGE.departments.find((d) => d.id === 'IT');
    assert.ok(itDept, 'IT department should exist');
    assert.strictEqual(itDept.headId, 'tunde-bello');
    assert.ok(itDept.primaryResponsibilities.length >= 3);
    assert.ok(itDept.systemsOwned.length >= 3);
    assert.ok(itDept.systemsOwned.some((s) => s.includes('gateway')));
    assert.ok(itDept.systemsOwned.some((s) => s.includes('Active Directory')));
  });

  it('maintains referential integrity across all fact IDs', () => {
    const allFactIds = new Set(getAllFacts().map((f) => f.id));

    // Check evidence revealedFactIds
    for (const ev of ALL_IT_PHISHING_EVIDENCE) {
      for (const factId of ev.revealedFactIds) {
        assert.ok(
          allFactIds.has(factId),
          `Evidence ${ev.id} references undefined fact ID: ${factId}`
        );
      }
    }

    // Check character initial known fact IDs
    for (const profile of Object.values(ALL_CHARACTER_PROFILES)) {
      for (const factId of profile.initialKnownFactIds) {
        assert.ok(
          allFactIds.has(factId),
          `Character ${profile.id} references undefined fact ID: ${factId}`
        );
      }
      if (profile.conditionalKnowledge) {
        for (const cond of profile.conditionalKnowledge) {
          assert.ok(
            allFactIds.has(cond.factId),
            `Character ${profile.id} conditional references undefined fact ID: ${cond.factId}`
          );
        }
      }
      for (const factId of profile.unknownFactIds) {
        assert.ok(
          allFactIds.has(factId),
          `Character ${profile.id} unknown list references undefined fact ID: ${factId}`
        );
      }
    }

    // Check epistemic perspective fact IDs
    for (const factId of IT_PHISHING_EPISTEMIC_PERSPECTIVE.objectiveScenarioTruth) {
      assert.ok(allFactIds.has(factId), `Objective truth references undefined fact ID: ${factId}`);
    }
    for (const factId of IT_PHISHING_EPISTEMIC_PERSPECTIVE.tundeInitialKnowledge) {
      assert.ok(allFactIds.has(factId), `Tunde initial references undefined fact ID: ${factId}`);
    }
    for (const factId of IT_PHISHING_EPISTEMIC_PERSPECTIVE.tundePostAdmissionKnowledge) {
      assert.ok(allFactIds.has(factId), `Tunde post-admission references undefined fact ID: ${factId}`);
    }
    for (const factId of IT_PHISHING_EPISTEMIC_PERSPECTIVE.candidateInitialKnowledge) {
      assert.ok(allFactIds.has(factId), `Candidate initial references undefined fact ID: ${factId}`);
    }
    for (const factId of IT_PHISHING_EPISTEMIC_PERSPECTIVE.unverifiedHypotheses) {
      assert.ok(allFactIds.has(factId), `Unverified list references undefined fact ID: ${factId}`);
    }
  });
});

describe('Knowledge Base - Fact Certainty Classification', () => {
  it('correctly classifies confirmed technical ground truths', () => {
    const confirmed = getFactsByCertainty('CONFIRMED');
    const confirmedIds = confirmed.map((f) => f.id);

    assert.ok(confirmedIds.includes('FACT_IT_EMAIL_ARRIVED'));
    assert.ok(confirmedIds.includes('FACT_IT_ELEVEN_RECIPIENTS'));
    assert.ok(confirmedIds.includes('FACT_IT_INTERACTION_UNCONFIRMED_AT_START'));
    assert.ok(confirmedIds.includes('FACT_IT_SENDER_SUSPICIOUS'));
    assert.ok(confirmedIds.includes('FACT_IT_WORKSTATION_LOADED'));
    assert.ok(confirmedIds.includes('FACT_IT_SENDER_FORGED'));
    assert.ok(confirmedIds.includes('FACT_IT_LINK_HARVESTS_CREDENTIALS'));
    assert.ok(confirmedIds.includes('FACT_IT_FIRS_IMPERSONATION'));
    assert.ok(confirmedIds.includes('FACT_IT_AMAKA_INSPECTION_ONLY'));

    for (const fact of confirmed) {
      assert.strictEqual(fact.certainty, 'CONFIRMED');
      assert.strictEqual(fact.objectiveTruth, true);
    }
  });

  it('classifies Yusuf password submission as REPORTED rather than independently confirmed', () => {
    const yusufFact = getFactById('FACT_IT_YUSUF_ADMISSION');
    assert.ok(yusufFact, 'FACT_IT_YUSUF_ADMISSION should exist');
    assert.strictEqual(
      yusufFact.certainty,
      'REPORTED',
      'Yusuf admission originates from verbal report, not yet verified in directory logs'
    );
    assert.strictEqual(yusufFact.objectiveTruth, true);
  });

  it('classifies testing credential submission as SUSPECTED/CONDITIONAL', () => {
    const amakaSubmitFact = getFactById('FACT_IT_AMAKA_SUBMITTED_CREDENTIALS');
    assert.ok(amakaSubmitFact);
    assert.strictEqual(amakaSubmitFact.certainty, 'SUSPECTED');
    assert.strictEqual(amakaSubmitFact.objectiveTruth, false);
  });

  it('classifies open investigation questions as UNKNOWN', () => {
    const unknown = getFactsByCertainty('UNKNOWN');
    const unknownIds = unknown.map((f) => f.id);

    assert.ok(unknownIds.includes('FACT_IT_OTHER_RECIPIENTS_INTERACTED'));
    assert.ok(unknownIds.includes('FACT_IT_PAYMENT_CONSOLE_EXPLOITED'));
    assert.ok(unknownIds.includes('FACT_IT_MALWARE_ON_ENDPOINT'));
    assert.ok(unknownIds.includes('FACT_IT_NDPA_NOTIFICATION_MANDATORY'));

    for (const fact of unknown) {
      assert.strictEqual(fact.certainty, 'UNKNOWN');
      assert.strictEqual(fact.objectiveTruth, false);
    }
  });

  it('separates objective truth from unverified hypotheses', () => {
    const truths = getObjectiveTruths('INC_MAIL_FIRS');
    const unverified = getUnverifiedFacts('INC_MAIL_FIRS');

    const truthIds = new Set(truths.map((f) => f.id));
    const unverifiedIds = new Set(unverified.map((f) => f.id));

    // Confirmed facts must be in truths
    assert.ok(truthIds.has('FACT_IT_EMAIL_ARRIVED'));
    assert.ok(truthIds.has('FACT_IT_SENDER_FORGED'));

    // Open questions must be in unverified
    assert.ok(unverifiedIds.has('FACT_IT_OTHER_RECIPIENTS_INTERACTED'));
    assert.ok(unverifiedIds.has('FACT_IT_NDPA_NOTIFICATION_MANDATORY'));

    // Disjoint sets: objective truth should not contain unknown facts
    for (const id of unverifiedIds) {
      assert.ok(!truthIds.has(id), `Unverified fact ${id} must not be in objective truth`);
    }
  });
});

describe('Knowledge Base - Character Epistemic Boundaries (Tunde Bello)', () => {
  it('defines Tunde Bello initial knowledge strictly without premature leaks', () => {
    const initialFacts = getCharacterKnownFacts('tunde-bello', 'initial');
    const initialIds = new Set(initialFacts.map((f) => f.id));

    // What Tunde knows at start
    assert.ok(initialIds.has('FACT_IT_EMAIL_ARRIVED'));
    assert.ok(initialIds.has('FACT_IT_INTERACTION_UNCONFIRMED_AT_START'));
    assert.ok(initialIds.has('FACT_IT_SENDER_SUSPICIOUS'));
    assert.ok(initialIds.has('FACT_IT_WORKSTATION_LOADED'));
    assert.ok(initialIds.has('FACT_IT_ELEVEN_RECIPIENTS'));

    // What Tunde MUST NOT know at start
    assert.ok(
      !initialIds.has('FACT_IT_YUSUF_ADMISSION'),
      'Tunde cannot know Yusuf admitted typing his password before Finance calls'
    );
    assert.ok(
      !initialIds.has('FACT_IT_SENDER_FORGED'),
      'Tunde cannot confirm forged Russian relay headers before inspecting terminal'
    );
    assert.ok(
      !initialIds.has('FACT_IT_LINK_HARVESTS_CREDENTIALS'),
      'Tunde cannot confirm harvesting URL before terminal inspection'
    );
    assert.ok(
      !initialIds.has('FACT_IT_OTHER_RECIPIENTS_INTERACTED'),
      'Tunde cannot know whether other recipients interacted'
    );
    assert.ok(
      !initialIds.has('FACT_IT_NDPA_NOTIFICATION_MANDATORY'),
      'Tunde cannot claim NDPA regulatory notification status at start'
    );
  });

  it('updates Tunde Bello knowledge post-admission and post-inspection', () => {
    const postAdmissionFacts = getCharacterKnownFacts('tunde-bello', 'post_admission');
    const postIds = new Set(postAdmissionFacts.map((f) => f.id));

    // Contains initial knowledge
    assert.ok(postIds.has('FACT_IT_EMAIL_ARRIVED'));
    assert.ok(postIds.has('FACT_IT_SENDER_SUSPICIOUS'));

    // Contains post-admission and post-inspection discoveries
    assert.ok(postIds.has('FACT_IT_YUSUF_ADMISSION'));
    assert.ok(postIds.has('FACT_IT_SENDER_FORGED'));
    assert.ok(postIds.has('FACT_IT_LINK_HARVESTS_CREDENTIALS'));
    assert.ok(postIds.has('FACT_IT_FIRS_IMPERSONATION'));

    // Still does NOT know unverified facts
    assert.ok(
      !postIds.has('FACT_IT_OTHER_RECIPIENTS_INTERACTED'),
      'Tunde still does not know other recipient interactions'
    );
    assert.ok(
      !postIds.has('FACT_IT_PAYMENT_CONSOLE_EXPLOITED'),
      'Tunde still does not know payment console exploitation status'
    );
    assert.ok(
      !postIds.has('FACT_IT_NDPA_NOTIFICATION_MANDATORY'),
      'Tunde still does not know if NDPA notification is legally required'
    );
  });

  it('ensures Amaka initial knowledge is limited to inbox reception and unconfirmed status', () => {
    const amakaFacts = getCharacterKnownFacts('amaka-obi', 'initial');
    const amakaIds = new Set(amakaFacts.map((f) => f.id));

    assert.ok(amakaIds.has('FACT_IT_EMAIL_ARRIVED'));
    assert.ok(amakaIds.has('FACT_IT_ELEVEN_RECIPIENTS'));
    assert.ok(amakaIds.has('FACT_IT_INTERACTION_UNCONFIRMED_AT_START'));
    assert.ok(!amakaIds.has('FACT_IT_SENDER_SUSPICIOUS'));
    assert.ok(!amakaIds.has('FACT_IT_SENDER_FORGED'));
    assert.ok(!amakaIds.has('FACT_IT_YUSUF_ADMISSION'));
  });

  it('ensures scenario initial premise does not prematurely disclose Yusuf password submission', () => {
    const premise = MONDAY_MORNING_SCENARIO.incidents[0].basePremise;
    assert.ok(premise.includes('employee interaction has not yet been confirmed'));
    assert.equal(
      premise.includes('typed his password'),
      false,
      'Scenario base premise must not prematurely reveal password entry before investigation'
    );
  });
});

describe('Knowledge Base - Discovery Requirements & Evidence Items', () => {
  it('maps each discovery action to valid evidence items', () => {
    const headerEvidence = getEvidenceByAction('INSPECT_EMAIL_HEADER', 'INC_MAIL_FIRS');
    assert.strictEqual(headerEvidence.length, 1);
    assert.strictEqual(headerEvidence[0].id, 'EV_IT_SENDER_HEADERS');
    assert.ok(headerEvidence[0].revealedFactIds.includes('FACT_IT_SENDER_FORGED'));
    assert.ok(headerEvidence[0].revealedFactIds.includes('FACT_IT_FIRS_IMPERSONATION'));

    const linkEvidence = getEvidenceByAction('INSPECT_LINK_TARGET', 'INC_MAIL_FIRS');
    assert.strictEqual(linkEvidence.length, 1);
    assert.strictEqual(linkEvidence[0].id, 'EV_IT_LINK_TARGET');
    assert.ok(linkEvidence[0].revealedFactIds.includes('FACT_IT_LINK_HARVESTS_CREDENTIALS'));

    const callEvidence = getEvidenceByAction('FINANCE_FOLLOWUP_CALL', 'INC_MAIL_FIRS');
    assert.strictEqual(callEvidence.length, 1);
    assert.strictEqual(callEvidence[0].id, 'EV_IT_FINANCE_CALL');
    assert.ok(callEvidence[0].revealedFactIds.includes('FACT_IT_YUSUF_ADMISSION'));

    const debriefEvidence = getEvidenceByAction('OUTCOME_DEBRIEF', 'INC_MAIL_FIRS');
    assert.strictEqual(debriefEvidence.length, 1);
    assert.strictEqual(debriefEvidence[0].id, 'EV_IT_CONTAINMENT_OUTCOME');
  });

  it('includes verified technical details on inspectable workstation items', () => {
    const senderItem = getEvidenceById('EV_IT_SENDER_HEADERS');
    assert.ok(senderItem?.technicalDetails);
    assert.ok(senderItem.technicalDetails.mailServer.includes('185.220.101.44'));
    assert.ok(senderItem.technicalDetails.spfRecord.includes('fail'));
    assert.ok(senderItem.technicalDetails.senderDomain.includes('firs-gov.com.ng'));

    const linkItem = getEvidenceById('EV_IT_LINK_TARGET');
    assert.ok(linkItem?.technicalDetails);
    assert.strictEqual(linkItem.technicalDetails.targetUrl, 'http://firs-gov.com.ng/portal/tax-clearance');
    assert.strictEqual(linkItem.technicalDetails.protocol, 'HTTP (unencrypted)');
    assert.strictEqual(linkItem.technicalDetails.formAction, 'POST /api/collect-credentials');
  });
});

describe('Knowledge Base - Regulatory References & Verification Status', () => {
  it('does NOT treat statutory references as independently verified', () => {
    const refs = getRegulatoryReferences();
    assert.strictEqual(refs.length, 9);

    const ndpaRegister = refs.find((r) => r.id === 'REG_NDPA_BREACH_REGISTER');
    assert.ok(ndpaRegister);
    assert.strictEqual(
      ndpaRegister.verificationStatus,
      'STATUTORY_REFERENCE_UNVERIFIED',
      'NDPA breach register reference must be marked UNVERIFIED'
    );
    assert.ok(ndpaRegister.verificationNotes.includes('has not been independently verified'));

    const ndpa72h = refs.find((r) => r.id === 'REG_NDPA_72H_NOTIFICATION');
    assert.ok(ndpa72h);
    assert.strictEqual(
      ndpa72h.verificationStatus,
      'STATUTORY_REFERENCE_UNVERIFIED',
      'NDPA 72-hour notification reference must be marked UNVERIFIED'
    );
    assert.ok(ndpa72h.verificationNotes.includes('has not been independently verified'));

    const internalPolicy = refs.find((r) => r.id === 'REG_BLAMELESS_INCIDENT_REPORTING');
    assert.ok(internalPolicy);
    assert.strictEqual(
      internalPolicy.verificationStatus,
      'INTERNAL_POLICY_UNVERIFIED',
      'Internal blameless reporting must be marked INTERNAL_POLICY_UNVERIFIED'
    );
  });
});

describe('Knowledge Base - Chronological Incident Timeline', () => {
  it('provides chronological timeline events from domain registration to containment', () => {
    const timeline = getTimelineForIncident('INC_MAIL_FIRS');
    assert.strictEqual(timeline.length, 8);
    assert.strictEqual(timeline[0].time, '~3 days ago');
    assert.strictEqual(timeline[1].time, '08:52 AM');
    assert.strictEqual(timeline[timeline.length - 1].time, '~09:40 AM');

    for (const event of timeline) {
      assert.ok(event.time.length > 0);
      assert.ok(event.description.length > 0);
      assert.ok(event.certainty === 'CONFIRMED' || event.certainty === 'REPORTED');
    }
  });
});

describe('Candidate Knowledge & Discovery Tracking (Phase 2)', () => {
  it('initializes candidate knowledge with ONLY legitimate starting context', () => {
    const ck = new CandidateKnowledgeTracker('INC_MAIL_FIRS');

    // Performed actions must only contain STARTING_CONTEXT
    assert.deepStrictEqual(ck.getPerformedActions(), ['STARTING_CONTEXT']);
    assert.strictEqual(ck.hasAction('STARTING_CONTEXT'), true);
    assert.strictEqual(ck.hasAction('INSPECT_EMAIL_HEADER'), false);
    assert.strictEqual(ck.hasAction('FINANCE_FOLLOWUP_CALL'), false);

    // Discovered evidence must only be EV_IT_EMAIL_ARTIFACT
    assert.deepStrictEqual(ck.getDiscoveredEvidenceIds(), ['EV_IT_EMAIL_ARTIFACT']);
    assert.strictEqual(ck.hasEvidence('EV_IT_EMAIL_ARTIFACT'), true);
    assert.strictEqual(ck.hasEvidence('EV_IT_SENDER_HEADERS'), false);

    // Discovered facts must only match candidateInitialKnowledge
    const initialFacts = ck.getDiscoveredFactIds();
    assert.strictEqual(initialFacts.length, 3);
    assert.strictEqual(ck.hasFact('FACT_IT_EMAIL_ARRIVED'), true);
    assert.strictEqual(ck.hasFact('FACT_IT_ELEVEN_RECIPIENTS'), true);
    assert.strictEqual(ck.hasFact('FACT_IT_INTERACTION_UNCONFIRMED_AT_START'), true);

    // Hidden facts must NOT be present at start
    assert.strictEqual(ck.hasFact('FACT_IT_SENDER_FORGED'), false);
    assert.strictEqual(ck.hasFact('FACT_IT_LINK_HARVESTS_CREDENTIALS'), false);
    assert.strictEqual(ck.hasFact('FACT_IT_YUSUF_ADMISSION'), false);
    assert.strictEqual(ck.hasFact('FACT_IT_AMAKA_SUBMITTED_CREDENTIALS'), false);
    assert.strictEqual(ck.hasFact('FACT_IT_NDPA_NOTIFICATION_MANDATORY'), false);
  });

  it('progressively discovers evidence and facts upon candidate investigation actions', () => {
    const ck = new CandidateKnowledgeTracker('INC_MAIL_FIRS');

    // 1. Amaka consults Tunde at desk
    const deskNew = ck.recordDiscovery('ASK_TUNDE_DESK');
    assert.strictEqual(ck.hasAction('ASK_TUNDE_DESK'), true);
    assert.strictEqual(ck.hasEvidence('EV_IT_TUNDE_DESK_BRIEFING'), true);
    assert.strictEqual(ck.hasFact('FACT_IT_SENDER_SUSPICIOUS'), true);
    assert.strictEqual(ck.hasFact('FACT_IT_WORKSTATION_LOADED'), true);
    assert.ok(deskNew.includes('FACT_IT_SENDER_SUSPICIOUS'));

    // 2. Inspect sender headers on workstation
    const headerNew = ck.recordDiscovery('INSPECT_EMAIL_HEADER');
    assert.strictEqual(ck.hasAction('INSPECT_EMAIL_HEADER'), true);
    assert.strictEqual(ck.hasEvidence('EV_IT_SENDER_HEADERS'), true);
    assert.strictEqual(ck.hasFact('FACT_IT_SENDER_FORGED'), true);
    assert.strictEqual(ck.hasFact('FACT_IT_FIRS_IMPERSONATION'), true);
    assert.ok(headerNew.includes('FACT_IT_SENDER_FORGED'));

    // 3. Inspect link target drawer
    const linkNew = ck.recordDiscovery('INSPECT_LINK_TARGET');
    assert.strictEqual(ck.hasAction('INSPECT_LINK_TARGET'), true);
    assert.strictEqual(ck.hasEvidence('EV_IT_LINK_TARGET'), true);
    assert.strictEqual(ck.hasFact('FACT_IT_LINK_HARVESTS_CREDENTIALS'), true);
    assert.ok(linkNew.includes('FACT_IT_LINK_HARVESTS_CREDENTIALS'));

    // 4. Open link without credentials (portal visit)
    const portalNew = ck.recordDiscovery('SIMULATE_PORTAL_VISIT');
    assert.strictEqual(ck.hasEvidence('EV_IT_PORTAL_VISIT'), true);
    assert.strictEqual(ck.hasFact('FACT_IT_AMAKA_INSPECTION_ONLY'), true);
    assert.deepStrictEqual(portalNew, ['FACT_IT_AMAKA_INSPECTION_ONLY']);

    // Yusuf's admission MUST STILL be undiscovered!
    assert.strictEqual(ck.hasFact('FACT_IT_YUSUF_ADMISSION'), false);
  });

  it('prevents duplicate discoveries and maintains idempotency', () => {
    const ck = new CandidateKnowledgeTracker('INC_MAIL_FIRS');

    // First inspection
    const firstCall = ck.recordDiscovery('INSPECT_EMAIL_HEADER');
    assert.ok(firstCall.length > 0);
    const countAfterFirst = ck.getDiscoveredFactIds().length;
    const historyLengthAfterFirst = ck.getHistory().length;

    // Duplicate call with same action
    const secondCall = ck.recordDiscovery('INSPECT_EMAIL_HEADER');
    assert.deepStrictEqual(secondCall, [], 'Duplicate action recording must return empty array');
    assert.strictEqual(ck.getDiscoveredFactIds().length, countAfterFirst);
    assert.strictEqual(ck.getHistory().length, historyLengthAfterFirst);
  });

  it('strictly gates Yusuf admission until FINANCE_FOLLOWUP_CALL occurs', () => {
    const ck = new CandidateKnowledgeTracker('INC_MAIL_FIRS');
    ck.recordDiscovery('INSPECT_EMAIL_HEADER');
    ck.recordDiscovery('INSPECT_LINK_TARGET');

    // Candidate has discovered technical facts, but NOT Yusuf's admission
    assert.strictEqual(ck.hasFact('FACT_IT_YUSUF_ADMISSION'), false);

    // Candidate asks Tunde about Yusuf's actions before follow-up call
    const qBefore = answerTundeQuestion('Did Yusuf click the link or enter his password?', {
      candidateKnowledge: ck,
    });
    assert.strictEqual(qBefore.category, 'yusuf_actions');
    assert.ok(
      qBefore.response.includes("haven't confirmed whether Yusuf or anyone else in Finance"),
      'Tunde must not disclose Yusuf entered password before Finance call'
    );
    assert.strictEqual(
      qBefore.response.includes('Yusuf admitted'),
      false,
      'Response must not state Yusuf admitted before follow-up call'
    );

    // Now Finance calls Tunde with Yusuf's admission
    const financeNew = ck.recordDiscovery('FINANCE_FOLLOWUP_CALL');
    assert.ok(financeNew.includes('FACT_IT_YUSUF_ADMISSION'));
    assert.strictEqual(ck.hasFact('FACT_IT_YUSUF_ADMISSION'), true);

    // Now when candidate asks about Yusuf
    const qAfter = answerTundeQuestion('Did Yusuf click the link or enter his password?', {
      candidateKnowledge: ck,
    });
    assert.strictEqual(qAfter.category, 'yusuf_actions');
    assert.ok(
      qAfter.response.includes('Yusuf admitted he opened the link and may have entered his password'),
      'Tunde reveals Yusuf admission after Finance call is logged'
    );
  });

  it('guarantees typing questions about hidden evidence cannot unlock knowledge', () => {
    const ck = new CandidateKnowledgeTracker('INC_MAIL_FIRS');
    const startingFacts = ck.getDiscoveredFactIds();
    const startingEvidence = ck.getDiscoveredEvidenceIds();
    const startingActions = ck.getPerformedActions();

    // Candidate types inquiries about hidden facts
    answerTundeQuestion('Did Yusuf enter his password?', { candidateKnowledge: ck });
    answerTundeQuestion('Is the Return-Path a Russian relay at 185.220.101.44?', { candidateKnowledge: ck });
    answerTundeQuestion('Is firs-gov.com.ng registered 3 days ago?', { candidateKnowledge: ck });
    answerTundeQuestion('Is NDPA notification required within 72 hours?', { candidateKnowledge: ck });

    // Knowledge state must remain completely unaltered
    assert.deepStrictEqual(ck.getDiscoveredFactIds(), startingFacts);
    assert.deepStrictEqual(ck.getDiscoveredEvidenceIds(), startingEvidence);
    assert.deepStrictEqual(ck.getPerformedActions(), startingActions);
    assert.strictEqual(ck.hasFact('FACT_IT_YUSUF_ADMISSION'), false);
    assert.strictEqual(ck.hasFact('FACT_IT_SENDER_FORGED'), false);
  });

  it('provides immutable snapshot and supports clean reset', () => {
    const ck = new CandidateKnowledgeTracker('INC_MAIL_FIRS');
    ck.recordDiscovery('INSPECT_EMAIL_HEADER');
    ck.recordDiscovery('INSPECT_LINK_TARGET');

    const snapshot = ck.getSnapshot();
    assert.strictEqual(snapshot.incidentId, 'INC_MAIL_FIRS');
    assert.ok(snapshot.discoveredFactIds.includes('FACT_IT_SENDER_FORGED'));
    assert.ok(snapshot.discoveredEvidenceIds.includes('EV_IT_SENDER_HEADERS'));
    assert.ok(snapshot.performedActions.includes('INSPECT_EMAIL_HEADER'));
    assert.strictEqual(snapshot.history.length, 3); // STARTING_CONTEXT + 2 actions

    // Reset back to baseline
    ck.reset();
    assert.deepStrictEqual(ck.getPerformedActions(), ['STARTING_CONTEXT']);
    assert.deepStrictEqual(ck.getDiscoveredEvidenceIds(), ['EV_IT_EMAIL_ARTIFACT']);
    assert.strictEqual(ck.hasFact('FACT_IT_SENDER_FORGED'), false);
  });

  it('integrates candidate knowledge with Tunde followup dialogue and exchange', () => {
    const ck = new CandidateKnowledgeTracker('INC_MAIL_FIRS');

    // Before inspection
    const initialExchange = getFollowupExchange({ candidateKnowledge: ck });
    assert.ok(initialExchange.tundeLine.includes('inspect the technical headers on the terminal'));

    // After inspecting sender headers
    ck.recordDiscovery('INSPECT_EMAIL_HEADER');
    const inspectedDialogue = getTundeFollowupDialogue(undefined, { candidateKnowledge: ck });
    assert.ok(inspectedDialogue.includes('forged headers from a Russian relay'));

    // After submitting credentials
    ck.recordDiscovery('SUBMIT_PORTAL_CREDENTIALS');
    const credentialsDialogue = getTundeFollowupDialogue(undefined, { candidateKnowledge: ck });
    assert.ok(credentialsDialogue.includes('creating two separate exposures'));
  });

  it('OUTCOME_DEBRIEF preserves epistemic boundaries and does not unlock uncertain open inquiries as facts', () => {
    const ck = new CandidateKnowledgeTracker('INC_MAIL_FIRS');
    ck.recordDiscovery('INSPECT_EMAIL_HEADER');
    ck.recordDiscovery('INSPECT_LINK_TARGET');
    ck.recordDiscovery('FINANCE_FOLLOWUP_CALL');

    const revealedFacts = ck.recordDiscovery('OUTCOME_DEBRIEF');
    // OUTCOME_DEBRIEF evidence item must be unlocked
    assert.strictEqual(ck.hasEvidence('EV_IT_CONTAINMENT_OUTCOME'), true);
    assert.strictEqual(ck.hasAction('OUTCOME_DEBRIEF'), true);

    // Must NOT reveal any uncertain or unverified inquiries as discovered truths
    assert.deepStrictEqual(revealedFacts, []);
    assert.strictEqual(ck.hasFact('FACT_IT_NDPA_NOTIFICATION_MANDATORY'), false);
    assert.strictEqual(ck.hasFact('FACT_IT_OTHER_RECIPIENTS_INTERACTED'), false);
    assert.strictEqual(ck.hasFact('FACT_IT_PAYMENT_CONSOLE_EXPLOITED'), false);
    assert.strictEqual(ck.hasFact('FACT_IT_MALWARE_ON_ENDPOINT'), false);
  });
});

describe('Knowledge Base - Multi-Incident Registration & Store Aggregation', () => {
  it('registers all four active incidents in the knowledge base store', () => {
    const kb = getKnowledgeBase();
    const incidentIds = Object.keys(kb.incidents);
    assert.strictEqual(incidentIds.length, 4);
    assert.ok(incidentIds.includes('INC_MAIL_FIRS'));
    assert.ok(incidentIds.includes('INC_HR_DISPUTE'));
    assert.ok(incidentIds.includes('INC_FIN_DIESEL'));
    assert.ok(incidentIds.includes('INC_LEGAL_CLIENT'));
  });

  it('aggregates facts across all incidents while maintaining incident filtering', () => {
    const allFacts = getAllFacts();
    assert.ok(allFacts.length >= 35, `Expected at least 35 facts across 4 incidents, got ${allFacts.length}`);

    const itFacts = getFactsByIncident('INC_MAIL_FIRS');
    const hrFacts = getFactsByIncident('INC_HR_DISPUTE');
    const finFacts = getFactsByIncident('INC_FIN_DIESEL');
    const legalFacts = getFactsByIncident('INC_LEGAL_CLIENT');

    assert.ok(itFacts.length >= 10);
    assert.ok(hrFacts.length >= 10);
    assert.ok(finFacts.length >= 8);
    assert.ok(legalFacts.length >= 9);

    // Each fact belongs to its assigned incident
    assert.ok(itFacts.every((f) => f.incidentId === 'INC_MAIL_FIRS'));
    assert.ok(hrFacts.every((f) => f.incidentId === 'INC_HR_DISPUTE'));
    assert.ok(finFacts.every((f) => f.incidentId === 'INC_FIN_DIESEL'));
    assert.ok(legalFacts.every((f) => f.incidentId === 'INC_LEGAL_CLIENT'));
  });

  it('retrieves distinct chronological timelines for each incident', () => {
    const itTimeline = getTimelineForIncident('INC_MAIL_FIRS');
    const hrTimeline = getTimelineForIncident('INC_HR_DISPUTE');
    const finTimeline = getTimelineForIncident('INC_FIN_DIESEL');
    const legalTimeline = getTimelineForIncident('INC_LEGAL_CLIENT');

    assert.ok(itTimeline.length >= 4);
    assert.ok(hrTimeline.length >= 4);
    assert.ok(finTimeline.length >= 4);
    assert.ok(legalTimeline.length >= 4);

    assert.ok(hrTimeline.some((e) => e.description.includes('Musa slaps Blessing')));
    assert.ok(finTimeline.some((e) => e.description.includes('Rainoil Energy Services')));
    assert.ok(legalTimeline.some((e) => e.description.includes('Greenspring Foods')));
  });

  it('supports evidence querying across all incidents and by action', () => {
    const startEvidence = getEvidenceByAction('STARTING_CONTEXT');
    assert.strictEqual(startEvidence.length, 4, 'Each incident should have a starting context evidence item');

    const artifactEvidence = getEvidenceByAction('READ_INCIDENT_ARTIFACT');
    assert.strictEqual(artifactEvidence.length, 3, 'HR, Finance, and Legal each have an artifact');

    const interviewEvidence = getEvidenceByAction('ASK_INCIDENT_INTERVIEW');
    assert.strictEqual(interviewEvidence.length, 3, 'HR, Finance, and Legal each have an interview evidence item');

    const debriefEvidence = getEvidenceByAction('OUTCOME_DEBRIEF');
    assert.strictEqual(debriefEvidence.length, 4, 'Each incident has an outcome debrief item');
  });
});

describe('Knowledge Base - HR Incident: Workplace Assault', () => {
  it('defines structured facts with appropriate certainty levels', () => {
    const pkg = HR_DISPUTE_KNOWLEDGE_PACKAGE;
    assert.strictEqual(pkg.incidentId, 'INC_HR_DISPUTE');
    assert.strictEqual(pkg.department, 'HR');

    // Confirmed premise & handbook
    const premise = getFactById('FACT_HR_DISPUTE_PREMISE');
    assert.ok(premise);
    assert.strictEqual(premise.certainty, 'CONFIRMED');
    assert.strictEqual(premise.objectiveTruth, true);

    const handbook = getFactById('FACT_HR_HANDBOOK_MANDATES_PANEL');
    assert.ok(handbook);
    assert.strictEqual(handbook.certainty, 'CONFIRMED');

    // Reported statements
    const bagClaim = getFactById('FACT_HR_DISPATCH_BAG_CLAIM');
    assert.ok(bagClaim);
    assert.strictEqual(bagClaim.certainty, 'REPORTED');

    const policeThreat = getFactById('FACT_HR_POLICE_REPORT_THREAT');
    assert.ok(policeThreat);
    assert.strictEqual(policeThreat.certainty, 'REPORTED');

    // Suspected and unknown
    const petitionRisk = getFactById('FACT_HR_STAFF_PETITION_RISK');
    assert.ok(petitionRisk);
    assert.strictEqual(petitionRisk.certainty, 'SUSPECTED');

    const musaDefense = getFactById('FACT_HR_MUSA_INTENT_OR_DEFENSE');
    assert.ok(musaDefense);
    assert.strictEqual(musaDefense.certainty, 'UNKNOWN');
    assert.strictEqual(musaDefense.objectiveTruth, false);
  });

  it('maintains strict epistemic boundaries for HR incident', () => {
    const ep = HR_DISPUTE_KNOWLEDGE_PACKAGE.epistemicPerspective;
    assert.ok(ep.objectiveScenarioTruth.includes('FACT_HR_DISPUTE_PREMISE'));
    assert.ok(ep.objectiveScenarioTruth.includes('FACT_HR_HANDBOOK_MANDATES_PANEL'));

    // Candidate initial knowledge is limited to basic briefing
    assert.ok(ep.candidateInitialKnowledge.includes('FACT_HR_DISPUTE_PREMISE'));
    assert.ok(ep.candidateInitialKnowledge.includes('FACT_HR_HANDBOOK_MANDATES_PANEL'));
    assert.ok(ep.candidateInitialKnowledge.includes('FACT_HR_FLOOR_SCRUTINY'));
    assert.strictEqual(ep.candidateInitialKnowledge.includes('FACT_HR_BLESSING_STATEMENT_TAKEN'), false);
    assert.strictEqual(ep.candidateInitialKnowledge.includes('FACT_HR_WITNESSES_PRESENT'), false);

    // Unverified hypotheses
    assert.ok(ep.unverifiedHypotheses.includes('FACT_HR_MUSA_INTENT_OR_DEFENSE'));
    assert.ok(ep.unverifiedHypotheses.includes('FACT_HR_STAFF_PETITION_RISK'));
  });

  it('associates verified-accurate regulatory and handbook references', () => {
    const pkg = HR_DISPUTE_KNOWLEDGE_PACKAGE;
    assert.strictEqual(pkg.regulatoryReferences.length, 2);

    const handbookRef = pkg.regulatoryReferences.find((r) => r.id === 'REG_HR_HANDBOOK_DISCIPLINARY');
    assert.ok(handbookRef);
    assert.strictEqual(handbookRef.verificationStatus, 'INTERNAL_POLICY_UNVERIFIED');

    const labourRef = pkg.regulatoryReferences.find((r) => r.id === 'REG_LABOUR_FAIR_HEARING');
    assert.ok(labourRef);
    assert.strictEqual(labourRef.verificationStatus, 'STATUTORY_REFERENCE_UNVERIFIED');
  });
});

describe('Knowledge Base - Finance Incident: Diesel Supply Agreement', () => {
  it('defines structured facts with appropriate certainty levels', () => {
    const pkg = FIN_DIESEL_KNOWLEDGE_PACKAGE;
    assert.strictEqual(pkg.incidentId, 'INC_FIN_DIESEL');
    assert.strictEqual(pkg.department, 'FINANCE');

    const contractSigned = getFactById('FACT_FIN_CONTRACT_SIGNED');
    assert.ok(contractSigned);
    assert.strictEqual(contractSigned.certainty, 'CONFIRMED');

    const clause9_3 = getFactById('FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY');
    assert.ok(clause9_3);
    assert.strictEqual(clause9_3.certainty, 'CONFIRMED');

    const legalNeverReviewed = getFactById('FACT_FIN_LEGAL_NEVER_REVIEWED');
    assert.ok(legalNeverReviewed);
    assert.strictEqual(legalNeverReviewed.certainty, 'CONFIRMED');

    const vendorResponse = getFactById('FACT_FIN_SUPPLIER_RENEGOTIATION_RESPONSE');
    assert.ok(vendorResponse);
    assert.strictEqual(vendorResponse.certainty, 'UNKNOWN');
  });

  it('maintains strict epistemic boundaries for Finance incident', () => {
    const ep = FIN_DIESEL_KNOWLEDGE_PACKAGE.epistemicPerspective;
    assert.ok(ep.candidateInitialKnowledge.includes('FACT_FIN_CONTRACT_SIGNED'));
    assert.ok(ep.candidateInitialKnowledge.includes('FACT_FIN_MARKET_PRICE_DROP'));
    assert.ok(ep.candidateInitialKnowledge.includes('FACT_FIN_MD_COST_CUT_MANDATE'));

    // Detailed contract clauses and legal bypass are revealed via artifact and interview
    assert.strictEqual(ep.candidateInitialKnowledge.includes('FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY'), false);
    assert.strictEqual(ep.candidateInitialKnowledge.includes('FACT_FIN_LEGAL_NEVER_REVIEWED'), false);

    assert.ok(ep.unverifiedHypotheses.includes('FACT_FIN_SUPPLIER_RENEGOTIATION_RESPONSE'));
  });

  it('associates corporate governance and commercial contract regulatory references', () => {
    const pkg = FIN_DIESEL_KNOWLEDGE_PACKAGE;
    assert.strictEqual(pkg.regulatoryReferences.length, 2);

    const signingPolicy = pkg.regulatoryReferences.find((r) => r.id === 'REG_FIN_VENDOR_SIGNING_AUTHORITY');
    assert.ok(signingPolicy);
    assert.strictEqual(signingPolicy.verificationStatus, 'INTERNAL_POLICY_UNVERIFIED');

    const penaltyClause = pkg.regulatoryReferences.find((r) => r.id === 'REG_COMMERCIAL_TERMINATION_PENALTY');
    assert.ok(penaltyClause);
    assert.strictEqual(penaltyClause.verificationStatus, 'STATUTORY_REFERENCE_UNVERIFIED');
  });
});

describe('Knowledge Base - Legal Incident: Greenspring Foods Client Breach', () => {
  it('defines structured facts with appropriate certainty levels', () => {
    const pkg = LEGAL_CLIENT_KNOWLEDGE_PACKAGE;
    assert.strictEqual(pkg.incidentId, 'INC_LEGAL_CLIENT');
    assert.strictEqual(pkg.department, 'LEGAL');

    const clientNotif = getFactById('FACT_LEGAL_CLIENT_NOTIFICATION');
    assert.ok(clientNotif);
    assert.strictEqual(clientNotif.certainty, 'CONFIRMED');

    const claimsContained = getFactById('FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED');
    assert.ok(claimsContained);
    assert.strictEqual(claimsContained.certainty, 'REPORTED');

    const customerVolume = getFactById('FACT_LEGAL_CUSTOMER_VOLUME');
    assert.ok(customerVolume);
    assert.strictEqual(customerVolume.certainty, 'REPORTED');

    const clockStarted = getFactById('FACT_LEGAL_72H_CLOCK_STARTED');
    assert.ok(clockStarted);
    assert.strictEqual(clockStarted.certainty, 'CONFIRMED');

    const exfiltrationExtent = getFactById('FACT_LEGAL_CARD_DATA_EXFILTRATION_EXTENT');
    assert.ok(exfiltrationExtent);
    assert.strictEqual(exfiltrationExtent.certainty, 'UNKNOWN');
  });

  it('maintains strict epistemic boundaries for Legal incident', () => {
    const ep = LEGAL_CLIENT_KNOWLEDGE_PACKAGE.epistemicPerspective;
    assert.ok(ep.candidateInitialKnowledge.includes('FACT_LEGAL_CLIENT_NOTIFICATION'));
    assert.ok(ep.candidateInitialKnowledge.includes('FACT_LEGAL_BOARD_MEETING_TIME'));
    assert.ok(ep.candidateInitialKnowledge.includes('FACT_LEGAL_CONTROLLER_LIABILITY'));

    // Processor scope and 72h clock require inspecting email and consulting
    assert.strictEqual(ep.candidateInitialKnowledge.includes('FACT_LEGAL_CUSTOMER_VOLUME'), false);
    assert.strictEqual(ep.candidateInitialKnowledge.includes('FACT_LEGAL_72H_CLOCK_STARTED'), false);

    assert.ok(ep.unverifiedHypotheses.includes('FACT_LEGAL_CARD_DATA_EXFILTRATION_EXTENT'));
  });

  it('associates client breach and direct customer notification references', () => {
    const pkg = LEGAL_CLIENT_KNOWLEDGE_PACKAGE;
    assert.strictEqual(pkg.regulatoryReferences.length, 2);

    const clockRef = pkg.regulatoryReferences.find((r) => r.id === 'REG_LEGAL_NDPA_72H_CLIENT_CLOCK');
    assert.ok(clockRef);
    assert.strictEqual(clockRef.verificationStatus, 'STATUTORY_REFERENCE_UNVERIFIED');

    const customerNoticeRef = pkg.regulatoryReferences.find((r) => r.id === 'REG_LEGAL_CUSTOMER_BREACH_NOTICE');
    assert.ok(customerNoticeRef);
    assert.strictEqual(customerNoticeRef.verificationStatus, 'STATUTORY_REFERENCE_UNVERIFIED');
  });
});

describe('Knowledge Base - Cross-Department Character Epistemic Profiles', () => {
  it('registers comprehensive character profiles across all 4 departments', () => {
    const characters = ALL_CHARACTER_PROFILES;
    const ids = Object.keys(characters);
    assert.ok(ids.includes('tunde-bello'));
    assert.ok(ids.includes('amaka-obi'));
    assert.ok(ids.includes('yusuf-ibrahim'));
    assert.ok(ids.includes('ngozi-okafor'));
    assert.ok(ids.includes('blessing-etim'));
    assert.ok(ids.includes('musa-supervisor'));
    assert.ok(ids.includes('chidi-dispatch'));
    assert.ok(ids.includes('chinedu-eze'));
    assert.ok(ids.includes('funmi-adeyemi'));
    assert.ok(ids.includes('ifeoma-balogun'));
    assert.ok(ids.includes('folake-adebayo'));
  });

  it('retrieves initial known facts for each department character profile', () => {
    const ngoziFacts = getCharacterKnownFacts('ngozi-okafor');
    assert.ok(ngoziFacts.some((f) => f.id === 'FACT_HR_DISPUTE_PREMISE'));
    assert.ok(ngoziFacts.some((f) => f.id === 'FACT_HR_BLESSING_STATEMENT_TAKEN'));

    const blessingFacts = getCharacterKnownFacts('blessing-etim');
    assert.ok(blessingFacts.some((f) => f.id === 'FACT_HR_DISPATCH_BAG_CLAIM'));
    assert.ok(blessingFacts.some((f) => f.id === 'FACT_HR_POLICE_REPORT_THREAT'));

    const chineduFacts = getCharacterKnownFacts('chinedu-eze');
    assert.ok(chineduFacts.some((f) => f.id === 'FACT_FIN_CONTRACT_SIGNED'));
    assert.ok(chineduFacts.some((f) => f.id === 'FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY'));

    const funmiFacts = getCharacterKnownFacts('funmi-adeyemi');
    assert.ok(funmiFacts.some((f) => f.id === 'FACT_FIN_LEGAL_NEVER_REVIEWED'));
    assert.ok(funmiFacts.some((f) => f.id === 'FACT_LEGAL_CLIENT_NOTIFICATION'));

    const ifeomaFacts = getCharacterKnownFacts('ifeoma-balogun');
    assert.ok(ifeomaFacts.some((f) => f.id === 'FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED'));
    assert.ok(ifeomaFacts.some((f) => f.id === 'FACT_LEGAL_BOARD_MEETING_TIME'));
  });

  it('enforces epistemic boundaries on characters', () => {
    const musa = getCharacterProfile('musa-supervisor');
    assert.ok(musa);
    assert.ok(musa.unknownFactIds.includes('FACT_HR_BLESSING_STATEMENT_TAKEN'));
    assert.ok(musa.unknownFactIds.includes('FACT_HR_POLICE_REPORT_THREAT'));

    const chinedu = getCharacterProfile('chinedu-eze');
    assert.ok(chinedu);
    assert.ok(chinedu.unknownFactIds.includes('FACT_FIN_SUPPLIER_RENEGOTIATION_RESPONSE'));

    const ifeoma = getCharacterProfile('ifeoma-balogun');
    assert.ok(ifeoma);
    assert.ok(ifeoma.unknownFactIds.includes('FACT_LEGAL_CARD_DATA_EXFILTRATION_EXTENT'));
  });
});

describe('Knowledge Base - Candidate Knowledge Tracking Generalization & Incident Isolation', () => {
  it('initializes independent candidate discovery states for each incident', () => {
    const itTracker = new CandidateKnowledgeTracker('INC_MAIL_FIRS');
    const hrTracker = new CandidateKnowledgeTracker('INC_HR_DISPUTE');
    const finTracker = new CandidateKnowledgeTracker('INC_FIN_DIESEL');
    const legalTracker = new CandidateKnowledgeTracker('INC_LEGAL_CLIENT');

    assert.strictEqual(itTracker.hasAction('STARTING_CONTEXT'), true);
    assert.strictEqual(hrTracker.hasAction('STARTING_CONTEXT'), true);
    assert.strictEqual(finTracker.hasAction('STARTING_CONTEXT'), true);
    assert.strictEqual(legalTracker.hasAction('STARTING_CONTEXT'), true);

    // Initial facts are isolated to their respective incidents
    assert.strictEqual(itTracker.hasFact('FACT_IT_EMAIL_ARRIVED'), true);
    assert.strictEqual(itTracker.hasFact('FACT_HR_DISPUTE_PREMISE'), false);

    assert.strictEqual(hrTracker.hasFact('FACT_HR_DISPUTE_PREMISE'), true);
    assert.strictEqual(hrTracker.hasFact('FACT_FIN_CONTRACT_SIGNED'), false);

    assert.strictEqual(finTracker.hasFact('FACT_FIN_CONTRACT_SIGNED'), true);
    assert.strictEqual(finTracker.hasFact('FACT_LEGAL_CLIENT_NOTIFICATION'), false);

    assert.strictEqual(legalTracker.hasFact('FACT_LEGAL_CLIENT_NOTIFICATION'), true);
    assert.strictEqual(legalTracker.hasFact('FACT_IT_EMAIL_ARRIVED'), false);
  });

  it('progresses HR incident discovery via artifact and interview actions', () => {
    const hr = new CandidateKnowledgeTracker('INC_HR_DISPUTE');
    assert.strictEqual(hr.hasFact('FACT_HR_BLESSING_STATEMENT_TAKEN'), false);
    assert.strictEqual(hr.hasFact('FACT_HR_WITNESSES_PRESENT'), false);

    // Read artifact (Blessing written statement)
    const artifactFacts = hr.recordDiscovery('READ_INCIDENT_ARTIFACT');
    assert.ok(artifactFacts.includes('FACT_HR_BLESSING_STATEMENT_TAKEN'));
    assert.ok(artifactFacts.includes('FACT_HR_DISPATCH_BAG_CLAIM'));
    assert.strictEqual(hr.hasEvidence('EV_HR_BLESSING_STATEMENT'), true);

    // Ask interview question (Blessing follow-up on witnesses & police)
    const interviewFacts = hr.recordDiscovery('ASK_INCIDENT_INTERVIEW');
    assert.ok(interviewFacts.includes('FACT_HR_WITNESSES_PRESENT'));
    assert.ok(interviewFacts.includes('FACT_HR_POLICE_REPORT_THREAT'));
    assert.strictEqual(hr.hasEvidence('EV_HR_WITNESS_INTERVIEW_CHIDI'), true);

    // Outcome debrief unlocks resolution evidence without promoting uncertain hypotheses
    const debriefFacts = hr.recordDiscovery('OUTCOME_DEBRIEF');
    assert.deepStrictEqual(debriefFacts, []);
    assert.strictEqual(hr.hasEvidence('EV_HR_RESOLUTION_OUTCOME'), true);
    assert.strictEqual(hr.hasFact('FACT_HR_MUSA_INTENT_OR_DEFENSE'), false);
    assert.strictEqual(hr.hasFact('FACT_HR_STAFF_PETITION_RISK'), false);
  });

  it('progresses Finance incident discovery via artifact and interview actions', () => {
    const fin = new CandidateKnowledgeTracker('INC_FIN_DIESEL');
    assert.strictEqual(fin.hasFact('FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY'), false);
    assert.strictEqual(fin.hasFact('FACT_FIN_LEGAL_NEVER_REVIEWED'), false);

    // Read Clause 9 artifact
    const artifactFacts = fin.recordDiscovery('READ_INCIDENT_ARTIFACT');
    assert.ok(artifactFacts.includes('FACT_FIN_CLAUSE_9_3_TERMINATION_PENALTY'));
    assert.ok(artifactFacts.includes('FACT_FIN_CLAUSE_9_4_AUTO_RENEWAL'));
    assert.strictEqual(fin.hasEvidence('EV_FIN_CLAUSE_9_ARTIFACT'), true);

    // Interview Funmi on lack of legal review
    const interviewFacts = fin.recordDiscovery('ASK_INCIDENT_INTERVIEW');
    assert.ok(interviewFacts.includes('FACT_FIN_LEGAL_NEVER_REVIEWED'));
    assert.ok(interviewFacts.includes('FACT_FIN_GOVERNANCE_CONTROL_DEFICIT'));
    assert.strictEqual(fin.hasEvidence('EV_FIN_LEGAL_BYPASS_STATEMENT'), true);

    // Outcome debrief
    const debriefFacts = fin.recordDiscovery('OUTCOME_DEBRIEF');
    assert.deepStrictEqual(debriefFacts, []);
    assert.strictEqual(fin.hasEvidence('EV_FIN_RESOLUTION_OUTCOME'), true);
    assert.strictEqual(fin.hasFact('FACT_FIN_SUPPLIER_RENEGOTIATION_RESPONSE'), false);
  });

  it('progresses Legal incident discovery via artifact and interview actions', () => {
    const legal = new CandidateKnowledgeTracker('INC_LEGAL_CLIENT');
    assert.strictEqual(legal.hasFact('FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED'), false);
    assert.strictEqual(legal.hasFact('FACT_LEGAL_CUSTOMER_VOLUME'), false);

    // Read client urgent email
    const artifactFacts = legal.recordDiscovery('READ_INCIDENT_ARTIFACT');
    assert.ok(artifactFacts.includes('FACT_LEGAL_PROCESSOR_CLAIMS_CONTAINED'));
    assert.ok(artifactFacts.includes('FACT_LEGAL_CUSTOMERS_INQUIRING'));
    assert.strictEqual(legal.hasEvidence('EV_LEGAL_CLIENT_EMAIL'), true);

    // Interview Ifeoma on processor scope & 72h clock
    const interviewFacts = legal.recordDiscovery('ASK_INCIDENT_INTERVIEW');
    assert.ok(interviewFacts.includes('FACT_LEGAL_CUSTOMER_VOLUME'));
    assert.ok(interviewFacts.includes('FACT_LEGAL_AFFECTED_CUSTOMER_LIST_ABSENT'));
    assert.ok(interviewFacts.includes('FACT_LEGAL_72H_CLOCK_STARTED'));
    assert.strictEqual(legal.hasEvidence('EV_LEGAL_PROCESSOR_ALERT'), true);

    // Outcome debrief
    const debriefFacts = legal.recordDiscovery('OUTCOME_DEBRIEF');
    assert.deepStrictEqual(debriefFacts, []);
    assert.strictEqual(legal.hasEvidence('EV_LEGAL_RESOLUTION_OUTCOME'), true);
    assert.strictEqual(legal.hasFact('FACT_LEGAL_CARD_DATA_EXFILTRATION_EXTENT'), false);
  });

  it('guarantees complete isolation between incident trackers', () => {
    const it = new CandidateKnowledgeTracker('INC_MAIL_FIRS');
    const hr = new CandidateKnowledgeTracker('INC_HR_DISPUTE');

    // Discover in HR
    hr.recordDiscovery('READ_INCIDENT_ARTIFACT');
    hr.recordDiscovery('ASK_INCIDENT_INTERVIEW');

    // IT tracker must not be affected
    assert.strictEqual(it.hasFact('FACT_HR_BLESSING_STATEMENT_TAKEN'), false);
    assert.strictEqual(it.hasEvidence('EV_HR_BLESSING_STATEMENT'), false);
    assert.strictEqual(it.hasAction('READ_INCIDENT_ARTIFACT'), false);

    // Discover in IT
    it.recordDiscovery('INSPECT_EMAIL_HEADER');
    assert.strictEqual(hr.hasFact('FACT_IT_SENDER_FORGED'), false);
    assert.strictEqual(hr.hasEvidence('EV_IT_SENDER_HEADERS'), false);

    // Reset HR without affecting IT
    hr.reset();
    assert.strictEqual(hr.hasAction('READ_INCIDENT_ARTIFACT'), false);
    assert.strictEqual(it.hasAction('INSPECT_EMAIL_HEADER'), true);
    assert.strictEqual(it.hasFact('FACT_IT_SENDER_FORGED'), true);
  });
});

