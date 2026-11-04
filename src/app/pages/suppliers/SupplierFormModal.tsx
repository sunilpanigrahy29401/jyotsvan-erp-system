import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, CreditCard, ShieldCheck, FileText, Check, AlertCircle } from 'lucide-react';
import { Supplier, SupplierType, PaymentTerms, RatingStatus } from '../../../types/suppliers';

interface SupplierFormModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (data: Partial<Supplier>) => Promise<void>;
  organizationId: string;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onSave,
  organizationId,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'commercial' | 'tax_bank' | 'notes'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [supplierType, setSupplierType] = useState<SupplierType>('raw_material');
  const [status, setStatus] = useState<string>('active');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  
  // Location
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');

  // Commercial
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('net_30');
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [creditLimit, setCreditLimit] = useState<number | string>(0);
  const [leadTimeDays, setLeadTimeDays] = useState<number | string>(14);
  const [minimumOrderValue, setMinimumOrderValue] = useState<number | string>(0);
  const [ratingStatus, setRatingStatus] = useState<RatingStatus>('standard');
  const [ratingNotes, setRatingNotes] = useState('');

  // Tax & Bank
  const [taxId, setTaxId] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxRegistrationStatus, setTaxRegistrationStatus] = useState('registered');
  const [bankName, setBankName] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankBranch, setBankBranch] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (supplier) {
      setSupplierCode(supplier.supplier_code || '');
      setSupplierName(supplier.supplier_name || '');
      setLegalName(supplier.legal_name || supplier.supplier_name || '');
      setDisplayName(supplier.display_name || '');
      setSupplierType(supplier.supplier_type || 'raw_material');
      setStatus(supplier.status || 'active');
      setIndustry(supplier.industry || '');
      setWebsite(supplier.website || '');
      setPrimaryEmail(supplier.primary_email || '');
      setPrimaryPhone(supplier.primary_phone || '');
      setAlternatePhone(supplier.alternate_phone || '');

      setAddressLine1(supplier.address_line_1 || '');
      setAddressLine2(supplier.address_line_2 || '');
      setCity(supplier.city || '');
      setState(supplier.state || '');
      setPostalCode(supplier.postal_code || '');
      setCountry(supplier.country || 'India');

      setPaymentTerms(supplier.payment_terms || 'net_30');
      setDefaultCurrency(supplier.default_currency || 'INR');
      setCreditLimit(supplier.credit_limit || 0);
      setLeadTimeDays(supplier.lead_time_days || 14);
      setMinimumOrderValue(supplier.minimum_order_value || 0);
      setRatingStatus(supplier.rating_status || 'standard');
      setRatingNotes(supplier.rating_notes || '');

      setTaxId(supplier.tax_id || '');
      setPanNumber(supplier.pan_number || '');
      setRegistrationNumber(supplier.registration_number || '');
      setTaxRegistrationStatus(supplier.tax_registration_status || 'registered');
      setBankName(supplier.bank_name || '');
      setBankAccountHolder(supplier.bank_account_holder || '');
      setBankAccountNumber(supplier.raw_bank_account_number || supplier.bank_account_number || '');
      setBankIfsc(supplier.bank_ifsc || '');
      setBankBranch(supplier.bank_branch || '');

      setNotes(supplier.notes || '');
    } else {
      // Reset defaults
      setSupplierCode('');
      setSupplierName('');
      setLegalName('');
      setDisplayName('');
      setSupplierType('raw_material');
      setStatus('active');
      setIndustry('');
      setWebsite('');
      setPrimaryEmail('');
      setPrimaryPhone('');
      setAlternatePhone('');

      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setPostalCode('');
      setCountry('India');

      setPaymentTerms('net_30');
      setDefaultCurrency('INR');
      setCreditLimit(0);
      setLeadTimeDays(14);
      setMinimumOrderValue(0);
      setRatingStatus('standard');
      setRatingNotes('');

      setTaxId('');
      setPanNumber('');
      setRegistrationNumber('');
      setTaxRegistrationStatus('registered');
      setBankName('');
      setBankAccountHolder('');
      setBankAccountNumber('');
      setBankIfsc('');
      setBankBranch('');

      setNotes('');
    }
    setError(null);
    setActiveTab('basic');
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      setError('Supplier Name is required');
      setActiveTab('basic');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: Partial<Supplier> = {
        organization_id: organizationId,
        supplier_code: supplierCode.trim() || undefined,
        supplier_name: supplierName.trim(),
        legal_name: legalName.trim() || supplierName.trim(),
        display_name: displayName.trim() || undefined,
        supplier_type: supplierType,
        status: status as any,
        industry: industry.trim() || undefined,
        website: website.trim() || undefined,
        primary_email: primaryEmail.trim() || undefined,
        primary_phone: primaryPhone.trim() || undefined,
        alternate_phone: alternatePhone.trim() || undefined,

        address_line_1: addressLine1.trim() || undefined,
        address_line_2: addressLine2.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        country: country.trim() || 'India',

        payment_terms: paymentTerms,
        default_currency: defaultCurrency,
        credit_limit: parseFloat(String(creditLimit)) || 0,
        lead_time_days: parseInt(String(leadTimeDays), 10) || 14,
        minimum_order_value: parseFloat(String(minimumOrderValue)) || 0,
        rating_status: ratingStatus,
        rating_notes: ratingNotes.trim() || undefined,

        tax_id: taxId.trim() || undefined,
        pan_number: panNumber.trim() || undefined,
        registration_number: registrationNumber.trim() || undefined,
        tax_registration_status: taxRegistrationStatus,
        bank_name: bankName.trim() || undefined,
        bank_account_holder: bankAccountHolder.trim() || undefined,
        bank_account_number: bankAccountNumber.trim() || undefined,
        bank_ifsc: bankIfsc.trim() || undefined,
        bank_branch: bankBranch.trim() || undefined,

        notes: notes.trim() || undefined,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save supplier details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {supplier ? `Edit Supplier: ${supplier.supplier_name}` : 'Register New Vendor / Supplier'}
              </h2>
              <p className="text-xs text-slate-500">
                {supplier ? `Code: ${supplier.supplier_code} • ID: ${supplier.id}` : 'Create an organization-scoped vendor entity for Jyotsvan Procurement'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'basic'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Basic Profile & Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('commercial')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'commercial'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Commercial & Terms
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tax_bank')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tax_bank'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Tax Identifiers & Banking
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Operational Notes
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: BASIC PROFILE & CONTACT */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Supplier Code
                  </label>
                  <input
                    type="text"
                    value={supplierCode}
                    onChange={(e) => setSupplierCode(e.target.value)}
                    placeholder="e.g. SUP-005 (Auto if empty)"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase"
                  />
                  <span className="text-[11px] text-slate-500">Unique vendor ID in organization</span>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Supplier / Trade Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Bharat Steel & Precision Alloys Pvt Ltd"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Legal / Registered Entity Name
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Full registered corporate name (for tax invoices)"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Supplier Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={supplierType}
                    onChange={(e) => setSupplierType(e.target.value as SupplierType)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="raw_material">Raw Materials (Metals, Resins, Components)</option>
                    <option value="packaging">Packaging & Corrugated Materials</option>
                    <option value="chemical">Chemicals, Solvents & Passivators</option>
                    <option value="equipment">Machinery & Heavy Equipment</option>
                    <option value="consumables">Industrial Consumables & Tools</option>
                    <option value="service">Contract Service Provider</option>
                    <option value="other">Other Vendor Type</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Primary Contact Email
                  </label>
                  <input
                    type="email"
                    value={primaryEmail}
                    onChange={(e) => setPrimaryEmail(e.target.value)}
                    placeholder="procurement@vendor.com"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Primary Phone
                  </label>
                  <input
                    type="text"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    placeholder="+91 22 4589 1200"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Alternate / Direct Mobile
                  </label>
                  <input
                    type="text"
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                    placeholder="+91 98200 11223"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Address / Location Details */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Primary Registered Address
                </h4>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Address Line 1 (Building, Street, Industrial Area)"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Address Line 2 (Phase, Landmark, Floor)"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City (e.g. Mumbai)"
                      className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State (e.g. Maharashtra)"
                      className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="PIN / Postal Code"
                      className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Country"
                      className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMMERCIAL & TERMS */}
          {activeTab === 'commercial' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="advance">100% Advance Payment</option>
                    <option value="net_7">Net 7 Days</option>
                    <option value="net_15">Net 15 Days</option>
                    <option value="net_30">Net 30 Days (Standard)</option>
                    <option value="net_45">Net 45 Days</option>
                    <option value="net_60">Net 60 Days</option>
                    <option value="custom">Custom Commercial Terms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Default Currency
                  </label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  >
                    <option value="INR">INR (₹ - Indian Rupee)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Vendor Rating / Tier
                  </label>
                  <select
                    value={ratingStatus}
                    onChange={(e) => setRatingStatus(e.target.value as RatingStatus)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="preferred">★ Preferred Strategic Partner</option>
                    <option value="approved">✓ Approved Supplier</option>
                    <option value="standard">Standard Vendor</option>
                    <option value="conditional">Conditional Approval (Batch QA)</option>
                    <option value="probation">Probationary Period</option>
                    <option value="blacklisted">Blocked / Blacklisted</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Default Lead Time (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500">Standard turnaround from PO dispatch</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500">Max open credit exposure authorized</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Minimum Order Value (MOV)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={minimumOrderValue}
                    onChange={(e) => setMinimumOrderValue(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500">Minimum threshold for standard PO release</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Vendor Rating Justification / Quality Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={ratingNotes}
                  onChange={(e) => setRatingNotes(e.target.value)}
                  placeholder="e.g. ISO 9001:2015 certified, audited on March 2026. Consistent 99.2% on-time delivery record."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: TAX IDENTIFIERS & BANKING */}
          {activeTab === 'tax_bank' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    GSTIN (Tax Identification)
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AAACB1234F1Z5"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    PAN Card Number
                  </label>
                  <input
                    type="text"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. AAACB1234F"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Corporate CIN / Registration #
                  </label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="e.g. U27100MH2012PTC234891"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Bank Details Section */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Bank Account Details for Wire/NEFT/RTGS
                  </h4>
                  <span className="text-[11px] bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded-full ml-auto">
                    Sensitive Data Protected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank Ltd"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Beneficiary / Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      placeholder="e.g. Bharat Steel & Precision Alloys Pvt Ltd"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="e.g. 50200012345678"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0001234"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={bankBranch}
                        onChange={(e) => setBankBranch(e.target.value)}
                        placeholder="e.g. Taloja Industrial"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OPERATIONAL NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  General Vendor Information & Procurement Directives
                </label>
                <textarea
                  rows={6}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any supplier qualification notes, manufacturing tolerances, special packaging instructions, or escalation contacts..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Official Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.vendor-website.example.com"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : supplier ? 'Update Supplier Profile' : 'Register Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
