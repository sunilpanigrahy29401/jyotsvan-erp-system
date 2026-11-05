// src/app/pages/crm/LeadManagement.tsx
// Omnichannel Lead Directory, Qualification Scoring, Assignment & Transaction-Safe Conversion

import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Plus, ArrowRight, UserCheck, ShieldAlert, Phone, Mail, 
  Building2, MapPin, Calendar, Clock, RefreshCw, CheckCircle, Tag, Check, AlertCircle, X, ExternalLink
} from 'lucide-react';
import { CrmApi, CrmApiError } from '../../../services/crmApi.ts';
import { LeadDetailPanels, LeadToolbar } from './LeadExtras.tsx';
import { EmployeeSelect, useEmployees } from './shared.tsx';
import type { Lead, LeadStatus, LeadPriority, CommercialRelationshipType } from '../../../types/crm.ts';

interface LeadManagementProps {
  onLeadConverted?: () => void;
}

export function LeadManagement({ onLeadConverted }: LeadManagementProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');

  // Modals & Drawers
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Assign form
  const employees = useEmployees();
  const [assigneeId, setAssigneeId] = useState('');
  const [convertOwnerId, setConvertOwnerId] = useState('');
  const [assignTeam, setAssignTeam] = useState('Commercial Sales');

  // Convert form
  const [convertAccountName, setConvertAccountName] = useState('');
  const [convertDealTitle, setConvertDealTitle] = useState('');
  const [convertDealValue, setConvertDealValue] = useState(0);
  const [convertCloseDate, setConvertCloseDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Lead form
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    first_name: '',
    last_name: '',
    company_name: '',
    designation: '',
    phone: '',
    email: '',
    relationship_type: 'b2b_client',
    expected_requirement: '',
    estimated_deal_value: 500000,
    purchase_timeline: '30_days',
    priority: 'medium',
    city: '',
    state: '',
  });

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CrmApi.getLeads({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        relationship_type: relationshipFilter !== 'all' ? relationshipFilter : undefined,
      });
      setLeads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [statusFilter, priorityFilter, relationshipFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.first_name || !newLead.phone) {
      alert('First name and phone number are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      try {
        await CrmApi.createLead(newLead);
      } catch (err: any) {
        // A matching lead/contact/account already exists: let the user decide instead of silently creating a duplicate.
        if (err instanceof CrmApiError && err.code === 'DUPLICATE' && window.confirm(`${err.message}\n\nCreate this lead anyway?`)) {
          await CrmApi.createLead({ ...newLead, allow_duplicate: true });
        } else {
          throw err;
        }
      }
      setShowCreateModal(false);
      setNewLead({
        first_name: '',
        last_name: '',
        company_name: '',
        designation: '',
        phone: '',
        email: '',
        relationship_type: 'b2b_client',
        expected_requirement: '',
        estimated_deal_value: 500000,
        purchase_timeline: '30_days',
        priority: 'medium',
        city: '',
        state: '',
      });
      loadLeads();
    } catch (err: any) {
      alert(err.message || 'Error creating lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedLead) return;
    if (!assigneeId) { alert('Choose a representative.'); return; }
    setIsSubmitting(true);
    try {
      await CrmApi.assignLead(selectedLead.id, assigneeId, assignTeam);
      setShowAssignModal(false);
      loadLeads();
      if (selectedLead) {
        const refreshed = await CrmApi.getLeadById(selectedLead.id);
        setSelectedLead(refreshed);
      }
    } catch (err: any) {
      alert(err.message || 'Assignment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setIsSubmitting(true);
    try {
      const payload = {
        account_name: convertAccountName || selectedLead.company_name || `${selectedLead.display_name} Commercial Account`,
        deal_title: convertDealTitle || undefined,
        deal_value: convertDealValue || undefined,
        expected_close_date: convertCloseDate || undefined,
        owner_employee_id: convertOwnerId || selectedLead.assigned_employee_id || undefined,
      };
      try {
        await CrmApi.convertLead(selectedLead.id, payload);
      } catch (err: any) {
        // An account with the same phone/e-mail/GSTIN exists: offer to link to it rather than creating a second one.
        const match = err instanceof CrmApiError && err.code === 'DUPLICATE' ? (err.extra?.matches?.[0] as any) : null;
        if (match && window.confirm(`${err.message}\n\nLink this lead to "${match.label}" instead?`)) {
          await CrmApi.convertLead(selectedLead.id, { ...payload, existing_account_id: match.id });
        } else {
          throw err;
        }
      }
      setShowConvertModal(false);
      setSelectedLead(null);
      loadLeads();
      if (onLeadConverted) onLeadConverted();
      alert('Lead successfully converted to Account, Contact & Opportunity!');
    } catch (err: any) {
      alert(err.message || 'Conversion failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (!val) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">Urgent</span>;
      case 'high': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">High</span>;
      case 'medium': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">Medium</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">Low</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'qualified': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Qualified</span>;
      case 'converted': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Converted</span>;
      case 'contacted': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Contacted</span>;
      case 'assigned': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">Assigned</span>;
      case 'new': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">New</span>;
      case 'lost': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Lost</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">{s}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, company, phone, email..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="new">New Inquiries</option>
            <option value="assigned">Assigned</option>
            <option value="contacted">Contacted</option>
            <option value="attempted">Attempted</option>
            <option value="qualified">Qualified</option>
            <option value="nurturing">Nurturing</option>
            <option value="unqualified">Unqualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
            <option value="archived">Archived</option>
          </select>

          {/* Relationship Filter */}
          <select
            value={relationshipFilter}
            onChange={(e) => setRelationshipFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="all">All Relationship Types</option>
            <option value="b2b_client">B2B Institutional</option>
            <option value="distributor">Distributors</option>
            <option value="dealer">Dealers</option>
            <option value="retailer">Retailers</option>
            <option value="franchise">Franchise Prospects</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setRelationshipFilter('all');
              loadLeads();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
            title="Reset Filters"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      <LeadToolbar filters={{ status: statusFilter, priority: priorityFilter, search }} onChanged={loadLeads} />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Lead # / Prospect</th>
                <th className="py-3 px-4">Company & Designation</th>
                <th className="py-3 px-4">Relationship</th>
                <th className="py-3 px-4">Est. Deal Value</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-slate-400" />
                    Loading leads database...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No leads found matching criteria. Click "New Lead" to capture an inquiry.
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr 
                    key={l.id} 
                    onClick={() => setSelectedLead(l)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{l.display_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{l.lead_number} • {l.phone}{(l as any).sla_overdue && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold font-sans">SLA</span>}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{l.company_name || '—'}</div>
                      <div className="text-[10px] text-slate-500">{l.designation || 'Contact Person'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium">
                        {l.relationship_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {formatCurrency(l.estimated_deal_value)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getScoreColor(l.lead_score)}`}>
                        {l.lead_score}/100
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getPriorityBadge(l.priority)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(l.status)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {l.assigned_employee_name || <span className="text-amber-600 font-normal">Unassigned</span>}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {!l.is_converted && (
                          <button
                            onClick={() => {
                              setSelectedLead(l);
                              setConvertAccountName(l.company_name || `${l.display_name} Commercial Account`);
                              setConvertDealTitle(`${l.company_name || l.display_name} Annual Order`);
                              setConvertDealValue(l.estimated_deal_value || 500000);
                              setConvertCloseDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
                              setShowConvertModal(true);
                            }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
                            title="Convert Lead into Account & Deal"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Convert</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedLead(l)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEAD DETAIL DRAWER */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedLead.display_name}</h3>
                  {getStatusBadge(selectedLead.status)}
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedLead.lead_number} • {selectedLead.company_name || 'Individual Prospect'}
                </div>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* Quick Actions Bar in Drawer */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{selectedLead.assigned_employee_id ? 'Reassign Rep' : 'Assign Rep'}</span>
                </button>

                {!selectedLead.is_converted && (
                  <button
                    onClick={() => {
                      setConvertAccountName(selectedLead.company_name || `${selectedLead.display_name} Commercial Account`);
                      setConvertDealTitle(`${selectedLead.company_name || selectedLead.display_name} Supply Agreement`);
                      setConvertDealValue(selectedLead.estimated_deal_value || 500000);
                      setConvertCloseDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
                      setShowConvertModal(true);
                    }}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Convert to Account</span>
                  </button>
                )}
              </div>

              {/* Contact Information */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contact Coordinates</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Phone:</span>
                    <a href={`tel:${selectedLead.phone}`} className="font-semibold text-blue-600 hover:underline">
                      {selectedLead.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Email:</span>
                    <span className="font-medium text-slate-800">{selectedLead.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">City / State:</span>
                    <span className="font-medium text-slate-800">{selectedLead.city || '—'}, {selectedLead.state || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Relationship Type:</span>
                    <span className="font-semibold text-slate-900 capitalize">{selectedLead.relationship_type.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Requirement & Deal Scope */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commercial Scope & Requirement</div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Requirement Description:</span>
                    <p className="text-slate-800 font-medium mt-0.5">{selectedLead.expected_requirement || 'No specific requirement text provided.'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Est. Deal Value:</span>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(selectedLead.estimated_deal_value)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Purchase Timeline:</span>
                      <span className="font-semibold text-slate-800 capitalize">{selectedLead.purchase_timeline?.replace('_', ' ') || '30 days'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CRM Context & Lead Score */}
              <div className="p-3 bg-blue-50/50 border border-blue-200/80 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Lead Intelligence</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getScoreColor(selectedLead.lead_score)}`}>
                    Score: {selectedLead.lead_score}/100
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ingestion Source:</span>
                    <span className="font-medium text-slate-800">{selectedLead.source_name || 'Direct Entry'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Assigned Representative:</span>
                    <span className="font-semibold text-slate-900">{selectedLead.assigned_employee_name || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              <LeadDetailPanels
                lead={selectedLead}
                onChanged={async () => {
                  loadLeads();
                  try { setSelectedLead(await CrmApi.getLeadById(selectedLead.id)); } catch { /* keep the current view */ }
                }}
                onArchived={() => setSelectedLead(null)}
              />

              {/* Conversion Status if Converted */}
              {selectedLead.is_converted && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5 text-xs text-purple-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                    <span>Lead Converted to Commercial Master</span>
                  </div>
                  <p className="text-[11px] text-purple-800">
                    Converted on {new Date(selectedLead.converted_at || '').toLocaleDateString()}. Account, Contact, and Opportunity are active.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Created: {new Date(selectedLead.created_at).toLocaleString()}</span>
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE LEAD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Capture New Inbound Lead</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.first_name}
                    onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Ramesh"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newLead.last_name || ''}
                    onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Agarwal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Company / Organization Name</label>
                  <input
                    type="text"
                    value={newLead.company_name || ''}
                    onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Agarwal Infrastructure Ltd"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Designation</label>
                  <input
                    type="text"
                    value={newLead.designation || ''}
                    onChange={(e) => setNewLead({ ...newLead, designation: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Purchase Manager"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="+91 98XXX XXXXX"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newLead.email || ''}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="contact@company.in"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Relationship Type</label>
                  <select
                    value={newLead.relationship_type}
                    onChange={(e) => setNewLead({ ...newLead, relationship_type: e.target.value as CommercialRelationshipType })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="b2b_client">B2B Institutional</option>
                    <option value="distributor">Distributor Prospect</option>
                    <option value="dealer">Dealer</option>
                    <option value="retailer">Retailer</option>
                    <option value="franchise">Franchise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Estimated Value (₹)</label>
                  <input
                    type="number"
                    value={newLead.estimated_deal_value || 0}
                    onChange={(e) => setNewLead({ ...newLead, estimated_deal_value: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Purchase Timeline</label>
                  <select
                    value={newLead.purchase_timeline || '30_days'}
                    onChange={(e) => setNewLead({ ...newLead, purchase_timeline: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="immediate">Immediate (&lt; 7 Days)</option>
                    <option value="30_days">Within 30 Days</option>
                    <option value="90_days">Within 90 Days</option>
                    <option value="exploratory">Exploratory</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Expected Requirement & Notes</label>
                <textarea
                  rows={3}
                  value={newLead.expected_requirement || ''}
                  onChange={(e) => setNewLead({ ...newLead, expected_requirement: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none"
                  placeholder="Specific product formulation, batch volume, packaging, delivery address..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm"
                >
                  {isSubmitting ? 'Creating Lead...' : 'Save & Capture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN LEAD MODAL */}
      {showAssignModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Assign Sales Representative</h3>
            <p className="text-xs text-slate-500">
              Assigning {selectedLead.display_name} ({selectedLead.lead_number})
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Select Representative</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="">Select a representative…</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.display_name}{e.designation ? ` (${e.designation})` : ''}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Commercial Team</label>
                <input
                  type="text"
                  value={assignTeam}
                  onChange={(e) => setAssignTeam(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubmit}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-medium"
              >
                {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONVERT LEAD MODAL */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><UserCheck className="w-5 h-5" /></span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Convert Lead into Account & Deal</h3>
                  <p className="text-xs text-slate-500">Transaction-safe promotion into commercial master records</p>
                </div>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-semibold text-slate-800">Lead: {selectedLead.display_name}</div>
                <div className="text-[11px] text-slate-500">{selectedLead.company_name || 'Individual Prospect'} • {selectedLead.phone}</div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Account Name *</label>
                <input
                  type="text"
                  required
                  value={convertAccountName}
                  onChange={(e) => setConvertAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Opportunity Title</label>
                  <input
                    type="text"
                    value={convertDealTitle}
                    onChange={(e) => setConvertDealTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    placeholder="e.g. Annual Supply Agreement"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Opportunity Value (₹)</label>
                  <input
                    type="number"
                    value={convertDealValue}
                    onChange={(e) => setConvertDealValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Opportunity Owner</label>
                <EmployeeSelect value={convertOwnerId || selectedLead.assigned_employee_id || ''} onChange={setConvertOwnerId} allowNone={false} />
                <span className="block text-[10px] text-slate-400 mt-1">Required when an opportunity is created.</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Close Date</label>
                <input
                  type="date"
                  value={convertCloseDate}
                  onChange={(e) => setConvertCloseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] leading-relaxed">
                ✓ <strong>Preservation Guarantee:</strong> Original lead history, notes, and activity timeline will be permanently linked to the new Account and Deal.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
                >
                  {isSubmitting ? 'Converting...' : 'Execute Conversion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
