/**
 * Mustarred Company Simulator - Phishing Incident Interdepartmental Communications
 *
 * Generates deterministic, authentic cross-departmental reaction memos and toast
 * notifications across IT, Finance, HR, and Legal based on the player's authorized decision.
 */

import type { CrossDeptReaction } from './commsData.ts';

export interface PhishingToastAlert {
  readonly department: string;
  readonly sender: string;
  readonly title: string;
  readonly preview: string;
  readonly tone: 'critical' | 'warning' | 'positive' | 'info';
}

export interface PhishingDepartmentalPackage {
  readonly choiceId: string;
  readonly executiveSummary: string;
  readonly reactions: readonly CrossDeptReaction[];
  readonly toastAlerts: readonly PhishingToastAlert[];
}

export function buildPhishingReactions(choiceId: string): PhishingDepartmentalPackage {
  switch (choiceId) {
    case 'CHOICE_PHISH_LOCKDOWN':
      return {
        choiceId,
        executiveSummary:
          'Rapid Containment Executed: Intruder session severed within 90 seconds. All active tokens revoked. Financial batch halted for secondary verification ($3,000 off-cycle banking fees incurred).',
        reactions: [
          {
            choiceId,
            senderDept: 'IT',
            senderName: 'Maya Lin',
            senderTitle: 'Lead Systems Architect & Security Operations',
            subject: 'INCIDENT CONTAINED: Session Severed & Credentials Revoked',
            timestamp: '09:18 AM — Immediate Action',
            tone: 'positive',
            message:
              'Active session for Tom Bradley killed at the identity provider level. Frankfurt IP 185.220.101.44 permanently blocked at the edge firewall. Packet inspection confirms the connection was terminated before any payment API calls or file exfiltration could take place. Company-wide SSO password reset initiated.',
          },
          {
            choiceId,
            senderDept: 'FINANCE',
            senderName: 'David Vance',
            senderTitle: 'Interim CFO & Treasurer',
            subject: 'TREASURY STATUS: Outbound Wire Queue Paused for Re-Audit',
            timestamp: '09:25 AM — Financial Impact',
            tone: 'warning',
            message:
              'Tonight’s $180,000 vendor payment run was frozen while we re-authenticated Tom’s queue items. We incurred $3,000 in expedited off-cycle wire settlement fees with JPMorgan Chase, but treasury balances are 100% accounted for and no funds left company accounts.',
          },
          {
            choiceId,
            senderDept: 'HR',
            senderName: 'Elena Rostova',
            senderTitle: 'VP of People & Culture',
            subject: 'STAFF SENTIMENT: Tom Bradley Debrief & Departmental Support',
            timestamp: '09:40 AM — People Operations',
            tone: 'info',
            message:
              'Tom was visibly shaken when his workstation locked out suddenly in the middle of drafting invoices. People Ops has reached out to reassure him. We will treat this as an educational near-miss with blameless security coaching rather than a disciplinary incident.',
          },
          {
            choiceId,
            senderDept: 'LEGAL',
            senderName: 'Rachel Sterling',
            senderTitle: 'General Counsel & Head of Regulatory Compliance',
            subject: 'LEGAL ASSESSMENT: Breach Notification Duty Not Triggered',
            timestamp: '09:55 AM — Compliance Brief',
            tone: 'positive',
            message:
              'Forensic logs confirm zero exfiltration of client PII or proprietary banking records occurred before session severance. Under GDPR Article 33 and state breach notification statutes, the mandatory 72-hour regulatory disclosure is NOT triggered. Full audit trail preserved.',
          },
        ],
        toastAlerts: [
          {
            department: 'IT Security',
            sender: 'Maya Lin',
            title: 'Threat Neutralized',
            preview: 'Session killed in 90 seconds. Frankfurt IP blocked.',
            tone: 'positive',
          },
          {
            department: 'Finance Treasury',
            sender: 'David Vance',
            title: 'Payment Run Secured',
            preview: '$3,000 re-audit fee incurred; all treasury funds intact.',
            tone: 'warning',
          },
          {
            department: 'People Operations',
            sender: 'Elena Rostova',
            title: 'Employee Support Active',
            preview: 'Tom debriefed; non-punitive phishing review underway.',
            tone: 'info',
          },
          {
            department: 'Legal & Compliance',
            sender: 'Rachel Sterling',
            title: 'Compliance Confirmed',
            preview: 'No regulatory breach notice required. Audit trail preserved.',
            tone: 'positive',
          },
        ],
      };

    case 'CHOICE_PHISH_MONITOR':
      return {
        choiceId,
        executiveSummary:
          'Adversary Exfiltration During Surveillance: The intruder used Tom’s session to execute an unauthorized $25,000 wire redirect and established covert email forwarding rules before disconnecting.',
        reactions: [
          {
            choiceId,
            senderDept: 'IT',
            senderName: 'Maya Lin',
            senderTitle: 'Lead Systems Architect & Security Operations',
            subject: 'BREACH STATUS: Intruder Planted Persistence Before Disconnecting',
            timestamp: '09:42 AM — Telemetry Review',
            tone: 'critical',
            message:
              'Surveillance backfired. While we monitored packet headers, the adversary executed an automated script that altered payment instructions in the AP portal and embedded hidden forwarding rules in Tom’s Outlook profile. We were forced to sever the connection manually after the unauthorized API post.',
          },
          {
            choiceId,
            senderDept: 'FINANCE',
            senderName: 'David Vance',
            senderTitle: 'Interim CFO & Treasurer',
            subject: 'URGENT: $25,000 Fraudulent Wire Executed to Offshore Account',
            timestamp: '09:50 AM — Loss Notification',
            tone: 'critical',
            message:
              'A $25,000 disbursement scheduled for our cloud hosting provider was redirected to an offshore bank in Nicosia. Because the session was validly authenticated, automated fraud safeguards were bypassed. The funds have cleared and are unrecoverable. Monthly cash runway reduced.',
          },
          {
            choiceId,
            senderDept: 'HR',
            senderName: 'Elena Rostova',
            senderTitle: 'VP of People & Culture',
            subject: 'INTERNAL CONCERN: Questions Regarding Operational Monitoring',
            timestamp: '10:05 AM — Morale Feedback',
            tone: 'warning',
            message:
              'Word has leaked among the finance team that leadership allowed an unauthorized actor to roam active company systems while staff were working. Employees are questioning whether internal data security protocols are adequate.',
          },
          {
            choiceId,
            senderDept: 'LEGAL',
            senderName: 'Rachel Sterling',
            senderTitle: 'General Counsel & Head of Regulatory Compliance',
            subject: 'MANDATORY ACTION: 72-Hour Regulatory Breach Notice Required',
            timestamp: '10:15 AM — Regulatory Mandate',
            tone: 'critical',
            message:
              'Client invoices containing tax IDs and payment information were accessed during the surveillance window. We are now under strict legal obligation under GDPR Art. 33 and state regulators to submit formal breach filings within 72 hours. Outside counsel retained.',
          },
        ],
        toastAlerts: [
          {
            department: 'IT Security',
            sender: 'Maya Lin',
            title: 'Adversary Persistence Detected',
            preview: 'Attacker injected mailbox rules and AP script before exit.',
            tone: 'critical',
          },
          {
            department: 'Finance Treasury',
            sender: 'David Vance',
            title: '$25,000 Fraudulent Wire',
            preview: 'Funds redirected to offshore account; cash runway shortened.',
            tone: 'critical',
          },
          {
            department: 'Legal & Compliance',
            sender: 'Rachel Sterling',
            title: 'Regulatory Breach Notice Mandate',
            preview: 'Client PII compromised; 72-hour filing initiated.',
            tone: 'critical',
          },
        ],
      };

    case 'CHOICE_PHISH_VERIFY':
      return {
        choiceId,
        executiveSummary:
          'Employee Verification Succeeded: Tom confirmed entering credentials on a spoofed CEO portal. Quick intervention prevented wire disbursements; secondary security audit cost $5,000.',
        reactions: [
          {
            choiceId,
            senderDept: 'IT',
            senderName: 'Maya Lin',
            senderTitle: 'Lead Systems Architect & Security Operations',
            subject: 'POST-VERIFICATION ACTION: Credentials Reset & Token Invalidated',
            timestamp: '09:32 AM — Containment Report',
            tone: 'positive',
            message:
              'Upon your call, Tom immediately confirmed entering credentials on a fake executive document link. We killed the Frankfurt session 14 minutes into the intrusion. The attacker had previewed AP invoice tables, but our emergency kill-switch halted them seconds before any wire changes were committed.',
          },
          {
            choiceId,
            senderDept: 'FINANCE',
            senderName: 'Tom Bradley',
            senderTitle: 'Accounts Payable & Billing',
            subject: 'PERSONAL APOLOGY: Full Cooperation on Phishing Investigation',
            timestamp: '09:45 AM — Employee Statement',
            tone: 'info',
            message:
              'I am mortified that I fell for the fake email. Thank you for calling me directly rather than assuming the worst. I have shared the phishing headers with IT and verified every invoice line item manually. We spent $5,000 on off-cycle auditor checks, but no wire funds were lost.',
          },
          {
            choiceId,
            senderDept: 'HR',
            senderName: 'Elena Rostova',
            senderTitle: 'VP of People & Culture',
            subject: 'CULTURE WIN: High-Trust Reporting Culture Reinforced',
            timestamp: '10:00 AM — Culture Brief',
            tone: 'positive',
            message:
              'By contacting Tom with empathy rather than public punishment, leadership demonstrated that employees can report mistakes safely without fear of immediate retaliation. Team morale has risen across Finance and Operations.',
          },
          {
            choiceId,
            senderDept: 'LEGAL',
            senderName: 'Rachel Sterling',
            senderTitle: 'General Counsel & Head of Regulatory Compliance',
            subject: 'COMPLIANCE AUDIT: Documented Interception Without Loss',
            timestamp: '10:12 AM — Chain of Custody',
            tone: 'positive',
            message:
              'Tom’s voluntary statement and IT’s packet timestamps create a clean audit trail. Because no payment alteration or sustained data exfiltration took place, this is classified as an intercepted phishing incident. No public disclosure required.',
          },
        ],
        toastAlerts: [
          {
            department: 'IT Security',
            sender: 'Maya Lin',
            title: 'Verified & Contained',
            preview: 'Tom confirmed spoofed link. Session killed before wire execution.',
            tone: 'positive',
          },
          {
            department: 'Finance AP',
            sender: 'Tom Bradley',
            title: 'Full Cooperation',
            preview: 'All invoice batches verified; $5,000 audit cost logged.',
            tone: 'info',
          },
          {
            department: 'People Operations',
            sender: 'Elena Rostova',
            title: 'High-Trust Culture',
            preview: 'Empathetic response boosted reporting confidence across staff.',
            tone: 'positive',
          },
        ],
      };

    case 'CHOICE_PHISH_IGNORE':
    default:
      return {
        choiceId,
        executiveSummary:
          'Catastrophic Compromise from Negligence: Dismissing the alert allowed the adversary to siphon $45,000 overnight, alter payment templates, and compromise core domain certificates.',
        reactions: [
          {
            choiceId,
            senderDept: 'IT',
            senderName: 'Maya Lin',
            senderTitle: 'Lead Systems Architect & Security Operations',
            subject: 'CATASTROPHIC BREACH: Domain Controller & Core DB Compromised',
            timestamp: '11:15 AM — Emergency Incident',
            tone: 'critical',
            message:
              'The unaddressed Frankfurt connection was an active cybercriminal syndicate. Overnight, the intruder leveraged Tom’s session to harvest administrative domain tokens, extract internal employee databases, and deploy persistent web shells. IT stability has collapsed to emergency levels.',
          },
          {
            choiceId,
            senderDept: 'FINANCE',
            senderName: 'David Vance',
            senderTitle: 'Interim CFO & Treasurer',
            subject: 'CRITICAL LOSS: $45,000 Siphoned via Fraudulent ACH Template',
            timestamp: '11:30 AM — Emergency Solvency Review',
            tone: 'critical',
            message:
              'At 04:00 AM, an automated ACH disbursement of $45,000 was executed under altered vendor credentials. The bank cannot reverse the transaction. Our cash runway has been severely curtailed, and emergency incident response retainers will add further unbudgeted burn.',
          },
          {
            choiceId,
            senderDept: 'HR',
            senderName: 'Elena Rostova',
            senderTitle: 'VP of People & Culture',
            subject: 'ORGANIZATIONAL CRISIS: Staff Enraged by Executive Inaction',
            timestamp: '11:45 AM — Morale Collapse',
            tone: 'critical',
            message:
              'News that leadership dismissed active alert telemetry has shattered employee confidence. Engineers are venting on blind forums, and two senior leads have requested immediate severance consultations. Morale is at an all-time low.',
          },
          {
            choiceId,
            senderDept: 'LEGAL',
            senderName: 'Rachel Sterling',
            senderTitle: 'General Counsel & Head of Regulatory Compliance',
            subject: 'REGULATORY INQUIRY: Enforcement Notice for Willful Neglect',
            timestamp: '12:00 PM — Legal Sanctions',
            tone: 'critical',
            message:
              'State attorneys general and international regulators have been notified. Because audit logs show management intentionally ignored actionable breach alerts, we face potential punitive fines for willful neglect. Class-action counsel has sent preservation demands.',
          },
        ],
        toastAlerts: [
          {
            department: 'IT Security',
            sender: 'Maya Lin',
            title: 'Catastrophic Domain Breach',
            preview: 'Attacker harvested root keys and database records.',
            tone: 'critical',
          },
          {
            department: 'Finance Treasury',
            sender: 'David Vance',
            title: '$45,000 Cash Stolen',
            preview: 'Fraudulent ACH payment cleared; cash reserves drained.',
            tone: 'critical',
          },
          {
            department: 'People Operations',
            sender: 'Elena Rostova',
            title: 'Morale Collapse',
            preview: 'Staff outraged by executive dismissal of active threat.',
            tone: 'critical',
          },
          {
            department: 'Legal & Compliance',
            sender: 'Rachel Sterling',
            title: 'Regulatory Investigation',
            preview: 'Enforcement proceedings initiated for gross negligence.',
            tone: 'critical',
          },
        ],
      };
  }
}
