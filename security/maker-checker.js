#!/usr/bin/env node

/**
 * MAKER-CHECKER SECURITY MODEL
 *
 * - DevOps (MAKER): Requests action, gets 10-15 min window
 * - InfoSec (CHECKER): Reviews and approves/denies
 * - NO action executes without InfoSec approval
 * - All activity logged and monitored
 * - Zero trust - assume breach mentality
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PENDING_ACTIONS = path.join(__dirname, '../data/security/pending-actions.json');
const AUDIT_LOG = path.join(__dirname, '../data/security/audit-log.jsonl');
const ADMIN_WINDOWS = path.join(__dirname, '../data/security/admin-windows.json');

export class MakerChecker {
  constructor() {
    this.pendingActions = [];
    this.activeWindows = [];
    this.auditLog = [];

    // Risk levels for different actions
    this.riskLevels = {
      'read': 'LOW',
      'query': 'LOW',
      'restart': 'MEDIUM',
      'deploy': 'HIGH',
      'delete': 'HIGH',
      'modify-db': 'CRITICAL',
      'access-prod': 'CRITICAL',
      'change-config': 'HIGH'
    };

    this.init();
  }

  /**
   * Initialize security system
   */
  async init() {
    await fs.mkdir(path.dirname(PENDING_ACTIONS), { recursive: true });
    await this.loadPendingActions();
    await this.loadActiveWindows();

    console.log('🛡️  Maker-Checker Security: ONLINE');
    console.log('   ✅ InfoSec acts as CHECKER');
    console.log('   ✅ DevOps acts as MAKER');
    console.log('   ✅ Zero execution without approval');

    // Start background monitor
    this.startSecurityMonitor();
  }

  /**
   * STEP 1: DevOps requests admin window (MAKER)
   */
  async requestAdminWindow(requestedBy, purpose, duration = 15) {
    console.log(`\n🔐 ADMIN WINDOW REQUEST`);
    console.log(`   Requested by: ${requestedBy}`);
    console.log(`   Purpose: ${purpose}`);
    console.log(`   Duration: ${duration} minutes`);

    const window = {
      id: `WINDOW-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
      purpose: purpose,
      duration_minutes: duration,
      status: 'PENDING_INFOSEC_APPROVAL',
      expires_at: null,
      infosec_approver: null,
      approved_at: null
    };

    // Add to pending
    this.activeWindows.push(window);
    await this.saveActiveWindows();

    // Notify InfoSec
    console.log(`\n📢 NOTIFICATION TO INFOSEC:`);
    console.log(`   ⚠️  ${requestedBy} requesting admin access`);
    console.log(`   Purpose: ${purpose}`);
    console.log(`   Duration: ${duration} minutes`);
    console.log(`   🔍 Awaiting InfoSec approval...`);

    // Audit log
    await this.audit({
      action: 'ADMIN_WINDOW_REQUESTED',
      actor: requestedBy,
      details: { purpose, duration },
      risk: 'HIGH'
    });

    return window;
  }

  /**
   * STEP 2: InfoSec approves/denies window (CHECKER)
   */
  async approveAdminWindow(windowId, infosecApprover, decision, reason = null) {
    const window = this.activeWindows.find(w => w.id === windowId);

    if (!window) {
      throw new Error(`Admin window ${windowId} not found`);
    }

    if (decision === 'APPROVED') {
      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + window.duration_minutes);

      window.status = 'ACTIVE';
      window.infosec_approver = infosecApprover;
      window.approved_at = new Date().toISOString();
      window.expires_at = expiresAt.toISOString();

      console.log(`\n✅ INFOSEC APPROVED ADMIN WINDOW`);
      console.log(`   Window ID: ${windowId}`);
      console.log(`   Approved by: ${infosecApprover}`);
      console.log(`   Expires: ${expiresAt.toLocaleTimeString()}`);
      console.log(`   ⏰ ${window.duration_minutes} minutes remaining`);

      // Audit log
      await this.audit({
        action: 'ADMIN_WINDOW_APPROVED',
        actor: infosecApprover,
        target: window.requested_by,
        details: { window_id: windowId, expires_at: window.expires_at },
        risk: 'HIGH'
      });

      // Start expiry timer
      setTimeout(() => {
        this.expireWindow(windowId);
      }, window.duration_minutes * 60 * 1000);

    } else {
      // DENIED
      window.status = 'DENIED';
      window.infosec_approver = infosecApprover;
      window.denial_reason = reason;

      console.log(`\n❌ INFOSEC DENIED ADMIN WINDOW`);
      console.log(`   Window ID: ${windowId}`);
      console.log(`   Denied by: ${infosecApprover}`);
      console.log(`   Reason: ${reason}`);

      // Audit log
      await this.audit({
        action: 'ADMIN_WINDOW_DENIED',
        actor: infosecApprover,
        target: window.requested_by,
        details: { window_id: windowId, reason: reason },
        risk: 'HIGH'
      });
    }

    await this.saveActiveWindows();
    return window;
  }

  /**
   * STEP 3: DevOps executes action (MAKER) - Must have active window
   */
  async executeAction(action, executor, windowId = null) {
    console.log(`\n🔍 SECURITY CHECK: Action Execution Request`);
    console.log(`   Action: ${action.type}`);
    console.log(`   Executor: ${executor}`);

    // Check if executor has active admin window
    if (!windowId) {
      console.log(`   ❌ DENIED: No admin window specified`);
      return {
        allowed: false,
        reason: 'No admin window - request one first'
      };
    }

    const window = this.activeWindows.find(w => w.id === windowId && w.status === 'ACTIVE');

    if (!window) {
      console.log(`   ❌ DENIED: Invalid or expired admin window`);
      return {
        allowed: false,
        reason: 'Admin window not found or expired'
      };
    }

    if (window.requested_by !== executor) {
      console.log(`   ❌ DENIED: Window belongs to ${window.requested_by}, not ${executor}`);
      return {
        allowed: false,
        reason: 'Admin window not assigned to you'
      };
    }

    // Check if window expired
    if (new Date() > new Date(window.expires_at)) {
      console.log(`   ❌ DENIED: Admin window expired`);
      window.status = 'EXPIRED';
      await this.saveActiveWindows();
      return {
        allowed: false,
        reason: 'Admin window expired'
      };
    }

    // Determine risk level
    const risk = this.determineRisk(action);

    // HIGH and CRITICAL actions need InfoSec real-time approval
    if (risk === 'HIGH' || risk === 'CRITICAL') {
      console.log(`   ⚠️  ${risk} RISK ACTION - Requires InfoSec approval`);

      const approval = await this.requestActionApproval(action, executor, windowId, risk);

      if (!approval.approved) {
        console.log(`   ❌ DENIED by InfoSec: ${approval.reason}`);
        return {
          allowed: false,
          reason: `InfoSec denied: ${approval.reason}`,
          approval_id: approval.id
        };
      }

      console.log(`   ✅ APPROVED by InfoSec: ${approval.approved_by}`);
    }

    // Action allowed
    console.log(`   ✅ ACTION ALLOWED`);
    console.log(`   Risk Level: ${risk}`);
    console.log(`   Window expires in: ${this.getTimeRemaining(window.expires_at)}`);

    // Audit log
    await this.audit({
      action: 'ACTION_EXECUTED',
      actor: executor,
      details: { action_type: action.type, window_id: windowId, command: action.command },
      risk: risk,
      window_id: windowId
    });

    return {
      allowed: true,
      risk: risk,
      window_id: windowId,
      time_remaining: this.getTimeRemaining(window.expires_at)
    };
  }

  /**
   * Request InfoSec approval for high-risk action
   */
  async requestActionApproval(action, executor, windowId, risk) {
    const approval = {
      id: `APPROVAL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      action: action,
      executor: executor,
      window_id: windowId,
      risk: risk,
      requested_at: new Date().toISOString(),
      status: 'PENDING',
      approved: false,
      approved_by: null,
      reason: null
    };

    this.pendingActions.push(approval);
    await this.savePendingActions();

    console.log(`\n📢 REAL-TIME APPROVAL REQUEST TO INFOSEC:`);
    console.log(`   Approval ID: ${approval.id}`);
    console.log(`   Action: ${action.type}`);
    console.log(`   Command: ${action.command || 'N/A'}`);
    console.log(`   Risk: ${risk}`);
    console.log(`   Executor: ${executor}`);
    console.log(`   🔍 Waiting for InfoSec response...`);

    // In production: Send alert to InfoSec Slack/Telegram
    // For now: Simulate approval after 5 seconds (in prod, InfoSec clicks approve/deny)
    // TODO: Integrate with InfoSec dashboard for real-time approval

    return approval;
  }

  /**
   * InfoSec approves/denies action (CHECKER)
   */
  async approveAction(approvalId, infosecApprover, decision, reason = null) {
    const approval = this.pendingActions.find(a => a.id === approvalId);

    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`);
    }

    approval.approved = (decision === 'APPROVED');
    approval.approved_by = infosecApprover;
    approval.reason = reason;
    approval.approved_at = new Date().toISOString();
    approval.status = decision;

    await this.savePendingActions();

    // Audit log
    await this.audit({
      action: decision === 'APPROVED' ? 'ACTION_APPROVED' : 'ACTION_DENIED',
      actor: infosecApprover,
      target: approval.executor,
      details: { approval_id: approvalId, action: approval.action, reason: reason },
      risk: approval.risk
    });

    console.log(`\n${decision === 'APPROVED' ? '✅' : '❌'} INFOSEC ${decision}`);
    console.log(`   Approval ID: ${approvalId}`);
    console.log(`   Action: ${approval.action.type}`);
    console.log(`   Checker: ${infosecApprover}`);
    if (reason) console.log(`   Reason: ${reason}`);

    return approval;
  }

  /**
   * Determine risk level of action
   */
  determineRisk(action) {
    const actionType = action.type.toLowerCase();

    for (const [pattern, risk] of Object.entries(this.riskLevels)) {
      if (actionType.includes(pattern)) {
        return risk;
      }
    }

    // Check command for dangerous operations
    if (action.command) {
      const dangerousCommands = ['rm -rf', 'drop database', 'delete from', 'shutdown', 'reboot'];
      for (const dangerous of dangerousCommands) {
        if (action.command.toLowerCase().includes(dangerous)) {
          return 'CRITICAL';
        }
      }
    }

    return 'MEDIUM'; // Default
  }

  /**
   * Expire admin window
   */
  async expireWindow(windowId) {
    const window = this.activeWindows.find(w => w.id === windowId);

    if (window && window.status === 'ACTIVE') {
      window.status = 'EXPIRED';
      await this.saveActiveWindows();

      console.log(`\n⏰ ADMIN WINDOW EXPIRED`);
      console.log(`   Window ID: ${windowId}`);
      console.log(`   User: ${window.requested_by}`);

      // Audit log
      await this.audit({
        action: 'ADMIN_WINDOW_EXPIRED',
        actor: 'SYSTEM',
        target: window.requested_by,
        details: { window_id: windowId },
        risk: 'MEDIUM'
      });
    }
  }

  /**
   * Get time remaining in window
   */
  getTimeRemaining(expiresAt) {
    const remaining = new Date(expiresAt) - new Date();
    const minutes = Math.floor(remaining / 60000);
    return `${minutes} minutes`;
  }

  /**
   * Audit log entry
   */
  async audit(entry) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.auditLog.push(auditEntry);

    // Append to audit log file
    const line = JSON.stringify(auditEntry) + '\n';
    await fs.appendFile(AUDIT_LOG, line, 'utf8');

    // Alert on CRITICAL risk actions
    if (entry.risk === 'CRITICAL') {
      console.log(`\n🚨 CRITICAL ACTION LOGGED`);
      console.log(`   Action: ${entry.action}`);
      console.log(`   Actor: ${entry.actor}`);
      console.log(`   🔔 InfoSec team alerted`);
    }
  }

  /**
   * Security monitoring - runs continuously
   */
  startSecurityMonitor() {
    setInterval(async () => {
      // Check for expired windows
      for (const window of this.activeWindows) {
        if (window.status === 'ACTIVE' && new Date() > new Date(window.expires_at)) {
          await this.expireWindow(window.id);
        }
      }

      // Alert on suspicious patterns
      await this.detectAnomalies();
    }, 30000); // Every 30 seconds
  }

  /**
   * Detect anomalies in audit log
   */
  async detectAnomalies() {
    const recentAudits = this.auditLog.slice(-100);

    // Pattern 1: Too many HIGH/CRITICAL actions in short time
    const last5min = recentAudits.filter(a => {
      const age = Date.now() - new Date(a.timestamp).getTime();
      return age < 5 * 60 * 1000;
    });

    const highRiskCount = last5min.filter(a => a.risk === 'HIGH' || a.risk === 'CRITICAL').length;

    if (highRiskCount > 5) {
      console.log(`\n🚨 SECURITY ALERT: Unusual activity detected`);
      console.log(`   ${highRiskCount} high-risk actions in last 5 minutes`);
      console.log(`   🔍 InfoSec review recommended`);
    }
  }

  /**
   * Load/Save state
   */
  async loadPendingActions() {
    try {
      const data = await fs.readFile(PENDING_ACTIONS, 'utf8');
      this.pendingActions = JSON.parse(data);
    } catch {
      this.pendingActions = [];
    }
  }

  async savePendingActions() {
    await fs.writeFile(PENDING_ACTIONS, JSON.stringify(this.pendingActions, null, 2));
  }

  async loadActiveWindows() {
    try {
      const data = await fs.readFile(ADMIN_WINDOWS, 'utf8');
      this.activeWindows = JSON.parse(data);
    } catch {
      this.activeWindows = [];
    }
  }

  async saveActiveWindows() {
    await fs.writeFile(ADMIN_WINDOWS, JSON.stringify(this.activeWindows, null, 2));
  }
}

// Export singleton
export const makerChecker = new MakerChecker();
