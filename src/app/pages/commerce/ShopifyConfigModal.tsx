// src/app/pages/commerce/ShopifyConfigModal.tsx
// Phase 25: Direct API & Store Credential Configuration Modal for Shopify

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  ShoppingBag,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
  Clock,
  Zap,
  X,
} from 'lucide-react';
import { shopifyApi } from '../../../services/shopifyApi.ts';
import { useAuth } from '../../../context/AuthContext.tsx';
import { useToast } from '../../../context/ToastContext.tsx';
import type { IntegrationConnection } from '../../../types/integrations.ts';

interface ShopifyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection?: IntegrationConnection | null;
  onSuccess: () => void;
}

export function ShopifyConfigModal({
  isOpen,
  onClose,
  connection,
  onSuccess,
}: ShopifyConfigModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [shopDomain, setShopDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [apiVersion, setApiVersion] = useState('2026-01');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [syncFrequency, setSyncFrequency] = useState(15);
  const [isSandbox, setIsSandbox] = useState(false);
  const [connectionName, setConnectionName] = useState('');

  const [showToken, setShowToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latency_ms: number;
    shop?: any;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (connection) {
        const config = (connection.configuration || {}) as Record<string, any>;
        setShopDomain(config.shop_domain ? String(config.shop_domain) : '');
        setApiVersion(config.api_version ? String(config.api_version) : '2026-01');
        setSyncFrequency(Number(config.sync_frequency_minutes) || 15);
        setIsSandbox((connection as any).environment === 'sandbox');
        setConnectionName(connection.name || '');
      } else {
        setShopDomain('');
        setApiVersion('2026-01');
        setSyncFrequency(15);
        setIsSandbox(false);
        setConnectionName('Shopify D2C Storefront');
      }
      setAccessToken('');
      setWebhookSecret('');
      setTestResult(null);
      setShowToken(false);
      setShowWebhookSecret(false);
    }
  }, [isOpen, connection]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!shopDomain.trim()) {
      showToast('Please enter your Shopify store domain', 'error');
      return;
    }
    if (!accessToken.trim()) {
      showToast('Please enter your Shopify Admin API Access Token', 'error');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await shopifyApi.testConnection(
        {
          shop_domain: shopDomain.trim(),
          admin_api_access_token: accessToken.trim(),
          api_version: apiVersion,
        },
        user
      );
      setTestResult(res);
      showToast(res.message || 'Connection verified successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection test failed';
      setTestResult({
        success: false,
        message: msg,
        latency_ms: 0,
      });
      showToast(msg, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopDomain.trim()) {
      showToast('Shop domain is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await shopifyApi.configureStore(
        {
          shop_domain: shopDomain.trim(),
          admin_api_access_token: accessToken.trim() || undefined,
          api_version: apiVersion,
          webhook_secret: webhookSecret.trim() || undefined,
          sync_frequency_minutes: Number(syncFrequency),
          connection_name: connectionName.trim() || undefined,
          is_sandbox: isSandbox,
        },
        user
      );

      showToast(res.message || 'Shopify store connected successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save store configuration';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Connect Shopify Store</h3>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
                  Phase 25 Live
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                Configure your live Admin API Access Token to stream catalog, stock, and orders.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Security Vault Banner */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <span className="font-bold text-emerald-950">AES-256-GCM Hardware Encrypted:</span> API keys are
              encrypted at rest in PostgreSQL before storage. Tokens are never exposed to browser client sessions.
            </div>
          </div>

          {/* Guide Accordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100/70 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                How to obtain your Shopify Admin API Token in 2 minutes
              </span>
              {showGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showGuide && (
              <div className="px-4 pb-4 pt-2 text-xs text-slate-600 space-y-2 border-t border-slate-200 bg-white">
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-slate-700">
                  <li>
                    Open your <strong>Shopify Admin</strong> &rarr; <strong>Settings</strong> &rarr;{' '}
                    <strong>Apps and sales channels</strong>.
                  </li>
                  <li>
                    Click <strong>Develop apps</strong> &rarr; <strong>Create an app</strong> (Name: <em>Jyotsvan ERP</em>).
                  </li>
                  <li>
                    Click <strong>Configure Admin API scopes</strong> and enable:{' '}
                    <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">read_products, write_products, read_orders, write_orders, read_inventory, write_inventory, read_customers, read_locations</code>.
                  </li>
                  <li>
                    Click <strong>Save</strong> and then <strong>Install App</strong>.
                  </li>
                  <li>
                    Under <strong>API credentials</strong>, click <strong>Reveal token once</strong> and copy the token starting with <code className="font-mono text-emerald-700 font-bold">shpat_...</code>.
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Store Domain */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Shopify Store Domain / URL <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-4 h-4" />
                </div>
                <Input
                  type="text"
                  required
                  placeholder="e.g. your-store.myshopify.com"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  className="pl-9 text-xs font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Enter your <code className="font-mono text-slate-700">.myshopify.com</code> handle or custom domain.
              </p>
            </div>

            {/* Admin API Access Token */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Admin API Access Token <span className="text-rose-500">*</span>
                </label>
                {connection && (
                  <span className="text-[11px] text-slate-400 italic">Leave empty to keep existing encrypted token</span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder={connection ? '••••••••••••••••••••••••••••••••••••••••' : 'shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="pl-9 pr-10 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Generated from Shopify App Development with <code className="font-mono text-slate-700">shpat_</code> prefix.
              </p>
            </div>

            {/* API Version & Sync Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Shopify API Version</label>
                <select
                  value={apiVersion}
                  onChange={(e) => setApiVersion(e.target.value)}
                  className="w-full text-xs font-mono rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="2026-01">2026-01 (Latest Stable)</option>
                  <option value="2025-10">2025-10</option>
                  <option value="2025-07">2025-07</option>
                  <option value="2025-04">2025-04</option>
                  <option value="2025-01">2025-01</option>
                  <option value="2024-10">2024-10</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Auto-Sync Frequency</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <select
                    value={syncFrequency}
                    onChange={(e) => setSyncFrequency(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={5}>Every 5 minutes</option>
                    <option value={15}>Every 15 minutes (Recommended)</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every 1 hour</option>
                    <option value={360}>Every 6 hours</option>
                    <option value={1440}>Once daily</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Webhook Secret (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Webhook Signing Secret <span className="text-slate-400 font-normal">(Optional for HMAC verification)</span>
              </label>
              <div className="relative">
                <Input
                  type={showWebhookSecret ? 'text' : 'password'}
                  placeholder="e.g. shpss_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="pr-10 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Webhook endpoint:{' '}
                <code className="font-mono text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">
                  /api/integrations/webhooks/shopify
                </code>
              </p>
            </div>

            {/* Environment Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-800">Development / Partner Sandbox Mode</p>
                <p className="text-[11px] text-slate-500">Enable when connecting a test store or development store.</p>
              </div>
              <input
                type="checkbox"
                checked={isSandbox}
                onChange={(e) => setIsSandbox(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Test Diagnostics Result */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs space-y-1">
                <p className="font-bold">{testResult.message}</p>
                {testResult.success && testResult.shop && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-[11px] text-emerald-800 font-mono">
                    <div>
                      <span className="font-semibold text-emerald-950">Store Name:</span> {testResult.shop.name}
                    </div>
                    <div>
                      <span className="font-semibold text-emerald-950">Currency:</span> {testResult.shop.currency}
                    </div>
                    <div>
                      <span className="font-semibold text-emerald-950">Email:</span> {testResult.shop.email}
                    </div>
                    <div>
                      <span className="font-semibold text-emerald-950">Latency:</span> {testResult.latency_ms}ms
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={isTesting || isSaving || !shopDomain.trim()}
              className="w-full sm:w-auto border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-600" />
                  Testing API...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Test Live Connection
                </>
              )}
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Encrypting & Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Save & Connect Store
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
