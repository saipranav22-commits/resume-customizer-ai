"use client";

import React, { useRef, useState, DragEvent, ChangeEvent } from "react";
import { UploadCloud, FileText, CheckCircle2, X, AlertTriangle } from "lucide-react";

interface ResumeUploadProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  error?: string | null;
}

export default function ResumeUpload({ file, onFileSelect, error }: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleValidation = (selectedFile: File): boolean => {
    setValidationError(null);
    const validExtensions = [".pdf", ".docx"];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setValidationError("Unsupported format. Please upload a PDF (.pdf) or Word document (.docx).");
      return false;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setValidationError("File is too large. Maximum allowed size is 5 MB.");
      return false;
    }

    if (selectedFile.size === 0) {
      setValidationError("The selected file is empty (0 bytes).");
      return false;
    }

    return true;
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (handleValidation(droppedFile)) {
        onFileSelect(droppedFile);
      }
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const chosenFile = e.target.files[0];
      if (handleValidation(chosenFile)) {
        onFileSelect(chosenFile);
      }
    }
  };

  const handleRemove = () => {
    onFileSelect(null);
    setValidationError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-[#15283B] flex items-center gap-2">
          <span>1. Upload Your Resume</span>
          <span className="text-xs font-normal text-[#64748B]">(PDF or DOCX, max 5MB)</span>
        </label>
        {file && (
          <span className="inline-flex items-center gap-1 text-xs text-[#087F66] font-semibold bg-[#DCEDE5] px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready for Analysis
          </span>
        )}
      </div>

      {!file ? (
        <div
          id="resume-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
            isDragging
              ? "border-[#087F66] bg-[#DCEDE5]/30 scale-[1.01]"
              : "border-[#E2E8E4] hover:border-[#087F66] bg-[#F8F7F3]/70 hover:bg-[#F8F7F3]"
          }`}
        >
          <input
            id="resume-file-input"
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#DCEDE5] text-[#087F66] flex items-center justify-center shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#15283B]">
                Click to browse or drag and drop your resume
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                Executive Adobe PDF (.pdf) and Microsoft Word (.docx)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-xl border border-[#DCEDE5] bg-[#DCEDE5]/25">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#087F66] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#15283B] truncate">
                {file.name}
              </p>
              <p className="text-xs text-[#64748B]">
                {formatFileSize(file.size)} · {file.name.endsWith(".pdf") ? "PDF Document" : "Word Document"}
              </p>
            </div>
          </div>
          <button
            id="remove-resume-button"
            type="button"
            onClick={handleRemove}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#15283B] hover:bg-white transition-colors"
            title="Remove and select different file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {(validationError || error) && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError || error}</span>
        </div>
      )}
    </div>
  );
}
