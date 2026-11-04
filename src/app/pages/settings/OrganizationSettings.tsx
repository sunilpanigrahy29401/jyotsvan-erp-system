import React, { useState, useEffect } from 'react';
import {
  Building2,
  Building,
  ShieldCheck,
  Save,
  CheckCircle2,
  RefreshCw,
  Globe,
  Coins,
  Receipt,
  Layers,
  MapPin,
  Mail,
  Phone,
  Clock,
  ArrowRight,
  Warehouse,
  Briefcase,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Can } from '../../../components/auth/Can';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { databaseService } from '../../../services/database';
import type { Organization, Branch, Warehouse as WarehouseTypeEntity, Department } from '../../../types/database';

interface OrganizationSettingsProps {
  onNavigate?: (path: string) => void;
}

export function OrganizationSettings({ onNavigate }: OrganizationSettingsProps) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [org, setOrg] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseTypeEntity[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [code, setCode] = useState('');
  const [taxIdentifier, setTaxIdentifier] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [orgData, branchData, whData, deptData] = await Promise.all([
        databaseService.getOrganization(currentUser),
        databaseService.getBranches(currentUser),
        databaseService.getWarehouses(currentUser),
        databaseService.getDepartments(currentUser),
      ]);

      setOrg(orgData);
      setBranches(branchData);
      setWarehouses(whData);
      setDepartments(deptData);

      setName(orgData.name || '');
      setLegalName(orgData.legal_name || '');
      setCode(orgData.code || '');
      setTaxIdentifier(orgData.tax_identifier || '');
      setCurrency(orgData.currency || 'INR');
      setTimezone(orgData.timezone || 'Asia/Kolkata');
      setCountry(orgData.country || 'India');
      setState(orgData.state || '');
      setCity(orgData.city || '');
      setAddress(orgData.address || '');
      setPostalCode(orgData.postal_code || '');
      setPhone(orgData.phone || '');
      setEmail(orgData.email || '');
      setWebsite(orgData.website || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load organization profile';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const updated = await databaseService.updateOrganization(currentUser, {
        name,
        legal_name: legalName || null,
        code: code.toUpperCase(),
        tax_identifier: taxIdentifier || null,
        currency,
        timezone,
        country,
        state: state || null,
        city: city || null,
        address: address || null,
        postal_code: postalCode || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
      });

      setOrg(updated);
      showToast('Enterprise organization parameters updated and audited.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update organization';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Enterprise Organization Profile & Identity
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage corporate legal entity parameters, GSTIN/VAT registrations, fiscal standards, and sovereign branch partition.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration Card */}
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Legal Entity & Master Parameters</span>
              {org && (
                <Badge variant="outline" className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border-indigo-200">
                  Org ID: {org.id}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Corporate legal registrations and tax identifiers are recorded in the immutable compliance audit trail.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">Company / Operating Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Organization Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Full Legal Corporate Name</label>
                  <input
                    type="text"
                    placeholder="Jyotsvan Consumer Products Private Limited"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    Tax ID / GSTIN / VAT Number
                  </label>
                  <input
                    type="text"
                    placeholder="27AABCU9603R1ZM"
                    value={taxIdentifier}
                    onChange={(e) => setTaxIdentifier(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                    Base Financial Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
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
                  <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Primary Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                    <option value="UTC">UTC</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT +08:00)</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Corporate Registered Address</label>
                <input
                  type="text"
                  placeholder="Plot 101, Business Park, Andheri East"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">State</label>
                  <input
                    type="text"
                    placeholder="Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Country *</label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Postal Code</label>
                  <input
                    type="text"
                    placeholder="400093"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Corporate Telephone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 22 2820 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    placeholder="corporate@jyotsvan.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Company Website
                  </label>
                  <input
                    type="text"
                    placeholder="https://jyotsvan.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <Can
                do="organization.edit"
                fallback={
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
                    Your current role does not have the <code>organization.edit</code> permission token. You have read-only visibility.
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
                    {isSaving ? 'Saving Changes...' : 'Save Organization Profile'}
                  </Button>
                </div>
              </Can>
            </form>
          </CardContent>
        </Card>

        {/* Right Side Navigation & Architecture Info */}
        <div className="space-y-6">
          {/* Sovereign Tenant Security */}
          <Card className="border-slate-200 bg-slate-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Multi-Tenant Isolation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2.5">
              <p>
                Every table in Jyotsvan is strictly scoped to an <code>organization_id</code> foreign key.
              </p>
              <div className="p-2.5 bg-white rounded border border-slate-200 font-mono text-[11px] space-y-1">
                <div className="text-indigo-700 font-bold">Partition: Multi-Tenant</div>
                <div className="text-slate-500 text-[10px]">Actor: {currentUser?.email}</div>
                <div className="text-slate-500 text-[10px]">Org: {currentUser?.organization_id}</div>
              </div>
              <p className="text-[11px] text-slate-500">
                Cross-tenant queries are blocked at both PostgreSQL Row-Level Security (RLS) and the server-side authorization layer.
              </p>
            </CardContent>
          </Card>

          {/* Master Data Entity Summary */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Master Data Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100 text-xs">
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="font-semibold text-slate-800">Operating Branches</div>
                    <div className="text-[10px] text-slate-500">{branches.length} registered sites</div>
                  </div>
                </div>
                {onNavigate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('/settings/branches')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 gap-1 h-7 px-2"
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <div className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="font-semibold text-slate-800">Warehouse Storage</div>
                    <div className="text-[10px] text-slate-500">{warehouses.length} physical facilities</div>
                  </div>
                </div>
                {onNavigate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('/settings/warehouses')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 gap-1 h-7 px-2"
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <div className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="font-semibold text-slate-800">Departments</div>
                    <div className="text-[10px] text-slate-500">{departments.length} corporate divisions</div>
                  </div>
                </div>
                {onNavigate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('/settings/departments')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 gap-1 h-7 px-2"
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
