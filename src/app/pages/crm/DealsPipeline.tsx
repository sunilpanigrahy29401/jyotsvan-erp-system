import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  DollarSign, 
  Calendar, 
  Building2, 
  TrendingUp, 
  CheckCircle2, 
  Send,
  X,
  Layers
} from 'lucide-react';
import { CrmApi } from '../../../services/crmApi';
import { ConfirmModal, EmployeeSelect, useAction, inputCls } from './shared.tsx';
import type { 
  Deal, 
  Pipeline, 
  PipelineStage, 
  CrmAccount, 
  CrmContact,
  DealHandoff 
} from '../../../types/crm';

interface DealsPipelineProps {
  onNavigate?: (path: string) => void;
}

export const DealsPipeline: React.FC<DealsPipelineProps> = ({ onNavigate }) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showCreateDealModal, setShowCreateDealModal] = useState<boolean>(false);
  const [selectedDealForHandoff, setSelectedDealForHandoff] = useState<Deal | null>(null);
  const [handoffNotes, setHandoffNotes] = useState<string>('');
  const [submittingHandoff, setSubmittingHandoff] = useState<boolean>(false);
  const [handoffSuccess, setHandoffSuccess] = useState<string | null>(null);

  // New Deal Form State
  const [dealForm, setDealForm] = useState({
    title: '',
    accountId: '',
    contactId: '',
    dealValue: '',
    stageId: '',
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
    ownerId: '',
  });
  const { run } = useAction();
  const [lostPrompt, setLostPrompt] = useState<{ dealId: string; stageId: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pipelinesData, accountsData, contactsData] = await Promise.all([
        CrmApi.getPipelines(),
        CrmApi.getAccounts(),
        CrmApi.getContacts()
      ]);

      setPipelines(pipelinesData);
      setAccounts(accountsData);
      setContacts(contactsData);

      const activePipe = pipelinesData[0];
      if (activePipe) {
        setSelectedPipelineId(activePipe.id);
        setStages(activePipe.stages || []);
        const dealsData = await CrmApi.getDeals(activePipe.id);
        setDeals(dealsData);
      }
    } catch (err) {
      console.error('Failed to load Deals Pipeline data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePipelineChange = async (pipeId: string) => {
    setSelectedPipelineId(pipeId);
    const pipe = pipelines.find(p => p.id === pipeId);
    if (pipe) {
      setStages(pipe.stages || []);
    }
    try {
      const dealsData = await CrmApi.getDeals(pipeId);
      setDeals(dealsData);
    } catch (err) {
      console.error('Failed to switch pipeline', err);
    }
  };

  const handleStageChange = async (dealId: string, newStageId: string, reason?: string) => {
    const targetStage = stages.find(s => s.id === newStageId);
    // Losing a deal needs a reason (it feeds win/loss analytics), so ask before calling the API.
    if (targetStage?.is_lost_stage && !reason) { setLostPrompt({ dealId, stageId: newStageId }); return; }
    const updated = await run(() => CrmApi.updateDealStage(dealId, newStageId, undefined, reason ? { win_loss_reason: reason } : {}));
    if (!updated) return;
    // The API returns the bare deal row; keep the joined display fields (account name, etc.) from the list.
    const merged = (prev: Deal) => ({ ...prev, ...updated });
    setDeals(prev => prev.map(d => d.id === dealId ? merged(d) : d));
    if (targetStage?.is_won_stage) {
      setSelectedDealForHandoff(merged(deals.find(d => d.id === dealId) as Deal));
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealForm.title || !dealForm.accountId) return;
    if (!dealForm.ownerId) { alert('Choose a deal owner.'); return; }

    {
      const initialStage = dealForm.stageId || stages[0]?.id;
      const created = await run(() => CrmApi.createDeal({
        owner_employee_id: dealForm.ownerId,
        title: dealForm.title,
        account_id: dealForm.accountId,
        primary_contact_id: dealForm.contactId || undefined,
        pipeline_id: selectedPipelineId,
        stage_id: initialStage,
        deal_value: parseFloat(dealForm.dealValue) || 0,
        expected_close_date: dealForm.expectedCloseDate,
        description: dealForm.description,
      }), 'Deal created.');
      if (!created) return;
      const account = accounts.find(a => a.id === dealForm.accountId);
      setDeals(prev => [{ ...created, account_name: account?.name } as Deal, ...prev]);
      setShowCreateDealModal(false);
      setDealForm({
        title: '',
        accountId: '',
        contactId: '',
        dealValue: '',
        stageId: '',
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: '',
        ownerId: '',
      });
    }
  };

  const handleInitiateHandoff = async () => {
    if (!selectedDealForHandoff) return;
    setSubmittingHandoff(true);
    const res = await run(() => CrmApi.createDealHandoff(selectedDealForHandoff.id, {
      special_terms: handoffNotes,
      delivery_timeline: 'Immediate dispatch upon commercial approval'
    }));
    setSubmittingHandoff(false);
    if (!res) return;
    setHandoffSuccess(`Sales handoff ${(res as any).handoff_number || ''} registered and waiting for operations review.`);
    setTimeout(() => {
      setHandoffSuccess(null);
      setSelectedDealForHandoff(null);
      setHandoffNotes('');
    }, 3000);
  };

  // Filter deals by search
  const filteredDeals = deals.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.account_name && d.account_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group deals by stage
  const dealsByStage = stages.reduce<Record<string, Deal[]>>((acc, stage) => {
    acc[stage.id] = filteredDeals.filter(d => d.stage_id === stage.id);
    return acc;
  }, {});

  const totalPipelineValue = filteredDeals.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0);
  const weightedPipelineValue = filteredDeals.reduce((sum, d) => {
    const stage = stages.find(s => s.id === d.stage_id);
    const prob = (stage?.default_probability || d.stage_probability || 30) / 100;
    return sum + ((Number(d.deal_value) || 0) * prob);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Pipelines & Deals</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              {filteredDeals.length} Deals Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Visual stage progression, probability-weighted forecasting, and automated Sales handoffs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Pipeline Switcher */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <Layers className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={selectedPipelineId}
              onChange={(e) => handlePipelineChange(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 border-none focus:ring-0 py-1 pr-8"
            >
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowCreateDealModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Deal
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Pipeline Value</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">₹{totalPipelineValue.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Weighted Expected Revenue</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">₹{Math.round(weightedPipelineValue).toLocaleString('en-IN')}</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Deals in Funnel</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{filteredDeals.length} Opportunities</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals by title or account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1200px]">
          {stages.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0);

            return (
              <div 
                key={stage.id}
                className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col min-w-[260px] max-w-[320px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: stage.color || '#64748b' }}
                    />
                    <h3 className="font-semibold text-sm text-slate-800 truncate" title={stage.name}>
                      {stage.name}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-600">
                    {stageDeals.length}
                  </span>
                </div>

                <div className="text-xs font-medium text-slate-500 mb-3">
                  ₹{stageTotal.toLocaleString('en-IN')} • {stage.default_probability}% prob
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {stageDeals.length === 0 ? (
                    <div className="h-28 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400">
                      No deals here
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div 
                        key={deal.id}
                        className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {deal.title}
                          </h4>
                          <span className="text-xs font-bold text-slate-800 shrink-0">
                            ₹{Number(deal.deal_value).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {deal.account_name && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 truncate">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{deal.account_name}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(deal.expected_close_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                          </div>

                          {/* Quick Stage Move Dropdown */}
                          <select
                            value={deal.stage_id}
                            onChange={(e) => handleStageChange(deal.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {stages.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Hand Off Button if Won */}
                        {stage.is_won_stage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDealForHandoff(deal);
                            }}
                            className="w-full mt-3 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-medium transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            Handoff to Sales
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Deal Modal */}
      {showCreateDealModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Create New Deal</h2>
              <button 
                onClick={() => setShowCreateDealModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Deal Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Master Batch Supply - Apex Retail"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Account *
                  </label>
                  <select
                    required
                    value={dealForm.accountId}
                    onChange={(e) => setDealForm({ ...dealForm, accountId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Primary Contact
                  </label>
                  <select
                    value={dealForm.contactId}
                    onChange={(e) => setDealForm({ ...dealForm, contactId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Contact</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Deal Owner *</label>
                <EmployeeSelect value={dealForm.ownerId} onChange={(v) => setDealForm({ ...dealForm, ownerId: v })} allowNone={false} className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Deal Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="250000"
                    value={dealForm.dealValue}
                    onChange={(e) => setDealForm({ ...dealForm, dealValue: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Target Close Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dealForm.expectedCloseDate}
                    onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Stage
                </label>
                <select
                  value={dealForm.stageId}
                  onChange={(e) => setDealForm({ ...dealForm, stageId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.default_probability}%)</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateDealModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales Handoff Modal */}
      {selectedDealForHandoff && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Initiate Sales & Order Handoff</h2>
                  <p className="text-xs text-slate-500">Bridge Closed Won deal to Sales Order & ERP fulfilment</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDealForHandoff(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {handoffSuccess ? (
              <div className="my-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Handoff Confirmed</div>
                  <div className="text-xs mt-1">{handoffSuccess}</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Deal:</span>
                    <span className="font-semibold text-slate-800">{selectedDealForHandoff.title}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Value:</span>
                    <span className="font-bold text-slate-900">₹{Number(selectedDealForHandoff.deal_value).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Target Account:</span>
                    <span className="font-medium text-slate-800">{selectedDealForHandoff.account_name || 'Primary Account'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Special Terms, Delivery Notes, or Dispatch Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter payment milestone terms, GST details, preferred delivery warehouse, or freight handling notes..."
                    value={handoffNotes}
                    onChange={(e) => setHandoffNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800">
                  <strong>Notice:</strong> This initiates an idempotent handoff record in <code className="text-xs font-mono bg-amber-100 px-1 py-0.5 rounded">crm_deal_handoffs</code> without duplicating sales ledger entries. Sales and operations coordinators will review and generate the official Proforma/Sales Order.
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedDealForHandoff(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingHandoff}
                    onClick={handleInitiateHandoff}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {submittingHandoff ? 'Submitting...' : 'Confirm Sales Handoff'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {lostPrompt && (
        <ConfirmModal title="Mark deal as lost" message="Record why this deal was lost. It feeds win/loss analysis." confirmLabel="Mark lost" danger withReason="Reason for loss"
          onClose={() => setLostPrompt(null)}
          onConfirm={(reason) => { const p = lostPrompt; setLostPrompt(null); void handleStageChange(p.dealId, p.stageId, reason); }} />
      )}
    </div>
  );
};
