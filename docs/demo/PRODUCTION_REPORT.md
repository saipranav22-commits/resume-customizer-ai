# Resume Customizer AI — Technical Video & Portfolio Production Report

**Date of Execution:** November 24, 2026  
**Produced by:** Senior Full-Stack Engineer, Browser Automation Specialist & Portfolio Documentation Lead  
**Target Audience:** Technical Recruiters, Hiring Managers, Lead Software Engineers, Portfolio Reviewers  
**Target Video State:** Produced Locally at `docs/demo/final/resume-customizer-demo.mp4` (Ready for Unlisted YouTube Upload)

---

## 1. Executive Summary

This production package showcases **Resume Customizer AI**, an already-developed and deployed full-stack web application designed to tailor candidate resumes to specific Job Descriptions with strict **ethical anti-fabrication guardrails**.

The demonstration video captures genuine browser walkthrough interactions with the deployed public application (`https://resume-customizer-ai-cyan.vercel.app`), driven by browser automation, synchronized with professional neutral Indian English AI narration (`en-IN-PrabhatNeural`), and edited with FFmpeg into an executive-grade 1080p MP4 demonstration video.

---

## 2. Actual Project Technology Stack

| Layer | Technologies & Libraries | Version / Details | Purpose |
|---|---|---|---|
| **Frontend Framework** | Next.js 16 (App Router), React 19, TypeScript | `next@16.0.0+`, `react@19.0.0` | High-performance, responsive UI and client-side state |
| **Styling & UI Components** | Tailwind CSS v4, Lucide React Icons | Modern Editorial Aubergine (`#291B32`) & Copper (`#C45D39`) | Polished career studio executive theme |
| **Backend Framework** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 | `fastapi>=0.115`, `pydantic>=2.9` | Asynchronous REST API microservices |
| **Document Ingestion** | `pypdf`, `python-docx` | Dual-format stream extraction | PDF & DOCX body paragraph and embedded table parsing |
| **Document Exporters** | `reportlab.platypus`, `python-docx` | ReportLab 4.2+, standard styles | Server-side ATS-compliant PDF & editable Word exports |
| **Database & Auth** | Supabase Managed Cloud PostgreSQL | PostgreSQL 15+, Row Level Security | Immutable version lineage & JWT ES256/RS256 authentication |
| **LLM Engine** | Google Gemini API (`gemini-3.5-flash`) | Structured JSON Pydantic response | Factual alignment & professional summary/bullet rephrasing |
| **Resilience / Fallback** | Deterministic Regex & NLP Tokenizer Engine | Built-in Python heuristic parser | 100% offline operational guarantee during API throttling |
| **Automated Testing** | Pytest, TestClient, httpx | 26 automated unit & integration tests | Rigorous parsing, export, anti-fabrication, and API test suite |
| **Cloud Infrastructure** | Vercel (Frontend), Render (Backend Microservice) | Docker-ready cloud deployments | Edge CDN + containerized Python web service |

---

## 3. Verified Live Deployment Infrastructure

- **Public Frontend Application URL**:  
  [`https://resume-customizer-ai-cyan.vercel.app`](https://resume-customizer-ai-cyan.vercel.app) (Verified Status 200 OK)
- **Production Backend API Endpoint**:  
  [`https://resume-customizer-ai.onrender.com`](https://resume-customizer-ai.onrender.com) (Health Check: `/api/health` Status 200 OK)
- **Managed Database & Auth**:  
  [`https://blnizmyxkyfngrbrulmr.supabase.co`](https://blnizmyxkyfngrbrulmr.supabase.co) (Cloud PostgreSQL Instance)
- **GitHub Repository & Branch**:  
  [`https://github.com/saipranav22-commits/resume-customizer-ai.git`](https://github.com/saipranav22-commits/resume-customizer-ai.git) (Branch: `main`)

---

## 4. Real Verified Features Demonstrated in the Video

Every feature showcased in the video is genuinely implemented in the codebase and verified live against the production deployment:

1. **Dual-Format Parsing**: Uploaded Adobe PDF document parsed with stream decoding; Word `.docx` supported with embedded table extraction.
2. **Synthetic Candidate Profile**: Alex Morgan, Staff Full Stack & Cloud Systems Engineer (100% synthetic, zero exposure of personal PII).
3. **Job Description Character Tracking**: Enforces a 50-character minimum for meaningful NLP extraction with real-time feedback.
4. **Granular Section Controls**: Independent toggles for Summary tailoring, Skills alignment, and Experience bullet rephrasing.
5. **Asynchronous 6-Stage Progress Pipeline**: Visualizes document parsing, competency extraction, ATS alignment, LLM generation, anti-fabrication audit, and studio assembly (completes in ~8–9 seconds).
6. **Interactive Resume Studio**: High-fidelity executive typography layout with inline content editing for summary, bullets, and skills.
7. **Live Re-check Score Calculation**: Recalculates both match score and ATS compatibility asynchronously upon manual edits.
8. **Multi-Factor ATS & Alignment Audit**: Weighted breakdown (35% required skills, 15% preferred, 15% experience, 15% responsibilities, 10% domain keywords, 10% structure) and heuristic quality assessment.
9. **Strict Anti-Fabrication Safeguard**: Missing tools (e.g., Kafka, Prometheus) are strictly quarantined into an advisory **Skill-Gap Analysis** panel, never falsely hallucinated into candidate credentials.
10. **Side-by-Side Change Diff View**: Comparative inspection highlighting exact verb enhancements and bullet restructuring.
11. **Tailored Cover Letter Generator**: 3-paragraph executive cover letter aligned with genuine matching qualifications, with 1-click clipboard copy.
12. **Multi-Format Document Exports**: Server-side ReportLab Platypus PDF, editable Word DOCX, and clean plain text (ASCII) files.

---

## 5. High-Resolution Screenshot Catalog (`docs/screenshots/`)

All screenshots were captured directly from the live public application at 1920×1080 (Desktop) and 390×844 (Mobile) without mockups or synthetic edits:

| Filename | Resolution | Description | Purpose in README / Portfolio |
|---|---|---|---|
| `01_landing_hero.png` | 1920×1080 | Editorial Aubergine hero section, value proposition, badges | Primary Hero Image / Banner |
| `02_resume_upload.png` | 1920×1080 | Drag-and-drop resume upload zone with 5MB validation | Document Ingestion Showcase |
| `03_job_description_input.png` | 1920×1080 | Target Job Description textarea with live character counter | Input Validation & Controls |
| `04_processing_state.png` | 1920×1080 | Real-time 6-stage async pipeline progress indicator | Async Architecture Demo |
| `05_interactive_studio_editor.png` | 1920×1080 | Interactive Studio with inline editing and typography hierarchy | Core Product Feature |
| `06_ats_quality_audit.png` | 1920×1080 | Transparent ATS audit dashboard with weighted factor breakdown | ATS Compatibility Engine |
| `07_gap_analysis_recommendations.png`| 1920×1080 | Advisory skill gap panel quarantining missing keywords | Anti-Fabrication Proof |
| `08_diff_view_comparison.png` | 1920×1080 | Side-by-side comparative inspection between original and tailored | Truth & Verification Audit |
| `09_tailored_cover_letter.png` | 1920×1080 | Executive cover letter with letterhead preview and 1-click copy | Value-Add Capability |
| `10_multi_format_exports.png` | 1920×1080 | Studio action bar with PDF, Word (DOCX), and TXT download menu | Multi-Format Pipeline |
| `11_save_version_history.png` | 1920×1080 | Version lineage bar showing draft state and revision save triggers | Immutable Data Architecture |
| `12_mobile_responsive_interface.png` | 390×844 (2x) | Mobile responsive view on modern smartphone viewport | Cross-Device Engineering |

---

## 6. Master Demonstration Video Specifications

- **File Path**: `docs/demo/final/resume-customizer-demo.mp4`
- **Container Format**: MP4
- **Video Codec**: H.264 (AVC) High Profile
- **Audio Codec**: AAC (Stereo, 48,000 Hz, 192 kbps)
- **Resolution**: 1920 × 1080 (1080p Full HD)
- **Frame Rate**: 30.00 FPS
- **Duration**: **351.97 seconds** (**5 minutes and 51 seconds**) — *Strictly complies with the 4–6 minute specification*
- **File Size**: **34.41 MB** (Optimized for fast web streaming and YouTube upload)
- **Audio Voiceover**: `en-IN-PrabhatNeural` (Edge-TTS, Neutral Indian English, Confident & Technical)
- **Visual Overlays**:
  - Polished title slide with dark Aubergine/Copper theme
  - Full-screen high-level architecture diagram
  - Real-time chapter banner badges on every scene
  - Animated mouse pointer showing smooth cursor glides and click feedback
  - Closing project links slide with Vercel, Render, and GitHub repository links

---

## 7. Deliverables Checklist

- [x] **Walkthrough Video**: `docs/demo/final/resume-customizer-demo.mp4` (5m 51s, 1080p, 30fps)
- [x] **Video Thumbnail**: `docs/demo/final/resume-customizer-thumbnail.png` (1280×720, 295 KB)
- [x] **Subtitles File**: `docs/demo/final/resume-customizer-subtitles.srt` (47 cues, fully synchronized)
- [x] **YouTube Metadata**: `docs/demo/final/YOUTUBE_METADATA.md` (Title, description, chapters, links, tags)
- [x] **Narration Script**: `docs/demo/scripts/narration.txt` (Complete 10-scene technical script)
- [x] **Screenshot Suite**: `docs/screenshots/` (12 verified high-resolution PNG images)
- [x] **Production Report**: `docs/demo/PRODUCTION_REPORT.md` (This document)
- [x] **Git & File Safety**: `.gitignore` updated to prevent accidental commits of large video/audio artifacts

---

## 8. Exact Step-by-Step Instructions for Uploading to YouTube as Unlisted

Follow these steps to upload the video and obtain the live YouTube URL:

1. **Access YouTube Studio**:
   - Go to [YouTube Studio](https://studio.youtube.com/) and sign in.
2. **Upload Video**:
   - Click the **Create** button (camera icon with plus) in the top right, then select **Upload videos**.
   - Drag and drop or browse to select:  
     `c:\Users\Hp\Desktop\resume-custom\docs\demo\final\resume-customizer-demo.mp4`
3. **Apply Metadata from `YOUTUBE_METADATA.md`**:
   - **Title**: Copy the title from `docs/demo/final/YOUTUBE_METADATA.md`.
   - **Description**: Copy the complete markdown description (including chapters and live links) into the description box.
   - **Thumbnail**: Click **Upload thumbnail** and choose:  
     `c:\Users\Hp\Desktop\resume-custom\docs\demo\final\resume-customizer-thumbnail.png`.
   - **Audience**: Select *"No, it's not made for kids"*.
4. **Upload Subtitles**:
   - In the **Video elements** tab, click **Add** next to *Subtitles*.
   - Choose **Upload file** > **With timing**, and select:  
     `c:\Users\Hp\Desktop\resume-custom\docs\demo\final\resume-customizer-subtitles.srt`.
5. **Set Visibility to UNLISTED**:
   - In the **Visibility** tab, select **Unlisted**.
   - *(Unlisted videos can be viewed and shared by anyone with the link, but do not appear in public search results or channel feeds.)*
6. **Save and Copy Link**:
   - Click **Save**.
   - Copy the generated YouTube video URL (e.g., `https://youtu.be/...`).
7. **Final GitHub README Update**:
   - Return to this session and provide the URL, or insert the verified link directly into the `README.md` hero section!
