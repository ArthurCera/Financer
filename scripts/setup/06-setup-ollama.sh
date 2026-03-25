#!/usr/bin/env bash
# =============================================================================
# 06-setup-ollama.sh — Install Ollama and pull required models (idempotent)
# Note: Ollama runs natively (not in Docker) to support GPU acceleration.
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Defaults — overridden by .env if present
# Ollama loads one model at a time; peak VRAM ≈ 8 GB (largest model)
# Payslip OCR — glm-ocr (~6–8 GB VRAM); alt: moondream (~4 GB)
OCR_MODEL="${OLLAMA_OCR_MODEL:-glm-ocr}"
# Expense categorisation & chat — qwen3.5:9b (~5–6 GB VRAM at 4-bit); alt: llama3.1:8b
CHAT_MODEL="${OLLAMA_CHAT_MODEL:-qwen3.5:9b}"
# Vector embeddings — bge-m3 (<1 GB VRAM); alt: nomic-embed-text
EMBED_MODEL="${OLLAMA_EMBED_MODEL:-bge-m3}"

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

echo -e "${YELLOW}[Ollama] Pulling models (this may take several minutes on first run)...${NC}"

echo -e "${YELLOW}[Ollama] Pulling OCR model: ${OCR_MODEL}${NC}"
ollama pull "$OCR_MODEL"

echo -e "${YELLOW}[Ollama] Pulling chat model: ${CHAT_MODEL}${NC}"
ollama pull "$CHAT_MODEL"

echo -e "${YELLOW}[Ollama] Pulling embedding model: ${EMBED_MODEL}${NC}"
ollama pull "$EMBED_MODEL"

echo -e "${GREEN}[Ollama] All models ready.${NC}"
echo -e "  API:        http://localhost:11434"
echo -e "  OCR:        ${OCR_MODEL}  (payslip parsing)"
echo -e "  Chat:       ${CHAT_MODEL}  (expense categorisation & chat)"
echo -e "  Embeddings: ${EMBED_MODEL}  (vector search)"
ollama list
