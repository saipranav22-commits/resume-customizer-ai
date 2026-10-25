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
  delta?: number | null;
  className?: string;
}

export const CircularScoreRing: React.FC<CircularScoreRingProps> = ({
  score,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel = "/ 100",
  color = "#7C4DFF",
  trackColor = "#1B2231",
  delta,
  className = "",
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

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
          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
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

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-heading font-extrabold text-[#F7F7FA] tracking-tight leading-none text-2xl">
            {clampedScore}%
          </span>
          {sublabel && (
            <span className="text-[10px] text-[#B8B9D0] uppercase tracking-wider font-semibold mt-0.5">
              {sublabel}
            </span>
          )}
        </div>

        {/* Optional Delta Badge */}
        {delta !== undefined && delta !== null && delta !== 0 && (
          <div
            className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md flex items-center gap-0.5 ${
              delta > 0
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
            }`}
          >
            <span>{delta > 0 ? `+${delta}%` : `${delta}%`}</span>
          </div>
        )}
      </div>

      {label && (
        <span className="text-xs font-medium text-[#B8B9D0] mt-2.5 text-center line-clamp-1 max-w-[130px]">
          {label}
        </span>
      )}
    </div>
  );
};

export default CircularScoreRing;
