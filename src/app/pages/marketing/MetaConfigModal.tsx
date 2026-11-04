// src/app/pages/marketing/MetaConfigModal.tsx
// Phase 26: Meta Marketing & Ads API Configuration Modal with Token Vault & Account Discovery

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
  Check,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { metaApi } from '../../../services/metaApi.ts';
import type { MetaAdAccount, MetaTestConnectionResponse } from '../../../types/meta.ts';
import { useAuth } from '../../../context/AuthContext.tsx';

export interface MetaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentConfig?: Record<string, any>;
}

export function MetaConfigModal({
  isOpen,
  onClose,
  onSuccess,
  currentConfig = {},
}: MetaConfigModalProps) {
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [adAccountId, setAdAccountId] = useState('');
  const [apiVersion, setApiVersion] = useState('v21.0');
  const [syncFrequency, setSyncFrequency] = useState(60);
  const [syncWindowDays, setSyncWindowDays] = useState(7);
  const [isSandbox, setIsSandbox] = useState(false);

  // Discovery & Test State
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredAccounts, setDiscoveredAccounts] = useState<MetaAdAccount[]>([]);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<MetaTestConnectionResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAppId(currentConfig.app_id || '');
      setAdAccountId(currentConfig.ad_account_id || '');
      setApiVersion(currentConfig.api_version || 'v21.0');
      setSyncFrequency(currentConfig.sync_frequency_minutes || 60);
      setSyncWindowDays(currentConfig.sync_window_days || 7);
      setIsSandbox(Boolean(currentConfig.is_sandbox));
      setTestResult(null);
      setTestError(null);
      setSaveSuccess(false);
      setDiscoveredAccounts([]);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await metaApi.testConnection(
        {
          accessToken: accessToken.trim() || undefined,
          appId: appId.trim() || undefined,
          appSecret: appSecret.trim() || undefined,
          apiVersion,
          adAccountId: adAccountId.trim() || undefined,
        },
        user
      );
      setTestResult(res);
      if (res.ad_accounts && res.ad_accounts.length > 0) {
        setDiscoveredAccounts(res.ad_accounts as any);
        if (!adAccountId) {
          setAdAccountId(res.ad_accounts[0].id);
        }
      }
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDiscoverAccounts = async () => {
    setIsDiscovering(true);
    setDiscoveryError(null);
    try {
      if (accessToken.trim()) {
        // Run test with raw token to fetch accounts
        const res = await metaApi.testConnection(
          {
            accessToken: accessToken.trim(),
            appId: appId.trim() || undefined,
            appSecret: appSecret.trim() || undefined,
            apiVersion,
          },
          user
        );
        if (res.ad_accounts) {
          setDiscoveredAccounts(res.ad_accounts as any);
          if (res.ad_accounts.length > 0 && !adAccountId) {
            setAdAccountId(res.ad_accounts[0].id);
          }
        }
      } else {
        const accounts = await metaApi.discoverAdAccounts(user);
        setDiscoveredAccounts(accounts);
        if (accounts.length > 0 && !adAccountId) {
          setAdAccountId(accounts[0].id);
        }
      }
    } catch (err: unknown) {
      setDiscoveryError(err instanceof Error ? err.message : 'Failed to discover ad accounts');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTestError(null);

    try {
      await metaApi.configure(
        {
          accessToken: accessToken.trim() || undefined,
          appId: appId.trim() || undefined,
          appSecret: appSecret.trim() || undefined,
          adAccountId: adAccountId.trim() || undefined,
          apiVersion,
          syncFrequencyMinutes: Number(syncFrequency),
          syncWindowDays: Number(syncWindowDays),
          isSandbox,
        },
        user
      );
      setSaveSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Meta Ads API & Account Setup
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Graph v21.0
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Configure Meta System User or User Access Tokens for campaign synchronization.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Security Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 text-xs leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-950">Hardware AES-256-GCM Encryption: </span>
              Access tokens and app secrets are encrypted inside isolated tenant vault storage and never exposed to the browser.
            </div>
          </div>

          {/* Access Token Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Meta Access Token (System User / User Token) <span className="text-rose-500">*</span>
              </label>
              <a
                href="https://developers.facebook.com/docs/marketing-api/overview/authentication"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Meta Token Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showAccessToken ? 'text' : 'password'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={currentConfig.access_token ? '•••••••••••••••••••••••••••••••• (Encrypted in Vault)' : 'EAAB••••••••••••••••••••••••••••••••'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono text-xs pr-10"
              />
              <button
                type="button"
                onClick={() => setShowAccessToken(!showAccessToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Required permissions: <code className="text-slate-700 font-mono bg-slate-100 px-1 py-0.5 rounded">ads_read</code>, <code className="text-slate-700 font-mono bg-slate-100 px-1 py-0.5 rounded">read_insights</code>, <code className="text-slate-700 font-mono bg-slate-100 px-1 py-0.5 rounded">business_management</code>.
            </p>
          </div>

          {/* Primary Ad Account ID & Discovery */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Primary Ad Account ID <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleDiscoverAccounts}
                disabled={isDiscovering}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
              >
                {isDiscovering ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Search className="w-3 h-3" />
                )}
                Discover Authorized Accounts
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={adAccountId}
                onChange={(e) => setAdAccountId(e.target.value)}
                placeholder="act_894120938475612"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono text-xs"
              />
            </div>

            {/* Discovered Accounts Picker */}
            {discoveredAccounts.length > 0 && (
              <div className="mt-2 p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Authorized Ad Accounts Found ({discoveredAccounts.length})</span>
                  <span className="text-[10px] text-slate-500">Click to select primary</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {discoveredAccounts.map((acc) => {
                    const isSelected = adAccountId === acc.id || adAccountId === `act_${acc.account_id}`;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setAdAccountId(acc.id.startsWith('act_') ? acc.id : `act_${acc.id}`)}
                        className={`w-full text-left p-2 rounded-md text-xs flex items-center justify-between border transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{acc.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">({acc.id})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            {acc.currency || 'INR'}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {discoveryError && (
              <p className="text-xs text-rose-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {discoveryError}
              </p>
            )}
          </div>

          {/* App ID & Secret Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Meta Developer App ID</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="109827364512984"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Meta Developer App Secret</label>
              <div className="relative">
                <input
                  type={showAppSecret ? 'text' : 'password'}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={currentConfig.app_secret ? '•••••••••••••••• (Encrypted)' : 'sec_••••••••••••••••'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAppSecret(!showAppSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showAppSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Sync Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Graph API Version</label>
              <select
                value={apiVersion}
                onChange={(e) => setApiVersion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="v21.0">v21.0 (Latest Stable)</option>
                <option value="v20.0">v20.0</option>
                <option value="v19.0">v19.0</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Auto-Sync Frequency</label>
              <select
                value={syncFrequency}
                onChange={(e) => setSyncFrequency(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 1 hour (Default)</option>
                <option value={360}>Every 6 hours</option>
                <option value={1440}>Once daily</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Attribution Rolling Window</label>
              <select
                value={syncWindowDays}
                onChange={(e) => setSyncWindowDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value={3}>Last 3 Days</option>
                <option value={7}>Last 7 Days (Standard)</option>
                <option value={14}>Last 14 Days</option>
                <option value={30}>Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Test Feedback Area */}
          {testResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/80 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">{testResult.message}</div>
                <div className="text-[11px] opacity-80">
                  Latency: {testResult.latency_ms}ms • Graph API {apiVersion} operational.
                </div>
              </div>
            </div>
          )}

          {testError && (
            <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/80 text-rose-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Connection Error: </span>
                {testError}
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Configuration encrypted and saved successfully!
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isTesting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              )}
              Test Connection
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Save & Encrypt Credentials
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
