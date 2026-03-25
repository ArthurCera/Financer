#!/usr/bin/env bash
# =============================================================================
# 06-setup-ollama-lite.sh — Ollama with lighter models for ≤8 GB VRAM
#
# Model selection:
#   OCR:        moondream  (~4–8 GB VRAM)   — vision/OCR, lighter than glm-ocr
#   Chat:       phi4-mini  (~3 GB VRAM)     — instruction following, fast
#   Embeddings: nomic-embed-text (<1 GB)    — 768 dimensions
#
# NOTE: nomic-embed-text produces 768-dim vectors.
#       Set OLLAMA_EMBED_DIMENSIONS=768 in your .env (default is 1024 for bge-m3).
#       If you already ran migrations with the default 1024 schema, re-run nuke + setup.
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Defaults — overridden by .env if present
OCR_MODEL="${OLLAMA_OCR_MODEL:-moondream}"
CHAT_MODEL="${OLLAMA_CHAT_MODEL:-phi4-mini}"
EMBED_MODEL="${OLLAMA_EMBED_MODEL:-nomic-embed-text}"

echo -e "${YELLOW}[Ollama] Checking installation...${NC}"

# zstd is required by the Ollama installer for archive extraction
if ! command -v zstd &>/dev/null; then
  echo -e "${YELLOW}[Ollama] Installing zstd (required by Ollama installer)...${NC}"
  if command -v apt-get &>/dev/null; then
    sudo apt-get install -y zstd
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y zstd
  elif command -v pacman &>/dev/null; then
    sudo pacman -S --noconfirm zstd
  else
    echo -e "${RED}[Ollama] Cannot install zstd automatically. Please run: sudo apt-get install zstd${NC}"
    exit 1
  fi
fi

if ! command -v ollama &>/dev/null; then
  echo -e "${YELLOW}[Ollama] Not found. Installing via official installer...${NC}"
  # NOTE: For production, download and verify the installer checksum before executing.
  # See: https://ollama.com/download for checksums.
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo -e "${GREEN}[Ollama] Already installed: $(ollama --version)${NC}"
fi

# Ensure Ollama service is running
if ! pgrep -x ollama &>/dev/null; then
  echo -e "${YELLOW}[Ollama] Starting service...${NC}"
  ollama serve &>/dev/null &

  # Wait for Ollama to be ready (up to 30 seconds)
  MAX_WAIT=30
  WAITED=0
  until curl -sf http://localhost:11434/api/tags &>/dev/null; do
    if [ "$WAITED" -ge "$MAX_WAIT" ]; then
      echo -e "${RED}[Ollama] Failed to start within ${MAX_WAIT}s. Check logs with: ollama serve${NC}"
      exit 1
    fi
    sleep 2
    WAITED=$((WAITED + 2))
  done
  echo -e "${GREEN}[Ollama] Service is ready.${NC}"
fi

echo -e "${YELLOW}[Ollama] Pulling lite models (lower VRAM — first run may take several minutes)...${NC}"

echo -e "${YELLOW}[Ollama] Pulling OCR model: ${OCR_MODEL}${NC}"
ollama pull "$OCR_MODEL"

echo -e "${YELLOW}[Ollama] Pulling chat model: ${CHAT_MODEL}${NC}"
ollama pull "$CHAT_MODEL"

echo -e "${YELLOW}[Ollama] Pulling embedding model: ${EMBED_MODEL}${NC}"
ollama pull "$EMBED_MODEL"

echo -e "${GREEN}[Ollama] All lite models ready.${NC}"
echo -e "  API:        http://localhost:11434"
echo -e "  OCR:        ${OCR_MODEL}  (payslip parsing)"
echo -e "  Chat:       ${CHAT_MODEL}  (expense categorisation & chat)"
echo -e "  Embeddings: ${EMBED_MODEL}  (vector search — 768 dims)"
echo -e "${YELLOW}  Reminder: set OLLAMA_EMBED_DIMENSIONS=768 in your .env${NC}"
ollama list
