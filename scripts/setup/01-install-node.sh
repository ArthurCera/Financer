#!/usr/bin/env bash
# =============================================================================
# 01-install-node.sh — Install Node.js via nvm (idempotent)
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}[Node.js] Checking installation...${NC}"

if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}[Node.js] Already installed: ${NODE_VERSION}${NC}"
  exit 0
fi

echo -e "${YELLOW}[Node.js] Not found. Installing nvm...${NC}"

export NVM_DIR="$HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# Load nvm in current shell
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo -e "${YELLOW}[Node.js] Installing LTS version...${NC}"
nvm install --lts
nvm use --lts
nvm alias default node

echo -e "${GREEN}[Node.js] Installed: $(node -v)${NC}"
