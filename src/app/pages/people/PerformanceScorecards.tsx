// src/app/pages/people/PerformanceScorecards.tsx
// Employee Targets, Quotas, Appraisal Reviews, and KPI Scorecards

import { useState, useEffect } from 'react';
import { 
  Target, Award, Star, Plus, CheckCircle2, AlertCircle, Filter, 
  User, Calendar, TrendingUp, Check, X, ShieldCheck
} from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { EmployeeTarget, PerformanceReview, Employee } from '../../../types/people.ts';

export function PerformanceScorecards() {
  const [activeTab, setActiveTab] = useState<'targets' | 'reviews'>('targets');
  const [targets, setTargets] = useState<EmployeeTarget[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [empFilter, setEmpFilter] = useState<string>('');

  // Target modal
  const [showTargetModal, setShowTargetModal] = useState<boolean>(false);
  const [targetForm, setTargetForm] = useState({
    employee_id: '',
    title: '',
    period_type: 'monthly',
    period_identifier: `M-${new Date().toISOString().slice(0, 7)}`,
    target_value: 100000,
    unit: 'INR',
  });
  const [savingTarget, setSavingTarget] = useState<boolean>(false);

  // Review modal
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewForm, setReviewForm] = useState({
    employee_id: '',
    period: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
    review_type: 'quarterly',
    rating_score: 4.5,
    strengths: '',
    growth_areas: '',
    manager_comments: '',
  });
  const [savingReview, setSavingReview] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [empFilter, activeTab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [tgtList, revList, empList] = await Promise.all([
        PeopleAPI.getTargets({ employee_id: empFilter || undefined }),
        PeopleAPI.getPerformanceReviews({ employee_id: empFilter || undefined }),
        PeopleAPI.getEmployees(),
      ]);

      setTargets(tgtList);
      setReviews(revList);
      setEmployees(empList);
    } catch (err: any) {
      setError(err.message || 'Failed to load performance scorecards.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTarget(e: React.FormEvent) {
    e.preventDefault();
    if (!targetForm.employee_id || !targetForm.title || !targetForm.target_value) return;
    setSavingTarget(true);
    setError(null);
    try {
      await PeopleAPI.saveTarget({
        employee_id: targetForm.employee_id,
        title: targetForm.title,
        period_type: targetForm.period_type as any,
        period_identifier: targetForm.period_identifier,
        target_value: Number(targetForm.target_value),
        unit: targetForm.unit,
        achieved_value: 0,
        status: 'active',
      });
      setShowTargetModal(false);
      setTargetForm({
        employee_id: '',
        title: '',
        period_type: 'monthly',
        period_identifier: `M-${new Date().toISOString().slice(0, 7)}`,
        target_value: 100000,
        unit: 'INR',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign target.');
    } finally {
      setSavingTarget(false);
    }
  }

  async function handleCreateReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewForm.employee_id || !reviewForm.period) return;
    setSavingReview(true);
    setError(null);
    try {
      await PeopleAPI.createPerformanceReview({
        employee_id: reviewForm.employee_id,
        period: reviewForm.period,
        review_type: reviewForm.review_type as any,
        rating_score: Number(reviewForm.rating_score),
        strengths: reviewForm.strengths || undefined,
        growth_areas: reviewForm.growth_areas || undefined,
        manager_comments: reviewForm.manager_comments || undefined,
        status: 'completed',
      });
      setShowReviewModal(false);
      setReviewForm({
        employee_id: '',
        period: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
        review_type: 'quarterly',
        rating_score: 4.5,
        strengths: '',
        growth_areas: '',
        manager_comments: '',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to record appraisal.');
    } finally {
      setSavingReview(false);
    }
  }

  const activeTargetsCount = targets.filter(t => t.status === 'active').length;
  const achievedTargetsCount = targets.filter(t => t.status === 'achieved').length;
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + Number(r.rating_score), 0) / reviews.length).toFixed(1)
    : '4.8';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-600" />
            Performance & KPI Scorecards
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational quotas, sales targets, achievement tracking, and performance reviews
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowTargetModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Target className="w-4 h-4 text-amber-600" />
            Assign KPI Target
          </button>
          <button
            type="button"
            onClick={() => setShowReviewModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Star className="w-4 h-4" />
            Conduct Appraisal
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Active KPI Targets</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{activeTargetsCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-600">Targets Achieved</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{achievedTargetsCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-amber-600">Appraisals Completed</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{reviews.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-indigo-600">Average Performance Rating</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-2xl font-bold text-indigo-700">{avgRating}</span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
        </div>
      </div>

      {/* Tab Nav & Content */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('targets')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'targets'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              KPI Targets & Quotas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'reviews'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Appraisal Reviews ({reviews.length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={empFilter}
              onChange={(e) => setEmpFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 max-w-xs"
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.display_name} ({e.employee_code})</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {error}
          </div>
        )}

        {/* TAB 1: TARGETS */}
        {activeTab === 'targets' && (
          <div className="space-y-3">
            {targets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {targets.map((tgt) => (
                  <div key={tgt.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-3 hover:border-slate-300 transition-colors">
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{tgt.title}</p>
                        <p className="text-slate-500">{tgt.employee_name} ({tgt.employee_code})</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        tgt.status === 'achieved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tgt.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Achievement Progress</span>
                        <span className="font-bold text-amber-700">{tgt.achievement_percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            tgt.achievement_percent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, tgt.achievement_percent)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Target: {Number(tgt.target_value).toLocaleString()} {tgt.unit}</span>
                        <span>Achieved: {Number(tgt.achieved_value).toLocaleString()} {tgt.unit}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Period: {tgt.period_identifier} ({tgt.period_type})</span>
                      <span>Target ID: {tgt.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                <Target className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-slate-700">No KPI targets configured</p>
                <p className="text-xs text-slate-400 mt-1">Assign targets to personnel to begin tracking operational achievement.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: APPRAISAL REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {reviews.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 hover:bg-slate-50 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{rev.employee_name}</span>
                        <span className="font-mono text-slate-400">({rev.employee_code})</span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {rev.period}
                        </span>
                        <span className="text-slate-500 capitalize">({rev.review_type})</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-full font-bold text-xs">
                        <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                        <span>{rev.rating_score} / 5.0</span>
                      </div>
                    </div>

                    {rev.strengths && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <p className="font-semibold text-slate-700">Key Strengths & Achievements:</p>
                        <p className="text-slate-600 italic mt-0.5">{rev.strengths}</p>
                      </div>
                    )}

                    {rev.growth_areas && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <p className="font-semibold text-slate-700">Opportunities for Growth:</p>
                        <p className="text-slate-600 italic mt-0.5">{rev.growth_areas}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Evaluated by: {rev.reviewer_name || 'Management'}</span>
                      {rev.manager_comments && <span className="text-slate-600">Remarks: "{rev.manager_comments}"</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                <Award className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-slate-700">No appraisal reviews completed yet</p>
                <p className="text-xs text-slate-400 mt-1">Conduct reviews using the button above.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Target className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">Assign Personnel KPI Target</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTarget} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Employee *</label>
                <select
                  required
                  value={targetForm.employee_id}
                  onChange={(e) => setTargetForm({ ...targetForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.display_name} ({e.employee_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Target Title / Metric *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Field Sales Revenue Quota"
                  value={targetForm.title}
                  onChange={(e) => setTargetForm({ ...targetForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Period Type</label>
                  <select
                    value={targetForm.period_type}
                    onChange={(e) => setTargetForm({ ...targetForm, period_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Period Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. M-2026-09"
                    value={targetForm.period_identifier}
                    onChange={(e) => setTargetForm({ ...targetForm, period_identifier: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Target Numeric Value *</label>
                  <input
                    type="number"
                    required
                    value={targetForm.target_value}
                    onChange={(e) => setTargetForm({ ...targetForm, target_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. INR, Units, Visits, Batches"
                    value={targetForm.unit}
                    onChange={(e) => setTargetForm({ ...targetForm, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTarget}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  {savingTarget ? 'Assigning...' : 'Assign Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Star className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">Conduct Performance Appraisal</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Employee *</label>
                <select
                  required
                  value={reviewForm.employee_id}
                  onChange={(e) => setReviewForm({ ...reviewForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.display_name} ({e.employee_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Review Period *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q3 2026"
                    value={reviewForm.period}
                    onChange={(e) => setReviewForm({ ...reviewForm, period: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Overall Rating (1 - 5) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    required
                    value={reviewForm.rating_score}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating_score: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Key Strengths & Notable Outcomes</label>
                <textarea
                  rows={2}
                  placeholder="Key contributions..."
                  value={reviewForm.strengths}
                  onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Opportunities for Growth</label>
                <textarea
                  rows={2}
                  placeholder="Areas to improve..."
                  value={reviewForm.growth_areas}
                  onChange={(e) => setReviewForm({ ...reviewForm, growth_areas: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Manager Remarks</label>
                <input
                  type="text"
                  placeholder="General evaluation summary..."
                  value={reviewForm.manager_comments}
                  onChange={(e) => setReviewForm({ ...reviewForm, manager_comments: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReview}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  {savingReview ? 'Recording...' : 'Submit Appraisal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
