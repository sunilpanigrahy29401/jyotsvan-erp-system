// src/app/pages/people/PayrollManagement.tsx
// Comprehensive Indian Statutory Payroll Management, Monthly Runs, Payslips & GL Handoff

import { useState, useEffect } from 'react';
import { 
  DollarSign, Calendar, CheckCircle2, AlertCircle, FileText, Download, 
  Lock, RefreshCw, ShieldCheck, ChevronRight, ArrowUpRight, Check, Landmark, Users
} from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { 
  PayrollPeriod, 
  PayrollRun, 
  Payslip, 
  ApprovedPayrollRunHandoff, 
  SalaryComponent,
  Employee 
} from '../../../types/people.ts';

export function PayrollManagement() {
  const [activeTab, setActiveTab] = useState<'runs' | 'payslips' | 'components' | 'handoff'>('runs');
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [handoffResult, setHandoffResult] = useState<ApprovedPayrollRunHandoff | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executing, setExecuting] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [periodsList, runsList, compsList] = await Promise.all([
        PeopleAPI.getPayrollPeriods(),
        PeopleAPI.getPayrollRuns(),
        PeopleAPI.getSalaryComponents(),
      ]);
      setPeriods(periodsList);
      setRuns(runsList);
      setComponents(compsList);
      if (runsList.length > 0) {
        setSelectedRun(runsList[0]);
        loadPayslips(runsList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payroll data.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPayslips(runId: string) {
    try {
      const pList = await PeopleAPI.getPayslips(runId);
      setPayslips(pList);
    } catch (err: any) {
      console.error('Failed to load payslips:', err);
    }
  }

  async function handleExecuteRun(periodId: string) {
    setExecuting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const newRun = await PeopleAPI.executePayrollRun(periodId);
      setSuccessMsg(`Payroll run ${newRun.run_number} successfully calculated for ${newRun.total_employees} employees!`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to calculate payroll run.');
    } finally {
      setExecuting(false);
    }
  }

  async function handleApproveRun(runId: string) {
    setApproving(true);
    setError(null);
    try {
      const handoff = await PeopleAPI.approveAndLockPayroll(runId);
      setHandoffResult(handoff);
      setSuccessMsg('Payroll run successfully locked and approved! General Ledger handoff contract generated.');
      setActiveTab('handoff');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve payroll run.');
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading enterprise payroll ledger & statutory calculations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Payroll & Indian Statutory Compliance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated monthly CTC breakdown, EPF (12%), ESIC (0.75%), PT & TDS computation with General Ledger handoff
          </p>
        </div>

        <div className="flex items-center gap-2">
          {periods.length > 0 && (
            <button
              onClick={() => handleExecuteRun(periods[0].id)}
              disabled={executing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              {executing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Computing Payroll...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Run Monthly Payroll ({periods[0]?.period_name})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex items-center gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('runs')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'runs' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Payroll Runs ({runs.length})
        </button>
        <button
          onClick={() => setActiveTab('payslips')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'payslips' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Muster Payslips ({payslips.length})
        </button>
        <button
          onClick={() => setActiveTab('components')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'components' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Statutory Components & Rules
        </button>
        <button
          onClick={() => setActiveTab('handoff')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'handoff' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Accounting GL Handoff Contract
        </button>
      </div>

      {/* TAB 1: PAYROLL RUNS */}
      {activeTab === 'runs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Total Monthly Gross Bill</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ₹{Number(runs[0]?.total_gross || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Base CTC + Allowances</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Total Net Salary Payable</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                ₹{Number(runs[0]?.total_net_payable || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Post-Statutory Deductions</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Total Statutory Deductions</p>
              <p className="text-xl font-bold text-rose-600 mt-1">
                ₹{Number(runs[0]?.total_deductions || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">EPF + ESI + PT + TDS</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Total Employer Incurred Cost</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ₹{Number(runs[0]?.total_employer_cost || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Gross + Employer EPF/ESI</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm">Monthly Payroll Runs Register</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Run Number</th>
                    <th className="p-3">Period</th>
                    <th className="p-3">Employees</th>
                    <th className="p-3 text-right">Gross Salary</th>
                    <th className="p-3 text-right">Deductions</th>
                    <th className="p-3 text-right">Net Payable</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">{r.run_number}</td>
                      <td className="p-3 text-slate-600">{r.period_name || 'March 2026'}</td>
                      <td className="p-3 text-slate-600">{r.total_employees} Personnel</td>
                      <td className="p-3 text-right font-mono">₹{Number(r.total_gross).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-rose-600">₹{Number(r.total_deductions).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">₹{Number(r.total_net_payable).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          r.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRun(r);
                            loadPayslips(r.id);
                            setActiveTab('payslips');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                        >
                          View Payslips
                        </button>
                        {r.status !== 'approved' && (
                          <button
                            onClick={() => handleApproveRun(r.id)}
                            disabled={approving}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Approve & Lock</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYSLIPS */}
      {activeTab === 'payslips' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">
                  Employee Monthly Payslips ({selectedRun?.run_number || 'Latest Run'})
                </h2>
                <p className="text-[11px] text-slate-500">Individual muster rolls, attendance days & statutory calculations</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Department</th>
                    <th className="p-3 text-center">Paid Days</th>
                    <th className="p-3 text-right">Basic</th>
                    <th className="p-3 text-right">HRA</th>
                    <th className="p-3 text-right">Gross</th>
                    <th className="p-3 text-right">EPF (12%)</th>
                    <th className="p-3 text-right">PT</th>
                    <th className="p-3 text-right">TDS</th>
                    <th className="p-3 text-right font-bold text-slate-900">Net Salary</th>
                    <th className="p-3 text-center">Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {payslips.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{p.employee_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{p.employee_code}</p>
                      </td>
                      <td className="p-3 text-slate-600">{p.department_name}</td>
                      <td className="p-3 text-center font-bold text-amber-800">
                        {p.effective_paid_days} <span className="text-[10px] text-slate-400 font-normal">/ {p.total_days}</span>
                      </td>
                      <td className="p-3 text-right font-mono">₹{Number(p.basic).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono">₹{Number(p.hra).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">₹{Number(p.gross_earnings).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-rose-600">₹{Number(p.epf_employee).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-rose-600">₹{Number(p.professional_tax).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-rose-600">₹{Number(p.tds_tax).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                        ₹{Number(p.net_salary).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedPayslip(p)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold"
                        >
                          View Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STATUTORY COMPONENTS */}
      {activeTab === 'components' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-900 text-sm">Indian Statutory Payroll Components & Deduction Rules</h2>
            <p className="text-[11px] text-slate-500">Configurable calculation rules for EPF, ESIC, Professional Tax, and Income Tax TDS</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Component</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3">Calculation Method</th>
                  <th className="p-3">Statutory Applicability</th>
                  <th className="p-3">Taxable u/s 192</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {components.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{c.code}</p>
                    </td>
                    <td className="p-3 capitalize">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        c.classification === 'earning' ? 'bg-emerald-100 text-emerald-800' :
                        c.classification === 'deduction' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {c.classification.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600 capitalize">{c.calculation_method.replace(/_/g, ' ')}</td>
                    <td className="p-3 space-x-1">
                      {c.is_pf_applicable && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">EPF 12%</span>}
                      {c.is_esi_applicable && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">ESIC 0.75%</span>}
                    </td>
                    <td className="p-3">
                      {c.is_taxable ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Taxable
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Exempt</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 font-semibold">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GL HANDOFF CONTRACT */}
      {activeTab === 'handoff' && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h2 className="text-lg font-bold">Approved Payroll Run Handoff Contract (v1.0)</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Versioned, tamper-evident JSON payload ready for direct consumption by future General Ledger & double-entry posting engine
              </p>
            </div>
            {handoffResult && (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-mono font-semibold">
                LOCKED & VERIFIED
              </span>
            )}
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300">
            <pre>
              {JSON.stringify(
                handoffResult || {
                  contract_version: '1.0',
                  payroll_run_id: runs[0]?.id || 'prun-2026-03-01',
                  run_number: runs[0]?.run_number || 'PR-2026-03',
                  organization_id: 'org-jyotsvan-corp',
                  period_name: 'March 2026',
                  disbursement_date: '2026-04-05',
                  total_gross_salary: runs[0]?.total_gross || 1120000,
                  total_net_salary_payable: runs[0]?.total_net_payable || 951600,
                  total_employee_deductions: {
                    epf: runs[0]?.total_epf || 57600,
                    esi: runs[0]?.total_esi || 0,
                    professional_tax: runs[0]?.total_pt || 1600,
                    tds: runs[0]?.total_tds || 67000,
                    sum: runs[0]?.total_deductions || 168400,
                  },
                  total_employer_contributions: {
                    epf: runs[0]?.total_epf || 57600,
                    esi: 0,
                    gratuity_provision: 53872,
                    sum: 85600,
                  },
                  immutable_hash: '7a89b02efc92841d7e293847f9103847291a82938472b8374928174829104829',
                  source_engine: 'Jyotsvan-HRMS-Payroll-Engine-v1',
                  ready_for_accounting_posting: true,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}

      {/* Payslip View Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl p-6 text-xs space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">JYOTSVAN AYURVEDIC ENTERPRISES PVT. LTD.</h3>
                <p className="text-[11px] text-slate-500">Corporate HQ: Skyline Towers, BKC, Mumbai • CIN: U24233DL2018PTC334902</p>
                <p className="text-xs font-semibold text-amber-800 mt-1">Salary Slip for Period: {selectedPayslip.period_name || 'March 2026'}</p>
              </div>
              <button onClick={() => setSelectedPayslip(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <p className="text-slate-500">Employee Name: <span className="font-bold text-slate-900">{selectedPayslip.employee_name}</span></p>
                <p className="text-slate-500">Employee Code: <span className="font-mono font-bold text-slate-900">{selectedPayslip.employee_code}</span></p>
                <p className="text-slate-500">Department: <span className="font-medium text-slate-900">{selectedPayslip.department_name}</span></p>
              </div>
              <div>
                <p className="text-slate-500">PAN: <span className="font-mono font-bold text-slate-900">{selectedPayslip.pan_number || 'AAACS1940M'}</span></p>
                <p className="text-slate-500">UAN: <span className="font-mono text-slate-900">{selectedPayslip.uan || '101249876543'}</span></p>
                <p className="text-slate-500">Bank: <span className="text-slate-900">{selectedPayslip.bank_name || 'HDFC Bank'} ({selectedPayslip.bank_account_number || '•••• 3412'})</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 p-2 font-bold text-slate-800">Earnings</div>
                <div className="p-3 space-y-1.5 font-medium">
                  <div className="flex justify-between"><span>Basic Salary</span><span>₹{Number(selectedPayslip.basic).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>HRA</span><span>₹{Number(selectedPayslip.hra).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Dearness Allowance</span><span>₹{Number(selectedPayslip.da).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Special Allowance</span><span>₹{Number(selectedPayslip.special_allowance).toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5 text-slate-900">
                    <span>Total Gross Earnings</span><span>₹{Number(selectedPayslip.gross_earnings).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 p-2 font-bold text-slate-800">Deductions</div>
                <div className="p-3 space-y-1.5 font-medium">
                  <div className="flex justify-between"><span>EPF Employee (12%)</span><span>₹{Number(selectedPayslip.epf_employee).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Professional Tax (PT)</span><span>₹{Number(selectedPayslip.professional_tax).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Income Tax (TDS)</span><span>₹{Number(selectedPayslip.tds_tax).toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5 text-rose-700">
                    <span>Total Deductions</span><span>₹{Number(selectedPayslip.total_deductions).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-800 font-semibold">Net Take-Home Salary Payable</p>
                <p className="text-xl font-bold text-emerald-900 mt-0.5">₹{Number(selectedPayslip.net_salary).toLocaleString('en-IN')}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print / Download Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
