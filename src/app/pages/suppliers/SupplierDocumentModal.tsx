import React, { useState } from 'react';
import { X, FileUp, Check, AlertCircle } from 'lucide-react';
import { DocumentType } from '../../../types/suppliers';

interface SupplierDocumentModalProps {
  isOpen: boolean;
  supplierId: string;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  organizationId: string;
}

export const SupplierDocumentModal: React.FC<SupplierDocumentModalProps> = ({
  isOpen,
  supplierId,
  onClose,
  onSave,
  organizationId,
}) => {
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('certificate');
  const [fileName, setFileName] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !fileName.trim()) {
      setError('Document title and file name are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        title: title.trim(),
        document_type: documentType,
        file_name: fileName.trim(),
        file_size: 1540000,
        mime_type: 'application/pdf',
        storage_path: `suppliers/${supplierId}/${fileName.trim()}`,
        public_url: publicUrl.trim() || `https://docs.jyotsvan.enterprise/storage/suppliers/${supplierId}/${fileName.trim()}`,
        valid_until: validUntil || null,
        organization_id: organizationId
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to attach document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Attach Compliance / Legal Document</h3>
              <p className="text-xs text-slate-500">ISO Certificate, SLA Agreement, Quality COA or NDA</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ISO 9001:2015 Quality Certificate"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Document Classification <span className="text-rose-500">*</span>
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="certificate">Quality / Regulatory Certificate</option>
                <option value="agreement">Master Supply / SLA Agreement</option>
                <option value="quotation">Formal Quotation / Rate Card</option>
                <option value="compliance">Environmental / RoHS / CE Compliance</option>
                <option value="pan_gst">GSTIN / PAN Tax Registration</option>
                <option value="bank_doc">Cancelled Cheque / Bank Letter</option>
                <option value="other">Other Compliance Record</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Validity Expiration Date
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              File Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. BharatSteel_ISO9001_2026.pdf"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              External Document Storage Link (Optional)
            </label>
            <input
              type="url"
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              placeholder="https://drive.google.com/... or https://docs.jyotsvan.enterprise/..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Attach Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
