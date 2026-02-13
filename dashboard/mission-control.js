// Mission Control Dashboard - Real-Time Monitoring
// WebSocket connection for live updates

class MissionControl {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.data = {
            jobs: [],
            issues: [],
            agents: [],
            metrics: {},
            live: []
        };

        this.init();
    }

    init() {
        // Set up tabs
        this.setupTabs();

        // Set up search
        this.setupSearch();

        // Connect WebSocket
        this.connectWebSocket();

        // Load initial data
        this.loadInitialData();

        // Update time
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);

        // Auto-refresh
        setInterval(() => this.refreshData(), 10000); // Every 10s
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all
                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                // Add active to clicked
                tab.classList.add('active');
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');

                // Load tab data
                this.loadTabData(tabId);
            });
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('globalSearch');
        searchInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });
    }

    connectWebSocket() {
        try {
            this.ws = new WebSocket('ws://localhost:19000/ws');

            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.updateConnectionStatus(true);
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('🔌 WebSocket closed, reconnecting...');
                this.updateConnectionStatus(false);
                setTimeout(() => this.connectWebSocket(), this.reconnectInterval);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            // Fall back to HTTP polling
            this.startPolling();
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'job_update':
                this.handleJobUpdate(data.payload);
                break;
            case 'issue_update':
                this.handleIssueUpdate(data.payload);
                break;
            case 'agent_update':
                this.handleAgentUpdate(data.payload);
                break;
            case 'metrics_update':
                this.handleMetricsUpdate(data.payload);
                break;
            case 'live_event':
                this.handleLiveEvent(data.payload);
                break;
        }
    }

    handleJobUpdate(job) {
        // Update jobs list
        const existingIndex = this.data.jobs.findIndex(j => j.job_id === job.job_id);
        if (existingIndex >= 0) {
            this.data.jobs[existingIndex] = job;
        } else {
            this.data.jobs.unshift(job);
        }

        // Update UI if jobs tab is active
        if (document.getElementById('jobs-tab').classList.contains('active')) {
            this.renderJobs();
        }
    }

    handleIssueUpdate(issue) {
        // Update issues list
        const existingIndex = this.data.issues.findIndex(i => i.id === issue.id);
        if (existingIndex >= 0) {
            this.data.issues[existingIndex] = issue;
        } else {
            this.data.issues.unshift(issue);
        }

        // Update UI
        this.renderIssues();
        this.updateOpenIssuesWidget();
    }

    handleAgentUpdate(agent) {
        const existingIndex = this.data.agents.findIndex(a => a.name === agent.name);
        if (existingIndex >= 0) {
            this.data.agents[existingIndex] = agent;
        } else {
            this.data.agents.push(agent);
        }

        if (document.getElementById('agents-tab').classList.contains('active')) {
            this.renderAgents();
        }
    }

    handleMetricsUpdate(metrics) {
        this.data.metrics = metrics;
        this.updateMetricsWidgets();
    }

    handleLiveEvent(event) {
        this.data.live.unshift(event);
        if (this.data.live.length > 50) {
            this.data.live.pop();
        }

        if (document.getElementById('live-ops-tab').classList.contains('active')) {
            this.renderLiveFeed();
        }
    }

    async loadInitialData() {
        try {
            // Load system status
            const status = await this.fetchAPI('/api/status');
            this.renderSystemHealth(status);

            // Load metrics
            const cost = await this.fetchAPI('/api/cost');
            this.updateMetrics(cost);

            // Load issues
            const tickets = await this.fetchAPI('/api/tickets');
            if (tickets && tickets.tickets) {
                this.data.issues = tickets.tickets;
                this.renderIssues();
                this.updateOpenIssuesWidget();
            }

            // Load resilience stats
            const resilience = await this.fetchAPI('/api/resilience/health');
            this.updateSystemHealth(resilience);

        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async fetchAPI(endpoint) {
        try {
            const response = await fetch(`http://localhost:19000${endpoint}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            return null;
        }
    }

    async loadTabData(tabId) {
        switch (tabId) {
            case 'jobs':
                await this.loadJobs();
                break;
            case 'issues':
                await this.loadIssues();
                break;
            case 'agents':
                await this.loadAgents();
                break;
            case 'knowledge':
                await this.loadKnowledge();
                break;
            case 'sla':
                await this.loadSLA();
                break;
        }
    }

    async loadJobs() {
        // For now, show recent jobs from live feed
        this.renderJobs();
    }

    async loadIssues() {
        const tickets = await this.fetchAPI('/api/tickets');
        if (tickets && tickets.tickets) {
            this.data.issues = tickets.tickets;
            this.renderIssues();
        }
    }

    async loadAgents() {
        // Load agent status from system
        const status = await this.fetchAPI('/api/status');
        if (status && status.agents) {
            this.data.agents = status.agents.map(name => ({
                name: name,
                status: 'active',
                load: 'medium',
                avgTime: '2.3s',
                successRate: '98%',
                errors: 0
            }));
            this.renderAgents();
        }
    }

    async loadKnowledge() {
        const content = document.getElementById('knowledgeContent');
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <div>Knowledge base coming soon</div>
                <div style="margin-top: 1rem; font-size: 0.875rem;">
                    Learned patterns and solutions will appear here
                </div>
            </div>
        `;
    }

    async loadSLA() {
        const content = document.getElementById('slaContent');
        const tickets = await this.fetchAPI('/api/tickets/stats');

        if (tickets) {
            content.innerHTML = `
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-label">Open Tickets</div>
                        <div class="metric-value">${tickets.open || 0}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Critical</div>
                        <div class="metric-value" style="color: var(--error)">${tickets.byPriority?.critical || 0}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">High Priority</div>
                        <div class="metric-value" style="color: var(--warning)">${tickets.byPriority?.high || 0}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">On Track</div>
                        <div class="metric-value" style="color: var(--success)">${tickets.open - (tickets.byPriority?.critical || 0)}</div>
                    </div>
                </div>
                <div style="margin-top: 1.5rem;">
                    <h3 style="margin-bottom: 1rem;">By Assignee</h3>
                    ${Object.entries(tickets.byAssignee || {}).map(([assignee, count]) => `
                        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
                            <span>${assignee}</span>
                            <span class="status-pill info">${count} tickets</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    renderJobs() {
        const tbody = document.getElementById('jobsTableBody');

        if (this.data.jobs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        No jobs yet
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.data.jobs.slice(0, 50).map(job => `
            <tr onclick="missionControl.showJobDetails('${job.job_id}')">
                <td>${job.job_id || 'N/A'}</td>
                <td>${job.user || 'Anonymous'}</td>
                <td>${job.type || 'General'}</td>
                <td><span class="status-pill ${job.status === 'success' ? 'success' : job.status === 'running' ? 'info' : 'error'}">${job.status || 'unknown'}</span></td>
                <td>${job.time || '--'}</td>
                <td>$${(job.cost || 0).toFixed(4)}</td>
            </tr>
        `).join('');
    }

    renderIssues() {
        const tbody = document.getElementById('issuesTableBody');

        if (this.data.issues.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        ✅ No open issues!
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.data.issues.filter(issue => issue.status === 'open').map(issue => {
            const priorityClass = issue.priority === 'critical' ? 'error' :
                                 issue.priority === 'high' ? 'warning' : 'info';
            return `
                <tr onclick="missionControl.showIssueDetails('${issue.id}')">
                    <td>${issue.id}</td>
                    <td><span class="status-pill ${priorityClass}">${issue.priority}</span></td>
                    <td>${issue.assignedTo || 'Unassigned'}</td>
                    <td>${(issue.error?.message || 'No description').substring(0, 50)}...</td>
                    <td>${this.calculateSLARemaining(issue)}</td>
                    <td><span class="status-pill info">${issue.status}</span></td>
                </tr>
            `;
        }).join('');
    }

    renderAgents() {
        const grid = document.getElementById('agentGrid');

        if (this.data.agents.length === 0) {
            grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤖</div><div>No agents available</div></div>';
            return;
        }

        grid.innerHTML = this.data.agents.map(agent => `
            <div class="agent-card">
                <div class="agent-header">
                    <div class="agent-name">${agent.name}</div>
                    <span class="status-pill success">● ${agent.status}</span>
                </div>
                <div class="agent-stats">
                    <div>
                        <div style="color: var(--text-secondary);">Load</div>
                        <div>${agent.load || 'Low'}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary);">Avg Time</div>
                        <div>${agent.avgTime || '--'}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary);">Success</div>
                        <div>${agent.successRate || '--'}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderLiveFeed() {
        const feed = document.getElementById('liveFeed');

        if (this.data.live.length === 0) {
            feed.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📡</div>
                    <div>Waiting for jobs...</div>
                </div>
            `;
            return;
        }

        feed.innerHTML = this.data.live.map(event => `
            <div class="live-item new">
                <div class="live-item-header">
                    <div class="live-item-title">${event.title || 'Event'}</div>
                    <div class="live-item-time">${this.formatTime(event.timestamp)}</div>
                </div>
                <div class="live-item-body">${event.message || ''}</div>
            </div>
        `).join('');
    }

    updateMetricsWidgets() {
        const metrics = this.data.metrics;

        document.getElementById('requestsCount').textContent = metrics.requests || 0;
        document.getElementById('successRate').textContent = `${metrics.successRate || 0}%`;
        document.getElementById('avgResponse').textContent = `${metrics.avgResponse || 0}s`;
        document.getElementById('totalCost').textContent = `$${(metrics.totalCost || 0).toFixed(4)}`;
    }

    updateMetrics(costData) {
        if (!costData) return;

        const requests = costData.today?.requests || 0;
        const cost = costData.today?.total || 0;

        document.getElementById('requestsCount').textContent = requests;
        document.getElementById('totalCost').textContent = `$${cost.toFixed(4)}`;

        // Calculate success rate (dummy for now)
        const successRate = requests > 0 ? 98 : 0;
        document.getElementById('successRate').textContent = `${successRate}%`;

        // Avg response time (dummy)
        document.getElementById('avgResponse').textContent = '2.3s';
    }

    updateSystemHealth(healthData) {
        if (!healthData) return;

        const container = document.getElementById('systemHealth');
        const checks = healthData.checks || {};

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                ${Object.entries(checks).map(([name, check]) => {
                    const status = check.status || 'unknown';
                    const statusClass = status === 'healthy' ? 'success' :
                                       status === 'down' ? 'error' : 'warning';
                    return `
                        <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">${name}</div>
                            <span class="status-pill ${statusClass}">● ${status}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderSystemHealth(statusData) {
        if (!statusData) return;

        const container = document.getElementById('systemHealth');
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">Gateway</div>
                    <span class="status-pill success">● ${statusData.status || 'running'}</span>
                </div>
                <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">Agents</div>
                    <span class="status-pill success">● ${(statusData.agents || []).length} active</span>
                </div>
                <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">Uptime</div>
                    <span class="status-pill info">${Math.floor(statusData.uptime || 0)}s</span>
                </div>
            </div>
        `;
    }

    updateOpenIssuesWidget() {
        const container = document.getElementById('openIssues');
        const openIssues = this.data.issues.filter(i => i.status === 'open');

        if (openIssues.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--success);">
                    ✅ No open issues!
                </div>
            `;
            return;
        }

        const byPriority = {
            critical: openIssues.filter(i => i.priority === 'critical').length,
            high: openIssues.filter(i => i.priority === 'high').length,
            medium: openIssues.filter(i => i.priority === 'medium').length,
            low: openIssues.filter(i => i.priority === 'low').length
        };

        container.innerHTML = `
            <div style="display: flex; gap: 2rem;">
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Critical</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--error);">${byPriority.critical}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">High</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${byPriority.high}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Medium</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">${byPriority.medium}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Low</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">${byPriority.low}</div>
                </div>
            </div>
        `;
    }

    updateConnectionStatus(connected) {
        const indicator = document.querySelector('.status-indicator');
        if (connected) {
            indicator.style.background = 'var(--success)';
            indicator.title = 'System Online';
        } else {
            indicator.style.background = 'var(--error)';
            indicator.title = 'System Offline';
        }
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        document.getElementById('currentTime').textContent = timeString;
    }

    refreshData() {
        this.loadInitialData();
    }

    startPolling() {
        setInterval(() => {
            this.loadInitialData();
        }, 5000); // Poll every 5 seconds
    }

    performSearch(query) {
        if (!query) return;

        console.log('Searching for:', query);
        // TODO: Implement search across jobs, issues, agents, knowledge
    }

    showJobDetails(jobId) {
        openDrawer('Job Details', `
            <div>
                <h3>Job ID: ${jobId}</h3>
                <p style="margin-top: 1rem;">Full job details coming soon...</p>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="window.open('/trace/${jobId}', '_blank')">View Trace</button>
                </div>
            </div>
        `);
    }

    showIssueDetails(issueId) {
        const issue = this.data.issues.find(i => i.id === issueId);
        if (!issue) return;

        openDrawer('Issue Details', `
            <div>
                <h3>${issue.id}</h3>
                <div style="margin-top: 1rem;">
                    <div style="margin-bottom: 0.5rem;"><strong>Priority:</strong> <span class="status-pill ${issue.priority === 'critical' ? 'error' : issue.priority === 'high' ? 'warning' : 'info'}">${issue.priority}</span></div>
                    <div style="margin-bottom: 0.5rem;"><strong>Assignee:</strong> ${issue.assignedTo || 'Unassigned'}</div>
                    <div style="margin-bottom: 0.5rem;"><strong>Status:</strong> ${issue.status}</div>
                    <div style="margin-bottom: 0.5rem;"><strong>Created:</strong> ${new Date(issue.timestamp).toLocaleString()}</div>
                </div>
                <div style="margin-top: 1rem;">
                    <strong>Error:</strong>
                    <div style="margin-top: 0.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem; font-family: monospace; font-size: 0.875rem;">
                        ${issue.error?.message || 'No error message'}
                    </div>
                </div>
            </div>
        `);
    }

    calculateSLARemaining(issue) {
        // Dummy for now
        return '2h left';
    }

    formatTime(timestamp) {
        if (!timestamp) return '--:--:--';
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    }
}

// Initialize
let missionControl;
document.addEventListener('DOMContentLoaded', () => {
    missionControl = new MissionControl();
});

// Drawer functions
function openDrawer(title, content) {
    document.getElementById('drawerTitle').textContent = title;
    document.getElementById('drawerBody').innerHTML = content;
    document.getElementById('drawer').classList.add('open');
}

function closeDrawer() {
    document.getElementById('drawer').classList.remove('open');
}
