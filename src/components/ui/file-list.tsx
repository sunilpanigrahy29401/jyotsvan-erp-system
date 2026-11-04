import React from 'react';
import { cn } from '../../lib/utils';
import { FileText, Download, Trash2, FileSpreadsheet, Image, FileCode } from 'lucide-react';
import { formatFileSize, formatDate } from '../../lib/format';
import type { FileAttachment } from '../../types/common';

export interface FileListProps {
  files: FileAttachment[];
  onDelete?: (id: string) => void;
  onDownload?: (file: FileAttachment) => void;
  className?: string;
  readOnly?: boolean;
}

export function FileList({
  files,
  onDelete,
  onDownload,
  className,
  readOnly = false,
}: FileListProps) {
  if (files.length === 0) return null;

  const getFileIcon = (fileName: string, type?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="w-4 h-4 text-sky-600" />;
    }
    if (['json', 'xml', 'sql'].includes(ext || '')) {
      return <FileCode className="w-4 h-4 text-amber-600" />;
    }
    return <FileText className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className={cn('divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white overflow-hidden', className)}>
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-3 hover:bg-slate-50/60 transition-colors gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
              {getFileIcon(file.name, file.type)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{formatDate(file.uploadedAt)}</span>
                {file.uploadedBy && (
                  <>
                    <span>•</span>
                    <span>{file.uploadedBy}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onDownload && (
              <button
                type="button"
                onClick={() => onDownload(file)}
                className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Download file"
                aria-label={`Download ${file.name}`}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {!readOnly && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(file.id)}
                className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete file"
                aria-label={`Delete ${file.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
