// src/app/pages/field-sales/components/CollectionModal.tsx
import React, { useState } from 'react';
import {
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Building2,
  Store,
  DollarSign,
  Receipt,
  FileCheck,
} from 'lucide-react';
import type { FieldSalesVisit, FieldCustomerType } from '../../../../types/field-sales';

interface CollectionModalProps {
  isOpen: boolean;
  visit?: FieldSalesVisit | null;
  customerType?: FieldCustomerType;
  customerId?: string;
  customerName?: string;
  onClose: () => void;
  onSuccess: (receipt: any) => void;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  isOpen,
  visit,
  customerType: propCustomerType,
  customerId: propCustomerId,
  customerName: propCustomerName,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>('');
  const [paymentMethodCode, setPaymentMethodCode] = useState<string>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');

  const targetCustomerType = visit?.customer_type || propCustomerType || 'retailer';
  const targetCustomerId = visit?.customer_id || propCustomerId || '';
  const targetCustomerName = visit?.customer_name || propCustomerName || 'Selected Customer';

  if (!isOpen) return null;

  const paymentMethods = [
    { code: 'cash', name: 'Cash Collection' },
    { code: 'cheque', name: 'Cheque Deposit' },
    { code: 'upi', name: 'UPI / QR Transfer' },
    { code: 'bank_transfer', name: 'NEFT / RTGS Bank Transfer' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    if (paymentMethodCode === 'cheque' && !chequeNumber.trim()) {
      setError('Cheque number is required for cheque collections.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedMethod = paymentMethods.find((m) => m.code === paymentMethodCode);
      const endpoint = visit
        ? `/api/field-sales/visits/${visit.id}/collection`
        : `/api/finance/payments`;

      const bodyData = visit
        ? {
            customerType: targetCustomerType,
            customerId: targetCustomerId,
            amount: numAmount,
            paymentMethodCode,
            paymentMethodName: selectedMethod?.name || 'Payment',
            referenceNumber: referenceNumber.trim() || undefined,
            chequeNumber: chequeNumber.trim() || undefined,
            chequeDate: chequeDate || undefined,
            bankName: bankName.trim() || undefined,
            notes: notes.trim() || undefined,
          }
        : {
            organizationId: 'org-jyotsvan-corp',
            customerType: targetCustomerType,
            customerId: targetCustomerId,
            customerName: targetCustomerName,
            amount: numAmount,
            paymentMethodCode,
            paymentMethodName: selectedMethod?.name || 'Payment',
            referenceNumber: referenceNumber.trim() || undefined,
            chequeNumber: chequeNumber.trim() || undefined,
            chequeDate: chequeDate || undefined,
            bankName: bankName.trim() || undefined,
            notes: notes.trim() || undefined,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': 'org-jyotsvan-corp',
          'x-user-id': visit?.salesperson_id || 'usr-fieldsales',
        },
        body: JSON.stringify(bodyData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record collection payment.');
      }

      onSuccess(json.data || json);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Field Collection</h3>
              <p className="text-xs text-slate-500">Collect dues & issue instant digital receipt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Header */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                targetCustomerType === 'distributor'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {targetCustomerType === 'distributor' ? (
                <Building2 className="w-4 h-4" />
              ) : (
                <Store className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 block truncate">
                {targetCustomerName}
              </span>
              <span className="text-[11px] text-slate-500 capitalize">
                {targetCustomerType} Ledger Settlement
              </span>
            </div>
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Collected Amount (INR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">₹</span>
              <input
                type="number"
                step="100"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2.5 text-sm font-bold font-mono rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((m) => (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => setPaymentMethodCode(m.code)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                    paymentMethodCode === m.code
                      ? 'border-purple-600 bg-purple-50/70 text-purple-900 ring-2 ring-purple-600/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Cheque Specific Fields */}
          {paymentMethodCode === 'cheque' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cheque Number *</label>
                <input
                  type="text"
                  required
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  placeholder="E.g., 048291"
                  className="w-full p-2 bg-white rounded-lg border border-slate-300 outline-none font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cheque Date</label>
                  <input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Drawee Bank</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="E.g., HDFC Bank"
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reference Number for UPI or NEFT */}
          {(paymentMethodCode === 'upi' || paymentMethodCode === 'bank_transfer') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Ref / UTR Number
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="E.g., UPI/418290192839 or UTR..."
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 outline-none font-mono"
              />
            </div>
          )}

          {/* Collection Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Collection Memo / Acknowledgement
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., Part payment settled against Invoice #001004"
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm transition inline-flex items-center gap-2 active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  Issue Receipt & Post
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
