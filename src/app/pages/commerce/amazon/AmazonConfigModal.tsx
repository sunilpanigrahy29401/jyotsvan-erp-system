// src/app/pages/commerce/amazon/AmazonConfigModal.tsx
// Phase 31: Amazon SP-API Credentials & Connection Configuration Modal

import React, { useState } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Globe,
  Sliders,
  Lock,
} from 'lucide-react';
import { amazonApi } from '../../../../services/amazonApi.ts';

interface AmazonConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AmazonConfigModal({ isOpen, onClose, onSaved }: AmazonConfigModalProps) {
  const [sellerId, setSellerId] = useState('A2JYOTSVANORGANICS');
  const [lwaClientId, setLwaClientId] = useState('amzn1.application-oa2-client.jyotsvan-corp-erp-2026');
  const [lwaClientSecret, setLwaClientSecret] = useState('••••••••••••••••••••••••••••••••••••••••');
  const [refreshToken, setRefreshToken] = useState('Atzr|IwEBIJyotsvanCorpRefreshEncryptedToken2026');
  const [awsRegion, setAwsRegion] = useState('eu-west-1');
  const [syncInterval, setSyncInterval] = useState('15');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await amazonApi.saveConfiguration({
        sellerId,
        lwaClientId,
        lwaClientSecret,
        refreshToken,
        awsRegion,
        syncIntervalMinutes: parseInt(syncInterval, 10),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSaved();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to save Amazon configuration:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Amazon SP-API Gateway Settings</h3>
              <p className="text-xs text-slate-500">
                LWA OAuth2 & AWS Security Token Service (STS) Credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Amazon SP-API configuration saved and encrypted into vault.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Amazon Merchant / Seller ID
            </label>
            <input
              type="text"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                LWA App Client ID
              </label>
              <input
                type="text"
                value={lwaClientId}
                onChange={(e) => setLwaClientId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                LWA Client Secret
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={lwaClientSecret}
                  onChange={(e) => setLwaClientSecret(e.target.value)}
                  required
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
                />
                <Lock className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              LWA Refresh Token (Offline Authorization)
            </label>
            <textarea
              rows={2}
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                SP-API Region & Endpoint
              </label>
              <select
                value={awsRegion}
                onChange={(e) => setAwsRegion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900"
              >
                <option value="eu-west-1">Europe & India (sellingpartnerapi-eu.amazon.com)</option>
                <option value="us-east-1">North America (sellingpartnerapi-na.amazon.com)</option>
                <option value="us-west-2">Far East (sellingpartnerapi-fe.amazon.com)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Auto-Sync Interval (Minutes)
              </label>
              <select
                value={syncInterval}
                onChange={(e) => setSyncInterval(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900"
              >
                <option value="5">Every 5 Minutes (Real-Time)</option>
                <option value="15">Every 15 Minutes (Recommended)</option>
                <option value="30">Every 30 Minutes</option>
                <option value="60">Hourly</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              SP-API tokens and credentials are encrypted using AES-256-GCM and stored in the secure InsForge Integration Vault.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
