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
    <div className="rounded-2xl border border-[#DDD0D7] bg-white overflow-hidden transition-all shadow-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs font-semibold text-[#291B32] hover:bg-[#F7F2EB] transition-colors focus-visible:ring-2 focus-visible:ring-[#C45D39]"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#C45D39]" />
          <span>Section-Wise Customization Preferences</span>
        </span>
        <span className="text-[#674E61]">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-[#674E61]" />}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 pt-3 space-y-3.5 border-t border-[#DDD0D7] text-xs bg-[#F7F2EB]/50">
          <p className="text-[11px] text-[#674E61]">
            Select which resume sections should be optimized. Unchecked sections will retain their original verbatim text.
          </p>

          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="toggle-summary"
                type="checkbox"
                checked={customizeSummary}
                onChange={(e) => setCustomizeSummary(e.target.checked)}
                className="mt-0.5 rounded text-[#C45D39] focus:ring-[#C45D39] accent-[#C45D39] h-4 w-4"
              />
              <div>
                <span className="font-semibold text-[#291B32]">
                  Tailor Professional Summary
                </span>
                <p className="text-[11px] text-[#674E61]">
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
                className="mt-0.5 rounded text-[#C45D39] focus:ring-[#C45D39] accent-[#C45D39] h-4 w-4"
              />
              <div>
                <span className="font-semibold text-[#291B32]">
                  Align Core Skills & Match Keywords
                </span>
                <p className="text-[11px] text-[#674E61]">
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
                className="mt-0.5 rounded text-[#C45D39] focus:ring-[#C45D39] accent-[#C45D39] h-4 w-4"
              />
              <div>
                <span className="font-semibold text-[#291B32]">
                  Rephrase Experience Bullets
                </span>
                <p className="text-[11px] text-[#674E61]">
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
