import { useState, useEffect } from 'react';
import { X, Globe, AlertCircle, Save } from 'lucide-react';
import type { ExternalSKUMapping, SKU, ExternalPlatform, MappingStatus } from '../../../types/products';
import { productService } from '../../../services/productService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

interface MappingFormModalProps {
  isOpen: boolean;
  mapping?: ExternalSKUMapping | null;
  skus: SKU[];
  onClose: () => void;
  onSuccess: () => void;
}

export function MappingFormModal({
  isOpen,
  mapping,
  skus,
  onClose,
  onSuccess,
}: MappingFormModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [skuId, setSkuId] = useState('');
  const [platform, setPlatform] = useState<ExternalPlatform>('shopify');
  const [externalSku, setExternalSku] = useState('');
  const [externalIdentifier, setExternalIdentifier] = useState('');
  const [externalProductId, setExternalProductId] = useState('');
  const [externalVariantId, setExternalVariantId] = useState('');
  const [status, setStatus] = useState<MappingStatus>('active');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mapping) {
      setSkuId(mapping.sku_id);
      setPlatform(mapping.platform);
      setExternalSku(mapping.external_sku);
      setExternalIdentifier(mapping.external_identifier || '');
      setExternalProductId(mapping.external_product_id || '');
      setExternalVariantId(mapping.external_variant_id || '');
      setStatus(mapping.status);
      setNotes(mapping.metadata?.notes || '');
    } else {
      setSkuId(skus[0]?.id || '');
      setPlatform('shopify');
      setExternalSku('');
      setExternalIdentifier('');
      setExternalProductId('');
      setExternalVariantId('');
      setStatus('active');
      setNotes('');
    }
    setError(null);
  }, [mapping, skus, isOpen]);

  // Auto-populate external SKU code suggestion when SKU selected
  const handleSkuChange = (val: string) => {
    setSkuId(val);
    if (!mapping) {
      const selected = skus.find(s => s.id === val);
      if (selected) {
        setExternalSku(`${platform.toUpperCase()}-${selected.sku}`);
      }
    }
  };

  const handlePlatformChange = (val: ExternalPlatform) => {
    setPlatform(val);
    if (!mapping && skuId) {
      const selected = skus.find(s => s.id === skuId);
      if (selected) {
        setExternalSku(`${val.toUpperCase()}-${selected.sku}`);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuId) {
      setError('Please select a canonical SKU');
      return;
    }
    if (!externalSku.trim()) {
      setError('External SKU identifier is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      sku_id: skuId,
      platform,
      external_sku: externalSku.trim(),
      external_identifier: externalIdentifier.trim() || null,
      external_product_id: externalProductId.trim() || null,
      external_variant_id: externalVariantId.trim() || null,
      status,
      metadata: {
        notes: notes.trim() || undefined,
        channelName: platform.charAt(0).toUpperCase() + platform.slice(1) + ' Channel',
        updatedBy: user?.email,
      },
    };

    try {
      if (mapping) {
        await productService.updateExternalMapping(mapping.id, payload, { id: user?.id, email: user?.email });
        showToast('Marketplace mapping updated', 'success');
      } else {
        await productService.createExternalMapping(payload, { id: user?.id, email: user?.email });
        showToast('Marketplace mapping created', 'success');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      showToast(err.message || 'Failed to save mapping', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {mapping ? 'Edit Channel Mapping' : 'Link External Channel SKU'}
              </h3>
              <p className="text-xs text-slate-500">
                Map canonical ERP SKU to Shopify, Amazon ASIN, or Flipkart FSN
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Canonical ERP SKU <span className="text-rose-500">*</span>
            </label>
            <select
              value={skuId}
              onChange={e => handleSkuChange(e.target.value)}
              disabled={!!mapping}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-600"
            >
              <option value="">-- Select Master SKU --</option>
              {skus.map(s => (
                <option key={s.id} value={s.id}>
                  {s.sku} ({s.variant_name}) — {s.product_name || 'Product'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Channel / Platform <span className="text-rose-500">*</span>
              </label>
              <select
                value={platform}
                onChange={e => handlePlatformChange(e.target.value as ExternalPlatform)}
                disabled={!!mapping}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
              >
                <option value="shopify">Shopify Website</option>
                <option value="amazon">Amazon (Seller Central)</option>
                <option value="flipkart">Flipkart</option>
                <option value="myntra">Myntra</option>
                <option value="custom">Custom B2B Channel</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sync Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as MappingStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="active">Active (Auto-Sync)</option>
                <option value="inactive">Inactive</option>
                <option value="paused">Paused</option>
                <option value="sync_error">Sync Error</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              External Channel SKU <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={externalSku}
              onChange={e => setExternalSku(e.target.value)}
              placeholder="e.g. AMZ-JYT-PUMP-400 or SHOPIFY-904812"
              required
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {platform === 'amazon' ? 'Amazon ASIN' : platform === 'flipkart' ? 'Flipkart FSN' : 'External Identifier'}
              </label>
              <input
                type="text"
                value={externalIdentifier}
                onChange={e => setExternalIdentifier(e.target.value)}
                placeholder={platform === 'amazon' ? 'B09V7X8P3L' : 'EXT-ID-1234'}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                External Variant ID
              </label>
              <input
                type="text"
                value={externalVariantId}
                onChange={e => setExternalVariantId(e.target.value)}
                placeholder="gid://shopify/Variant/123"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Integration Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. FBA fulfillment enabled with automated stock reservation buffer"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : mapping ? 'Update Mapping' : 'Create Channel Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
