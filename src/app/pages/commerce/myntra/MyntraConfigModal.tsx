// src/app/pages/commerce/myntra/MyntraConfigModal.tsx
import React, { useState } from 'react';
import { X, ShieldCheck, Key, Save, AlertCircle } from 'lucide-react';
import { myntraApi } from '../../../../services/myntraApi.ts';

interface MyntraConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function MyntraConfigModal({ isOpen, onClose, onSaved }: MyntraConfigModalProps) {
  const [clientId, setClientId] = useState('myn-client-jyotsvan-9921');
  const [clientSecret, setClientSecret] = useState('••••••••••••••••••••••••••••••••');
  const [sellerPartnerId, setSellerPartnerId] = useState('MYNTRA_PARTNER_JYOTSVAN');
  const [storeLocationId, setStoreLocationId] = useState('STORE_BLR_01');
  const [environment, setEnvironment] = useState('production');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await myntraApi.saveConnection({
        clientId,
        clientSecret,
        sellerPartnerId,
        storeLocationId,
        environment,
      });
      alert('Myntra Partner Bridge settings saved successfully.');
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-pink-600" />
            <h3 className="text-sm font-bold text-slate-900">Myntra Partner Bridge Configuration</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Myntra Partner Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-pink-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Client Secret</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-pink-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Seller Partner ID</label>
            <input
              type="text"
              value={sellerPartnerId}
              onChange={(e) => setSellerPartnerId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-pink-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Store / Warehouse Location Code</label>
            <input
              type="text"
              value={storeLocationId}
              onChange={(e) => setStoreLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-pink-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">API Environment</label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-pink-500"
            >
              <option value="production">Production (partner.myntra.com)</option>
              <option value="sandbox">Sandbox (sandbox-partner.myntra.com)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
