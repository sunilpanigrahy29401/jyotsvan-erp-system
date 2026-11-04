// src/app/pages/settings/integrations/WebhooksManager.tsx
// Inbound Webhooks Manager, Endpoint Directory & HMAC Secret Rotation

import React, { useState } from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import {
  Webhook,
  Copy,
  Check,
  RefreshCw,
  Lock,
  Key,
  Clock,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { IntegrationWebhook } from '../../../../types/integrations.ts';
import { integrationApi } from '../../../../services/integrationApi.ts';
import { useAuth } from '../../../../context/AuthContext.tsx';
import { useToast } from '../../../../context/ToastContext.tsx';

interface WebhooksManagerProps {
  webhooks: IntegrationWebhook[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function WebhooksManager({ webhooks, isLoading, onRefresh }: WebhooksManagerProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<{ id: string; secret: string } | null>(null);

  const copyEndpointUrl = (wh: IntegrationWebhook) => {
    const fullUrl = `${window.location.origin}${wh.webhook_url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(wh.id);
    showToast('Webhook endpoint URL copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRotateSecret = async (wh: IntegrationWebhook) => {
    if (!window.confirm(`Rotate HMAC signing secret for endpoint "${wh.endpoint_identifier}"? You must update your external webhook sender (Shopify, Meta, Razorpay) immediately.`)) {
      return;
    }

    setRotatingId(wh.id);
    try {
      const res = await integrationApi.rotateWebhookSecret(wh.id, user);
      setRevealedSecret({ id: wh.id, secret: res.newSecret });
      showToast('HMAC signing secret rotated successfully.', 'success');
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rotation failed';
      showToast(msg, 'error');
    } finally {
      setRotatingId(null);
    }
  };

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return 'No events received yet';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-start gap-3 text-xs text-slate-700">
        <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold text-slate-900 text-sm">Enterprise Webhook Gateway Architecture</div>
          <p className="mt-1 leading-relaxed">
            All inbound payloads sent to these URLs undergo strict constant-time HMAC-SHA256 signature verification. Payloads are verified, logged to immutable traces, and deduplicated using idempotency keys.
          </p>
        </div>
      </div>

      {/* Webhooks List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">Loading webhook endpoints...</div>
      ) : webhooks.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <Webhook className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No active webhook endpoints</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When you configure connectors that support webhooks (such as Generic Webhooks, Shopify, or Razorpay), secure endpoints are auto-provisioned here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => {
            const isCopied = copiedId === wh.id;
            const isRotating = rotatingId === wh.id;
            const currentSecret = revealedSecret?.id === wh.id ? revealedSecret.secret : null;

            return (
              <Card key={wh.id} className="border border-slate-200 bg-white hover:border-indigo-200 transition-all">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {wh.endpoint_identifier}
                        </span>
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-mono">
                          {wh.provider}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-slate-600">
                          {wh.event_type}
                        </Badge>
                        <Badge
                          className={`text-[10px] ${
                            wh.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {wh.status}
                        </Badge>
                      </div>

                      {/* URL Box */}
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200 font-mono select-all">
                          {wh.webhook_url}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyEndpointUrl(wh)}
                          className="h-7 text-xs px-2"
                          title="Copy Webhook URL"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 mr-1" />
                          )}
                          {isCopied ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">{wh.events_received_count} events</div>
                        <div className="text-[11px] text-slate-500">{formatTimestamp(wh.last_received_at)}</div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRotateSecret(wh)}
                        disabled={isRotating}
                        className="h-8 text-xs text-slate-700"
                        title="Rotate HMAC Verification Secret"
                      >
                        <Key className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        {isRotating ? 'Rotating...' : 'Rotate Secret'}
                      </Button>
                    </div>
                  </div>

                  {/* Secret Display Box if just rotated */}
                  {currentSecret && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        New HMAC-SHA256 Signing Secret Generated:
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="bg-white px-2 py-1 rounded border border-amber-300 font-mono text-slate-900 select-all">
                          {currentSecret}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(currentSecret);
                            showToast('Secret copied to clipboard', 'info');
                          }}
                          className="h-6 text-[11px] text-amber-900 hover:bg-amber-100"
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      </div>
                      <p className="mt-1 text-[11px] text-amber-800">
                        Copy this secret into your webhook provider dashboard now. This value is encrypted at rest and will not be displayed again.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
