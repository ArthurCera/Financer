#!/usr/bin/env bash
# =============================================================================
# 02-install-pnpm.sh — Install pnpm globally (idempotent)
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}[pnpm] Checking installation...${NC}"

# pnpm may be installed in ~/.local/share/pnpm — ensure that's on PATH
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME:$PATH"

if command -v pnpm &>/dev/null; then
  PNPM_VERSION=$(pnpm -v)
  echo -e "${GREEN}[pnpm] Already installed: v${PNPM_VERSION}${NC}"
  # Ensure PNPM_HOME is persisted in .bashrc if not already there
  if ! grep -q 'PNPM_HOME' "$HOME/.bashrc" 2>/dev/null; then
    {
      echo 'export PNPM_HOME="$HOME/.local/share/pnpm"'
      echo 'case ":$PATH:" in *":$PNPM_HOME:"*) ;; *) export PATH="$PNPM_HOME:$PATH" ;; esac'
    } >> "$HOME/.bashrc"
  fi
  exit 0
fi

echo -e "${YELLOW}[pnpm] Not found. Installing via official installer...${NC}"

# Use the official pnpm installer — no sudo required, installs to ~/.local/share/pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -s --

# Reload PATH
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo -e "${GREEN}[pnpm] Installed: v$(pnpm -v)${NC}"
