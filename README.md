# Local Draft Queue

Local Draft Queue is a local-first content operations app for teams or solo publishers who want to turn article ideas into WordPress drafts with a local Ollama model.

Current pipeline:

`Next.js UI -> Next.js API routes -> FastAPI worker -> Ollama -> validation -> local .md artifact -> WordPress draft`

This repo is built around a practical constraint: the default model is `qwen2.5-coder:1.5b`, which is small, code-oriented, and not consistently reliable for long-form structured writing. The worker compensates for that with strict prompting, JSON extraction, validation, one retry, and deterministic fallback expansion.

## What It Does

- Create blog tasks from a web UI.
- Save reusable WordPress site credentials locally so you do not re-enter them for every task.
- Edit the active Ollama prompt skill from the UI instead of changing Python code.
- Queue tasks and generate drafts on demand.
- Force JSON-only model output from Ollama.
- Strip non-JSON wrapper text if the model adds noise.
- Validate draft structure and content quality before sending anything to WordPress.
- Save a local Markdown artifact for each generation attempt.
- Create WordPress posts as `draft`, never `publish`.

## Current Scope

This is a production-sensible MVP, not a hosted SaaS product.

It is designed for:
- local use
- one operator or a small trusted environment
- file-backed task storage
- locally stored WordPress credentials

It is not yet designed for:
- multi-user auth
- remote secret management
- shared database-backed queues
- horizontal scaling
- background job orchestration across multiple workers

## Repo Layout

```text
.
├── README.md
├── setup.sh
├── run-dev.sh
├── config/
│   ├── prompt-skill.json
│   └── wp-sites.json
├── generated-drafts/
├── nextjs-app/
│   ├── app/
│   ├── components/
│   ├── data/tasks.json
│   ├── lib/
│   ├── types/
│   └── package.json
└── python-worker/
    ├── app/
    │   ├── clients/
    │   ├── services/
    │   ├── config.py
    │   ├── main.py
    │   └── models.py
    └── requirements.txt
```

## Architecture

### `nextjs-app/`

The frontend and API layer.

- UI pages:
  - `/dashboard`
  - `/queue`
  - `/tasks/[id]`
  - `/sites`
  - `/skills`
- Stores tasks in `nextjs-app/data/tasks.json`
- Stores and edits WordPress site configs through the shared `config/wp-sites.json`
- Stores and edits the active prompt skill through the shared `config/prompt-skill.json`
- Calls the Python worker from server-side API routes

### `python-worker/`

The generation and publishing worker.

- `GET /health`
- `POST /generate-draft`
- Calls Ollama
- Extracts and parses JSON safely
- Validates content
- Writes draft artifacts to `generated-drafts/`
- Creates WordPress drafts through the REST API

## Reliability Strategy For Small Models

The worker assumes Ollama output is untrusted.

Current safeguards:
- prompt requires JSON-only output
- response parser extracts from first `{` to last `}`
- strict schema validation through Pydantic
- one retry if parsing fails
- content validation after parsing
- repair pass if content is structurally valid JSON but fails quality rules
- deterministic expansion fallback for under-length drafts
- clean failure response when the draft still does not pass validation

Validation currently checks:
- required title
- required excerpt
- minimum content length
- at least one `<h2>`
- target keyword presence
- banned phrases
- normalized slug and tags
- markdown-style ordered and unordered lists converted into real HTML lists before WordPress submission
- active writing skill loaded from shared JSON config on every request

## Features

- Task CRUD with confirmation modals
- Site CRUD with confirmation modals
- UI-managed prompt skill configuration
- Shared local WordPress site registry
- Queue status tracking
- Retry flow for failed generations
- Local Markdown artifact output for success and failure cases
- WordPress draft creation via application passwords
- One-command dependency bootstrap with `./setup.sh`
- One-command local startup with `./run-dev.sh`

## Prerequisites

- Node.js 20+ recommended
- npm
- Python 3.10+ recommended
- Ollama installed locally
- WordPress site(s) with REST API access
- WordPress application password(s)

## Model Requirement

This project is configured around:

```text
qwen2.5-coder:1.5b
```

Pull it before running:

```bash
ollama pull qwen2.5-coder:1.5b
```

Make sure Ollama is available at:

```text
http://localhost:11434
```

## Configuration

The repo does not currently ship committed `.env.example` files. Create the following local env files yourself.

### 1. Next.js env

Create [nextjs-app/.env.local](/nextjs-app/.env.local):

```env
PYTHON_SERVICE_URL=http://127.0.0.1:8000
UI_AUTH_PASSWORD=change-this-password
```

### 2. Python worker env

Create [python-worker/.env](/python-worker/.env):

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:1.5b
WP_SITES_FILE=/config/wp-sites.json
DRAFT_OUTPUT_DIR=/generated-drafts
PROMPT_SKILL_FILE=/config/prompt-skill.json
```

You can also use `WP_SITES_JSON`, but the preferred local workflow is `WP_SITES_FILE` so the `/sites` UI can manage the site registry.

### 3. WordPress site registry

Sites are stored in [config/wp-sites.json](/config/wp-sites.json).

Example structure:

```json
{
  "site-a": {
    "label": "Main Blog",
    "base_url": "https://example.com",
    "username": "editor",
    "application_password": "xxxx xxxx xxxx xxxx xxxx xxxx",
    "category_id": 12,
    "default_tags": ["automation", "content"]
  }
}
```

You can either:
- edit this file directly
- or use the `/sites` page in the app

Required fields per site:
- `base_url`
- `username`
- `application_password`
- `category_id`

Optional fields:
- `label`
- `default_tags`

### 4. Prompt skill config

The active prompt skill is stored in [config/prompt-skill.json](/config/prompt-skill.json).

Example structure:

```json
{
  "name": "Default SEO Blog Skill",
  "enabled": true,
  "description": "Base long-form SEO and readability guidance injected into Ollama prompts.",
  "instructions": "- Use a polished, confident, human-friendly tone.\n- Rewrite the title to be engaging and SEO-friendly."
}
```

You can manage this file from the `/skills` page in the UI.

## Installation

### Fast bootstrap

From the repo root:

```bash
cd 
./setup.sh
```

What it does:
- creates missing local config files
- creates `python-worker/.venv` if needed
- installs Python dependencies
- installs Next.js dependencies
- creates missing local env files with placeholder values
- attempts to pull `qwen2.5-coder:1.5b` if Ollama is installed

It does not overwrite your existing local config files.

### Manual Python worker

```bash
cd /python-worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Next.js app

```bash
cd /nextjs-app
npm install
```

## Running Locally

### Recommended

From the repo root:

```bash
cd 
./setup.sh
./run-dev.sh
```

What the script does:
- stops processes already using ports `8000`, `3000`, and `3001`
- clears stale Next.js build cache
- starts the FastAPI worker
- starts the Next.js dev server

### Manual startup

Worker:

```bash
cd /python-worker
set -a
source .env
set +a
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd /nextjs-app
npm run dev
```

## Main Routes

Frontend:
- `/dashboard` create new tasks
- `/login` sign in to the protected UI
- `/queue` inspect and run queued tasks
- `/tasks/[id]` inspect, edit, retry, or delete a task
- `/sites` manage WordPress site credentials
- `/skills` manage the active Ollama prompt skill

Worker:
- `GET /health`
- `POST /generate-draft`

## Typical Workflow

1. Start Ollama.
2. Run `./setup.sh` if this is a fresh clone.
3. Start the app with `./run-dev.sh`.
4. Add one or more sites in `/sites`.
5. Adjust the writing skill in `/skills` if needed.
6. Create a task in `/dashboard`.
7. Open `/queue`.
8. Click `Generate Draft`.
9. Review the task result and the generated Markdown artifact.
10. Open the WordPress draft link if generation succeeded.

## Output Artifacts

Each generation writes a local Markdown file to [generated-drafts](/generated-drafts).

The artifact contains:
- task metadata
- generation status
- error details on failure
- partial draft snapshot when available
- WordPress draft metadata on success

This makes debugging much easier when the local model returns low-quality or malformed output.

## API Summary

### Next.js API

- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/[id]`
- `PUT /api/tasks/[id]`
- `DELETE /api/tasks/[id]`
- `POST /api/tasks/[id]/generate`
- `POST /api/tasks/[id]/retry`
- `GET /api/sites`
- `POST /api/sites`
- `GET /api/sites/[siteKey]`
- `PUT /api/sites/[siteKey]`
- `DELETE /api/sites/[siteKey]`
- `GET /api/skill`
- `PUT /api/skill`
- `POST /api/skill`

### Python worker

- `GET /health`
- `POST /generate-draft`

Request shape:

```json
{
  "task_id": "uuid",
  "site_key": "site-a",
  "title_hint": "How to make coffee",
  "target_keyword": "coffee",
  "notes": "Optional source content, internal links, and writing instructions"
}
```

Expected model JSON shape:

```json
{
  "title": "",
  "slug": "",
  "excerpt": "",
  "content_html": "",
  "seo_title": "",
  "meta_description": "",
  "tags": []
}
```

## Security Notes

This repo stores sensitive local data in files that are intentionally gitignored:
- `python-worker/.env`
- `nextjs-app/.env.local`
- `config/wp-sites.json`
- `generated-drafts/`

If you open source this repo:
- do not commit real WordPress credentials
- do not commit local draft artifacts
- do not commit local env files
- do not commit your UI password
- keep file permissions tight on `config/wp-sites.json`

Recommended:

```bash
chmod 600 /config/wp-sites.json
```

## Known Limitations

- Task storage is file-backed JSON, not a database.
- WordPress credentials are stored locally in plain JSON.
- UI authentication is a single shared local password, not a full user system.
- There is no multi-user account system.
- There is no distributed job queue.
- Generation quality is still limited by the small default model.
- The app is designed for local operation, not direct public deployment in its current form.

## Good Next Steps

If you want to push this beyond MVP, the highest-value upgrades are:

- move task storage to Postgres or SQLite
- encrypt or externalize site credentials
- add background job processing
- add richer HTML sanitation and formatting controls
- add per-site prompt templates and content rules
- add multiple named skill profiles instead of a single active skill
- add test coverage around worker validation and API routes
- add Docker support
- add proper env example files for contributors

## Development Notes

Useful local checks:

```bash
cd /nextjs-app
npm run build
npm run typecheck
```

```bash
cd 
PYTHONPYCACHEPREFIX=/tmp/auto-pycache python3 -m py_compile python-worker/app/services/validators.py
```

## License

No license file is currently included. Add one before publishing if you want the repo to be usable as an open-source project.
