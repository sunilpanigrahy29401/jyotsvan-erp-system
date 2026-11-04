// src/server/hrms-payroll-service.ts
// Comprehensive Indian Payroll Engine, Shifts, Leave Policy, ESS & Accounting Handoff Service (Phase 21 Full Scope)

import { pool } from './db.ts';
import crypto from 'crypto';
import type {
  ShiftMaster,
  ShiftAssignment,
  HolidayCalendar,
  SalaryComponent,
  SalaryStructure,
  SalaryStructureComponent,
  EmployeeSalaryAssignment,
  PayrollPeriod,
  PayrollRun,
  Payslip,
  ApprovedPayrollRunHandoff,
  EmployeeExit,
  HRRequest,
  HRAnnouncement,
} from '../types/people.ts';

export class HrmsPayrollService {
  // ==========================================
  // MODULE 5: SHIFT MANAGEMENT
  // ==========================================
  public static async getShifts(orgId: string): Promise<ShiftMaster[]> {
    const res = await pool.query(
      `SELECT * FROM shifts WHERE organization_id = $1 ORDER BY code ASC`,
      [orgId]
    );
    return res.rows;
  }

  public static async createShift(orgId: string, data: Partial<ShiftMaster>): Promise<ShiftMaster> {
    const id = `shift-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const res = await pool.query(
      `INSERT INTO shifts (
        id, organization_id, code, name, start_time, end_time, grace_period_mins, break_duration_mins,
        half_day_hours, full_day_hours, is_overnight, overtime_eligible, night_allowance, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', NOW(), NOW()
      ) RETURNING *`,
      [
        id,
        orgId,
        data.code || `SH-${Date.now().toString().slice(-4)}`,
        data.name,
        data.start_time || '09:00:00',
        data.end_time || '17:30:00',
        data.grace_period_mins ?? 15,
        data.break_duration_mins ?? 60,
        data.half_day_hours ?? 4.5,
        data.full_day_hours ?? 8.5,
        Boolean(data.is_overnight),
        data.overtime_eligible !== false,
        data.night_allowance || 0,
      ]
    );
    return res.rows[0];
  }

  public static async assignShift(orgId: string, employeeId: string, shiftId: string, effectiveFrom: string): Promise<ShiftAssignment> {
    const id = `sa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await pool.query(
      `UPDATE employees SET shift_id = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
      [shiftId, employeeId, orgId]
    );
    const res = await pool.query(
      `INSERT INTO shift_assignments (id, organization_id, employee_id, shift_id, effective_from, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [id, orgId, employeeId, shiftId, effectiveFrom]
    );
    return res.rows[0];
  }

  // ==========================================
  // MODULE 6: HOLIDAY CALENDAR
  // ==========================================
  public static async getHolidays(orgId: string, year?: number): Promise<HolidayCalendar[]> {
    const res = await pool.query(
      `SELECT * FROM holiday_calendar 
       WHERE organization_id = $1 
         AND ($2::int IS NULL OR EXTRACT(YEAR FROM holiday_date) = $2)
       ORDER BY holiday_date ASC`,
      [orgId, year || null]
    );
    return res.rows;
  }

  public static async createHoliday(orgId: string, data: Partial<HolidayCalendar>): Promise<HolidayCalendar> {
    const id = `hol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const res = await pool.query(
      `INSERT INTO holiday_calendar (id, organization_id, branch_id, holiday_name, holiday_date, holiday_type, is_optional, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [
        id,
        orgId,
        data.branch_id || null,
        data.holiday_name,
        data.holiday_date,
        data.holiday_type || 'national',
        Boolean(data.is_optional),
        data.description || null,
      ]
    );
    return res.rows[0];
  }

  // ==========================================
  // MODULE 7: ATTENDANCE PERIOD LOCKING
  // ==========================================
  public static async lockAttendancePeriod(orgId: string, startDate: string, endDate: string): Promise<{ locked_count: number }> {
    const res = await pool.query(
      `UPDATE attendance_records
       SET is_locked = TRUE, updated_at = NOW()
       WHERE organization_id = $1 AND date >= $2 AND date <= $3
       RETURNING id`,
      [orgId, startDate, endDate]
    );
    return { locked_count: res.rowCount || 0 };
  }

  // ==========================================
  // MODULE 10: SALARY COMPONENTS
  // ==========================================
  public static async getSalaryComponents(orgId: string): Promise<SalaryComponent[]> {
    const res = await pool.query(
      `SELECT * FROM salary_components WHERE organization_id = $1 ORDER BY display_order ASC, code ASC`,
      [orgId]
    );
    return res.rows;
  }

  public static async createSalaryComponent(orgId: string, data: Partial<SalaryComponent>): Promise<SalaryComponent> {
    const id = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const res = await pool.query(
      `INSERT INTO salary_components (
        id, organization_id, code, name, classification, calculation_method, default_value,
        is_taxable, is_pf_applicable, is_esi_applicable, display_order, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW(), NOW()
      ) RETURNING *`,
      [
        id,
        orgId,
        data.code?.toUpperCase(),
        data.name,
        data.classification || 'earning',
        data.calculation_method || 'fixed',
        data.default_value ?? 0,
        data.is_taxable !== false,
        Boolean(data.is_pf_applicable),
        Boolean(data.is_esi_applicable),
        data.display_order || 1,
      ]
    );
    return res.rows[0];
  }

  // ==========================================
  // MODULE 11: SALARY STRUCTURES & ASSIGNMENTS
  // ==========================================
  public static async getSalaryStructures(orgId: string): Promise<SalaryStructure[]> {
    const res = await pool.query(
      `SELECT * FROM salary_structures WHERE organization_id = $1 ORDER BY code ASC`,
      [orgId]
    );
    return res.rows;
  }

  public static async assignSalaryToEmployee(orgId: string, data: Partial<EmployeeSalaryAssignment>): Promise<EmployeeSalaryAssignment> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Mark any prior assignment for this employee as superseded
      await client.query(
        `UPDATE employee_salary_assignments
         SET status = 'superseded'
         WHERE organization_id = $1 AND employee_id = $2 AND status = 'active'`,
        [orgId, data.employee_id]
      );

      const id = `sal-assign-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const basicMonthly = Number(data.basic_monthly || 0);
      const hraMonthly = Number(data.hra_monthly || Math.round(basicMonthly * 0.5));
      const daMonthly = Number(data.da_monthly || Math.round(basicMonthly * 0.1));
      const splMonthly = Number(data.special_allowance_monthly || 0);
      const baseMonthly = Number(data.base_ctc_monthly || (basicMonthly + hraMonthly + daMonthly + splMonthly));
      const baseAnnual = Number(data.base_ctc_annual || (baseMonthly * 12));

      const res = await client.query(
        `INSERT INTO employee_salary_assignments (
          id, organization_id, employee_id, salary_structure_id, effective_from,
          base_ctc_annual, base_ctc_monthly, basic_monthly, hra_monthly, da_monthly, special_allowance_monthly,
          conveyance_monthly, medical_monthly, epf_applicable, esi_applicable, pt_applicable, tds_monthly, notes, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, 'active', NOW()
        ) RETURNING *`,
        [
          id,
          orgId,
          data.employee_id,
          data.salary_structure_id || 'struct-standard-exec',
          data.effective_from || new Date().toISOString().split('T')[0],
          baseAnnual,
          baseMonthly,
          basicMonthly,
          hraMonthly,
          daMonthly,
          splMonthly,
          data.conveyance_monthly || 1600,
          data.medical_monthly || 1250,
          data.epf_applicable !== false,
          Boolean(data.esi_applicable),
          data.pt_applicable !== false,
          data.tds_monthly || 0,
          data.notes || null,
        ]
      );

      await client.query('COMMIT;');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // MODULE 12 & 13: PAYROLL CALCULATION & PROCESSING (INDIAN STATUTORY RULES)
  // ==========================================
  public static async getPayrollPeriods(orgId: string): Promise<PayrollPeriod[]> {
    const res = await pool.query(
      `SELECT * FROM payroll_periods WHERE organization_id = $1 ORDER BY year DESC, month DESC`,
      [orgId]
    );
    return res.rows;
  }

  public static async getPayrollRuns(orgId: string): Promise<PayrollRun[]> {
    const res = await pool.query(
      `SELECT pr.*, pp.period_name
       FROM payroll_runs pr
       LEFT JOIN payroll_periods pp ON pr.period_id = pp.id
       WHERE pr.organization_id = $1
       ORDER BY pr.start_date DESC`,
      [orgId]
    );
    return res.rows;
  }

  public static async executePayrollRun(
    orgId: string,
    periodId: string,
    actor: { id: string; email: string }
  ): Promise<PayrollRun> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Fetch period
      const pRes = await client.query(
        `SELECT * FROM payroll_periods WHERE id = $1 AND organization_id = $2`,
        [periodId, orgId]
      );
      if (pRes.rows.length === 0) throw new Error('Payroll period not found');
      const period = pRes.rows[0];

      // 2. Fetch all active employees with active salary assignments
      const empRes = await client.query(
        `SELECT 
           e.id, e.employee_code, e.display_name, e.department_id, e.branch_id, e.designation_id,
           e.pan_number, e.uan, e.bank_name, e.bank_account_number,
           sa.basic_monthly, sa.hra_monthly, sa.da_monthly, sa.special_allowance_monthly,
           sa.conveyance_monthly, sa.medical_monthly, sa.epf_applicable, sa.esi_applicable,
           sa.pt_applicable, sa.tds_monthly,
           d.name as department_name, des.name as designation_name, b.name as branch_name
         FROM employees e
         JOIN employee_salary_assignments sa ON e.id = sa.employee_id AND sa.status = 'active'
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations des ON e.designation_id = des.id
         LEFT JOIN branches b ON e.branch_id = b.id
         WHERE e.organization_id = $1 AND e.status = 'active'`,
        [orgId]
      );

      const runId = `prun-${period.year}-${String(period.month).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
      const runNumber = `PR-${period.year}-${String(period.month).padStart(2, '0')}`;
      const totalDaysInMonth = period.total_working_days || 26;

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      let totalEmployerCost = 0;
      let totalEpf = 0;
      let totalEsi = 0;
      let totalPt = 0;
      let totalTds = 0;

      // Clean old draft runs for this period if re-calculating
      await client.query(
        `DELETE FROM payslips WHERE payroll_run_id IN (SELECT id FROM payroll_runs WHERE period_id = $1 AND status = 'draft')`,
        [periodId]
      );
      await client.query(
        `DELETE FROM payroll_runs WHERE period_id = $1 AND status = 'draft'`,
        [periodId]
      );

      // Create Run Record
      await client.query(
        `INSERT INTO payroll_runs (
          id, organization_id, period_id, run_number, start_date, end_date,
          total_employees, total_gross, total_deductions, total_net_payable, total_employer_cost,
          total_epf, total_esi, total_pt, total_tds, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, 0, 0, 0, 0, 0, 0, 0, 0, 'draft', NOW(), NOW()
        )`,
        [runId, orgId, periodId, runNumber, period.start_date, period.end_date, empRes.rows.length]
      );

      for (const emp of empRes.rows) {
        // Attendance Days Calculation
        const attRes = await client.query(
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'present') as present_count,
             COUNT(*) FILTER (WHERE status = 'half_day') as half_day_count,
             COUNT(*) FILTER (WHERE status = 'leave') as leave_count,
             COUNT(*) FILTER (WHERE status = 'absent') as absent_count
           FROM attendance_records
           WHERE organization_id = $1 AND employee_id = $2
             AND date >= $3 AND date <= $4`,
          [orgId, emp.id, period.start_date, period.end_date]
        );

        const presentCount = parseFloat(attRes.rows[0]?.present_count || '0');
        const halfDayCount = parseFloat(attRes.rows[0]?.half_day_count || '0');
        const leaveCount = parseFloat(attRes.rows[0]?.leave_count || '0');
        const absentCount = parseFloat(attRes.rows[0]?.absent_count || '0');

        // Effective Paid Days (Assuming standard 26-day working month or default to full month if attendance was not recorded daily)
        let effectivePaidDays = presentCount + (halfDayCount * 0.5) + leaveCount;
        if (effectivePaidDays === 0) {
          // Default to full working days for demo / salaried staff with no recorded leaves
          effectivePaidDays = totalDaysInMonth;
        }

        const lopDays = Math.max(0, totalDaysInMonth - effectivePaidDays);
        const attendanceFactor = Math.min(1.0, effectivePaidDays / totalDaysInMonth);

        // Earnings
        const basic = Math.round(Number(emp.basic_monthly || 0) * attendanceFactor);
        const hra = Math.round(Number(emp.hra_monthly || 0) * attendanceFactor);
        const da = Math.round(Number(emp.da_monthly || 0) * attendanceFactor);
        const special = Math.round(Number(emp.special_allowance_monthly || 0) * attendanceFactor);
        const conveyance = Math.round(Number(emp.conveyance_monthly || 0) * attendanceFactor);
        const medical = Math.round(Number(emp.medical_monthly || 0) * attendanceFactor);
        const grossEarnings = basic + hra + da + special + conveyance + medical;

        // Statutory Deductions (Indian Rules: EPF 12% on Basic+DA capped at 15k wage ceiling if applicable, or actuals)
        const epfWage = basic + da;
        const epfEmployee = emp.epf_applicable ? Math.round(Math.min(epfWage, 15000) * 0.12) : 0;
        const epfEmployer = emp.epf_applicable ? Math.round(Math.min(epfWage, 15000) * 0.12) : 0;

        // ESIC: Applicable only if Gross <= 21,000 INR
        const esiEmployee = (emp.esi_applicable && grossEarnings <= 21000) ? Math.round(grossEarnings * 0.0075) : 0;
        const esiEmployer = (emp.esi_applicable && grossEarnings <= 21000) ? Math.round(grossEarnings * 0.0325) : 0;

        // Professional Tax: Standard Indian slab (INR 200/mo, Feb usually 300)
        const pt = emp.pt_applicable ? 200 : 0;
        const tds = Math.round(Number(emp.tds_monthly || 0));

        const totalEmpDeductions = epfEmployee + esiEmployee + pt + tds;
        const netSalary = grossEarnings - totalEmpDeductions;
        const employerContribution = epfEmployer + esiEmployer;
        const ctcIncurred = grossEarnings + employerContribution;

        // Update aggregates
        totalGross += grossEarnings;
        totalDeductions += totalEmpDeductions;
        totalNet += netSalary;
        totalEmployerCost += ctcIncurred;
        totalEpf += epfEmployee;
        totalEsi += esiEmployee;
        totalPt += pt;
        totalTds += tds;

        // Generate individual payslip
        const payslipId = `pslip-${runId}-${emp.id}`;
        await client.query(
          `INSERT INTO payslips (
            id, organization_id, payroll_run_id, employee_id,
            period_month, period_year, total_days, present_days, paid_leaves, unpaid_leaves_lop, effective_paid_days,
            basic, hra, da, conveyance, special_allowance, medical_allowance, overtime_pay, bonus_incentives, gross_earnings,
            epf_employee, esi_employee, professional_tax, tds_tax, other_deductions, total_deductions, net_salary,
            epf_employer, esi_employer, total_employer_contribution, total_ctc_incurred, payment_status, created_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17, 0, 0, $18,
            $19, $20, $21, $22, 0, $23, $24,
            $25, $26, $27, $28, 'unpaid', NOW()
          )`,
          [
            payslipId,
            orgId,
            runId,
            emp.id,
            period.month,
            period.year,
            totalDaysInMonth,
            presentCount,
            leaveCount,
            lopDays,
            effectivePaidDays,
            basic,
            hra,
            da,
            conveyance,
            special,
            medical,
            grossEarnings,
            epfEmployee,
            esiEmployee,
            pt,
            tds,
            totalEmpDeductions,
            netSalary,
            epfEmployer,
            esiEmployer,
            employerContribution,
            ctcIncurred,
          ]
        );
      }

      // Update Run Totals
      const finalRunRes = await client.query(
        `UPDATE payroll_runs SET
          total_gross = $1,
          total_deductions = $2,
          total_net_payable = $3,
          total_employer_cost = $4,
          total_epf = $5,
          total_esi = $6,
          total_pt = $7,
          total_tds = $8,
          status = 'calculated',
          updated_at = NOW()
        WHERE id = $9 AND organization_id = $10
        RETURNING *`,
        [
          totalGross,
          totalDeductions,
          totalNet,
          totalEmployerCost,
          totalEpf,
          totalEsi,
          totalPt,
          totalTds,
          runId,
          orgId,
        ]
      );

      await client.query('COMMIT;');
      return finalRunRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // MODULE 14: PAYSLIP RETRIEVAL
  // ==========================================
  public static async getPayslips(orgId: string, runId?: string, employeeId?: string): Promise<Payslip[]> {
    const params: any[] = [orgId];
    let sql = `
      SELECT 
        p.*,
        e.employee_code,
        e.display_name as employee_name,
        e.pan_number,
        e.uan,
        e.bank_name,
        e.bank_account_number,
        d.name as department_name,
        des.name as designation_name,
        b.name as branch_name,
        pp.period_name
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      JOIN payroll_runs pr ON p.payroll_run_id = pr.id
      JOIN payroll_periods pp ON pr.period_id = pp.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE p.organization_id = $1
    `;

    if (runId) {
      params.push(runId);
      sql += ` AND p.payroll_run_id = $${params.length}`;
    }

    if (employeeId) {
      params.push(employeeId);
      sql += ` AND p.employee_id = $${params.length}`;
    }

    sql += ` ORDER BY e.employee_code ASC`;

    const res = await pool.query(sql, params);
    return res.rows;
  }

  // ==========================================
  // MODULE 6 (CONTRACT): APPROVED PAYROLL RUN HANDOFF (FUTURE ACCOUNTING GL)
  // ==========================================
  public static async approveAndLockPayrollRun(
    orgId: string,
    runId: string,
    actor: { id: string; email: string }
  ): Promise<ApprovedPayrollRunHandoff> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Fetch Run
      const runRes = await client.query(
        `SELECT pr.*, pp.period_name, pp.year, pp.month
         FROM payroll_runs pr
         JOIN payroll_periods pp ON pr.period_id = pp.id
         WHERE pr.id = $1 AND pr.organization_id = $2`,
        [runId, orgId]
      );
      if (runRes.rows.length === 0) throw new Error('Payroll run not found');
      const run = runRes.rows[0];

      // 2. Fetch Department Breakdown
      const deptRes = await client.query(
        `SELECT 
           d.id as department_id,
           d.name as department_name,
           COUNT(p.employee_id) as employee_count,
           COALESCE(SUM(p.gross_earnings), 0) as gross_salary,
           COALESCE(SUM(p.net_salary), 0) as net_salary,
           COALESCE(SUM(p.total_ctc_incurred), 0) as employer_cost
         FROM payslips p
         JOIN employees e ON p.employee_id = e.id
         JOIN departments d ON e.department_id = d.id
         WHERE p.payroll_run_id = $1 AND p.organization_id = $2
         GROUP BY d.id, d.name`,
        [runId, orgId]
      );

      // 3. Mark Approved & Locked
      const approvedAt = new Date().toISOString();
      await client.query(
        `UPDATE payroll_runs SET
          status = 'approved',
          approved_by = $1,
          approved_at = $2,
          locked_at = $2,
          updated_at = NOW()
        WHERE id = $3 AND organization_id = $4`,
        [actor.id, approvedAt, runId, orgId]
      );

      // Lock all payslips to ready for disbursement
      await client.query(
        `UPDATE payslips SET payment_status = 'unpaid' WHERE payroll_run_id = $1 AND organization_id = $2`,
        [runId, orgId]
      );

      // 4. Compute Immutable Hash for the Handoff Payload
      const payloadString = JSON.stringify({
        run_number: run.run_number,
        orgId,
        gross: run.total_gross,
        net: run.total_net_payable,
        epf: run.total_epf,
        esi: run.total_esi,
        pt: run.total_pt,
        tds: run.total_tds,
        approvedAt,
      });
      const immutableHash = crypto.createHash('sha256').update(payloadString).digest('hex');

      const handoff: ApprovedPayrollRunHandoff = {
        contract_version: '1.0',
        payroll_run_id: run.id,
        run_number: run.run_number,
        organization_id: orgId,
        period_name: run.period_name,
        period_month: run.month,
        period_year: run.year,
        disbursement_date: run.payout_date || new Date().toISOString().split('T')[0],
        total_gross_salary: parseFloat(run.total_gross),
        total_net_salary_payable: parseFloat(run.total_net_payable),
        total_employee_deductions: {
          epf: parseFloat(run.total_epf),
          esi: parseFloat(run.total_esi),
          professional_tax: parseFloat(run.total_pt),
          tds: parseFloat(run.total_tds),
          other_deductions: 0,
          sum: parseFloat(run.total_deductions),
        },
        total_employer_contributions: {
          epf: parseFloat(run.total_epf),
          esi: parseFloat(run.total_esi),
          gratuity_provision: Math.round(parseFloat(run.total_gross) * 0.0481), // 15/26 days per year standard actuarial provision
          sum: parseFloat(run.total_employer_cost) - parseFloat(run.total_gross),
        },
        department_breakdown: deptRes.rows.map(r => ({
          department_id: r.department_id,
          department_name: r.department_name,
          employee_count: parseInt(r.employee_count, 10),
          gross_salary: parseFloat(r.gross_salary),
          net_salary: parseFloat(r.net_salary),
          employer_cost: parseFloat(r.employer_cost),
        })),
        approval_status: 'approved',
        approved_by: actor.email,
        approved_at: approvedAt,
        payroll_lock_status: true,
        immutable_hash: immutableHash,
        source_engine: 'Jyotsvan-HRMS-Payroll-Engine-v1',
        exported_at: new Date().toISOString(),
      };

      await client.query('COMMIT;');
      return handoff;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // MODULE 18: EMPLOYEE EXIT & SEPARATION
  // ==========================================
  public static async getEmployeeExits(orgId: string): Promise<EmployeeExit[]> {
    const res = await pool.query(
      `SELECT ee.*, e.display_name as employee_name, e.employee_code, d.name as department_name, des.name as designation_name
       FROM employee_exits ee
       JOIN employees e ON ee.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       WHERE ee.organization_id = $1
       ORDER BY ee.resignation_date DESC`,
      [orgId]
    );
    return res.rows;
  }

  public static async submitResignation(
    orgId: string,
    data: { employee_id: string; resignation_reason: string; notice_period_days?: number }
  ): Promise<EmployeeExit> {
    const id = `exit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const noticeDays = data.notice_period_days || 30;
    const today = new Date();
    const lwd = new Date(today.getTime() + noticeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const res = await pool.query(
      `INSERT INTO employee_exits (
        id, organization_id, employee_id, resignation_date, notice_period_days, tentative_last_working_day,
        resignation_reason, status, clearance_checklist, created_at, updated_at
      ) VALUES (
        $1, $2, $3, NOW(), $4, $5, $6, 'submitted',
        '{"it_assets":false,"id_card":false,"department_handover":false,"finance_loans_cleared":false,"hr_docs":false}'::jsonb,
        NOW(), NOW()
      ) RETURNING *`,
      [id, orgId, data.employee_id, noticeDays, lwd, data.resignation_reason]
    );
    return res.rows[0];
  }

  // ==========================================
  // MODULE 19: UNIFIED HR REQUESTS
  // ==========================================
  public static async getHRRequests(orgId: string): Promise<HRRequest[]> {
    const res = await pool.query(
      `SELECT hr.*, e.display_name as employee_name, e.employee_code, d.name as department_name
       FROM hr_requests hr
       JOIN employees e ON hr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE hr.organization_id = $1
       ORDER BY hr.created_at DESC`,
      [orgId]
    );
    return res.rows;
  }

  public static async submitHRRequest(orgId: string, data: Partial<HRRequest>): Promise<HRRequest> {
    const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const reqNum = `REQ-${Date.now().toString().slice(-6)}`;
    const res = await pool.query(
      `INSERT INTO hr_requests (id, organization_id, request_number, request_type, employee_id, details, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW()) RETURNING *`,
      [id, orgId, reqNum, data.request_type || 'leave', data.employee_id, JSON.stringify(data.details || {})]
    );
    return res.rows[0];
  }

  // ==========================================
  // MODULE 20: HR ANNOUNCEMENTS
  // ==========================================
  public static async getAnnouncements(orgId: string): Promise<HRAnnouncement[]> {
    const res = await pool.query(
      `SELECT * FROM hr_announcements 
       WHERE organization_id = $1 AND is_active = TRUE 
       ORDER BY published_at DESC`,
      [orgId]
    );
    return res.rows;
  }

  public static async createAnnouncement(orgId: string, data: Partial<HRAnnouncement>): Promise<HRAnnouncement> {
    const id = `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const res = await pool.query(
      `INSERT INTO hr_announcements (
        id, organization_id, title, content, category, target_audience, priority, published_by, published_at, is_active, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), TRUE, NOW()
      ) RETURNING *`,
      [
        id,
        orgId,
        data.title,
        data.content,
        data.category || 'company',
        data.target_audience || 'all',
        data.priority || 'normal',
        data.published_by || 'HR Operations',
      ]
    );
    return res.rows[0];
  }
}
