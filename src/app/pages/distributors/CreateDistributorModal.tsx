import React, { useState } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { distributorApi } from '../../../services/distributorApi.ts';
import type { DistributorType } from '../../../types/distributors.ts';

interface CreateDistributorModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateDistributorModal: React.FC<CreateDistributorModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    distributor_code: `DST-${Math.floor(100 + Math.random() * 900)}`,
    display_name: '',
    legal_name: '',
    distributor_type: 'primary' as DistributorType,
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    primary_contact: '',
    region: 'West',
    state: 'Maharashtra',
    city: 'Pune',
    pincode: '411001',
    registered_address: '',
    credit_limit: 1500000,
    payment_terms_days: 21,
    agreed_discount_percent: 8.5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await distributorApi.createDistributor(formData);
      onSuccess();
    } catch (err: any) {
      alert(`Onboarding failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Onboard New Distributor Partner</h2>
              <p className="text-xs text-slate-500">Register commercial distributor, legal entity, territory, and credit profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Business Identification */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">1. Business Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Distributor Code *</label>
                <input
                  type="text"
                  required
                  value={formData.distributor_code}
                  onChange={e => setFormData({ ...formData, distributor_code: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Trade / Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune City Fast-Moving FMCG"
                  value={formData.display_name}
                  onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Legal Registered Entity Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune City Distributors Pvt Ltd"
                  value={formData.legal_name}
                  onChange={e => setFormData({ ...formData, legal_name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Distributor Classification *</label>
                <select
                  value={formData.distributor_type}
                  onChange={e => setFormData({ ...formData, distributor_type: e.target.value as any })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="super_distributor">Super Distributor</option>
                  <option value="primary">Primary Distributor</option>
                  <option value="regional">Regional Distributor</option>
                  <option value="state">State Franchisee</option>
                  <option value="district">District Distributor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Taxation & Primary Contact */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">2. Tax & Contact Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">GSTIN Number</label>
                <input
                  type="text"
                  placeholder="27AAACP1234F1Z5"
                  value={formData.gstin}
                  onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">PAN Number</label>
                <input
                  type="text"
                  placeholder="AAACP1234F"
                  value={formData.pan}
                  onChange={e => setFormData({ ...formData, pan: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Primary Principal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Contact Person Name"
                  value={formData.primary_contact}
                  onChange={e => setFormData({ ...formData, primary_contact: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98200 11223"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Official Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="orders@punefmcg.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Territory & Address */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">3. Territory & Warehouse Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Region *</label>
                <select
                  value={formData.region}
                  onChange={e => setFormData({ ...formData, region: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="West">West</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="Central">Central</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">PIN Code *</label>
                <input
                  type="text"
                  required
                  value={formData.pincode}
                  onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-slate-700 font-semibold mb-1">Registered Commercial Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Plot / Gate #, Industrial Area / Road"
                  value={formData.registered_address}
                  onChange={e => setFormData({ ...formData, registered_address: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Commercial & Credit Limit */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">4. Commercial Terms & Credit</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Sanctioned Credit Limit (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  required
                  value={formData.credit_limit}
                  onChange={e => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-slate-200 rounded-lg font-semibold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Credit Terms (Days) *</label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  required
                  value={formData.payment_terms_days}
                  onChange={e => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Agreed Base Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.agreed_discount_percent}
                  onChange={e => setFormData({ ...formData, agreed_discount_percent: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            id="btn-submit-distributor"
            onClick={handleSubmit}
            disabled={loading || !formData.display_name}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Onboarding...' : 'Complete Onboarding'}
          </button>
        </div>
      </div>
    </div>
  );
};
