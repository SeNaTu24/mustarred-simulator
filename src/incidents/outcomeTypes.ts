/**
 * Mustarred Company Simulator - Shared aftermath vocabulary
 *
 * Shapes used by any incident's aftermath content and by the renderer that
 * shows it. Kept separate from the phishing data so the outcome screen is not
 * tied to one scenario.
 */

export type MemoTone = 'warning' | 'critical' | 'info' | 'positive';

export interface OutcomeMemo {
  readonly choiceId: string;
  readonly senderName: string;
  readonly senderTitle: string;
  readonly senderDept: 'IT' | 'HR' | 'FINANCE' | 'LEGAL';
  readonly subject: string;
  readonly timestamp: string;
  readonly message: string;
  readonly tone: MemoTone;
}

export interface OutcomeToast {
  readonly department: string;
  readonly sender: string;
  readonly title: string;
  readonly preview: string;
  readonly tone: MemoTone;
}

export type OfficeTone = 'contained' | 'recovering' | 'compromised' | 'negligent';

export interface OfficeOutcome {
  readonly tone: OfficeTone;
  readonly label: string;
  readonly detail: string;
}

/** Immediate figures taken from the engine's ledger record, not recomputed. */
export interface LedgerFigures {
  readonly cashDelta: number;
  readonly itDelta: number;
  readonly hrDelta: number;
}
