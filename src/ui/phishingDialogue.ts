/**
 * IT Phishing Incident - Hybrid Workplace Drama Dialogue System
 *
 * Implements the natural, interactive conversation between Amaka Obi (CCO)
 * and Tunde Bello (Head of IT) before, during, and after the phishing investigation.
 *
 * Grounded in contemporary Nigerian professional workplace communication,
 * realistic cybersecurity incident triage, and data protection compliance.
 */

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
  if (state?.credentialsSubmitted) {
    return (
      "Amaka, Finance called while you were at the terminal. Yusuf admitted he opened the link and entered his password. " +
      "On top of that, your simulation test submitted credentials on the external portal, creating two separate exposures. " +
      "IT is immediately revoking active session tokens, forcing password resets, and blocking the phishing domain. " +
      "As CCO, you'll need to document both exposures in our incident register, evaluate personal data exposure under the NDPA, and coordinate executive escalation."
    );
  }
  if (state?.linkOpened) {
    return (
      "Finance confirmed Yusuf opened the link and may have submitted his password. " +
      "Your workstation check confirmed the portal directly harvests corporate credentials, though fortunately your machine submitted nothing. " +
      "IT is handling technical containment—revoking Yusuf's sessions, verifying endpoint integrity, and blocking the domain. " +
      "You should document the incident in our compliance register, evaluate potential personal data exposure under NDPA guidelines, and prepare the management briefing."
    );
  }
  if (state?.isSenderInspected || state?.isLinkInspected) {
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

  let amakaLine =
    "Understood, Tunde. Contain Yusuf's account immediately and block the domain on the firewall. I am recording this in our compliance incident register, assessing potential data exposure under the NDPA, and briefing executive leadership.";

  if (state?.credentialsSubmitted) {
    amakaLine =
      "Understood, Tunde. Execute emergency session revocation immediately. I am recording both compromised accounts in our compliance incident register, evaluating exposure under the NDPA, and alerting executive leadership.";
  } else if (state?.linkOpened) {
    amakaLine =
      "Proceed with Yusuf's session revocation and gateway blocking. I will log the incident in our compliance incident register, determine what information was accessed, and draft our risk assessment.";
  } else if (state?.isSenderInspected || state?.isLinkInspected) {
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
          "Perimeter mail gateway has blacklisted the sender domain firs-gov.com.ng and blocked the Russian relay IP. Yusuf's session tokens have been revoked and his credentials reset across Active Directory. Telemetry shows no unauthorized outbound traffic from any other department.",
        amakaLine:
          "I have recorded the incident in our compliance breach register. While our workstation inspection confirmed no credentials were submitted from this terminal, Yusuf may have entered his password before containment began. We must establish what information was accessed, assess the risk to affected individuals, document our findings, and determine whether regulatory notification is required under applicable law.",
      };

    case 'CHOICE_MAIL_INSPECTED_REPORT':
      return {
        branch: 'proper_reporting',
        title: 'Phishing Link Reported After Inspection & Verified',
        tundeLine:
          "Gateway blocking is active for firs-gov.com.ng, Yusuf's account is locked and reset, and local endpoint telemetry confirms no malicious scripts or payloads were dropped on your machine when the URL was loaded.",
        amakaLine:
          "The incident is documented in our compliance register. Although your terminal accessed the link without entering credentials, Yusuf's potential password submission remains an active exposure. We must establish what information was accessed, assess the risk to affected individuals, document our findings, and determine whether regulatory notification is required under applicable law.",
      };

    case 'CHOICE_MAIL_OPEN_CONTAINED':
      return {
        branch: 'disclosed_containment',
        title: 'Emergency Credential Exposure Disclosed & Contained',
        tundeLine:
          "Emergency protocol executed. Active session tokens for both you and Yusuf were revoked within minutes, and passwords were reset across Active Directory. The external harvester captured passwords, but rapid token revocation prevented unauthorized inbox access or payment manipulation.",
        amakaLine:
          "Immediate disclosure prevented a catastrophic payment fraud event, but corporate credentials for two accounts were exposed to an external threat actor. I have logged the exposure in our register and placed a hold on outward payments. We must establish what information was accessed before session revocation, assess the risk to affected individuals, document our findings, and determine whether regulatory notification is required under applicable law.",
      };

    case 'CHOICE_MAIL_OPEN':
      return {
        branch: 'deleted_unescalated',
        title: 'Credential Exposure Concealed Without Escalation',
        tundeLine:
          "Corporate credentials were submitted to an untrusted external server and no containment was requested. The threat actor holds active access into company systems, and Yusuf's account remains compromised.",
        amakaLine:
          "Concealing credential exposure leaves active adversary sessions uncontained and directly breaches corporate governance. We cannot establish what information was accessed while the account remained exposed. We must immediately initiate containment, assess the critical risk to affected individuals, document our findings, and determine whether regulatory notification is required under applicable law.",
      };

    case 'CHOICE_MAIL_DELETE':
    default:
      return {
        branch: 'deleted_unescalated',
        title: 'Message Deleted Without Proper Escalation',
        tundeLine:
          "Deleting the email from your inbox did not remove it from the eleven other staff inboxes. The malicious domain was not blocked on the gateway, and Yusuf's compromised account was left completely uncontained.",
        amakaLine:
          "Deleting without escalation breaches our compliance duties. With Yusuf's credentials compromised and the phishing domain unblocked, we have no visibility into what information was accessed. We must urgently audit all affected mailboxes, assess the risk to affected individuals, document our findings, and determine whether regulatory notification is required under applicable law.",
      };
  }
}
