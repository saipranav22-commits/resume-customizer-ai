# Resume Customizer AI

> An intelligent, full-stack web application that tailors candidate resumes to target Job Descriptions (JDs) using LLM prompt engineering, ATS scoring, and multi-format exports — with strict **ethical anti-fabrication guardrails**.

---

## 🌟 Key Features

1. **Dual Format Resume Parsing (PDF & DOCX)**:
   - Robust extraction from Adobe PDF files via `pypdf`.
   - Comprehensive extraction from Microsoft Word documents (`.docx`), including embedded tables.
   - Comprehensive input validation (file size limit: 5MB, format whitelist, empty file guard).

2. **Job Description Input & Real-Time Validation**:
   - Character count tracker enforcing a 50-character minimum for meaningful analysis.
   - One-click **"Load Sample JD"** button for immediate testing and evaluation.

3. **Ethical LLM Customization (Gemini AI)**:
   - **Anti-Fabrication Guardrail**: Never invents degrees, companies, jobs, or tools.
   - **Tailored Summary**: Rewrites the professional summary to highlight the candidate's genuine experience aligned with the target role.
   - **Keyword Alignment**: Reorders and rephrases experience bullets using strong action verbs.
   - **Isolated Missing Keywords Panel**: Missing skills from the JD are strictly separated from actual candidate qualifications into a dedicated **Gap Analysis** panel with actionable recommendations.

4. **Executive ATS-Friendly Resume Preview & Multi-Format Exports**:
   - Live interactive resume preview with typography hierarchy and clean badge formatting.
   - **PDF Export**: Built with ReportLab using clean margins, bullet styling, and divider lines.
   - **DOCX Export**: Generates editable Microsoft Word documents with standard styles.
   - **Plain Text Export & Copy to Clipboard**: Clean ASCII-formatted output.

5. **ATS Compatibility & Match Score Dashboard**:
   - Computes a percentage match score between genuine resume qualifications and JD requirements.
   - Evaluates ATS friendliness and outlines strengths and areas for improvement.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | High-performance, responsive UI |
| **Styling** | Tailwind CSS v4, Lucide Icons | Polished executive modern theme |
| **Backend** | Python 3.11+, FastAPI, Uvicorn | Async REST API microservices |
| **Parsing** | `pypdf`, `python-docx` | PDF and Word document extraction |
| **Generation** | `reportlab`, `python-docx` | Server-side PDF and DOCX export |
| **LLM Engine** | Google Gemini (Gemini 2.5 Flash / 1.5 Flash) | Context-aware resume tailoring |
| **Testing** | `pytest`, `httpx`, `TestClient` | 23 automated integration and unit tests |
| **Deployment** | Render (Backend), Vercel (Frontend), Docker | Cloud deployment readiness |

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+) & pip
- Google Gemini API Key (free from [Google AI Studio](https://aistudio.google.com/))

### 1. Clone & Environment Configuration

```bash
# Clone the repository
git clone <repository_url>
cd ResumeCustomizerAI

# Configure Backend Environment
cp backend/.env.example backend/.env
# Add your GEMINI_API_KEY to backend/.env
```

### 2. Backend Setup (FastAPI)

```bash
cd backend

# Create and activate Python virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run automated tests
pytest tests -v

# Start FastAPI server (runs on http://127.0.0.1:8000)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup (Next.js)

```bash
cd ../frontend

# Install dependencies
npm install

# Run linter and production build check
npm run lint
npm run build

# Start Next.js development server (runs on http://localhost:3000)
npm run dev
```

Visit **http://localhost:3000** in your browser to interact with the application.

---

## 🧪 Testing Suite

The backend includes 23 automated tests covering parsers, validators, exporters, anti-fabrication constraints, and API routes:

```bash
cd backend
pytest tests -v
```

### Test Coverage Highlights:
- `test_parser.py`: PDF parsing, DOCX parsing, table extraction, empty file validation, oversized file handling (413), whitespace normalization.
- `test_exporter.py`: Validates ReportLab PDF magic bytes (`%PDF`), Word DOCX ZIP headers (`PK`), and Plain Text generation.
- `test_customizer.py`: Validates JSON schema parsing, markdown fence removal, and asserts that **missing keywords are never injected into genuine candidate qualifications**.
- `test_api.py`: FastAPI endpoint tests for health check, validation errors (missing/short JD), PDF customization, and file exports.
- `test_real_fixtures.py`: End-to-end parsing and customization using real resume documents.

---

## 🚢 Deployment Guide

### Deploying the Backend to Render
1. Push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), choose **New > Blueprint** and select `render.yaml`, OR create a **Web Service**:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `GEMINI_API_KEY`: `<Your Gemini Key>`
     - `LLM_MODEL`: `gemini-2.5-flash`

### Deploying the Frontend to Vercel
1. In [Vercel Dashboard](https://vercel.com/), import the repository.
2. Set **Root Directory** to `frontend`.
3. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://your-render-backend-url.onrender.com`
4. Click **Deploy**.

---

## 🛡️ Anti-Fabrication Ethical Standards

A common risk with LLM resume customizers is "credential hallucination" — generating claims that the candidate possesses skills or certifications they never earned.

Resume Customizer AI enforces strict guardrails:
1. **Verification-Only Alignment**: The system prompt strictly limits skills and bullet points to facts present in the uploaded document.
2. **Transparent Gap Isolation**: Any skill in the Job Description not found in the resume is segregated into an advisory **"Missing Keywords"** panel. It is **never** added to the candidate's skills list or experience bullets.
3. **Actionable Guidance**: Candidates receive recommendations on how to address skill gaps truthfully (e.g., in a cover letter, through coursework, or portfolio projects).

---

## 📄 License
MIT License. Created for the Full Stack Developer Technical Assessment.
