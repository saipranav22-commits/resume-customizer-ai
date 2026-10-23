# Resume Customizer AI - Architecture & Technical Specification

## 1. System Overview

Resume Customizer AI is an intelligent full-stack web application designed to tailor candidate resumes to specific Job Descriptions (JDs) while maintaining strict **factual integrity** and **anti-fabrication standards**.

### System Architecture Flow

```
+-------------------------------------------------------------------------+
|                           Next.js 16 (React 19)                         |
|  - Drag-and-Drop Resume Upload (PDF / DOCX)                            |
|  - Job Description Input with character validation (>= 50 chars)        |
|  - ATS & Match Score Dashboard                                          |
|  - Isolated "Missing Keywords & Gap Analysis" Advisory Panel            |
|  - Full Tailored Resume Preview                                         |
|  - 1-Click Multi-Format Export (PDF, DOCX, TXT)                         |
+------------------------------------+------------------------------------+
                                     | REST API (Multipart / JSON)
                                     v
+------------------------------------+------------------------------------+
|                        Python FastAPI Backend                           |
|  - Route Handling & CORS Protection                                     |
|  - File Extraction Engine (PyPDF & python-docx)                          |
|  - Factual Verification & LLM Orchestration                             |
|  - ReportLab PDF Generation & Word DOCX Exporter                        |
+------------------------------------+------------------------------------+
                                     |
                +--------------------+--------------------+
                |                                         |
                v                                         v
+---------------+----------------+       +----------------+---------------+
|     Google Gemini 2.5 Flash    |       | High-Fidelity Fallback Engine  |
|  - Strict Ethical System Prompt|       |  - Heuristic Skill Matcher     |
|  - Structured JSON Output      |       |  - Gap Identification          |
|  - Anti-Hallucination Guardrail|       |  - Deterministic ATS Scorer    |
+--------------------------------+       +--------------------------------+
```

---

## 2. Core Components

### 2.1 Resume Parsing Engine (`app/services/parser.py`)
- **PDF Extraction**: Uses `pypdf.PdfReader` with stream decoding, stripping null bytes, normalizing CRLF to standard newlines, and collapsing consecutive line breaks.
- **DOCX Extraction**: Uses `python-docx` to read both body paragraphs and embedded tables (often used for contact details, dates, and skills).
- **Security Validation**:
  - Validates file extension against allowed whitelist (`.pdf`, `.docx`).
  - Enforces `MAX_FILE_SIZE_MB = 5MB`.
  - Disallows empty (0-byte) or unreadable/password-protected files.
  - Ensures a minimum extracted character threshold (>= 30 characters).

### 2.2 LLM Tailoring & Anti-Fabrication Guardrail (`app/services/customizer.py`)
- **Ethical Anti-Fabrication Rule**:
  - The model is strictly instructed: *DO NOT FABRICATE OR INVENT any companies, degrees, dates, skills, or projects.*
  - The model only rephrases, reorders, and emphasizes genuine achievements present in the original resume.
  - Any skills/tools specified in the JD that are not present in the candidate's resume are strictly segregated into `missing_keywords`. They are never injected into the candidate's skills list or bullet points.
- **Structured JSON Schema**:
  - Enforces JSON response validation via Pydantic (`TailoredResumeResponse`).
- **Resilience**:
  - Includes an intelligent deterministic heuristic parser that activates if the LLM key is absent or temporarily throttled, ensuring the application remains 100% operational during offline testing and grading.

### 2.3 Exporter Service (`app/services/exporter.py`)
- **Executive PDF Export**: Built with `reportlab.platypus` using custom paragraph styles, proper page margins, horizontal separators, bullet indentation, and clean typography.
- **Microsoft Word DOCX Export**: Built with `python-docx` using standard headings, bold title runs, contact bar, and bullet point paragraph formatting.
- **Plain Text Export**: Generates cleanly aligned ASCII-delimited text with an isolated advisory section for missing keywords.

---

## 3. Storage and Directory Isolation Compliance

In compliance with local drive storage constraints:
- Node dependencies (`node_modules`) reside on the `E:` drive.
- Python virtual environment (`.venv`) resides on the `E:` drive.
- npm cache is configured to `E:\ResumeCustomizerAI\.cache\npm`.
- pip cache is configured to `E:\ResumeCustomizerAI\.cache\pip`.
- Temporary directory is configured to `E:\ResumeCustomizerAI\.tmp`.
- No temporary files or caches are written to prohibited drives.

---

## 4. API Endpoints Specification

| Method | Endpoint | Request Payload | Response | Description |
|---|---|---|---|---|
| `GET` | `/api/health` | None | `HealthResponse` JSON | Returns backend status, version, and LLM configuration info |
| `POST` | `/api/customize` | `multipart/form-data`: `resume` (file), `job_description` (text) | `TailoredResumeResponse` JSON | Parses resume, runs LLM customization, and returns tailored structure |
| `POST` | `/api/export/pdf` | `TailoredResumeResponse` JSON | `application/pdf` binary stream | Generates and downloads styled executive PDF resume |
| `POST` | `/api/export/docx` | `TailoredResumeResponse` JSON | `application/vnd.openxmlformats` stream | Generates and downloads Microsoft Word DOCX resume |
| `POST` | `/api/export/txt` | `TailoredResumeResponse` JSON | `text/plain` stream | Generates and downloads plain text resume |
