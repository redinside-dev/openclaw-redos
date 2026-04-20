#!/bin/bash

# Project Repository Creation Script
# Creates a new GitHub repository and sets up initial project structure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed. Please install it first:"
    print_error "https://cli.github.com/"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "This script must be run from within a git repository"
    exit 1
fi

# Get repository name from current directory
REPO_NAME=$(basename "$PWD")

print_status "Creating GitHub repository: $REPO_NAME"

# Create the repository
gh repo create "$REPO_NAME" \
    --public \
    --clone \
    --source=. \
    --push

print_success "Repository created successfully!"

# Get the remote URL
REMOTE_URL=$(git remote get-url origin)

print_status "Repository URL: $REMOTE_URL"

# Create initial commit if needed
if [ -z "$(git status --porcelain)" ]; then
    print_status "Repository already has initial commit"
else
    git add .
    git commit -m "Initial commit: Project template setup"
    git push origin main
    print_success "Initial commit pushed to remote"
fi

print_success "Project setup complete!"
print_status "You can now start development:"
print_status "  cd $REPO_NAME"
print_status "  # Edit SPEC.md with project-specific requirements"
print_status "  # Begin development"

exit 0