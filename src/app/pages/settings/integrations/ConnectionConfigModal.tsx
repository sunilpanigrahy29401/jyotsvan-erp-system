// src/app/pages/settings/integrations/ConnectionConfigModal.tsx
// Dynamic schema-driven modal for provisioning and editing integration connections

import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { ProviderIcon } from './ProviderIcon.tsx';
import type { IntegrationProvider, IntegrationConnection, ConnectionTestResult } from '../../../../types/integrations.ts';
import { integrationApi } from '../../../../services/integrationApi.ts';
import { useAuth } from '../../../../context/AuthContext.tsx';
import { useToast } from '../../../../context/ToastContext.tsx';

interface ConnectionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: IntegrationProvider | null;
  connection?: IntegrationConnection | null;
  onSuccess: () => void;
}

export function ConnectionConfigModal({
  isOpen,
  onClose,
  provider,
  connection,
  onSuccess,
}: ConnectionConfigModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [connectionName, setConnectionName] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [credentialsData, setCredentialsData] = useState<Record<string, any>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (provider) {
      if (connection) {
        setConnectionName(connection.name);
        setFormData(connection.configuration || {});
        setCredentialsData({});
      } else {
        setConnectionName(`${provider.name} (Primary)`);
        const initialConfig: Record<string, any> = {};
        provider.configuration_schema?.fields?.forEach((f) => {
          if (f.defaultValue !== undefined) {
            initialConfig[f.key] = f.defaultValue;
          }
        });
        setFormData(initialConfig);
        setCredentialsData({});
      }
      setTestResult(null);
      setVisibleSecrets({});
    }
  }, [provider, connection, isOpen]);

  if (!provider) return null;

  const fields = provider.configuration_schema?.fields || [];

  const handleFieldChange = (key: string, value: any, isSecret = false) => {
    if (isSecret) {
      setCredentialsData((prev) => ({ ...prev, [key]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [key]: value }));
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      let res: ConnectionTestResult;
      if (connection) {
        res = await integrationApi.testConnection(connection.id, credentialsData, user);
      } else {
        res = await integrationApi.testUnsavedConnection(provider.provider_key, formData, credentialsData, user);
      }
      setTestResult(res);
      if (res.success) {
        showToast(res.message || 'Connection verified successfully!', 'success');
      } else {
        showToast(res.message || 'Connection test failed.', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test request failed';
      setTestResult({
        success: false,
        provider: provider.provider_key,
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
    if (!connectionName.trim()) {
      showToast('Please provide a connection name.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (connection) {
        await integrationApi.updateConnection(
          connection.id,
          {
            name: connectionName.trim(),
            configuration: formData,
            credentials: Object.keys(credentialsData).length > 0 ? credentialsData : undefined,
          },
          user
        );
        showToast(`Updated "${connectionName}" configuration.`, 'success');
      } else {
        await integrationApi.createConnection(
          {
            organization_id: user?.organization_id || 'org-jyotsvan-corp',
            provider_key: provider.provider_key,
            provider_id: provider.id,
            name: connectionName.trim(),
            configuration: formData,
            credentials: credentialsData,
            auth_type: formData.auth_type || 'api_key',
          },
          user
        );
        showToast(`Successfully connected to ${provider.name}!`, 'success');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save integration connection';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={connection ? 'Edit Integration Connection' : `Connect to ${provider.name}`}
      description={provider.description}
      maxWidth="lg"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTesting || isSubmitting}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Testing Connectivity...' : 'Test Connection'}
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting} className="text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4"
            >
              {isSubmitting ? 'Saving...' : connection ? 'Save Changes' : 'Connect Provider'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {/* Security Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold text-slate-900">Encrypted Enterprise Credential Vault: </span>
            All API keys, access tokens, and webhook secrets are encrypted at rest using AES-256-GCM. SSRF guards prevent outbound requests to private networks.
          </div>
        </div>

        {/* Connection Identifier */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Connection Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            placeholder="e.g. Jyotsvan Flagship Store (Production)"
            className="h-9 text-sm"
            required
          />
        </div>

        {/* Provider Schema Instructions */}
        {provider.configuration_schema?.instructions && (
          <div className="text-xs text-slate-600 bg-indigo-50/50 border border-indigo-100 rounded-md p-2.5">
            {provider.configuration_schema.instructions}
          </div>
        )}

        {/* Dynamic Configuration Fields */}
        {fields.map((f) => {
          const isSecret = f.type === 'secret' || f.secret;
          const fieldVal = isSecret ? credentialsData[f.key] || '' : formData[f.key] || '';
          const isVisible = visibleSecrets[f.key];

          return (
            <div key={f.key} className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                {f.label} {f.required && <span className="text-rose-500">*</span>}
              </label>

              {f.type === 'select' ? (
                <select
                  value={formData[f.key] || f.defaultValue || ''}
                  onChange={(e) => handleFieldChange(f.key, e.target.value, false)}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required={f.required}
                >
                  {f.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : isSecret ? (
                <div className="relative">
                  <Input
                    type={isVisible ? 'text' : 'password'}
                    value={fieldVal}
                    onChange={(e) => handleFieldChange(f.key, e.target.value, true)}
                    placeholder={
                      connection
                        ? '•••••••••••••••• (Leave blank to keep existing)'
                        : f.placeholder || 'Enter secret credential'
                    }
                    className="h-9 text-sm pr-10"
                    required={!connection && f.required}
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility(f.key)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <Input
                  type={f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : 'text'}
                  value={fieldVal}
                  onChange={(e) => handleFieldChange(f.key, e.target.value, false)}
                  placeholder={f.placeholder}
                  className="h-9 text-sm"
                  required={f.required}
                />
              )}

              {f.helpText && <p className="text-[11px] text-slate-500 mt-0.5">{f.helpText}</p>}
            </div>
          );
        })}

        {/* Test Connection Output */}
        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-semibold">{testResult.success ? 'Verification Succeeded' : 'Verification Failed'}</div>
              <div className="mt-0.5">{testResult.message}</div>
              {testResult.latency_ms !== undefined && (
                <div className="mt-1 text-[11px] opacity-75 font-mono">Response Latency: {testResult.latency_ms}ms</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
