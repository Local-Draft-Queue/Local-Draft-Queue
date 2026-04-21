# Python Worker

FastAPI worker that:

1. accepts a blog task
2. generates a strict JSON draft via the selected AI provider
3. validates the result
4. creates a WordPress draft

Run locally:

```bash
cd python-worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
