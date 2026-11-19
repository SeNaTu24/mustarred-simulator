/**
 * Mustarred Company Simulator - UI Manager
 *
 * Manages the living company executive interface:
 * - Persistent Executive Communication Hub (Comms Hub with departmental channels & reactions)
 * - In-game Toast Notifications for incoming executive dispatches
 * - Interactive Incident Briefings with department heads (dialogue, facts vs uncertainties, Q&A inquiries)
 * - Incident-specific decision workbenches (tailored checklists, strategy selectors, custom directives)
 * - Cross-department reaction memos reflecting organisational interdependence
 * - Dramatic Game Over collapse & comprehensive Performance Debrief
 *
 * Strictly decoupled from Phaser: manipulates only DOM elements in #ui-overlay.
 */

import type {
  DecisionLedgerRecord,
  DelayedEffectResolution,
  EvaluatedChoice,
  Incident,
  SimulationPhase,
  SimulationState,
} from '../simulation/types.ts';

import type { PerformanceReport } from '../simulation/CompanySimulation.ts';
import type { IncidentInteractionSpec, ResponsePlan } from '../incidents/interactionModel.ts';
import { IncidentWorkbench } from './IncidentWorkbench.ts';
import { IncidentOutcomeView, type OutcomeViewProps } from './IncidentOutcomeView.ts';
import { matchPlayerDirective } from './decisionMatcher.ts';
import type { CrossDeptReaction } from './commsData.ts';
import { COMPANY, PLAYER, staffForDepartment } from './staff.ts';
import { MobileControls } from './MobileControls.ts';
import {
  TUNDE_OPENING_LINE,
  PHISHING_OPENING_OPTIONS,
  getOpeningOption,
  getFollowupExchange,
  getPhishingOutcomeConversation,
  answerTundeQuestion,
  type PhishingOpeningOptionId,
  type PhishingQuestionCategory,
} from './phishingDialogue.ts';
import { CandidateKnowledgeTracker } from '../knowledge/candidateKnowledge.ts';

export interface UIManagerCallbacks {
  readonly onSelectChoice: (choiceId: string, additionalInstructions?: string) => void;
  /** Fired when the player commits a composed response plan from the workbench. */
  readonly onCommitResponse?: (plan: ResponsePlan) => void;
  readonly onDismissResolution: () => void;
  readonly onRestart: () => void;
  readonly onPromptInteract: () => void;
  readonly onStepAway?: () => void;
  readonly onTundeIntroCompleted?: () => void;
  readonly onOpenCommsHub?: () => void;
  readonly onVirtualMove?: (dx: number, dy: number) => void;
  readonly onVirtualInteract?: () => void;
}

interface CommsMessage {
  readonly id: string;
  readonly channel: 'urgent' | 'IT' | 'HR' | 'FINANCE' | 'LEGAL' | 'audit';
  readonly senderName: string;
  readonly senderRole: string;
  readonly senderDept: 'IT' | 'HR' | 'FINANCE' | 'LEGAL' | 'EXEC';
  readonly timestamp: string;
  readonly subject: string;
  readonly body: string;
  readonly tone: 'warning' | 'critical' | 'info' | 'positive';
  readonly isIncident?: boolean;
}

export class UIManager {
  private readonly container: HTMLElement;
  private readonly callbacks: UIManagerCallbacks;

  private hudElement!: HTMLElement;
  private toastContainer!: HTMLElement;
  private commsDrawerElement!: HTMLElement;
  private promptElement!: HTMLElement;
  private modalContainer!: HTMLElement;
  private mobileControls?: MobileControls;

  // Living Comms Hub state
  private messages: CommsMessage[] = [];
  private activeCommsChannel: 'urgent' | 'IT' | 'HR' | 'FINANCE' | 'LEGAL' | 'audit' = 'urgent';
  private isCommsDrawerOpen: boolean = false;
  private unreadCommsCount: number = 0;

  // Persistent Metric Changes Tracking
  private lastProcessedLedgerLength: number = 0;
  private activeMetricDeltas: {
    cashDelta?: number;
    itDelta?: number;
    hrDelta?: number;
  } | null = null;
  private deltaTimer?: ReturnType<typeof setTimeout>;

  // Active Incident context
  private activeIncident: Incident | null = null;
  private activeChoices: readonly EvaluatedChoice[] = [];
  private answeredQuestions: Set<string> = new Set();
  private selectedStrategyId: string | null = null;
  private escapeKeyListener?: (e: KeyboardEvent) => void;
  private workbench?: IncidentWorkbench;
  private outcomeView?: IncidentOutcomeView;
  /**
   * A consultation the player stepped away from. Kept so walking back to the
   * department resumes the same clock and the records already read, instead of
   * handing out a fresh investigation.
   */
  private suspendedWorkbench?: { incidentId: string; workbench: IncidentWorkbench };

  public getActiveChoices(): readonly EvaluatedChoice[] {
    return this.activeChoices;
  }

  public getMobileControls(): MobileControls | undefined {
    return this.mobileControls;
  }

  private readonly candidateTrackers: Map<string, CandidateKnowledgeTracker> = new Map([
    ['INC_MAIL_FIRS', new CandidateKnowledgeTracker('INC_MAIL_FIRS')],
  ]);

  public get candidateKnowledge(): CandidateKnowledgeTracker {
    return this.getCandidateKnowledge(this.activeIncident?.id ?? 'INC_MAIL_FIRS');
  }

  public getCandidateKnowledge(incidentId: string = 'INC_MAIL_FIRS'): CandidateKnowledgeTracker {
    let tracker = this.candidateTrackers.get(incidentId);
    if (!tracker) {
      tracker = new CandidateKnowledgeTracker(incidentId);
      this.candidateTrackers.set(incidentId, tracker);
    }
    return tracker;
  }

  public resetCandidateKnowledge(incidentId?: string): void {
    if (incidentId) {
      this.candidateTrackers.get(incidentId)?.reset();
    } else {
      for (const tracker of this.candidateTrackers.values()) {
        tracker.reset();
      }
    }
  }

  private phishingIncidentId?: string;
  private phishingState: {
    linkOpened: boolean;
    credentialsSubmitted: boolean;
    isSenderInspected: boolean;
    isLinkInspected?: boolean;
    selectedAction: 'action_report' | 'action_delete' | 'action_contain';
    openingResponse?: PhishingOpeningOptionId;
    dialogueStep?: 'opening' | 'amaka_line' | 'tunde_reply';
    followupStep?: 'tunde_brief' | 'amaka_reply' | 'tunde_closing';
    introCompleted?: boolean;
    candidateKnowledge?: CandidateKnowledgeTracker;
    recentQuestion?: {
      question: string;
      answer: string;
      category: PhishingQuestionCategory;
    };
    conversationLog?: Array<{
      question: string;
      answer: string;
      category: PhishingQuestionCategory;
    }>;
  } | null = null;

  public getPhishingInteractionState(): {
    linkOpened: boolean;
    credentialsSubmitted: boolean;
    isSenderInspected: boolean;
    isLinkInspected?: boolean;
    selectedAction: 'action_report' | 'action_delete' | 'action_contain';
    openingResponse?: PhishingOpeningOptionId;
    dialogueStep?: 'opening' | 'amaka_line' | 'tunde_reply';
    followupStep?: 'tunde_brief' | 'amaka_reply' | 'tunde_closing';
    introCompleted?: boolean;
    candidateKnowledge?: CandidateKnowledgeTracker;
    recentQuestion?: {
      question: string;
      answer: string;
      category: PhishingQuestionCategory;
    };
    conversationLog?: Array<{
      question: string;
      answer: string;
      category: PhishingQuestionCategory;
    }>;
  } | null {
    return this.phishingState;
  }

  constructor(callbacks: UIManagerCallbacks) {
    this.callbacks = callbacks;
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) {
      throw new Error('#ui-overlay container not found in DOM.');
    }
    this.container = overlay;
    this.container.innerHTML = '';

    this.buildSkeleton();
  }

  /**
   * Builds the static DOM skeleton for HUD, comms drawer, toasts, prompt, and modal overlays.
   */
  private buildSkeleton(): void {
    // Top Executive HUD
    this.hudElement = document.createElement('header');
    this.hudElement.className = 'hud-topbar';
    this.container.appendChild(this.hudElement);

    // Floating Toast Notification Container (Top-Right)
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'toast-container';
    this.toastContainer.className = 'toast-container';
    this.container.appendChild(this.toastContainer);

    // Persistent Executive Communication Hub (Comms Drawer)
    this.commsDrawerElement = document.createElement('aside');
    this.commsDrawerElement.id = 'comms-drawer';
    this.commsDrawerElement.className = 'comms-drawer hidden';
    this.container.appendChild(this.commsDrawerElement);

    // Bottom In-World Proximity Interaction Prompt
    this.promptElement = document.createElement('div');
    this.promptElement.className = 'interaction-prompt hidden';
    this.promptElement.addEventListener('click', () => {
      this.callbacks.onPromptInteract();
    });
    this.container.appendChild(this.promptElement);

    // Modal overlay container for consultations, aftermath, gameover, and reports
    this.modalContainer = document.createElement('div');
    this.modalContainer.className = 'modal-backdrop hidden';
    this.container.appendChild(this.modalContainer);

    // Mobile Virtual Joystick & Prominent Interaction Button
    if (this.callbacks.onVirtualMove || this.callbacks.onVirtualInteract) {
      this.mobileControls = new MobileControls({
        container: this.container,
        onMove: (dx, dy) => this.callbacks.onVirtualMove?.(dx, dy),
        onInteract: () => this.callbacks.onVirtualInteract?.(),
      });
    }
  }

  // ==========================================================================
  // EXECUTIVE HUD & COMMS HUB TRIGGER
  // ==========================================================================

  /**
   * Updates the executive HUD with latest state from the simulation engine.
   */
  public updateHUD(state: SimulationState): void {
    const { financials, metrics, currentTurn, totalTurns, phase, isInsolvent, decisionLedger } = state;

    // Check if a new decision was logged to briefly highlight metric changes using existing simulation data
    const ledger = decisionLedger || [];
    if (ledger.length > this.lastProcessedLedgerLength) {
      this.lastProcessedLedgerLength = ledger.length;
      const latest = ledger[ledger.length - 1];
      this.activeMetricDeltas = {
        cashDelta: latest.immediateFinancialDeltas.cashDelta,
        itDelta: latest.immediateMetricDeltas.itDelta,
        hrDelta: latest.immediateMetricDeltas.hrDelta,
      };
      if (this.deltaTimer) {
        clearTimeout(this.deltaTimer);
      }
      this.deltaTimer = setTimeout(() => {
        this.activeMetricDeltas = null;
      }, 6000);
    } else if (ledger.length === 0) {
      this.lastProcessedLedgerLength = 0;
      this.activeMetricDeltas = null;
    }

    const cashFormatted = this.formatCurrency(financials.cash);
    const debtFormatted = this.formatCurrency(financials.debtService.postPaymentPrincipal);
    const netBurnFormatted = this.formatCurrency(financials.projectedNetMonthlyBurn);
    const runwayFormatted = `${financials.effectiveRunwayMonths.toFixed(1)} mos`;

    const gradeColor = this.getGradeColor(metrics.grade);
    const turnDeptName = this.getTurnDepartmentName(currentTurn);

    const phaseTag = isInsolvent
      ? '<span class="status-pill insolvent">INSOLVENT</span>'
      : phase === 'SIMULATION_COMPLETED'
      ? '<span class="status-pill completed">COMPLETED</span>'
      : `<span class="status-pill active">TURN ${currentTurn} OF ${totalTurns}</span>`;

    const unreadPill =
      this.unreadCommsCount > 0
        ? `<span class="comms-unread-pill">${this.unreadCommsCount} NEW</span>`
        : '';

    const wasFinanceOpen =
      this.hudElement?.querySelector<HTMLDetailsElement>('#hud-finance-drawer')?.open ?? false;

    // Delta badges for metric changes
    const cashDelta = this.activeMetricDeltas?.cashDelta;
    const itDelta = this.activeMetricDeltas?.itDelta;
    const hrDelta = this.activeMetricDeltas?.hrDelta;

    const cashDeltaBadge =
      cashDelta !== undefined && cashDelta !== 0
        ? `<span class="hud-delta-pill ${cashDelta < 0 ? 'neg' : 'pos'}">${this.formatCurrencyDelta(cashDelta)}</span>`
        : '';

    const itDeltaBadge =
      itDelta !== undefined && itDelta !== 0
        ? `<span class="hud-delta-pill ${itDelta < 0 ? 'neg' : 'pos'}">${itDelta > 0 ? '+' : ''}${itDelta}</span>`
        : '';

    const hrDeltaBadge =
      hrDelta !== undefined && hrDelta !== 0
        ? `<span class="hud-delta-pill ${hrDelta < 0 ? 'neg' : 'pos'}">${hrDelta > 0 ? '+' : ''}${hrDelta}</span>`
        : '';

    this.hudElement.innerHTML = `
      <div class="hud-left">
        <div class="hud-brand">
          <span class="company-name">MUSTARRED CORP</span>
          ${phaseTag}
        </div>
        <div class="hud-nav-group">
          <button id="btn-toggle-comms" class="btn-comms-hub ${this.unreadCommsCount > 0 ? 'pulse' : ''}" title="Open Executive Communication Hub">
            <span class="comms-icon">💬</span>
            <span class="comms-label">Comms Hub</span>
            ${unreadPill}
          </button>
          <div class="hud-phase-label">Active Focus: <strong>${turnDeptName}</strong></div>
        </div>
      </div>

      <!-- 3 Primary Metrics: Cash Reserves, IT Stability, HR Morale -->
      <div class="hud-center hud-primary-metrics">
        <div class="metric-card primary cash-card ${financials.cash < 0 ? 'critical' : ''}">
          <div class="metric-card-header">
            <span class="label">CASH RESERVES</span>
            ${cashDeltaBadge}
          </div>
          <span class="value">${cashFormatted}</span>
        </div>

        <div class="metric-card primary it-card ${metrics.itStability < 35 ? 'critical' : metrics.itStability < 60 ? 'warning' : ''}">
          <div class="metric-card-header">
            <span class="label">IT STABILITY</span>
            ${itDeltaBadge}
          </div>
          <span class="value"><span class="score-val">${metrics.itStability}</span><span class="score-max">/100</span></span>
        </div>

        <div class="metric-card primary hr-card ${metrics.hrMorale < 35 ? 'critical' : metrics.hrMorale < 60 ? 'warning' : ''}">
          <div class="metric-card-header">
            <span class="label">HR MORALE</span>
            ${hrDeltaBadge}
          </div>
          <span class="value"><span class="score-val">${metrics.hrMorale}</span><span class="score-max">/100</span></span>
        </div>
      </div>

      <!-- Right: Optional Expandable Financial Details & Company Performance Grade -->
      <div class="hud-right">
        <details class="hud-finance-expandable" id="hud-finance-drawer" ${wasFinanceOpen ? 'open' : ''}>
          <summary class="hud-finance-toggle" title="View Debt Principal, Monthly Burn & Estimated Runway">
            <span class="toggle-icon">📊</span>
            <span class="toggle-label">Treasury Details</span>
            <span class="toggle-chevron">▾</span>
          </summary>
          <div class="hud-finance-dropdown">
            <div class="metric-card secondary debt-card ${financials.debtService.hasActiveDebt ? 'warning' : ''}">
              <span class="label">DEBT PRINCIPAL</span>
              <span class="value">${debtFormatted}</span>
            </div>
            <div class="metric-card secondary burn-card">
              <span class="label">NET MONTHLY BURN</span>
              <span class="value">${netBurnFormatted}/mo</span>
            </div>
            <div class="metric-card secondary runway-card ${financials.effectiveRunwayMonths < 6 ? 'critical' : financials.effectiveRunwayMonths < 12 ? 'warning' : ''}">
              <span class="label">EST. RUNWAY</span>
              <span class="value">${runwayFormatted}</span>
            </div>
          </div>
        </details>

        <div class="overall-badge" style="border-color: ${gradeColor}" title="Overall Company Health (${metrics.overallHealthScore}/100) & Grade">
          <div class="health-num">${metrics.overallHealthScore}</div>
          <div class="grade-badge" style="background-color: ${gradeColor}">${metrics.grade}</div>
        </div>
      </div>
    `;

    // Wire Comms Hub toggle button
    const commsBtn = this.hudElement.querySelector('#btn-toggle-comms');
    commsBtn?.addEventListener('click', () => {
      this.toggleCommsHub();
    });
  }

  // ==========================================================================
  // NOTIFICATIONS & COMMS HUB
  // ==========================================================================

  /**
   * Notifies player of a new incident via sliding toast and logs dispatch into Comms Hub.
   */
  public notifyNewIncident(incident: Incident): void {
    const head = staffForDepartment(incident.department);

    this.messages.unshift({
      id: `incident-${incident.id}`,
      channel: 'urgent',
      senderName: head.name,
      senderRole: head.role,
      senderDept: incident.department,
      timestamp: `Turn ${incident.turn} · ${COMPANY.city}`,
      subject: incident.title,
      body: incident.basePremise,
      tone: incident.urgency === 'critical' ? 'critical' : 'warning',
      isIncident: true,
    });

    this.unreadCommsCount++;
    this.updateHUDCommsBadge();
    this.renderCommsDrawer();

    this.showToastNotification(
      `${head.role} · waiting`,
      head.name,
      head.role,
      incident.title,
      () => {
        this.callbacks.onPromptInteract();
      }
    );
  }

  /**
   * Appends an authentic cross-department reaction memo to the Comms Hub and shows a toast.
   *
   * Pass `{ silent: true }` when the memo is already on screen (for example while
   * the incident outcome is open) so it is filed without stacking toast cards on
   * top of the result.
   */
  public addCrossDeptReaction(reaction: CrossDeptReaction, options?: { silent?: boolean }): void {
    this.messages.unshift({
      id: `reaction-${Date.now()}`,
      channel: reaction.senderDept,
      senderName: reaction.senderName,
      senderRole: reaction.senderTitle,
      senderDept: reaction.senderDept,
      timestamp: reaction.timestamp,
      subject: reaction.subject,
      body: reaction.message,
      tone: reaction.tone,
      isIncident: false,
    });

    this.unreadCommsCount++;
    this.updateHUDCommsBadge();
    this.renderCommsDrawer();

    if (options?.silent) {
      return;
    }

    this.showToastNotification(
      `DEPARTMENT MEMO · ${reaction.senderDept}`,
      reaction.senderName,
      reaction.senderTitle,
      reaction.subject,
      () => {
        this.activeCommsChannel = reaction.senderDept;
        this.toggleCommsHub(true);
      }
    );
  }

  /**
   * Displays an animated toast notification on screen.
   */
  public showToastNotification(
    tag: string,
    senderName: string,
    senderRole: string,
    subject: string,
    onAction: () => void
  ): void {
    const toast = document.createElement('div');
    toast.className = 'comms-toast';
    toast.innerHTML = `
      <div class="toast-header">
        <span class="toast-tag">${tag}</span>
        <button class="toast-close" title="Dismiss">✕</button>
      </div>
      <div class="toast-sender">${senderName} <span class="toast-role">(${senderRole})</span></div>
      <div class="toast-subject">"${subject}"</div>
      <div class="toast-actions">
        <button class="btn btn-primary btn-sm btn-toast-open">Review Briefing</button>
        <button class="btn btn-secondary btn-sm btn-toast-dismiss">Dismiss</button>
      </div>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const dismissBtn = toast.querySelector('.btn-toast-dismiss');
    const openBtn = toast.querySelector('.btn-toast-open');

    const removeToast = () => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => {
        toast.remove();
      }, 250);
    };

    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeToast();
    });

    dismissBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeToast();
    });

    openBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeToast();
      onAction();
    });

    this.toastContainer.appendChild(toast);

    // Auto-dismiss after 9 seconds if ignored
    setTimeout(() => {
      if (toast.parentElement) {
        removeToast();
      }
    }, 9000);
  }

  /**
   * Fires sequential toasts with slight delay between each for cinematic fallout delivery.
   */
  public showSequentialToasts(
    toasts: readonly {
      readonly department: string;
      readonly sender: string;
      readonly title: string;
      readonly preview: string;
      readonly tone: 'critical' | 'warning' | 'positive' | 'info';
    }[]
  ): void {
    toasts.forEach((toast, idx) => {
      setTimeout(() => {
        this.showToastNotification(
          `DISPATCH · ${toast.department.toUpperCase()}`,
          toast.sender,
          toast.department,
          `${toast.title}: ${toast.preview}`,
          () => {
            const deptMap: Record<string, 'IT' | 'HR' | 'FINANCE' | 'LEGAL'> = {
              'IT Security': 'IT',
              'Finance Treasury': 'FINANCE',
              'Finance AP': 'FINANCE',
              'People Operations': 'HR',
              'Legal & Compliance': 'LEGAL',
            };
            const targetChan = deptMap[toast.department] ?? 'urgent';
            this.activeCommsChannel = targetChan;
            this.toggleCommsHub(true);
          }
        );
      }, idx * 450);
    });
  }

  /**
   * Injects an executive debrief button into the HUD once the incident is resolved.
   */
  public showDebriefButton(onOpenDebrief: () => void): void {
    const existing = this.hudElement?.querySelector('#btn-view-debrief');
    if (existing) {
      existing.remove();
    }
    const navGroup = this.hudElement?.querySelector('.hud-nav-group');
    if (!navGroup) return;

    const btn = document.createElement('button');
    btn.id = 'btn-view-debrief';
    btn.className = 'btn btn-primary btn-sm hud-debrief-btn pulse';
    btn.innerHTML = '<span>📊 View Executive Debrief</span>';
    btn.title = 'Review the comprehensive company performance debrief report';
    btn.addEventListener('click', () => {
      onOpenDebrief();
    });
    navGroup.appendChild(btn);
  }

  /**
   * Toggles visibility of the persistent Executive Communication Hub.
   */
  public toggleCommsHub(forceOpen?: boolean): void {
    if (forceOpen !== undefined) {
      this.isCommsDrawerOpen = forceOpen;
    } else {
      this.isCommsDrawerOpen = !this.isCommsDrawerOpen;
    }

    if (this.isCommsDrawerOpen) {
      this.unreadCommsCount = 0;
      this.updateHUDCommsBadge();
      this.commsDrawerElement.classList.remove('hidden');
      this.renderCommsDrawer();
      this.mobileControls?.setEnabled(false);
    } else {
      this.commsDrawerElement.classList.add('hidden');
      this.mobileControls?.setEnabled(true);
    }

    this.updateHUDCommsBadge();
  }

  /**
   * Updates or removes the unread message counter badge on the HUD Comms button.
   */
  private updateHUDCommsBadge(): void {
    const btn = this.hudElement?.querySelector<HTMLButtonElement>('#btn-toggle-comms');
    if (!btn) return;
    const existingPill = btn.querySelector('.comms-unread-pill');
    if (this.unreadCommsCount > 0) {
      btn.classList.add('pulse');
      if (existingPill) {
        existingPill.textContent = String(this.unreadCommsCount);
      } else {
        const pill = document.createElement('span');
        pill.className = 'comms-unread-pill';
        pill.textContent = String(this.unreadCommsCount);
        btn.appendChild(pill);
      }
    } else {
      btn.classList.remove('pulse');
      existingPill?.remove();
    }
  }

  /**
   * Resets the Comms Hub state for a fresh simulation run.
   */
  public resetCommsHub(): void {
    this.messages = [];
    this.unreadCommsCount = 0;
    this.activeCommsChannel = 'urgent';
    this.isCommsDrawerOpen = false;
    this.activeIncident = null;
    this.activeChoices = [];
    this.answeredQuestions.clear();
    this.selectedStrategyId = null;
    this.toastContainer.innerHTML = '';
    this.commsDrawerElement.classList.add('hidden');
    this.updateHUDCommsBadge();
    this.renderCommsDrawer();
  }

  /**
   * Renders the internal channels and message pane of the Comms Hub.
   */
  private renderCommsDrawer(): void {
    const channelMessages = this.messages.filter((m) => {
      if (this.activeCommsChannel === 'urgent') return m.channel === 'urgent';
      if (this.activeCommsChannel === 'audit') return m.channel === 'audit';
      return m.channel === this.activeCommsChannel;
    });

    const urgentCount = this.messages.filter((m) => m.channel === 'urgent').length;
    const itCount = this.messages.filter((m) => m.channel === 'IT').length;
    const hrCount = this.messages.filter((m) => m.channel === 'HR').length;
    const finCount = this.messages.filter((m) => m.channel === 'FINANCE').length;
    const legalCount = this.messages.filter((m) => m.channel === 'LEGAL').length;

    const messagesHtml =
      channelMessages.length === 0
        ? `<div class="comms-empty-state">
            <span class="empty-icon">📭</span>
            <p>No active transmissions in this channel.</p>
          </div>`
        : channelMessages
            .map((m) => {
              const actionBtn =
                m.isIncident && this.activeIncident
                  ? `<div class="msg-action-bar">
                      <button class="btn btn-primary btn-sm btn-open-incident-from-comms">Open Department Briefing</button>
                    </div>`
                  : '';

              return `
              <div class="comms-msg-card ${m.tone}">
                <div class="msg-meta">
                  <span class="msg-sender">${m.senderName} <span class="msg-title">· ${m.senderRole}</span></span>
                  <span class="msg-timestamp">${m.timestamp}</span>
                </div>
                <div class="msg-subject">${m.subject}</div>
                <div class="msg-body">${m.body}</div>
                ${actionBtn}
              </div>
            `;
            })
            .join('');

    this.commsDrawerElement.innerHTML = `
      <div class="comms-panel-header">
        <div class="comms-title-group">
          <span class="comms-title">🏢 MUSTARRED EXECUTIVE COMMS</span>
          <span class="comms-subtitle">Secure Corporate Dispatch Center</span>
        </div>
        <button id="btn-close-comms" class="btn-icon-close" title="Close Panel">✕</button>
      </div>

      <div class="comms-panel-body">
        <nav class="comms-sidebar">
          <button class="channel-btn ${this.activeCommsChannel === 'urgent' ? 'active' : ''}" data-channel="urgent">
            <span>⚡ Urgent Dispatches</span>
            ${urgentCount > 0 ? `<span class="channel-badge urgent">${urgentCount}</span>` : ''}
          </button>
          <button class="channel-btn ${this.activeCommsChannel === 'IT' ? 'active' : ''}" data-channel="IT">
            <span>💻 #engineering-ops</span>
            ${itCount > 0 ? `<span class="channel-badge">${itCount}</span>` : ''}
          </button>
          <button class="channel-btn ${this.activeCommsChannel === 'HR' ? 'active' : ''}" data-channel="HR">
            <span>👥 #people-and-talent</span>
            ${hrCount > 0 ? `<span class="channel-badge">${hrCount}</span>` : ''}
          </button>
          <button class="channel-btn ${this.activeCommsChannel === 'FINANCE' ? 'active' : ''}" data-channel="FINANCE">
            <span>📊 #executive-treasury</span>
            ${finCount > 0 ? `<span class="channel-badge">${finCount}</span>` : ''}
          </button>
          <button class="channel-btn ${this.activeCommsChannel === 'LEGAL' ? 'active' : ''}" data-channel="LEGAL">
            <span>⚖️ #regulatory-compliance</span>
            ${legalCount > 0 ? `<span class="channel-badge">${legalCount}</span>` : ''}
          </button>
        </nav>

        <section class="comms-content">
          <div class="channel-header-bar">
            Channel: <strong>#${this.activeCommsChannel.toLowerCase()}</strong>
          </div>
          <div class="comms-thread-list">
            ${messagesHtml}
          </div>
        </section>
      </div>
    `;

    // Attach channel navigation listeners
    const channelButtons = this.commsDrawerElement.querySelectorAll<HTMLButtonElement>('[data-channel]');
    channelButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const chan = btn.getAttribute('data-channel') as any;
        if (chan) {
          this.activeCommsChannel = chan;
          this.renderCommsDrawer();
        }
      });
    });

    // Close button
    const closeBtn = this.commsDrawerElement.querySelector('#btn-close-comms');
    closeBtn?.addEventListener('click', () => {
      this.toggleCommsHub(false);
    });

    // Incident action button
    const incidentActionBtn = this.commsDrawerElement.querySelector('.btn-open-incident-from-comms');
    incidentActionBtn?.addEventListener('click', () => {
      this.toggleCommsHub(false);
      this.callbacks.onPromptInteract();
    });
  }

  // ==========================================================================
  // INTERACTIVE INCIDENT CONSULTATION MODAL
  // ==========================================================================

  /**
   * Displays the in-world interaction prompt when player approaches active department.
   */
  public showInteractionPrompt(deptName: string, incidentTitle: string): void {
    const head = staffForDepartment(deptName);
    const formattedDept = `${head.name} (${head.role})`;

    this.promptElement.innerHTML = `
      <div class="prompt-content">
        <span class="key-badge">[E]</span>
        <span class="prompt-text">Consult with <strong>${formattedDept}</strong></span>
      </div>
      <span class="prompt-hint">Topic: "${incidentTitle}" · Press [E] or [Space]</span>
    `;
    this.promptElement.classList.remove('hidden');
    this.mobileControls?.setDepartmentInRange(true, deptName);
  }

  /**
   * Hides the interaction prompt.
   */
  public hideInteractionPrompt(): void {
    this.promptElement.classList.add('hidden');
    this.mobileControls?.setDepartmentInRange(false);
  }

  /**
   * Renders an incident that ships a declarative interaction spec through the
   * shared workbench: situation, evidence, response measures, assignment and a
   * free-text order. The workbench owns only presentation and plan assembly.
   */
  private showIncidentWorkbench(incident: Incident, spec: IncidentInteractionSpec): void {
    this.activeIncident = incident;
    this.mobileControls?.setEnabled(false);
    this.attachEscapeListener();
    this.modalContainer.innerHTML = '';
    this.workbench?.destroy();

    const suspended =
      this.suspendedWorkbench && this.suspendedWorkbench.incidentId === incident.id
        ? this.suspendedWorkbench.workbench
        : undefined;
    this.suspendedWorkbench = undefined;

    this.workbench =
      suspended ??
      new IncidentWorkbench(spec, {
        onCommit: (plan) => this.callbacks.onCommitResponse?.(plan),
        onStepAway: () => {
          this.stepAwayFromIncident();
          this.callbacks.onStepAway?.();
        },
      });

    this.workbench.mount(this.modalContainer);
    this.modalContainer.classList.remove('hidden');
  }

  /**
   * Closes the consultation without losing progress, so coming back resumes the
   * incident clock where the player left it.
   */
  /**
   * Drops focus from a panel field before the panel is removed. Without this the
   * game never sees a focusout and the player cannot move afterwards.
   */
  private releaseTextFocus(): void {
    const active = document.activeElement as HTMLElement | null;
    if (!active) {
      return;
    }
    const tag = active.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      active.blur();
    }
  }

  private isTextInputFocused(): boolean {
    const active = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
    if (!active) return false;
    const tag = active.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!active.isContentEditable;
  }

  private stepAwayFromIncident(): void {
    this.releaseTextFocus();
    if (this.workbench) {
      const openWorkbench = this.workbench;
      openWorkbench.destroy();
      this.suspendedWorkbench = {
        incidentId: this.activeIncident?.id ?? '',
        workbench: openWorkbench,
      };
      this.workbench = undefined;
    }
    if (this.escapeKeyListener) {
      window.removeEventListener('keydown', this.escapeKeyListener);
      this.escapeKeyListener = undefined;
    }
    this.modalContainer.classList.add('hidden');
    this.modalContainer.innerHTML = '';
    this.mobileControls?.setEnabled(true);
  }

  /**
   * Shows the aftermath of an authorised response, including the figure deltas
   * taken from the simulation ledger and the departmental memos.
   */
  public showIncidentOutcome(props: OutcomeViewProps): void {
    if (this.activeIncident?.id) {
      this.getCandidateKnowledge(this.activeIncident.id).recordDiscovery('OUTCOME_DEBRIEF');
    } else if (this.phishingIncidentId) {
      this.getCandidateKnowledge(this.phishingIncidentId).recordDiscovery('OUTCOME_DEBRIEF');
    }
    this.releaseTextFocus();
    this.workbench?.destroy();
    this.workbench = undefined;
    this.suspendedWorkbench = undefined;
    this.phishingState = null;
    this.phishingIncidentId = undefined;
    this.modalContainer.innerHTML = '';
    this.mobileControls?.setEnabled(false);
    this.attachEscapeListener();

    this.outcomeView = new IncidentOutcomeView(props);
    this.outcomeView.mount(this.modalContainer);
    this.modalContainer.classList.remove('hidden');
  }

  /**
   * Removes any open incident surface so the resolution flow can take over.
   */
  public closeIncidentSurfaces(): void {
    this.workbench?.destroy();
    this.workbench = undefined;
    this.suspendedWorkbench = undefined;
    this.outcomeView?.destroy();
    this.outcomeView = undefined;
    this.phishingState = null;
    this.phishingIncidentId = undefined;
  }

  private attachEscapeListener(): void {
    if (this.escapeKeyListener) {
      window.removeEventListener('keydown', this.escapeKeyListener);
    }
    this.escapeKeyListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !this.modalContainer.classList.contains('hidden')) {
        e.preventDefault();
        if (this.workbench) {
          this.stepAwayFromIncident();
        } else {
          this.hideIncidentModal();
        }
        this.callbacks.onStepAway?.();
      }
    };
    window.addEventListener('keydown', this.escapeKeyListener);
  }

  /**
   * Renders the interactive IT phishing email incident (Turn 1).
   * Follows the workplace investigation loop inspired by Criminal Case:
   * 1. Office Transition: Short natural conversation with Tunde Bello at the IT desk (office stays visible).
   * 2. Candidate opens the suspicious email on the IT workstation.
   * 3. Investigation Interface: Interactive email inspection, progressive evidence discovery (sender, link, simulated browser).
   * 4. Relevant Decisions: Only options relevant to candidate's investigation actions are presented.
   * 5. Decision Execution & Return to Office: Clean aftermath memo and return to office navigation.
   */
  private showPhishingEmailModal(
    incident: Incident,
    choices: readonly EvaluatedChoice[],
    startAtWorkstation: boolean = false
  ): void {
    this.activeIncident = incident;
    this.activeChoices = choices;
    this.mobileControls?.setEnabled(false);

    if (!this.phishingState || this.phishingIncidentId !== incident.id) {
      this.phishingIncidentId = incident.id;
      this.phishingState = {
        linkOpened: false,
        credentialsSubmitted: false,
        isSenderInspected: false,
        isLinkInspected: false,
        selectedAction: 'action_report',
        candidateKnowledge: this.candidateKnowledge,
      };
    } else {
      this.phishingState.candidateKnowledge = this.candidateKnowledge;
    }

    if (this.escapeKeyListener) {
      window.removeEventListener('keydown', this.escapeKeyListener);
    }
    this.escapeKeyListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.hideIncidentModal();
        this.callbacks.onStepAway?.();
        return;
      }
      if ((e.key === ' ' || e.key === 'Enter') && !this.isTextInputFocused()) {
        const contBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-dialogue-continue');
        if (contBtn) {
          e.preventDefault();
          contBtn.click();
        }
      }
    };
    window.addEventListener('keydown', this.escapeKeyListener);

    const head = staffForDepartment(incident.department);

    const renderDeskConversation = () => {
      this.modalContainer.className = 'modal-backdrop is-desk-overlay';
      this.candidateKnowledge.recordDiscovery('ASK_TUNDE_DESK');

      const isIntroDone = !!this.phishingState?.introCompleted;
      const selectedOptionId = this.phishingState?.openingResponse;
      const selectedOption = selectedOptionId ? getOpeningOption(selectedOptionId) : undefined;
      const currentStep = this.phishingState?.dialogueStep ?? (selectedOption ? 'amaka_line' : 'opening');

      // Determine single active speaker and their current line
      let activeSpeakerName = head.name;
      let activeSpeakerRole = head.role;
      let activeSpeakerInitials = 'TB';
      let activeSpeakerColor = head.color;
      let activeSpeakerGradient = 'linear-gradient(90deg, #0284c7, #2563eb)';
      let activePortraitUrl = '/assets/portrait_tunde.png';
      let spokenDialogue = '';
      let showChoices = false;
      let showContinueBtn = false;
      let isFinalReply = false;

      if (isIntroDone) {
        // Structured post-investigation debrief between Tunde and Amaka
        const followupStep = this.phishingState?.followupStep ?? 'tunde_brief';
        const exchange = getFollowupExchange(this.phishingState ?? undefined);

        if (followupStep === 'amaka_reply') {
          activeSpeakerName = PLAYER.name;
          activeSpeakerRole = PLAYER.role;
          activeSpeakerInitials = 'AO';
          activeSpeakerColor = '#f472b6';
          activeSpeakerGradient = 'linear-gradient(90deg, #ec4899, #d946ef)';
          activePortraitUrl = '/assets/portrait_amaka.png';
          spokenDialogue = exchange.amakaLine;
          showContinueBtn = true;
        } else if (followupStep === 'tunde_closing') {
          spokenDialogue = exchange.tundeClosing;
          isFinalReply = true;
        } else {
          // 'tunde_brief'
          spokenDialogue = exchange.tundeLine;
          showContinueBtn = true;
          this.candidateKnowledge.recordDiscovery('FINANCE_FOLLOWUP_CALL');
        }
      } else if (!selectedOption || currentStep === 'opening') {
        // Step 1: Tunde speaks opening prompt; Amaka needs to choose
        spokenDialogue = TUNDE_OPENING_LINE;
        showChoices = true;
      } else if (currentStep === 'amaka_line') {
        // Step 2: Amaka speaks her chosen response line
        activeSpeakerName = PLAYER.name;
        activeSpeakerRole = PLAYER.role;
        activeSpeakerInitials = 'AO';
        activeSpeakerColor = '#f472b6';
        activeSpeakerGradient = 'linear-gradient(90deg, #ec4899, #d946ef)';
        activePortraitUrl = '/assets/portrait_amaka.png';
        spokenDialogue = selectedOption.amakaLine;
        showContinueBtn = true;
      } else {
        // Step 3: Tunde answers directly to Amaka's chosen line
        spokenDialogue = selectedOption.tundeResponse;
        isFinalReply = true;
      }

      const actionLabel = isIntroDone
        ? '🖥️ Return to IT workstation ›'
        : '🖥️ Examine email on IT workstation ›';

      this.modalContainer.innerHTML = `
        <div class="desk-conversation-panel">
          <button type="button" id="btn-desk-close" class="btn-icon-close cinematic-close-btn" title="Step away">✕</button>

          <div class="cinematic-conversation-body">
            <!-- Active Speaker Character Portrait -->
            <div class="cinematic-portrait-container">
              <img src="${activePortraitUrl}" alt="${activeSpeakerName}" class="cinematic-portrait-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
              <div class="cinematic-portrait-fallback" style="background-color: ${activeSpeakerColor}">${activeSpeakerInitials}</div>
            </div>

            <!-- Dialogue & Controls Content Column -->
            <div class="cinematic-content-col">
              <div class="cinematic-speaker-tag" style="background: ${activeSpeakerGradient}">
                ${activeSpeakerName} · ${activeSpeakerRole}
              </div>

              ${
                this.phishingState?.recentQuestion
                  ? `
                <div class="cinematic-speech-thread">
                  <div class="thread-bubble candidate-bubble">
                    <div class="thread-speaker amaka-tag">Amaka Obi · CCO</div>
                    <p class="thread-text">“${this.phishingState.recentQuestion.question}”</p>
                  </div>
                  <div class="thread-bubble tunde-bubble">
                    <div class="thread-speaker tunde-tag">Tunde Bello · Head of IT</div>
                    <p class="thread-text">“${this.phishingState.recentQuestion.answer}”</p>
                  </div>
                </div>
              `
                  : `
                <div class="cinematic-speech-bubble">
                  <div class="speech-tail"></div>
                  <p class="cinematic-speech-text">“${spokenDialogue}”</p>
                </div>
              `
              }

              ${
                showChoices
                  ? `
                <div class="cinematic-choices-row">
                  ${PHISHING_OPENING_OPTIONS.map(
                    (opt) => `
                    <button type="button" id="btn-dialogue-opt-${opt.id}" class="dialogue-choice-btn" value="${opt.id}" data-option-id="${opt.id}">
                      <span class="choice-icon">${opt.id === 'interacted_yet' || opt.id === 'opened_yet' ? '💬' : opt.id === 'what_suspicious' || opt.id === 'dont_touch' ? '🔍' : '💻'}</span>
                      <span class="choice-text">${opt.label}</span>
                    </button>
                  `
                  ).join('')}
                </div>
              `
                  : ''
              }

              <!-- Compact, Mobile-Responsive Question Input -->
              <div class="cinematic-ask-bar">
                <form id="form-ask-tunde" class="ask-tunde-form" autocomplete="off">
                  <div class="ask-tunde-input-wrap">
                    <span class="ask-icon">💬</span>
                    <input
                      type="text"
                      id="input-ask-tunde"
                      class="ask-tunde-input"
                      placeholder="Ask Tunde a question (e.g. 'What did Yusuf do?', 'Is it authentic?')..."
                      maxlength="250"
                      autocomplete="off"
                    />
                    <button type="submit" id="btn-submit-question" class="btn-ask-submit">
                      Ask
                    </button>
                  </div>
                </form>
              </div>

              <div class="cinematic-actions-row">
                ${
                  showContinueBtn
                    ? `
                  <button type="button" id="btn-dialogue-continue" class="btn btn-primary btn-sm">
                    Continue ›
                  </button>
                `
                    : ''
                }
                <button type="button" id="btn-open-workstation" class="btn ${isFinalReply || this.phishingState?.recentQuestion ? 'btn-primary' : 'btn-secondary'} btn-sm">
                  <span>${actionLabel}</span>
                </button>
                <button type="button" id="btn-desk-step-away" class="btn btn-secondary btn-sm">
                  Step away
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const openWorkstationBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-open-workstation');
      const stepAwayBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-desk-step-away');
      const closeBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-desk-close');
      const continueBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-dialogue-continue');

      const handleStepAway = () => {
        this.hideIncidentModal();
        this.callbacks.onStepAway?.();
      };

      openWorkstationBtn?.addEventListener('click', () => {
        if (this.phishingState) {
          this.phishingState.introCompleted = true;
          if (!this.phishingState.openingResponse) {
            this.phishingState.openingResponse = 'examine_first';
          }
        }
        this.candidateKnowledge.recordDiscovery('ASK_TUNDE_DESK');
        this.callbacks.onTundeIntroCompleted?.();
        renderWorkstation();
      });

      stepAwayBtn?.addEventListener('click', handleStepAway);
      closeBtn?.addEventListener('click', handleStepAway);

      continueBtn?.addEventListener('click', () => {
        if (this.phishingState) {
          if (isIntroDone) {
            if (this.phishingState.followupStep === 'amaka_reply') {
              this.phishingState.followupStep = 'tunde_closing';
            } else {
              this.phishingState.followupStep = 'amaka_reply';
            }
          } else {
            this.phishingState.dialogueStep = 'tunde_reply';
          }
          renderDeskConversation();
        }
      });

      // Wire Ask Tunde Form
      const askForm = this.modalContainer.querySelector<HTMLFormElement>('#form-ask-tunde');
      const askInput = this.modalContainer.querySelector<HTMLInputElement>('#input-ask-tunde');

      askForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = askInput?.value?.trim();
        if (!query || !this.phishingState) return;

        const answer = answerTundeQuestion(query, this.phishingState);
        this.phishingState.recentQuestion = {
          question: query,
          answer: answer.response,
          category: answer.category,
        };
        if (!this.phishingState.conversationLog) {
          this.phishingState.conversationLog = [];
        }
        this.phishingState.conversationLog.push(this.phishingState.recentQuestion);

        renderDeskConversation();
      });

      const choiceButtons = this.modalContainer.querySelectorAll<HTMLButtonElement>('.dialogue-choice-btn');
      choiceButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const optId = (btn.value || btn.dataset?.optionId || btn.getAttribute?.('data-option-id')) as PhishingOpeningOptionId;
          if (this.phishingState && optId) {
            this.phishingState.recentQuestion = undefined;
            this.phishingState.openingResponse = optId;
            this.phishingState.dialogueStep = 'amaka_line';
            renderDeskConversation();
          }
        });
      });

      this.modalContainer.classList.remove('hidden');
    };

    const renderWorkstation = () => {
      this.modalContainer.className = 'modal-backdrop is-workstation-overlay';
      this.modalContainer.innerHTML = `
        <div class="modal-dialog workstation-panel">
          <div class="workstation-top-bar">
            <div class="workstation-title-group">
              <div class="window-traffic-lights">
                <span class="dot red"></span>
                <span class="dot yellow"></span>
                <span class="dot green"></span>
              </div>
              <span class="workstation-title">🖥️ Mustarred Workstation — ${PLAYER.name} (${PLAYER.name.toLowerCase().replace(' ', '.')}@mustarred.com)</span>
            </div>
            <div class="workstation-nav-actions">
              <button type="button" id="btn-back-to-desk" class="btn btn-secondary btn-xs" title="Return to desk conversation">
                ← Talk to Tunde
              </button>
              <button type="button" id="btn-investigation-step-away" class="btn btn-secondary btn-xs" title="Step away to office">
                Step away
              </button>
            </div>
          </div>

          <div class="modal-body workstation-body">
            <!-- Left Column: The Interactive Email Document -->
            <div class="workstation-doc-card">
              <div class="artifact-top-bar">
                <div class="email-doc-title">
                  <span class="doc-icon">✉️</span>
                  <strong>${incident.artifact?.title ?? 'FIRS Tax Clearance — action required'}</strong>
                </div>
                <span class="phish-badge unread">Inbox (Priority)</span>
              </div>

              <div class="artifact-meta-grid">
                <div class="meta-item">
                  <span class="meta-label">From:</span>
                  <span class="meta-value"><strong>FIRS e-Services</strong> &lt;support@firs-gov.com.ng&gt;</span>
                  <button type="button" id="btn-inspect-sender" class="btn btn-secondary btn-xs">
                    ${this.phishingState?.isSenderInspected ? 'Hide sender details' : 'Inspect sender'}
                  </button>
                </div>
                <div class="meta-item">
                  <span class="meta-label">To:</span>
                  <span class="meta-value">${PLAYER.name.toLowerCase().replace(' ', '.')}@mustarred.com, yusuf.ibrahim@mustarred.com (+9 staff)</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Date:</span>
                  <span class="meta-value">Today · 08:52 AM</span>
                </div>
              </div>

              <!-- Collapsible Sender Inspection Drawer -->
              <div id="sender-inspection-drawer" class="sender-inspection-drawer ${this.phishingState?.isSenderInspected ? '' : 'hidden'}">
                <div class="inspection-title">🔍 Technical Headers Analysis</div>
                <div class="inspection-field"><strong>Return-Path:</strong> &lt;bounce@mail-outbound-relay14.ru&gt;</div>
                <div class="inspection-field"><strong>Authentication:</strong> SPF: FAIL · IP 185.220.101.44 (Relay in Russia)</div>
                <div class="inspection-field"><strong>Domain Alert:</strong> firs-gov.com.ng registered 3 days ago. Legitimate government domain is <strong>firs.gov.ng</strong>.</div>
              </div>

              <!-- Email Body -->
              <div class="email-body-content">
                <p>Dear taxpayer,</p>
                <p>Your 2025 tax clearance certificate is ready. Sign in with your company email to download it before 12 noon, or your filing will be rejected.</p>

                <div class="phish-link-box">
                  <div class="link-display-row">
                    <span class="link-label">Attachment Link:</span>
                    <a href="#" id="link-phish-url" class="phish-download-link">Download certificate  ›</a>
                    <button type="button" id="btn-check-link" class="btn btn-secondary btn-xs">
                      ${this.phishingState?.isLinkInspected ? 'Hide link details' : 'Check link'}
                    </button>
                    <button type="button" id="btn-open-link" class="btn btn-secondary btn-xs">Open link in browser</button>
                  </div>

                  <!-- Collapsible Link Inspection Drawer -->
                  <div id="link-inspection-drawer" class="link-inspection-drawer ${this.phishingState?.isLinkInspected ? '' : 'hidden'}">
                    <div class="inspection-field"><strong>Target URL:</strong> <code>http://firs-gov.com.ng/portal/tax-clearance</code></div>
                    <div class="inspection-field"><strong>Security Protocol:</strong> Insecure (HTTP, unencrypted)</div>
                    <div class="inspection-field"><strong>Host Reputation:</strong> Unregistered lookalike domain mimicking Nigerian tax authority.</div>
                  </div>
                </div>
              </div>

              <!-- Simulated External Browser Window -->
              <div id="simulated-browser" class="simulated-browser hidden">
                <div class="browser-bar">
                  <span class="browser-status">⚠️ Not secure</span>
                  <span class="browser-url">http://firs-gov.com.ng/portal/tax-clearance</span>
                  <button type="button" id="btn-close-browser" class="btn btn-xs">Close page</button>
                </div>
                <div class="browser-body">
                  <div class="phish-brand">Federal Inland Revenue Service — e-Tax Portal</div>
                  <p class="phish-subhead">Sign in with your corporate workspace account to access the certificate.</p>
                  <div class="phish-form-group">
                    <label>Email address</label>
                    <input type="text" value="${PLAYER.name.toLowerCase().replace(' ', '.')}@mustarred.com" readonly class="phish-input-readonly" />
                    <label>Password</label>
                    <input id="input-phish-password" type="password" placeholder="Enter corporate password" class="phish-input" />
                    <div class="phish-actions-row">
                      <button type="button" id="btn-submit-credentials" class="btn btn-danger btn-sm">Sign in to download</button>
                      <button type="button" id="btn-cancel-browser" class="btn btn-secondary btn-sm">Close page</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Discovered Evidence & Relevant Decision -->
            <div class="workstation-action-sidebar">
              <!-- Discovered Evidence Tray (Criminal Case inspired) -->
              <div class="investigation-evidence-tray">
                <div class="tray-header">
                  <span class="tray-title">📋 Discovered Evidence</span>
                  <span id="evidence-counter" class="evidence-counter-badge">0 Findings</span>
                </div>
                <div id="evidence-list" class="evidence-list"></div>
              </div>

              <!-- Dynamic Status Banner -->
              <div id="phish-status-banner" class="phish-status-banner hidden"></div>

              <!-- Relevant Decision Tray -->
              <div class="investigation-decision-tray">
                <div class="decision-tray-header">
                  <h4 class="decision-heading">Confirm Action on this Email</h4>
                  <span class="decision-subheading">Options adapt dynamically based on your findings.</span>
                </div>

                <div id="decision-cards-container" class="decision-cards-container"></div>

                <div class="decision-confirm-bar">
                  <div class="execution-signoff">
                    Recorded under ${PLAYER.name} · ${PLAYER.role}
                  </div>
                  <button id="btn-execute-decision" class="btn btn-primary btn-large">
                    Confirm action
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Wire workstation elements
      const inspectBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-inspect-sender');
      const inspectionDrawer = this.modalContainer.querySelector<HTMLDivElement>('#sender-inspection-drawer');
      const checkLinkBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-check-link');
      const linkDrawer = this.modalContainer.querySelector<HTMLDivElement>('#link-inspection-drawer');
      const openLinkBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-open-link');
      const phishLink = this.modalContainer.querySelector<HTMLAnchorElement>('#link-phish-url');
      const simulatedBrowser = this.modalContainer.querySelector<HTMLDivElement>('#simulated-browser');
      const closeBrowserBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-close-browser');
      const cancelBrowserBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-cancel-browser');
      const submitCredentialsBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-submit-credentials');
      const statusBanner = this.modalContainer.querySelector<HTMLDivElement>('#phish-status-banner');
      const evidenceCounter = this.modalContainer.querySelector<HTMLSpanElement>('#evidence-counter');
      const evidenceList = this.modalContainer.querySelector<HTMLDivElement>('#evidence-list');
      const cardsContainer = this.modalContainer.querySelector<HTMLDivElement>('#decision-cards-container');
      const executeBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-execute-decision');
      const backToDeskBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-back-to-desk');
      const stepAwayBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-investigation-step-away');

      const handleStepAway = () => {
        this.hideIncidentModal();
        this.callbacks.onStepAway?.();
      };
      backToDeskBtn?.addEventListener('click', () => {
        if (this.phishingState) {
          this.phishingState.recentQuestion = undefined;
          this.phishingState.followupStep = 'tunde_brief';
        }
        renderDeskConversation();
      });
      stepAwayBtn?.addEventListener('click', handleStepAway);

      const updateEvidenceTray = () => {
        if (!this.phishingState || !evidenceList || !evidenceCounter) return;
        const findings: { icon: string; title: string; detail: string; type: string }[] = [];

        if (this.phishingState.isSenderInspected) {
          findings.push({
            icon: '🔍',
            title: 'Suspicious Sender & Failed SPF',
            detail: 'Return-Path via Russian relay, SPF failed. Domain firs-gov.com.ng registered 3 days ago.',
            type: 'warning',
          });
        }
        if (this.phishingState.isLinkInspected) {
          findings.push({
            icon: '🔗',
            title: 'Insecure Phishing Destination',
            detail: 'Unencrypted HTTP link pointing to lookalike host firs-gov.com.ng/portal/tax-clearance.',
            type: 'warning',
          });
        }
        if (this.phishingState.credentialsSubmitted) {
          findings.push({
            icon: '⚠️',
            title: 'Critical Account Compromise',
            detail: 'Corporate credentials submitted to untrusted portal. External session transmitted.',
            type: 'critical',
          });
        } else if (this.phishingState.linkOpened) {
          findings.push({
            icon: 'ℹ️',
            title: 'Scam Verified (Credentials Safe)',
            detail: 'Fake portal visited; you backed out safely without submitting corporate credentials.',
            type: 'info',
          });
        }

        evidenceCounter.textContent = `${findings.length} Finding${findings.length === 1 ? '' : 's'}`;
        if (findings.length === 0) {
          evidenceList.innerHTML = `<div class="evidence-empty-hint">Inspect the sender or check the link to uncover forensic evidence.</div>`;
        } else {
          evidenceList.innerHTML = findings
            .map(
              (f) => `
              <div class="evidence-item ${f.type}">
                <span class="evidence-icon">${f.icon}</span>
                <div class="evidence-content">
                  <strong class="evidence-title">${f.title}</strong>
                  <p class="evidence-detail">${f.detail}</p>
                </div>
              </div>
            `
            )
            .join('');
        }
      };

      const updateStatusView = () => {
        if (!this.phishingState || !statusBanner) return;
        if (this.phishingState.credentialsSubmitted) {
          statusBanner.className = 'phish-status-banner critical';
          statusBanner.innerHTML = '⚠️ <strong>Credentials submitted:</strong> You entered your password into the external site. Session token was transmitted.';
          statusBanner.classList.remove('hidden');
        } else if (this.phishingState.linkOpened) {
          statusBanner.className = 'phish-status-banner warning';
          statusBanner.innerHTML = 'ℹ️ <strong>Link opened:</strong> External page requested corporate login. You backed out without entering credentials.';
          statusBanner.classList.remove('hidden');
        } else {
          statusBanner.classList.add('hidden');
        }
      };

      const updateDecisionCards = () => {
        if (!this.phishingState || !cardsContainer) return;
        const { linkOpened, credentialsSubmitted, selectedAction } = this.phishingState;

        let cardsHtml = '';
        if (credentialsSubmitted) {
          const isContain = selectedAction === 'action_contain' || selectedAction === 'action_report';
          const isDelete = selectedAction === 'action_delete';
          cardsHtml = `
            <label id="card-action-contain" class="choice-workbench-card ${isContain ? 'selected' : ''}">
              <div class="choice-selection-row">
                <input type="radio" name="phish_decision_action" value="action_contain" ${isContain ? 'checked' : ''} />
                <div class="choice-title-group">
                  <span class="choice-card-label">Immediately disclose credential exposure and initiate containment</span>
                </div>
                <div class="cost-badge emergency">Emergency Containment</div>
              </div>
              <p class="choice-desc">Alert Tunde immediately to revoke active corporate sessions, force password resets, and block the sender domain on the mail gateway.</p>
              <input type="checkbox" id="cb-reset-amaka" checked style="display: none;" />
            </label>
            <label id="card-action-delete" class="choice-workbench-card ${isDelete ? 'selected' : ''}">
              <div class="choice-selection-row">
                <input type="radio" name="phish_decision_action" value="action_delete" ${isDelete ? 'checked' : ''} />
                <div class="choice-title-group">
                  <span class="choice-card-label">Delete the message without proper escalation</span>
                </div>
                <div class="cost-badge critical">Uncontained Breach</div>
              </div>
              <p class="choice-desc">Delete from your inbox and keep silent. Leaves your compromised credentials and Yusuf's account exposed to attackers.</p>
            </label>
          `;
        } else if (linkOpened) {
          const isReport = selectedAction !== 'action_delete';
          const isDelete = selectedAction === 'action_delete';
          cardsHtml = `
            <label id="card-action-report" class="choice-workbench-card ${isReport ? 'selected' : ''}">
              <div class="choice-selection-row">
                <input type="radio" name="phish_decision_action" value="action_report" ${isReport ? 'checked' : ''} />
                <div class="choice-title-group">
                  <span class="choice-card-label">Report that the link was opened and request further checks</span>
                </div>
                <div class="cost-badge warning">Endpoint Verification</div>
              </div>
              <p class="choice-desc">Alert Tunde to verify endpoint integrity, block firs-gov.com.ng on the mail gateway, and reset Yusuf's account.</p>
            </label>
            <label id="card-action-delete" class="choice-workbench-card ${isDelete ? 'selected' : ''}">
              <div class="choice-selection-row">
                <input type="radio" name="phish_decision_action" value="action_delete" ${isDelete ? 'checked' : ''} />
                <div class="choice-title-group">
                  <span class="choice-card-label">Delete the message without proper escalation</span>
                </div>
                <div class="cost-badge">Unescalated Risk</div>
              </div>
              <p class="choice-desc">Delete from your inbox without reporting. Fails to verify endpoint safety or protect Yusuf's compromised account.</p>
            </label>
          `;
        } else {
          const isReport = selectedAction !== 'action_delete';
          const isDelete = selectedAction === 'action_delete';
          cardsHtml = `
            <label id="card-action-report" class="choice-workbench-card ${isReport ? 'selected' : ''}">
              <div class="choice-selection-row">
                <input type="radio" name="phish_decision_action" value="action_report" ${isReport ? 'checked' : ''} />
                <div class="choice-title-group">
                  <span class="choice-card-label">Report the suspicious message and coordinate containment</span>
                </div>
                <div class="cost-badge">Standard IT Triage</div>
              </div>
              <p class="choice-desc">Alert Tunde to block firs-gov.com.ng on the mail gateway and coordinate enterprise containment.</p>
            </label>
            <label id="card-action-delete" class="choice-workbench-card ${isDelete ? 'selected' : ''}">
              <div class="choice-selection-row">
                <input type="radio" name="phish_decision_action" value="action_delete" ${isDelete ? 'checked' : ''} />
                <div class="choice-title-group">
                  <span class="choice-card-label">Delete the message without proper escalation</span>
                </div>
                <div class="cost-badge">Unescalated Risk</div>
              </div>
              <p class="choice-desc">Delete from your inbox without alerting IT. Leaves colleagues exposed to identical emails and uncontained account risks.</p>
            </label>
          `;
        }

        cardsContainer.innerHTML = cardsHtml;

        // Wire radios
        const radios = cardsContainer.querySelectorAll<HTMLInputElement>('input[name="phish_decision_action"]');
        radios.forEach((radio) => {
          radio.addEventListener('change', () => {
            if (!this.phishingState) return;
            if (radio.checked) {
              this.phishingState.selectedAction = radio.value as 'action_report' | 'action_delete' | 'action_contain';
              cardsContainer.querySelectorAll('.choice-workbench-card').forEach((c) => c.classList.remove('selected'));
              radio.closest('.choice-workbench-card')?.classList.add('selected');
            }
          });
        });
      };

      // Initial updates
      updateEvidenceTray();
      updateStatusView();
      updateDecisionCards();

      // Inspect sender toggle
      inspectBtn?.addEventListener('click', () => {
        if (!this.phishingState) return;
        this.phishingState.isSenderInspected = !this.phishingState.isSenderInspected;
        if (this.phishingState.isSenderInspected) {
          inspectionDrawer?.classList.remove('hidden');
          inspectBtn.textContent = 'Hide sender details';
          this.candidateKnowledge.recordDiscovery('INSPECT_EMAIL_HEADER');
        } else {
          inspectionDrawer?.classList.add('hidden');
          inspectBtn.textContent = 'Inspect sender';
        }
        updateEvidenceTray();
      });

      // Check link toggle
      checkLinkBtn?.addEventListener('click', () => {
        if (!this.phishingState) return;
        this.phishingState.isLinkInspected = !this.phishingState.isLinkInspected;
        if (this.phishingState.isLinkInspected) {
          linkDrawer?.classList.remove('hidden');
          checkLinkBtn.textContent = 'Hide link details';
          this.candidateKnowledge.recordDiscovery('INSPECT_LINK_TARGET');
        } else {
          linkDrawer?.classList.add('hidden');
          checkLinkBtn.textContent = 'Check link';
        }
        updateEvidenceTray();
      });

      // Open link handlers
      const handleOpenLink = (e: Event) => {
        e.preventDefault();
        if (!this.phishingState) return;
        this.phishingState.linkOpened = true;
        this.candidateKnowledge.recordDiscovery('SIMULATE_PORTAL_VISIT');
        simulatedBrowser?.classList.remove('hidden');
        updateEvidenceTray();
        updateStatusView();
        updateDecisionCards();
      };
      openLinkBtn?.addEventListener('click', handleOpenLink);
      phishLink?.addEventListener('click', handleOpenLink);

      // Close browser without entering password
      const handleCloseBrowser = (e: Event) => {
        e.preventDefault();
        simulatedBrowser?.classList.add('hidden');
        updateEvidenceTray();
        updateStatusView();
        updateDecisionCards();
      };
      closeBrowserBtn?.addEventListener('click', handleCloseBrowser);
      cancelBrowserBtn?.addEventListener('click', handleCloseBrowser);

      // Submit credentials
      submitCredentialsBtn?.addEventListener('click', (e: Event) => {
        e.preventDefault();
        if (!this.phishingState) return;
        this.phishingState.linkOpened = true;
        this.phishingState.credentialsSubmitted = true;
        this.phishingState.selectedAction = 'action_contain';
        this.candidateKnowledge.recordDiscovery('SUBMIT_PORTAL_CREDENTIALS');
        simulatedBrowser?.classList.add('hidden');
        updateEvidenceTray();
        updateStatusView();
        updateDecisionCards();
      });

      // Confirm action execution
      executeBtn?.addEventListener('click', () => {
        if (!this.phishingState) return;
        const { linkOpened, credentialsSubmitted, selectedAction } = this.phishingState;
        const cbResetAmaka = this.modalContainer.querySelector<HTMLInputElement>('#cb-reset-amaka');
        const isResetAmakaChecked = cbResetAmaka ? cbResetAmaka.checked : true;

        let choiceId: string;
        if (credentialsSubmitted) {
          if ((selectedAction === 'action_contain' || selectedAction === 'action_report') && isResetAmakaChecked) {
            choiceId = 'CHOICE_MAIL_OPEN_CONTAINED';
          } else {
            // Uncontained breach: either chose delete, or uncontained compromise
            choiceId = 'CHOICE_MAIL_OPEN';
          }
        } else if (linkOpened) {
          if (selectedAction === 'action_report') {
            choiceId = 'CHOICE_MAIL_INSPECTED_REPORT';
          } else {
            choiceId = 'CHOICE_MAIL_DELETE';
          }
        } else {
          if (selectedAction === 'action_report') {
            choiceId = 'CHOICE_MAIL_REPORT';
          } else {
            choiceId = 'CHOICE_MAIL_DELETE';
          }
        }

        this.callbacks.onSelectChoice(choiceId);
      });

      this.modalContainer.classList.remove('hidden');
    };

    if (startAtWorkstation) {
      renderWorkstation();
    } else {
      renderDeskConversation();
    }
  }

  /**
   * Renders the complete, living incident consultation experience:
   * 1. Executive Briefing with Department Head
   * 2. Confirmed Facts vs Key Uncertainties breakdown
   * 3. Interactive Probing Inquiries (Q&A Accordion)
   * 4. Tailored Decision Workbench with operational safeguards & natural typing
   */
  public showIncidentModal(
    incident: Incident,
    choices: readonly EvaluatedChoice[],
    interactionSpec?: IncidentInteractionSpec,
    startAtWorkstation: boolean = false
  ): void {
    if (incident.id === 'INC_MAIL_FIRS') {
      this.showPhishingEmailModal(incident, choices, startAtWorkstation);
      return;
    }

    if (interactionSpec) {
      this.showIncidentWorkbench(incident, interactionSpec);
      return;
    }

    this.mobileControls?.setEnabled(false);

    this.activeIncident = incident;
    this.activeChoices = choices;
    this.answeredQuestions.clear();

    const tracker = this.getCandidateKnowledge(incident.id);
    tracker.recordDiscovery('STARTING_CONTEXT');
    if (incident.artifact) {
      tracker.recordDiscovery('READ_INCIDENT_ARTIFACT');
    }

    this.selectedStrategyId =
      choices.find((c) => !c.isLocked && c.isDefault)?.id ??
      choices.find((c) => !c.isLocked)?.id ??
      choices[0]?.id ??
      null;

    const head = staffForDepartment(incident.department);
    const deptClass = incident.department.toLowerCase();


    const choicesHtml = choices
      .map((choice) => {
        const costPreview = this.getChoiceFinancialPreview(choice);

        const lockAlert = choice.isLocked
          ? `<div class="lock-banner">
              <span class="lock-icon">🔒 Not available</span>
              <span class="lock-reason">${choice.lockReasons.join('; ')}</span>
            </div>`
          : '';

        const isChecked = this.selectedStrategyId === choice.id;

        return `
        <label class="choice-workbench-card ${choice.isLocked ? 'locked' : ''} ${isChecked ? 'selected' : ''}">
          <div class="choice-selection-row">
            <input
              type="radio"
              name="executive_strategy"
              value="${choice.id}"
              ${choice.isLocked ? 'disabled' : ''}
              ${isChecked ? 'checked' : ''}
            />
            <div class="choice-title-group">
              <span class="choice-card-label">${choice.label}</span>
            </div>
            <div class="cost-badge">${costPreview}</div>
          </div>
          <p class="choice-desc">${choice.description}</p>
          ${lockAlert}
        </label>
      `;
      })
      .join('');

    this.modalContainer.innerHTML = `
      <div class="modal-dialog incident-dialog">
        <div class="modal-header ${deptClass}">
          <div class="dept-indicator">
            <span class="consult-badge" style="background-color: ${head.color}">
              ${head.name} · ${head.role}
            </span>
            ${
              incident.alsoPresent
                ? `<span class="consult-badge is-secondary">${incident.alsoPresent.name} · ${incident.alsoPresent.role}</span>`
                : ''
            }
            <span class="turn-indicator">Turn ${incident.turn} · ${COMPANY.city}</span>
          </div>
          <h2 class="incident-title">${incident.title}</h2>
          <span class="severity-badge ${incident.urgency.toLowerCase()}">${incident.urgency.toUpperCase()}</span>
        </div>

        <div class="modal-body">
          <div class="consultation-section briefing-card">
            <div class="briefing-speech-bubble">
              <span class="voice-name">${head.name} · ${head.role}</span>
              <p class="spoken-briefing">"${incident.basePremise}"</p>
            </div>
            ${
              incident.alsoPresent
                ? `<div class="briefing-speech-bubble is-second">
                    <span class="voice-name">${incident.alsoPresent.name} · ${incident.alsoPresent.role}</span>
                    <p class="spoken-briefing">"${incident.alsoPresent.line}"</p>
                  </div>
                  ${
                    incident.alsoPresent.followUp
                      ? `<details class="voice-followup">
                          <summary>Ask ${incident.alsoPresent.name.split(' ')[0]}: "${incident.alsoPresent.followUp.question}"</summary>
                          <p class="voice-answer">"${incident.alsoPresent.followUp.answer}"</p>
                        </details>`
                      : ''
                  }`
                : ''
            }
            ${
              incident.artifact
                ? `<div class="incident-artifact">
                    <span class="artifact-title">${incident.artifact.title}</span>
                    <span class="artifact-meta">${incident.artifact.meta}</span>
                    ${incident.artifact.lines.map((line) => `<p>${line}</p>`).join('')}
                  </div>`
                : ''
            }
            <p class="section-help">${incident.businessContext}</p>
          </div>

          <div class="consultation-section workbench-section">
            <h4 class="workbench-subhead">${incident.decisionPrompt ?? 'What do you want done?'}</h4>
            <div class="choices-list">
              ${choicesHtml}
            </div>

            <div class="directive-section">
              <div class="directive-header">
                <span class="directive-title">Your instruction</span>
                <span class="directive-hint">Optional. Type it in your own words.</span>
              </div>
              <div class="directive-input-group">
                <input
                  id="directive-input"
                  type="text"
                  class="directive-input"
                  placeholder="e.g. Reset his password and warn the staff."
                />
                <button id="btn-submit-directive" class="btn btn-secondary" type="button">Read it back</button>
              </div>
              <div id="directive-feedback" class="directive-feedback hidden"></div>
            </div>

            <div class="workbench-execution-bar">
              <div class="execution-warning">
                This goes on the record under your name, ${PLAYER.short}.
              </div>
              <button id="btn-execute-decision" class="btn btn-primary btn-large">
                Authorise
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 1. Wire Q&A Accordion
    const qaItems = this.modalContainer.querySelectorAll<HTMLDivElement>('.qa-item');
    qaItems.forEach((item) => {
      const btn = item.querySelector('.qa-question-btn');
      const answer = item.querySelector('.qa-answer');
      const chevron = item.querySelector('.qa-chevron');

      btn?.addEventListener('click', () => {
        const isHidden = answer?.classList.contains('hidden');
        if (isHidden) {
          answer?.classList.remove('hidden');
          chevron?.classList.add('rotated');
          item.classList.add('expanded');
        } else {
          answer?.classList.add('hidden');
          chevron?.classList.remove('rotated');
          item.classList.remove('expanded');
        }
      });
    });

    // Wire alsoPresent voice follow-up details toggle
    const followupDetails = this.modalContainer.querySelector<HTMLDetailsElement>('.voice-followup');
    followupDetails?.addEventListener('toggle', () => {
      if (followupDetails.open) {
        tracker.recordDiscovery('ASK_INCIDENT_INTERVIEW');
      }
    });

    // 2. Wire Strategy Radio Selection
    const strategyRadios = this.modalContainer.querySelectorAll<HTMLInputElement>(
      'input[name="executive_strategy"]'
    );
    strategyRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.selectedStrategyId = radio.value;
          // Refresh selected styling
          this.modalContainer.querySelectorAll('.choice-workbench-card').forEach((card) => {
            card.classList.remove('selected');
          });
          radio.closest('.choice-workbench-card')?.classList.add('selected');
        }
      });
    });

    // 3. Wire Directive Input & Natural Language Matcher
    const directiveInput = this.modalContainer.querySelector<HTMLInputElement>('#directive-input');
    const submitBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-submit-directive');
    const feedbackBox = this.modalContainer.querySelector<HTMLDivElement>('#directive-feedback');

    const evaluateDirective = () => {
      if (!directiveInput || !feedbackBox) return;
      const text = directiveInput.value.trim();
      if (!text) {
        feedbackBox.classList.add('hidden');
        return;
      }

      const match = matchPlayerDirective(text, choices);

      if (match.matched && match.choiceId && match.matchedChoice) {
        const matched = match.matchedChoice;
        if (matched.isLocked) {
          feedbackBox.className = 'directive-feedback warning';
          feedbackBox.innerHTML = `
            <div class="feedback-msg">
              <strong>Identified Strategy: ${matched.label}</strong>
              <p>⚠️ Cannot execute: ${matched.lockReasons.join('; ')}</p>
            </div>
          `;
        } else {
          feedbackBox.className = 'directive-feedback success';
          feedbackBox.innerHTML = `
            <div class="feedback-msg">
              <strong>Identified Strategy: ${matched.label}</strong>
              <p>${match.interpretation}</p>
            </div>
            <button id="btn-apply-strategy" class="btn btn-primary btn-sm" type="button">Select This Strategy</button>
          `;
          const applyBtn = feedbackBox.querySelector<HTMLButtonElement>('#btn-apply-strategy');
          applyBtn?.addEventListener('click', () => {
            if (match.choiceId) {
              this.selectedStrategyId = match.choiceId;
              const targetRadio = this.modalContainer.querySelector<HTMLInputElement>(
                `input[value="${match.choiceId}"]`
              );
              if (targetRadio) {
                targetRadio.checked = true;
                this.modalContainer.querySelectorAll('.choice-workbench-card').forEach((c) => {
                  c.classList.remove('selected');
                });
                targetRadio.closest('.choice-workbench-card')?.classList.add('selected');
              }
            }
          });
        }
      } else {
        feedbackBox.className = 'directive-feedback info';
        feedbackBox.innerHTML = `
          <div class="feedback-msg">
            <strong>Supplementary Executive Directives Recognized</strong>
            <p>Your notes will be attached to the authorized departmental implementation order.</p>
          </div>
        `;
      }
      feedbackBox.classList.remove('hidden');
    };

    submitBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      evaluateDirective();
    });

    directiveInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        evaluateDirective();
      }
    });

    // Clicking outside the directive field blurs it and restores game controls
    this.modalContainer.addEventListener('pointerdown', (e) => {
      if (e.target !== directiveInput && document.activeElement === directiveInput) {
        directiveInput?.blur();
      }
    });

    // 4. Wire Final Decision Execution
    const executeBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-execute-decision');
    executeBtn?.addEventListener('click', () => {
      if (!this.selectedStrategyId) {
        alert('Please select an authorized strategy option before signing the executive directive.');
        return;
      }
      const additionalNotes = directiveInput?.value.trim() ?? '';
      this.callbacks.onSelectChoice(this.selectedStrategyId, additionalNotes);
    });

    this.modalContainer.classList.remove('hidden');
  }

  /**
   * Closes the incident modal.
   */
  public hideIncidentModal(): void {
    this.releaseTextFocus();
    if (this.escapeKeyListener) {
      window.removeEventListener('keydown', this.escapeKeyListener);
      this.escapeKeyListener = undefined;
    }
    this.workbench?.destroy();
    this.workbench = undefined;
    this.suspendedWorkbench = undefined;
    this.outcomeView?.destroy();
    this.outcomeView = undefined;
    this.modalContainer.classList.add('hidden');
    this.modalContainer.innerHTML = '';
    this.mobileControls?.setEnabled(true);
  }

  // ==========================================================================
  // RESOLUTION AFTERMATH & CROSS-DEPARTMENT REACTION
  // ==========================================================================

  /**
   * Displays the decision resolution dialog with immediate deltas, settlement breakdown,
   * scheduled delayed consequences, and the immediate cross-department reaction memo.
   */
  public showResolutionModal(
    record: DecisionLedgerRecord,
    nextPhase: SimulationPhase,
    isInsolvent: boolean,
    crossReaction?: CrossDeptReaction | readonly CrossDeptReaction[]
  ): void {
    const isCompleted = nextPhase === 'SIMULATION_COMPLETED' || isInsolvent;
    const isPhishing =
      record.chosenOptionId.startsWith('CHOICE_PHISH_') ||
      record.chosenOptionId.startsWith('CHOICE_MAIL_');

    if (record.incidentId) {
      this.getCandidateKnowledge(record.incidentId).recordDiscovery('OUTCOME_DEBRIEF');
    } else if (isPhishing) {
      this.getCandidateKnowledge('INC_MAIL_FIRS').recordDiscovery('OUTCOME_DEBRIEF');
    }

    this.modalContainer.className = 'modal-backdrop is-resolution-overlay';

    const continueBtnText = isPhishing
      ? 'Return to office'
      : isCompleted
      ? 'View Performance Debrief'
      : 'Proceed to Next Turn';

    const outcomeDialogue = isPhishing ? getPhishingOutcomeConversation(record.chosenOptionId) : null;

    const cashDelta = record.immediateFinancialDeltas.cashDelta;
    const itDelta = record.immediateMetricDeltas.itDelta;
    const hrDelta = record.immediateMetricDeltas.hrDelta;

    const cashClass = cashDelta < 0 ? 'impact-neg' : cashDelta > 0 ? 'impact-pos' : 'impact-neutral';
    const itClass = itDelta < 0 ? 'impact-neg' : itDelta > 0 ? 'impact-pos' : 'impact-neutral';
    const hrClass = hrDelta < 0 ? 'impact-neg' : hrDelta > 0 ? 'impact-pos' : 'impact-neutral';

    const scheduledHtml =
      record.delayedEffectsScheduled.length > 0
        ? `<div class="compact-risk-pill scheduled">
            <span class="risk-icon">⚠️</span>
            <div class="risk-content">
              <strong>Pending Risk (Turn ${record.delayedEffectsScheduled[0].triggerTurn}):</strong>
              ${record.delayedEffectsScheduled
                .map((s: { readonly triggerTurn: number; readonly description: string }) => s.description)
                .join(' ')}
            </div>
          </div>`
        : '';

    const resolvedHtml =
      record.delayedEffectsResolvedThisTurn.length > 0
        ? `<div class="compact-risk-pill resolved">
            <span class="risk-icon">💥</span>
            <div class="risk-content">
              <strong>Past Consequence Came Due:</strong>
              ${record.delayedEffectsResolvedThisTurn
                .map(
                  (r: DelayedEffectResolution) =>
                    `${r.narrativeDescription} (${this.formatCurrencyDelta(
                      r.appliedDeltas.cashDelta
                    )}, IT ${r.appliedDeltas.itDelta > 0 ? '+' : ''}${r.appliedDeltas.itDelta})`
                )
                .join(' ')}
            </div>
          </div>`
        : '';

    const crossReactionsList = Array.isArray(crossReaction)
      ? crossReaction
      : crossReaction
      ? [crossReaction]
      : [];

    const crossReactionHtml =
      crossReactionsList.length > 0
        ? `
      <div class="resolution-reactions-list">
        <h4 class="reactions-header">🏢 Department Feedback</h4>
        ${crossReactionsList
          .map(
            (r) => `
          <div class="resolution-reaction-card ${r.tone}">
            <div class="reaction-meta">
              <span class="reaction-sender">${r.senderName} (${r.senderTitle})</span>
              <span class="reaction-timestamp">${r.timestamp}</span>
            </div>
            <div class="reaction-subject">${r.subject}</div>
            <div class="reaction-message">"${r.message}"</div>
          </div>
        `
          )
          .join('')}
      </div>
    `
        : '';

    this.modalContainer.innerHTML = `
      <div class="modal-dialog resolution-dialog">
        <div class="modal-header">
          <div class="dept-indicator">Turn ${record.turn} Incident Outcome</div>
          <h2 class="incident-title">${record.chosenOptionLabel}</h2>
        </div>

        <div class="modal-body">
          <!-- 1. Concise Summary of Action & Immediate Consequence -->
          <div class="outcome-action-summary">
            <span class="outcome-summary-badge">Immediate Consequence</span>
            <p class="outcome-summary-text">${record.effectiveChoiceImpact.operationalExplanation}</p>
          </div>

          <!-- 2. One Short Natural Response from Tunde -->
          ${
            outcomeDialogue
              ? `
          <div class="outcome-tunde-quote-card resolution-outcome-dialogue">
            <div class="tunde-quote-avatar">TB</div>
            <div class="tunde-quote-body">
              <span class="tunde-quote-speaker">Tunde Bello · Head of IT</span>
              <p class="tunde-quote-text">“${outcomeDialogue.tundeLine}”</p>
            </div>
          </div>
          `
              : ''
          }

          <!-- 3. Essential Company-Health Changes in Compact Form -->
          <div class="compact-health-strip">
            <div class="compact-metric-pill ${cashClass}">
              <span class="metric-icon">💰</span>
              <span class="metric-label">Cash:</span>
              <span class="metric-val">${this.formatCurrencyDelta(cashDelta)}</span>
            </div>
            <div class="compact-metric-pill ${itClass}">
              <span class="metric-icon">🖥️</span>
              <span class="metric-label">IT:</span>
              <span class="metric-val">${itDelta >= 0 ? '+' : ''}${itDelta}</span>
            </div>
            <div class="compact-metric-pill ${hrClass}">
              <span class="metric-icon">👥</span>
              <span class="metric-label">HR:</span>
              <span class="metric-val">${hrDelta >= 0 ? '+' : ''}${hrDelta}</span>
            </div>
          </div>

          <!-- 4. Pending Delayed Risk in Compact Form (if any) -->
          ${scheduledHtml}
          ${resolvedHtml}

          <!-- 5. One Brief Professional Learning Takeaway -->
          <div class="compact-takeaway-card">
            <div class="takeaway-headline">
              <span class="takeaway-icon">💡</span>
              <strong>Key Takeaway:</strong> ${record.learningFeedback.corePrinciple}
            </div>
            <p class="takeaway-summary-text">${record.learningFeedback.tradeoffSummary}</p>
          </div>

          <!-- 6. Optional Expandable Compliance & Documentation Details -->
          <details class="resolution-expandable-details">
            <summary class="details-toggle-btn">
              <span>📋 View Compliance & Incident Documentation</span>
              <span class="toggle-indicator">▾</span>
            </summary>
            <div class="details-accordion-body">
              ${
                outcomeDialogue && outcomeDialogue.amakaLine
                  ? `
              <div class="detail-block amaka-compliance">
                <span class="detail-speaker-tag">Amaka Obi · Chief Compliance Officer</span>
                <p class="detail-quote">“${outcomeDialogue.amakaLine}”</p>
              </div>
              `
                  : ''
              }

              ${
                record.learningFeedback.risksCreated && record.learningFeedback.risksCreated.length > 0
                  ? `
              <div class="detail-block takeaway-escalation">
                <strong class="checklist-title">Incident Audit & Escalation Checklist:</strong>
                <ul class="checklist-items">
                  ${record.learningFeedback.risksCreated.map((r: string) => `<li>${r}</li>`).join('')}
                </ul>
              </div>
              `
                  : ''
              }

              ${
                crossReactionHtml
                  ? `
              <div class="detail-block">
                ${crossReactionHtml}
              </div>
              `
                  : ''
              }
            </div>
          </details>
        </div>

        <div class="modal-footer">
          <button id="btn-continue-resolution" class="btn btn-primary btn-large">
            ${continueBtnText}
          </button>
        </div>
      </div>
    `;

    const continueBtn = document.getElementById('btn-continue-resolution');
    continueBtn?.addEventListener('click', () => {
      this.callbacks.onDismissResolution();
    });

    this.mobileControls?.setEnabled(false);
    this.modalContainer.classList.remove('hidden');
  }

  // ==========================================================================
  // GAME OVER & PERFORMANCE REPORT
  // ==========================================================================

  /**
   * Displays the memorable, dramatic Game Over collapse screen.
   */
  public showGameOver(
    title: string,
    punchline: string,
    causeDescription: string,
    decisionHistory: readonly DecisionLedgerRecord[]
  ): void {
    const historyCards = decisionHistory
      .map(
        (rec) => `
        <div class="history-card fatal">
          <div class="history-turn">Turn ${rec.turn} · ${rec.department === 'HR' ? 'Human Resources' : rec.department}</div>
          <div class="history-choice">${rec.chosenOptionLabel}</div>
          <div class="history-deltas">
            Cash: ${this.formatCurrencyDelta(rec.immediateFinancialDeltas.cashDelta)} |
            IT: ${rec.immediateMetricDeltas.itDelta >= 0 ? '+' : ''}${rec.immediateMetricDeltas.itDelta} |
            HR: ${rec.immediateMetricDeltas.hrDelta >= 0 ? '+' : ''}${rec.immediateMetricDeltas.hrDelta}
          </div>
        </div>
      `
      )
      .join('');

    this.modalContainer.innerHTML = `
      <div class="modal-dialog gameover-dialog">
        <div class="gameover-header">
          <div class="gameover-skull">💀</div>
          <h1 class="gameover-title">${title}</h1>
          <p class="gameover-punchline">"${punchline}"</p>
        </div>

        <div class="modal-body">
          <div class="gameover-cause">
            <h3>Root Cause of Collapse:</h3>
            <p>${causeDescription}</p>
          </div>

          <h3 class="section-title">Timeline of Decisions Leading to Collapse</h3>
          <div class="history-list">
            ${historyCards}
          </div>

          <div class="gameover-footer">
            <button id="btn-gameover-restart" class="btn btn-danger btn-large">
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    `;

    const restartBtn = document.getElementById('btn-gameover-restart');
    restartBtn?.addEventListener('click', () => {
      this.candidateKnowledge.reset();
      this.callbacks.onRestart();
    });

    this.mobileControls?.setEnabled(false);
    this.modalContainer.classList.remove('hidden');
  }

  /**
   * Displays the final executive debrief report for surviving companies.
   */
  public showPerformanceReport(report: PerformanceReport): void {
    const gradeColor = this.getGradeColor(report.finalGrade);

    const historyCards = report.decisionHistory
      .map(
        (rec: DecisionLedgerRecord) => `
        <div class="history-card">
          <div class="history-turn">Turn ${rec.turn} · ${rec.department === 'HR' ? 'Human Resources' : rec.department}</div>
          <div class="history-choice">${rec.chosenOptionLabel}</div>
          <div class="history-deltas">
            Cash: ${this.formatCurrencyDelta(rec.immediateFinancialDeltas.cashDelta)} |
            IT: ${rec.immediateMetricDeltas.itDelta >= 0 ? '+' : ''}${rec.immediateMetricDeltas.itDelta} |
            HR: ${rec.immediateMetricDeltas.hrDelta >= 0 ? '+' : ''}${rec.immediateMetricDeltas.hrDelta}
          </div>
        </div>
      `
      )
      .join('');

    this.modalContainer.innerHTML = `
      <div class="modal-dialog report-dialog">
        <div class="modal-header report-header">
          <div class="report-badge-container">
            <div class="report-grade" style="background-color: ${gradeColor}">
              ${report.finalGrade}
            </div>
            <div class="report-title-group">
              <div class="report-subtitle">EXECUTIVE MANAGEMENT REVIEW</div>
              <h2 class="report-title">
                Company Survival Status: Solvent & Operational
              </h2>
            </div>
          </div>
          <div class="report-health-score">
            <span class="label">OVERALL COMPANY HEALTH</span>
            <span class="score" style="color: ${gradeColor}">${report.overallHealthScore}/100</span>
          </div>
        </div>

        <div class="modal-body">
          <div class="executive-summary-box">
            <p>${report.executiveSummary}</p>
          </div>

          <h3 class="section-title">Final Department Metrics</h3>
          <div class="report-metrics-grid">
            <div class="metric-block">
              <span class="label">Ending Cash</span>
              <span class="value">${this.formatCurrency(report.financialState.cash)}</span>
            </div>
            <div class="metric-block">
              <span class="label">Outstanding Debt</span>
              <span class="value">${this.formatCurrency(report.financialState.debtService.postPaymentPrincipal)}</span>
            </div>
            <div class="metric-block">
              <span class="label">Effective Runway</span>
              <span class="value">${report.financialState.effectiveRunwayMonths.toFixed(1)} mos</span>
            </div>
            <div class="metric-block">
              <span class="label">IT Infrastructure</span>
              <span class="value">${report.departmentalSummaries.it.stability}/100</span>
            </div>
            <div class="metric-block">
              <span class="label">Human Resources</span>
              <span class="value">${report.departmentalSummaries.hr.morale}/100</span>
            </div>
            <div class="metric-block">
              <span class="label">Financial Health</span>
              <span class="value">${report.financialState.roundedFinancialHealth}/100</span>
            </div>
          </div>

          <h3 class="section-title">Decision Audit Trail</h3>
          <div class="history-list">
            ${historyCards}
          </div>

          <div class="modal-footer">
            <button id="btn-close-report" class="btn btn-secondary" type="button">
              🚶 Return to Office
            </button>
            <button id="btn-restart-simulation" class="btn btn-primary btn-large" type="button">
              🔄 Start Fresh Simulation
            </button>
          </div>
        </div>
      </div>
    `;

    const closeReportBtn = document.getElementById('btn-close-report');
    closeReportBtn?.addEventListener('click', () => {
      this.hidePerformanceReport();
      this.callbacks.onStepAway?.();
    });

    const restartBtn = document.getElementById('btn-restart-simulation');
    restartBtn?.addEventListener('click', () => {
      this.candidateKnowledge.reset();
      this.callbacks.onRestart();
    });

    this.mobileControls?.setEnabled(false);
    this.modalContainer.classList.remove('hidden');
  }

  /**
   * Closes performance report or game over modal.
   */
  public hidePerformanceReport(): void {
    this.modalContainer.classList.add('hidden');
    this.modalContainer.innerHTML = '';
    this.mobileControls?.setEnabled(true);
  }

  // ==========================================================================
  // CONSEQUENCE PREVIEW DATA HELPERS (REALISM & UNCERTAINTY)
  // ==========================================================================

  private getChoiceFinancialPreview(choice: EvaluatedChoice | string): string {
    const choiceId = typeof choice === 'string' ? choice : choice.id;

    if (typeof choice !== 'string') {
      const cashDelta = choice.effectiveImpact.cashDelta;
      const burnDelta = choice.effectiveImpact.grossBurnRateDelta;
      const debtDelta = choice.effectiveImpact.debtDelta;

      if (debtDelta > 0) {
        return '+$75,000 Cash Facility ($3,500/mo principal + 8% APR)';
      }
      if (cashDelta < 0 && burnDelta > 0) {
        return `${this.formatCurrency(Math.abs(cashDelta))} Retention Bonuses + ${this.formatCurrency(burnDelta)}/mo Payroll Burn`;
      }
      if (cashDelta < 0 && burnDelta < 0) {
        return `${this.formatCurrency(Math.abs(cashDelta))} Upfront (${this.formatCurrency(Math.abs(burnDelta))}/mo Burn Reduction)`;
      }
      if (cashDelta < 0 && burnDelta === 0) {
        return `${this.formatCurrency(Math.abs(cashDelta))} Upfront Outlay`;
      }
      if (cashDelta === 0 && burnDelta < 0) {
        return `$0 Upfront (Cuts Monthly Burn by ${this.formatCurrency(Math.abs(burnDelta))}/mo)`;
      }
      if (cashDelta === 0 && burnDelta === 0) {
        return '$0 External Cash Outlay';
      }
    }

    switch (choiceId) {
      case 'CHOICE_1A':
        return '$30,000 Upfront Specialist Fee';
      case 'CHOICE_1B':
        return '$5,000 Overtime & Tooling Cost';
      case 'CHOICE_1C':
        return '$0 External Cash Outlay';
      case 'CHOICE_2A':
        return '$35,000 Retention Bonuses + $6,000/mo Payroll Burn';
      case 'CHOICE_2B':
        return '$1,500 Catering & Merchandise Cost';
      case 'CHOICE_2C':
        return '$15,000 Targeted Grants + $1,000/mo Payroll Burn';
      case 'CHOICE_3A':
        return '$0 Upfront (Cuts Monthly Burn by $6,000/mo)';
      case 'CHOICE_3B':
        return '+$75,000 Cash Facility ($3,500/mo principal + 8% APR)';
      case 'CHOICE_3C':
        return '$10,000 Upfront (Cuts Cloud Burn by $2,000–$5,000/mo)';
      default:
        return 'Financial impact pending';
    }
  }

  // ==========================================================================
  // FORMATTING & HELPERS
  // ==========================================================================

  private formatCurrency(cents: number): string {
    const isNegative = cents < 0;
    const absDollars = Math.abs(cents) / 100;
    const formatted = absDollars.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return isNegative ? `-${formatted}` : formatted;
  }

  private formatCurrencyDelta(cents: number): string {
    if (cents === 0) return '$0';
    const prefix = cents > 0 ? '+' : '';
    return `${prefix}${this.formatCurrency(cents)}`;
  }

  private getGradeColor(grade: string): string {
    switch (grade) {
      case 'A':
        return '#10b981'; // emerald
      case 'B':
        return '#38bdf8'; // sky
      case 'C':
        return '#f59e0b'; // amber
      case 'D':
        return '#f97316'; // orange
      case 'F':
      default:
        return '#ef4444'; // red
    }
  }

  private getTurnDepartmentName(turn: number): string {
    const order = ['IT', 'HR', 'FINANCE', 'LEGAL'] as const;
    const department = order[turn - 1];
    if (!department) {
      return 'Main Lobby';
    }
    const head = staffForDepartment(department);
    const label =
      department === 'HR' ? 'People' : department === 'FINANCE' ? 'Finance' : department === 'LEGAL' ? 'Legal' : 'IT';
    return `${label} (${head.name})`;
  }
}
