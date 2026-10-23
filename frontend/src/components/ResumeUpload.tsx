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
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span>1. Upload Your Resume</span>
          <span className="text-xs font-normal text-slate-500">(PDF or DOCX, max 5MB)</span>
        </label>
        {file && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
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
          className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${
            isDragging
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]"
              : "border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/60"
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
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Click to browse or drag and drop your resume
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports Adobe PDF (.pdf) and Microsoft Word (.docx)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {file.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatFileSize(file.size)} • {file.name.endsWith(".pdf") ? "PDF Document" : "Word Document"}
              </p>
            </div>
          </div>
          <button
            id="remove-resume-button"
            type="button"
            onClick={handleRemove}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            title="Remove and select different file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {(validationError || error) && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{validationError || error}</span>
        </div>
      )}
    </div>
  );
}
