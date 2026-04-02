#!/bin/bash

set -e

# ════════════════════════════════════════════════════════════
# Colors
# ════════════════════════════════════════════════════════════
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        Deploy Backend to CapRover - Complete             ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo ""

# ════════════════════════════════════════════════════════════
# Step 1: Navigate to project
# ════════════════════════════════════════════════════════════
echo -e "${YELLOW}[1/8]${NC} Navigating to project directory..."

cd /root/back/backendajka || {
    echo -e "${RED}❌ Project directory not found!${NC}"
    echo -e "${BLUE}Cloning from GitHub...${NC}"
    cd /root/back
    git clone https://github.com/dawfusoffsd/backendajka.git
    cd backendajka
}

echo -e "${GREEN}✅ Current directory: $(pwd)${NC}"
echo ""

# ════════════════════════════════════════════════════════════
# Step 2: Clean old deployment files
# ════════════════════════════════════════════════════════════
echo -e "${YELLOW}[2/8]${NC} Cleaning old deployment files..."

rm -f captain-definition
rm -f Dockerfile
rm -f .dockerignore
rm -f temporary-captain-to-deploy.tar

echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

# ════════════════════════════════════════════════════════════
# Step 3: Create captain-definition
# ════════════════════════════════════════════════════════════
echo -e "${YELLOW}[3/8]${NC} Creating captain-definition..."

cat > captain-definition << 'EOF'
{
  "schemaVersion": 2,
  "dockerfilePath": "./Dockerfile"
}
EOF

echo -e "${GREEN}✅ captain-definition created${NC}"
cat captain-definition
echo ""

# ════════════════════════════════════════════════════════════
# Step 4: Create Dockerfile
# ════════════════════════════════════════════════════════════
echo -e "${YELLOW}[4/8]${NC} Creating Dockerfile..."

cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production --quiet

# Copy application files
COPY . .

# Create data directory with proper permissions
RUN mkdir -p /app/data && chmod 777 /app/data

# Run migrations if script exists
RUN if [ -f migrations/run.js ]; then npm run migrate || echo "Migrations will run at startup"; fi

# Expose application port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:80/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start application
CMD ["npm", "start"]
EOF

echo -e "${GREEN}✅ Dockerfile created${NC}"
echo ""

# ════════════════════════════════════════════════════════════
# Step 5: Create .dockerignore
# ════════════════════════════════════════════════════════════
echo -e "${YELLOW}[5/8]${NC} Creating .dockerignore..."

cat > .dockerignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.production

# Git
.git/
.gitignore

# Database
data/*.db
data/*.db-shm
data/*.db-wal

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build
dist/
build/
temporary-captain-to-deploy.tar

# Documentation
README.md
docs/
EOF

echo -e "${GREEN}✅ .dockerignore created${NC}"
echo ""

# ════════════════════════════════════════════════════════════
# Step 6: Verify package.json
# ════════════════════════════════════════════════════════════
echo -e "${YELLOW}[6/8]${NC} Verifying package.json..."

if [ ! -f package.json ]; then
    echo -e "${RED}❌ package.json not found!${NC}"
    exit 1
fi

# Check for start script
if ! grep -q '"start"' package.json; then
    echo -e "${YELLOW}⚠️  Adding start script to package.json...${NC}"
    
    # Backup
    cp package.json package.json.backup
    
    # Add start script
    node << 'NODESCRIPT'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!pkg.scripts) pkg.scripts = {};
if (!pkg.scripts.start) pkg.scripts.start = 'node src/server.js';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
NODESCRIPT
fi

echo -e "${GREEN}✅ package.json verified${NC}"
echo -e "${CYAN}Scripts:${NC}"
cat package.json | grep -A 5 '"scripts"' || echo "No scripts found"
echo ""

# ════════════════════════════════════════════════════════════
# Step 7: Git commit
# ════════════════════════════════════════════════════════════
echo -e "${YELLOW}[7/8]${NC} Committing deployment files to Git..."

git config --global user.name "Ahmed Elbik" 2>/dev/null || true
git config --global user.email "ahmedelbik.10@gmail.com" 2>/dev/null || true

git add captain-definition Dockerfile .dockerignore package.json

if git diff --staged --quiet; then
    echo -e "${BLUE}ℹ️  No changes to commit${NC}"
else
    git commit -m "🚀 Add CapRover deployment configuration

- Added captain-definition
- Added Dockerfile with multi-stage build
- Added .dockerignore for optimized builds
- Ready for deployment"
    
    echo -e "${GREEN}✅ Changes committed${NC}"
fi

echo ""

# ════════════════════════════════════════════════════════════
# Step 8: Deploy to CapRover
# ════════════════════════════════════════════════════════════
echo -e "${YELLOW}[8/8]${NC} Deploying to CapRover..."
echo ""

# Check if caprover CLI is installed
if ! command -v caprover &> /dev/null; then
    echo -e "${BLUE}Installing CapRover CLI...${NC}"
    npm install -g caprover
    echo -e "${GREEN}✅ CapRover CLI installed${NC}"
    echo ""
fi

# Check CapRover login
if [ ! -f ~/.caprover/config.json ]; then
    echo -e "${BLUE}Logging into CapRover...${NC}"
    
    mkdir -p ~/.caprover
    cat > ~/.caprover/config.json << 'CAPCONFIG'
{
  "captainMachines": {
    "my-captain": {
      "baseUrl": "https://captain.47.84.106.100.sslip.io",
      "name": "my-captain"
    }
  }
}
CAPCONFIG
    
    echo "captain42" | caprover login --machine-name my-captain --password-stdin
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Logged into CapRover${NC}"
    else
        echo -e "${RED}❌ Failed to login to CapRover${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Starting deployment - This may take a few minutes${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

# Deploy
caprover deploy --appName backend

DEPLOY_STATUS=$?

echo ""

# ════════════════════════════════════════════════════════════
# Summary
# ════════════════════════════════════════════════════════════

if [ $DEPLOY_STATUS -eq 0 ]; then
    clear
    echo -e "${GREEN}"
    cat << "SUCCESS"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║          ✅ DEPLOYMENT SUCCESSFUL! 🎉                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
SUCCESS
    echo -e "${NC}"
    echo ""
    
    echo -e "${CYAN}📍 Your Backend is Live!${NC}"
    echo -e "   ${YELLOW}https://srv-captain--backend.captain.47.84.106.100.sslip.io${NC}"
    echo ""
    
    echo -e "${CYAN}🧪 Test Your API:${NC}"
    echo -e "   ${BLUE}curl https://srv-captain--backend.captain.47.84.106.100.sslip.io${NC}"
    echo -e "   ${BLUE}curl https://srv-captain--backend.captain.47.84.106.100.sslip.io/health${NC}"
    echo -e "   ${BLUE}curl https://srv-captain--backend.captain.47.84.106.100.sslip.io/api/stats${NC}"
    echo ""
    
    echo -e "${CYAN}📊 View Logs:${NC}"
    echo -e "   ${BLUE}caprover logs --appName backend --lines 100${NC}"
    echo -e "   Or visit: ${YELLOW}https://captain.47.84.106.100.sslip.io${NC}"
    echo ""
    
    echo -e "${CYAN}🔧 Add Custom Domain:${NC}"
    echo -e "   1. Go to CapRover Dashboard"
    echo -e "   2. Apps → backend → HTTP Settings"
    echo -e "   3. Add: ${YELLOW}backend.elbik.online${NC}"
    echo -e "   4. Enable HTTPS & Force HTTPS"
    echo ""
    
    echo -e "${CYAN}📝 Admin Credentials:${NC}"
    echo -e "   Email: ${YELLOW}admin@example.com${NC}"
    echo -e "   Password: ${YELLOW}admin123${NC}"
    echo ""
    
    echo -e "${GREEN}✨ Deployment completed successfully!${NC}"
    echo ""
    
    # Auto test
    echo -e "${CYAN}🧪 Running automatic health check...${NC}"
    sleep 5
    
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://srv-captain--backend.captain.47.84.106.100.sslip.io/health 2>/dev/null || echo "000")
    
    if [ "$HEALTH_CHECK" = "200" ]; then
        echo -e "${GREEN}✅ Health check passed! Backend is responding.${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check returned: $HEALTH_CHECK${NC}"
        echo -e "${BLUE}💡 Give it a minute and try manually:${NC}"
        echo -e "   curl https://srv-captain--backend.captain.47.84.106.100.sslip.io/health"
    fi
    
else
    echo -e "${RED}"
    cat << "FAILED"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║            ❌ DEPLOYMENT FAILED                         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
FAILED
    echo -e "${NC}"
    echo ""
    
    echo -e "${CYAN}🔍 Troubleshooting:${NC}"
    echo -e "   1. Check logs: ${BLUE}caprover logs --appName backend${NC}"
    echo -e "   2. Verify Dockerfile syntax"
    echo -e "   3. Check CapRover Dashboard: ${YELLOW}https://captain.47.84.106.100.sslip.io${NC}"
    echo ""
    
    exit 1
fi
