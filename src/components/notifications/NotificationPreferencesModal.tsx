// src/components/notifications/NotificationPreferencesModal.tsx
// Enterprise Notification Preferences Dialog (Phase 22)

import { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Bell,
  Mail,
  Smartphone,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle,
  Package,
  Layers,
  Factory,
  Warehouse,
  TrendingUp,
  Landmark,
  Users,
  Shield,
  Cog,
} from 'lucide-react';
import { NotificationsAPI } from '../../services/notifications-api.ts';
import type { NotificationCategory, NotificationCategoryPreference, NotificationPriority } from '../../types/notifications.ts';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesUpdated?: () => void;
}

const CATEGORY_DEFINITIONS: {
  category: NotificationCategory;
  label: string;
  description: string;
  icon: any;
  defaultPriority: NotificationPriority;
}[] = [
  {
    category: 'procurement',
    label: 'Procurement & Purchasing',
    description: 'Requisition approvals, PO sign-offs, and inward goods receipts.',
    icon: Package,
    defaultPriority: 'high',
  },
  {
    category: 'quality',
    label: 'Quality Control & Inspections',
    description: 'Sampling requests, assay results, quarantine locks, and COA releases.',
    icon: Layers,
    defaultPriority: 'high',
  },
  {
    category: 'manufacturing',
    label: 'Manufacturing & Production',
    description: 'Work orders, line allocations, material shortages, and batch completion.',
    icon: Factory,
    defaultPriority: 'high',
  },
  {
    category: 'warehouse',
    label: 'Warehouse & Transfers',
    description: 'Inter-facility transfers, dispatch manifests, and receipt verification.',
    icon: Warehouse,
    defaultPriority: 'normal',
  },
  {
    category: 'distribution',
    label: 'Distribution & C&F Network',
    description: 'Carrying & Forwarding dispatches, distributor allocations, and replenishment.',
    icon: Warehouse,
    defaultPriority: 'normal',
  },
  {
    category: 'inventory',
    label: 'Inventory & Stock Alerts',
    description: 'Low stock reorder thresholds, cycle count variances, and batch shelf-life alerts.',
    icon: Package,
    defaultPriority: 'high',
  },
  {
    category: 'sales',
    label: 'Sales Orders & Commercial',
    description: 'Order approvals, backorders, dispatch tracking, and customer deliveries.',
    icon: TrendingUp,
    defaultPriority: 'normal',
  },
  {
    category: 'finance',
    label: 'Finance & Invoicing',
    description: 'Tax invoices, payment collections, overdue receivables, and expense claims.',
    icon: Landmark,
    defaultPriority: 'high',
  },
  {
    category: 'field_sales',
    label: 'Field Sales & Beats',
    description: 'Store beat assignments, scheduled visits, missed check-ins, and field tasks.',
    icon: Users,
    defaultPriority: 'normal',
  },
  {
    category: 'people',
    label: 'People & Staff Management',
    description: 'Leave applications, attendance corrections, workforce tasks, and appraisals.',
    icon: Users,
    defaultPriority: 'normal',
  },
  {
    category: 'security',
    label: 'Security & Access Alerts',
    description: 'New logins, role updates, and critical permission modifications (non-disableable).',
    icon: Shield,
    defaultPriority: 'critical',
  },
  {
    category: 'system',
    label: 'System & Platform Ops',
    description: 'Scheduled maintenance, database backups, and webhook telemetry.',
    icon: Cog,
    defaultPriority: 'low',
  },
];

export function NotificationPreferencesModal({
  isOpen,
  onClose,
  onPreferencesUpdated,
}: NotificationPreferencesModalProps) {
  const [categoryPrefs, setCategoryPrefs] = useState<Record<NotificationCategory, boolean>>({
    procurement: true,
    quality: true,
    manufacturing: true,
    warehouse: true,
    distribution: true,
    inventory: true,
    sales: true,
    finance: true,
    field_sales: true,
    people: true,
    security: true,
    system: true,
    business: true,
    marketing: true,
    commerce: true,
    ai: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await NotificationsAPI.fetchPreferences();
      const map: Record<string, boolean> = { ...categoryPrefs };
      data.categoryPreferences.forEach((cp) => {
        map[cp.category] = cp.in_app_enabled;
      });
      // Security is always forced enabled
      map.security = true;
      setCategoryPrefs(map as Record<NotificationCategory, boolean>);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCategory = (category: NotificationCategory) => {
    if (category === 'security') return; // Security cannot be disabled
    setCategoryPrefs((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      // Save all updated category preferences
      for (const cat of Object.keys(categoryPrefs) as NotificationCategory[]) {
        if (cat === 'security') continue;
        await NotificationsAPI.updateCategoryPreference(cat, categoryPrefs[cat]);
      }
      setSaveSuccess(true);
      onPreferencesUpdated?.();
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in-0">
      <div
        id="notification-preferences-dialog"
        className="flex w-full max-w-2xl flex-col max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Sliders className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Notification Preferences</h3>
              <p className="text-xs text-slate-500">Configure your module alert subscriptions and in-app channel routing</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Channel Overview Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-medium">
              <div className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
              <Bell className="h-3.5 w-3.5 text-slate-700" />
              <span>In-App Active</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>Email: Ready</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Smartphone className="h-3.5 w-3.5 text-slate-400" />
              <span>SMS: Ready</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              <span>Tenant Encrypted</span>
            </div>
          </div>

          {/* Category Toggles List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Module Alert Subscriptions</span>
              <span className="text-xs text-slate-500">In-App Alerts</span>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-xs text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400 mb-2" />
                <span>Loading preferences...</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                {CATEGORY_DEFINITIONS.map((def) => {
                  const Icon = def.icon;
                  const isEnabled = categoryPrefs[def.category] ?? true;
                  const isSecurity = def.category === 'security';

                  return (
                    <div
                      key={def.category}
                      className={`flex items-center justify-between p-3.5 transition-colors ${
                        isEnabled ? 'hover:bg-slate-50/70' : 'bg-slate-50/40 opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 pr-4">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            isEnabled
                              ? 'bg-slate-100 border-slate-200 text-slate-800'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-slate-900">{def.label}</h4>
                            {isSecurity && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{def.description}</p>
                        </div>
                      </div>

                      {/* Toggle Button */}
                      <button
                        type="button"
                        disabled={isSecurity}
                        onClick={() => handleToggleCategory(def.category)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled ? 'bg-slate-900' : 'bg-slate-200'
                        } ${isSecurity ? 'opacity-70 cursor-not-allowed' : ''}`}
                        role="switch"
                        aria-checked={isEnabled}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-3.5">
          <div className="text-xs text-slate-500">
            Changes will take effect across your sessions instantly.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
