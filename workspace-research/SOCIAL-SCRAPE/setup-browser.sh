#!/bin/bash

echo "Setting up SOCIAL-SCRAPE browser environment..."

# Install Playwright browsers
npm install
npx playwright install

# Create data directory
mkdir -p data

# Create logs directory
mkdir -p logs

echo "Setup complete!"
echo "Run: npm test to verify installation"