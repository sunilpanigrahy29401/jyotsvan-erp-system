// src/app/pages/settings/integrations/RestConsolePlayground.tsx
// Interactive Custom REST API Runner & Proxy Testing Console

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import {
  Terminal,
  Play,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Code2,
} from 'lucide-react';
import type { IntegrationConnection } from '../../../../types/integrations.ts';
import { integrationApi } from '../../../../services/integrationApi.ts';
import { useAuth } from '../../../../context/AuthContext.tsx';
import { useToast } from '../../../../context/ToastContext.tsx';

interface RestConsolePlaygroundProps {
  connections: IntegrationConnection[];
  initialConnectionId?: string | null;
  onRefreshLogs?: () => void;
}

export function RestConsolePlayground({
  connections,
  initialConnectionId,
  onRefreshLogs,
}: RestConsolePlaygroundProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const restConnections = connections.filter((c) => c.status === 'connected');

  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    initialConnectionId || restConnections[0]?.id || ''
  );
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [path, setPath] = useState('/products');
  const [headersJson, setHeadersJson] = useState('{\n  "Accept": "application/json"\n}');
  const [bodyJson, setBodyJson] = useState('{\n  "sample": true\n}');

  const [isExecuting, setIsExecuting] = useState(false);
  const [responseOutput, setResponseOutput] = useState<{
    status: number;
    data: unknown;
    latencyMs: number;
    headers: Record<string, string>;
  } | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  useEffect(() => {
    if (initialConnectionId) {
      setSelectedConnectionId(initialConnectionId);
    } else if (!selectedConnectionId && restConnections.length > 0) {
      setSelectedConnectionId(restConnections[0].id);
    }
  }, [initialConnectionId, restConnections]);

  const selectedConnection = connections.find((c) => c.id === selectedConnectionId);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnectionId) {
      showToast('Please select an active integration connection.', 'error');
      return;
    }

    setIsExecuting(true);
    setResponseOutput(null);
    setExecutionError(null);

    let parsedHeaders: Record<string, string> = {};
    if (headersJson.trim()) {
      try {
        parsedHeaders = JSON.parse(headersJson);
      } catch (err) {
        showToast('Invalid JSON in Request Headers editor', 'error');
        setIsExecuting(false);
        return;
      }
    }

    let parsedBody: unknown = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method) && bodyJson.trim()) {
      try {
        parsedBody = JSON.parse(bodyJson);
      } catch (err) {
        showToast('Invalid JSON in Request Body editor', 'error');
        setIsExecuting(false);
        return;
      }
    }

    try {
      const res = await integrationApi.executeRest(
        selectedConnectionId,
        {
          method,
          path: path.trim() || '/',
          headers: parsedHeaders,
          body: parsedBody,
        },
        user
      );
      setResponseOutput(res);
      showToast(`Request executed successfully (${res.status} in ${res.latencyMs}ms)`, 'success');
      onRefreshLogs?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      setExecutionError(msg);
      showToast(msg, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const copyResponse = () => {
    if (responseOutput?.data) {
      navigator.clipboard.writeText(JSON.stringify(responseOutput.data, null, 2));
      showToast('Response JSON copied to clipboard', 'info');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Terminal className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-700">
            <span className="font-bold text-slate-900 text-sm">Interactive REST Proxy Runner</span>
            <p className="mt-0.5 text-slate-500">
              Dispatch authenticated outbound requests through the secure proxy kernel. Headers, auth tokens, and SSRF restrictions are applied automatically server-side.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex-shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" /> SSRF Shield Guarded
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Request Form Panel */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Request Composer</span>
                {selectedConnection && (
                  <Badge variant="outline" className="text-[10px] font-mono font-normal">
                    Target: {String(selectedConnection.configuration?.base_url || selectedConnection.name)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <form onSubmit={handleExecute} className="space-y-3">
                {/* Connection Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Connection <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedConnectionId}
                    onChange={(e) => setSelectedConnectionId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    {restConnections.length === 0 ? (
                      <option value="">No active connections available</option>
                    ) : (
                      restConnections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.provider_key})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Method & Path */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HTTP Method & Path <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as any)}
                      className="w-24 h-9 px-2 rounded-md border border-slate-300 bg-slate-50 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <Input
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      placeholder="/api/v1/resource or full path"
                      className="h-9 text-xs font-mono flex-1"
                      required
                    />
                  </div>
                </div>

                {/* Custom Headers */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Custom Headers (JSON)</label>
                    <span className="text-[10px] text-slate-400 font-mono">Auth headers injected automatically</span>
                  </div>
                  <Textarea
                    value={headersJson}
                    onChange={(e) => setHeadersJson(e.target.value)}
                    rows={2}
                    className="font-mono text-xs bg-slate-900 text-slate-100 p-2.5 rounded-md resize-none"
                    placeholder='{"X-Custom-Header": "value"}'
                  />
                </div>

                {/* Request Body (for mutation methods) */}
                {['POST', 'PUT', 'PATCH'].includes(method) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Request Body (JSON)
                    </label>
                    <Textarea
                      value={bodyJson}
                      onChange={(e) => setBodyJson(e.target.value)}
                      rows={5}
                      className="font-mono text-xs bg-slate-900 text-slate-100 p-2.5 rounded-md resize-y"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isExecuting || !selectedConnectionId}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 font-medium"
                >
                  <Play className={`w-3.5 h-3.5 mr-1.5 ${isExecuting ? 'animate-spin' : ''}`} />
                  {isExecuting ? 'Dispatching Request...' : 'Send Request via Proxy'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Response Output Panel */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white h-full flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Response Viewer</span>
                  {responseOutput && (
                    <Badge
                      className={`text-[10px] font-mono ${
                        responseOutput.status >= 200 && responseOutput.status < 300
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {responseOutput.status} OK
                    </Badge>
                  )}
                  {responseOutput && (
                    <span className="text-xs text-slate-500 font-mono">
                      {responseOutput.latencyMs}ms
                    </span>
                  )}
                </CardTitle>

                {responseOutput && (
                  <Button variant="ghost" size="sm" onClick={copyResponse} className="h-7 text-xs text-slate-600">
                    <Copy className="w-3 h-3 mr-1" /> Copy JSON
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col">
              {isExecuting ? (
                <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center text-slate-500 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mb-2" />
                  Dispatching through secure SSRF gateway...
                </div>
              ) : executionError ? (
                <div className="flex-1 min-h-[260px] p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs font-mono">
                  <div className="font-bold flex items-center gap-1.5 mb-2 font-sans text-rose-800">
                    <AlertCircle className="w-4 h-4" /> Request Failed
                  </div>
                  <p className="whitespace-pre-wrap">{executionError}</p>
                </div>
              ) : responseOutput ? (
                <div className="flex-1 flex flex-col space-y-2">
                  <pre className="flex-1 bg-slate-900 text-emerald-400 p-3.5 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed max-h-[380px] overflow-y-auto">
                    {JSON.stringify(responseOutput.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center text-slate-400 text-xs text-center p-8">
                  <Code2 className="w-8 h-8 text-slate-300 mb-2" />
                  <p>Send a request to preview parsed JSON response payload, status codes, and server response headers.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
