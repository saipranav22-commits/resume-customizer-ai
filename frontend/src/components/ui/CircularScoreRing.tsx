"use client";

import React from "react";

export interface CircularScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  trackColor?: string;
  textColor?: string;
  subtextColor?: string;
  theme?: "dark" | "light";
  delta?: number | null;
  className?: string;
}

export const CircularScoreRing: React.FC<CircularScoreRingProps> = ({
  score,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel = "/ 100",
  color = "#C45D39",
  trackColor,
  textColor,
  subtextColor,
  theme = "light",
  delta,
  className = "",
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  // Resolve high-contrast colors based on theme
  const isDark = theme === "dark";
  const resolvedTrack = trackColor || (isDark ? "#4A355A" : "#DDD0D7");
  const resolvedTextColor = textColor || (isDark ? "text-white" : "text-[#291B32]");
  const resolvedSubtextColor = subtextColor || (isDark ? "text-[#E8D9E8]" : "text-[#674E61]");

  // Dynamic typography sizing based on ring diameter
  const scoreTextSize =
    size >= 130
      ? "text-3xl font-black"
      : size >= 95
      ? "text-2xl font-extrabold"
      : "text-lg font-bold";

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          role="progressbar"
          aria-valuenow={clampedScore}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* Background track circle - high contrast */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={resolvedTrack}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content - Always visible with WCAG AA contrast */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
          <span
            className={`font-heading ${scoreTextSize} ${resolvedTextColor} tracking-tight leading-none drop-shadow-xs`}
          >
            {clampedScore}%
          </span>
          {sublabel && (
            <span
              className={`text-[10px] ${resolvedSubtextColor} uppercase tracking-wider font-semibold mt-0.5 leading-tight`}
            >
              {sublabel}
            </span>
          )}
        </div>

        {/* Optional Delta Badge */}
        {delta !== undefined && delta !== null && delta !== 0 && (
          <div
            className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-0.5 ${
              delta > 0
                ? "bg-[#C45D39]/20 text-[#C45D39] border border-[#C45D39]/40"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            <span>{delta > 0 ? `+${delta}%` : `${delta}%`}</span>
          </div>
        )}
      </div>

      {label && (
        <span
          className={`text-xs font-semibold ${isDark ? "text-white" : "text-[#291B32]"} mt-2.5 text-center line-clamp-1 max-w-[140px]`}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default CircularScoreRing;
