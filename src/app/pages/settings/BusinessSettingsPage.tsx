import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  RefreshCw,
  Coins,
  Clock,
  Calendar,
  Hash,
  Scale,
  ShieldCheck,
  CheckCircle2,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Can } from '../../../components/auth/Can';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { databaseService } from '../../../services/database';
import type { BusinessSettings } from '../../../types/database';

export function BusinessSettingsPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [numberFormat, setNumberFormat] = useState('indian_lakhs');
  const [defaultWeightUnit, setDefaultWeightUnit] = useState('kg');
  const [defaultVolumeUnit, setDefaultVolumeUnit] = useState('L');
  const [defaultCountUnit, setDefaultCountUnit] = useState('pcs');
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState(4);
  const [businessDaysPerWeek, setBusinessDaysPerWeek] = useState(6);

  const loadSettings = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await databaseService.getBusinessSettings(currentUser);
      if (data) {
        setSettings(data);
        setDefaultCurrency(data.default_currency || 'INR');
        setTimezone(data.timezone || 'Asia/Kolkata');
        setDateFormat(data.date_format || 'DD/MM/YYYY');
        setNumberFormat(data.number_format || 'indian_lakhs');
        setDefaultWeightUnit(data.default_weight_unit || 'kg');
        setDefaultVolumeUnit(data.default_volume_unit || 'L');
        setDefaultCountUnit(data.default_count_unit || 'pcs');
        setFiscalYearStartMonth(data.fiscal_year_start_month || 4);
        setBusinessDaysPerWeek(data.business_days_per_week || 6);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load business settings';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const updated = await databaseService.updateBusinessSettings(currentUser, {
        default_currency: defaultCurrency,
        timezone,
        date_format: dateFormat,
        number_format: numberFormat,
        default_weight_unit: defaultWeightUnit,
        default_volume_unit: defaultVolumeUnit,
        default_count_unit: defaultCountUnit,
        fiscal_year_start_month: Number(fiscalYearStartMonth),
        business_days_per_week: Number(businessDaysPerWeek),
      });

      setSettings(updated);
      showToast('System business settings updated and audited.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update business settings';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            Global Business & Operational Parameters
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            System defaults for financial currency, timezones, fiscal year cycles, and standard measurement anchors.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadSettings}
          disabled={loading}
          className="text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Operational Configuration Matrix</span>
              {settings && (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                  Active Configuration
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Modifications to business settings take effect immediately across all branches and modules.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6 text-xs">
              {/* Financial & Regional Defaults */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-indigo-600" />
                  Financial & Regional Defaults
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Standard Operating Currency *</label>
                    <select
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="INR">INR (₹ - Indian Rupee)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                      <option value="AED">AED (د.إ - UAE Dirham)</option>
                      <option value="SGD">SGD (S$ - Singapore Dollar)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">System Timezone *</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT +08:00)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Date Display Format
                    </label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/04/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-04-15 - ISO)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 04/15/2026)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      Number & Currency Notation
                    </label>
                    <select
                      value={numberFormat}
                      onChange={(e) => setNumberFormat(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="indian_lakhs">Indian Numbering (e.g. ₹ 1,23,45,678.00 - Lakhs & Crores)</option>
                      <option value="standard">Western Millions (e.g. ₹ 12,345,678.00 - Millions)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Fiscal & Operating Schedule */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Fiscal Cycle & Calendar Schedule
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Fiscal Year Cycle Start Month</label>
                    <select
                      value={fiscalYearStartMonth}
                      onChange={(e) => setFiscalYearStartMonth(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value={4}>April (Indian Statutory Fiscal Year: Apr 1 - Mar 31)</option>
                      <option value={1}>January (Standard Calendar Year: Jan 1 - Dec 31)</option>
                      <option value={7}>July (Australian / Mid-Year Cycle)</option>
                      <option value={10}>October (US Federal Cycle)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Operating Working Days per Week</label>
                    <select
                      value={businessDaysPerWeek}
                      onChange={(e) => setBusinessDaysPerWeek(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value={6}>6 Days / Week (Monday – Saturday, Manufacturing Standard)</option>
                      <option value={5}>5 Days / Week (Monday – Friday, Corporate Standard)</option>
                      <option value={7}>7 Days / Week (Continuous 24x7 Operations)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Default Measurement Anchors */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  Default Production & Inventory Measurement Units
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Primary Weight Unit</label>
                    <input
                      type="text"
                      value={defaultWeightUnit}
                      onChange={(e) => setDefaultWeightUnit(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">e.g. kg, g, MT</span>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Primary Liquid Volume Unit</label>
                    <input
                      type="text"
                      value={defaultVolumeUnit}
                      onChange={(e) => setDefaultVolumeUnit(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">e.g. L, mL</span>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Primary Discrete Unit</label>
                    <input
                      type="text"
                      value={defaultCountUnit}
                      onChange={(e) => setDefaultCountUnit(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">e.g. pcs, box, bottle</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <Can
                do="business_settings.edit"
                fallback={
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
                    Your role has read-only access to operational parameters. Permission <code>business_settings.edit</code> is required to update settings.
                  </div>
                }
              >
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Saving...' : 'Save Business Settings'}
                  </Button>
                </div>
              </Can>
            </form>
          </CardContent>
        </Card>

        {/* Informational Side Card */}
        <div className="space-y-6">
          <Card className="border-slate-200 bg-slate-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Enterprise Compliance Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-3">
              <p>
                Business parameters define the core formatting rules across the entire Jyotsvan ecosystem:
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-500">
                <li>Tax invoices format figures using the configured number and currency standard.</li>
                <li>Audit log timestamps synchronize against the enterprise timezone.</li>
                <li>Financial statements automatically compute quarterly boundaries based on the fiscal year start month.</li>
                <li>Production formulas link default batch weights to the primary weight standard.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                Active Configuration Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Currency:</span>
                <span className="font-mono font-semibold text-slate-900">{defaultCurrency}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Timezone:</span>
                <span className="font-mono text-slate-900">{timezone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Numbering:</span>
                <span className="capitalize text-slate-900">{numberFormat.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Fiscal Start:</span>
                <span className="text-slate-900 font-medium">Month {fiscalYearStartMonth}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
