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
