// src/app/pages/sales-orders/CommercialPricingEngineView.tsx
// Interactive Commercial Pricing Engine, Scheme Simulator & Statutory Tax Calculator (Phase 18)

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Percent,
  DollarSign,
  ShieldCheck,
  Building,
  Store,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { salesOrderApi } from '../../../services/salesOrderApi.ts';
import type { CustomerType, PricingCalculationSummary } from '../../../types/sales-orders.ts';

export const CommercialPricingEngineView: React.FC = () => {
  const [customerType, setCustomerType] = useState<CustomerType>('distributor');
  const [isInterstate, setIsInterstate] = useState<boolean>(false);
  const [unitPrice, setUnitPrice] = useState<number>(500);
  const [quantity, setQuantity] = useState<number>(100);
  const [itemDiscountPct, setItemDiscountPct] = useState<number>(5);
  const [orderDiscountPct, setOrderDiscountPct] = useState<number>(2);
  const [gstRate, setGstRate] = useState<number>(18);

  // Computations
  const grossSubtotal = unitPrice * quantity;
  const itemDiscount = (grossSubtotal * itemDiscountPct) / 100;
  const taxablePreOrder = grossSubtotal - itemDiscount;
  const orderDiscount = (taxablePreOrder * orderDiscountPct) / 100;
  const taxableValue = taxablePreOrder - orderDiscount;

  const totalGst = (taxableValue * gstRate) / 100;
  const cgst = isInterstate ? 0 : totalGst / 2;
  const sgst = isInterstate ? 0 : totalGst / 2;
  const igst = isInterstate ? totalGst : 0;

  const rawTotal = taxableValue + totalGst;
  const grandTotal = Math.round(rawTotal);
  const roundingAdjustment = grandTotal - rawTotal;

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between text-xs text-emerald-950">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Commercial Pricing & Statutory Tax Engine</h3>
            <p className="text-slate-600 text-[11px]">
              Real-time multi-tier discount simulation, state-tax GST resolution (CGST+SGST vs IGST), and credit rules.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input Sandbox */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-5 text-xs">
          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b pb-2">
            Simulation Parameters
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer Channel</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium"
              >
                <option value="distributor">Distributor Network (Standard Tier)</option>
                <option value="retailer">Retail Merchant (Direct Channel)</option>
                <option value="direct_customer">Direct Institutional Client</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supply Destination</label>
              <select
                value={isInterstate ? 'inter' : 'intra'}
                onChange={(e) => setIsInterstate(e.target.value === 'inter')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium"
              >
                <option value="intra">Intra-State (Local Depot State • CGST + SGST)</option>
                <option value="inter">Inter-State (Cross-State Transit • IGST)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catalog Unit Price (₹)</label>
              <input
                type="number"
                min="1"
                step="10"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Order Volume / Quantity</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Trade Scheme Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={itemDiscountPct}
                onChange={(e) => setItemDiscountPct(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Order-Level Cash Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={orderDiscountPct}
                onChange={(e) => setOrderDiscountPct(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Applicable GST Tariff Rate %</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium"
              >
                <option value={0}>0% (Exempt Essential)</option>
                <option value={5}>5% (Essential Drugs & Food)</option>
                <option value={12}>12% (Ayurvedic Formulations)</option>
                <option value={18}>18% (Standard FMCG / Commercial)</option>
                <option value={28}>28% (Luxury Goods)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Live Simulated Output Breakdown */}
        <div className="bg-emerald-950 text-white p-6 rounded-xl border border-emerald-900 shadow-md space-y-4 flex flex-col justify-between text-xs">
          <div>
            <div className="flex items-center space-x-2 border-b border-emerald-800 pb-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold uppercase tracking-wider text-emerald-200">
                Calculated Commercial Waterfall
              </h4>
            </div>

            <div className="space-y-2 pt-4">
              <div className="flex justify-between text-emerald-200/90">
                <span>Gross Commercial Value:</span>
                <span className="font-mono font-medium">₹{grossSubtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-amber-300">
                <span>Trade Scheme (-{itemDiscountPct}%):</span>
                <span className="font-mono font-medium">-₹{itemDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between text-amber-300">
                <span>Order Cash Disc (-{orderDiscountPct}%):</span>
                <span className="font-mono font-medium">-₹{orderDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between text-white font-bold border-t border-emerald-800 pt-2">
                <span>Net Taxable Base:</span>
                <span className="font-mono">₹{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {isInterstate ? (
                <div className="flex justify-between text-emerald-200/90">
                  <span>IGST (@{gstRate}%):</span>
                  <span className="font-mono font-medium">₹{igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-emerald-200/90">
                    <span>CGST (@{gstRate / 2}%):</span>
                    <span className="font-mono font-medium">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-200/90">
                    <span>SGST (@{gstRate / 2}%):</span>
                    <span className="font-mono font-medium">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}

              {roundingAdjustment !== 0 && (
                <div className="flex justify-between text-emerald-300/70 text-[11px]">
                  <span>Rounding Adj:</span>
                  <span className="font-mono">{roundingAdjustment > 0 ? '+' : ''}₹{roundingAdjustment.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-emerald-800 pt-4">
            <div className="text-[10px] text-emerald-300 uppercase tracking-widest font-semibold">
              Simulated Grand Total
            </div>
            <div className="text-3xl font-black text-white font-mono">
              ₹{grandTotal.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-300/80 mt-1">
              Effective Price Per Unit:{' '}
              <strong className="text-white font-mono">₹{(grandTotal / quantity).toFixed(2)}</strong> (incl. tax)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
