import React from "react";

interface PrecisionResumeMarkProps {
  size?: number | string;
  className?: string;
  showGlow?: boolean;
}

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
      {/* 1. Rounded Square Container in Deep Aubergine */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="14"
        fill="#291B32"
        stroke="#4A355A"
        strokeWidth="2"
      />

      {/* 2. Optional ambient inner glow */}
      {showGlow && (
        <circle cx="48" cy="18" r="14" fill="#C45D39" fillOpacity="0.16" />
      )}

      {/* 3. Resume Document Silhouette (Soft White) */}
      <path
        d="M15 14C15 12.8954 15.8954 12 17 12H35L45 22V50C45 51.1046 44.1046 52 43 52H17C15.8954 52 15 51.1046 15 50V14Z"
        fill="#FFFFFF"
      />

      {/* 4. Folded Corner Flap (Muted Lavender) */}
      <path
        d="M35 12V20C35 21.1046 35.8954 22 37 22H45L35 12Z"
        fill="#E8D9E8"
      />

      {/* 5. Precision Alignment Bar (Burnished Copper) */}
      <rect x="18" y="22" width="2.5" height="24" rx="1.25" fill="#C45D39" />

      {/* 6. Content Strokes (Resume Text Structure) */}
      <rect x="23" y="22.5" width="15" height="2.5" rx="1.25" fill="#291B32" />
      <rect x="23" y="28.5" width="17" height="2" rx="1" fill="#674E61" />
      <rect x="23" y="34" width="14" height="2" rx="1" fill="#674E61" />
      <rect x="23" y="39.5" width="17" height="2" rx="1" fill="#DDD0D7" />
      <rect x="23" y="45" width="11" height="2" rx="1" fill="#DDD0D7" />

      {/* 7. Intelligent Refinement Sparkle (Burnished Copper 4-Point Star) */}
      <path
        d="M47 11C47 14.5 49 16.5 52.5 16.5C49 16.5 47 18.5 47 22C47 18.5 45 16.5 41.5 16.5C45 16.5 47 14.5 47 11Z"
        fill="#C45D39"
      />
      {/* Secondary micro-sparkle */}
      <circle cx="52.5" cy="24.5" r="1.2" fill="#E8D9E8" />
    </svg>
  );
}
