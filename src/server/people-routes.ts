// src/server/people-routes.ts
// Enterprise Staff & People Management REST API Endpoints (Phase 21)

import { Router, Request, Response } from 'express';
import { PeopleService } from './people-service.ts';
import { HrmsPayrollService } from './hrms-payroll-service.ts';

export const peopleRouter = Router();

// Helper to extract actor and organization ID
function getContext(req: Request) {
  const orgId = (req.headers['x-organization-id'] as string) || (req.query.org_id as string) || 'org-jyotsvan-corp';
  const actorId = (req.headers['x-user-id'] as string) || 'usr-super-admin';
  const actorEmail = (req.headers['x-user-email'] as string) || 'admin@jyotsvan.enterprise';
  return { orgId, actor: { id: actorId, email: actorEmail } };
}

// 1. Dashboard Metrics
peopleRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const metrics = await PeopleService.getDashboardMetrics(orgId);
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Employees Endpoints
peopleRouter.get('/employees', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const filters = {
      search: req.query.search as string,
      department_id: req.query.department_id as string,
      branch_id: req.query.branch_id as string,
      designation_id: req.query.designation_id as string,
      employment_type: req.query.employment_type as string,
      status: req.query.status as string,
      reporting_manager_id: req.query.reporting_manager_id as string,
    };
    const employees = await PeopleService.getEmployees(orgId, filters);
    res.json({ success: true, data: employees });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.get('/employees/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const emp = await PeopleService.getEmployeeById(orgId, req.params.id);
    if (!emp) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    res.json({ success: true, data: emp });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/employees', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const employee = await PeopleService.createEmployee(orgId, req.body, actor);
    res.status(201).json({ success: true, data: employee });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.put('/employees/:id', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const employee = await PeopleService.updateEmployee(orgId, req.params.id, req.body, actor);
    res.json({ success: true, data: employee });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.delete('/employees/:id', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const success = await PeopleService.deleteEmployee(orgId, req.params.id, actor);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Designations
peopleRouter.get('/designations', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const designations = await PeopleService.getDesignations(orgId);
    res.json({ success: true, data: designations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/designations', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const desig = await PeopleService.createDesignation(orgId, req.body);
    res.status(201).json({ success: true, data: desig });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Org Hierarchy
peopleRouter.get('/org-hierarchy', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const departmentId = req.query.department_id as string;
    const hierarchy = await PeopleService.getOrgHierarchy(orgId, departmentId);
    res.json({ success: true, data: hierarchy });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Attendance Records & Punch
peopleRouter.get('/attendance', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const filters = {
      date: req.query.date as string,
      month: req.query.month as string,
      employee_id: req.query.employee_id as string,
      department_id: req.query.department_id as string,
      status: req.query.status as string,
    };
    const records = await PeopleService.getAttendanceRecords(orgId, filters);
    res.json({ success: true, data: records });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/attendance/check-in', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { employee_id, check_in_time, source, location, remarks } = req.body;
    if (!employee_id) {
      return res.status(400).json({ success: false, error: 'Employee ID is required for check-in.' });
    }
    const record = await PeopleService.checkInAttendance(orgId, employee_id, { check_in_time, source, location, remarks }, actor);
    res.json({ success: true, data: record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/attendance/check-out', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { employee_id, check_out_time, location, remarks } = req.body;
    if (!employee_id) {
      return res.status(400).json({ success: false, error: 'Employee ID is required for check-out.' });
    }
    const record = await PeopleService.checkOutAttendance(orgId, employee_id, { check_out_time, location, remarks }, actor);
    res.json({ success: true, data: record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. Attendance Corrections
peopleRouter.get('/attendance/corrections', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const filters = {
      employee_id: req.query.employee_id as string,
      status: req.query.status as string,
    };
    const corrections = await PeopleService.getAttendanceCorrections(orgId, filters);
    res.json({ success: true, data: corrections });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/attendance/corrections', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const correction = await PeopleService.createAttendanceCorrection(orgId, req.body, actor);
    res.status(201).json({ success: true, data: correction });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/attendance/corrections/:id/review', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { decision, reviewer_notes } = req.body;
    if (!decision || (decision !== 'approved' && decision !== 'rejected')) {
      return res.status(400).json({ success: false, error: 'Decision must be approved or rejected.' });
    }
    const result = await PeopleService.reviewAttendanceCorrection(orgId, req.params.id, decision, reviewer_notes, actor);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. Leave Management
peopleRouter.get('/leave/types', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const types = await PeopleService.getLeaveTypes(orgId);
    res.json({ success: true, data: types });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.get('/leave/balances', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const employeeId = req.query.employee_id as string;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const balances = await PeopleService.getLeaveBalances(orgId, employeeId, year);
    res.json({ success: true, data: balances });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.get('/leave/requests', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const filters = {
      employee_id: req.query.employee_id as string,
      status: req.query.status as string,
      leave_type_id: req.query.leave_type_id as string,
    };
    const requests = await PeopleService.getLeaveRequests(orgId, filters);
    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/leave/requests', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const request = await PeopleService.createLeaveRequest(orgId, req.body, actor);
    res.status(201).json({ success: true, data: request });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/leave/requests/:id/review', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { decision, rejection_reason } = req.body;
    if (!decision || (decision !== 'approved' && decision !== 'rejected')) {
      return res.status(400).json({ success: false, error: 'Decision must be approved or rejected.' });
    }
    const result = await PeopleService.reviewLeaveRequest(orgId, req.params.id, decision, rejection_reason, actor);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 8. Performance & Targets
peopleRouter.get('/targets', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const filters = {
      employee_id: req.query.employee_id as string,
      period_identifier: req.query.period_identifier as string,
      status: req.query.status as string,
    };
    const targets = await PeopleService.getTargets(orgId, filters);
    res.json({ success: true, data: targets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/targets', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const target = await PeopleService.createOrUpdateTarget(orgId, req.body, actor);
    res.json({ success: true, data: target });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.get('/performance/reviews', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const filters = {
      employee_id: req.query.employee_id as string,
      period: req.query.period as string,
      status: req.query.status as string,
    };
    const reviews = await PeopleService.getPerformanceReviews(orgId, filters);
    res.json({ success: true, data: reviews });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/performance/reviews', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const review = await PeopleService.createPerformanceReview(orgId, req.body, actor);
    res.status(201).json({ success: true, data: review });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 9. Employee Documents
peopleRouter.get('/documents', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const employeeId = req.query.employee_id as string;
    const documents = await PeopleService.getEmployeeDocuments(orgId, employeeId);
    res.json({ success: true, data: documents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/documents', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const document = await PeopleService.uploadEmployeeDocument(orgId, req.body, actor);
    res.status(201).json({ success: true, data: document });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/documents/:id/verify', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const document = await PeopleService.verifyEmployeeDocument(orgId, req.params.id, actor);
    res.json({ success: true, data: document });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const success = await PeopleService.deleteEmployeeDocument(orgId, req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Workforce Tasks
peopleRouter.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const filters = {
      employee_id: req.query.employee_id as string,
      department_id: req.query.department_id as string,
      status: req.query.status as string,
    };
    const tasks = await PeopleService.getPeopleTasks(orgId, filters);
    res.json({ success: true, data: tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const task = await PeopleService.createPeopleTask(orgId, req.body, actor);
    res.status(201).json({ success: true, data: task });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.put('/tasks/:id/status', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { status, resolution_notes } = req.body;
    const task = await PeopleService.updatePeopleTaskStatus(orgId, req.params.id, status, resolution_notes, actor);
    res.json({ success: true, data: task });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 11. Shifts & Roster Endpoints
// ==========================================
peopleRouter.get('/shifts', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const shifts = await HrmsPayrollService.getShifts(orgId);
    res.json({ success: true, data: shifts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/shifts', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const shift = await HrmsPayrollService.createShift(orgId, req.body);
    res.status(201).json({ success: true, data: shift });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/shifts/assign', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const { employee_id, shift_id, effective_from } = req.body;
    const assignment = await HrmsPayrollService.assignShift(orgId, employee_id, shift_id, effective_from);
    res.status(201).json({ success: true, data: assignment });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 12. Holiday Calendar Endpoints
// ==========================================
peopleRouter.get('/holidays', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const holidays = await HrmsPayrollService.getHolidays(orgId, year);
    res.json({ success: true, data: holidays });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/holidays', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const holiday = await HrmsPayrollService.createHoliday(orgId, req.body);
    res.status(201).json({ success: true, data: holiday });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 13. Attendance Locking
// ==========================================
peopleRouter.post('/attendance/lock', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const { start_date, end_date } = req.body;
    const result = await HrmsPayrollService.lockAttendancePeriod(orgId, start_date, end_date);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 14. Salary Components & Structures
// ==========================================
peopleRouter.get('/salary/components', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const components = await HrmsPayrollService.getSalaryComponents(orgId);
    res.json({ success: true, data: components });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/salary/components', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const component = await HrmsPayrollService.createSalaryComponent(orgId, req.body);
    res.status(201).json({ success: true, data: component });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.get('/salary/structures', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const structures = await HrmsPayrollService.getSalaryStructures(orgId);
    res.json({ success: true, data: structures });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/salary/assign', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const assignment = await HrmsPayrollService.assignSalaryToEmployee(orgId, req.body);
    res.status(201).json({ success: true, data: assignment });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 15. Payroll Periods, Runs, Payslips & GL Handoff
// ==========================================
peopleRouter.get('/payroll/periods', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const periods = await HrmsPayrollService.getPayrollPeriods(orgId);
    res.json({ success: true, data: periods });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.get('/payroll/runs', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const runs = await HrmsPayrollService.getPayrollRuns(orgId);
    res.json({ success: true, data: runs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/payroll/runs/execute', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { period_id } = req.body;
    const run = await HrmsPayrollService.executePayrollRun(orgId, period_id, actor);
    res.status(201).json({ success: true, data: run });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.get('/payroll/payslips', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const runId = req.query.run_id as string;
    const employeeId = req.query.employee_id as string;
    const payslips = await HrmsPayrollService.getPayslips(orgId, runId, employeeId);
    res.json({ success: true, data: payslips });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/payroll/runs/:id/approve', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const handoff = await HrmsPayrollService.approveAndLockPayrollRun(orgId, req.params.id, actor);
    res.json({ success: true, data: handoff, message: 'Payroll run successfully approved, locked, and prepared for General Ledger handoff.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 16. Employee Exits, HR Requests & Announcements
// ==========================================
peopleRouter.get('/exits', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const exits = await HrmsPayrollService.getEmployeeExits(orgId);
    res.json({ success: true, data: exits });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/exits', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const exitRecord = await HrmsPayrollService.submitResignation(orgId, req.body);
    res.status(201).json({ success: true, data: exitRecord });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.get('/requests', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const requests = await HrmsPayrollService.getHRRequests(orgId);
    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/requests', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const newReq = await HrmsPayrollService.submitHRRequest(orgId, req.body);
    res.status(201).json({ success: true, data: newReq });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

peopleRouter.get('/announcements', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const announcements = await HrmsPayrollService.getAnnouncements(orgId);
    res.json({ success: true, data: announcements });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

peopleRouter.post('/announcements', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const announcement = await HrmsPayrollService.createAnnouncement(orgId, req.body);
    res.status(201).json({ success: true, data: announcement });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

