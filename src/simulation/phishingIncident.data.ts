/**
 * Mustarred Company Simulator - First Playable Incident: Phishing Attack
 *
 * Declarative scenario definition modeling an active credential harvest and
 * unauthorized session breach in Accounts Payable, with realistic cross-departmental
 * trade-offs across IT, Finance, HR, and Legal.
 *
 * INVARIANTS:
 * - Strictly headless: 0 Phaser, 0 DOM, 0 browser dependencies.
 * - Integer minor currency units (cents) throughout ($250,000 = 25_000_000).
 * - Normalized metrics in [0, 100].
 */

import type {
  Incident,
  Scenario,
  ScenarioChoice,
  ScenarioInitialConditions,
} from './types.ts';

// ============================================================================
// 1. INITIAL CONDITIONS
// ============================================================================

export const PHISHING_INITIAL_CONDITIONS: ScenarioInitialConditions = {
  startingCash: 25_000_000, // $250,000.00 liquid cash reserves
  startingGrossMonthlyBurn: 2_000_000, // $20,000.00 / month operating burn
  startingDebt: 0, // Zero debt baseline
  startingHrMorale: 75,
  startingItStability: 70,
};

// ============================================================================
// 2. PHISHING INCIDENT CHOICES
// ============================================================================

export const PHISHING_CHOICES: readonly ScenarioChoice[] = [
  // 1. Immediate Lockout & Token Revocation
  {
    id: 'CHOICE_PHISH_LOCKDOWN',
    label: 'Immediately Revoke Active Sessions & Lock Tom Bradley\'s SSO Account',
    description:
      'Direct IT to immediately sever all active session tokens, invalidate Tom\'s single-sign-on credentials, and freeze Accounts Payable outbound payment API keys to stop any pending wire transfers.',
    executiveRationale:
      'Prioritize immediate threat containment and asset protection over operational friction and employee surprise.',
    baseImpact: {
      cashDelta: -300_000, // -$3,000
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -5,
      itDelta: 15,
      operationalExplanation:
        'Maya Lin severed the active session within 90 seconds. The intruder was evicted before downloading files or modifying wire templates. Re-verifying tonight\'s frozen payroll batch required $3,000 in expedited off-cycle banking fees, and Tom was embarrassed by the sudden lockout at his desk.',
    },
    learningFeedback: {
      corePrinciple: 'Decisive Containment vs. Operational Disruption',
      tradeoffSummary:
        'Severing credentials instantly prevents unauthorized transactions and stops lateral movement, but halts legitimate payment workflows and requires emergency banking verification fees.',
      risksCreated: [
        'Tonight\'s vendor payment run is delayed 4 hours for manual audit.',
        'Minor employee embarrassment from sudden workstation lockout.',
      ],
    },
  },

  // 2. Silent Surveillance & Tracing
  {
    id: 'CHOICE_PHISH_MONITOR',
    label: 'Silently Monitor the Active Session to Trace the Attacker\'s Targets',
    description:
      'Instruct IT to maintain the connection with verbose packet capture to see what the intruder searches for, identify their infrastructure, and attempt to gather counter-intelligence before taking disruptive action.',
    executiveRationale:
      'Gather actionable intelligence on the adversary without tipping them off prematurely.',
    baseImpact: {
      cashDelta: -2_500_000, // -$25,000
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 0,
      itDelta: -15,
      operationalExplanation:
        'While IT monitored the session, the intruder used Tom\'s authenticated session to approve an urgent pending supplier wire redirect for $25,000 and created hidden mailbox forwarding rules before disconnecting.',
    },
    learningFeedback: {
      corePrinciple: 'The Lethal Risk of Passive Monitoring in Production',
      tradeoffSummary:
        'Allowing an adversary to roam inside an active privileged session to gather intelligence frequently backfires, giving attackers time to exfiltrate data, alter financial records, or plant persistence.',
      risksCreated: [
        '$25,000 in fraudulent wire transfers sent to an unrecoverable overseas account.',
        'Attacker planted automated email forwarding rules in Tom\'s inbox.',
        'Triggers mandatory 72-hour regulatory data breach notification under GDPR/state privacy laws.',
      ],
    },
  },

  // 3. Contact Employee First & Verify
  {
    id: 'CHOICE_PHISH_VERIFY',
    label: 'Call Tom Bradley at His Desk Immediately to Confirm the Login',
    description:
      'Contact Tom Bradley directly on his desk phone to confirm whether he authorized the Frankfurt login or clicked an unexpected link, verifying the facts before freezing company-wide financial processing.',
    executiveRationale:
      'Preserve employee trust and confirm ground truth before initiating disruptive incident response protocols.',
    baseImpact: {
      cashDelta: -500_000, // -$5,000
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 5,
      itDelta: -5,
      operationalExplanation:
        'Tom answered immediately, trembling as he realized he had fallen for a spoofed CEO email 20 minutes earlier. The 15-minute phone call allowed the attacker to preview Accounts Payable spreadsheets, but IT killed the session before any wire payments were released. Secondary password resets and invoice checks cost $5,000.',
    },
    learningFeedback: {
      corePrinciple: 'Human-Centered Incident Response & Psychological Safety',
      tradeoffSummary:
        'Calling the employee preserves dignity and fosters a culture of voluntary disclosure, but the verification delay provides a brief window of adversary access.',
      risksCreated: [
        'A 15-minute verification delay allowed the attacker to view internal supplier invoices.',
        '$5,000 in secondary forensic review and credential cycling expenses.',
      ],
    },
  },

  // 4. Ignore Alert as False Positive
  {
    id: 'CHOICE_PHISH_IGNORE',
    label: 'Dismiss Alert as an Offshore VPN Routing Glitch & Continue Operations',
    description:
      'Conclude that the anomalous Frankfurt IP is simply an automated cloud sync or third-party ISP routing hop. Avoid interrupting executive workflow or alarming department staff.',
    executiveRationale:
      'Prevent operational paralysis caused by false positives and avoid unnecessary alert fatigue.',
    baseImpact: {
      cashDelta: -4_500_000, // -$45,000
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -20,
      itDelta: -30,
      operationalExplanation:
        'Dismissing the alert resulted in a catastrophic breach. The attacker leveraged Tom\'s session to alter ACH payment routing profiles overnight, siphoning $45,000 in vendor disbursements and deploying persistent web shells across internal finance servers.',
    },
    learningFeedback: {
      corePrinciple: 'Alert Fatigue & Operational Complacency',
      tradeoffSummary:
        'Ignoring high-fidelity anomaly telemetry in privileged environments under the assumption of a false positive leads to uncontained compromise and massive financial losses.',
      risksCreated: [
        '$45,000 direct cash siphoned via automated clearinghouse (ACH) fraud.',
        'Severe collapse in team trust after staff learn leadership dismissed active intrusion alerts.',
        'Legal liability and regulatory fines for willful negligence.',
      ],
    },
  },
];

// ============================================================================
// 3. INCIDENT DEFINITION
// ============================================================================

export const PHISHING_INCIDENT: Incident = {
  id: 'INC_PHISH_1',
  turn: 1,
  department: 'IT',
  title: 'Active Credential Phishing & Unauthorized Session',
  urgency: 'critical',
  basePremise:
    'At 09:14 AM, automated identity monitoring detected a suspicious concurrent login using the corporate Single Sign-On (SSO) credentials of Tom Bradley, Senior Financial Analyst in Accounts Payable. The login originated from an unlisted commercial hosting provider in Frankfurt, Germany, while Tom\'s primary workstation remains active from company headquarters in Chicago.',
  businessContext:
    'Tom has authorization to draft and approve supplier wire transfers up to $50,000. Telemetry shows the Frankfurt connection navigated directly to the internal Vendor Payment Approval queue. The session is active right now. IT Security Lead Maya Lin has requested immediate executive direction on how to respond.',
  narrativeVariants: [
    {
      variantId: 'VAR_PHISH_DEFAULT',
      conditions: [],
      leadInText:
        'Maya Lin flags an active session anomaly originating from Frankfurt on Tom Bradley\'s Accounts Payable credentials and requests an immediate executive directive.',
    },
  ],
  choices: PHISHING_CHOICES,
};

// ============================================================================
// 4. SCENARIO PACKAGE
// ============================================================================

export const PHISHING_SCENARIO: Scenario = {
  id: 'SCENARIO_PHISHING_ATTACK',
  title: 'Mustarred Executive Simulator - Incident 1: Phishing Attack',
  targetAudience: 'Executive Leadership & Technical Incident Commanders',
  learningObjectives: [
    'Assess anomalous session telemetry versus false positives in production environments',
    'Balance rapid containment against operational continuity and employee trust',
    'Evaluate cross-departmental ramifications across IT, Finance, HR, and Legal',
  ],
  totalTurns: 1,
  initialConditions: PHISHING_INITIAL_CONDITIONS,
  incidents: [PHISHING_INCIDENT],
  modifiers: [],
};
