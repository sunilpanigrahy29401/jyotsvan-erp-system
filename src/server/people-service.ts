// src/server/people-service.ts
// Enterprise Staff & People Management Backend Service (Phase 21)

import { pool } from './db.ts';
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
} from '../types/people.ts';

export class PeopleService {
  // Helper to log audit events
  private static async logAudit(
    client: any,
    orgId: string,
    actorId: string,
    actorEmail: string,
    action: string,
    targetResource: string,
    targetId: string,
    details?: any
  ) {
    try {
      const id = `audit-p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await client.query(
        `INSERT INTO audit_logs (id, organization_id, actor_id, actor_email, action, target_resource, target_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [id, orgId, actorId || 'system', actorEmail || 'system@jyotsvan.enterprise', action, targetResource, targetId, details ? JSON.stringify(details) : null]
      );
    } catch (err) {
      console.warn('[PeopleService] Audit log warning:', err);
    }
  }

  // Circular reporting hierarchy check
  public static async validateReportingManager(
    client: any,
    orgId: string,
    employeeId: string | null,
    managerId: string | null
  ): Promise<{ isValid: boolean; error?: string }> {
    if (!managerId) return { isValid: true };
    if (employeeId && employeeId === managerId) {
      return { isValid: false, error: 'An employee cannot be assigned as their own reporting manager.' };
    }

    if (!employeeId) return { isValid: true };

    // Traverse up the chain from managerId to see if we ever reach employeeId
    let currentId: string | null = managerId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === employeeId) {
        return { isValid: false, error: 'Circular reporting relationship detected. The selected manager reports to this employee directly or indirectly.' };
      }
      if (visited.has(currentId)) {
        break; // Guard against existing loop
      }
      visited.add(currentId);

      const res = await client.query(
        `SELECT reporting_manager_id FROM employees WHERE id = $1 AND organization_id = $2`,
        [currentId, orgId]
      );
      if (res.rows.length === 0) break;
      currentId = res.rows[0].reporting_manager_id;
    }

    return { isValid: true };
  }

  // 1. Dashboard Metrics
  public static async getDashboardMetrics(orgId: string): Promise<PeopleDashboardMetrics> {
    const client = await pool.connect();
    try {
      const today = new Date().toISOString().split('T')[0];

      const empStats = await client.query(
        `SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'active') as active
         FROM employees WHERE organization_id = $1`,
        [orgId]
      );

      const attStats = await client.query(
        `SELECT 
           COUNT(*) FILTER (WHERE status = 'present') as present,
           COUNT(*) FILTER (WHERE status = 'leave') as on_leave
         FROM attendance_records WHERE organization_id = $1 AND date = $2`,
        [orgId, today]
      );

      const pendingLeaves = await client.query(
        `SELECT COUNT(*) as count FROM leave_requests WHERE organization_id = $1 AND status IN ('submitted', 'pending_approval')`,
        [orgId]
      );

      const pendingCorrections = await client.query(
        `SELECT COUNT(*) as count FROM attendance_corrections WHERE organization_id = $1 AND status = 'pending'`,
        [orgId]
      );

      const pendingReviews = await client.query(
        `SELECT COUNT(*) as count FROM performance_reviews WHERE organization_id = $1 AND status IN ('submitted', 'under_review')`,
        [orgId]
      );

      const openTasks = await client.query(
        `SELECT COUNT(*) as count FROM people_tasks WHERE organization_id = $1 AND status IN ('pending', 'in_progress')`,
        [orgId]
      );

      const depts = await client.query(
        `SELECT COUNT(*) as count FROM departments WHERE organization_id = $1 AND status = 'active'`,
        [orgId]
      );

      const branches = await client.query(
        `SELECT COUNT(*) as count FROM branches WHERE organization_id = $1 AND status = 'active'`,
        [orgId]
      );

      const totalActive = parseInt(empStats.rows[0]?.active || '0', 10);
      const presentToday = parseInt(attStats.rows[0]?.present || '0', 10);
      const onLeaveToday = parseInt(attStats.rows[0]?.on_leave || '0', 10);
      const attRate = totalActive > 0 ? Math.round((presentToday / totalActive) * 100) : 0;

      return {
        total_employees: parseInt(empStats.rows[0]?.total || '0', 10),
        active_employees: totalActive,
        on_leave_today: onLeaveToday,
        present_today: presentToday,
        attendance_rate_percent: attRate,
        pending_leave_requests: parseInt(pendingLeaves.rows[0]?.count || '0', 10),
        pending_attendance_corrections: parseInt(pendingCorrections.rows[0]?.count || '0', 10),
        pending_reviews: parseInt(pendingReviews.rows[0]?.count || '0', 10),
        open_tasks_count: parseInt(openTasks.rows[0]?.count || '0', 10),
        departments_count: parseInt(depts.rows[0]?.count || '0', 10),
        branches_count: parseInt(branches.rows[0]?.count || '0', 10),
      };
    } finally {
      client.release();
    }
  }

  // 2. Employees Query with Filters
  public static async getEmployees(
    orgId: string,
    filters: {
      search?: string;
      department_id?: string;
      branch_id?: string;
      designation_id?: string;
      employment_type?: string;
      status?: string;
      reporting_manager_id?: string;
    } = {}
  ): Promise<Employee[]> {
    const client = await pool.connect();
    try {
      let sql = `
        SELECT 
          e.*,
          d.name as department_name,
          d.code as department_code,
          b.name as branch_name,
          b.code as branch_code,
          des.name as designation_name,
          m.display_name as reporting_manager_name,
          m.employee_code as reporting_manager_code
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN branches b ON e.branch_id = b.id
        LEFT JOIN designations des ON e.designation_id = des.id
        LEFT JOIN employees m ON e.reporting_manager_id = m.id
        WHERE e.organization_id = $1
      `;
      const params: any[] = [orgId];

      if (filters.search) {
        params.push(`%${filters.search}%`);
        sql += ` AND (
          e.first_name ILIKE $${params.length} OR 
          e.last_name ILIKE $${params.length} OR 
          e.display_name ILIKE $${params.length} OR 
          e.employee_code ILIKE $${params.length} OR 
          e.email ILIKE $${params.length} OR 
          e.phone ILIKE $${params.length}
        )`;
      }

      if (filters.department_id) {
        params.push(filters.department_id);
        sql += ` AND e.department_id = $${params.length}`;
      }

      if (filters.branch_id) {
        params.push(filters.branch_id);
        sql += ` AND e.branch_id = $${params.length}`;
      }

      if (filters.designation_id) {
        params.push(filters.designation_id);
        sql += ` AND e.designation_id = $${params.length}`;
      }

      if (filters.employment_type) {
        params.push(filters.employment_type);
        sql += ` AND e.employment_type = $${params.length}`;
      }

      if (filters.status) {
        params.push(filters.status);
        sql += ` AND e.status = $${params.length}`;
      }

      if (filters.reporting_manager_id) {
        params.push(filters.reporting_manager_id);
        sql += ` AND e.reporting_manager_id = $${params.length}`;
      }

      sql += ` ORDER BY e.employee_code ASC`;

      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  // 3. Employee 360 Full Profile View
  public static async getEmployeeById(orgId: string, employeeId: string): Promise<Employee360View | null> {
    const client = await pool.connect();
    try {
      const empRes = await client.query(
        `SELECT 
          e.*,
          d.name as department_name,
          d.code as department_code,
          b.name as branch_name,
          b.code as branch_code,
          des.name as designation_name,
          m.display_name as reporting_manager_name,
          m.employee_code as reporting_manager_code
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN branches b ON e.branch_id = b.id
        LEFT JOIN designations des ON e.designation_id = des.id
        LEFT JOIN employees m ON e.reporting_manager_id = m.id
        WHERE e.id = $1 AND e.organization_id = $2`,
        [employeeId, orgId]
      );

      if (empRes.rows.length === 0) return null;
      const emp = empRes.rows[0];

      // Reporting Manager info
      let managerInfo = null;
      if (emp.reporting_manager_id) {
        const mgrRes = await client.query(
          `SELECT e.id, e.employee_code, e.display_name, des.name as designation
           FROM employees e
           LEFT JOIN designations des ON e.designation_id = des.id
           WHERE e.id = $1 AND e.organization_id = $2`,
          [emp.reporting_manager_id, orgId]
        );
        if (mgrRes.rows.length > 0) {
          managerInfo = mgrRes.rows[0];
        }
      }

      // Direct Reports
      const reportsRes = await client.query(
        `SELECT e.id, e.employee_code, e.display_name, des.name as designation, d.name as department
         FROM employees e
         LEFT JOIN designations des ON e.designation_id = des.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE e.reporting_manager_id = $1 AND e.organization_id = $2 AND e.status = 'active'
         ORDER BY e.display_name ASC`,
        [employeeId, orgId]
      );

      // Attendance summary for current month
      const currentYearMonth = new Date().toISOString().substring(0, 7); // e.g. '2026-03'
      const attSummaryRes = await client.query(
        `SELECT 
           COUNT(*) as total_days,
           COUNT(*) FILTER (WHERE status = 'present') as present_days,
           COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
           COUNT(*) FILTER (WHERE status = 'leave') as leave_days,
           COUNT(*) FILTER (WHERE status = 'half_day') as half_days,
           COUNT(*) FILTER (WHERE status = 'wfh') as wfh_days,
           COALESCE(AVG(total_hours) FILTER (WHERE status = 'present'), 0) as average_hours
         FROM attendance_records
         WHERE employee_id = $1 AND organization_id = $2 AND date::text LIKE $3`,
        [employeeId, orgId, `${currentYearMonth}%`]
      );
      const attSummary = attSummaryRes.rows[0] ? {
        total_days: parseInt(attSummaryRes.rows[0].total_days || '0', 10),
        present_days: parseInt(attSummaryRes.rows[0].present_days || '0', 10),
        absent_days: parseInt(attSummaryRes.rows[0].absent_days || '0', 10),
        leave_days: parseInt(attSummaryRes.rows[0].leave_days || '0', 10),
        half_days: parseInt(attSummaryRes.rows[0].half_days || '0', 10),
        wfh_days: parseInt(attSummaryRes.rows[0].wfh_days || '0', 10),
        average_hours: parseFloat(Number(attSummaryRes.rows[0].average_hours || 0).toFixed(1)),
      } : undefined;

      // Leave balances
      const currentYear = new Date().getFullYear();
      const balancesRes = await client.query(
        `SELECT lb.*, lt.name as leave_type_name, lt.code as leave_type_code
         FROM leave_balances lb
         JOIN leave_types lt ON lb.leave_type_id = lt.id
         WHERE lb.employee_id = $1 AND lb.organization_id = $2 AND lb.year = $3
         ORDER BY lt.code ASC`,
        [employeeId, orgId, currentYear]
      );

      // Recent leave requests
      const leavesRes = await client.query(
        `SELECT lr.*, lt.name as leave_type_name, lt.code as leave_type_code, u.full_name as approver_name
         FROM leave_requests lr
         JOIN leave_types lt ON lr.leave_type_id = lt.id
         LEFT JOIN users u ON lr.approver_id = u.id
         WHERE lr.employee_id = $1 AND lr.organization_id = $2
         ORDER BY lr.start_date DESC LIMIT 10`,
        [employeeId, orgId]
      );

      // Assigned tasks
      const tasksRes = await client.query(
        `SELECT * FROM people_tasks
         WHERE assigned_employee_id = $1 AND organization_id = $2
         ORDER BY due_date ASC LIMIT 10`,
        [employeeId, orgId]
      );

      // Performance targets
      const targetsRes = await client.query(
        `SELECT * FROM employee_targets
         WHERE employee_id = $1 AND organization_id = $2
         ORDER BY end_date DESC`,
        [employeeId, orgId]
      );

      // Performance reviews
      const reviewsRes = await client.query(
        `SELECT pr.*, rev.display_name as reviewer_name
         FROM performance_reviews pr
         LEFT JOIN employees rev ON pr.reviewer_employee_id = rev.id
         WHERE pr.employee_id = $1 AND pr.organization_id = $2
         ORDER BY pr.period DESC`,
        [employeeId, orgId]
      );

      // Employee documents
      const docsRes = await client.query(
        `SELECT * FROM employee_documents
         WHERE employee_id = $1 AND organization_id = $2
         ORDER BY created_at DESC`,
        [employeeId, orgId]
      );

      // Field sales activity (if linked to field sales user or territory)
      let fieldSalesData = undefined;
      if (emp.user_id) {
        const fsVisits = await client.query(
          `SELECT 
             COUNT(*) as total_visits,
             COUNT(DISTINCT order_taken_id) as total_orders,
             COALESCE(SUM(order_amount), 0) as total_revenue,
             COALESCE(SUM(collection_amount), 0) as total_collections
           FROM field_sales_visits
           WHERE salesperson_id = $1 AND organization_id = $2`,
          [emp.user_id, orgId]
        );

        const fsTerritory = await client.query(
          `SELECT t.name as territory_name
           FROM sales_territory_assignments sta
           JOIN territories t ON sta.territory_id = t.id
           WHERE sta.salesperson_id = $1 AND sta.organization_id = $2 AND sta.status = 'active'
           LIMIT 1`,
          [emp.user_id, orgId]
        );

        if (fsVisits.rows.length > 0 || fsTerritory.rows.length > 0) {
          fieldSalesData = {
            assigned_territory: fsTerritory.rows[0]?.territory_name || 'Assigned Territory',
            total_visits_month: parseInt(fsVisits.rows[0]?.total_visits || '0', 10),
            total_orders_month: parseInt(fsVisits.rows[0]?.total_orders || '0', 10),
            total_revenue_month: parseFloat(fsVisits.rows[0]?.total_revenue || '0'),
            total_collections_month: parseFloat(fsVisits.rows[0]?.total_collections || '0'),
          };
        }
      }

      // Finance expense claims
      let expenseClaims: any[] = [];
      const userOrEmail = emp.user_id || emp.email;
      const expRes = await client.query(
        `SELECT id, expense_number, expense_date, category_name, total_amount, status
         FROM expenses
         WHERE organization_id = $1 AND (submitted_by = $2 OR submitted_by_email = $3)
         ORDER BY expense_date DESC LIMIT 10`,
        [orgId, emp.user_id || emp.id, emp.email]
      );
      expenseClaims = expRes.rows;

      return {
        ...emp,
        reporting_manager: managerInfo,
        direct_reports: reportsRes.rows,
        attendance_summary: attSummary,
        leave_balances: balancesRes.rows,
        recent_leaves: leavesRes.rows,
        tasks: tasksRes.rows,
        targets: targetsRes.rows,
        performance_reviews: reviewsRes.rows,
        documents: docsRes.rows,
        field_sales_data: fieldSalesData,
        expense_claims: expenseClaims,
      };
    } finally {
      client.release();
    }
  }

  // 4. Create Employee
  public static async createEmployee(
    orgId: string,
    data: {
      user_id?: string | null;
      first_name: string;
      middle_name?: string | null;
      last_name: string;
      display_name?: string;
      date_of_birth?: string | null;
      gender?: string | null;
      phone: string;
      alternate_phone?: string | null;
      email: string;
      personal_email?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      pincode?: string | null;
      emergency_contact_name?: string | null;
      emergency_contact_phone?: string | null;
      emergency_contact_relation?: string | null;
      joining_date: string;
      employment_type: string;
      department_id: string;
      branch_id: string;
      designation_id?: string | null;
      reporting_manager_id?: string | null;
      status?: string;
      notes?: string | null;
    },
    actor: { id: string; email: string }
  ): Promise<Employee> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Check reporting manager circularity
      if (data.reporting_manager_id) {
        const check = await this.validateReportingManager(client, orgId, null, data.reporting_manager_id);
        if (!check.isValid) {
          throw new Error(check.error || 'Invalid reporting manager.');
        }
      }

      // Generate next sequential employee code EMP-XXXX
      const seqRes = await client.query(
        `SELECT COUNT(*) as count FROM employees WHERE organization_id = $1`,
        [orgId]
      );
      const nextSeq = parseInt(seqRes.rows[0].count || '0', 10) + 1;
      const empCode = `EMP-${String(nextSeq).padStart(4, '0')}`;
      const empId = `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const displayName = data.display_name || `${data.first_name} ${data.last_name}`.trim();

      const insertRes = await client.query(
        `INSERT INTO employees (
          id, organization_id, employee_code, user_id, first_name, middle_name, last_name, display_name,
          date_of_birth, gender, phone, alternate_phone, email, personal_email, address, city, state, pincode,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
          joining_date, employment_type, department_id, branch_id, designation_id, reporting_manager_id,
          status, notes, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21,
          $22, $23, $24, $25, $26, $27,
          $28, $29, $30, NOW(), NOW()
        ) RETURNING *`,
        [
          empId, orgId, empCode, data.user_id || null, data.first_name, data.middle_name || null, data.last_name, displayName,
          data.date_of_birth || null, data.gender || 'prefer_not_to_say', data.phone, data.alternate_phone || null, data.email, data.personal_email || null,
          data.address || null, data.city || null, data.state || null, data.pincode || null,
          data.emergency_contact_name || null, data.emergency_contact_phone || null, data.emergency_contact_relation || null,
          data.joining_date, data.employment_type || 'full_time', data.department_id, data.branch_id, data.designation_id || null, data.reporting_manager_id || null,
          data.status || 'active', data.notes || null, actor.id,
        ]
      );

      const newEmp = insertRes.rows[0];

      // Auto-provision initial leave balances for the current year
      const currentYear = new Date(data.joining_date).getFullYear() || 2026;
      const leaveTypesRes = await client.query(
        `SELECT id, code, annual_allocation FROM leave_types WHERE organization_id = $1 AND status = 'active'`,
        [orgId]
      );
      for (const lt of leaveTypesRes.rows) {
        await client.query(
          `INSERT INTO leave_balances (
            id, organization_id, employee_id, leave_type_id, year, allocated_days, used_days, pending_days, remaining_days, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, $6, NOW(), NOW())
          ON CONFLICT DO NOTHING`,
          [`bal-${empId}-${lt.code}-${currentYear}`, orgId, empId, lt.id, currentYear, lt.annual_allocation]
        );
      }

      await this.logAudit(client, orgId, actor.id, actor.email, 'employee.create', 'employees', empId, {
        employee_code: empCode,
        display_name: displayName,
        department_id: data.department_id,
      });

      await client.query('COMMIT;');
      return newEmp;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // 5. Update Employee
  public static async updateEmployee(
    orgId: string,
    employeeId: string,
    data: Partial<Employee>,
    actor: { id: string; email: string }
  ): Promise<Employee> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Verify employee exists
      const existingRes = await client.query(
        `SELECT * FROM employees WHERE id = $1 AND organization_id = $2`,
        [employeeId, orgId]
      );
      if (existingRes.rows.length === 0) {
        throw new Error('Employee not found');
      }
      const existing = existingRes.rows[0];

      // Check reporting manager circularity
      if (data.reporting_manager_id !== undefined && data.reporting_manager_id !== existing.reporting_manager_id) {
        const check = await this.validateReportingManager(client, orgId, employeeId, data.reporting_manager_id);
        if (!check.isValid) {
          throw new Error(check.error || 'Invalid reporting manager assignment.');
        }
      }

      const displayName = data.display_name || (
        data.first_name || data.last_name
          ? `${data.first_name || existing.first_name} ${data.last_name || existing.last_name}`.trim()
          : existing.display_name
      );

      const updateRes = await client.query(
        `UPDATE employees SET
          first_name = COALESCE($1, first_name),
          middle_name = COALESCE($2, middle_name),
          last_name = COALESCE($3, last_name),
          display_name = $4,
          date_of_birth = COALESCE($5, date_of_birth),
          gender = COALESCE($6, gender),
          phone = COALESCE($7, phone),
          alternate_phone = COALESCE($8, alternate_phone),
          email = COALESCE($9, email),
          personal_email = COALESCE($10, personal_email),
          address = COALESCE($11, address),
          city = COALESCE($12, city),
          state = COALESCE($13, state),
          pincode = COALESCE($14, pincode),
          emergency_contact_name = COALESCE($15, emergency_contact_name),
          emergency_contact_phone = COALESCE($16, emergency_contact_phone),
          emergency_contact_relation = COALESCE($17, emergency_contact_relation),
          joining_date = COALESCE($18, joining_date),
          employment_type = COALESCE($19, employment_type),
          department_id = COALESCE($20, department_id),
          branch_id = COALESCE($21, branch_id),
          designation_id = COALESCE($22, designation_id),
          reporting_manager_id = $23,
          status = COALESCE($24, status),
          exit_date = COALESCE($25, exit_date),
          exit_reason = COALESCE($26, exit_reason),
          notes = COALESCE($27, notes),
          user_id = COALESCE($28, user_id),
          updated_by = $29,
          updated_at = NOW()
        WHERE id = $30 AND organization_id = $31
        RETURNING *`,
        [
          data.first_name,
          data.middle_name,
          data.last_name,
          displayName,
          data.date_of_birth,
          data.gender,
          data.phone,
          data.alternate_phone,
          data.email,
          data.personal_email,
          data.address,
          data.city,
          data.state,
          data.pincode,
          data.emergency_contact_name,
          data.emergency_contact_phone,
          data.emergency_contact_relation,
          data.joining_date,
          data.employment_type,
          data.department_id,
          data.branch_id,
          data.designation_id,
          data.reporting_manager_id !== undefined ? data.reporting_manager_id : existing.reporting_manager_id,
          data.status,
          data.exit_date,
          data.exit_reason,
          data.notes,
          data.user_id,
          actor.id,
          employeeId,
          orgId,
        ]
      );

      await this.logAudit(client, orgId, actor.id, actor.email, 'employee.update', 'employees', employeeId, {
        updated_fields: Object.keys(data),
      });

      await client.query('COMMIT;');
      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // 6. Delete/Archive Employee
  public static async deleteEmployee(
    orgId: string,
    employeeId: string,
    actor: { id: string; email: string }
  ): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Soft delete: set status to archived
      const updateRes = await client.query(
        `UPDATE employees SET status = 'archived', updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND organization_id = $3`,
        [actor.id, employeeId, orgId]
      );

      await this.logAudit(client, orgId, actor.id, actor.email, 'employee.delete', 'employees', employeeId, {
        archived_at: new Date().toISOString(),
      });

      await client.query('COMMIT;');
      return updateRes.rowCount ? updateRes.rowCount > 0 : false;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // 7. Designations
  public static async getDesignations(orgId: string): Promise<Designation[]> {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT des.*, d.name as department_name
         FROM designations des
         LEFT JOIN departments d ON des.department_id = d.id
         WHERE des.organization_id = $1 AND des.status = 'active'
         ORDER BY des.name ASC`,
        [orgId]
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async createDesignation(
    orgId: string,
    data: { name: string; code: string; department_id?: string | null; description?: string | null }
  ): Promise<Designation> {
    const client = await pool.connect();
    try {
      const id = `desig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const res = await client.query(
        `INSERT INTO designations (id, organization_id, code, name, department_id, description, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())
         RETURNING *`,
        [id, orgId, data.code.toUpperCase(), data.name, data.department_id || null, data.description || null]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  // 8. Org Hierarchy Visual Tree Builder
  public static async getOrgHierarchy(
    orgId: string,
    departmentId?: string
  ): Promise<OrgNode[]> {
    const client = await pool.connect();
    try {
      let sql = `
        SELECT 
          e.id,
          e.employee_code,
          e.display_name,
          des.name as designation,
          d.name as department,
          b.name as branch,
          e.email,
          e.phone,
          e.avatar_url,
          e.status,
          e.reporting_manager_id
        FROM employees e
        LEFT JOIN designations des ON e.designation_id = des.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN branches b ON e.branch_id = b.id
        WHERE e.organization_id = $1 AND e.status = 'active'
      `;
      const params: any[] = [orgId];

      if (departmentId) {
        params.push(departmentId);
        sql += ` AND e.department_id = $${params.length}`;
      }

      sql += ` ORDER BY e.employee_code ASC`;

      const res = await client.query(sql, params);
      const allEmps: any[] = res.rows;

      // Build map
      const nodeMap = new Map<string, OrgNode>();
      for (const e of allEmps) {
        nodeMap.set(e.id, {
          id: e.id,
          employee_code: e.employee_code,
          display_name: e.display_name,
          designation: e.designation || 'Specialist',
          department: e.department || 'Operations',
          branch: e.branch || 'Headquarters',
          email: e.email,
          phone: e.phone,
          avatar_url: e.avatar_url,
          status: e.status,
          reporting_manager_id: e.reporting_manager_id,
          direct_reports_count: 0,
          children: [],
        });
      }

      // Link children
      const rootNodes: OrgNode[] = [];

      for (const e of allEmps) {
        const node = nodeMap.get(e.id)!;
        if (e.reporting_manager_id && nodeMap.has(e.reporting_manager_id)) {
          const parent = nodeMap.get(e.reporting_manager_id)!;
          parent.children.push(node);
          parent.direct_reports_count = parent.children.length;
        } else {
          rootNodes.push(node);
        }
      }

      return rootNodes;
    } finally {
      client.release();
    }
  }

  // 9. Attendance Queries
  public static async getAttendanceRecords(
    orgId: string,
    filters: {
      date?: string;
      month?: string; // YYYY-MM
      employee_id?: string;
      department_id?: string;
      status?: string;
    } = {}
  ): Promise<AttendanceRecord[]> {
    const client = await pool.connect();
    try {
      let sql = `
        SELECT 
          att.*,
          e.display_name as employee_name,
          e.employee_code,
          d.name as department_name,
          b.name as branch_name
        FROM attendance_records att
        JOIN employees e ON att.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN branches b ON e.branch_id = b.id
        WHERE att.organization_id = $1
      `;
      const params: any[] = [orgId];

      if (filters.date) {
        params.push(filters.date);
        sql += ` AND att.date = $${params.length}`;
      }

      if (filters.month) {
        params.push(`${filters.month}%`);
        sql += ` AND att.date::text LIKE $${params.length}`;
      }

      if (filters.employee_id) {
        params.push(filters.employee_id);
        sql += ` AND att.employee_id = $${params.length}`;
      }

      if (filters.department_id) {
        params.push(filters.department_id);
        sql += ` AND e.department_id = $${params.length}`;
      }

      if (filters.status) {
        params.push(filters.status);
        sql += ` AND att.status = $${params.length}`;
      }

      sql += ` ORDER BY att.date DESC, e.display_name ASC`;

      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  // 10. Check-In Attendance (Idempotent)
  public static async checkInAttendance(
    orgId: string,
    employeeId: string,
    data: {
      check_in_time?: string;
      source?: 'web' | 'mobile' | 'manual';
      location?: string;
      remarks?: string;
    },
    actor: { id: string; email: string }
  ): Promise<AttendanceRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const today = new Date().toISOString().split('T')[0];
      const checkInTime = data.check_in_time || new Date().toISOString();
      const source = data.source || 'web';

      // Check if already checked in today
      const existing = await client.query(
        `SELECT * FROM attendance_records WHERE organization_id = $1 AND employee_id = $2 AND date = $3`,
        [orgId, employeeId, today]
      );

      let record: AttendanceRecord;

      if (existing.rows.length > 0) {
        const current = existing.rows[0];
        if (current.check_in_time) {
          // Already checked in
          await client.query('COMMIT;');
          return current;
        }

        const updateRes = await client.query(
          `UPDATE attendance_records SET
            check_in_time = $1,
            status = 'present',
            source = $2,
            check_in_location = $3,
            remarks = COALESCE($4, remarks),
            updated_at = NOW()
          WHERE id = $5 AND organization_id = $6
          RETURNING *`,
          [checkInTime, source, data.location || null, data.remarks || null, current.id, orgId]
        );
        record = updateRes.rows[0];
      } else {
        const id = `att-${employeeId}-${today}`;
        const insertRes = await client.query(
          `INSERT INTO attendance_records (
            id, organization_id, employee_id, date, check_in_time, status, source, check_in_location, remarks, is_corrected, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'present', $6, $7, $8, FALSE, NOW(), NOW())
          RETURNING *`,
          [id, orgId, employeeId, today, checkInTime, source, data.location || null, data.remarks || null]
        );
        record = insertRes.rows[0];
      }

      await this.logAudit(client, orgId, actor.id, actor.email, 'attendance.check_in', 'attendance_records', record.id, {
        employee_id: employeeId,
        date: today,
        check_in_time: checkInTime,
      });

      await client.query('COMMIT;');
      return record;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // 11. Check-Out Attendance
  public static async checkOutAttendance(
    orgId: string,
    employeeId: string,
    data: {
      check_out_time?: string;
      location?: string;
      remarks?: string;
    },
    actor: { id: string; email: string }
  ): Promise<AttendanceRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const today = new Date().toISOString().split('T')[0];
      const checkOutTime = data.check_out_time || new Date().toISOString();

      const existing = await client.query(
        `SELECT * FROM attendance_records WHERE organization_id = $1 AND employee_id = $2 AND date = $3`,
        [orgId, employeeId, today]
      );

      if (existing.rows.length === 0 || !existing.rows[0].check_in_time) {
        throw new Error('No check-in record found for today. Please perform check-in first.');
      }

      const current = existing.rows[0];
      const checkInMs = new Date(current.check_in_time).getTime();
      const checkOutMs = new Date(checkOutTime).getTime();
      const diffHours = Math.max(0, parseFloat(((checkOutMs - checkInMs) / (1000 * 60 * 60)).toFixed(2)));

      const updateRes = await client.query(
        `UPDATE attendance_records SET
          check_out_time = $1,
          total_hours = $2,
          check_out_location = $3,
          remarks = COALESCE($4, remarks),
          updated_at = NOW()
        WHERE id = $5 AND organization_id = $6
        RETURNING *`,
        [checkOutTime, diffHours, data.location || null, data.remarks || null, current.id, orgId]
      );

      const record = updateRes.rows[0];

      await this.logAudit(client, orgId, actor.id, actor.email, 'attendance.check_out', 'attendance_records', record.id, {
        employee_id: employeeId,
        date: today,
        check_out_time: checkOutTime,
        total_hours: diffHours,
      });

      await client.query('COMMIT;');
      return record;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // 12. Attendance Corrections
  public static async getAttendanceCorrections(
    orgId: string,
    filters: { employee_id?: string; status?: string } = {}
  ): Promise<AttendanceCorrection[]> {
    const client = await pool.connect();
    try {
      let sql = `
        SELECT 
          ac.*,
          e.display_name as employee_name,
          e.employee_code,
          u.full_name as reviewed_by_name
        FROM attendance_corrections ac
        JOIN employees e ON ac.employee_id = e.id
        LEFT JOIN users u ON ac.reviewed_by = u.id
        WHERE ac.organization_id = $1
      `;
      const params: any[] = [orgId];

      if (filters.employee_id) {
        params.push(filters.employee_id);
        sql += ` AND ac.employee_id = $${params.length}`;
      }

      if (filters.status) {
        params.push(filters.status);
        sql += ` AND ac.status = $${params.length}`;
      }

      sql += ` ORDER BY ac.requested_date DESC, ac.created_at DESC`;

      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async createAttendanceCorrection(
    orgId: string,
    data: {
      employee_id: string;
      requested_date: string;
      requested_check_in?: string | null;
      requested_check_out?: string | null;
      requested_status: string;
      reason: string;
    },
    actor: { id: string; email: string }
  ): Promise<AttendanceCorrection> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Look up existing record on that date if any
      const existingAtt = await client.query(
        `SELECT * FROM attendance_records WHERE organization_id = $1 AND employee_id = $2 AND date = $3`,
        [orgId, data.employee_id, data.requested_date]
      );

      const attRecord = existingAtt.rows[0] || null;
      const id = `attcorr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const insertRes = await client.query(
        `INSERT INTO attendance_corrections (
          id, organization_id, attendance_record_id, employee_id, requested_date,
          original_check_in, original_check_out, original_status,
          requested_check_in, requested_check_out, requested_status,
          reason, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, 'pending', NOW(), NOW()
        ) RETURNING *`,
        [
          id, orgId, attRecord ? attRecord.id : null, data.employee_id, data.requested_date,
          attRecord ? attRecord.check_in_time : null, attRecord ? attRecord.check_out_time : null, attRecord ? attRecord.status : null,
          data.requested_check_in || null, data.requested_check_out || null, data.requested_status,
          data.reason,
        ]
      );

      await this.logAudit(client, orgId, actor.id, actor.email, 'attendance.correction_request', 'attendance_corrections', id, {
        employee_id: data.employee_id,
        requested_date: data.requested_date,
      });

      await client.query('COMMIT;');
      return insertRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  public static async reviewAttendanceCorrection(
    orgId: string,
    correctionId: string,
    decision: 'approved' | 'rejected',
    reviewerNotes: string | undefined,
    actor: { id: string; email: string }
  ): Promise<AttendanceCorrection> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const corrRes = await client.query(
        `SELECT * FROM attendance_corrections WHERE id = $1 AND organization_id = $2`,
        [correctionId, orgId]
      );
      if (corrRes.rows.length === 0) {
        throw new Error('Attendance correction not found');
      }
      const corr = corrRes.rows[0];

      if (decision === 'approved') {
        let totalHours = 8.0;
        if (corr.requested_check_in && corr.requested_check_out) {
          const diff = new Date(corr.requested_check_out).getTime() - new Date(corr.requested_check_in).getTime();
          totalHours = Math.max(0, parseFloat((diff / (1000 * 60 * 60)).toFixed(2)));
        }

        // Upsert attendance record
        await client.query(
          `INSERT INTO attendance_records (
            id, organization_id, employee_id, date, check_in_time, check_out_time, total_hours, status, source, is_corrected, remarks, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, 'manual', TRUE, $9, NOW(), NOW()
          )
          ON CONFLICT (organization_id, employee_id, date) DO UPDATE
          SET check_in_time = EXCLUDED.check_in_time,
              check_out_time = EXCLUDED.check_out_time,
              total_hours = EXCLUDED.total_hours,
              status = EXCLUDED.status,
              is_corrected = TRUE,
              remarks = EXCLUDED.remarks,
              updated_at = NOW()`,
          [
            `att-${corr.employee_id}-${corr.requested_date}`,
            orgId,
            corr.employee_id,
            corr.requested_date,
            corr.requested_check_in,
            corr.requested_check_out,
            totalHours,
            corr.requested_status,
            `Regularized via correction ${correctionId}`,
          ]
        );
      }

      const updateRes = await client.query(
        `UPDATE attendance_corrections SET
          status = $1,
          reviewed_by = $2,
          reviewed_at = NOW(),
          reviewer_notes = $3,
          updated_at = NOW()
        WHERE id = $4 AND organization_id = $5
        RETURNING *`,
        [decision, actor.id, reviewerNotes || null, correctionId, orgId]
      );

      await this.logAudit(client, orgId, actor.id, actor.email, `attendance.correction_${decision}`, 'attendance_corrections', correctionId, {
        decision,
        reviewer_notes: reviewerNotes,
      });

      await client.query('COMMIT;');
      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // 13. Leave Management
  public static async getLeaveTypes(orgId: string): Promise<LeaveType[]> {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM leave_types WHERE organization_id = $1 AND status = 'active' ORDER BY code ASC`,
        [orgId]
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async getLeaveBalances(
    orgId: string,
    employeeId?: string,
    year?: number
  ): Promise<LeaveBalance[]> {
    const client = await pool.connect();
    try {
      const targetYear = year || new Date().getFullYear();
      let sql = `
        SELECT 
          lb.*,
          e.display_name as employee_name,
          e.employee_code,
          lt.name as leave_type_name,
          lt.code as leave_type_code
        FROM leave_balances lb
        JOIN employees e ON lb.employee_id = e.id
        JOIN leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.organization_id = $1 AND lb.year = $2
      `;
      const params: any[] = [orgId, targetYear];

      if (employeeId) {
        params.push(employeeId);
        sql += ` AND lb.employee_id = $${params.length}`;
      }

      sql += ` ORDER BY e.display_name ASC, lt.code ASC`;

      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async getLeaveRequests(
    orgId: string,
    filters: {
      employee_id?: string;
      status?: string;
      leave_type_id?: string;
    } = {}
  ): Promise<LeaveRequest[]> {
    const client = await pool.connect();
    try {
      let sql = `
        SELECT 
          lr.*,
          e.display_name as employee_name,
          e.employee_code,
          lt.name as leave_type_name,
          lt.code as leave_type_code,
          u.full_name as approver_name
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        LEFT JOIN users u ON lr.approver_id = u.id
        WHERE lr.organization_id = $1
      `;
      const params: any[] = [orgId];

      if (filters.employee_id) {
        params.push(filters.employee_id);
        sql += ` AND lr.employee_id = $${params.length}`;
      }

      if (filters.status) {
        params.push(filters.status);
        sql += ` AND lr.status = $${params.length}`;
      }

      if (filters.leave_type_id) {
        params.push(filters.leave_type_id);
        sql += ` AND lr.leave_type_id = $${params.length}`;
      }

      sql += ` ORDER BY lr.start_date DESC, lr.created_at DESC`;

      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async createLeaveRequest(
    orgId: string,
    data: {
      employee_id: string;
      leave_type_id: string;
      start_date: string;
      end_date: string;
      is_half_day?: boolean;
      half_day_period?: 'first_half' | 'second_half' | null;
      total_days?: number;
      reason: string;
    },
    actor: { id: string; email: string }
  ): Promise<LeaveRequest> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Validate dates
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      if (startDate > endDate) {
        throw new Error('End date must be on or after start date.');
      }

      // Calculate total days if not provided
      let totalDays = data.total_days;
      if (!totalDays) {
        if (data.is_half_day) {
          totalDays = 0.5;
        } else {
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
      }

      // Check balance
      const currentYear = startDate.getFullYear() || new Date().getFullYear();
      const balRes = await client.query(
        `SELECT * FROM leave_balances 
         WHERE organization_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [orgId, data.employee_id, data.leave_type_id, currentYear]
      );

      if (balRes.rows.length > 0) {
        const bal = balRes.rows[0];
        if (Number(bal.remaining_days) < totalDays) {
          throw new Error(`Insufficient leave balance. Available: ${bal.remaining_days} days, Requested: ${totalDays} days.`);
        }

        // Increment pending days, decrement remaining
        await client.query(
          `UPDATE leave_balances SET
            pending_days = pending_days + $1,
            remaining_days = remaining_days - $1,
            updated_at = NOW()
          WHERE id = $2`,
          [totalDays, bal.id]
        );
      }

      // Generate sequence
      const countRes = await client.query(
        `SELECT COUNT(*) as count FROM leave_requests WHERE organization_id = $1`,
        [orgId]
      );
      const nextSeq = parseInt(countRes.rows[0].count || '0', 10) + 1;
      const reqNum = `LR-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
      const id = `lr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const insertRes = await client.query(
        `INSERT INTO leave_requests (
          id, organization_id, request_number, employee_id, leave_type_id, start_date, end_date,
          is_half_day, half_day_period, total_days, reason, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, 'pending_approval', NOW(), NOW()
        ) RETURNING *`,
        [
          id, orgId, reqNum, data.employee_id, data.leave_type_id, data.start_date, data.end_date,
          data.is_half_day || false, data.half_day_period || null, totalDays, data.reason,
        ]
      );

      await this.logAudit(client, orgId, actor.id, actor.email, 'leave.create', 'leave_requests', id, {
        request_number: reqNum,
        employee_id: data.employee_id,
        total_days: totalDays,
      });

      await client.query('COMMIT;');
      return insertRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  public static async reviewLeaveRequest(
    orgId: string,
    requestId: string,
    decision: 'approved' | 'rejected',
    rejectionReason: string | undefined,
    actor: { id: string; email: string }
  ): Promise<LeaveRequest> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const reqRes = await client.query(
        `SELECT * FROM leave_requests WHERE id = $1 AND organization_id = $2`,
        [requestId, orgId]
      );
      if (reqRes.rows.length === 0) {
        throw new Error('Leave request not found');
      }
      const lr = reqRes.rows[0];
      const currentYear = new Date(lr.start_date).getFullYear();

      const balRes = await client.query(
        `SELECT * FROM leave_balances WHERE organization_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [orgId, lr.employee_id, lr.leave_type_id, currentYear]
      );

      if (balRes.rows.length > 0) {
        const bal = balRes.rows[0];
        if (decision === 'approved') {
          // Move from pending to used
          await client.query(
            `UPDATE leave_balances SET
              pending_days = GREATEST(0, pending_days - $1),
              used_days = used_days + $1,
              updated_at = NOW()
            WHERE id = $2`,
            [lr.total_days, bal.id]
          );

          // Update attendance records for date range to 'leave'
          const start = new Date(lr.start_date);
          const end = new Date(lr.end_date);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            await client.query(
              `INSERT INTO attendance_records (
                id, organization_id, employee_id, date, status, source, remarks, is_corrected, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, 'leave', 'system', $5, FALSE, NOW(), NOW())
              ON CONFLICT (organization_id, employee_id, date) DO UPDATE
              SET status = 'leave', remarks = EXCLUDED.remarks, updated_at = NOW()`,
              [`att-${lr.employee_id}-${dateStr}`, orgId, lr.employee_id, dateStr, `Approved Leave: ${lr.request_number}`]
            );
          }
        } else {
          // Rejected: release pending days back to remaining
          await client.query(
            `UPDATE leave_balances SET
              pending_days = GREATEST(0, pending_days - $1),
              remaining_days = remaining_days + $1,
              updated_at = NOW()
            WHERE id = $2`,
            [lr.total_days, bal.id]
          );
        }
      }

      const updateRes = await client.query(
        `UPDATE leave_requests SET
          status = $1,
          approver_id = $2,
          approved_at = $3,
          rejection_reason = $4,
          updated_at = NOW()
        WHERE id = $5 AND organization_id = $6
        RETURNING *`,
        [
          decision,
          actor.id,
          decision === 'approved' ? new Date().toISOString() : null,
          decision === 'rejected' ? (rejectionReason || null) : null,
          requestId,
          orgId,
        ]
      );

      await this.logAudit(client, orgId, actor.id, actor.email, `leave.${decision}`, 'leave_requests', requestId, {
        decision,
        rejection_reason: rejectionReason,
      });

      await client.query('COMMIT;');
      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // 14. Targets
  public static async getTargets(
    orgId: string,
    filters: { employee_id?: string; period_identifier?: string; status?: string } = {}
  ): Promise<EmployeeTarget[]> {
    const client = await pool.connect();
    try {
      let sql = `
        SELECT 
          et.*,
          e.display_name as employee_name,
          e.employee_code
        FROM employee_targets et
        JOIN employees e ON et.employee_id = e.id
        WHERE et.organization_id = $1
      `;
      const params: any[] = [orgId];

      if (filters.employee_id) {
        params.push(filters.employee_id);
        sql += ` AND et.employee_id = $${params.length}`;
      }

      if (filters.period_identifier) {
        params.push(filters.period_identifier);
        sql += ` AND et.period_identifier = $${params.length}`;
      }

      if (filters.status) {
        params.push(filters.status);
        sql += ` AND et.status = $${params.length}`;
      }

      sql += ` ORDER BY et.end_date DESC`;

      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async createOrUpdateTarget(
    orgId: string,
    data: {
      id?: string;
      employee_id: string;
      target_type: string;
      title: string;
      period_type: string;
      period_identifier: string;
      start_date: string;
      end_date: string;
      target_value: number;
      achieved_value?: number;
      unit?: string;
      status?: string;
      notes?: string | null;
    },
    actor: { id: string; email: string }
  ): Promise<EmployeeTarget> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const achieved = data.achieved_value || 0;
      const targetVal = Number(data.target_value) || 1;
      const pct = parseFloat(((achieved / targetVal) * 100).toFixed(2));
      const status = data.status || (pct >= 100 ? 'achieved' : 'active');
      const id = data.id || `tgt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const res = await client.query(
        `INSERT INTO employee_targets (
          id, organization_id, employee_id, target_type, title, period_type, period_identifier,
          start_date, end_date, target_value, achieved_value, achievement_percent, unit, status, notes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            target_value = EXCLUDED.target_value,
            achieved_value = EXCLUDED.achieved_value,
            achievement_percent = EXCLUDED.achievement_percent,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            updated_at = NOW()
        RETURNING *`,
        [
          id, orgId, data.employee_id, data.target_type, data.title, data.period_type, data.period_identifier,
          data.start_date, data.end_date, data.target_value, achieved, pct, data.unit || 'INR', status, data.notes || null,
        ]
      );

      await this.logAudit(client, orgId, actor.id, actor.email, 'target.save', 'employee_targets', id, {
        employee_id: data.employee_id,
        target_value: data.target_value,
      });

      await client.query('COMMIT;');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // 15. Performance Reviews
  public static async getPerformanceReviews(
    orgId: string,
    filters: { employee_id?: string; period?: string; status?: string } = {}
  ): Promise<PerformanceReview[]> {
    const client = await pool.connect();
    try {
      let sql = `
        SELECT 
          pr.*,
          e.display_name as employee_name,
          e.employee_code,
          rev.display_name as reviewer_name
        FROM performance_reviews pr
        JOIN employees e ON pr.employee_id = e.id
        LEFT JOIN employees rev ON pr.reviewer_employee_id = rev.id
        WHERE pr.organization_id = $1
      `;
      const params: any[] = [orgId];

      if (filters.employee_id) {
        params.push(filters.employee_id);
        sql += ` AND pr.employee_id = $${params.length}`;
      }

      if (filters.period) {
        params.push(filters.period);
        sql += ` AND pr.period = $${params.length}`;
      }

      if (filters.status) {
        params.push(filters.status);
        sql += ` AND pr.status = $${params.length}`;
      }

      sql += ` ORDER BY pr.period DESC, pr.created_at DESC`;

      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async createPerformanceReview(
    orgId: string,
    data: {
      employee_id: string;
      reviewer_employee_id?: string | null;
      period: string;
      review_type: string;
      rating_score?: number | null;
      strengths?: string | null;
      growth_areas?: string | null;
      goals_for_next_period?: string | null;
      manager_comments?: string | null;
      employee_comments?: string | null;
      summary_notes?: string | null;
      status?: string;
    },
    actor: { id: string; email: string }
  ): Promise<PerformanceReview> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const countRes = await client.query(
        `SELECT COUNT(*) as count FROM performance_reviews WHERE organization_id = $1`,
        [orgId]
      );
      const nextSeq = parseInt(countRes.rows[0].count || '0', 10) + 1;
      const reviewNum = `REV-2026-${String(nextSeq).padStart(4, '0')}`;
      const id = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const res = await client.query(
        `INSERT INTO performance_reviews (
          id, organization_id, review_number, employee_id, reviewer_employee_id, period, review_type,
          rating_score, status, strengths, growth_areas, goals_for_next_period, manager_comments, employee_comments, summary_notes,
          completed_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15,
          $16, NOW(), NOW()
        ) RETURNING *`,
        [
          id, orgId, reviewNum, data.employee_id, data.reviewer_employee_id || null, data.period, data.review_type || 'quarterly',
          data.rating_score || null, data.status || 'submitted', data.strengths || null, data.growth_areas || null,
          data.goals_for_next_period || null, data.manager_comments || null, data.employee_comments || null, data.summary_notes || null,
          data.status === 'completed' ? new Date().toISOString() : null,
        ]
      );

      await this.logAudit(client, orgId, actor.id, actor.email, 'performance.create', 'performance_reviews', id, {
        review_number: reviewNum,
        employee_id: data.employee_id,
        rating_score: data.rating_score,
      });

      await client.query('COMMIT;');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // 16. Employee Documents
  public static async getEmployeeDocuments(orgId: string, employeeId?: string): Promise<EmployeeDocument[]> {
    const client = await pool.connect();
    try {
      let sql = `
        SELECT 
          ed.*,
          e.display_name as employee_name
        FROM employee_documents ed
        JOIN employees e ON ed.employee_id = e.id
        WHERE ed.organization_id = $1
      `;
      const params: any[] = [orgId];

      if (employeeId) {
        params.push(employeeId);
        sql += ` AND ed.employee_id = $${params.length}`;
      }

      sql += ` ORDER BY ed.created_at DESC`;

      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async uploadEmployeeDocument(
    orgId: string,
    data: {
      employee_id: string;
      document_type: string;
      title: string;
      file_name: string;
      file_size?: number | null;
      file_type?: string | null;
      storage_path?: string | null;
      notes?: string | null;
    },
    actor: { id: string; email: string }
  ): Promise<EmployeeDocument> {
    const client = await pool.connect();
    try {
      const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const res = await client.query(
        `INSERT INTO employee_documents (
          id, organization_id, employee_id, document_type, title, file_name, file_size, file_type, storage_path,
          is_verified, notes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10, $11, NOW(), NOW())
        RETURNING *`,
        [
          id, orgId, data.employee_id, data.document_type, data.title, data.file_name,
          data.file_size || 524288, data.file_type || 'application/pdf', data.storage_path || null,
          data.notes || null, actor.id,
        ]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  public static async verifyEmployeeDocument(
    orgId: string,
    documentId: string,
    actor: { id: string; email: string }
  ): Promise<EmployeeDocument> {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE employee_documents SET
          is_verified = TRUE,
          verified_by = $1,
          verified_at = NOW(),
          updated_at = NOW()
        WHERE id = $2 AND organization_id = $3
        RETURNING *`,
        [actor.id, documentId, orgId]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  public static async deleteEmployeeDocument(
    orgId: string,
    documentId: string
  ): Promise<boolean> {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `DELETE FROM employee_documents WHERE id = $1 AND organization_id = $2`,
        [documentId, orgId]
      );
      return res.rowCount ? res.rowCount > 0 : false;
    } finally {
      client.release();
    }
  }

  // 17. Workforce Tasks
  public static async getPeopleTasks(
    orgId: string,
    filters: { employee_id?: string; department_id?: string; status?: string } = {}
  ): Promise<PeopleTask[]> {
    const client = await pool.connect();
    try {
      let sql = `
        SELECT 
          pt.*,
          e.display_name as assigned_employee_name,
          e.employee_code as assigned_employee_code,
          d.name as department_name,
          b.name as branch_name
        FROM people_tasks pt
        LEFT JOIN employees e ON pt.assigned_employee_id = e.id
        LEFT JOIN departments d ON pt.department_id = d.id
        LEFT JOIN branches b ON pt.branch_id = b.id
        WHERE pt.organization_id = $1
      `;
      const params: any[] = [orgId];

      if (filters.employee_id) {
        params.push(filters.employee_id);
        sql += ` AND pt.assigned_employee_id = $${params.length}`;
      }

      if (filters.department_id) {
        params.push(filters.department_id);
        sql += ` AND pt.department_id = $${params.length}`;
      }

      if (filters.status) {
        params.push(filters.status);
        sql += ` AND pt.status = $${params.length}`;
      }

      sql += ` ORDER BY pt.due_date ASC, pt.created_at DESC`;

      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async createPeopleTask(
    orgId: string,
    data: {
      title: string;
      description?: string | null;
      assigned_employee_id?: string | null;
      department_id?: string | null;
      branch_id?: string | null;
      source_module?: string;
      priority: string;
      due_date: string;
    },
    actor: { id: string; email: string }
  ): Promise<PeopleTask> {
    const client = await pool.connect();
    try {
      const currentYear = new Date().getFullYear();
      const countRes = await client.query(
        `SELECT COUNT(*) as count FROM people_tasks WHERE organization_id = $1`,
        [orgId]
      );
      const nextSeq = parseInt(countRes.rows[0].count || '0', 10) + 1;
      const taskNum = `TSK-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
      const id = `ptsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const res = await client.query(
        `INSERT INTO people_tasks (
          id, organization_id, task_number, title, description, assigned_employee_id,
          department_id, branch_id, source_module, priority, status, due_date, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, 'pending', $11, NOW(), NOW()
        ) RETURNING *`,
        [
          id, orgId, taskNum, data.title, data.description || null, data.assigned_employee_id || null,
          data.department_id || null, data.branch_id || null, data.source_module || 'people', data.priority || 'medium', data.due_date,
        ]
      );

      await this.logAudit(client, orgId, actor.id, actor.email, 'task.create', 'people_tasks', id, {
        task_number: taskNum,
        title: data.title,
        assigned_employee_id: data.assigned_employee_id,
      });

      return res.rows[0];
    } finally {
      client.release();
    }
  }

  public static async updatePeopleTaskStatus(
    orgId: string,
    taskId: string,
    status: string,
    resolutionNotes?: string,
    actor?: { id: string; email: string }
  ): Promise<PeopleTask> {
    const client = await pool.connect();
    try {
      const isCompleted = status === 'completed';
      const res = await client.query(
        `UPDATE people_tasks SET
          status = $1,
          completed_at = $2,
          completed_by = $3,
          resolution_notes = COALESCE($4, resolution_notes),
          updated_at = NOW()
        WHERE id = $5 AND organization_id = $6
        RETURNING *`,
        [
          status,
          isCompleted ? new Date().toISOString() : null,
          isCompleted && actor ? actor.id : null,
          resolutionNotes || null,
          taskId,
          orgId,
        ]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }
}
