# Resume Customizer AI — Production Operations & Handover Runbook

> Operational runbook, deployment topologies, environment variable specifications, observability guidelines, rollback procedures, troubleshooting protocols, and engineering roadmap for system maintainers.

---

## 1. Production Topology & Endpoints

| Component | Service Provider | Production URL | Description |
|---|---|---|---|
| **Frontend UI** | Vercel (Global Edge Network) | [resume-customizer-ai-cyan.vercel.app](https://resume-customizer-ai-cyan.vercel.app) | Next.js 16.4.3 App Router & React 19 UI |
| **Backend REST API** | Render (Oregon Region - Free Tier) | [resume-customizer-ai.onrender.com](https://resume-customizer-ai.onrender.com) | Python FastAPI 0.115+ Asynchronous API |
| **Health Check** | Render Web Service | [resume-customizer-ai.onrender.com/api/health](https://resume-customizer-ai.onrender.com/api/health) | Automated service health monitoring endpoint |
| **API Documentation** | FastAPI OpenAPI / Swagger | [resume-customizer-ai.onrender.com/docs](https://resume-customizer-ai.onrender.com/docs) | Interactive Swagger UI API explorer |
| **Database & Auth** | Supabase Cloud (AWS Infrastructure) | Managed Cloud Instance | PostgreSQL 15 + GoTrue Auth + RLS |

---

## 2. Environment Variables Reference

> 🔒 **Security Warning**: Never commit actual environment variable values to source control. The table below lists strictly required variable names, descriptions, and scope.

### 2.1 Backend Environment Variables (`backend/.env`)

| Variable Name | Required | Scope | Purpose & Format Description |
|---|---|---|---|
| `ENVIRONMENT` | Yes | Server | Runtime environment (`production`, `staging`, `development`). Enforces strict CORS when `production`. |
| `GEMINI_API_KEY` | Yes | Server | Google Gemini API Key from Google AI Studio. Used for LLM prompt orchestration. |
| `LLM_MODEL` | No | Server | Target Gemini model identifier (default: `gemini-2.5-flash` or `gemini-3.5-flash-lite`). |
| `LLM_PROVIDER` | No | Server | Model provider string (default: `gemini`). |
| `MAX_FILE_SIZE_MB` | No | Server | Maximum allowed uploaded resume size in megabytes (default: `5`). |
| `MIN_JD_LENGTH` | No | Server | Minimum character length required for Job Description input (default: `50`). |
| `PORT` | No | Server | Web server listen port (default: `8000`, set dynamically by Render `$PORT`). |
| `FRONTEND_URL` | Yes | Server | Trusted frontend origin for CORS (e.g., `https://resume-customizer-ai-cyan.vercel.app`). |
| `ALLOWED_ORIGINS` | No | Server | Optional comma-separated list of additional trusted origins. |
| `SUPABASE_URL` | Yes | Server | Base URL of the Supabase project (`https://<project-ref>.supabase.co`). |
| `SUPABASE_KEY` | Yes | Server | Supabase anonymous / publishable key for public client queries. |
| `SUPABASE_SECRET_KEY` | No | Server | Supabase service-role secret key (used strictly for backend administrative routines). |
| `SUPABASE_JWKS_URL` | No | Server | Well-known JWKS endpoint for asymmetric JWT verification (defaults to `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`). |
| `SUPABASE_JWT_ALGORITHM`| No | Server | Cryptographic JWT signing algorithm (default: `ES256`). |
| `SUPABASE_JWT_AUDIENCE` | No | Server | Expected JWT audience claim (default: `authenticated`). |
| `SUPABASE_JWT_SECRET` | No | Server | Optional HMAC-SHA256 secret for legacy symmetric JWT validation fallback. |

### 2.2 Frontend Environment Variables (`frontend/.env.local`)

| Variable Name | Required | Scope | Purpose & Format Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Client & Edge | Target backend REST API URL (`https://resume-customizer-ai.onrender.com` in production). |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client & Edge | Target Supabase project endpoint for client authentication. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Client & Edge | Modern Supabase publishable API key format (`sb_publishable_...`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Client & Edge | Legacy Supabase anon key fallback. |

---

## 3. Continuous Deployment Workflow

### 3.1 Vercel Frontend Deployment
- **Integration**: Connected to the GitHub repository branch `main`.
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Deployment Trigger**: Automatic on git push to `main` branch (once remote publishing is enabled).
- **Environment Configuration**: Configure `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Vercel Project Dashboard under **Settings -> Environment Variables**.

### 3.2 Render Backend Deployment
- **Configuration**: Defined declaratively in `render.yaml`.
- **Runtime**: Python 3.11.9 on Linux container.
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/api/health`
- **Environment Configuration**: Set secrets (`GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`) in the Render Dashboard under **Environment**.

---

## 4. Monitoring, Health Checks & Observability

### 4.1 Automated Health Check Endpoint
The backend exposes `GET /api/health`.
- **Production Response**:
  ```json
  {
    "status": "healthy",
    "version": "1.0.0"
  }
  ```
- **Uptime Monitoring**: A free uptime monitor (such as UptimeRobot or BetterStack) should ping `https://resume-customizer-ai.onrender.com/api/health` every 10 minutes. This also prevents Render free-tier instances from entering sleep mode.

### 4.2 Application Logging
- **FastAPI / Uvicorn**: Emits structured access logs to stdout, including client IP, HTTP method, path, response status, and request duration.
- **Render Log Viewer**: Accessible via Render Dashboard -> Services -> `resume-customizer-api` -> **Logs**.
- **Vercel Log Stream**: Accessible via Vercel Dashboard -> Deployments -> **Real-time Logs**.

---

## 5. Safe Rollback Procedures

### 5.1 Frontend Rollback (Vercel)
Vercel keeps immutable build snapshots for every deployment:
1. Open the **Vercel Dashboard** and navigate to `resume-customizer-ai`.
2. Go to the **Deployments** tab.
3. Locate the previous stable deployment hash (e.g., commit `abb1584`).
4. Click the three dots menu (`...`) and select **"Instant Rollback"**.
5. The edge network immediately routes traffic to the selected previous deployment in under 5 seconds.

### 5.2 Backend Rollback (Render)
If a backend deployment introduces an unexpected regression:
1. In the **Render Dashboard**, select `resume-customizer-api`.
2. Navigate to **Events** / **Deploys**.
3. Select the last known good deploy.
4. Click **"Rollback to this deploy"**.
5. Alternatively, via Git:
   ```bash
   git revert <commit-sha>
   git push origin main
   ```

---

## 6. Common Operational Troubleshooting Scenarios

### Scenario 1: Initial Request Takes 30–50 Seconds (Render Cold Start)
- **Root Cause**: On Render's free tier, backend containers spin down after 15 minutes of inactivity.
- **Symptom**: The first visit to the web app exhibits a delay while fetching the initial `/api/health` ping.
- **Remedy**:
  - The frontend displays a smooth loading indicator while awaiting backend wakeup.
  - Recommended fix: Configure an external cron ping (e.g., UptimeRobot) every 10 minutes to maintain an active container, or upgrade to Render Starter tier ($7/mo).

### Scenario 2: Gemini API Rate Limit / Quota Exceeded (HTTP 429)
- **Root Cause**: Excessive simultaneous requests on the free Google Gemini tier (15 RPM).
- **Symptom**: The backend encounters a 429 error from the Google Generative Language API.
- **Built-in Self-Healing**: The backend automatically engages the **Deterministic Heuristic Fallback Engine**. The user still receives a tailored resume, complete section extraction, and calibrated scoring with zero failure.
- **Remedy**: Check API quotas in Google AI Studio; upgrade to a pay-as-you-go tier if concurrency grows.

### Scenario 3: Supabase JWT Verification Errors / Token Expired
- **Root Cause**: Client machine clock drift or expired local session token.
- **Symptom**: User receives an HTTP 401 Unauthorized when attempting to save a version to history.
- **Remedy**:
  - The frontend automatically prompts the user to re-authenticate via the Auth Modal.
  - The backend logs will reflect `JWT signature verification failed` or `Token expired`.

### Scenario 4: Large Document Parsing Rejection
- **Root Cause**: Candidate uploads a scanned resume PDF composed of high-resolution images exceeding 5MB.
- **Symptom**: Dropzone displays an error: `"File size exceeds 5MB limit"`.
- **Remedy**: Advise the candidate to export a clean vector PDF directly from Microsoft Word or Google Docs rather than using image scans.

---

## 7. Security Maintenance & Credential Rotation

1. **Gemini API Key Rotation**:
   - Generate a new key in [Google AI Studio](https://aistudio.google.com/).
   - Update `GEMINI_API_KEY` in Render Environment Variables.
   - Trigger a zero-downtime redeploy.
   - Revoke the old key.
2. **Supabase Keys**:
   - Supabase project keys can be cycled in the Supabase Dashboard under **Project Settings -> API**.
   - If keys are rotated, immediately update `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel and `SUPABASE_KEY` in Render.
3. **Dependency Audits**:
   - Run quarterly audits:
     ```bash
     cd frontend && npm audit
     cd ../backend && pip-audit
     ```

---

## 8. Current Known Limitations

- **Complex Layouts**: Highly graphical, infographic-style resumes with floating text boxes or multiple nested columns may experience minor text order interleaving during parsing. Single or clean double-column resumes parse with 100% accuracy.
- **Single-Page Constraint**: The current ReportLab PDF exporter uses an executive single/two-page proportional flow. Extremely lengthy resumes (>4 pages) may experience spacing condensation.

---

## 9. Future Engineering Roadmap

The following enhancements are planned for future major releases (clearly distinguished from completed Phase 7 deliverables):

### Phase 8 — Multi-Template Visual Themes
- Implement selectable styling templates in the ReportLab and HTML preview engines:
  - *Modern Tech* (Aubergine & Copper accents, badge skills)
  - *Academic / Research* (Traditional Serif, expanded publications)
  - *Minimalist Executive* (Monochrome, high whitespace economy)

### Phase 9 — Direct LinkedIn Profile Ingestion
- Allow candidates to import their work history directly using LinkedIn OAuth data export, bypassing manual PDF uploads.

### Phase 10 — Real-Time AI Mock Interview Generator
- Leverage the tailored resume and target JD to automatically generate 5 customized technical and behavioral interview questions with suggested STAR-method talking points.
