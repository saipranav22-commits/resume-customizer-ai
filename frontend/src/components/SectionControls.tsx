"use client";

import React, { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

interface SectionControlsProps {
  customizeSummary: boolean;
  setCustomizeSummary: (val: boolean) => void;
  customizeSkills: boolean;
  setCustomizeSkills: (val: boolean) => void;
  customizeExperience: boolean;
  setCustomizeExperience: (val: boolean) => void;
}

export default function SectionControls({
  customizeSummary,
  setCustomizeSummary,
  customizeSkills,
  setCustomizeSkills,
  customizeExperience,
  setCustomizeExperience,
}: SectionControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Section-Wise Customization Options</span>
        </span>
        <span className="text-slate-400">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 pt-1 space-y-3 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Choose which sections you wish the AI to tailor. Unchecked sections will retain their original text.
          </p>

          <div className="space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="toggle-summary"
                type="checkbox"
                checked={customizeSummary}
                onChange={(e) => setCustomizeSummary(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Tailor Professional Summary
                </span>
                <p className="text-[11px] text-slate-500">
                  Craft an executive pitch aligned specifically with the target role.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="toggle-skills"
                type="checkbox"
                checked={customizeSkills}
                onChange={(e) => setCustomizeSkills(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Align Core Skills & Match Keywords
                </span>
                <p className="text-[11px] text-slate-500">
                  Highlight candidate qualifications matching the JD while isolating missing gaps.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="toggle-experience"
                type="checkbox"
                checked={customizeExperience}
                onChange={(e) => setCustomizeExperience(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Rephrase Experience Bullets
                </span>
                <p className="text-[11px] text-slate-500">
                  Enhance bullet points with action verbs and impact metrics while preserving factual accuracy.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
