import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Edit,
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  Star,
  Layers,
  DollarSign,
  FileText,
  Clock,
  UserPlus,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Calendar,
  Tag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import {
  Supplier,
  SupplierContact,
  SupplierAddress,
  SupplierSKU,
  SupplierPrice,
  SupplierDocument,
  SupplierPerformanceSummary
} from '../../../types/suppliers';
import { supplierService } from '../../../services/supplierService';

interface SupplierDetailsPageProps {
  supplierId: string;
  organizationId: string;
  onBack: () => void;
  onEditSupplier: (supplier: Supplier) => void;
  onOpenStatusModal: (supplier: Supplier) => void;
  onAddContact: () => void;
  onEditContact: (contact: SupplierContact) => void;
  onAddAddress: () => void;
  onLinkSku: () => void;
  onEditSku: (mapping: SupplierSKU) => void;
  onAddPriceQuote: () => void;
  onAddDocument: () => void;
  hasEditPermission: boolean;
}

export const SupplierDetailsPage: React.FC<SupplierDetailsPageProps> = ({
  supplierId,
  organizationId,
  onBack,
  onEditSupplier,
  onOpenStatusModal,
  onAddContact,
  onEditContact,
  onAddAddress,
  onLinkSku,
  onEditSku,
  onAddPriceQuote,
  onAddDocument,
  hasEditPermission,
}) => {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'addresses' | 'skus' | 'pricing' | 'documents' | 'performance' | 'audit'>('overview');
  
  // Sensitive Data Visibility
  const [showSensitiveBank, setShowSensitiveBank] = useState(false);

  // Performance Data
  const [performance, setPerformance] = useState<SupplierPerformanceSummary | null>(null);

  useEffect(() => {
    fetchSupplierDetails();
  }, [supplierId, organizationId, showSensitiveBank]);

  const fetchSupplierDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await supplierService.getSupplierById(supplierId, organizationId, showSensitiveBank);
      setSupplier(data);

      // Load performance summary
      const perf = await supplierService.getPerformance(supplierId, organizationId).catch(() => null);
      if (perf) setPerformance(perf);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to remove this contact representative?')) return;
    try {
      await supplierService.deleteContact(supplierId, contactId, organizationId);
      fetchSupplierDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to delete contact');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address location?')) return;
    try {
      await supplierService.deleteAddress(supplierId, addressId);
      fetchSupplierDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to delete address');
    }
  };

  const handleUnlinkSku = async (supplierSkuId: string) => {
    if (!confirm('Are you sure you want to unlink this SKU from this supplier?')) return;
    try {
      await supplierService.unlinkSku(supplierId, supplierSkuId, organizationId);
      fetchSupplierDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to unlink SKU');
    }
  };

  const handleDeletePriceQuote = async (priceId: string) => {
    if (!confirm('Are you sure you want to remove this price quote record?')) return;
    try {
      await supplierService.deletePriceQuote(supplierId, priceId);
      fetchSupplierDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to delete price quote');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this document attachment?')) return;
    try {
      await supplierService.deleteDocument(supplierId, docId);
      fetchSupplierDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  if (loading && !supplier) {
    return (
      <div className="p-12 text-center text-slate-500">
        <Building2 className="w-8 h-8 animate-pulse mx-auto mb-2 text-indigo-600" />
        <p>Loading 360° Supplier Master Profile...</p>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-base">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span>Error Loading Supplier</span>
        </div>
        <p className="text-sm">{error || 'Supplier not found'}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-md text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Identity info */}
          <div className="flex items-start gap-4">
            <button
              onClick={onBack}
              className="mt-1 p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Return to Supplier Directory"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-extrabold text-xl shadow-xs shrink-0">
              {supplier.supplier_code.split('-')[1] || supplier.supplier_code.slice(0, 3)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">{supplier.supplier_name}</h1>
                <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  {supplier.supplier_code}
                </span>

                {/* Rating Badge */}
                {supplier.rating_status === 'preferred' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    Preferred Strategic Partner
                  </span>
                )}
                {supplier.rating_status === 'approved' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Approved Vendor
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2 font-medium">
                {supplier.legal_name && supplier.legal_name !== supplier.supplier_name && (
                  <span>Legal: {supplier.legal_name}</span>
                )}
                <span className="capitalize text-slate-700 font-semibold">Type: {supplier.supplier_type.replace('_', ' ')}</span>
                {supplier.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {supplier.city}, {supplier.state}
                  </span>
                )}
                {supplier.tax_id && (
                  <span className="font-mono">GSTIN: {supplier.tax_id}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <button
              onClick={() => onOpenStatusModal(supplier)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${
                supplier.status === 'active'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : supplier.status === 'blocked'
                  ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                  : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Status: {supplier.status.toUpperCase()}
            </button>

            {hasEditPermission && (
              <button
                onClick={() => onEditSupplier(supplier)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* 8 Multi-Domain Tabs */}
        <div className="flex flex-wrap border-b border-slate-200 mt-6 gap-1">
          {[
            { id: 'overview', label: 'Overview & Profile', icon: Building2, count: null },
            { id: 'contacts', label: 'Contacts Directory', icon: UserPlus, count: supplier.contacts?.length || 0 },
            { id: 'addresses', label: 'Facilities & Addresses', icon: MapPin, count: supplier.addresses?.length || 0 },
            { id: 'skus', label: 'Mapped Catalog SKUs', icon: Layers, count: supplier.skus?.length || 0 },
            { id: 'pricing', label: 'Contract Rates & Pricing', icon: DollarSign, count: supplier.prices?.length || 0 },
            { id: 'documents', label: 'Compliance & Documents', icon: FileText, count: supplier.documents?.length || 0 },
            { id: 'performance', label: 'Performance Analytics', icon: BarChart2, count: null },
            { id: 'audit', label: 'Audit Trail', icon: History, count: supplier.audit_logs?.length || 0 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT PANELS */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Commercial & Entity Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Commercial Terms Matrix */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Commercial Terms & Procurement Parameters
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Payment Terms</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block uppercase">
                    {supplier.payment_terms.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Default Currency</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
                    {supplier.default_currency}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Standard Lead Time</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">
                    {supplier.lead_time_days} Days
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Credit Limit</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
                    ₹{supplier.credit_limit ? Number(supplier.credit_limit).toLocaleString() : '0'}
                  </span>
                </div>
              </div>

              {supplier.minimum_order_value > 0 && (
                <div className="mt-3 text-xs text-slate-600 bg-amber-50 border border-amber-100 p-2.5 rounded-lg flex items-center justify-between">
                  <span>Minimum Order Value (MOV) Requirement:</span>
                  <span className="font-mono font-bold text-amber-900">₹{Number(supplier.minimum_order_value).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Legal Identifiers & Tax Structure */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Legal & Tax Registration Identifiers
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">GSTIN</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                    {supplier.tax_id || 'Not Registered'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">PAN Card</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                    {supplier.pan_number || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">Corporate CIN #</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                    {supplier.registration_number || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Banking Details with Unmask Controller */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Wire / RTGS / NEFT Banking Details
                </h3>

                <button
                  type="button"
                  onClick={() => setShowSensitiveBank(!showSensitiveBank)}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  {showSensitiveBank ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showSensitiveBank ? 'Mask Bank Account' : 'Reveal Full Account'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-500 block">Bank Name</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{supplier.bank_name || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Account Beneficiary</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{supplier.bank_account_holder || supplier.supplier_name}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Account Number</span>
                  <span className="font-mono font-bold text-slate-900 mt-0.5 block text-sm">
                    {supplier.bank_account_number || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">IFSC / Branch</span>
                  <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                    {supplier.bank_ifsc || '—'} {supplier.bank_branch ? `(${supplier.bank_branch})` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Operational Notes */}
            {supplier.notes && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Procurement Directives & Operational Notes
                </h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{supplier.notes}</p>
              </div>
            )}
          </div>

          {/* Column 3: Contact & Quick Info */}
          <div className="space-y-6">
            
            {/* Primary Registered Office */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                Registered Address
              </h3>

              <div className="text-xs text-slate-700 leading-relaxed">
                <p className="font-medium text-slate-900">{supplier.address_line_1 || 'No street address logged'}</p>
                {supplier.address_line_2 && <p>{supplier.address_line_2}</p>}
                <p>{supplier.city}{supplier.state ? `, ${supplier.state}` : ''} {supplier.postal_code}</p>
                <p className="text-slate-500 font-medium mt-1">{supplier.country}</p>
              </div>
            </div>

            {/* Direct Communication Channels */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500" />
                Direct Vendor Contacts
              </h3>

              <div className="space-y-2.5 text-xs">
                {supplier.primary_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`mailto:${supplier.primary_email}`} className="text-indigo-600 hover:underline">
                      {supplier.primary_email}
                    </a>
                  </div>
                )}
                {supplier.primary_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-800">{supplier.primary_phone}</span>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={supplier.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                      {supplier.website} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Quality & Audit Rating Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Quality Qualification Tier
              </h3>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="font-bold text-slate-900 capitalize mb-1">
                  {supplier.rating_status} Vendor Tier
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {supplier.rating_notes || 'Supplier standard quality audit compliant with Jyotsvan procurement specifications.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTACTS DIRECTORY TAB */}
      {activeTab === 'contacts' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Supplier Personnel Directory</h3>
              <p className="text-xs text-slate-500">Commercial representatives, plant managers, and escalation contacts</p>
            </div>
            {hasEditPermission && (
              <button
                onClick={onAddContact}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Contact Person
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {!supplier.contacts || supplier.contacts.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                No contact representatives listed. Click "Add Contact Person" to record key personnel.
              </div>
            ) : (
              supplier.contacts.map((contact) => (
                <div key={contact.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative group">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{contact.name}</h4>
                        {contact.is_primary && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {contact.designation || 'Representative'} {contact.department ? `• ${contact.department}` : ''}
                      </p>
                    </div>

                    {hasEditPermission && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditContact(contact)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          title="Edit Contact"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs pt-1 border-t border-slate-200">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <a href={`mailto:${contact.email}`} className="hover:text-indigo-600">{contact.email}</a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. ADDRESSES & FACILITIES TAB */}
      {activeTab === 'addresses' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Facilities & Manufacturing Locations</h3>
              <p className="text-xs text-slate-500">Plants, warehouses, corporate offices, and loading depots</p>
            </div>
            {hasEditPermission && (
              <button
                onClick={onAddAddress}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Facility / Address
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {!supplier.addresses || supplier.addresses.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                No secondary addresses logged.
              </div>
            ) : (
              supplier.addresses.map((addr) => (
                <div key={addr.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                      {addr.address_type}
                    </span>
                    {addr.is_primary && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        Primary
                      </span>
                    )}
                    {hasEditPermission && (
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded ml-auto"
                        title="Delete Address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-slate-700 leading-relaxed pt-2">
                    <p className="font-semibold text-slate-900">{addr.address_line_1}</p>
                    {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                    <p>{addr.city}, {addr.state} - {addr.postal_code}</p>
                    <p className="text-slate-500 font-medium">{addr.country}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. MAPPED SKUS TAB */}
      {activeTab === 'skus' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Canonical Jyotsvan Catalog SKUs Provided</h3>
              <p className="text-xs text-slate-500">Associated part codes, supplier specific lead times, and MOQ constraints</p>
            </div>
            {hasEditPermission && (
              <button
                onClick={onLinkSku}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Link Canonical SKU
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Canonical SKU</th>
                  <th className="py-3 px-4">Supplier Part # (MPN)</th>
                  <th className="py-3 px-4">Supplier Item Name</th>
                  <th className="py-3 px-4">Lead Time</th>
                  <th className="py-3 px-4">MOQ</th>
                  <th className="py-3 px-4">Active Quote Price</th>
                  <th className="py-3 px-4 text-center">Preferred</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!supplier.skus || supplier.skus.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No Jyotsvan SKUs mapped to this vendor yet. Click "Link Canonical SKU" to begin procurement linkage.
                    </td>
                  </tr>
                ) : (
                  supplier.skus.map((skuMapping) => (
                    <tr key={skuMapping.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{skuMapping.product_name || 'Product'}</div>
                        <div className="font-mono text-slate-500 mt-0.5">{skuMapping.sku} ({skuMapping.variant_name})</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {skuMapping.supplier_product_code || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {skuMapping.supplier_product_name || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {skuMapping.lead_time_days !== null ? `${skuMapping.lead_time_days} days` : 'Default'}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {skuMapping.minimum_order_quantity}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {skuMapping.active_price ? `₹${Number(skuMapping.active_price).toLocaleString()}` : <span className="text-slate-400 font-normal">No active quote</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {skuMapping.preferred_supplier ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Star className="w-3 h-3 fill-amber-500" /> Preferred
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {hasEditPermission && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onEditSku(skuMapping)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                              title="Edit SKU Mapping"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleUnlinkSku(skuMapping.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Unlink SKU"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. PRICING & CONTRACT RATES TAB */}
      {activeTab === 'pricing' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Contract Rate Card & Price Quotes</h3>
              <p className="text-xs text-slate-500">Historical and active price matrices agreed with supplier</p>
            </div>
            {hasEditPermission && (
              <button
                onClick={onAddPriceQuote}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Price Quote
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Item / SKU</th>
                  <th className="py-3 px-4">Rate / Unit</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4">MOQ</th>
                  <th className="py-3 px-4">Effective From</th>
                  <th className="py-3 px-4">Effective To</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!supplier.prices || supplier.prices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No price quotes recorded. Click "Add Price Quote" to log contracted purchase rates.
                    </td>
                  </tr>
                ) : (
                  supplier.prices.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{p.product_name || 'Product'}</span>
                        <span className="font-mono text-slate-500">{p.sku} ({p.variant_name})</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-sm">
                        ₹{Number(p.price).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">/ {p.price_unit}</span>
                      </td>
                      <td className="py-3 px-4 font-mono">{p.currency}</td>
                      <td className="py-3 px-4 font-mono">{p.minimum_order_quantity}</td>
                      <td className="py-3 px-4">{new Date(p.effective_from).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        {p.effective_to ? new Date(p.effective_to).toLocaleDateString() : <span className="text-slate-400">Open-ended</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {hasEditPermission && (
                          <button
                            onClick={() => handleDeletePriceQuote(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete Quote"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. COMPLIANCE & DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Regulatory, Quality & Legal Documents</h3>
              <p className="text-xs text-slate-500">Certificates of Analysis (COA), ISO 9001/14001, Master Agreements, and NDAs</p>
            </div>
            {hasEditPermission && (
              <button
                onClick={onAddDocument}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Attach Document
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {!supplier.documents || supplier.documents.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                No compliance or legal documents attached to this vendor record.
              </div>
            ) : (
              supplier.documents.map((doc) => (
                <div key={doc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{doc.title}</h4>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          {doc.document_type}
                        </span>
                      </div>
                    </div>

                    {hasEditPermission && (
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 font-mono text-[11px] bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                    <span className="truncate">{doc.file_name}</span>
                    {doc.public_url && (
                      <a
                        href={doc.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline shrink-0 flex items-center gap-1 font-sans text-xs ml-2"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {doc.valid_until && (
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Valid until: {new Date(doc.valid_until).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 7. PERFORMANCE ANALYTICS FOUNDATION */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Procurement & Quality Performance Scorecard</h3>
            <p className="text-xs text-slate-500">Live operational metrics computed across purchase orders and goods receipt notes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">On-Time Delivery Rate</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-emerald-600">
                  {performance?.metrics?.on_time_delivery_rate !== null && performance?.metrics?.on_time_delivery_rate !== undefined
                    ? `${performance.metrics.on_time_delivery_rate}%`
                    : '100%'}
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold">
                  Benchmark: &gt;95%
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Quality Rejection Rate</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-indigo-600">
                  {performance?.metrics?.quality_rejection_rate !== null && performance?.metrics?.quality_rejection_rate !== undefined
                    ? `${performance.metrics.quality_rejection_rate}%`
                    : '0.0%'}
                </span>
                <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded font-semibold">
                  Target: &lt;1.0%
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Total Purchase Orders</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900">
                  {performance?.metrics?.total_purchase_orders || 0}
                </span>
                <span className="text-[10px] text-slate-500">POs Dispatched</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Total Lifetime Spend</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900 font-mono">
                  ₹{performance?.metrics?.total_spend_amount ? Number(performance.metrics.total_spend_amount).toLocaleString() : '0'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950">
              <p className="font-bold">Enterprise Vendor Performance Ready</p>
              <p className="mt-0.5 text-indigo-800 leading-relaxed">
                As Purchase Orders (Phase 8) and Warehouse Goods Receipts are processed against {supplier.supplier_name}, automated vendor scorecarding will track lead-time variances, MTC compliance, and supplier payment cycles in real-time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 8. AUDIT TRAIL TAB */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Supplier Lifecycle & Change Audit Trail</h3>
            <p className="text-xs text-slate-500">Immutable ledger of modifications, status changes, and catalog updates</p>
          </div>

          <div className="space-y-3 pt-2">
            {!supplier.audit_logs || supplier.audit_logs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No recent audit log records.
              </div>
            ) : (
              supplier.audit_logs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 uppercase font-mono text-[11px] bg-slate-200 px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                      <span className="font-medium text-slate-700">{log.entity_type}</span>
                    </div>
                    {log.details && (
                      <p className="text-slate-600 mt-1 font-mono text-[11px]">{log.details}</p>
                    )}
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Actor: {log.actor_email || log.actor_id || 'System User'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
