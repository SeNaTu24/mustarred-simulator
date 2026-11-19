/**
 * Mustarred Company Simulator - Scenario: Monday morning in Lekki
 *
 * Four desks, four different jobs — not four versions of the same menu.
 *
 * Turn 1 → IT:      A phishing mail arrives in your own inbox. You triage it.
 * Turn 2 → PEOPLE:  A supervisor slapped the office assistant. You hear both sides.
 * Turn 3 → FINANCE: A diesel contract was signed without Legal reading page 9.
 * Turn 4 → LEGAL:   A client's payment processor has had a data breach. You advise.
 */

import type {
  ChoiceModifier,
  Incident,
  Scenario,
  ScenarioChoice,
  ScenarioInitialConditions,
} from './types.ts';

// ============================================================================
// 1. INITIAL CONDITIONS
// ============================================================================

export const MONDAY_INITIAL_CONDITIONS: ScenarioInitialConditions = {
  startingCash: 32_000_000, // $320,000 in the account
  startingGrossMonthlyBurn: 2_200_000, // $22,000 a month
  startingDebt: 0,
  startingHrMorale: 70,
  startingItStability: 66,
  loanTerms: {
    annualInterestRate: 0.08,
    monthlyPrincipalAmortization: 350_000,
  },
};

// ============================================================================
// 2. TURN 1 — IT: a phishing mail in your inbox
// ============================================================================

export const CHOICES_IT_MAIL: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_MAIL_REPORT',
    label: 'Report the suspicious message and coordinate containment',
    description: 'Report forged technical headers to IT to block the sender domain on the gateway and coordinate enterprise containment.',
    executiveRationale: 'Immediate reporting ensures company-wide perimeter containment and secures compromised colleague credentials.',
    isDefault: true,
    baseImpact: {
      cashDelta: -12_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 2,
      itDelta: 8,
      operationalExplanation:
        'Tunde blocked the sender at 09:40 and reset Yusuf\'s Active Directory password before any wire change could occur.',
    },
    learningFeedback: {
      corePrinciple: 'Prompt reporting and perimeter containment protect the entire organization',
      tradeoffSummary:
        'Done well: Reporting the message without interacting allowed IT to block the malicious domain on the gateway and contain Yusuf\'s compromised account before attackers could pivot. Why it matters: Spear-phishing targets individual employees to gain initial enterprise access.',
      risksCreated: [
        'Preserve email headers and gateway logs in the incident register for audit',
        'Verify whether any of the other 10 recipients interacted with the message',
        'Schedule a brief awareness update for Finance on tax-themed phishing indicators',
      ],
    },
  },
  {
    id: 'CHOICE_MAIL_OPEN',
    label: 'Delete the message without proper escalation',
    description: 'Submitted credentials on the external page and deleted the email without reporting, leaving the compromise uncontained.',
    executiveRationale: 'Entered corporate credentials on the portal and chose to conceal the mistake rather than report it.',
    baseImpact: {
      cashDelta: -50_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -4,
      itDelta: -14,
      operationalExplanation:
        'The page asked for your company password and you typed it. Whoever sent the mail now has a mailbox that can approve payments.',
    },
    scheduledDelayedEffect: {
      effectId: 'EFF_MAIL_CREDENTIALS_USED',
      triggerTurn: 3,
      executionStage: 'TURN_START_BEFORE_INCIDENT',
      canTriggerInsolvency: false,
      cashDelta: -1_500_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -4,
      itDelta: -8,
      narrativeDescription:
        'The password you typed on Friday was used to open the vendor payment console. Chinedu caught a change to a supplier account before the batch went out.',
    },
    learningFeedback: {
      corePrinciple: 'Concealing credential exposure transforms an incident into a critical breach',
      tradeoffSummary:
        'Done poorly: Entering credentials and concealing the error allowed attackers persistent access to internal systems. Why it matters: Dwell time allows attackers to establish persistence, exfiltrate data, and manipulate financial authorizations without detection.',
      risksCreated: [
        'Attacker possesses valid credentials and active session tokens for corporate mail and financial systems',
        'Uncontained compromise leads to direct regulatory exposure and financial fraud',
        'Severe compliance and legal liabilities for failure to report and contain known exposures',
      ],
    },
  },
  {
    id: 'CHOICE_MAIL_DELETE',
    label: 'Delete the message without proper escalation',
    description: 'Delete the email from your inbox without escalating, leaving any compromised colleague accounts and identical attacks uncontained.',
    executiveRationale: 'Assumed deleting from personal inbox resolved the issue, avoiding IT support overhead.',
    baseImpact: {
      cashDelta: 0,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 0,
      itDelta: -6,
      operationalExplanation:
        'The mail was deleted from your inbox. It was still in everyone else\'s, and Yusuf\'s compromise was left uncontained.',
    },
    scheduledDelayedEffect: {
      effectId: 'EFF_MAIL_SECOND_CLICK',
      triggerTurn: 2,
      executionStage: 'TURN_START_BEFORE_INCIDENT',
      canTriggerInsolvency: false,
      cashDelta: -400_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -2,
      itDelta: -6,
      narrativeDescription:
        'Two accounts staff opened the same mail and typed their passwords. Tunde spent the morning resetting them and explaining it to their manager.',
    },
    learningFeedback: {
      corePrinciple: 'Deleting an attack email locally does not contain enterprise risk',
      tradeoffSummary:
        'Done poorly: Deleting a phishing email without reporting leaves the malicious sender unblocked and colleague accounts compromised. Why it matters: Security is an enterprise responsibility; uncontained credential compromises lead to delayed lateral breaches.',
      risksCreated: [
        'Remaining 10 recipients remain unprotected against the same phishing lure',
        'Yusuf\'s compromised credentials remain active for external attacker exploitation',
        'Failure to report violates internal incident escalation procedures',
      ],
    },
  },
  {
    id: 'CHOICE_MAIL_INSPECTED_REPORT',
    label: 'Report that the link was opened and request further checks',
    description: 'Report that the link was accessed without submitting credentials, requesting endpoint verification and domain blocking.',
    executiveRationale: 'Confirmed the external URL was an unencrypted phishing portal, exited without submitting credentials, and alerted IT.',
    baseImpact: {
      cashDelta: -20_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 1,
      itDelta: 4,
      operationalExplanation:
        'Tunde verified no credentials were submitted from your machine, blocked firs-gov.com.ng on the gateway, and reset Yusuf\'s account.',
    },
    learningFeedback: {
      corePrinciple: 'Opening an untrusted URL requires endpoint verification even if credentials were not submitted',
      tradeoffSummary:
        'Done well: You identified the phishing domain and withheld credentials. Why it matters: Even visiting an external site signals an active mailbox and risks drive-by browser exploitation, requiring IT endpoint verification.',
      risksCreated: [
        'Run endpoint telemetry checks to confirm no malicious payloads or cookies were stored',
        'Confirm gateway block for firs-gov.com.ng across all internal subnets',
        'Document link inspection in the internal compliance register',
      ],
    },
  },
  {
    id: 'CHOICE_MAIL_OPEN_CONTAINED',
    label: 'Immediately disclose credential exposure and initiate containment',
    description: 'Disclose entered credentials immediately, enabling IT to revoke active session tokens, force password resets, and block the domain.',
    executiveRationale: 'Compromised password on an untrusted page, but immediate disclosure enabled emergency session revocation before exploitation.',
    baseImpact: {
      cashDelta: -50_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -2,
      itDelta: -4,
      operationalExplanation:
        'You entered credentials into the fake portal, but immediately reported it. Tunde revoked active session tokens before payments were altered.',
    },
    learningFeedback: {
      corePrinciple: 'Rapid disclosure of credential exposure drastically reduces breach dwell time',
      tradeoffSummary:
        'Done poorly: Submitting corporate credentials on an external site gave attackers valid authentication data. Done well: Immediate disclosure enabled IT to kill active session tokens before lateral movement or financial manipulation occurred.',
      risksCreated: [
        'Audit Active Directory logs for any unauthorized logins or mailbox forwarding rules created before token revocation',
        'Document credential exposure in the corporate data protection register and evaluate NDPA notification requirements',
        'Place heightened verification controls on outgoing financial wire requests',
      ],
    },
  },
];

// ============================================================================
// 3. TURN 2 — PEOPLE: supervisor and office assistant
// ============================================================================

export const CHOICES_HR_DISPUTE: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_HR_PANEL',
    label: 'Hold a written panel this week',
    description: 'Statements from both sides and two witnesses. Decision in writing by Friday.',
    executiveRationale: 'Our handbook says panel first. This is the version that survives a challenge.',
    isDefault: true,
    baseImpact: {
      cashDelta: -30_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 8,
      itDelta: 0,
      operationalExplanation:
        'Statements were taken the same afternoon and Musa was moved off Blessing\'s shift. The floor saw the process run openly.',
    },
    learningFeedback: {
      corePrinciple: 'A process everyone can see protects the company',
      tradeoffSummary:
        'A panel takes a week and costs a little. It gives you a record if the family goes to the police or the union complains.',
      risksCreated: [
        'Three days of tension on the floor while statements are taken.',
        'Musa may resign before the panel finishes.',
      ],
    },
  },
  {
    id: 'CHOICE_HR_SETTLE',
    label: 'Settle quietly and move Blessing\'s desk',
    description: 'No record. Pay her a settlement and split the shifts.',
    executiveRationale: 'Close it today, before the brother takes it to the police.',
    baseImpact: {
      cashDelta: -90_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -8,
      itDelta: 0,
      operationalExplanation:
        'Both parties accepted the settlement. By afternoon the floor had heard the company paid to keep it quiet.',
    },
    scheduledDelayedEffect: {
      effectId: 'EFF_STAFF_PETITION',
      triggerTurn: 3,
      executionStage: 'TURN_START_BEFORE_INCIDENT',
      canTriggerInsolvency: false,
      cashDelta: -120_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -10,
      itDelta: -2,
      narrativeDescription:
        'Nine staff signed a petition about how the assault was handled and copied the MD. Two asked HR for transfer letters.',
    },
    learningFeedback: {
      corePrinciple: 'Quiet settlements rarely stay quiet',
      tradeoffSummary:
        'Paying to close a conduct issue is fast, but staff read it as protection for the supervisor.',
      risksCreated: [
        'No written record if the matter is reported later.',
        'Staff trust drops once the settlement becomes known.',
      ],
    },
  },
  {
    id: 'CHOICE_HR_DISMISS',
    label: 'Dismiss Musa before lunch',
    description: 'Send him out today and pay his terminal benefits.',
    executiveRationale: 'A man who slaps a junior should not be on the floor this afternoon.',
    baseImpact: {
      cashDelta: -50_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -14,
      itDelta: 0,
      operationalExplanation:
        'Musa was paid off by noon. No statements were taken, and the union representative has written to say the handbook was skipped.',
    },
    learningFeedback: {
      corePrinciple: 'Speed is not the same as discipline',
      tradeoffSummary:
        'Dismissing on the spot protects Blessing immediately, but without statements the decision is exposed.',
      risksCreated: [
        'The union can challenge the dismissal as unfair.',
        'The two witnesses were never asked what they saw.',
      ],
    },
  },
];

// ============================================================================
// 4. TURN 3 — FINANCE: the diesel contract
// ============================================================================

export const CHOICES_FIN_DIESEL: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_FIN_RENEGOTIATE',
    label: 'Ask the supplier to reopen the terms',
    description: 'Offer to stay a year at today\'s price if the exit clause comes out.',
    executiveRationale: 'We signed it, so we start by talking, not by paying a penalty.',
    baseImpact: {
      cashDelta: -20_000,
      grossBurnRateDelta: -20_000,
      debtDelta: 0,
      hrDelta: 2,
      itDelta: 2,
      operationalExplanation:
        'The supplier dropped the exit clause but not the price. The saving is small and Chinedu has a written variation on file.',
    },
    learningFeedback: {
      corePrinciple: 'Negotiate from the contract you have',
      tradeoffSummary:
        'Reopening terms costs nothing today and fixes the clause, but the supplier has no reason to match the cheaper quote.',
      risksCreated: [
        'The quarterly saving the MD asked for is not delivered.',
        'The supplier will remember the pressure at renewal.',
      ],
    },
  },
  {
    id: 'CHOICE_FIN_EXIT',
    label: 'Pay the penalty and switch supplier',
    description: 'Pay about $9,000 to leave now and take the quote that is 20% cheaper.',
    executiveRationale: 'Take the pain once and stop overpaying every month.',
    baseImpact: {
      cashDelta: -900_000,
      grossBurnRateDelta: -35_000,
      debtDelta: 0,
      hrDelta: -2,
      itDelta: -4,
      operationalExplanation:
        'The penalty was paid on Thursday and the new supplier delivered on Monday. We break even in about two years.',
    },
    learningFeedback: {
      corePrinciple: 'Read the clause before you sign, not after',
      tradeoffSummary:
        'Exiting fixes the monthly cost but pays today for a contract Legal never saw.',
      risksCreated: [
        '$9,000 leaves the account for a contract we should have read.',
        'The switchover ran on generator diesel for two days.',
      ],
    },
  },
  {
    id: 'CHOICE_FIN_ABSORB',
    label: 'Keep the contract and fix how contracts are signed',
    description: 'No exit. From now on Legal reviews every vendor contract before anyone signs.',
    executiveRationale: 'The money is gone. The mistake is what needs fixing.',
    isDefault: true,
    baseImpact: {
      cashDelta: 0,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 4,
      itDelta: 3,
      operationalExplanation:
        'The contract runs to term. Funmi now gets every vendor paper seven days before signature, and Chinedu has stopped signing alone.',
    },
    learningFeedback: {
      corePrinciple: 'Fix the process, not just the invoice',
      tradeoffSummary:
        'Absorbing the contract protects cash today and prevents a repeat, but the MD gets no saving this quarter.',
      risksCreated: [
        'Legal review adds a week to every vendor onboarding.',
        'The cheaper diesel quote goes to a competitor.',
      ],
    },
  },
];

// ============================================================================
// 5. TURN 4 — LEGAL: advising a client on their own breach
// ============================================================================

export const CHOICES_LEGAL_CLIENT: readonly ScenarioChoice[] = [
  {
    id: 'CHOICE_LEGAL_NOTIFY',
    label: 'Advise her to file now and tell the customers',
    description: 'Written advice before lunch: file with NITDA, notify the 4,000 customers, keep the processor\'s report.',
    executiveRationale: 'The 72 hours started when the processor told her. Advise her to use them.',
    isDefault: true,
    baseImpact: {
      cashDelta: -30_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 3,
      itDelta: 0,
      operationalExplanation:
        'Advice went out before 11am with a draft customer notice. Greenspring filed the next morning and used our wording.',
    },
    learningFeedback: {
      corePrinciple: 'The clock starts when you are told, not when you are sure',
      tradeoffSummary:
        'Filing early costs a little legal time and protects the client from a late-filing finding.',
      risksCreated: [
        'If the processor\'s number is wrong, the client has published a figure it must correct.',
      ],
    },
  },
  {
    id: 'CHOICE_LEGAL_WAIT',
    label: 'Advise her to wait for the processor\'s report',
    description: 'No filing yet. Get the incident report and the affected list first.',
    executiveRationale: 'I will not put a number in a regulator\'s hands that I cannot stand behind.',
    baseImpact: {
      cashDelta: -90_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: -4,
      itDelta: -2,
      operationalExplanation:
        'The processor\'s report arrived on day four. The filing went in late with a letter explaining the delay, and NITDA has asked for the timeline.',
    },
    learningFeedback: {
      corePrinciple: 'Certainty is not a defence for missing the deadline',
      tradeoffSummary:
        'Waiting produces a cleaner filing that is late. The regulator asks why, and the client\'s board has nothing to say.',
      risksCreated: [
        'A late-filing finding sits on the client\'s record.',
        'Customers hear about it from the news, not from the client.',
      ],
    },
  },
  {
    id: 'CHOICE_LEGAL_EXIT',
    label: 'Advise her to drop the processor and move',
    description: 'End the merchant relationship and re-tokenise the cards. The breach still has to be reported.',
    executiveRationale: 'Why stay with a processor that exposed her customers?',
    baseImpact: {
      cashDelta: -60_000,
      grossBurnRateDelta: 0,
      debtDelta: 0,
      hrDelta: 1,
      itDelta: -3,
      operationalExplanation:
        'The move took three weeks and every card had to be re-entered. The filing still went in on day five.',
    },
    learningFeedback: {
      corePrinciple: 'Answer the deadline before you change suppliers',
      tradeoffSummary:
        'Switching removes the risk of a repeat but eats the team that should be doing the notification.',
      risksCreated: [
        'Re-tokenising 4,000 cards is three weeks of the client\'s time.',
        'The late filing is the finding the regulator will remember.',
      ],
    },
  },
];

// ============================================================================
// 6. MODIFIERS — what one desk does changes the next
// ============================================================================

export const MONDAY_MODIFIERS: readonly ChoiceModifier[] = [
  // A quiet settlement already dented trust: exiting the diesel contract now reads as
  // another decision taken without process, so the legal cost is higher.
  {
    modifierId: 'MOD_SETTLE_RAISES_EXIT_COST',
    targetChoiceId: 'CHOICE_FIN_EXIT',
    conditions: [{ type: 'DECISION_EQUALS', target: 'INC_HR_DISPUTE', value: 'CHOICE_HR_SETTLE' }],
    overrideCashDelta: -1_100_000,
  },

  // Dismissing without statements keeps morale low, and low morale means people will
  // not help with the contract review.
  {
    modifierId: 'MOD_DISMISS_BLOCKS_REVIEW',
    targetChoiceId: 'CHOICE_FIN_RENEGOTIATE',
    conditions: [{ type: 'DECISION_EQUALS', target: 'INC_HR_DISPUTE', value: 'CHOICE_HR_DISMISS' }],
    overrideItDelta: -3,
  },

  // If you handed over your own password, the afternoon is spent on the fallout rather
  // than on the contract.
  {
    modifierId: 'MOD_OPEN_MAIL_DELAYS_FINANCE',
    targetChoiceId: 'CHOICE_FIN_ABSORB',
    conditions: [{ type: 'DECISION_EQUALS', target: 'INC_MAIL_FIRS', value: 'CHOICE_MAIL_OPEN' }],
    overrideHrDelta: -2,
  },

  // Morale this low means nobody volunteers for a contract review exercise.
  {
    modifierId: 'MOD_LOW_MORALE_LOCKS_REVIEW',
    targetChoiceId: 'CHOICE_FIN_RENEGOTIATE',
    conditions: [{ type: 'METRIC_LESS_THAN', target: 'hrMorale', value: 45 }],
    isLocked: true,
    lockReason: 'People are too sore to help with a contract review this week.',
  },

  // Your own breach means the client advice also has to explain our own incident.
  {
    modifierId: 'MOD_BREACH_RAISES_LEGAL_COST',
    targetChoiceId: 'CHOICE_LEGAL_NOTIFY',
    conditions: [{ type: 'DECISION_EQUALS', target: 'INC_MAIL_FIRS', value: 'CHOICE_MAIL_OPEN' }],
    overrideCashDelta: -500_000,
  },
];

// ============================================================================
// 7. INCIDENTS
// ============================================================================

export const MONDAY_INCIDENTS: readonly Incident[] = [
  {
    id: 'INC_MAIL_FIRS',
    turn: 1,
    department: 'IT',
    title: 'A phishing mail is sitting in your inbox',
    urgency: 'critical',
    basePremise:
      'This came in at 08:52 and you are one of eleven people copied across Accounts and Operations. Finance flagged the email to IT as suspicious, but employee interaction has not yet been confirmed.',
    businessContext:
      'Anything you do with it is visible to the sender. Tunde can see what the page collects without anyone using a real account.',
    alsoPresent: {
      name: 'Yusuf Ibrahim',
      role: 'Accounts Officer (Finance)',
      line: 'Finance received the tax clearance notice this morning. I wasn\'t sure if it was legitimate, so we flagged it to IT.',
      followUp: {
        question: 'Who else received it?',
        answer: 'Eleven of us in Accounts and Operations were copied on the message.',
      },
    },
    artifact: {
      title: 'FIRS Tax Clearance — action required',
      meta: 'From FIRS e-Services <support@firs-gov.com.ng> · 08:52 · 11 recipients',
      lines: [
        'Dear taxpayer,',
        'Your 2025 tax clearance certificate is ready. Sign in with your company email to download it before 12 noon, or your filing will be rejected.',
        'Download certificate  ›',
      ],
    },
    decisionPrompt: 'What do you do with this mail?',
    narrativeVariants: [
      {
        variantId: 'VAR_MAIL_DEFAULT',
        conditions: [],
        leadInText: 'It is the first mail in your inbox and there is a meeting in ten minutes.',
      },
    ],
    choices: CHOICES_IT_MAIL,
  },

  {
    id: 'INC_HR_DISPUTE',
    turn: 2,
    department: 'HR',
    title: 'A supervisor slapped the office assistant',
    urgency: 'urgent',
    basePremise:
      'Musa slapped Blessing over a missing dispatch bag. Chidi from dispatch saw it and the gate man heard the shouting. Her brother wants to take it to the police.',
    businessContext:
      'Our handbook says a written panel before any sanction. The floor is watching to see which one we follow.',
    alsoPresent: {
      name: 'Blessing Etim',
      role: 'Office Assistant',
      line: 'He slapped me in front of two people. My brother wants to take it to the police.',
      followUp: {
        question: 'Who else saw it?',
        answer: 'Chidi from dispatch saw the whole thing. The gate man heard the shouting.',
      },
    },
    artifact: {
      title: 'Written statement — Blessing Etim',
      meta: 'Taken by Ngozi Okafor · 10:05 · Office of the Head of People',
      lines: [
        'Musa came to my desk about the dispatch bag and started shouting. I told him I had already given it to the rider.',
        'He slapped me on my left cheek in front of Chidi and the cleaner.',
      ],
    },
    decisionPrompt: 'How do you handle it?',
    narrativeVariants: [
      {
        variantId: 'VAR_DISPUTE_AFTER_MAIL_OPEN',
        conditions: [{ type: 'DECISION_EQUALS', target: 'INC_MAIL_FIRS', value: 'CHOICE_MAIL_OPEN' }],
        leadInText:
          'Ngozi has Blessing in her office. She mentions that staff already noticed the company has said nothing about the fake tax email.',
      },
      {
        variantId: 'VAR_DISPUTE_DEFAULT',
        conditions: [],
        leadInText: 'Ngozi has the handbook open at the disciplinary page, waiting for your call.',
      },
    ],
    choices: CHOICES_HR_DISPUTE,
  },

  {
    id: 'INC_FIN_DIESEL',
    turn: 3,
    department: 'FINANCE',
    title: 'The diesel contract nobody read',
    urgency: 'critical',
    basePremise:
      'Chinedu signed it last month at the supplier\'s office. Diesel has fallen since, and another supplier quotes 20% less.',
    businessContext:
      'The MD asked for cost cuts this quarter. Legal never saw the paper before it was signed.',
    alsoPresent: {
      name: 'Funmi Adeyemi',
      role: 'Company Secretary',
      line: 'I never saw this contract. It reached my desk a week later, already stamped.',
      followUp: {
        question: 'How did it get signed?',
        answer: 'Chinedu signed at their office. Nobody asked me for a review.',
      },
    },
    artifact: {
      title: 'Diesel Supply Agreement — clause 9',
      meta: 'Signed 14 October · 24 months · Mustarred Ltd and Rainoil Energy Services',
      lines: [
        '9.3 Early termination: where the Customer ends this agreement before the end of the term, the Customer shall pay 40% of the total value of the remaining months.',
        '9.4 Renewal: this agreement renews automatically for a further 12 months unless written notice is given 60 days before expiry.',
      ],
    },
    decisionPrompt: 'What do you do with the contract?',
    narrativeVariants: [
      {
        variantId: 'VAR_DIESEL_AFTER_EXIT_HIGH',
        conditions: [{ type: 'DECISION_EQUALS', target: 'INC_HR_DISPUTE', value: 'CHOICE_HR_SETTLE' }],
        leadInText:
          'Chinedu has the contract open. He has heard what the settlement cost and says the supplier knows we are not negotiating from strength.',
      },
      {
        variantId: 'VAR_DIESEL_DEFAULT',
        conditions: [],
        leadInText: 'Chinedu has page 9 photocopied on the table and Funmi on speaker.',
      },
    ],
    choices: CHOICES_FIN_DIESEL,
  },

  {
    id: 'INC_LEGAL_CLIENT',
    turn: 4,
    department: 'LEGAL',
    title: 'Your client\'s payment processor has been breached',
    urgency: 'critical',
    basePremise:
      'Greenspring Foods has just been told by its card processor that a staff account was compromised and customer card details may have been seen. The processor says it is contained.',
    businessContext:
      'Greenspring is our client, not the processor. They have 4,000 customers, a board meeting at 2pm, and no idea what the law expects of them.',
    alsoPresent: {
      name: 'Ifeoma Balogun',
      role: 'MD, Greenspring Foods (client)',
      line: 'My board meets at 2pm and our customers are already calling. What are we obliged to do, and by when?',
      followUp: {
        question: 'How many customers are affected?',
        answer: 'The processor says about 4,000 card records. They have not given us a list yet.',
      },
    },
    artifact: {
      title: 'Greenspring Foods — urgent',
      meta: 'From Ifeoma Balogun, MD · 10:20 · to Amaka Obi',
      lines: [
        'Amaka, our card processor told us this morning that one of their staff accounts was compromised and some customer card details may have been seen.',
        'They say it is contained and that they will send a report. Our customers are asking what happened. What do we have to do legally, and by when?',
      ],
    },
    decisionPrompt: 'What do you advise her?',
    narrativeVariants: [
      {
        variantId: 'VAR_LEGAL_AFTER_BREACH',
        conditions: [{ type: 'DECISION_EQUALS', target: 'INC_MAIL_FIRS', value: 'CHOICE_MAIL_OPEN' }],
        leadInText:
          'Funmi has the client on speaker. She has also just learned that our own mailbox was compromised this morning.',
      },
      {
        variantId: 'VAR_LEGAL_DEFAULT',
        conditions: [],
        leadInText: 'Funmi has the client\'s mail open and a draft advice note on the screen.',
      },
    ],
    choices: CHOICES_LEGAL_CLIENT,
  },
];

// ============================================================================
// 8. SCENARIO PACKAGE
// ============================================================================

export const MONDAY_MORNING_SCENARIO: Scenario = {
  id: 'SCENARIO_MONDAY_MORNING',
  title: 'Mustarred: Monday morning in Lekki',
  targetAudience: 'Managers and compliance officers in Nigerian firms.',
  learningObjectives: [
    'Handle four different jobs in one morning: a mail, a people problem, a contract and a client.',
    'See how your own actions at one desk change what is possible at the next.',
    'Keep a record that survives a regulator, a union or a court.',
  ],
  totalTurns: 4,
  initialConditions: MONDAY_INITIAL_CONDITIONS,
  incidents: MONDAY_INCIDENTS,
  modifiers: MONDAY_MODIFIERS,
};
