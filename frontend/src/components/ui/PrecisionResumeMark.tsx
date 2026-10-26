import React from "react";

interface PrecisionResumeMarkProps {
  size?: number | string;
  className?: string;
  showGlow?: boolean;
}

/**
 * Option 1: Precision Resume Mark
 * Canonical brand vector mark combining:
 * - Aubergine rounded-square tile (#291B32)
 * - Soft-white resume document silhouette (#FFFFFF)
 * - Minimal folded corner in muted lavender (#E8D9E8)
 * - Three structured resume-content strokes with generous negative space
 * - A distinctive copper AI refinement sparkle (#C45D39)
 * - One integrated copper precision/alignment element
 */
export default function PrecisionResumeMark({
  size = 36,
  className = "",
  showGlow = false,
}: PrecisionResumeMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="Resume Customizer AI Precision Resume Mark"
      role="img"
    >
      {/* 1. Aubergine rounded-square tile (#291B32) */}
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="14"
        fill="#291B32"
        stroke="#4A355A"
        strokeWidth="1.5"
      />

      {/* Subtle ambient glow */}
      {showGlow && (
        <circle cx="48" cy="14" r="14" fill="#C45D39" fillOpacity="0.16" />
      )}

      {/* 2. Soft-white resume document silhouette (#FFFFFF) */}
      <path
        d="M16 15.5C16 14.1193 17.1193 13 18.5 13H36L46 23V48.5C46 49.8807 44.8807 51 43.5 51H18.5C17.1193 51 16 49.8807 16 48.5V15.5Z"
        fill="#FFFFFF"
      />

      {/* 3. Minimal folded corner in muted lavender (#E8D9E8) */}
      <path
        d="M36 13V21C36 22.1046 36.8954 23 38 23H46L36 13Z"
        fill="#E8D9E8"
      />

      {/* 4. Integrated copper precision/alignment element (#C45D39) */}
      <rect x="19" y="24" width="3" height="22" rx="1.5" fill="#C45D39" />

      {/* 5. Three structured resume-content strokes with generous negative space */}
      <rect x="25" y="25" width="15" height="2.5" rx="1.25" fill="#291B32" />
      <rect x="25" y="33" width="16" height="2.5" rx="1.25" fill="#674E61" />
      <rect x="25" y="41" width="12" height="2.5" rx="1.25" fill="#8F7589" />

      {/* 6. Distinctive copper AI refinement sparkle (#C45D39) */}
      <path
        d="M48 8C48 11.5 50.5 14 54 14C50.5 14 48 16.5 48 20C48 16.5 45.5 14 42 14C45.5 14 48 11.5 48 8Z"
        fill="#C45D39"
      />
      <circle cx="53.5" cy="21.5" r="1.25" fill="#E8D9E8" />
    </svg>
  );
}
