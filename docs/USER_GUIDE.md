# Resume Customizer AI — End-to-End User Guide & Manual

> Master every feature of the Resume Customizer AI career studio: from file ingestion and calibrated ATS auditing to in-place document editing, iterative AI improvement, version lineage tracking, and multi-format executive exports.

---

## 📑 Table of Contents
1. [Introduction & Interface Overview](#1-introduction--interface-overview)
2. [Step 1: Uploading Your Resume](#2-step-1-uploading-your-resume)
3. [Step 2: Providing the Target Job Description](#3-step-2-providing-the-target-job-description)
4. [Step 3: Customizing Sections & Guardrails](#4-step-3-customizing-sections--guardrails)
5. [Step 4: Interpreting Your Dual Scores](#5-step-4-interpreting-your-dual-scores)
   - [Score A: Job Description Match](#score-a-job-description-match)
   - [Score B: ATS Document Quality Audit](#score-b-ats-document-quality-audit)
   - [Understanding the Missing Keywords Panel](#understanding-the-missing-keywords-panel)
6. [Step 5: Refining in the Interactive Studio Editor](#6-step-5-refining-in-the-interactive-studio-editor)
   - [Continuous Canvas vs Document Preview](#continuous-canvas-vs-document-preview)
   - [Inline Text Editing](#inline-text-editing)
   - [Contextual Single-Bullet AI Improve](#contextual-single-bullet-ai-improve)
   - [Iterative "Improve Again"](#iterative-improve-again)
   - [Batch "Improve All"](#batch-improve-all)
   - [Dynamic "Re-check Score"](#dynamic-re-check-score)
7. [Step 6: Managing Version History & Lineage](#7-step-6-managing-version-history--lineage)
   - [Saving Versions (Root vs Child Revisions)](#saving-versions-root-vs-child-revisions)
   - [Viewing and Restoring from History Drawer](#viewing-and-restoring-from-history-drawer)
   - [Side-by-Side Version Comparison](#side-by-side-version-comparison)
8. [Step 7: Multi-Format Document Export](#8-step-7-multi-format-document-export)
9. [Step 8: Tailored Cover Letter Studio](#9-step-8-tailored-cover-letter-studio)
10. [Frequently Asked Questions (FAQ)](#10-frequently-asked-questions-faq)

---

## 1. Introduction & Interface Overview

Resume Customizer AI is an executive career platform designed to bridge the gap between your real, authentic achievements and the specific requirements of target employers. 

### The Workspace Layout
The application is structured into four main operational areas:
- **Brand Header & Global Controls**: Displays the Aubergine & Copper *Precision Resume Mark*, Supabase authentication status, and the Version History toggle button.
- **Workflow Stepper & Upload Area**: Guides you through file selection, job description input, and section customization toggles.
- **Studio Command Bar**: Houses workspace tabs (*Tailored Resume*, *ATS Optimization*, *Cover Letter*, *Change Diff*), draft status indicators, and one-click action buttons (*Re-check Score*, *Save Version*, *Export*).
- **Interactive Document Paper Canvas (`resume-paper-elevated`)**: A simulated high-grade white resume sheet with crisp typography, subtle elevation shadows, and inline micro-editors.

---

## 2. Step 1: Uploading Your Resume

Resume Customizer AI supports direct text extraction from standard professional document formats.

### Supported File Types & Constraints
- **Adobe PDF (`.pdf`)**: Native text-based PDF documents created by Word, Google Docs, or LaTeX.
- **Microsoft Word (`.docx`)**: Modern Office Open XML documents (including bullet lists and embedded tables).
- **Maximum File Size**: 5 Megabytes (MB).

### How to Upload
1. Navigate to the **Step 1: Upload Resume** dropzone on the homepage.
2. Drag and drop your file into the dashed Aubergine border area, or click **Browse Files** to open your operating system file picker.
3. Once selected, the dropzone confirms your filename, format badge, and file size.

> 💡 **Quick Testing Tip**: To explore the studio instantly without uploading your personal resume, click the **"Load Sample Resume"** button. This loads a pre-configured synthetic profile for **Alex Morgan** (Senior Full-Stack Engineer).

---

## 3. Step 2: Providing the Target Job Description

The target Job Description (JD) provides the benchmark against which your resume is tailored and audited.

### Instructions
1. In the **Step 2: Target Job Description** text area, paste the complete job posting text.
2. Ensure you include the **Responsibilities**, **Required Qualifications**, and **Preferred Tools**.
3. **Minimum Length Requirement**: The system enforces a **50-character minimum** to ensure the AI has sufficient context for semantic analysis. A character counter in the bottom right corner indicates your current length.

> 💡 **Sample JD**: Click **"Load Sample JD"** to automatically populate a realistic Senior Cloud & AI Solutions Architect job specification.

---

## 4. Step 3: Customizing Sections & Guardrails

Resume Customizer AI puts you in complete control over which sections of your resume are modified by generative AI:

| Toggle Switch | Default | What It Does When Enabled |
|---|---|---|
| **Tailor Summary** | `Active` | Rewrites your professional summary to highlight genuine background points most relevant to the target role. |
| **Align Skills** | `Active` | Reorders your technical and soft skills so that matching requirements appear prominently at the top of your skills block. |
| **Rephrase Experience** | `Active` | Rewrites experience bullet points to lead with impactful action verbs and emphasize matching technical deliverables. |

### Ethical Anti-Fabrication Guarantee
Regardless of which toggles are activated, the platform strictly enforces **Zero Fabrication**:
- The AI will **never** invent past employers, fake job titles, or hallucinate unearned degrees.
- Unmatched qualifications requested by the JD are routed to the **Gap Analysis Panel** rather than falsely added to your resume.

Click **"Tailor My Resume"** to begin processing.

---

## 5. Step 4: Interpreting Your Dual Scores

Unlike simple keyword counters, Resume Customizer AI calculates two mathematically calibrated, independent scores.

### Score A: Job Description Match
This score measures **semantic alignment and qualification coverage** between your resume and the target role:
- **Required Skills Coverage (35% Weight)**: Core competencies directly demanded by the role.
- **Experience Alignment (20% Weight)**: Match between your career seniority and the target level.
- **Responsibility Match (15% Weight)**: How closely your past day-to-day duties mirror the new role.
- **Preferred Skills Coverage (15% Weight)**: Coverage of "nice-to-have" frameworks or tools.
- **Domain Keywords (10% Weight)**: Presence of industry standard terminology.
- **Formatting & Structure (5% Weight)**: Proper section flow.

### Score B: ATS Document Quality Audit
This score assesses **technical machine parseability and formatting hygiene**:
- **Parseability (25% Weight)**: Freedom from non-standard unicode characters, broken ligatures, and scanning artifacts.
- **Section Structure (20% Weight)**: Adherence to industry-standard ATS headers (`Summary`, `Experience`, `Education`, `Skills`).
- **Readability & Word Economy (15% Weight)**: Strong action-verb leads, concise bullets (15–30 words), and absence of run-ons.
- **Formatting Consistency (15% Weight)**: Uniform date notation (`YYYY` or `Mon YYYY`) and consistent bullet punctuation.
- **Contact & Completeness (25% Weight)**: Verifiable candidate name, telephone number, email, city/state, and LinkedIn profile.

### Understanding the Missing Keywords Panel
Located in the **ATS Optimization** tab, this panel lists skills demanded by the job posting that were **not** found in your resume.
- **Why are they separated?** To protect your ethical reputation. We never lie on your behalf.
- **How to use them**: Review each missing keyword. If you actually have experience with that tool (e.g., Docker or AWS) but omitted it from your original resume, use the **Interactive Editor** to truthfully add it to your skills or experience bullets.

---

## 6. Step 5: Refining in the Interactive Studio Editor

### Continuous Canvas vs Document Preview
At the top left of the resume sheet, toggle between two viewing modes:
1. **Interactive Document Canvas**: The active working mode. Click any text field to edit inline, hover over bullet points to trigger AI tools, or click tags to remove/add skills.
2. **Document Preview Mode**: A clean, distraction-free view showing exactly how the document will appear when exported to PDF.

### Inline Text Editing
- **Header & Contact**: Click your candidate name, email, phone, location, or LinkedIn link to update them. Your name updates are immediately protected by the Candidate Name Integrity Pipeline.
- **Summary**: Click anywhere in the executive summary to refine phrasing.
- **Experience Bullets**: Click any bullet point to edit text directly.
- **Skills**: Click the `+ Add Skill` button to append a verified capability, or click the `×` on any skill badge to remove it.

### Contextual Single-Bullet AI Improve
When you want to sharpen a specific accomplishment without rewriting the whole section:
1. Hover your cursor over the bullet point in the Interactive Canvas.
2. Click the **"AI Improve"** button that appears to the right.
3. The **AI Improve Modal** opens, showing:
   - Your original bullet text.
   - The proposed revision leading with strong metrics and active verbs.
   - An explanation of why the change improves ATS relevance.
   - Target keywords incorporated.
4. You can freely edit the proposed text inside the modal before accepting.
5. Click **"Accept & Apply"** to replace the bullet, or **"Reject"** to keep your original.

### Iterative "Improve Again"
Need a punchier alternative? After accepting an improvement, hovering over the bullet again gives you the **"Improve Again"** option. This feeds the latest accepted draft back into the AI engine for further refinement.

### Batch "Improve All"
To polish all experience bullets across every employer in one unified flow:
1. Click the **"Batch AI Improve"** button in the Studio Command Bar.
2. The modal iterates through all experience entries, generating grounded suggestions.
3. Use the toggle checkboxes to selectively accept high-impact revisions while leaving others intact.
4. Click **"Apply Selected Improvements"** to commit your batch edits.

### Dynamic "Re-check Score"
Whenever you make manual edits or accept AI improvements, your draft status changes to **"Draft Modified"** (indicated by an amber badge).
- Click **"Re-check Score"** in the Command Bar.
- The system runs the calibrated scoring engine against your **current live draft** and updates both Score A and Score B gauges instantly, showing you the exact impact of your changes!

---

## 7. Step 6: Managing Version History & Lineage

Resume Customizer AI includes a complete version branching system connected to Supabase Cloud PostgreSQL with Row Level Security.

### Saving Versions (Root vs Child Revisions)
1. Click **"Save Version"** in the Studio Command Bar.
2. Choose your revision lineage:
   - **Child Revision (Recommended)**: Saves your current edits as a child snapshot linked to your active resume family (e.g., `v1.1` -> `v1.2`).
   - **New Root Family**: Detaches the current document to start a completely new branch (e.g., tailored for a different industry like `FinTech` vs `Healthcare`).
3. Enter a descriptive version name (e.g., `Apex Cloud - Cloud Architect Tailored`).
4. Add optional tags (e.g., `Cloud`, `Kubernetes`, `Leadership`) and notes.
5. Click **"Save Version"**.

### Viewing and Restoring from History Drawer
1. Click the **"History"** button in the top navigation bar to slide open the History Drawer.
2. Filter your saved revisions using the search bar, starred favorites, or tag pills.
3. Click **"Restore"** on any version card to load that exact snapshot into your active workspace.
4. You can also rename, tag, or fork versions directly from their menu.

### Side-by-Side Version Comparison
1. In the History Drawer, select any two versions using the comparison checkboxes.
2. Click **"Compare Selected (2)"**.
3. The **Version Comparison Modal** opens, presenting:
   - Quantitative metric delta (Score A difference, Score B difference, word count change).
   - Side-by-side view highlighting modified summary and experience bullets.
   - A **"Swap"** button to easily exchange which version is on the left vs right.

---

## 8. Step 7: Multi-Format Document Export

When you are satisfied with your tailored resume, export it in any of three industry-standard formats via the **"Export"** dropdown:

1. **Executive PDF (`.pdf`)**:
   - Built server-side using Python ReportLab.
   - Features standard 0.75-inch margins, subtle Aubergine section divider rules, hanging bullet indents, and clean font hierarchies.
   - 100% compliant with modern corporate PDF ATS parsers.
2. **Microsoft Word (`.docx`)**:
   - Fully editable Word document using standard heading styles (`Heading 1`, `Heading 2`, `Normal`, `List Bullet`).
   - Ideal if a recruiter requests an unbranded Word format or if you wish to apply custom desktop formatting.
3. **Plain Text (`.txt`)**:
   - Clean, ASCII-formatted plain text with standardized section dividers (`=== EXPERIENCE ===`).
   - Perfect for pasting directly into text-only web job application portals.

---

## 9. Step 8: Tailored Cover Letter Studio

A tailored resume deserves an equally compelling, aligned cover letter:

1. Click the **"Cover Letter"** tab in the Studio Command Bar.
2. The system automatically synthesizes a high-impact, 3-to-4 paragraph cover letter:
   - **Salutation**: Personalized to the target company and role.
   - **Opening Hook**: States your target position and core value proposition.
   - **Body Paragraphs**: Highlights 2–3 genuine career accomplishments that match the JD's biggest challenges.
   - **Closing**: Professional call to action.
   - **Authoritative Sign-Off**: Synchronized with your normalized candidate name, phone number, and email.
3. **Interactive Editing**: Click anywhere in the cover letter text box to adjust tone or add personal anecdotes.
4. **Export Options**:
   - Click **"Copy to Clipboard"** for 1-click pasting into email or web forms.
   - Click **"Download Cover Letter PDF"** to generate an executive letterhead PDF formatted to match your resume branding.

---

## 10. Frequently Asked Questions (FAQ)

#### Q: Does Resume Customizer AI guarantee I will pass ATS scans?
**A**: No ethical tool can make that guarantee. Real-world ATS systems (Workday, Taleo, Greenhouse, Lever, iCIMS) use different proprietary parsing algorithms, and hiring managers use varying search criteria. Resume Customizer AI guarantees **honest, maximized alignment**: it formats your document for optimal machine readability, embeds high-value semantic keywords truthfully, and ensures you make a strong impression on human recruiters.

#### Q: What happens to my data? Is it kept private?
**A**: Yes. If you use the application as a guest, your data is processed entirely in ephemeral memory and never saved to a database. If you create an account, your resumes are stored in Supabase PostgreSQL protected by Row Level Security (RLS) policies that make it impossible for any other user to access your documents.

#### Q: Can I use the studio on my phone or tablet?
**A**: Absolutely. The entire interface is fully responsive, supporting screen sizes from 360px mobile viewports up to 1440px+ ultra-wide desktop monitors.
