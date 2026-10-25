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
    <div className="rounded-xl border border-[#E2E8E4] bg-[#F8F7F3]/70 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-[#15283B] hover:bg-[#F8F7F3] transition-colors"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#087F66]" />
          <span>Section-Wise Customization Preferences</span>
        </span>
        <span className="text-[#64748B]">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 pt-2 space-y-3.5 border-t border-[#E2E8E4] text-xs bg-white">
          <p className="text-[11px] text-[#64748B]">
            Select which resume sections should be optimized. Unchecked sections will retain their original verbatim text.
          </p>

          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="toggle-summary"
                type="checkbox"
                checked={customizeSummary}
                onChange={(e) => setCustomizeSummary(e.target.checked)}
                className="mt-0.5 rounded text-[#087F66] focus:ring-[#087F66] accent-[#087F66] h-4 w-4"
              />
              <div>
                <span className="font-semibold text-[#15283B]">
                  Tailor Professional Summary
                </span>
                <p className="text-[11px] text-[#64748B]">
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
                className="mt-0.5 rounded text-[#087F66] focus:ring-[#087F66] accent-[#087F66] h-4 w-4"
              />
              <div>
                <span className="font-semibold text-[#15283B]">
                  Align Core Skills & Match Keywords
                </span>
                <p className="text-[11px] text-[#64748B]">
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
                className="mt-0.5 rounded text-[#087F66] focus:ring-[#087F66] accent-[#087F66] h-4 w-4"
              />
              <div>
                <span className="font-semibold text-[#15283B]">
                  Rephrase Experience Bullets
                </span>
                <p className="text-[11px] text-[#64748B]">
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
