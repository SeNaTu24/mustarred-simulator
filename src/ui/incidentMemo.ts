/**
 * Mustarred Company Simulator - Incident memo
 *
 * One short note from the department that acted, built from the decision the
 * engine actually recorded. No canned dialogue: the memo says what was done,
 * what it cost and what it did to the numbers, in two or three sentences.
 */

import type { DecisionLedgerRecord, SimulationState } from '../simulation/types.ts';
import type { CrossDeptReaction } from './commsData.ts';
import { staffForDepartment } from './staff.ts';

function formatMoney(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const value = `$${dollars.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return cents < 0 ? `-${value}` : value;
}

function toneFor(record: DecisionLedgerRecord): CrossDeptReaction['tone'] {
  const cash = record.immediateFinancialDeltas.cashDelta;
  const it = record.immediateMetricDeltas.itDelta;
  const hr = record.immediateMetricDeltas.hrDelta;

  const negative = [cash < 0, it < 0, hr < 0].filter(Boolean).length;
  const positive = [it > 0, hr > 0].filter(Boolean).length;

  if (negative >= 2 || hr <= -10 || it <= -10) {
    return 'critical';
  }
  if (negative === 1) {
    return 'warning';
  }
  if (positive > 0) {
    return 'positive';
  }
  return 'info';
}

/**
 * Builds the department's note for a resolved decision.
 */
export function buildIncidentMemo(
  record: DecisionLedgerRecord,
  state?: SimulationState
): CrossDeptReaction {
  const head = staffForDepartment(record.department);

  const cash = record.immediateFinancialDeltas.cashDelta;
  const it = record.immediateMetricDeltas.itDelta;
  const hr = record.immediateMetricDeltas.hrDelta;

  const costs: string[] = [];
  if (cash !== 0) {
    costs.push(`${formatMoney(cash)} out of the account`);
  }
  if (it !== 0) {
    costs.push(`IT ${it > 0 ? '+' : ''}${it}`);
  }
  if (hr !== 0) {
    costs.push(`morale ${hr > 0 ? '+' : ''}${hr}`);
  }

  const parts: string[] = [];
  if (costs.length > 0) {
    parts.push(costs.join(', '));
  }
  if (state) {
    parts.push(`cash now ${formatMoney(state.financials.cash)}`);
  }
  const tail = parts.length > 0 ? ` ${parts.join('. ')}.` : '';

  return {
    choiceId: record.chosenOptionId,
    senderName: head.name,
    senderTitle: head.role,
    senderDept: record.department,
    subject: record.chosenOptionLabel,
    timestamp: `Turn ${record.turn} · ${head.role}`,
    message: `${record.effectiveChoiceImpact.operationalExplanation}${tail}`,
    tone: toneFor(record),
  };
}
