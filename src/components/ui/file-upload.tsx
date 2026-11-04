import React, { useState, useRef } from 'react';
import { cn } from '../../lib/utils';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { formatFileSize } from '../../lib/format';

export interface FileUploadProps {
  onFilesSelected?: (files: File[]) => void;
  maxFiles?: number;
  maxSizeInBytes?: number; // default 10MB
  acceptedFormats?: string[]; // e.g. ['.pdf', '.csv', '.xlsx', '.png', '.jpg']
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxSizeInBytes = 10 * 1024 * 1024, // 10MB
  acceptedFormats = ['.pdf', '.csv', '.xlsx', '.png', '.jpg', '.jpeg', '.docx'],
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const validFiles: File[] = [];
    const filesArray = Array.from(fileList);

    if (filesArray.length > maxFiles) {
      setError(`You can only upload a maximum of ${maxFiles} file(s) at once.`);
      return;
    }

    for (const file of filesArray) {
      if (file.size > maxSizeInBytes) {
        setError(`File "${file.name}" exceeds the maximum size limit of ${formatFileSize(maxSizeInBytes)}.`);
        return;
      }

      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (acceptedFormats.length > 0 && !acceptedFormats.includes(ext) && !acceptedFormats.includes(file.type)) {
        setError(`File "${file.name}" format is not supported. Supported: ${acceptedFormats.join(', ')}`);
        return;
      }

      validFiles.push(file);
    }

    if (onFilesSelected && validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center p-6 sm:p-8 rounded-lg border-2 border-dashed transition-all cursor-pointer select-none text-center',
          isDragOver
            ? 'border-slate-900 bg-slate-50 scale-[0.99]'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptedFormats.join(',')}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
          <UploadCloud className="w-5 h-5 stroke-[1.75]" />
        </div>

        <p className="text-xs sm:text-sm font-semibold text-slate-800">
          Click to upload <span className="font-normal text-slate-500">or drag and drop</span>
        </p>

        <p className="text-[11px] text-slate-500 mt-1">
          Supported: {acceptedFormats.join(', ')} (Max: {formatFileSize(maxSizeInBytes)})
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
