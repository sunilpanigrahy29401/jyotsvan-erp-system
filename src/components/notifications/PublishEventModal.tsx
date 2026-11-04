// src/components/notifications/PublishEventModal.tsx
// Interactive Business Event Simulator for Live Notification Engine Testing (Phase 22)

import { useState } from 'react';
import { X, Send, Sparkles, AlertCircle, Check, Loader2, Play } from 'lucide-react';
import { NotificationsAPI } from '../../services/notifications-api.ts';
import type { NotificationType, NotificationPriority, NotificationCategory } from '../../types/notifications.ts';

interface PublishEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventPublished?: () => void;
}

const PRESET_EVENTS: {
  label: string;
  category: NotificationCategory;
  eventType: NotificationType;
  priority: NotificationPriority;
  entityType: string;
  entityId: string;
  payload: Record<string, any>;
}[] = [
  {
    label: 'Low Stock Alert (Inventory)',
    category: 'inventory',
    eventType: 'LOW_STOCK',
    priority: 'high',
    entityType: 'inventory_item',
    entityId: 'sku-rm-lav-01',
    payload: {
      product_name: 'Organic Lavender Essential Oil',
      sku_code: 'SKU-RM-LAV-01',
      current_qty: '12.50',
      reorder_level: '50.00',
      uom: 'L',
      facility_name: 'Central Depot Bay 04',
    },
  },
  {
    label: 'QC Inspection Required (Quality)',
    category: 'quality',
    eventType: 'QC_INSPECTION_PENDING',
    priority: 'high',
    entityType: 'quality_inspection',
    entityId: 'qc-insp-new-01',
    payload: {
      sample_type: 'Raw Material Inward',
      sample_number: 'SMP-2026-901',
      lot_number: 'LOT-2026-099',
      sku_code: 'RM-EXT-ALOE',
      facility_name: 'Plant 01 QC Lab',
    },
  },
  {
    label: 'Purchase Requisition Submitted (Procurement)',
    category: 'procurement',
    eventType: 'PURCHASE_REQUEST_PENDING_APPROVAL',
    priority: 'high',
    entityType: 'purchase_requisition',
    entityId: 'pr-2026-102',
    payload: {
      pr_number: 'PR-2026-102',
      requester_name: 'Arthur Pendelton',
      department_name: 'Manufacturing & Staging',
      currency: 'INR',
      total_amount: '3,15,000.00',
    },
  },
  {
    label: 'Leave Request Application (People)',
    category: 'people',
    eventType: 'LEAVE_REQUESTED',
    priority: 'high',
    entityType: 'leave_request',
    entityId: 'lr-2026-044',
    payload: {
      employee_name: 'Priya Patel',
      leave_type: 'Sick Leave',
      days_count: '2',
      start_date: '2026-03-22',
      end_date: '2026-03-23',
      reason: 'Medical consultation & rest',
    },
  },
  {
    label: 'Commercial Sales Order Submitted (Sales)',
    category: 'sales',
    eventType: 'SALES_ORDER_PENDING_APPROVAL',
    priority: 'high',
    entityType: 'sales_order',
    entityId: 'so-2026-891',
    payload: {
      order_number: 'SO-2026-891',
      customer_name: 'Grand Wholesale Mart',
      currency: 'INR',
      total_amount: '5,40,000.00',
    },
  },
  {
    label: 'Overdue Invoice Reminder (Finance)',
    category: 'finance',
    eventType: 'INVOICE_OVERDUE',
    priority: 'high',
    entityType: 'invoice',
    entityId: 'inv-2026-092',
    payload: {
      invoice_number: 'INV-2026-092',
      customer_name: 'Reliance Retail Depot',
      currency: 'INR',
      outstanding_amount: '2,80,000.00',
      days_overdue: '18',
      due_date: '2026-03-02',
    },
  },
  {
    label: 'Security Login from New IP (Security)',
    category: 'security',
    eventType: 'SECURITY_NEW_LOGIN',
    priority: 'high',
    entityType: 'audit_log',
    entityId: 'sec-log-099',
    payload: {
      ip_address: '103.24.18.91',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user_agent: 'Firefox 124 on Linux x86_64',
    },
  },
];

export function PublishEventModal({ isOpen, onClose, onEventPublished }: PublishEventModalProps) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const preset = PRESET_EVENTS[selectedPresetIndex];

  const handlePublish = async () => {
    setIsPublishing(true);
    setErrorMessage(null);
    try {
      const orgId = localStorage.getItem('jyotsvan_active_org_id') || 'org-jyotsvan-corp';
      const userId = localStorage.getItem('jyotsvan_active_user_id') || 'usr-super-admin';

      await NotificationsAPI.publishEvent({
        organizationId: orgId,
        eventType: preset.eventType,
        entityType: preset.entityType,
        entityId: `${preset.entityId}-${Date.now()}`,
        targetUserId: userId,
        priority: preset.priority,
        category: preset.category,
        payload: preset.payload,
      });

      setPublishSuccess(true);
      onEventPublished?.();
      setTimeout(() => {
        setPublishSuccess(false);
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish event');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in-0">
      <div
        id="publish-event-modal"
        className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Sparkles className="h-4.5 w-4.5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Simulate Business Event</h3>
              <p className="text-xs text-slate-500">Trigger live cross-module event to test real-time notification delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900">Select Event Scenario</label>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
              {PRESET_EVENTS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPresetIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    selectedPresetIndex === idx
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-medium text-slate-900 truncate">{item.label}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{item.category} • Priority: {item.priority}</p>
                  </div>
                  {selectedPresetIndex === idx && <Check className="h-4 w-4 text-slate-900 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1 text-xs font-mono">
            <div className="text-slate-500 text-[11px] font-sans font-medium uppercase tracking-wider mb-1">Payload Preview</div>
            <div className="text-slate-700 text-[11px] overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(preset.payload, null, 2)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-3.5">
          <div className="text-xs text-slate-500">Delivered directly via SSE</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Broadcasting...</span>
                </>
              ) : publishSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Delivered!</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Dispatch Event</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
