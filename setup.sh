#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NEXT_DIR="$ROOT_DIR/nextjs-app"
PYTHON_DIR="$ROOT_DIR/python-worker"
CONFIG_DIR="$ROOT_DIR/config"
DRAFT_DIR="$ROOT_DIR/generated-drafts"
NEXT_ENV_FILE="$NEXT_DIR/.env.local"
PYTHON_ENV_FILE="$PYTHON_DIR/.env"
WP_SITES_FILE="$CONFIG_DIR/wp-sites.json"
PROMPT_SKILL_FILE="$CONFIG_DIR/prompt-skill.json"
PYTHON_VENV_DIR="$PYTHON_DIR/.venv"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:1.5b}"

log() {
  printf '\n==> %s\n' "$1"
}

warn() {
  printf '\n[warn] %s\n' "$1"
}

require_command() {
  local command_name="$1"
  local install_hint="$2"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '\n[error] Missing required command: %s\n' "$command_name" >&2
    printf '[hint] %s\n' "$install_hint" >&2
    exit 1
  fi
}

write_file_if_missing() {
  local target_file="$1"
  local contents="$2"

  if [[ -f "$target_file" ]]; then
    return
  fi

  printf '%s\n' "$contents" >"$target_file"
}

log "Checking required tools"
require_command "python3" "Install Python 3.10 or newer."
require_command "npm" "Install Node.js and npm."

log "Ensuring local directories exist"
mkdir -p "$CONFIG_DIR" "$DRAFT_DIR"

log "Creating local config files when missing"
write_file_if_missing "$WP_SITES_FILE" '{}'

if [[ ! -f "$PROMPT_SKILL_FILE" ]]; then
  cat >"$PROMPT_SKILL_FILE" <<'JSON'
{
  "name": "Default SEO Blog Skill",
  "enabled": true,
  "description": "Base long-form SEO and readability guidance injected into Ollama prompts.",
  "instructions": "- Use a polished, confident, human-friendly tone.\n- Sound natural, conversational, and professional, not robotic or generic.\n- Do not use emojis.\n- Avoid filler phrases and AI-style wording.\n- Rewrite the title to be engaging and SEO-friendly.\n- Keep the title between 50 and 60 characters when possible.\n- Treat the `title` field as the only H1. Do not place another H1 inside `content_html`.\n- Use H2 for main sections and H3 for subsections inside `content_html`.\n- Keep paragraphs short, usually 2 to 4 lines.\n- Maintain smooth transitions and a logical flow from introduction to conclusion.\n- Write a keyword-rich introduction without sounding forced.\n- Use keyword-rich, meta-friendly subheadings.\n- Expand the article toward 1500 words when the topic supports it.\n- Ensure strong on-page SEO structure without keyword stuffing.\n- If notes include existing blog content, improve and expand that content instead of replacing the topic.\n- If notes include raw URLs, treat them as required internal links to use naturally.\n- Map end-of-post deliverables into the structured JSON fields:\n  - `slug` = suggested URL slug\n  - `meta_description` = 155 to 160 characters when possible\n  - `tags` = concise SEO tags as an array of strings\n- Do not include the question about creating an illustration image inside `content_html`, because this system creates WordPress drafts from the structured fields."
}
JSON
fi

write_file_if_missing "$NEXT_ENV_FILE" "PYTHON_SERVICE_URL=http://127.0.0.1:8000
UI_AUTH_PASSWORD=change-this-password"

write_file_if_missing "$PYTHON_ENV_FILE" "OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=$OLLAMA_MODEL
WP_SITES_FILE=$WP_SITES_FILE
DRAFT_OUTPUT_DIR=$DRAFT_DIR
PROMPT_SKILL_FILE=$PROMPT_SKILL_FILE"

log "Setting up Python virtual environment"
if [[ ! -d "$PYTHON_VENV_DIR" ]]; then
  python3 -m venv "$PYTHON_VENV_DIR"
fi

source "$PYTHON_VENV_DIR/bin/activate"
python -m pip install --upgrade pip
python -m pip install -r "$PYTHON_DIR/requirements.txt"
deactivate

log "Installing Next.js dependencies"
cd "$NEXT_DIR"
npm install
cd "$ROOT_DIR"

log "Checking Ollama"
if command -v ollama >/dev/null 2>&1; then
  if ollama list 2>/dev/null | grep -q "$OLLAMA_MODEL"; then
    printf '[ok] Ollama model already available: %s\n' "$OLLAMA_MODEL"
  else
    printf '[info] Pulling Ollama model: %s\n' "$OLLAMA_MODEL"
    ollama pull "$OLLAMA_MODEL" || warn "Unable to pull $OLLAMA_MODEL automatically. Pull it manually after setup."
  fi
else
  warn "Ollama is not installed. Install Ollama and pull $OLLAMA_MODEL manually."
fi

log "Bootstrap complete"
printf 'Next.js env: %s\n' "$NEXT_ENV_FILE"
printf 'Worker env: %s\n' "$PYTHON_ENV_FILE"
printf 'Saved sites: %s\n' "$WP_SITES_FILE"
printf 'Prompt skill: %s\n' "$PROMPT_SKILL_FILE"
printf '\nNext steps:\n'
printf '1. Update %s with a real UI_AUTH_PASSWORD.\n' "$NEXT_ENV_FILE"
printf '2. Add your WordPress sites in the app or by editing %s.\n' "$WP_SITES_FILE"
printf '3. Start Ollama if it is not already running.\n'
printf '4. Run ./run-dev.sh from %s.\n' "$ROOT_DIR"
