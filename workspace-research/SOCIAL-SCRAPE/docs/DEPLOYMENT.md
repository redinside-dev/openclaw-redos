# Deployment Guide

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Setup
```bash
# Clone repository
git clone <repo-url>
cd SOCIAL-SCRAPE

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Install Playwright browsers
npx playwright install chromium

# Run tests
npm test

# Run examples
npm run twitter
npm run reddit
npm run multi
```

## Production Deployment

### Option 1: Systemd Service (Linux)

1. **Create service file**: `/etc/systemd/system/social-scrape.service`

```ini
[Unit]
Description=Social Media Scraper Background Collector
After=network.target

[Service]
Type=simple
User=scraper
Group=scraper
WorkingDirectory=/opt/social-scrape
Environment="NODE_ENV=production"
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/node examples/background-collector.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/social-scrape/collector.log
StandardError=append:/var/log/social-scrape/collector-error.log

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/social-scrape/data /opt/social-scrape/logs

[Install]
WantedBy=multi-user.target
```

2. **Create user and directories**:
```bash
# Create user
sudo useradd -r -s /bin/false scraper

# Create directories
sudo mkdir -p /opt/social-scrape
sudo mkdir -p /var/log/social-scrape

# Set permissions
sudo chown -R scraper:scraper /opt/social-scrape
sudo chown -R scraper:scraper /var/log/social-scrape
```

3. **Deploy application**:
```bash
# Copy files
sudo cp -r . /opt/social-scrape/
cd /opt/social-scrape

# Install dependencies
sudo -u scraper npm ci --only=production
sudo -u scraper npx playwright install chromium
```

4. **Start service**:
```bash
# Enable and start
sudo systemctl enable social-scrape
sudo systemctl start social-scrape

# Check status
sudo systemctl status social-scrape

# View logs
sudo journalctl -u social-scrape -f
```

### Option 2: Docker Deployment

1. **Build Docker image**:
```bash
docker build -t social-scrape:latest .
```

2. **Run container**:
```bash
docker run -d \
  --name social-scrape \
  --restart unless-stopped \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -e NODE_ENV=production \
  social-scrape:latest
```

3. **Docker Compose**: `docker-compose.yml`
```yaml
version: '3.8'

services:
  scraper:
    build: .
    container_name: social-scrape
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - BROWSER_HEADLESS=true
      - SCRAPE_DELAY_MIN=2000
      - SCRAPE_DELAY_MAX=5000
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Run with:
```bash
docker-compose up -d
```

### Option 3: Kubernetes Deployment

1. **Create ConfigMap**: `k8s-configmap.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: social-scrape-config
data:
  .env: |
    BROWSER_HEADLESS=true
    SCRAPE_DELAY_MIN=2000
    SCRAPE_DELAY_MAX=5000
    STORAGE_TYPE=filesystem
    STORAGE_PATH=/app/data
```

2. **Create Deployment**: `k8s-deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: social-scrape
spec:
  replicas: 1
  selector:
    matchLabels:
      app: social-scrape
  template:
    metadata:
      labels:
        app: social-scrape
    spec:
      containers:
      - name: scraper
        image: social-scrape:latest
        env:
        - name: NODE_ENV
          value: "production"
        volumeMounts:
        - name: data
          mountPath: /app/data
        - name: logs
          mountPath: /app/logs
        - name: config
          mountPath: /app/.env
          subPath: .env
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: social-scrape-data
      - name: logs
        persistentVolumeClaim:
          claimName: social-scrape-logs
      - name: config
        configMap:
          name: social-scrape-config
```

3. **Create PersistentVolumeClaim**: `k8s-pvc.yaml`
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: social-scrape-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: social-scrape-logs
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

Deploy:
```bash
kubectl apply -f k8s-configmap.yaml
kubectl apply -f k8s-pvc.yaml
kubectl apply -f k8s-deployment.yaml
```

### Option 4: Cloud Deployment

#### AWS EC2
```bash
# Launch EC2 instance (t3.medium or larger)
# Ubuntu 22.04 LTS

# SSH into instance
ssh -i key.pem ubuntu@<instance-ip>

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
sudo apt-get update
sudo apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2

# Deploy application
git clone <repo-url> /opt/social-scrape
cd /opt/social-scrape
npm ci --only=production
npx playwright install chromium

# Set up systemd service (see Option 1)
```

#### Google Cloud Run
```bash
# Build container
gcloud builds submit --tag gcr.io/PROJECT_ID/social-scrape

# Deploy
gcloud run deploy social-scrape \
  --image gcr.io/PROJECT_ID/social-scrape \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --no-allow-unauthenticated
```

#### DigitalOcean App Platform
```yaml
# .do/app.yaml
name: social-scrape
services:
- name: scraper
  dockerfile_path: Dockerfile
  github:
    repo: your-org/social-scrape
    branch: main
  instance_count: 1
  instance_size_slug: professional-s
  envs:
  - key: NODE_ENV
    value: "production"
  - key: BROWSER_HEADLESS
    value: "true"
```

## Cron Job Deployment

### Local Crontab
```bash
# Edit crontab
crontab -e

# Add jobs
*/15 * * * * cd /opt/social-scrape && /usr/bin/node schedulers/twitter-cron.js >> logs/twitter-cron.log 2>&1
*/30 * * * * cd /opt/social-scrape && /usr/bin/node schedulers/reddit-cron.js >> logs/reddit-cron.log 2>&1
0 * * * * cd /opt/social-scrape && /usr/bin/node schedulers/health-check.js >> logs/health.log 2>&1
```

### Kubernetes CronJob
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: twitter-scraper
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: scraper
            image: social-scrape:latest
            command: ["node", "schedulers/twitter-cron.js"]
          restartPolicy: OnFailure
```

## Monitoring Setup

### Prometheus Metrics
```javascript
// Add to your application
const promClient = require('prom-client');

const register = new promClient.Registry();

const scrapingDuration = new promClient.Histogram({
  name: 'scraping_duration_seconds',
  help: 'Duration of scraping operations',
  labelNames: ['platform', 'operation']
});

const scrapingErrors = new promClient.Counter({
  name: 'scraping_errors_total',
  help: 'Total number of scraping errors',
  labelNames: ['platform', 'error_type']
});

register.registerMetric(scrapingDuration);
register.registerMetric(scrapingErrors);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Log Aggregation with ELK Stack

**Filebeat configuration**: `filebeat.yml`
```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/social-scrape/*.log
  fields:
    service: social-scrape
  fields_under_root: true

output.elasticsearch:
  hosts: ["localhost:9200"]

setup.kibana:
  host: "localhost:5601"
```

### Health Check Endpoint
```javascript
// Add to your application
const express = require('express');
const app = express();

app.get('/health', async (req, res) => {
  const status = await collector.getStatus();
  
  if (status.isRunning && status.stats.successfulRuns > 0) {
    res.status(200).json({
      status: 'healthy',
      ...status
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      ...status
    });
  }
});

app.listen(3000);
```

## Scaling Considerations

### Horizontal Scaling
```javascript
// Use message queue for distributed scraping
const Queue = require('bull');

const scrapeQueue = new Queue('scraping', {
  redis: { host: 'localhost', port: 6379 }
});

// Producer
scrapeQueue.add('twitter', {
  username: 'elonmusk',
  limit: 100
});

// Consumer (multiple workers)
scrapeQueue.process('twitter', async (job) => {
  const { username, limit } = job.data;
  const scraper = new TwitterScraper();
  return await scraper.scrapeTweets(username, { limit });
});
```

### Load Balancing
```nginx
# nginx.conf
upstream scrapers {
    server scraper1:3000;
    server scraper2:3000;
    server scraper3:3000;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://scrapers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Backup and Recovery

### Automated Backups
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/social-scrape"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Backup data
tar -czf "$BACKUP_DIR/data-$DATE.tar.gz" /opt/social-scrape/data

# Backup logs
tar -czf "$BACKUP_DIR/logs-$DATE.tar.gz" /opt/social-scrape/logs

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /opt/social-scrape/backup.sh
```

### Disaster Recovery
```bash
# Restore from backup
tar -xzf /backups/social-scrape/data-2024-01-01.tar.gz -C /opt/social-scrape/
```

## Security Hardening

### Firewall Rules
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 443/tcp # HTTPS (if API exposed)
sudo ufw enable
```

### SSL/TLS Configuration
```nginx
# nginx SSL config
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### Environment Variables Security
```bash
# Use secrets management
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name social-scrape/config \
  --secret-string file://.env

# Retrieve in application
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();
const secret = await secretsManager.getSecretValue({
  SecretId: 'social-scrape/config'
}).promise();
```

## Troubleshooting

### Common Deployment Issues

1. **Playwright not working in Docker**
   ```dockerfile
   # Add these packages
   RUN apt-get update && apt-get install -y \
       libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
       libcups2 libdrm2 libxkbcommon0 libxcomposite1
   ```

2. **Memory issues**
   ```javascript
   // Limit browser instances
   const pool = new BrowserPool(3); // Max 3 browsers
   
   // Clean up regularly
   setInterval(async () => {
     if (global.gc) {
       global.gc();
     }
   }, 300000); // Every 5 minutes
   ```

3. **Disk space**
   ```bash
   # Monitor disk usage
   df -h
   
   # Clean old logs
   find /opt/social-scrape/logs -name "*.log" -mtime +7 -delete
   ```

## Performance Optimization

### Database Optimization
```javascript
// Use connection pooling
const pool = new Pool({
  host: 'localhost',
  database: 'social_scrape',
  max: 20,
  idleTimeoutMillis: 30000
});

// Batch inserts
const batchSize = 100;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  await db.query('INSERT INTO posts VALUES ...', batch);
}
```

### Caching
```javascript
// Use Redis for caching
const redis = require('redis');
const client = redis.createClient();

async function cachedScrape(key, scrapeFn, ttl = 3600) {
  const cached = await client.get(key);
  if (cached) return JSON.parse(cached);
  
  const result = await scrapeFn();
  await client.setex(key, ttl, JSON.stringify(result));
  return result;
}
```
