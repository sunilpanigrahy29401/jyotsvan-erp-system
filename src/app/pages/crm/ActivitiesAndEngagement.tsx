import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  PhoneCall, 
  Calendar, 
  MessageSquare, 
  FileText, 
  MapPin, 
  AlertCircle, 
  Plus, 
  Search, 
  User,
  Building2,
  Check,
  X
} from 'lucide-react';
import { CrmApi } from '../../../services/crmApi';
import type { 
  CrmActivity, 
  CrmAccount, 
  CrmContact, 
  Lead,
  ActivityType 
} from '../../../types/crm';

interface ActivitiesAndEngagementProps {
  onNavigate?: (path: string) => void;
}

export const ActivitiesAndEngagement: React.FC<ActivitiesAndEngagementProps> = ({ onNavigate }) => {
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'calls' | 'meetings'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [completingActivityId, setCompletingActivityId] = useState<string | null>(null);
  const [completionOutcome, setCompletionOutcome] = useState<'positive' | 'neutral' | 'negative' | 'rescheduled'>('positive');
  const [completionNotes, setCompletionNotes] = useState<string>('');

  // Activity Form
  const [activityForm, setActivityForm] = useState({
    subject: '',
    activityType: 'phone_call' as ActivityType,
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    description: '',
    accountId: '',
    contactId: '',
    leadId: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [acts, accs, cons, lds] = await Promise.all([
        CrmApi.getActivities(),
        CrmApi.getAccounts(),
        CrmApi.getContacts(),
        CrmApi.getLeads()
      ]);
      setActivities(acts);
      setAccounts(accs);
      setContacts(cons);
      setLeads(lds);
    } catch (err) {
      console.error('Failed to load CRM activities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.subject) return;

    try {
      const created = await CrmApi.createActivity({
        subject: activityForm.subject,
        activity_type: activityForm.activityType,
        priority: activityForm.priority,
        due_date: activityForm.dueDate,
        description: activityForm.description || undefined,
        account_id: activityForm.accountId || undefined,
        contact_id: activityForm.contactId || undefined,
        lead_id: activityForm.leadId || undefined,
      });

      setActivities(prev => [created, ...prev]);
      setShowLogModal(false);
      setActivityForm({
        subject: '',
        activityType: 'phone_call',
        priority: 'normal',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        description: '',
        accountId: '',
        contactId: '',
        leadId: '',
      });
    } catch (err) {
      console.error('Failed to create activity', err);
    }
  };

  const handleCompleteActivity = async () => {
    if (!completingActivityId) return;
    try {
      const updated = await CrmApi.completeActivity(
        completingActivityId,
        completionOutcome,
        completionNotes
      );
      setActivities(prev => prev.map(a => a.id === completingActivityId ? updated : a));
      setCompletingActivityId(null);
      setCompletionNotes('');
    } catch (err) {
      console.error('Failed to complete activity', err);
    }
  };

  const filteredActivities = activities.filter(act => {
    const matchesSearch = 
      act.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.description && act.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'pending') return !act.is_completed;
    if (activeTab === 'completed') return act.is_completed;
    if (activeTab === 'calls') return act.activity_type === 'phone_call' || act.activity_type === 'whatsapp';
    if (activeTab === 'meetings') return act.activity_type === 'meeting' || act.activity_type === 'site_visit';
    return true;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'phone_call': return <PhoneCall className="w-4 h-4 text-blue-600" />;
      case 'meeting': return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'site_visit': return <MapPin className="w-4 h-4 text-amber-600" />;
      case 'task': return <Clock className="w-4 h-4 text-purple-600" />;
      default: return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const pendingCount = activities.filter(a => !a.is_completed).length;
  const completedCount = activities.filter(a => a.is_completed).length;
  const overdueCount = activities.filter(a => !a.is_completed && a.due_date && new Date(a.due_date) < new Date()).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Activities & Engagement</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              {pendingCount} Pending
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Chronological interaction history, upcoming follow-ups, and engagement tracking across leads and accounts.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log Activity / Task
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Action Items</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{pendingCount} Tasks</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overdue Tasks</div>
            <div className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {overdueCount} Critical
            </div>
          </div>
          <div className={`p-3 rounded-xl ${overdueCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completed Activities</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{completedCount} Logged</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Timeline ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedCount})
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'calls' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Calls & WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'meetings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Visits & Meetings
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Chronological Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No activities found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No matching activities in this view. Use the button above to log a new call, site visit, or task.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {filteredActivities.map((act) => {
              const isOverdue = !act.is_completed && act.due_date && new Date(act.due_date) < new Date();

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline bullet */}
                  <div className={`absolute -left-[27px] top-1 p-1.5 rounded-full border-2 border-white shadow-sm ${
                    act.is_completed ? 'bg-emerald-500 text-white' : 
                    isOverdue ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'
                  }`}>
                    {act.is_completed ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="bg-slate-50 hover:bg-slate-100/80 transition-colors p-4 rounded-xl border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-md shadow-2xs border border-slate-200">
                          {getActivityIcon(act.activity_type)}
                        </div>
                        <span className="font-semibold text-slate-900 text-sm">{act.subject}</span>
                        <span className="text-[11px] font-medium uppercase px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                          {act.activity_type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isOverdue && (
                          <span className="text-xs font-semibold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}

                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          act.is_completed 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {act.is_completed ? 'Completed' : 'Pending'}
                        </span>

                        {!act.is_completed && (
                          <button
                            onClick={() => setCompletingActivityId(act.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium shadow-2xs transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Mark Done
                          </button>
                        )}
                      </div>
                    </div>

                    {act.description && (
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {act.description}
                      </p>
                    )}

                    {act.outcome && (
                      <div className="mt-2 text-xs text-emerald-700 bg-emerald-50/70 border border-emerald-200 rounded p-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Outcome: <strong className="capitalize">{act.outcome}</strong></span>
                        {act.outcome_notes && <span className="text-slate-600 ml-2">({act.outcome_notes})</span>}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3 pt-2 border-t border-slate-200/40">
                      {act.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Due: {new Date(act.due_date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}

                      {act.account_id && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Account: {accounts.find(a => a.id === act.account_id)?.name || act.account_id}</span>
                        </div>
                      )}

                      {act.contact_id && (
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Contact: {contacts.find(c => c.id === act.contact_id)?.display_name || act.contact_id}</span>
                        </div>
                      )}

                      {act.lead_id && (
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Lead: {leads.find(l => l.id === act.lead_id)?.display_name || act.lead_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Activity Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Log Engagement / Schedule Task</h2>
              <button 
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discuss revised distribution margins for North zone"
                  value={activityForm.subject}
                  onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Activity Type
                  </label>
                  <select
                    value={activityForm.activityType}
                    onChange={(e) => setActivityForm({ ...activityForm, activityType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="phone_call">Phone Call</option>
                    <option value="meeting">In-Person Meeting</option>
                    <option value="site_visit">Site / Factory Visit</option>
                    <option value="whatsapp">WhatsApp Outreach</option>
                    <option value="email">Email Follow-up</option>
                    <option value="task">Internal Task</option>
                    <option value="note">Field Note</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={activityForm.priority}
                    onChange={(e) => setActivityForm({ ...activityForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Scheduled Due Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={activityForm.dueDate}
                  onChange={(e) => setActivityForm({ ...activityForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Associated Account
                  </label>
                  <select
                    value={activityForm.accountId}
                    onChange={(e) => setActivityForm({ ...activityForm, accountId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None / Unassigned</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Associated Contact
                  </label>
                  <select
                    value={activityForm.contactId}
                    onChange={(e) => setActivityForm({ ...activityForm, contactId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None / Unassigned</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Discussion Agenda / Detailed Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Record client questions, quotes discussed, or next action items..."
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Activity Modal */}
      {completingActivityId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Mark Activity as Completed</h2>
              <button 
                onClick={() => setCompletingActivityId(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Interaction Outcome
                </label>
                <select
                  value={completionOutcome}
                  onChange={(e) => setCompletionOutcome(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="positive">Positive / Proceeding to Quote</option>
                  <option value="neutral">Neutral / Follow-up Needed</option>
                  <option value="negative">Unfavorable / Not Interested</option>
                  <option value="rescheduled">Rescheduled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Closing Notes & Takeaways
                </label>
                <textarea
                  rows={3}
                  placeholder="Record summary of outcome, commitments made, or follow-up date..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompletingActivityId(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteActivity}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Confirm Completion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
