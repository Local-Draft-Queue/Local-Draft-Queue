import Link from "next/link";

function SetupCodeBlock({ code }: { code: string }) {
  return (
    <pre className="setup-code">
      <code>{code}</code>
    </pre>
  );
}

export default function SetupPage() {
  return (
    <div className="setup-shell">
      <section className="hero-copy">
        <p className="eyebrow">Setup Guide</p>
        <h2>Configure WordPress, Ollama, auth, and local services end to end.</h2>
        <p>
          Use this page as the in-app runbook for bringing the full pipeline online:
          WordPress credentials, local model access, UI authentication, worker env, and
          day-to-day startup.
        </p>
      </section>

      <aside className="panel setup-sidebar">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Quick Index</p>
            <h2>Setup Order</h2>
          </div>
        </div>
        <ol className="setup-list">
          <li><a href="#prerequisites">Check prerequisites</a></li>
          <li><a href="#wordpress">Configure WordPress</a></li>
          <li><a href="#ollama">Install and verify Ollama</a></li>
          <li><a href="#auth">Set the UI password</a></li>
          <li><a href="#worker-env">Create the worker env file</a></li>
          <li><a href="#next-env">Create the Next.js env file</a></li>
          <li><a href="#sites">Save your sites in the UI</a></li>
          <li><a href="#skills">Tune the writing skill</a></li>
          <li><a href="#run">Run the app</a></li>
          <li><a href="#generate">Generate your first draft</a></li>
          <li><a href="#troubleshooting">Troubleshoot failures</a></li>
        </ol>
      </aside>

      <div className="setup-sections">
        <section className="panel setup-section" id="prerequisites">
          <div className="panel-header">
            <div>
              <p className="eyebrow">1. Prerequisites</p>
              <h2>Install the local dependencies first</h2>
            </div>
          </div>
          <ul className="setup-list">
            <li>Node.js 20 or newer</li>
            <li>npm</li>
            <li>Python 3.10 or newer recommended</li>
            <li>Ollama installed locally</li>
            <li>At least one WordPress site with REST API access</li>
            <li>A WordPress user with permission to create drafts</li>
          </ul>
          <p className="setup-note">
            This app is local-first. It stores task data and site credentials in local files.
          </p>
        </section>

        <section className="panel setup-section" id="wordpress">
          <div className="panel-header">
            <div>
              <p className="eyebrow">2. WordPress</p>
              <h2>Create application-password access for each site</h2>
            </div>
          </div>
          <ol className="setup-list">
            <li>Log in to your WordPress admin.</li>
            <li>Go to <code>Users -&gt; Profile</code> for the account that will create drafts.</li>
            <li>Find the <code>Application Passwords</code> section.</li>
            <li>Create a new application password and copy it exactly.</li>
            <li>Note the site base URL, for example <code>https://example.com</code>.</li>
            <li>Find the category ID you want new drafts to use.</li>
          </ol>
          <p className="setup-note">
            The worker creates posts with <code>status=draft</code> only. It never publishes automatically.
          </p>
          <p className="muted">Useful category lookup:</p>
          <SetupCodeBlock code={`curl https://example.com/wp-json/wp/v2/categories`} />
          <p className="muted">Useful tag lookup:</p>
          <SetupCodeBlock code={`curl https://example.com/wp-json/wp/v2/tags`} />
        </section>

        <section className="panel setup-section" id="ollama">
          <div className="panel-header">
            <div>
              <p className="eyebrow">3. Ollama</p>
              <h2>Install the required local model and verify the daemon</h2>
            </div>
          </div>
          <p>
            This app is configured around one specific model:
            {" "}
            <strong><code>qwen2.5-coder:1.5b</code></strong>
          </p>
          <SetupCodeBlock code={`ollama pull qwen2.5-coder:1.5b`} />
          <p className="muted">Check that Ollama is reachable:</p>
          <SetupCodeBlock code={`curl http://localhost:11434/api/tags`} />
          <p className="setup-note">
            This is a small code-oriented model. The worker already compensates with strict
            prompting, JSON extraction, retry logic, validation, and fallback expansion.
          </p>
        </section>

        <section className="panel setup-section" id="auth">
          <div className="panel-header">
            <div>
              <p className="eyebrow">4. UI Authentication</p>
              <h2>Protect the Next.js UI with a local admin password</h2>
            </div>
          </div>
          <p>
            The dashboard, queue, sites, skills, and Next.js API routes are protected by a
            password-backed session cookie.
          </p>
          <p>
            Add <code>UI_AUTH_PASSWORD</code> to
            {" "}
            <code>nextjs-app/.env.local</code>.
          </p>
          <SetupCodeBlock code={`PYTHON_SERVICE_URL=http://127.0.0.1:8000
UI_AUTH_PASSWORD=change-this-to-a-strong-password`} />
          <p className="setup-note">
            Without this value, the login page will show the UI as misconfigured and you will
            not be able to sign in.
          </p>
        </section>

        <section className="panel setup-section" id="worker-env">
          <div className="panel-header">
            <div>
              <p className="eyebrow">5. Python Worker Env</p>
              <h2>Create the worker <code>.env</code> file</h2>
            </div>
          </div>
          <p>
            Create
            {" "}
            <code>python-worker/.env</code>
            {" "}
            with the values below:
          </p>
          <SetupCodeBlock code={`OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:1.5b
WP_SITES_FILE=/Users/jeff/Desktop/dev/auto/config/wp-sites.json
DRAFT_OUTPUT_DIR=/Users/jeff/Desktop/dev/auto/generated-drafts
PROMPT_SKILL_FILE=/Users/jeff/Desktop/dev/auto/config/prompt-skill.json`} />
          <p className="setup-note">
            <code>WP_SITES_FILE</code> and <code>PROMPT_SKILL_FILE</code> point both apps to the same shared local
            config files.
          </p>
        </section>

        <section className="panel setup-section" id="next-env">
          <div className="panel-header">
            <div>
              <p className="eyebrow">6. Next.js Env</p>
              <h2>Create the frontend <code>.env.local</code> file</h2>
            </div>
          </div>
          <p>
            Create
            {" "}
            <code>nextjs-app/.env.local</code>
            {" "}
            with:
          </p>
          <SetupCodeBlock code={`PYTHON_SERVICE_URL=http://127.0.0.1:8000
UI_AUTH_PASSWORD=change-this-to-a-strong-password`} />
          <p className="setup-note">
            <code>PYTHON_SERVICE_URL</code> must point at the running FastAPI worker.
          </p>
        </section>

        <section className="panel setup-section" id="sites">
          <div className="panel-header">
            <div>
              <p className="eyebrow">7. Saved Sites</p>
              <h2>Store WordPress credentials once in the UI</h2>
            </div>
          </div>
          <ol className="setup-list">
            <li>Start the app and sign in.</li>
            <li>Open <Link href="/sites">/sites</Link>.</li>
            <li>Add a site key such as <code>site-a</code>.</li>
            <li>Enter the WordPress base URL, username, application password, and category ID.</li>
            <li>Optionally add default tags.</li>
            <li>Save the site.</li>
          </ol>
          <p className="setup-note">
            The site registry is stored in <code>config/wp-sites.json</code>. Tasks only store the site key.
          </p>
        </section>

        <section className="panel setup-section" id="skills">
          <div className="panel-header">
            <div>
              <p className="eyebrow">8. Prompt Skill</p>
              <h2>Control the writing instructions from the UI</h2>
            </div>
          </div>
          <ol className="setup-list">
            <li>Open <Link href="/skills">/skills</Link>.</li>
            <li>Review the default SEO skill.</li>
            <li>Edit the instructions for tone, structure, SEO, or internal-link handling.</li>
            <li>Save the skill.</li>
          </ol>
          <p className="setup-note">
            This changes new generations immediately. The worker reads <code>config/prompt-skill.json</code>
            on each request.
          </p>
        </section>

        <section className="panel setup-section" id="run">
          <div className="panel-header">
            <div>
              <p className="eyebrow">9. Run Locally</p>
              <h2>Bootstrap dependencies and start the stack</h2>
            </div>
          </div>
          <p className="muted">Fast bootstrap from the repo root:</p>
          <SetupCodeBlock code={`cd /Users/jeff/Desktop/dev/auto
./setup.sh`} />
          <p className="setup-note">
            <code>./setup.sh</code> creates missing local config files, prepares the worker
            virtual environment, installs Python and Next.js dependencies, and tries to pull
            the required Ollama model when Ollama is available.
          </p>
          <p className="muted">Install worker dependencies:</p>
          <SetupCodeBlock code={`cd /Users/jeff/Desktop/dev/auto/python-worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt`} />
          <p className="muted">Install frontend dependencies:</p>
          <SetupCodeBlock code={`cd /Users/jeff/Desktop/dev/auto/nextjs-app
npm install`} />
          <p className="muted">Start everything in one command:</p>
          <SetupCodeBlock code={`cd /Users/jeff/Desktop/dev/auto
./run-dev.sh`} />
          <p className="setup-note">
            The launcher stops old dev processes on ports <code>8000</code>, <code>3000</code>, and <code>3001</code>, clears
            stale <code>.next</code> output, and starts both services.
          </p>
        </section>

        <section className="panel setup-section" id="generate">
          <div className="panel-header">
            <div>
              <p className="eyebrow">10. First Draft</p>
              <h2>Create and generate your first task</h2>
            </div>
          </div>
          <ol className="setup-list">
            <li>Open <Link href="/dashboard">/dashboard</Link>.</li>
            <li>Create a task using one of your saved sites.</li>
            <li>Add a title hint and target keyword.</li>
            <li>Optionally paste source content or internal URLs into the notes field.</li>
            <li>Open <Link href="/queue">/queue</Link>.</li>
            <li>Click <code>Generate Draft</code>.</li>
            <li>Review the result in the task detail page.</li>
          </ol>
          <p className="setup-note">
            Every generation writes a Markdown artifact into <code>generated-drafts/</code>, even when
            generation fails.
          </p>
        </section>

        <section className="panel setup-section" id="troubleshooting">
          <div className="panel-header">
            <div>
              <p className="eyebrow">11. Troubleshooting</p>
              <h2>Common failures and what they usually mean</h2>
            </div>
          </div>
          <ul className="setup-list">
            <li><code>Missing required environment variables</code>: the worker <code>.env</code> file is incomplete.</li>
            <li><code>WP_SITES_JSON is not valid JSON</code>: remove that env var or fix the JSON payload.</li>
            <li><code>Saved WordPress site not found</code>: the task site key does not match a saved site.</li>
            <li><code>Generated content must be at least 700 words</code>: the model produced a short draft and fallback still did not pass validation.</li>
            <li><code>Cannot find module './447.js'</code>: clear <code>.next</code> and restart the dev server. <code>./run-dev.sh</code> already does this.</li>
            <li>WordPress draft creation failed: verify site URL, username, application password, and category ID.</li>
            <li>UI says auth is misconfigured: add <code>UI_AUTH_PASSWORD</code> to <code>nextjs-app/.env.local</code> and restart.</li>
          </ul>
          <p className="muted">Useful checks:</p>
          <SetupCodeBlock code={`curl http://127.0.0.1:8000/health
curl http://localhost:11434/api/tags`} />
        </section>
      </div>
    </div>
  );
}
