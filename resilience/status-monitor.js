#!/usr/bin/env node

/**
 * PROACTIVE STATUS MONITOR
 *
 * - Monitors system health 24/7
 * - Tells clients immediately if system is down/maintenance
 * - NEVER leaves clients wondering
 * - Provides proper status updates
 * - Builds trust through transparency
 */

import { autonomousIssueTracker } from './autonomous-issue-tracker.js';

export class StatusMonitor {
  constructor() {
    this.status = 'OPERATIONAL';
    this.maintenanceMode = false;
    this.maintenanceMessage = null;
    this.lastDowntime = null;
    this.uptimeStart = Date.now();
  }

  /**
   * Get current system status (ALWAYS responds, NEVER silent)
   */
  async getStatus() {
    // Check for open critical issues
    const issueStatus = await autonomousIssueTracker.getSystemStatus();

    if (this.maintenanceMode) {
      return {
        status: 'MAINTENANCE',
        operational: false,
        message: this.maintenanceMessage || 'System is under scheduled maintenance',
        eta: 'Will be back online shortly',
        client_message: `🔧 **System Maintenance**\n\nWe're currently performing scheduled maintenance to improve our service.\n\nExpected completion: ${this.maintenanceMessage || 'Shortly'}\n\nWe apologize for any inconvenience. Your request will be processed once maintenance is complete.`
      };
    }

    if (issueStatus.status === 'DEGRADED') {
      return {
        status: 'DEGRADED',
        operational: true, // Partially working
        message: issueStatus.message,
        eta: issueStatus.eta,
        client_message: `⚠️ **Service Notice**\n\nWe're experiencing some technical issues and our team is actively working on it.\n\n${issueStatus.message}\n\nYour request may take longer than usual. We appreciate your patience!`
      };
    }

    // System is operational
    return {
      status: 'OPERATIONAL',
      operational: true,
      message: 'All systems operational',
      uptime: this.getUptime(),
      client_message: null // No message needed when operational
    };
  }

  /**
   * INTERCEPT: Check status before processing ANY client request
   */
  async interceptClientRequest(message, clientId) {
    const status = await this.getStatus();

    // If not operational, return status message IMMEDIATELY
    if (!status.operational || status.client_message) {
      console.log(`\n🛑 INTERCEPTED: System ${status.status}`);
      console.log(`   Client: ${clientId}`);
      console.log(`   Message: "${message.substring(0, 50)}..."`);
      console.log(`   ✅ Sending status update to client`);

      return {
        intercepted: true,
        status: status.status,
        response: status.client_message,
        proceed: false
      };
    }

    // System is operational, proceed with request
    return {
      intercepted: false,
      proceed: true
    };
  }

  /**
   * Set maintenance mode
   */
  async enterMaintenanceMode(message = null, duration = '30 minutes') {
    this.maintenanceMode = true;
    this.maintenanceMessage = `Expected completion: ${duration}`;

    console.log('\n🔧 MAINTENANCE MODE ENABLED');
    console.log(`   Duration: ${duration}`);
    console.log(`   All client requests will receive status update`);

    // Log as issue for tracking
    await autonomousIssueTracker.logIssue({
      title: 'Scheduled Maintenance',
      description: `System entering maintenance mode. ${message || 'Routine maintenance'}`,
      severity: 'MEDIUM',
      clientImpacted: true,
      reporter: 'SYSTEM'
    });
  }

  /**
   * Exit maintenance mode
   */
  async exitMaintenanceMode() {
    this.maintenanceMode = false;
    this.maintenanceMessage = null;
    this.uptimeStart = Date.now();

    console.log('\n✅ MAINTENANCE MODE DISABLED');
    console.log('   System back online');
  }

  /**
   * Record downtime
   */
  async recordDowntime(duration, reason) {
    this.lastDowntime = {
      timestamp: new Date().toISOString(),
      duration: duration,
      reason: reason
    };

    // Automatically log critical issue
    await autonomousIssueTracker.logIssue({
      title: `System Downtime: ${reason}`,
      description: `System was down for ${duration}. Reason: ${reason}`,
      severity: 'CRITICAL',
      clientImpacted: true,
      revenueImpact: true,
      reporter: 'SYSTEM'
    });
  }

  /**
   * Get uptime
   */
  getUptime() {
    const uptimeMs = Date.now() - this.uptimeStart;
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} days, ${hours % 24} hours`;
    }
    return `${hours} hours`;
  }

  /**
   * Health check (for monitoring tools)
   */
  async healthCheck() {
    const status = await this.getStatus();

    return {
      healthy: status.operational,
      status: status.status,
      uptime: this.getUptime(),
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton
export const statusMonitor = new StatusMonitor();
