/**
 * Mustarred Company Simulator - Phishing aftermath content
 *
 * Builds the company's visible reaction to a committed response: what Maya says
 * immediately, what each affected department writes to the executive channel,
 * which toasts fire, and what state the office is left in.
 *
 * Everything is derived from the evaluated assessment, so two different plans
 * never produce the same memo set. No consequence amounts are invented here;
 * money figures are passed in from the engine's ledger record.
 */

import type { IncidentInteractionSpec, ResponsePlan } from '../interactionModel.ts';
import type { ResponseAssessment, VectorState } from '../responseEvaluator.ts';
import type {
  LedgerFigures,
  OfficeOutcome,
  OutcomeMemo,
  OutcomeToast,
} from '../outcomeTypes.ts';

export interface PhishingOutcome {
  readonly verdictLabel: string;
  readonly headline: string;
  readonly maya: OutcomeMemo;
  readonly memos: readonly OutcomeMemo[];
  readonly toasts: readonly OutcomeToast[];
  readonly office: OfficeOutcome;
}

function formatMoney(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return `${cents < 0 ? '-' : ''}$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function stateOf(assessment: ResponseAssessment, vectorId: string): VectorState {
  return assessment.vectors.find((vector) => vector.vectorId === vectorId)?.state ?? 'BREACHED';
}

function hasAction(plan: ResponsePlan, actionId: string): boolean {
  return plan.actionIds.includes(actionId) || plan.interpretation.actionIds.includes(actionId);
}

// ============================================================================
// MAYA
// ============================================================================

function buildMayaMemo(
  assessment: ResponseAssessment,
  plan: ResponsePlan,
  figures?: LedgerFigures
): OutcomeMemo {
  const wire = stateOf(assessment, 'VEC_WIRE');
  const mailbox = stateOf(assessment, 'VEC_MAILBOX');
  const exfil = stateOf(assessment, 'VEC_EXFIL');

  const openings: Record<ResponseAssessment['verdict'], string> = {
    CONTAINED: 'Session is dead, credentials are replaced, nothing moved at the bank.',
    CONTAINED_AT_COST:
      'It is closed. The bill is overtime, the bank fee and a morning of approvals we lost.',
    PARALYSED: 'Nothing is in that account now. Nothing else is moving either.',
    PARTIAL: 'Closed, but they got one thing done first. I am still working out how much.',
    COMPROMISED: 'We were late. They were inside the payment console while we decided.',
    NEGLIGENT: 'You said treat it as noise, so I stood the team down. The session is still open.',
  };

  const specifics: string[] = [];
  if (wire === 'CLOSED') {
    specifics.push('Treasury confirmed nothing left the account.');
  } else if (wire === 'TOO_LATE') {
    specifics.push('The AP-2417 edit cleared before treasury got the hold.');
  } else {
    specifics.push('The edited record cleared because nobody asked treasury to hold.');
  }
  if (mailbox === 'CLOSED') {
    specifics.push('Mailbox was clean before anything was written.');
  } else if (mailbox !== 'BREACHED') {
    specifics.push('The sweep found a rule created during the session.');
  } else if (hasAction(plan, 'ACT_PURGE_FORWARDING')) {
    specifics.push('The rule was written before we swept, so I cannot promise nothing left.');
  } else {
    specifics.push('Nobody has been through the mailbox. I cannot tell you what is in there.');
  }
  if (exfil === 'CLOSED') {
    specifics.push('No invoice data left the portal.');
  } else {
    specifics.push('Client invoices were pulled from the portal.');
  }

  const clockText =
    assessment.closeAtMinute === 0
      ? 'under a minute'
      : `${assessment.closeAtMinute} minute${assessment.closeAtMinute === 1 ? '' : 's'}`;
  const closing =
    assessment.verdict === 'NEGLIGENT'
      ? 'Say the word and we go back in.'
      : `Total: ${clockText}${figures ? `, ${formatMoney(figures.cashDelta)} out of the account` : ''}.`;

  return {
    choiceId: assessment.incidentId,
    senderName: 'Maya Lin',
    senderTitle: 'IT Security Lead',
    senderDept: 'IT',
    subject:
      assessment.verdict === 'CONTAINED'
        ? 'Closed clean. Nothing taken.'
        : assessment.verdict === 'NEGLIGENT'
        ? 'Stood down. Session still live.'
        : `Update: ${assessment.verdictLabel.toLowerCase()}`,
    timestamp: `09:${String(14 + assessment.closeAtMinute).padStart(2, '0')} · Security desk`,
    message: [openings[assessment.verdict], specifics.join(' '), closing].join(' '),
    tone:
      assessment.verdict === 'CONTAINED'
        ? 'positive'
        : assessment.verdict === 'NEGLIGENT' || assessment.verdict === 'COMPROMISED'
        ? 'critical'
        : assessment.verdict === 'PARTIAL'
        ? 'warning'
        : 'info',
  };
}

// ============================================================================
// DEPARTMENT MEMOS
// ============================================================================

function buildFinanceMemo(assessment: ResponseAssessment, figures?: LedgerFigures): OutcomeMemo {
  const wire = stateOf(assessment, 'VEC_WIRE');
  const money = figures ? ` Cash movement this cycle: ${formatMoney(figures.cashDelta)}.` : '';

  if (wire === 'CLOSED') {
    return {
      choiceId: assessment.incidentId,
      senderName: 'David Vance',
      senderTitle: 'Interim CFO',
      senderDept: 'FINANCE',
      subject: 'AP-2417 held and re-checked',
      timestamp: '09:41 · Treasury',
      message: `The bank held the batch before the edited record could clear. Two approvers re-checked Tom's queue by hand and released it at 17:05.${money}`,
      tone: 'positive',
    };
  }

  if (wire === 'TOO_LATE') {
    return {
      choiceId: assessment.incidentId,
      senderName: 'David Vance',
      senderTitle: 'Interim CFO',
      senderDept: 'FINANCE',
      subject: 'Halden Freight edit cleared before the hold',
      timestamp: '09:38 · Treasury',
      message: `The hold reached the bank after the routing edit settled. $25,000 went to a Nicosia account. The bank opened a recall case, but it is not coming back. We are re-checking every supplier record this afternoon.${money}`,
      tone: 'critical',
    };
  }

  return {
    choiceId: assessment.incidentId,
    senderName: 'David Vance',
    senderTitle: 'Interim CFO',
    senderDept: 'FINANCE',
    subject: 'AP-2417 went out with the edited record in it',
    timestamp: '09:36 · Treasury',
    message: `Nobody asked us to hold, so the 17:00 batch went out with the 09:16 routing edit in it. Tell me whether we call the bank now or at cut-off.${money}`,
    tone: 'critical',
  };
}

function buildHrMemo(plan: ResponsePlan, assessment: ResponseAssessment): OutcomeMemo {
  const briefed = hasAction(plan, 'ACT_BRIEF_STAFF');
  const punished = assessment.verdict === 'NEGLIGENT' || assessment.directive.restatement.includes('disciplinary');
  const secondClick = stateOf(assessment, 'VEC_SECOND_CLICK');

  if (secondClick !== 'CLOSED' && !briefed) {
    return {
      choiceId: assessment.incidentId,
      senderName: 'Elena Rostova',
      senderTitle: 'Head of People',
      senderDept: 'HR',
      subject: 'A second analyst signed in to the fake page',
      timestamp: '09:47 · People',
      message:
        'The email was still in every AP inbox while we were deciding. Nadia in AP signed in to it ten minutes ago. That is two password resets before lunch, and the warning only went out at 09:50.',
      tone: 'critical',
    };
  }

  return {
    choiceId: assessment.incidentId,
    senderName: 'Elena Rostova',
    senderTitle: 'Head of People',
    senderDept: 'HR',
    subject: punished ? 'Tom is waiting on a decision' : 'Tom is at his desk',
    timestamp: '09:45 · People',
    message: punished
      ? 'Tom reported the email in four minutes and now he is the subject of a process. Two analysts have quietly asked me whether they should report the next one.'
      : briefed
      ? 'Tom is embarrassed but fine. He gave me the timeline without being pushed. Your warning to AP and Finance is the first time we have told people about an attempt while it was still running.'
      : 'Tom is embarrassed but fine. He gave me the timeline without being pushed. He asked twice whether anyone else is being told.',
    tone: punished ? 'warning' : 'positive',
  };
}

function buildLegalMemo(plan: ResponsePlan, assessment: ResponseAssessment): OutcomeMemo {
  const exfil = stateOf(assessment, 'VEC_EXFIL');
  const logs = hasAction(plan, 'ACT_PRESERVE_LOGS');
  const legalFile = hasAction(plan, 'ACT_NOTIFY_LEGAL');

  if (exfil === 'CLOSED' && logs) {
    return {
      choiceId: assessment.incidentId,
      senderName: 'Rachel Sterling',
      senderTitle: 'General Counsel',
      senderDept: 'LEGAL',
      subject: 'No notification duty. Record sealed.',
      timestamp: '10:02 · Legal',
      message:
        'No client invoices left the portal, and the sealed copy proves it. This stays internal. The file stays open until the bank recall question is settled.',
      tone: 'positive',
    };
  }

  if (exfil === 'CLOSED') {
    return {
      choiceId: assessment.incidentId,
      senderName: 'Rachel Sterling',
      senderTitle: 'General Counsel',
      senderDept: 'LEGAL',
      subject: 'No notification duty, thin record',
      timestamp: '10:02 · Legal',
      message:
        'On what I can see, no invoices left the portal. The logs were not sealed, so if a supplier or a regulator asks, we rebuild it from backups. I want the export done before retention rolls.',
      tone: 'warning',
    };
  }

  return {
    choiceId: assessment.incidentId,
    senderName: 'Rachel Sterling',
    senderTitle: 'General Counsel',
    senderDept: 'LEGAL',
    subject: legalFile ? '72-hour clock started' : 'Invoice export. Clock not started.',
    timestamp: '10:05 · Legal',
    message: legalFile
      ? 'Client invoices with tax IDs left the portal. The 72-hour clock is running and I logged the start. The sealed record is what keeps this defensible. I need the affected supplier list by 14:00.'
      : 'Client invoices with tax IDs left the portal. That is reportable under the privacy rules and no file is open. I will not start the clock without you, but the clock is the problem here, not the fine.',
    tone: 'critical',
  };
}

// ============================================================================
// TOASTS & OFFICE
// ============================================================================

function buildToasts(
  assessment: ResponseAssessment,
  maya: OutcomeMemo,
  finance: OutcomeMemo,
  hr: OutcomeMemo,
  legal: OutcomeMemo
): OutcomeToast[] {
  const toasts: OutcomeToast[] = [
    {
      department: 'IT Security',
      sender: 'Maya Lin',
      title: assessment.verdict === 'CONTAINED' ? 'Closed clean' : `Update: ${assessment.verdictLabel.toLowerCase()}`,
      preview: maya.subject,
      tone: maya.tone,
    },
    {
      department: 'Treasury',
      sender: 'David Vance',
      title: stateOf(assessment, 'VEC_WIRE') === 'CLOSED' ? 'Batch held' : 'Routing compromised',
      preview: finance.subject,
      tone: finance.tone,
    },
  ];
  if (hr.tone !== 'positive') {
    toasts.push({
      department: 'People',
      sender: 'Elena Rostova',
      title: 'AP team needs a decision',
      preview: hr.subject,
      tone: hr.tone,
    });
  }
  if (legal.tone === 'critical') {
    toasts.push({
      department: 'Legal',
      sender: 'Rachel Sterling',
      title: 'Notification clock',
      preview: legal.subject,
      tone: legal.tone,
    });
  }
  return toasts;
}

function buildOfficeOutcome(assessment: ResponseAssessment): OfficeOutcome {
  const wire = stateOf(assessment, 'VEC_WIRE');
  switch (assessment.verdict) {
    case 'CONTAINED':
      return {
        tone: 'contained',
        label: 'Session severed',
        detail: 'The IT beacon is calm. The payment queue is clear.',
      };
    case 'CONTAINED_AT_COST':
      return {
        tone: 'contained',
        label: 'Contained, team stretched',
        detail: 'The beacon is calm. Finance is working through approvals.',
      };
    case 'PARALYSED':
      return {
        tone: 'recovering',
        label: 'Finance locked out',
        detail: 'Eleven people on paper until their accounts are back.',
      };
    case 'PARTIAL':
      return {
        tone: 'recovering',
        label: wire === 'CLOSED' ? 'Contained after a scare' : 'Contained late',
        detail: 'Session closed. The morning is being rebuilt from logs.',
      };
    case 'COMPROMISED':
      return {
        tone: 'compromised',
        label: 'Breach confirmed',
        detail: 'Finance and Legal are at the treasury desk.',
      };
    case 'NEGLIGENT':
    default:
      return {
        tone: 'negligent',
        label: 'Alert dismissed',
        detail: 'Maya is watching an authenticated stranger inside payments.',
      };
  }
}

// ============================================================================
// PUBLIC BUILDER
// ============================================================================

/**
 * Assembles Maya's reaction, the four departmental memos, the toast set and the
 * office outcome for a committed response.
 */
export function buildPhishingOutcome(
  _spec: IncidentInteractionSpec,
  plan: ResponsePlan,
  assessment: ResponseAssessment,
  figures?: LedgerFigures
): PhishingOutcome {
  const maya = buildMayaMemo(assessment, plan, figures);
  const finance = buildFinanceMemo(assessment, figures);
  const hr = buildHrMemo(plan, assessment);
  const legal = buildLegalMemo(plan, assessment);

  return {
    verdictLabel: assessment.verdictLabel,
    headline: assessment.headline,
    maya,
    memos: [maya, finance, hr, legal],
    toasts: buildToasts(assessment, maya, finance, hr, legal),
    office: buildOfficeOutcome(assessment),
  };
}
