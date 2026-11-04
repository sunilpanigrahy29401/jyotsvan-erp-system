// src/services/people-api.ts
// Frontend API Client for Staff, HRMS, Indian Statutory Payroll & People Management (Phase 21 Full Scope)

import type {
  Employee,
  Designation,
  AttendanceRecord,
  AttendanceCorrection,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  EmployeeTarget,
  PerformanceReview,
  EmployeeDocument,
  PeopleTask,
  OrgNode,
  PeopleDashboardMetrics,
  Employee360View,
  ShiftMaster,
  ShiftAssignment,
  HolidayCalendar,
  SalaryComponent,
  SalaryStructure,
  EmployeeSalaryAssignment,
  PayrollPeriod,
  PayrollRun,
  Payslip,
  ApprovedPayrollRunHandoff,
  EmployeeExit,
  HRRequest,
  HRAnnouncement,
} from '../types/people.ts';

const BASE_URL = '/api/people';

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'x-organization-id': 'org-jyotsvan-corp',
    'x-user-id': 'usr-super-admin',
    'x-user-email': 'admin@jyotsvan.enterprise',
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data.data !== undefined ? data.data : data;
}

export const PeopleAPI = {
  // 1. Dashboard
  getDashboardMetrics: (): Promise<PeopleDashboardMetrics> => {
    return fetchJson<PeopleDashboardMetrics>(`${BASE_URL}/dashboard`);
  },

  // 2. Employees
  getEmployees: (filters: {
    search?: string;
    department_id?: string;
    branch_id?: string;
    designation_id?: string;
    employment_type?: string;
    status?: string;
    reporting_manager_id?: string;
  } = {}): Promise<Employee[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<Employee[]>(`${BASE_URL}/employees${q}`);
  },

  getEmployeeById: (id: string): Promise<Employee360View> => {
    return fetchJson<Employee360View>(`${BASE_URL}/employees/${id}`);
  },

  createEmployee: (data: Partial<Employee>): Promise<Employee> => {
    return fetchJson<Employee>(`${BASE_URL}/employees`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateEmployee: (id: string, data: Partial<Employee>): Promise<Employee> => {
    return fetchJson<Employee>(`${BASE_URL}/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteEmployee: (id: string): Promise<{ success: boolean }> => {
    return fetchJson<{ success: boolean }>(`${BASE_URL}/employees/${id}`, {
      method: 'DELETE',
    });
  },

  // 3. Designations
  getDesignations: (): Promise<Designation[]> => {
    return fetchJson<Designation[]>(`${BASE_URL}/designations`);
  },

  createDesignation: (data: { name: string; code: string; department_id?: string; description?: string }): Promise<Designation> => {
    return fetchJson<Designation>(`${BASE_URL}/designations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 4. Org Hierarchy Tree
  getOrgHierarchy: (): Promise<OrgNode[]> => {
    return fetchJson<OrgNode[]>(`${BASE_URL}/hierarchy`);
  },

  // 5. Attendance
  getAttendance: (filters: {
    date?: string;
    start_date?: string;
    end_date?: string;
    employee_id?: string;
    department_id?: string;
  } = {}): Promise<AttendanceRecord[]> => {
    return PeopleAPI.getAttendanceRecords(filters);
  },

  getAttendanceRecords: (filters: {
    date?: string;
    start_date?: string;
    end_date?: string;
    employee_id?: string;
    department_id?: string;
  } = {}): Promise<AttendanceRecord[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<AttendanceRecord[]>(`${BASE_URL}/attendance${q}`);
  },

  punchAttendance: (data: {
    employee_id: string;
    punch_type: 'check_in' | 'check_out';
    timestamp?: string;
    location?: string;
    remarks?: string;
  }): Promise<AttendanceRecord> => {
    return fetchJson<AttendanceRecord>(`${BASE_URL}/attendance/punch`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  checkIn: (data: { employee_id: string; location?: string; remarks?: string }): Promise<AttendanceRecord> => {
    return PeopleAPI.punchAttendance({
      ...data,
      punch_type: 'check_in',
    });
  },

  checkOut: (data: { employee_id: string; location?: string; remarks?: string }): Promise<AttendanceRecord> => {
    return PeopleAPI.punchAttendance({
      ...data,
      punch_type: 'check_out',
    });
  },

  lockAttendancePeriod: (startDate: string, endDate: string): Promise<{ locked_count: number }> => {
    return fetchJson<{ locked_count: number }>(`${BASE_URL}/attendance/lock`, {
      method: 'POST',
      body: JSON.stringify({ start_date: startDate, end_date: endDate }),
    });
  },

  getAttendanceCorrections: (filters: { status?: string; employee_id?: string } = {}): Promise<AttendanceCorrection[]> => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<AttendanceCorrection[]>(`${BASE_URL}/attendance/corrections${q}`);
  },

  requestAttendanceCorrection: (data: Partial<AttendanceCorrection>): Promise<AttendanceCorrection> => {
    return fetchJson<AttendanceCorrection>(`${BASE_URL}/attendance/corrections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createAttendanceCorrection: (data: Partial<AttendanceCorrection>): Promise<AttendanceCorrection> => {
    return PeopleAPI.requestAttendanceCorrection(data);
  },

  reviewAttendanceCorrection: (
    id: string,
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<AttendanceCorrection> => {
    return fetchJson<AttendanceCorrection>(`${BASE_URL}/attendance/corrections/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, reviewer_notes: notes }),
    });
  },

  // 6. Leave Management
  getLeaveTypes: (): Promise<LeaveType[]> => {
    return fetchJson<LeaveType[]>(`${BASE_URL}/leave/types`);
  },

  getLeaveBalances: (employeeId?: string, year?: number): Promise<LeaveBalance[]> => {
    const params = new URLSearchParams();
    if (employeeId) params.append('employee_id', employeeId);
    if (year) params.append('year', year.toString());
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<LeaveBalance[]>(`${BASE_URL}/leave/balances${q}`);
  },

  getLeaveRequests: (filters: {
    status?: string;
    employee_id?: string;
    department_id?: string;
  } = {}): Promise<LeaveRequest[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<LeaveRequest[]>(`${BASE_URL}/leave/requests${q}`);
  },

  applyLeave: (data: Partial<LeaveRequest>): Promise<LeaveRequest> => {
    return fetchJson<LeaveRequest>(`${BASE_URL}/leave/requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createLeaveRequest: (data: Partial<LeaveRequest>): Promise<LeaveRequest> => {
    return PeopleAPI.applyLeave(data);
  },

  reviewLeaveRequest: (
    id: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
  ): Promise<LeaveRequest> => {
    return fetchJson<LeaveRequest>(`${BASE_URL}/leave/requests/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, rejection_reason: rejectionReason }),
    });
  },

  // 7. Shifts & Rosters
  getShifts: (): Promise<ShiftMaster[]> => {
    return fetchJson<ShiftMaster[]>(`${BASE_URL}/shifts`);
  },

  createShift: (data: Partial<ShiftMaster>): Promise<ShiftMaster> => {
    return fetchJson<ShiftMaster>(`${BASE_URL}/shifts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  assignShift: (employeeId: string, shiftId: string, effectiveFrom: string): Promise<ShiftAssignment> => {
    return fetchJson<ShiftAssignment>(`${BASE_URL}/shifts/assign`, {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, shift_id: shiftId, effective_from: effectiveFrom }),
    });
  },

  // 8. Holidays
  getHolidays: (year?: number): Promise<HolidayCalendar[]> => {
    const q = year ? `?year=${year}` : '';
    return fetchJson<HolidayCalendar[]>(`${BASE_URL}/holidays${q}`);
  },

  createHoliday: (data: Partial<HolidayCalendar>): Promise<HolidayCalendar> => {
    return fetchJson<HolidayCalendar>(`${BASE_URL}/holidays`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 9. Salary Components & Structures
  getSalaryComponents: (): Promise<SalaryComponent[]> => {
    return fetchJson<SalaryComponent[]>(`${BASE_URL}/salary/components`);
  },

  createSalaryComponent: (data: Partial<SalaryComponent>): Promise<SalaryComponent> => {
    return fetchJson<SalaryComponent>(`${BASE_URL}/salary/components`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSalaryStructures: (): Promise<SalaryStructure[]> => {
    return fetchJson<SalaryStructure[]>(`${BASE_URL}/salary/structures`);
  },

  assignSalary: (data: Partial<EmployeeSalaryAssignment>): Promise<EmployeeSalaryAssignment> => {
    return fetchJson<EmployeeSalaryAssignment>(`${BASE_URL}/salary/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 10. Payroll Periods, Runs & Payslips
  getPayrollPeriods: (): Promise<PayrollPeriod[]> => {
    return fetchJson<PayrollPeriod[]>(`${BASE_URL}/payroll/periods`);
  },

  getPayrollRuns: (): Promise<PayrollRun[]> => {
    return fetchJson<PayrollRun[]>(`${BASE_URL}/payroll/runs`);
  },

  executePayrollRun: (periodId: string): Promise<PayrollRun> => {
    return fetchJson<PayrollRun>(`${BASE_URL}/payroll/runs/execute`, {
      method: 'POST',
      body: JSON.stringify({ period_id: periodId }),
    });
  },

  getPayslips: (runId?: string, employeeId?: string): Promise<Payslip[]> => {
    const params = new URLSearchParams();
    if (runId) params.append('run_id', runId);
    if (employeeId) params.append('employee_id', employeeId);
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<Payslip[]>(`${BASE_URL}/payroll/payslips${q}`);
  },

  approveAndLockPayroll: (runId: string): Promise<ApprovedPayrollRunHandoff> => {
    return fetchJson<ApprovedPayrollRunHandoff>(`${BASE_URL}/payroll/runs/${runId}/approve`, {
      method: 'POST',
    });
  },

  // 11. Performance & Targets
  getTargets: (filters: { employee_id?: string; period_identifier?: string; status?: string } = {}): Promise<EmployeeTarget[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<EmployeeTarget[]>(`${BASE_URL}/performance/targets${q}`);
  },

  createTarget: (data: Partial<EmployeeTarget>): Promise<EmployeeTarget> => {
    return fetchJson<EmployeeTarget>(`${BASE_URL}/performance/targets`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  saveTarget: (data: Partial<EmployeeTarget>): Promise<EmployeeTarget> => {
    return PeopleAPI.createTarget(data);
  },

  getReviews: (filters: { employee_id?: string; period?: string; status?: string } = {}): Promise<PerformanceReview[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<PerformanceReview[]>(`${BASE_URL}/performance/reviews${q}`);
  },

  getPerformanceReviews: (filters: { employee_id?: string; period?: string; status?: string } = {}): Promise<PerformanceReview[]> => {
    return PeopleAPI.getReviews(filters);
  },

  createReview: (data: Partial<PerformanceReview>): Promise<PerformanceReview> => {
    return fetchJson<PerformanceReview>(`${BASE_URL}/performance/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createPerformanceReview: (data: Partial<PerformanceReview>): Promise<PerformanceReview> => {
    return PeopleAPI.createReview(data);
  },

  // 12. Documents
  getDocuments: (employeeId?: string): Promise<EmployeeDocument[]> => {
    const q = employeeId ? `?employee_id=${employeeId}` : '';
    return fetchJson<EmployeeDocument[]>(`${BASE_URL}/documents${q}`);
  },

  uploadDocument: (data: Partial<EmployeeDocument>): Promise<EmployeeDocument> => {
    return fetchJson<EmployeeDocument>(`${BASE_URL}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyDocument: (id: string): Promise<EmployeeDocument> => {
    return fetchJson<EmployeeDocument>(`${BASE_URL}/documents/${id}/verify`, {
      method: 'POST',
    });
  },

  deleteDocument: (id: string): Promise<{ success: boolean }> => {
    return fetchJson<{ success: boolean }>(`${BASE_URL}/documents/${id}`, {
      method: 'DELETE',
    });
  },

  // 13. Tasks
  getTasks: (filters: { employee_id?: string; department_id?: string; status?: string } = {}): Promise<PeopleTask[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<PeopleTask[]>(`${BASE_URL}/tasks${q}`);
  },

  createTask: (data: Partial<PeopleTask>): Promise<PeopleTask> => {
    return fetchJson<PeopleTask>(`${BASE_URL}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateTaskStatus: (id: string, status: string, resolutionNotes?: string): Promise<PeopleTask> => {
    return fetchJson<PeopleTask>(`${BASE_URL}/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, resolution_notes: resolutionNotes }),
    });
  },

  // 14. Exits, Unified Requests & Announcements
  getExits: (): Promise<EmployeeExit[]> => {
    return fetchJson<EmployeeExit[]>(`${BASE_URL}/exits`);
  },

  submitResignation: (data: { employee_id: string; resignation_reason: string; notice_period_days?: number }): Promise<EmployeeExit> => {
    return fetchJson<EmployeeExit>(`${BASE_URL}/exits`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getRequests: (): Promise<HRRequest[]> => {
    return fetchJson<HRRequest[]>(`${BASE_URL}/requests`);
  },

  submitRequest: (data: Partial<HRRequest>): Promise<HRRequest> => {
    return fetchJson<HRRequest>(`${BASE_URL}/requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAnnouncements: (): Promise<HRAnnouncement[]> => {
    return fetchJson<HRAnnouncement[]>(`${BASE_URL}/announcements`);
  },

  createAnnouncement: (data: Partial<HRAnnouncement>): Promise<HRAnnouncement> => {
    return fetchJson<HRAnnouncement>(`${BASE_URL}/announcements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
