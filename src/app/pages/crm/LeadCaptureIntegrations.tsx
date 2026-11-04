import React, { useState, useEffect } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Terminal, 
  Copy, 
  ShieldCheck,
  Zap,
  Code
} from 'lucide-react';
import { CrmApi } from '../../../services/crmApi';
import type { CrmIntegrationConfig } from '../../../types/crm';

interface LeadCaptureIntegrationsProps {
  onNavigate?: (path: string) => void;
}

export const LeadCaptureIntegrations: React.FC<LeadCaptureIntegrationsProps> = ({ onNavigate }) => {
  const [configs, setConfigs] = useState<CrmIntegrationConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  // Simulator State
  const [simPayload, setSimPayload] = useState<string>(JSON.stringify({
    source: "indiamart",
    first_name: "Rajesh",
    last_name: "Kumar",
    company_name: "Aggarwal Mega Hardware Pvt Ltd",
    email: "rajesh@aggarwalhardware.in",
    phone: "+91 98112 34567",
    city: "Jaipur",
    state: "Rajasthan",
    requirement: "Immediate dispatch required for 500 units of heavy duty commercial door fittings. Please quote wholesale prices.",
    estimated_value: 450000
  }, null, 2));

  const [simResult, setSimResult] = useState<any | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const configsData = await CrmApi.getIntegrationConfigs();
      setConfigs(configsData);
    } catch (err) {
      console.error('Failed to load integration data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunSimulator = async () => {
    setSimError(null);
    setSimResult(null);
    setSimulating(true);

    try {
      let parsed;
      try {
        parsed = JSON.parse(simPayload);
      } catch (err: any) {
        setSimError('Invalid JSON format: ' + err.message);
        setSimulating(false);
        return;
      }

      const res = await CrmApi.simulateInboundLead(parsed);
      setSimResult(res);
      // Reload configs to refresh counts
      await loadData();
    } catch (err: any) {
      setSimError(err.message || 'Network request failed');
    } finally {
      setSimulating(false);
    }
  };

  const handleCopyEndpoint = () => {
    const fullUrl = window.location.origin + '/api/crm/webhooks/inbound';
    navigator.clipboard.writeText(fullUrl);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getSourceStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Connected & Active</span>;
      case 'awaiting_credentials':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">Awaiting Credentials</span>;
      case 'config_required':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-full">Configuration Required</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lead Capture & Integrations</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Webhook Engine Live
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Universal ingestion endpoint for website inquiry forms, B2B marketplaces (IndiaMART, TradeIndia), and Meta Ads leads.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Connectors
        </button>
      </div>

      {/* Ingestion Endpoint Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Production Inbound Webhook URL
            </div>
            <div className="font-mono text-sm bg-black/40 px-3 py-1.5 rounded border border-white/10 text-emerald-400 select-all">
              {typeof window !== 'undefined' ? window.location.origin : 'https://jyotsvan.enterprise'}/api/crm/webhooks/inbound
            </div>
            <p className="text-xs text-slate-400">
              Payloads are authenticated via idempotency key and phone deduplication check. Automatically parses lead source, company, contact, and scores readiness.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyEndpoint}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copiedKey ? 'Copied!' : 'Copy Endpoint'}
            </button>
          </div>
        </div>
      </div>

      {/* Connectors Grid */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3">Commercial Inbound Channels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((cfg) => (
            <div key={cfg.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-sm">{cfg.provider_name}</h3>
                  {getSourceStatusBadge(cfg.status)}
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {cfg.status === 'awaiting_credentials' 
                    ? 'API credentials pending configuration in enterprise vault.' 
                    : 'Ingestion pipeline established and ready for webhook payloads.'}
                </p>
                <div className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                  provider_key: {cfg.provider_key}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Webhook Ingestion</span>
                <span className="text-emerald-600 font-medium">Ready</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Webhook Simulator */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Interactive Lead Ingestion Simulator</h2>
            <p className="text-xs text-slate-500">Test live payload dispatch to verify lead creation, duplicate detection, and dynamic scoring</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Simulated Inbound JSON Payload
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSimPayload(JSON.stringify({
                    source: "website_inbound",
                    first_name: "Anil",
                    last_name: "Singhania",
                    company_name: "Singhania Building Materials Co",
                    email: "anil@singhaniabuilders.com",
                    phone: "+91 99887 66554",
                    city: "Ahmedabad",
                    state: "Gujarat",
                    requirement: "Need bulk wholesale catalog and pricing for commercial PVC fixtures.",
                    estimated_value: 850000
                  }, null, 2))}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Load Webform Preset
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSimPayload(JSON.stringify({
                    source: "meta_ads",
                    first_name: "Vikram",
                    last_name: "Malhotra",
                    company_name: "Malhotra Enterprises & Hardware",
                    email: "vikram@malhotrahardware.in",
                    phone: "+91 98223 34455",
                    city: "Pune",
                    state: "Maharashtra",
                    requirement: "Interested in dealership franchise for Maharashtra territory.",
                    estimated_value: 1200000
                  }, null, 2))}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Load Meta Ads Preset
                </button>
              </div>
            </div>

            <textarea
              rows={12}
              value={simPayload}
              onChange={(e) => setSimPayload(e.target.value)}
              className="w-full font-mono text-xs bg-slate-900 text-slate-100 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700"
            />

            <button
              onClick={handleRunSimulator}
              disabled={simulating}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <Send className="w-4 h-4" />
              {simulating ? 'Transmitting Inbound Webhook...' : 'Transmit Inbound Webhook to Live Endpoint'}
            </button>
          </div>

          {/* Results Display */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Server Ingestion Response & Execution Trace
            </label>

            {simError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Ingestion Failed</div>
                  <div>{simError}</div>
                </div>
              </div>
            )}

            {simResult ? (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">{simResult.message || 'Webhook successfully processed!'}</div>
                    <div className="mt-1">
                      Lead ID: <strong className="font-mono">{simResult.lead_id || simResult.lead?.id}</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-100 p-4 rounded-lg border border-slate-800 max-h-[260px] overflow-y-auto">
                  <pre className="font-mono text-xs leading-relaxed text-emerald-400">
                    {JSON.stringify(simResult, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-[320px] border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Code className="w-8 h-8 text-slate-300 mb-2" />
                <span className="text-xs font-medium text-slate-500">Ready to receive webhook test</span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Click the transmit button to trigger the server-side validator, deduplicator, score calculator, and database writer.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
