/**
 * IT Phishing Incident - Hybrid Workplace Drama Dialogue System
 *
 * Implements the natural, interactive conversation between Amaka Obi (CCO)
 * and Tunde Bello (Head of IT) before, during, and after the phishing investigation.
 *
 * Grounded in contemporary Nigerian professional workplace communication,
 * realistic cybersecurity incident triage, and data protection compliance.
 */

import type { CandidateKnowledgeTracker } from '../knowledge/candidateKnowledge.ts';

export type PhishingOpeningOptionId =
  | 'interacted_yet'
  | 'what_suspicious'
  | 'examine_first'
  // Legacy aliases maintained for backward compatibility
  | 'opened_yet'
  | 'show_email'
  | 'dont_touch';

export interface DialogueOption {
  readonly id: PhishingOpeningOptionId;
  readonly label: string;
  readonly amakaLine: string;
  readonly tundeResponse: string;
}

export const TUNDE_OPENING_LINE =
  "Amaka, do you have a moment? Finance received an email about a tax clearance certificate. The sender looks suspicious, and I'd like us to assess the risk before taking further action.";

export const TUNDE_SPEECH_BUBBLE_PROMPT = 'Amaka, do you have a minute?';

export const PHISHING_OPENING_OPTIONS: readonly DialogueOption[] = [
  {
    id: 'interacted_yet',
    label: '“Has anyone interacted with the email?”',
    amakaLine: 'Has anyone interacted with the email?',
    tundeResponse:
      "Finance forwarded it after it arrived in their inboxes. We haven't confirmed whether anyone interacted with it yet, which is why we need to verify the message details on the terminal before taking further steps.",
  },
  {
    id: 'what_suspicious',
    label: '“What made you suspicious?”',
    amakaLine: 'What made you suspicious?',
    tundeResponse:
      "The sender domain and routing headers don't match official government infrastructure, and the urgent 12 noon deadline is a classic pressure tactic. Let's look at the raw technical headers together.",
  },
  {
    id: 'examine_first',
    label: '“Let\'s examine the message first.”',
    amakaLine: "Let's examine the message first.",
    tundeResponse:
      "Agreed. It's loaded on the workstation terminal now. Let's inspect the sender details, routing headers, and target link before we do anything else.",
  },
];

export function getOpeningOption(id: PhishingOpeningOptionId): DialogueOption | undefined {
  if (id === 'opened_yet') return PHISHING_OPENING_OPTIONS[0];
  if (id === 'dont_touch') return PHISHING_OPENING_OPTIONS[1];
  if (id === 'show_email') return PHISHING_OPENING_OPTIONS[2];
  return PHISHING_OPENING_OPTIONS.find((opt) => opt.id === id);
}

export interface InvestigationDialogueState {
  readonly credentialsSubmitted?: boolean;
  readonly linkOpened?: boolean;
  readonly isSenderInspected?: boolean;
  readonly isLinkInspected?: boolean;
  readonly candidateKnowledge?: CandidateKnowledgeTracker;
}

/**
 * Returns grounded follow-up dialogue from Tunde when Amaka revisits the desk or clicks
 * "Talk to Tunde" after investigating the email at the workstation.
 *
 * Tunde reveals that Yusuf opened the link and may have entered his password,
 * acknowledges Amaka's workstation actions distinctly from Yusuf's compromise,
 * and frames their professional division of responsibilities:
 * - Tunde: technical containment (session revocation, domain blocking, endpoint verification).
 * - Amaka: compliance, business risk, personal data exposure under the NDPA, breach register, and escalation.
 */
export function getTundeFollowupDialogue(
  _chosenOptionId?: PhishingOpeningOptionId,
  state?: InvestigationDialogueState
): string {
  const ck = state?.candidateKnowledge;
  const credentialsSubmitted = Boolean(
    state?.credentialsSubmitted || ck?.hasFact('FACT_IT_AMAKA_SUBMITTED_CREDENTIALS')
  );
  const linkOpened = Boolean(
    state?.linkOpened || ck?.hasFact('FACT_IT_AMAKA_INSPECTION_ONLY')
  );
  const isSenderOrLinkInspected = Boolean(
    state?.isSenderInspected ||
      state?.isLinkInspected ||
      ck?.hasFact('FACT_IT_SENDER_FORGED') ||
      ck?.hasFact('FACT_IT_LINK_HARVESTS_CREDENTIALS')
  );

  if (credentialsSubmitted) {
    return (
      "Amaka, Finance called while you were at the terminal. Yusuf admitted he opened the link and entered his password. " +
      "On top of that, your simulation test submitted credentials on the external portal, creating two separate exposures. " +
      "IT is immediately revoking active session tokens, forcing password resets, and blocking the phishing domain. " +
      "As CCO, you'll need to document both exposures in our incident register, evaluate personal data exposure under the NDPA, and coordinate executive escalation."
    );
  }
  if (linkOpened) {
    return (
      "Finance confirmed Yusuf opened the link and may have submitted his password. " +
      "Your workstation check confirmed the portal directly harvests corporate credentials, though fortunately your machine submitted nothing. " +
      "IT is handling technical containment—revoking Yusuf's sessions, verifying endpoint integrity, and blocking the domain. " +
      "You should document the incident in our compliance register, evaluate potential personal data exposure under NDPA guidelines, and prepare the management briefing."
    );
  }
  if (isSenderOrLinkInspected) {
    return (
      "While you analyzed the technical headers, Yusuf admitted he opened the link and may have entered his password. " +
      "Your inspection confirmed forged headers from a Russian relay. " +
      "IT will handle technical containment by resetting Yusuf's account and blocking the domain at the perimeter. " +
      "Please assess our business risk, log the breach in our compliance register under the NDPA, and prepare the escalation notice."
    );
  }

  return (
    "Finance just reported that Yusuf opened the link and may have typed his password. " +
    "We need to inspect the technical headers on the terminal immediately. " +
    "IT will coordinate session revocation and perimeter blocking, while you determine our business risk, NDPA exposure, and incident documentation requirements."
  );
}

export interface FollowupDialogueExchange {
  readonly tundeLine: string;
  readonly amakaLine: string;
  readonly tundeClosing: string;
}

/**
 * Provides a structured follow-up conversation exchange between Tunde and Amaka
 * dividing technical containment from compliance and regulatory escalation.
 */
export function getFollowupExchange(state?: InvestigationDialogueState): FollowupDialogueExchange {
  const tundeLine = getTundeFollowupDialogue(undefined, state);
  const ck = state?.candidateKnowledge;
  const credentialsSubmitted = Boolean(
    state?.credentialsSubmitted || ck?.hasFact('FACT_IT_AMAKA_SUBMITTED_CREDENTIALS')
  );
  const linkOpened = Boolean(
    state?.linkOpened || ck?.hasFact('FACT_IT_AMAKA_INSPECTION_ONLY')
  );
  const isSenderOrLinkInspected = Boolean(
    state?.isSenderInspected ||
      state?.isLinkInspected ||
      ck?.hasFact('FACT_IT_SENDER_FORGED') ||
      ck?.hasFact('FACT_IT_LINK_HARVESTS_CREDENTIALS')
  );

  let amakaLine =
    "Understood, Tunde. Contain Yusuf's account immediately and block the domain on the firewall. I am recording this in our compliance incident register, assessing potential data exposure under the NDPA, and briefing executive leadership.";

  if (credentialsSubmitted) {
    amakaLine =
      "Understood, Tunde. Execute emergency session revocation immediately. I am recording both compromised accounts in our compliance incident register, evaluating exposure under the NDPA, and alerting executive leadership.";
  } else if (linkOpened) {
    amakaLine =
      "Proceed with Yusuf's session revocation and gateway blocking. I will log the incident in our compliance incident register, determine what information was accessed, and draft our risk assessment.";
  } else if (isSenderOrLinkInspected) {
    amakaLine =
      "Proceed with perimeter blocking and resetting Yusuf's credentials. I'll document the attempted attack in our compliance incident register, assess business risk under the NDPA, and prepare the management briefing.";
  }

  const tundeClosing =
    "Understood. Let's make sure our containment directive is confirmed on the workstation.";

  return {
    tundeLine,
    amakaLine,
    tundeClosing,
  };
}

export interface OutcomeConversation {
  readonly branch: 'proper_reporting' | 'disclosed_containment' | 'deleted_unescalated';
  readonly title: string;
  readonly tundeLine: string;
  readonly amakaLine: string;
}

/**
 * Returns branch-specific post-incident debrief conversation between Tunde and Amaka
 * reflecting what actually occurred without unsupported security or regulatory claims.
 */
export function getPhishingOutcomeConversation(choiceId: string): OutcomeConversation {
  switch (choiceId) {
    case 'CHOICE_MAIL_REPORT':
      return {
        branch: 'proper_reporting',
        title: 'Suspicious Email Reported & Perimeter Containment Coordinated',
        tundeLine:
          "Perimeter gateway blocked the domain and I've reset Yusuf's account. Good catch reporting it before any wire transfer went through.",
        amakaLine:
          "I have recorded the incident in our compliance breach register. While our workstation inspection confirmed no credentials were submitted from this terminal, Yusuf may have entered his password before containment began. We must establish what information was accessed, assess the risk to affected individuals, document our findings, and determine whether regulatory notification is required under applicable law.",
      };

    case 'CHOICE_MAIL_INSPECTED_REPORT':
      return {
        branch: 'proper_reporting',
        title: 'Phishing Link Reported After Inspection & Verified',
        tundeLine:
          "Gateway block is active and your machine scanned clean. Good thing you didn't enter your password on that fake portal.",
        amakaLine:
          "The incident is documented in our compliance register. Although your terminal accessed the link without entering credentials, Yusuf's potential password submission remains an active exposure. We must establish what information was accessed, assess the risk to affected individuals, document our findings, and determine whether regulatory notification is required under applicable law.",
      };

    case 'CHOICE_MAIL_OPEN_CONTAINED':
      return {
        branch: 'disclosed_containment',
        title: 'Emergency Credential Exposure Disclosed & Contained',
        tundeLine:
          "I've killed active sessions and forced password resets for both accounts. Entering your password was a close call, but reporting it immediately saved us from a major breach.",
        amakaLine:
          "Immediate disclosure prevented a catastrophic payment fraud event, but corporate credentials for two accounts were exposed to an external threat actor. I have logged the exposure in our register and placed a hold on outward payments. We must establish what information was accessed before session revocation, assess the risk to affected individuals, document our findings, and determine whether regulatory notification is required under applicable law.",
      };

    case 'CHOICE_MAIL_OPEN':
      return {
        branch: 'deleted_unescalated',
        title: 'Credential Exposure Concealed Without Escalation',
        tundeLine:
          "Entering your password on an attacker's site and deleting the mail left us wide open. The attacker still has active access to company systems.",
        amakaLine:
          "Concealing credential exposure leaves active adversary sessions uncontained and directly breaches corporate governance. We cannot establish what information was accessed while the account remained exposed. We must immediately initiate containment, assess the critical risk to affected individuals, document our findings, and determine whether regulatory notification is required under applicable law.",
      };

    case 'CHOICE_MAIL_DELETE':
    default:
      return {
        branch: 'deleted_unescalated',
        title: 'Message Deleted Without Proper Escalation',
        tundeLine:
          "Deleting the email from your inbox didn't protect anyone else. The fake domain was left unblocked and Yusuf's account stayed compromised.",
        amakaLine:
          "Deleting without escalation breaches our compliance duties. With Yusuf's credentials compromised and the phishing domain unblocked, we have no visibility into what information was accessed. We must urgently audit all affected mailboxes, assess the risk to affected individuals, document our findings, and determine whether regulatory notification is required under applicable law.",
      };
  }
}

// ============================================================================
// DETERMINISTIC QUESTION-RESPONSE HANDLER
// ============================================================================

export type PhishingQuestionCategory =
  | 'what_happened'
  | 'yusuf_actions'
  | 'email_authenticity'
  | 'available_evidence'
  | 'account_access'
  | 'immediate_risks'
  | 'next_steps'
  | 'ndpa_compliance'
  | 'greeting'
  | 'ambiguous';

export interface TundeQuestionAnswer {
  readonly category: PhishingQuestionCategory;
  readonly response: string;
}

/**
 * Normalizes question text for robust keyword and pattern matching.
 */
function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’"”]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates candidate questions posed to Tunde Bello during desk conversation.
 *
 * Guarantees:
 * - Deterministic intent recognition covering natural phrasing variations.
 * - Strictly respects information boundaries (e.g. does not claim investigation is
 *   complete or reveal workstation discoveries before the terminal is inspected).
 * - Avoids premature conclusions or invented facts.
 * - Responds naturally in authentic Nigerian tech-lead workplace voice.
 */
export function answerTundeQuestion(
  question: string,
  state?: InvestigationDialogueState
): TundeQuestionAnswer {
  const normalized = normalizeQuestionText(question);
  if (!normalized) {
    return {
      category: 'ambiguous',
      response:
        "I'm listening, Amaka. What would you like to know about this tax email before we inspect the terminal?",
    };
  }

  const ck = state?.candidateKnowledge;

  // Has candidate investigated technical headers / destination?
  const isInspected = Boolean(
    state?.isSenderInspected ||
      state?.isLinkInspected ||
      state?.linkOpened ||
      state?.credentialsSubmitted ||
      ck?.hasFact('FACT_IT_SENDER_FORGED') ||
      ck?.hasFact('FACT_IT_LINK_HARVESTS_CREDENTIALS') ||
      ck?.hasFact('FACT_IT_AMAKA_INSPECTION_ONLY') ||
      ck?.hasFact('FACT_IT_AMAKA_SUBMITTED_CREDENTIALS')
  );

  const hasCredentialsSubmitted = Boolean(
    state?.credentialsSubmitted || ck?.hasFact('FACT_IT_AMAKA_SUBMITTED_CREDENTIALS')
  );

  const hasLinkOpened = Boolean(
    state?.linkOpened ||
      ck?.hasFact('FACT_IT_AMAKA_INSPECTION_ONLY') ||
      ck?.hasFact('FACT_IT_AMAKA_SUBMITTED_CREDENTIALS')
  );

  // Gated: Has Finance reported Yusuf's admission?
  const hasYusufAdmitted = ck
    ? ck.hasFact('FACT_IT_YUSUF_ADMISSION')
    : Boolean(isInspected || state?.linkOpened || state?.credentialsSubmitted);

  // 1. NDPA & Regulatory Compliance Obligations
  if (
    normalized.includes('ndpa') ||
    normalized.includes('compliance') ||
    normalized.includes('breach register') ||
    normalized.includes('data protection') ||
    normalized.includes('regulat') ||
    normalized.includes('nitda') ||
    normalized.includes('commissioner') ||
    (normalized.includes('notif') && !normalized.includes('notification sound'))
  ) {
    return {
      category: 'ndpa_compliance',
      response:
        "Under the Nigeria Data Protection Act (NDPA), our priority is documenting the incident in our internal breach register. As CCO, you'll need to assess the likelihood and severity of harm to affected individuals before determining whether formal regulatory notification is required. Technical containment comes first so we stop active exposure.",
    };
  }

  // 2. Yusuf's Actions & Employee Interaction
  const mentionsYusuf = normalized.includes('yusuf') || normalized.includes('ibrahim');
  const mentionsInteraction =
    normalized.includes('interact') ||
    normalized.includes('fall for') ||
    ((normalized.includes('anyone') ||
      normalized.includes('someone') ||
      normalized.includes('anybody') ||
      normalized.includes('staff') ||
      normalized.includes('employee') ||
      normalized.includes('finance')) &&
      (normalized.includes('click') ||
        normalized.includes('open') ||
        normalized.includes('enter') ||
        normalized.includes('type') ||
        normalized.includes('submit') ||
        normalized.includes('touch') ||
        normalized.includes('read')));

  if (mentionsYusuf || mentionsInteraction) {
    if (hasYusufAdmitted) {
      return {
        category: 'yusuf_actions',
        response:
          "Finance phoned while you were at the terminal. Yusuf admitted he opened the link and may have entered his password on the external portal. That's why we must revoke his active sessions and force a password reset immediately.",
      };
    }
    return {
      category: 'yusuf_actions',
      response:
        "Finance forwarded the message to IT as soon as it appeared in their inboxes. At this moment, we haven't confirmed whether Yusuf or anyone else in Finance opened the attachment link or entered passwords. That's exactly why we need to examine the message details on the terminal before jumping to conclusions.",
    };
  }

  // 3. Email Authenticity & Sender Verification
  const mentionsAuthenticity =
    normalized.includes('authentic') ||
    normalized.includes('legit') ||
    normalized.includes('genuine') ||
    normalized.includes('fake') ||
    normalized.includes('spoof') ||
    normalized.includes('scam') ||
    normalized.includes('phish') ||
    normalized.includes('firs gov') ||
    normalized.includes('firs') ||
    normalized.includes('domain') ||
    normalized.includes('real email') ||
    normalized.includes('is it real') ||
    normalized.includes('is this real') ||
    normalized.includes('sender real');

  if (mentionsAuthenticity) {
    if (isInspected) {
      return {
        category: 'email_authenticity',
        response:
          "It is definitively a fake. Terminal inspection confirmed the Return-Path routes through a Russian relay (185.220.101.44), SPF failed, and the domain firs-gov.com.ng was registered only 3 days ago. It has zero legitimate connection to the Federal Inland Revenue Service.",
      };
    }
    return {
      category: 'email_authenticity',
      response:
        "Official government correspondence from the FIRS uses the .gov.ng domain (specifically firs.gov.ng). This email came from support@firs-gov.com.ng, which is an external lookalike domain. It looks like a classic impersonation attack, but we need to inspect the raw technical headers on the terminal to verify the relay source.",
    };
  }

  // 4. Available Forensic Evidence & Technical Headers
  const mentionsEvidence =
    normalized.includes('evidence') ||
    normalized.includes('header') ||
    normalized.includes('headers') ||
    normalized.includes('proof') ||
    normalized.includes('forensic') ||
    normalized.includes('what do we know') ||
    normalized.includes('what have we found') ||
    normalized.includes('what have you found') ||
    normalized.includes('findings') ||
    normalized.includes('technical details');

  if (mentionsEvidence) {
    if (isInspected) {
      if (hasCredentialsSubmitted) {
        return {
          category: 'available_evidence',
          response:
            "We have clear forensic evidence: forged headers via a Russian relay (185.220.101.44), failed SPF, an unencrypted HTTP link, and Yusuf's password submission, compounded by portal credentials submitted during testing.",
        };
      }
      if (hasLinkOpened) {
        return {
          category: 'available_evidence',
          response:
            "Our evidence confirms forged routing headers via a Russian relay (185.220.101.44), failed SPF, an insecure HTTP link mimicking FIRS e-Services, and Yusuf's admission that he clicked the link.",
        };
      }
      return {
        category: 'available_evidence',
        response:
          "Terminal inspection confirmed the email forged its sender address, routed through a Russian relay (185.220.101.44), and failed SPF verification. The lookalike domain firs-gov.com.ng was registered just 3 days ago.",
      };
    }
    return {
      category: 'available_evidence',
      response:
        "Right now, our evidence is the email message itself: the lookalike sender address support@firs-gov.com.ng, the urgent 12 noon deadline, and Finance's initial report. The raw technical headers, SPF records, and destination URL are loaded on the workstation terminal waiting for us to inspect them.",
    };
  }

  // 5. Account Access, Credentials & Compromise Scope
  const mentionsAccess =
    normalized.includes('compromis') ||
    normalized.includes('breach') ||
    normalized.includes('hack') ||
    normalized.includes('infiltrat') ||
    normalized.includes('credential') ||
    normalized.includes('password') ||
    normalized.includes('stolen') ||
    normalized.includes('session') ||
    normalized.includes('account access') ||
    normalized.includes('system access') ||
    normalized.includes('are accounts') ||
    normalized.includes('our systems') ||
    normalized.includes('did they get in');

  if (mentionsAccess) {
    if (hasCredentialsSubmitted) {
      return {
        category: 'account_access',
        response:
          "Yes, corporate credentials were submitted to the attacker's portal. Active session tokens were transmitted, giving the attacker potential access to corporate systems until we revoke sessions and reset passwords.",
      };
    }
    if (hasYusufAdmitted) {
      return {
        category: 'account_access',
        response:
          "Yusuf reported entering his password, so his corporate account is considered actively compromised until we reset it. We haven't seen signs of wider network infiltration, but his specific mailbox and systems must be locked down immediately.",
      };
    }
    return {
      category: 'account_access',
      response:
        "We don't have evidence of an active network breach at this point. A phishing email in an inbox is an attempted attack, but corporate accounts are only compromised if an employee clicked the link and submitted credentials. We need to check the terminal and review gateway logs to know for sure.",
    };
  }

  // 6. Immediate Risks & Business Impact
  const mentionsRisks =
    normalized.includes('risk') ||
    normalized.includes('danger') ||
    normalized.includes('threat') ||
    normalized.includes('impact') ||
    normalized.includes('lose money') ||
    normalized.includes('loss') ||
    normalized.includes('consequence') ||
    normalized.includes('what could happen') ||
    normalized.includes('worst case') ||
    normalized.includes('business risk');

  if (mentionsRisks) {
    return {
      category: 'immediate_risks',
      response:
        "The primary operational danger is Business Email Compromise and payment fraud. If an attacker controls a Finance mailbox, they can monitor invoice communications, alter bank wire details, and divert corporate funds. There is also NDPA liability if company or customer records are exposed.",
    };
  }

  // 7. Next Steps & Recommended Actions
  const mentionsNextSteps =
    normalized.includes('what should we do') ||
    normalized.includes('next step') ||
    normalized.includes('recommend') ||
    normalized.includes('how do we handle') ||
    normalized.includes('what to do') ||
    normalized.includes('what do you suggest') ||
    normalized.includes('how should we proceed') ||
    normalized.includes('action plan') ||
    normalized.includes('what now');

  if (mentionsNextSteps) {
    if (isInspected) {
      return {
        category: 'next_steps',
        response:
          "We must execute our containment decision on the workstation: revoke Yusuf's session tokens, force a corporate password reset, and block firs-gov.com.ng across the mail perimeter.",
      };
    }
    return {
      category: 'next_steps',
      response:
        "Our immediate next step is to examine the message details and target link together on the workstation terminal. Once we establish the exact technical facts, IT will handle perimeter containment while you evaluate our compliance and regulatory exposure.",
    };
  }

  // 8. General Scenario Premise & What Happened
  const mentionsPremise =
    normalized.includes('what happened') ||
    normalized.includes('what is going on') ||
    normalized.includes('whats going on') ||
    normalized.includes('what is happening') ||
    normalized.includes('whats happening') ||
    normalized.includes('tell me what happened') ||
    normalized.includes('what is this') ||
    normalized.includes('whats this') ||
    normalized.includes('what is the situation') ||
    normalized.includes('whats the situation') ||
    normalized.includes('why did you call') ||
    normalized.includes('why am i here') ||
    normalized.includes('what is the issue') ||
    normalized.includes('what is the problem') ||
    normalized.includes('explain the situation');

  if (mentionsPremise) {
    return {
      category: 'what_happened',
      response:
        "Finance flagged an email claiming our 2025 Tax Clearance Certificate is ready for download, with an urgent 12 noon deadline threatening rejected filing if we don't log in immediately. The sender domain looks suspicious, so I called you in to evaluate the risk before anyone panics or takes action.",
    };
  }

  // 9. Greetings & Polite Salutations
  const mentionsGreeting =
    normalized === 'hello' ||
    normalized === 'hi' ||
    normalized.startsWith('hello ') ||
    normalized.startsWith('hi ') ||
    normalized.startsWith('good morning') ||
    normalized.startsWith('good afternoon') ||
    normalized.startsWith('hey') ||
    normalized === 'tunde';

  if (mentionsGreeting) {
    return {
      category: 'greeting',
      response:
        "Good morning, Amaka. Let's stay focused on this tax email from Finance. What would you like to know before we inspect the terminal?",
    };
  }

  // 10. Ambiguous or Unsupported Questions (Fallback)
  return {
    category: 'ambiguous',
    response:
      "I want to make sure I give you accurate information, Amaka. Could you clarify what you mean regarding this tax email, or should we examine the technical headers on the workstation terminal?",
  };
}
