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
import { matchPlayerDirective } from './decisionMatcher.ts';
import {
  DEPARTMENT_HEADS,
  INCIDENT_DIALOGUES,
  type CrossDeptReaction,
} from './commsData.ts';
import { MobileControls } from './MobileControls.ts';

export interface UIManagerCallbacks {
  readonly onSelectChoice: (choiceId: string, additionalInstructions?: string) => void;
  readonly onDismissResolution: () => void;
  readonly onRestart: () => void;
  readonly onPromptInteract: () => void;
  readonly onStepAway?: () => void;
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

  // Active Incident context
  private activeIncident: Incident | null = null;
  private activeChoices: readonly EvaluatedChoice[] = [];
  private answeredQuestions: Set<string> = new Set();
  private selectedStrategyId: string | null = null;
  private escapeKeyListener?: (e: KeyboardEvent) => void;

  public getActiveChoices(): readonly EvaluatedChoice[] {
    return this.activeChoices;
  }

  public getMobileControls(): MobileControls | undefined {
    return this.mobileControls;
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
    const { financials, metrics, currentTurn, totalTurns, phase, isInsolvent } = state;

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

      <div class="hud-center">
        <div class="metric-card ${financials.cash < 0 ? 'critical' : ''}">
          <span class="label">CASH RESERVES</span>
          <span class="value">${cashFormatted}</span>
        </div>
        <div class="metric-card ${financials.debtService.hasActiveDebt ? 'warning' : ''}">
          <span class="label">DEBT PRINCIPAL</span>
          <span class="value">${debtFormatted}</span>
        </div>
        <div class="metric-card">
          <span class="label">NET MONTHLY BURN</span>
          <span class="value">${netBurnFormatted}/mo</span>
        </div>
        <div class="metric-card ${financials.effectiveRunwayMonths < 6 ? 'critical' : financials.effectiveRunwayMonths < 12 ? 'warning' : ''}">
          <span class="label">EST. RUNWAY</span>
          <span class="value">${runwayFormatted}</span>
        </div>
      </div>

      <div class="hud-right">
        <div class="pillars-group">
          <div class="pillar-pill it" title="IT Platform Stability (0-100)">
            <span class="pillar-icon">💻 IT Stability</span>
            <span class="pillar-val">${metrics.itStability}</span>
          </div>
          <div class="pillar-pill hr" title="Human Resources Morale (0-100)">
            <span class="pillar-icon">👥 HR Morale</span>
            <span class="pillar-val">${metrics.hrMorale}</span>
          </div>
          <div class="pillar-pill fin" title="Treasury Financial Health (0-100)">
            <span class="pillar-icon">📊 Finance Health</span>
            <span class="pillar-val">${financials.roundedFinancialHealth}</span>
          </div>
        </div>

        <div class="overall-badge" style="border-color: ${gradeColor}">
          <div class="health-num" title="Overall Company Health">${metrics.overallHealthScore}</div>
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
    if (incident.id === 'INC_PHISH_1') {
      const msg: CommsMessage = {
        id: `incident-phish`,
        channel: 'urgent',
        senderName: 'Maya Lin',
        senderRole: 'IT Security Lead',
        senderDept: 'IT',
        timestamp: '09:14 AM · Priority Alert',
        subject: 'URGENT: Active Phishing Session Anomaly (Tom Bradley)',
        body: 'Automated telemetry flagged an active concurrent login from Frankfurt, Germany on Tom Bradley’s Accounts Payable credentials. Session navigated to vendor payments.',
        tone: 'critical',
        isIncident: true,
      };
      this.messages.unshift(msg);
      this.unreadCommsCount++;
      this.updateHUDCommsBadge();
      this.renderCommsDrawer();
      this.showToastNotification(
        'URGENT DISPATCH · IT SECURITY',
        'Maya Lin',
        'IT Security Lead',
        'Active Phishing Session Anomaly (Tom Bradley)',
        () => {
          this.callbacks.onPromptInteract();
        }
      );
      return;
    }

    const dialogue = INCIDENT_DIALOGUES[incident.turn];
    if (!dialogue) return;

    // Log into messages collection
    this.messages.unshift({
      id: `incident-${incident.turn}`,
      channel: 'urgent',
      senderName: dialogue.head.name,
      senderRole: dialogue.head.role,
      senderDept: dialogue.head.department,
      timestamp: dialogue.timestamp,
      subject: dialogue.subject,
      body: dialogue.briefingLead,
      tone: 'critical',
      isIncident: true,
    });

    this.unreadCommsCount++;
    this.updateHUDCommsBadge();
    this.renderCommsDrawer();

    // Trigger in-game toast notification
    this.showToastNotification(
      `URGENT DISPATCH · ${dialogue.head.department}`,
      dialogue.head.name,
      dialogue.head.role,
      dialogue.subject,
      () => {
        this.callbacks.onPromptInteract();
      }
    );
  }

  /**
   * Appends an authentic cross-department reaction memo to the Comms Hub and shows a toast.
   */
  public addCrossDeptReaction(reaction: CrossDeptReaction): void {
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
    let formattedDept = `${deptName} Department`;
    if (this.activeIncident?.id === 'INC_PHISH_1' || deptName === 'IT') {
      formattedDept = 'Maya Lin (IT Security Lead)';
    } else {
      const head = DEPARTMENT_HEADS[deptName as 'IT' | 'HR' | 'FINANCE' | 'LEGAL'];
      formattedDept = head ? `${head.name} (${head.role})` : `${deptName} Department`;
    }

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
   * Renders the bespoke Colleague Consultation dialogue with Maya Lin (IT Security Lead)
   * for the Phishing Attack incident.
   */
  private showPhishingModal(incident: Incident, choices: readonly EvaluatedChoice[]): void {
    this.activeIncident = incident;
    this.activeChoices = choices;
    this.answeredQuestions.clear();
    this.selectedStrategyId = choices.find((c) => !c.isLocked)?.id ?? choices[0]?.id ?? null;

    // Attach Escape key listener for stepping away
    if (this.escapeKeyListener) {
      window.removeEventListener('keydown', this.escapeKeyListener);
    }
    this.escapeKeyListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.hideIncidentModal();
        this.callbacks.onStepAway?.();
      }
    };
    window.addEventListener('keydown', this.escapeKeyListener);
    this.mobileControls?.setEnabled(false);

    const confirmedFacts = [
      'Tom Bradley (Accounts Payable, Senior Financial Analyst) received an email appearing to come from the CEO requesting urgent review of a confidential financial spreadsheet.',
      'Tom clicked the external link and submitted his corporate Single Sign-On (SSO) credentials on a spoofed login page.',
      'Automated telemetry detected a concurrent session authenticated with Tom’s valid tokens originating from Frankfurt, Germany (IP 185.220.101.44) 12 minutes later.',
      'Tom’s primary workstation in Chicago remains active and connected to internal network services.',
      'Tom holds authorization to draft and approve supplier wire disbursements up to $50,000 without dual executive signoff.',
    ];

    const uncertainties = [
      'Whether the Frankfurt session has already submitted unauthorized payment API requests to banking partners.',
      'Whether the adversary downloaded confidential client banking details or tax identification records.',
      'Whether the attacker deployed hidden email forwarding rules or mailbox persistence in Tom’s account.',
      'Whether Tom is currently aware that his account credentials were harvested.',
    ];

    const probingQuestions = [
      {
        id: 'q-phish-permissions',
        question: 'Maya, what specific permissions does Tom\'s account hold in our financial portal?',
        answer: 'Tom is our Senior Accounts Payable Analyst. He has permission to draft invoices, add new supplier routing accounts, and execute wire disbursements up to $50,000 without requiring dual executive authorization. An active session with his credentials can immediately initiate outgoing transfers from our operating treasury.',
      },
      {
        id: 'q-phish-trace',
        question: 'Can we keep the connection alive and silently trace where the attacker is going?',
        answer: 'We could maintain packet capture, but monitoring an active attacker inside a payment system is extraordinarily high-risk. Automated adversary scripts can alter routing numbers and dispatch fraudulent wire batches in seconds. By the time our packet filters see the transaction, the bank will have processed it.',
      },
      {
        id: 'q-phish-lockout',
        question: 'If we sever Tom\'s session immediately, what operational disruption will that cause?',
        answer: 'Terminating his active tokens takes about 90 seconds. It will immediately freeze tonight\'s $180,000 scheduled vendor payment batch. We\'ll have to pay our bank $3,000 for emergency off-cycle re-audit and processing fees, and Tom will get abruptly locked out of his machine while working. But no unauthorized funds will leave.',
      },
      {
        id: 'q-phish-vpn',
        question: 'Is there any possibility this Frankfurt login is just a corporate VPN routing hop?',
        answer: 'Near zero. Our company VPN endpoints are located in Chicago and AWS Virginia. This IP belongs to an unlisted commercial data center in Frankfurt with known abuse flags. Treating this as a routing false positive would be an existential gamble with company cash.',
      },
    ];

    const confirmedFactsHtml = confirmedFacts.map((f) => `<li>${f}</li>`).join('');
    const uncertaintiesHtml = uncertainties.map((u) => `<li>${u}</li>`).join('');

    const probingQuestionsHtml = probingQuestions
      .map((q) => {
        return `
        <div class="qa-item" data-qa-id="${q.id}">
          <button class="qa-question-btn" type="button">
            <span class="qa-icon">❓</span>
            <span class="qa-text">"${q.question}"</span>
            <span class="qa-chevron">▶</span>
          </button>
          <div class="qa-answer hidden">
            <div class="qa-speaker">
              <span class="qa-avatar-tag" style="background-color: #0284c7">Maya Lin</span>
              <span class="qa-role">IT Security Lead</span>
            </div>
            <p class="qa-quote">"${q.answer}"</p>
          </div>
        </div>
      `;
      })
      .join('');

    // Renders the 4 tactical directive options WITHOUT spoiling numerical score modifiers
    const choicesHtml = choices
      .map((choice) => {
        const isChecked = this.selectedStrategyId === choice.id;

        let badge = 'Tactical Option';
        let tradeOffText = '';
        if (choice.id === 'CHOICE_PHISH_LOCKDOWN') {
          badge = '⚡ Immediate Containment';
          tradeOffText = 'Terminates active sessions and invalidates tokens within 90 seconds. Halts tonight\'s payment run ($3,000 off-cycle audit fee) and locks Tom out at his desk, but guarantees intruder eviction before transactions clear.';
        } else if (choice.id === 'CHOICE_PHISH_MONITOR') {
          badge = '🔍 Passive Surveillance';
          tradeOffText = 'Leaves session alive under packet trace to gather adversary infrastructure telemetry. High operational exposure: attacker retains active payment gateway access during surveillance.';
        } else if (choice.id === 'CHOICE_PHISH_VERIFY') {
          badge = '📞 Direct Verification';
          tradeOffText = 'Calls Tom at his desk to confirm whether he authorized the login or clicked a spoofed link. Fosters psychological safety and voluntary reporting, but creates a 15-minute response delay.';
        } else {
          badge = '🌐 Operational Continuity';
          tradeOffText = 'Presumes Frankfurt telemetry is an ISP false positive or automated cloud sync hop. Avoids false alarms, but leaves privileged access unmonitored if malicious.';
        }

        return `
        <label class="choice-workbench-card ${isChecked ? 'selected' : ''}">
          <div class="choice-selection-row">
            <input
              type="radio"
              name="executive_strategy"
              value="${choice.id}"
              ${isChecked ? 'checked' : ''}
            />
            <div class="choice-title-group">
              <span class="choice-card-label">${choice.label}</span>
              <span class="rec-badge" style="background: rgba(56, 189, 248, 0.2); border-color: #38bdf8; color: #38bdf8;">${badge}</span>
            </div>
          </div>
          <p class="choice-desc">${choice.description}</p>
          <div class="choice-factors">
            <div class="factor-row">
              <span class="factor-label benefits">Operational Trade-off:</span>
              <span class="factor-text">${tradeOffText}</span>
            </div>
          </div>
        </label>
      `;
      })
      .join('');

    this.modalContainer.innerHTML = `
      <div class="modal-dialog incident-dialog colleague-dialogue-dialog">
        <!-- Dialog Header -->
        <div class="modal-header it colleague-header">
          <div class="dept-indicator">
            <div class="colleague-avatar">ML</div>
            <div class="colleague-meta">
              <span class="colleague-name">Maya Lin</span>
              <span class="colleague-title">Lead Systems Architect & Security Operations</span>
            </div>
            <span class="status-live-tag">🔴 EMERGENCY CONSULTATION</span>
          </div>
          <button id="btn-dialog-close-x" class="btn-step-away-x" title="Step Away & Review Office (Esc)">✕ Step Away (Esc)</button>
        </div>

        <div class="modal-body">
          <!-- Real-Time Telemetry Alert Banner -->
          <div class="live-telemetry-banner">
            <div class="telemetry-item">
              <span class="tel-label">🚨 Target Account</span>
              <span class="tel-val">Tom Bradley (Accounts Payable)</span>
            </div>
            <div class="telemetry-item">
              <span class="tel-label">🌐 Anomalous Session IP</span>
              <span class="tel-val">185.220.101.44 (Frankfurt, Germany)</span>
            </div>
            <div class="telemetry-item">
              <span class="tel-label">⚡ Current Activity</span>
              <span class="tel-val alert">Vendor Payment Gateway (Active)</span>
            </div>
          </div>

          <!-- Section 1: Colleague Situation Briefing -->
          <div class="consultation-section briefing-card">
            <div class="section-badge-header">
              <span class="badge-num">1</span>
              <h3>Maya Lin: "CEO, we have an active security incident."</h3>
            </div>
            <div class="briefing-speech-bubble">
              <p class="spoken-briefing">
                "Our automated identity sensors flagged a concurrent session on Tom Bradley’s Accounts Payable credentials originating from Frankfurt 12 minutes ago while he is seated right here in our Chicago office. The connection navigated directly into the vendor payment approval queue. If an attacker controls this session, they could alter wire disbursement templates or siphon funds within minutes. How do you want us to proceed?"
              </p>
            </div>

            <div class="intel-grid">
              <div class="intel-column facts">
                <div class="column-title">📋 Confirmed Telemetry & Facts</div>
                <ul>${confirmedFactsHtml}</ul>
              </div>
              <div class="intel-column uncertainties">
                <div class="column-title">❓ Key Unknowns & Risks</div>
                <ul>${uncertaintiesHtml}</ul>
              </div>
            </div>
          </div>

          <!-- Section 2: Probing Inquiries with Maya Lin -->
          <div class="consultation-section qa-section">
            <div class="section-badge-header">
              <span class="badge-num">2</span>
              <h3>Consult Maya Lin on Operational Details</h3>
            </div>
            <p class="section-help">Click any inquiry below to probe Maya on containment risks and system exposure:</p>
            <div class="qa-list">
              ${probingQuestionsHtml}
            </div>
          </div>

          <!-- Section 3: Authorize Tactical Directive -->
          <div class="consultation-section workbench-section">
            <div class="section-badge-header">
              <span class="badge-num">3</span>
              <h3>Executive Incident Response Directive</h3>
            </div>

            <h4 class="workbench-subhead">Select Primary Tactical Command:</h4>
            <div class="choices-list">
              ${choicesHtml}
            </div>

            <!-- Custom Executive Directive & Proposal Field -->
            <div class="directive-section">
              <div class="directive-header">
                <span class="directive-title">✍️ Additional Instructions & Strategic Proposals</span>
                <span class="directive-hint">Type your directives or proposed alternative in plain English</span>
              </div>
              <div class="directive-input-group">
                <input
                  id="directive-input"
                  type="text"
                  class="directive-input"
                  placeholder="e.g. Sever the connection immediately and reset Tom's password..."
                />
                <button id="btn-submit-directive" class="btn btn-secondary" type="button">Analyze Proposal</button>
              </div>
              <div id="directive-feedback" class="directive-feedback hidden"></div>
            </div>

            <!-- Execution Action Bar -->
            <div class="workbench-execution-bar colleague-action-bar">
              <div class="execution-warning">
                Authorizing an executive directive takes immediate effect across IT, Finance, HR, and Legal.
              </div>
              <div class="action-btn-row">
                <button id="btn-step-away" class="btn btn-secondary" type="button">
                  🚶 Step Away & Check Office (Esc)
                </button>
                <button id="btn-execute-decision" class="btn btn-primary btn-large" type="button">
                  Authorize Directive & Deploy
                </button>
              </div>
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

    // 2. Wire Strategy Radio Selection
    const strategyRadios = this.modalContainer.querySelectorAll<HTMLInputElement>(
      'input[name="executive_strategy"]'
    );
    strategyRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.selectedStrategyId = radio.value;
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
        feedbackBox.className = 'directive-feedback success';
        feedbackBox.innerHTML = `
          <div class="feedback-msg">
            <strong>Identified Directive: ${matched.label}</strong>
            <p>${match.interpretation}</p>
          </div>
          <button id="btn-apply-strategy" class="btn btn-primary btn-sm" type="button">Select This Directive</button>
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

    // 4. Wire Step Away Buttons
    const stepAwayBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-step-away');
    const closeXBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-dialog-close-x');
    const triggerStepAway = () => {
      this.hideIncidentModal();
      this.callbacks.onStepAway?.();
    };
    stepAwayBtn?.addEventListener('click', triggerStepAway);
    closeXBtn?.addEventListener('click', triggerStepAway);

    // 5. Wire Final Execution
    const executeBtn = this.modalContainer.querySelector<HTMLButtonElement>('#btn-execute-decision');
    executeBtn?.addEventListener('click', () => {
      if (!this.selectedStrategyId) {
        alert('Please select a tactical response directive before authorizing.');
        return;
      }
      const additionalNotes = directiveInput?.value.trim() ?? '';
      this.callbacks.onSelectChoice(this.selectedStrategyId, additionalNotes);
    });

    this.modalContainer.classList.remove('hidden');
  }

  /**
   * Renders the complete, living incident consultation experience:
   * 1. Executive Briefing with Department Head
   * 2. Confirmed Facts vs Key Uncertainties breakdown
   * 3. Interactive Probing Inquiries (Q&A Accordion)
   * 4. Tailored Decision Workbench with operational safeguards & natural typing
   */
  public showIncidentModal(incident: Incident, choices: readonly EvaluatedChoice[]): void {
    if (incident.id === 'INC_PHISH_1') {
      this.showPhishingModal(incident, choices);
      return;
    }

    this.mobileControls?.setEnabled(false);

    this.activeIncident = incident;
    this.activeChoices = choices;
    this.answeredQuestions.clear();
    this.selectedStrategyId = choices.find((c) => !c.isLocked)?.id ?? choices[0]?.id ?? null;

    const dialogue = INCIDENT_DIALOGUES[incident.turn];
    const deptClass = incident.department.toLowerCase();

    const confirmedFactsHtml = dialogue.confirmedFacts.map((f) => `<li>${f}</li>`).join('');
    const uncertaintiesHtml = dialogue.uncertainties.map((u) => `<li>${u}</li>`).join('');

    const probingQuestionsHtml = dialogue.probingQuestions
      .map((q) => {
        return `
        <div class="qa-item" data-qa-id="${q.id}">
          <button class="qa-question-btn" type="button">
            <span class="qa-icon">❓</span>
            <span class="qa-text">"${q.question}"</span>
            <span class="qa-chevron">▶</span>
          </button>
          <div class="qa-answer hidden">
            <div class="qa-speaker">
              <span class="qa-avatar-tag" style="background-color: ${dialogue.head.avatarColor}">
                ${dialogue.head.name}
              </span>
              <span class="qa-role">${dialogue.head.role}</span>
            </div>
            <p class="qa-quote">"${q.answer}"</p>
          </div>
        </div>
      `;
      })
      .join('');

    const choicesHtml = choices
      .map((choice) => {
        const costPreview = this.getChoiceFinancialPreview(choice);
        const benefits = this.getChoiceOperationalBenefits(choice.id);
        const risks = this.getChoiceRisks(choice.id);
        const uncertainty = this.getChoiceUncertainty(choice.id);
        const isRecommended = choice.id === dialogue.headRecommendation.choiceId;

        const lockAlert = choice.isLocked
          ? `<div class="lock-banner">
              <span class="lock-icon">🔒 Policy Unavailable</span>
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
              ${isRecommended ? '<span class="rec-badge">⭐ Recommended by ' + dialogue.head.name.split(' ')[0] + '</span>' : ''}
            </div>
            <div class="cost-badge">${costPreview}</div>
          </div>
          <p class="choice-desc">${choice.description}</p>

          <div class="choice-factors">
            <div class="factor-row">
              <span class="factor-label benefits">Operational Benefits:</span>
              <span class="factor-text">${benefits}</span>
            </div>
            <div class="factor-row">
              <span class="factor-label risks">Identified Risks:</span>
              <span class="factor-text">${risks}</span>
            </div>
            <div class="factor-row">
              <span class="factor-label uncertainty">Uncertainty Factor:</span>
              <span class="factor-text">${uncertainty}</span>
            </div>
          </div>
          ${lockAlert}
        </label>
      `;
      })
      .join('');

    const checkboxesHtml = dialogue.controlConfig.checkboxes
      .map((cb) => {
        return `
        <label class="safeguard-checkbox-row">
          <input type="checkbox" id="${cb.id}" ${cb.defaultChecked ? 'checked' : ''} />
          <div class="safeguard-label-group">
            <span class="safeguard-label">${cb.label}</span>
            <span class="safeguard-desc">${cb.description}</span>
          </div>
        </label>
      `;
      })
      .join('');

    this.modalContainer.innerHTML = `
      <div class="modal-dialog incident-dialog">
        <!-- Dialog Header -->
        <div class="modal-header ${deptClass}">
          <div class="dept-indicator">
            <span class="consult-badge" style="background-color: ${dialogue.head.avatarColor}">
              ${dialogue.head.name} · ${dialogue.head.role}
            </span>
            <span class="turn-indicator">${dialogue.timestamp}</span>
          </div>
          <h2 class="incident-title">${incident.title}</h2>
          <span class="severity-badge ${incident.urgency.toLowerCase()}">${incident.urgency.toUpperCase()} PRIORITY</span>
        </div>

        <div class="modal-body">
          <!-- Section 1: Executive Briefing Narrative -->
          <div class="consultation-section briefing-card">
            <div class="section-badge-header">
              <span class="badge-num">1</span>
              <h3>Department Head Situation Briefing</h3>
            </div>
            <div class="briefing-speech-bubble">
              <p class="spoken-briefing">"${dialogue.briefingLead}"</p>
            </div>

            <div class="intel-grid">
              <div class="intel-column facts">
                <div class="column-title">📋 Confirmed Facts</div>
                <ul>${confirmedFactsHtml}</ul>
              </div>
              <div class="intel-column uncertainties">
                <div class="column-title">❓ Key Uncertainties & Assumptions</div>
                <ul>${uncertaintiesHtml}</ul>
              </div>
            </div>

            <div class="business-impact-box">
              <strong>⚠️ Immediate Business Risk:</strong> ${dialogue.businessImpact}
            </div>

            <div class="recommendation-card">
              <div class="rec-header">
                <span class="rec-label">Professional Recommendation:</span>
                <span class="rec-title">${dialogue.headRecommendation.title}</span>
              </div>
              <p class="rec-rationale">"${dialogue.headRecommendation.rationale}"</p>
            </div>
          </div>

          <!-- Section 2: Probing Inquiries (Interactive Q&A) -->
          <div class="consultation-section qa-section">
            <div class="section-badge-header">
              <span class="badge-num">2</span>
              <h3>Executive Inquiries & Department Clarifications</h3>
            </div>
            <p class="section-help">Click any question below to probe ${dialogue.head.name} for critical operational details:</p>
            <div class="qa-list">
              ${probingQuestionsHtml}
            </div>
          </div>

          <!-- Section 3: Tailored Decision Workbench -->
          <div class="consultation-section workbench-section">
            <div class="section-badge-header">
              <span class="badge-num">3</span>
              <h3>${dialogue.controlConfig.sectionTitle}</h3>
            </div>

            <h4 class="workbench-subhead">Select Primary Strategy:</h4>
            <div class="choices-list">
              ${choicesHtml}
            </div>

            <h4 class="workbench-subhead">${dialogue.controlConfig.checklistLabel}:</h4>
            <div class="safeguards-container">
              ${checkboxesHtml}
            </div>

            <!-- Custom Executive Directive & Proposal Field -->
            <div class="directive-section">
              <div class="directive-header">
                <span class="directive-title">✍️ Additional Instructions & Strategic Proposals</span>
                <span class="directive-hint">Type your directives or proposed alternative in plain English</span>
              </div>
              <div class="directive-input-group">
                <input
                  id="directive-input"
                  type="text"
                  class="directive-input"
                  placeholder="${dialogue.controlConfig.directivePlaceholder}"
                />
                <button id="btn-submit-directive" class="btn btn-secondary" type="button">Analyze Proposal</button>
              </div>
              <div id="directive-feedback" class="directive-feedback hidden"></div>
            </div>

            <!-- Execution Action Bar -->
            <div class="workbench-execution-bar">
              <div class="execution-warning">
                Decisions have immediate cash burn impacts and create cross-department consequences.
              </div>
              <button id="btn-execute-decision" class="btn btn-primary btn-large">
                Sign Executive Directive & Authorize Implementation
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
    if (this.escapeKeyListener) {
      window.removeEventListener('keydown', this.escapeKeyListener);
      this.escapeKeyListener = undefined;
    }
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
    const isPhishing = record.chosenOptionId.startsWith('CHOICE_PHISH_');

    const scheduledHtml =
      record.delayedEffectsScheduled.length > 0
        ? `<div class="resolution-alert scheduled">
            <h4>⚠️ Latent Risk Scheduled</h4>
            ${record.delayedEffectsScheduled
              .map(
                (s: { readonly triggerTurn: number; readonly description: string }) =>
                  `<p>• <strong>Turn ${s.triggerTurn}:</strong> ${s.description}</p>`
              )
              .join('')}
          </div>`
        : '';

    const resolvedHtml =
      record.delayedEffectsResolvedThisTurn.length > 0
        ? `<div class="resolution-alert resolved">
            <h4>💥 Past Consequence Came Due This Month</h4>
            ${record.delayedEffectsResolvedThisTurn
              .map(
                (r: DelayedEffectResolution) =>
                  `<p>• ${r.narrativeDescription} (${this.formatCurrencyDelta(
                    r.appliedDeltas.cashDelta
                  )}, IT ${r.appliedDeltas.itDelta > 0 ? '+' : ''}${r.appliedDeltas.itDelta})</p>`
              )
              .join('')}
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
        <h4 class="reactions-header">🏢 Cross-Department Immediate Reactions</h4>
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

    const continueBtnText = isPhishing
      ? 'Return to Office & Review Fallout'
      : isCompleted
      ? 'View Performance Debrief'
      : 'Proceed to Next Turn';

    this.modalContainer.innerHTML = `
      <div class="modal-dialog resolution-dialog">
        <div class="modal-header">
          <div class="dept-indicator">Turn ${record.turn} Implementation Aftermath</div>
          <h2 class="incident-title">${record.chosenOptionLabel}</h2>
        </div>

        <div class="modal-body">
          <div class="resolution-summary">
            <p>${record.effectiveChoiceImpact.operationalExplanation}</p>
          </div>

          <div class="stat-deltas-grid">
            <div class="delta-card">
              <span class="label">Decision Cash Impact</span>
              <span class="value ${record.immediateFinancialDeltas.cashDelta < 0 ? 'impact-neg' : 'impact-pos'}">
                ${this.formatCurrencyDelta(record.immediateFinancialDeltas.cashDelta)}
              </span>
            </div>
            <div class="delta-card">
              <span class="label">Monthly Settlement Paid</span>
              <span class="value impact-neg">
                -${this.formatCurrency(record.monthlyBurnDeductionPaid.totalCashDeducted)}
              </span>
            </div>
            <div class="delta-card">
              <span class="label">IT Stability Impact</span>
              <span class="value ${record.immediateMetricDeltas.itDelta >= 0 ? 'impact-pos' : 'impact-neg'}">
                ${record.immediateMetricDeltas.itDelta >= 0 ? '+' : ''}${record.immediateMetricDeltas.itDelta}
              </span>
            </div>
            <div class="delta-card">
              <span class="label">HR Morale Impact</span>
              <span class="value ${record.immediateMetricDeltas.hrDelta >= 0 ? 'impact-pos' : 'impact-neg'}">
                ${record.immediateMetricDeltas.hrDelta >= 0 ? '+' : ''}${record.immediateMetricDeltas.hrDelta}
              </span>
            </div>
          </div>

          ${crossReactionHtml}
          ${scheduledHtml}
          ${resolvedHtml}

          <div class="learning-feedback-box">
            <h4>💡 Management Takeaway: ${record.learningFeedback.corePrinciple}</h4>
            <p>${record.learningFeedback.tradeoffSummary}</p>
          </div>

          <div class="modal-footer">
            <button id="btn-continue-resolution" class="btn btn-primary btn-large">
              ${continueBtnText}
            </button>
          </div>
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
              🔄 Try Again as CEO
            </button>
          </div>
        </div>
      </div>
    `;

    const restartBtn = document.getElementById('btn-gameover-restart');
    restartBtn?.addEventListener('click', () => {
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

  private getChoiceOperationalBenefits(choiceId: string): string {
    switch (choiceId) {
      case 'CHOICE_1A':
        return 'Engages external specialists to analyze database logs, verify database integrity, and build a verified, hardened patch (+20 IT).';
      case 'CHOICE_1B':
        return 'Instructs internal engineers to deploy an emergency hotfix tonight to block the vulnerable API endpoint, conserving liquid cash (-25 IT).';
      case 'CHOICE_1C':
        return 'Rebuilds the authentication service through a mandatory 72-hour weekend sprint without external consulting costs (+15 IT, -30 HR).';
      case 'CHOICE_2A':
        return 'Brings engineering salaries to the 75th percentile with retention bonuses, halting developer departures decisively (+20 HR, +5 IT).';
      case 'CHOICE_2B':
        return 'Provides catered team lunches and title promotions while conserving cash and avoiding permanent payroll additions.';
      case 'CHOICE_2C':
        return 'Secures agreements with core system architects using targeted retention grants and a sustainable $1,000/mo burn adjustment (+5 HR, +5 IT).';
      case 'CHOICE_3A':
        return 'Enacts immediate spending controls, cutting gross burn by $6,000/mo without taking on external debt (-5 IT, -20 HR).';
      case 'CHOICE_3B':
        return 'Draws $75,000 from an approved venture credit facility at 8.0% APR with $3,500/mo principal amortization, bolstering cash reserves.';
      case 'CHOICE_3C':
        return 'Conducts a collaborative cloud audit and instance optimization for $10,000, permanently lowering gross hosting burn by $2,000–$5,000/mo (-5 IT).';
      default:
        return 'Benefits under assessment.';
    }
  }

  private getChoiceRisks(choiceId: string): string {
    switch (choiceId) {
      case 'CHOICE_1A':
        return 'Drains $30,000 in liquid reserves, leaving less financial buffer for upcoming operational challenges.';
      case 'CHOICE_1B':
        return 'Skipping root-cause forensics destabilizes systems (-25 IT) and schedules a latent delayed breach liability in Turn 3 (-$15,000 cash, -10 IT).';
      case 'CHOICE_1C':
        return 'Grueling 72-hour uncompensated weekend sprint severely exhausts developers (-30 HR) and triggers punitive compensation demands in Turn 2.';
      case 'CHOICE_2A':
        return 'Permanently increases monthly payroll burn by $6,000/mo. If preceded by a Turn 1 crunch, requires an acute $80,000 upfront retention bonus.';
      case 'CHOICE_2B':
        return 'Superficial perks during a compensation crisis are perceived as dismissive, severely damaging team morale (-35 HR; -45 HR and -20 IT if preceded by a crunch).';
      case 'CHOICE_2C':
        return 'Selective retention packages require strict confidentiality to prevent resentment among non-targeted developers.';
      case 'CHOICE_3A':
        return 'Deprives developers of essential tooling (-5 IT, -20 HR). If HR morale is already below 45, triggers an additional -10 HR penalty (-30 total).';
      case 'CHOICE_3B':
        return 'Mandatory debt service ($3,500/mo principal + 8% APR interest) adds roughly $4,000/mo to settlement cash needs and incurs a debt leverage rating penalty.';
      case 'CHOICE_3C':
        return 'Requires an upfront $10,000 cash outlay. Locked if HR morale is critically low (< 45); maximum $5,000/mo savings requires high HR morale (> 70).';
      default:
        return 'Trade-offs under assessment.';
    }
  }

  private getChoiceUncertainty(choiceId: string): string {
    switch (choiceId) {
      case 'CHOICE_1A':
        return 'Whether cooperating with external auditors will pull senior developers away from sprint tasks for several days.';
      case 'CHOICE_1B':
        return 'High: Whether threat actors already exfiltrated customer data before the hotfix deployed remains unknown.';
      case 'CHOICE_1C':
        return 'High: Risk of immediate developer resignations if engineers push back against mandatory overtime.';
      case 'CHOICE_2A':
        return 'Moderate: Future salary expectations may rise further as market conditions evolve.';
      case 'CHOICE_2B':
        return 'High: Whether staff will perceive the event as genuine appreciation or empty management posturing.';
      case 'CHOICE_2C':
        return 'Moderate: Risk of non-selected developers seeking outside offers if bonus agreements leak.';
      case 'CHOICE_3A':
        return 'Moderate: Impact on engineering velocity and customer support response times.';
      case 'CHOICE_3B':
        return 'Contractual: Mandatory monthly principal and interest payments are legally binding regardless of company performance.';
      case 'CHOICE_3C':
        return 'Moderate: Total cloud burn savings depend on HR morale (base -$2,000/mo; -$5,000/mo if HR morale > 70).';
      default:
        return 'Variables undetermined.';
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
    switch (turn) {
      case 1:
        return 'IT (Sarah Chen)';
      case 2:
        return 'HR (Elena Rostova)';
      case 3:
        return 'Finance (David Vance)';
      default:
        return 'Main Lobby';
    }
  }
}
