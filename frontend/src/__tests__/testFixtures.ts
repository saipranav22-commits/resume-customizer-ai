import {
  CustomizationHistoryItem,
  CustomizationHistoryDetail,
  VersionComparisonResponse,
  TailoredResumeResponse,
} from "@/types/resume";

export const sampleTailoredResume: TailoredResumeResponse = {
  candidate_name: "Alex Morgan",
  contact_info: {
    email: "alex@example.com",
    phone: "+1-555-0199",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/alexmorgan",
    github: "github.com/alexmorgan",
  },
  original_summary: "Experienced software engineer specializing in backend systems.",
  tailored_summary: "Results-driven Senior Backend Engineer with 8+ years architecting scalable cloud services and high-throughput APIs.",
  skills: {
    matching_skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
    additional_skills: ["Redis", "CI/CD", "Git"],
  },
  experience: [
    {
      company: "TechCorp",
      role: "Senior Backend Developer",
      duration: "2021 - Present",
      bullets: [
        "Architected distributed microservices handling 20M+ daily events using FastAPI and Kafka.",
        "Optimized PostgreSQL queries reducing latency by 45%.",
      ],
    },
    {
      company: "CloudScale Inc",
      role: "Software Engineer",
      duration: "2018 - 2021",
      bullets: [
        "Developed RESTful APIs with Python and Flask.",
        "Implemented automated CI/CD pipelines reducing deployment friction.",
      ],
    },
  ],
  education: [
    {
      institution: "State University",
      degree: "B.S. in Computer Science",
      year: "2018",
    },
  ],
  projects: [],
  certifications: [],
  missing_keywords: [
    {
      keyword: "Kubernetes",
      category: "DevOps",
      recommendation: "Consider showcasing Kubernetes cluster administration experience if applicable.",
      context: "Found in JD requirements.",
    },
  ],
  match_score: 88,
  ats_compatibility: {
    score: 92,
    strengths: ["Standard section headings", "Clean bullet formatting", "Keyword alignment"],
    improvements: ["Incorporate missing DevOps tooling keywords"],
  },
  customization_engine: "gemini-2.5-flash",
  is_llm_generated: true,
  job_analysis: {
    target_role: "Senior Backend Engineer",
    required_skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
    preferred_skills: ["Kubernetes", "Kafka", "Redis"],
    tools_frameworks: ["FastAPI", "Docker", "PostgreSQL", "AWS", "Kafka"],
    experience_level: "5+ years",
    education_requirement: "Bachelor's degree in Computer Science or equivalent",
    responsibilities: [
      "Architect and scale backend distributed systems and REST APIs.",
      "Optimize data pipelines and database query throughput."
    ],
    keywords: ["python", "fastapi", "postgresql", "docker", "aws", "kafka"]
  },
  match_breakdown: {
    overall_score: 88,
    required_skill_score: 100,
    preferred_skill_score: 66,
    experience_score: 90,
    responsibility_score: 85,
    keyword_score: 83,
    structure_score: 95,
    factor_weights: {
      required_skills: 0.35,
      preferred_skills: 0.15,
      experience: 0.20,
      responsibilities: 0.15,
      keyword_coverage: 0.10,
      structure: 0.05
    },
    explanation: "High overall match driven by complete required skills coverage and strong role alignment.",
    disclaimer: "Match scores indicate semantic and structural alignment with the provided job description. They do not simulate or guarantee proprietary ATS screening decisions or employer interview outcomes."
  },
  recommendations: [
    {
      issue: "Preferred skill 'Kubernetes' not highlighted.",
      requirement: "Target job lists 'Kubernetes' as preferred experience.",
      evidence: "No verified mention in resume.",
      proposed_improvement: "Highlight any hands-on Kubernetes container orchestration experience if authentic.",
      priority: "medium",
      requires_user_confirmation: true
    },
    {
      issue: "Resume summary can directly mention target role.",
      requirement: "Align opening statement with 'Senior Backend Engineer'.",
      evidence: "Summary focuses on general backend systems.",
      proposed_improvement: "Explicitly reference Senior Backend Engineer in the executive summary.",
      priority: "low",
      requires_user_confirmation: false
    }
  ],
  ats_quality_assessment: {
    overall_score: 93,
    parseability_score: 98,
    structure_score: 95,
    readability_score: 90,
    formatting_consistency_score: 92,
    content_coverage_score: 92,
    completeness_score: 95,
    factor_weights: {
      parseability: 0.25,
      structure: 0.20,
      readability: 0.15,
      formatting_consistency: 0.15,
      content_coverage: 0.15,
      completeness: 0.10
    },
    explanation: "High document parseability and standard reverse-chronological structure.",
    disclaimer: "ATS Quality Assessment is a heuristic structural evaluation and does not guarantee employer hiring decisions."
  },
  audit: {
    overall_score: 93,
    grade: "A",
    errors: [],
    warnings: [
      {
        id: "warn-bullet-length",
        type: "warning",
        category: "bullet_length",
        message: "Bullet exceeds 35 words",
        location: "TechCorp",
        recommendation: "Shorten bullet to 15-25 words for optimal readability."
      }
    ],
    suggestions: [
      {
        id: "sug-summary-punch",
        type: "suggestion",
        category: "summary_focus",
        message: "Opening summary is concise and impact-focused",
        location: "Professional Summary",
        recommendation: "Consider leading with your most relevant domain achievement."
      }
    ],
    summary: "Resume meets high professional ATS standards with 0 critical errors.",
    metrics: {
      word_count: 310,
      bullet_count: 4,
      avg_bullet_words: 18.5,
      duplicate_skills_count: 0,
      experience_entries_count: 2,
      project_entries_count: 0,
      education_entries_count: 1
    }
  }
};

export const sampleHistoryItems: CustomizationHistoryItem[] = [
  // Family 1: Root 1 and its child
  {
    id: "hist-root-1",
    user_id: "user-test-1",
    title: "Senior Backend Role",
    version_name: "v1.0 - Initial Customization",
    version_number: 1,
    root_id: "hist-root-1",
    parent_id: null,
    target_role: "Senior Backend Engineer",
    match_score: 85,
    ats_score: 88,
    version_tags: ["backend", "python"],
    version_notes: "Initial tailored draft for Fintech Corp",
    is_starred: true,
    customization_engine: "gemini-2.5-flash",
    is_llm_generated: true,
    created_at: "2026-10-20T10:00:00Z",
  },
  {
    id: "hist-child-2",
    user_id: "user-test-1",
    title: "Senior Backend Role - Fintech Emphasis",
    version_name: "v2.0 - Fintech Emphasis",
    version_number: 2,
    root_id: "hist-root-1",
    parent_id: "hist-root-1",
    target_role: "Lead Backend Engineer",
    match_score: 94,
    ats_score: 96,
    version_tags: ["backend", "fintech", "lead"],
    version_notes: "Emphasized Kafka and high-throughput transactions",
    is_starred: false,
    customization_engine: "gemini-2.5-flash",
    is_llm_generated: true,
    created_at: "2026-10-21T14:30:00Z",
  },
  // Family 2: Independent Root 2
  {
    id: "hist-root-2",
    user_id: "user-test-1",
    title: "Solutions Architect Role",
    version_name: "Solutions Architect v1",
    version_number: 1,
    root_id: "hist-root-2",
    parent_id: null,
    target_role: "Enterprise Solutions Architect",
    match_score: 80,
    ats_score: 82,
    version_tags: ["architecture", "cloud"],
    version_notes: "Draft for enterprise cloud consulting",
    is_starred: false,
    customization_engine: "gemini-2.5-flash",
    is_llm_generated: true,
    created_at: "2026-10-22T09:15:00Z",
  },
];

export const sampleHistoryDetail: CustomizationHistoryDetail = {
  ...sampleHistoryItems[0],
  job_description: "Looking for a Senior Backend Engineer proficient in Python, FastAPI, and PostgreSQL to design high-throughput transaction systems.",
  tailored_result: sampleTailoredResume,
};

export const sampleComparisonResponse: VersionComparisonResponse = {
  version_a_id: "hist-root-1",
  version_b_id: "hist-child-2",
  version_a_name: "v1.0 - Initial Customization",
  version_b_name: "v2.0 - Fintech Emphasis",
  version_a_number: 1,
  version_b_number: 2,
  title_a: "Senior Backend Role",
  title_b: "Senior Backend Role - Fintech Emphasis",
  created_at_a: "2026-10-20T10:00:00Z",
  created_at_b: "2026-10-21T14:30:00Z",
  ats_score_a: 88,
  ats_score_b: 96,
  ats_score_delta: 8,
  match_score_a: 85,
  match_score_b: 94,
  match_score_delta: 9,
  summary_a: "Experienced software engineer specializing in backend systems.",
  summary_b: "Results-driven Senior Backend Engineer with 8+ years architecting scalable cloud services and high-throughput APIs.",
  summary_changed: true,
  added_skills: ["Kafka", "Distributed Systems"],
  removed_skills: ["Flask"],
  shared_skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
  experience_diffs: [
    {
      company: "TechCorp",
      role: "Senior Backend Developer",
      added_bullets: ["Architected distributed microservices handling 20M+ daily events using FastAPI and Kafka."],
      removed_bullets: ["Built internal microservices with basic queuing."],
      unchanged_bullets: ["Optimized PostgreSQL queries reducing latency by 45%."],
    },
  ],
};
