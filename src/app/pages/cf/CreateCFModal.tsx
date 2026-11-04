import React, { useState } from 'react';
import { X, Building2, User, MapPin, FileText, ShieldCheck, AlertCircle } from 'lucide-react';
import { cfApi } from '../../../services/cfApi';
import type { CFMaster, CFType, CFStatus } from '../../../types/cfs';

interface CreateCFModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cf: CFMaster) => void;
}

export const CreateCFModal: React.FC<CreateCFModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cf_code: '',
    legal_name: '',
    display_name: '',
    cf_type: 'regional' as CFType,
    status: 'active' as CFStatus,
    contact_person: '',
    phone: '',
    alternate_phone: '',
    email: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    territory: '',
    region: 'North',
    security_deposit_amount: 2000000,
    commission_rate: 3.5,
    credit_limit: 5000000,
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legal_name || !formData.contact_person || !formData.phone || !formData.city || !formData.state) {
      setError('Please fill in all mandatory fields (Legal Name, Contact Person, Phone, City, State)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const created = await cfApi.createCF({
        ...formData,
        display_name: formData.display_name || formData.legal_name,
        territory: formData.territory || `${formData.state} Regional Territory`,
      });
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to onboard C&F agency');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden my-8 border border-neutral-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Onboard Carrying & Forwarding (C&F) Agency</h3>
              <p className="text-xs text-neutral-500">Register new regional custody partner, depot parameters and agreements</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Agency Identity */}
          <div>
            <div className="flex items-center space-x-2 text-sm font-semibold text-neutral-900 mb-3 pb-1 border-b border-neutral-100">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Agency Identification & Type</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Legal Registered Entity Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Cargo & Forwarders Pvt Ltd"
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  C&F Code (Auto / Custom)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CF-DEL-01"
                  value={formData.cf_code}
                  onChange={(e) => setFormData({ ...formData, cf_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Operating Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. North India Super Depot"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  C&F Partner Classification
                </label>
                <select
                  value={formData.cf_type}
                  onChange={(e) => setFormData({ ...formData, cf_type: e.target.value as CFType })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="super_cf">Super C&F (Zonal / Multi-State)</option>
                  <option value="regional">Regional C&F Hub</option>
                  <option value="state">State C&F Agency</option>
                  <option value="third_party">Third-Party Logistics (3PL)</option>
                  <option value="company_owned">Company Owned Depot (COD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Geographic Region
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="North">North India</option>
                  <option value="West">West India</option>
                  <option value="South">South India</option>
                  <option value="East">East India</option>
                  <option value="Central">Central India</option>
                  <option value="North-East">North-East India</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Key Personnel */}
          <div>
            <div className="flex items-center space-x-2 text-sm font-semibold text-neutral-900 mb-3 pb-1 border-b border-neutral-100">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Primary Contact & Personnel</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Key Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Primary Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  placeholder="operations@apexcargo.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Location, Territory & Depot Address */}
          <div>
            <div className="flex items-center space-x-2 text-sm font-semibold text-neutral-900 mb-3 pb-1 border-b border-neutral-100">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Location, Depot Address & Territory Scope</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Warehouse / Depot Physical Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Plot No. 14-16, Transport Nagar Logistics Zone"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  City / Hub <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gurugram / Delhi NCR"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  State / Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Haryana"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Postal PIN Code
                </label>
                <input
                  type="text"
                  placeholder="122001"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Assigned Operating Territory Scope
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delhi NCR, Haryana, Punjab & Western UP"
                  value={formData.territory}
                  onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  GSTIN Identifier
                </label>
                <input
                  type="text"
                  placeholder="07AAAAA0000A1Z5"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Commercial & Agreement Terms */}
          <div>
            <div className="flex items-center space-x-2 text-sm font-semibold text-neutral-900 mb-3 pb-1 border-b border-neutral-100">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Commercial & Custody Agreement Terms</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Security Deposit (INR ₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={formData.security_deposit_amount}
                  onChange={(e) => setFormData({ ...formData, security_deposit_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  C&F Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Custody Stock Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span>Onboarding Agency...</span>
            ) : (
              <>
                <Building2 className="w-4 h-4" />
                <span>Authorize & Register C&F</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
