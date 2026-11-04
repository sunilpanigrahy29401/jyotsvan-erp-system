// src/app/pages/crm/AccountsAndContacts.tsx
// Unified Commercial Accounts, Multi-Contact Directory, and Operational Entity Linking

import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Search, Plus, Filter, Link as LinkIcon, Phone, Mail, 
  MapPin, ShieldCheck, ChevronRight, X, RefreshCw, Briefcase, ExternalLink, AlertCircle
} from 'lucide-react';
import { CrmApi } from '../../../services/crmApi.ts';
import type { CrmAccount, CrmContact, CommercialRelationshipType } from '../../../types/crm.ts';

export function AccountsAndContacts() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'contacts'>('accounts');
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('all');

  // Modals & Drawers
  const [selectedAccount, setSelectedAccount] = useState<CrmAccount | null>(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);

  // New Account form state
  const [newAccount, setNewAccount] = useState<Partial<CrmAccount>>({
    name: '',
    legal_name: '',
    relationship_type: 'b2b_client',
    industry: 'Industrial Manufacturing',
    tier: 'tier_2',
    phone: '',
    email: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    credit_limit: 1000000,
  });

  // New Contact form state
  const [newContact, setNewContact] = useState<Partial<CrmContact>>({
    first_name: '',
    last_name: '',
    account_id: '',
    designation: '',
    department: 'Commercial',
    role: 'decision_maker',
    phone: '',
    email: '',
    is_primary: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accs, cons] = await Promise.all([
        CrmApi.getAccounts({
          search: search || undefined,
          relationship_type: relationshipFilter !== 'all' ? relationshipFilter : undefined,
        }),
        CrmApi.getContacts(),
      ]);
      setAccounts(accs);
      setContacts(cons);
    } catch (err: any) {
      setError(err.message || 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [relationshipFilter]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name) {
      alert('Account name is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await CrmApi.createAccount(newAccount);
      setShowCreateAccountModal(false);
      setNewAccount({
        name: '',
        legal_name: '',
        relationship_type: 'b2b_client',
        industry: 'Industrial Manufacturing',
        tier: 'tier_2',
        phone: '',
        email: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        credit_limit: 1000000,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error creating account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.first_name || !newContact.phone) {
      alert('Contact name and phone are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await CrmApi.createContact(newContact);
      setShowCreateContactModal(false);
      setNewContact({
        first_name: '',
        last_name: '',
        account_id: '',
        designation: '',
        department: 'Commercial',
        role: 'decision_maker',
        phone: '',
        email: '',
        is_primary: false,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error creating contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (!val) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher & Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 border-b sm:border-b-0 pb-2 sm:pb-0">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'accounts'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Company Accounts ({accounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'contacts'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Contact Directory ({contacts.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'accounts' ? (
            <button
              onClick={() => setShowCreateAccountModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Account</span>
            </button>
          ) : (
            <button
              onClick={() => setShowCreateContactModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Contact</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs"
            title="Refresh Records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ACCOUNTS VIEW */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Account Number & Name</th>
                  <th className="py-3 px-4">Relationship</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">City / State</th>
                  <th className="py-3 px-4">Open Deals</th>
                  <th className="py-3 px-4">Total Value</th>
                  <th className="py-3 px-4">Operational Link</th>
                  <th className="py-3 px-4">Account Owner</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-slate-400" />
                      Loading accounts directory...
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No commercial accounts registered.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => (
                    <tr
                      key={acc.id}
                      onClick={() => setSelectedAccount(acc)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{acc.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{acc.account_number} • {acc.industry || 'General'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium">
                          {acc.relationship_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {acc.tier.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {acc.city || '—'}, {acc.state || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {acc.open_deals_count || 0}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {formatCurrency(acc.total_deal_value)}
                      </td>
                      <td className="py-3 px-4">
                        {acc.linked_entity_type ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                            <LinkIcon className="w-3 h-3 text-emerald-600" />
                            <span className="capitalize">{acc.linked_entity_type} Record</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Unlinked</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {acc.assigned_employee_name || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedAccount(acc)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                        >
                          View 360
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTACTS VIEW */}
      {activeTab === 'contacts' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Contact Name</th>
                  <th className="py-3 px-4">Account / Company</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Buying Role</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Primary Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No contacts registered. Click "New Contact" to add key decision makers.
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-semibold text-slate-900">{c.display_name}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">{c.account_name || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{c.designation || 'Executive'}</td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {c.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{c.phone}</td>
                      <td className="py-3 px-4 text-slate-600">{c.email || '—'}</td>
                      <td className="py-3 px-4">
                        {c.is_primary ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            Primary
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Secondary</span>
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

      {/* ACCOUNT 360 DRAWER */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedAccount.name}</h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{selectedAccount.account_number} • {selectedAccount.relationship_type.replace('_', ' ')}</div>
              </div>
              <button onClick={() => setSelectedAccount(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* Linked Operational Record Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Master Operational Integrity</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  {selectedAccount.linked_entity_type 
                    ? `Linked to master ${selectedAccount.linked_entity_type} record. Operational credit limits and sales order history are harmonized without duplicate entities.`
                    : 'This CRM account is currently standalone. It will seamlessly link to the customer master upon Won deal sales handoff.'}
                </p>
              </div>

              {/* Coordinates */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account Coordinates</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Email:</span>
                    <span className="font-medium text-slate-800">{selectedAccount.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Phone:</span>
                    <span className="font-medium text-slate-800">{selectedAccount.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Location:</span>
                    <span className="font-medium text-slate-800">{selectedAccount.city || '—'}, {selectedAccount.state || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Credit Line:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(selectedAccount.credit_limit)}</span>
                  </div>
                </div>
              </div>

              {/* Contacts belonging to this account */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Associated Contacts</span>
                  <button
                    onClick={() => {
                      setNewContact({ ...newContact, account_id: selectedAccount.id });
                      setShowCreateContactModal(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Contact</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {contacts.filter(c => c.account_id === selectedAccount.id).map(c => (
                    <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{c.display_name}</span>
                          {c.is_primary && <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[9px] font-bold rounded">Primary</span>}
                        </div>
                        <div className="text-[10px] text-slate-500">{c.designation || 'Staff'} • {c.phone}</div>
                      </div>
                      <span className="capitalize text-[10px] bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
                        {c.role.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedAccount(null)}
                className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ACCOUNT MODAL */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Create Commercial Account</h3>
              <button onClick={() => setShowCreateAccountModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Company / Account Name *</label>
                <input
                  type="text"
                  required
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Kalinga Industrial Infrastructure"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Relationship Type</label>
                  <select
                    value={newAccount.relationship_type}
                    onChange={(e) => setNewAccount({ ...newAccount, relationship_type: e.target.value as CommercialRelationshipType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="b2b_client">B2B Institutional</option>
                    <option value="distributor">Distributor</option>
                    <option value="dealer">Dealer</option>
                    <option value="retailer">Retailer</option>
                    <option value="cf_partner">C&F Partner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Account Tier</label>
                  <select
                    value={newAccount.tier}
                    onChange={(e) => setNewAccount({ ...newAccount, tier: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="tier_1">Tier 1 (Strategic / High Volume)</option>
                    <option value="tier_2">Tier 2 (Standard Enterprise)</option>
                    <option value="tier_3">Tier 3 (Emerging)</option>
                    <option value="vip">VIP National Account</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Corporate Phone</label>
                  <input
                    type="text"
                    value={newAccount.phone || ''}
                    onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Official Email</label>
                  <input
                    type="email"
                    value={newAccount.email || ''}
                    onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={newAccount.city || ''}
                    onChange={(e) => setNewAccount({ ...newAccount, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={newAccount.state || ''}
                    onChange={(e) => setNewAccount({ ...newAccount, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateAccountModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg"
                >
                  {isSubmitting ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CONTACT MODAL */}
      {showCreateContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add New Contact</h3>
              <button onClick={() => setShowCreateContactModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Associate with Account</label>
                <select
                  value={newContact.account_id || ''}
                  onChange={(e) => setNewContact({ ...newContact, account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="">Standalone / Unassociated Contact</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newContact.first_name}
                    onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newContact.last_name || ''}
                    onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Designation</label>
                  <input
                    type="text"
                    value={newContact.designation || ''}
                    onChange={(e) => setNewContact({ ...newContact, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Buying Role</label>
                  <select
                    value={newContact.role}
                    onChange={(e) => setNewContact({ ...newContact, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="decision_maker">Decision Maker (C-Level/MD)</option>
                    <option value="procurement">Procurement Officer</option>
                    <option value="influencer">Influencer / Evaluator</option>
                    <option value="finance">Finance / Billing</option>
                    <option value="general">General Contact</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Direct Phone *</label>
                  <input
                    type="tel"
                    required
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Direct Email</label>
                  <input
                    type="email"
                    value={newContact.email || ''}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primaryContactCheckbox"
                  checked={Boolean(newContact.is_primary)}
                  onChange={(e) => setNewContact({ ...newContact, is_primary: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="primaryContactCheckbox" className="text-slate-700">Set as Primary Account Contact</label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateContactModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg"
                >
                  {isSubmitting ? 'Saving...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
