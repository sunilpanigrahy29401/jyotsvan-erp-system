import React, { useState } from 'react';
import { X, Store, Building2, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { RetailerType } from '../../../types/retailers.ts';

interface CreateRetailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRetailerModal: React.FC<CreateRetailerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [retailerType, setRetailerType] = useState<RetailerType>('agro_input_shop');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [region, setRegion] = useState('West');
  const [pincode, setPincode] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [primaryDistributorId, setPrimaryDistributorId] = useState('');
  const [creditLimit, setCreditLimit] = useState(250000);
  const [paymentTermsDays, setPaymentTermsDays] = useState(15);
  const [agreedDiscount, setAgreedDiscount] = useState(3.0);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await retailerApi.createRetailer({
        legal_name: legalName,
        display_name: displayName || legalName,
        retailer_type: retailerType,
        gstin: gstin || undefined,
        pan: pan || undefined,
        email,
        phone,
        city,
        state,
        region,
        pincode,
        registered_address: registeredAddress,
        credit_limit: Number(creditLimit),
        payment_terms_days: Number(paymentTermsDays),
        agreed_discount_percent: Number(agreedDiscount),
        primary_distributor_id: primaryDistributorId || undefined,
        notes,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to onboard retailer outlet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Onboard Downstream Retailer</h2>
              <p className="text-xs text-slate-500">Register a new retail partner outlet or agricultural dealer.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Identity & Legal Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
              1. Merchant Identity & Classification
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 font-medium">Legal Registered Name *</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. Kisan Agro Agency LLP"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium">Store Display Name *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Kisan Agro Center (Nashik)"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium">Retailer Type</label>
                <select
                  value={retailerType}
                  onChange={(e) => setRetailerType(e.target.value as RetailerType)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="agro_input_shop">Agro Input Shop</option>
                  <option value="dealer_outlet">Dealer Outlet</option>
                  <option value="specialty_store">Specialty Store</option>
                  <option value="agricultural_retailer">Agricultural Retailer</option>
                  <option value="cooperative_society">Cooperative Society</option>
                  <option value="general_store">General Store</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="27AAAPL1234C1Z5"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-3 pt-2">
            <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
              2. Contact & Physical Location
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 font-medium">Primary Phone *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98220 12345"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium">Merchant Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@kisanagro.in"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium">City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Nashik"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium">State & Region</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="West">West</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="Central">Central</option>
                  </select>
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-slate-600 font-medium">Store Address *</label>
                <input
                  type="text"
                  value={registeredAddress}
                  onChange={(e) => setRegisteredAddress(e.target.value)}
                  placeholder="Shop No. 4, Market Yard, Nashik Road"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Fulfillment & Commercial Terms */}
          <div className="space-y-3 pt-2">
            <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
              3. Fulfillment & Commercial Controls
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-600 font-medium">Credit Limit (INR)</label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium">Payment Terms (Days)</label>
                <input
                  type="number"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium">Agreed Discount (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={agreedDiscount}
                  onChange={(e) => setAgreedDiscount(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Onboard Retailer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
