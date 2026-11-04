// src/server/migrate-people.ts
// Enterprise Staff, HRMS, Indian Payroll & People Management Layer Schema Migration (Phase 21 Full Scope)

import { pool } from './db.ts';

export async function runPeopleMigration() {
  console.log('[Phase 21 Migration] Initializing Staff & People Management Layer schema (Full Scope)...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Designations Table (`designations`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS designations (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(128) NOT NULL,
        code VARCHAR(64) NOT NULL,
        department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
        description TEXT,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_designation_code UNIQUE (organization_id, code)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_designations_org ON designations(organization_id);
      CREATE INDEX IF NOT EXISTS idx_designations_dept ON designations(department_id);
    `);

    // 2. Shifts Master Table (`shifts`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        grace_period_mins INTEGER DEFAULT 15 NOT NULL,
        break_duration_mins INTEGER DEFAULT 60 NOT NULL,
        half_day_hours NUMERIC(4,2) DEFAULT 4.5 NOT NULL,
        full_day_hours NUMERIC(4,2) DEFAULT 8.5 NOT NULL,
        is_overnight BOOLEAN DEFAULT FALSE NOT NULL,
        overtime_eligible BOOLEAN DEFAULT TRUE NOT NULL,
        night_allowance NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_shift_code UNIQUE (organization_id, code)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shifts_org ON shifts(organization_id);
    `);

    // 3. Employees Master Table (`employees`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        employee_code VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        first_name VARCHAR(128) NOT NULL,
        middle_name VARCHAR(128),
        last_name VARCHAR(128) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        date_of_birth DATE,
        gender VARCHAR(32) DEFAULT 'prefer_not_to_say',
        phone VARCHAR(64) NOT NULL,
        alternate_phone VARCHAR(64),
        email VARCHAR(255) NOT NULL,
        personal_email VARCHAR(255),
        address TEXT,
        city VARCHAR(128),
        state VARCHAR(128),
        pincode VARCHAR(32),
        permanent_address TEXT,
        emergency_contact_name VARCHAR(128),
        emergency_contact_phone VARCHAR(64),
        emergency_contact_relation VARCHAR(64),
        joining_date DATE NOT NULL,
        confirmation_date DATE,
        probation_months INTEGER DEFAULT 6,
        probation_status VARCHAR(32) DEFAULT 'confirmed',
        employment_type VARCHAR(32) DEFAULT 'full_time' NOT NULL,
        department_id VARCHAR(64) NOT NULL REFERENCES departments(id),
        branch_id VARCHAR(64) NOT NULL REFERENCES branches(id),
        designation_id VARCHAR(64) REFERENCES designations(id) ON DELETE SET NULL,
        reporting_manager_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
        grade VARCHAR(32),
        work_location VARCHAR(128),
        shift_id VARCHAR(64) REFERENCES shifts(id) ON DELETE SET NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        exit_date DATE,
        exit_reason TEXT,
        avatar_url TEXT,
        notes TEXT,
        
        -- Banking Details
        bank_name VARCHAR(128),
        bank_account_number VARCHAR(64),
        bank_ifsc VARCHAR(32),
        bank_branch VARCHAR(128),

        -- Indian Statutory Compliance Identifiers
        pan_number VARCHAR(32),
        aadhaar_number VARCHAR(32),
        uan VARCHAR(32),
        pf_number VARCHAR(64),
        esi_number VARCHAR(64),
        tax_regime VARCHAR(16) DEFAULT 'new',

        created_by VARCHAR(64),
        updated_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_emp_code UNIQUE (organization_id, employee_code)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
      CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
      CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
      CREATE INDEX IF NOT EXISTS idx_employees_mgr ON employees(reporting_manager_id);
      CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
      CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
    `);

    // 4. Shift Assignments Table (`shift_assignments`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS shift_assignments (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        shift_id VARCHAR(64) NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        effective_from DATE NOT NULL,
        effective_to DATE,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 5. Holiday Calendar Table (`holiday_calendar`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS holiday_calendar (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE CASCADE,
        holiday_name VARCHAR(128) NOT NULL,
        holiday_date DATE NOT NULL,
        holiday_type VARCHAR(32) DEFAULT 'national' NOT NULL,
        is_optional BOOLEAN DEFAULT FALSE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_branch_holiday UNIQUE (organization_id, branch_id, holiday_date)
      );
    `);

    // 6. Attendance Records Table (`attendance_records`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        check_in_time TIMESTAMPTZ,
        check_out_time TIMESTAMPTZ,
        total_hours NUMERIC(5, 2) DEFAULT 0,
        break_minutes INTEGER DEFAULT 0,
        status VARCHAR(32) DEFAULT 'present' NOT NULL,
        source VARCHAR(32) DEFAULT 'web' NOT NULL,
        check_in_location TEXT,
        check_out_location TEXT,
        remarks TEXT,
        is_corrected BOOLEAN DEFAULT FALSE NOT NULL,
        is_locked BOOLEAN DEFAULT FALSE NOT NULL,
        shift_id VARCHAR(64) REFERENCES shifts(id) ON DELETE SET NULL,
        overtime_minutes INTEGER DEFAULT 0,
        late_minutes INTEGER DEFAULT 0,
        early_departure_minutes INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_emp_attendance_date UNIQUE (organization_id, employee_id, date)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance_records(organization_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_emp ON attendance_records(employee_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
      CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
    `);

    // 7. Attendance Corrections Table (`attendance_corrections`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_corrections (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        attendance_record_id VARCHAR(64) REFERENCES attendance_records(id) ON DELETE SET NULL,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        requested_date DATE NOT NULL,
        original_check_in TIMESTAMPTZ,
        original_check_out TIMESTAMPTZ,
        original_status VARCHAR(32),
        requested_check_in TIMESTAMPTZ,
        requested_check_out TIMESTAMPTZ,
        requested_status VARCHAR(32) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(32) DEFAULT 'pending' NOT NULL,
        reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        reviewer_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_att_corr_org ON attendance_corrections(organization_id);
      CREATE INDEX IF NOT EXISTS idx_att_corr_emp ON attendance_corrections(employee_id);
      CREATE INDEX IF NOT EXISTS idx_att_corr_status ON attendance_corrections(status);
    `);

    // 8. Leave Types Table (`leave_types`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(128) NOT NULL,
        code VARCHAR(32) NOT NULL,
        annual_allocation NUMERIC(5, 1) DEFAULT 12 NOT NULL,
        is_paid BOOLEAN DEFAULT TRUE NOT NULL,
        carry_forward BOOLEAN DEFAULT FALSE NOT NULL,
        max_carry_forward NUMERIC(5, 1) DEFAULT 0,
        monthly_accrual BOOLEAN DEFAULT FALSE NOT NULL,
        accrual_rate NUMERIC(4, 2) DEFAULT 0,
        sandwich_rule_applies BOOLEAN DEFAULT FALSE NOT NULL,
        description TEXT,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_leave_code UNIQUE (organization_id, code)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_types_org ON leave_types(organization_id);
    `);

    // 9. Leave Balances Table (`leave_balances`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        leave_type_id VARCHAR(64) NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        allocated_days NUMERIC(5, 1) DEFAULT 0 NOT NULL,
        used_days NUMERIC(5, 1) DEFAULT 0 NOT NULL,
        pending_days NUMERIC(5, 1) DEFAULT 0 NOT NULL,
        remaining_days NUMERIC(5, 1) DEFAULT 0 NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_emp_leave_bal UNIQUE (organization_id, employee_id, leave_type_id, year)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_bal_org ON leave_balances(organization_id);
      CREATE INDEX IF NOT EXISTS idx_leave_bal_emp ON leave_balances(employee_id);
      CREATE INDEX IF NOT EXISTS idx_leave_bal_year ON leave_balances(year);
    `);

    // 10. Leave Requests Table (`leave_requests`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        request_number VARCHAR(64) NOT NULL,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        leave_type_id VARCHAR(64) NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_half_day BOOLEAN DEFAULT FALSE NOT NULL,
        half_day_period VARCHAR(32),
        total_days NUMERIC(4, 1) DEFAULT 1.0 NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(32) DEFAULT 'submitted' NOT NULL,
        approver_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_leave_req_num UNIQUE (organization_id, request_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_req_org ON leave_requests(organization_id);
      CREATE INDEX IF NOT EXISTS idx_leave_req_emp ON leave_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_leave_req_status ON leave_requests(status);
      CREATE INDEX IF NOT EXISTS idx_leave_req_dates ON leave_requests(start_date, end_date);
    `);

    // 11. Salary Components Table (`salary_components`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS salary_components (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        classification VARCHAR(32) NOT NULL, -- earning, deduction, employer_contribution
        calculation_method VARCHAR(32) NOT NULL, -- fixed, percentage_of_basic, percentage_of_gross, formula
        default_value NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        is_taxable BOOLEAN DEFAULT TRUE NOT NULL,
        is_pf_applicable BOOLEAN DEFAULT FALSE NOT NULL,
        is_esi_applicable BOOLEAN DEFAULT FALSE NOT NULL,
        display_order INTEGER DEFAULT 1 NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_sal_comp_code UNIQUE (organization_id, code)
      );
    `);

    // 12. Salary Structures Table (`salary_structures`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS salary_structures (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        description TEXT,
        total_ctc_monthly NUMERIC(14,2) DEFAULT 0.00,
        total_ctc_annual NUMERIC(14,2) DEFAULT 0.00,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_sal_struct_code UNIQUE (organization_id, code)
      );
    `);

    // 13. Salary Structure Components Junction Table (`salary_structure_components`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS salary_structure_components (
        id VARCHAR(64) PRIMARY KEY,
        salary_structure_id VARCHAR(64) NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
        component_id VARCHAR(64) NOT NULL REFERENCES salary_components(id) ON DELETE CASCADE,
        amount_or_percentage NUMERIC(12,2) NOT NULL,
        display_order INTEGER DEFAULT 1 NOT NULL
      );
    `);

    // 14. Employee Salary Assignments Table (`employee_salary_assignments`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_salary_assignments (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        salary_structure_id VARCHAR(64) NOT NULL REFERENCES salary_structures(id),
        effective_from DATE NOT NULL,
        effective_to DATE,
        base_ctc_annual NUMERIC(14,2) NOT NULL,
        base_ctc_monthly NUMERIC(14,2) NOT NULL,
        basic_monthly NUMERIC(12,2) NOT NULL,
        hra_monthly NUMERIC(12,2) NOT NULL,
        da_monthly NUMERIC(12,2) DEFAULT 0.00,
        special_allowance_monthly NUMERIC(12,2) DEFAULT 0.00,
        conveyance_monthly NUMERIC(12,2) DEFAULT 0.00,
        medical_monthly NUMERIC(12,2) DEFAULT 0.00,
        epf_applicable BOOLEAN DEFAULT TRUE NOT NULL,
        esi_applicable BOOLEAN DEFAULT FALSE NOT NULL,
        pt_applicable BOOLEAN DEFAULT TRUE NOT NULL,
        tds_monthly NUMERIC(12,2) DEFAULT 0.00,
        notes TEXT,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 15. Payroll Periods Table (`payroll_periods`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_periods (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        period_name VARCHAR(64) NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_working_days INTEGER NOT NULL,
        status VARCHAR(32) DEFAULT 'open' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_period UNIQUE (organization_id, year, month)
      );
    `);

    // 16. Payroll Runs Table (`payroll_runs`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_runs (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        period_id VARCHAR(64) NOT NULL REFERENCES payroll_periods(id),
        run_number VARCHAR(64) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        payout_date DATE,
        total_employees INTEGER DEFAULT 0,
        total_gross NUMERIC(14,2) DEFAULT 0.00,
        total_deductions NUMERIC(14,2) DEFAULT 0.00,
        total_net_payable NUMERIC(14,2) DEFAULT 0.00,
        total_employer_cost NUMERIC(14,2) DEFAULT 0.00,
        total_epf NUMERIC(14,2) DEFAULT 0.00,
        total_esi NUMERIC(14,2) DEFAULT 0.00,
        total_pt NUMERIC(14,2) DEFAULT 0.00,
        total_tds NUMERIC(14,2) DEFAULT 0.00,
        status VARCHAR(32) DEFAULT 'draft' NOT NULL,
        approved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        locked_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_payroll_run UNIQUE (organization_id, run_number)
      );
    `);

    // 17. Payslips Table (`payslips`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        payroll_run_id VARCHAR(64) NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        period_month INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        total_days NUMERIC(4,1) NOT NULL,
        present_days NUMERIC(4,1) NOT NULL,
        paid_leaves NUMERIC(4,1) DEFAULT 0,
        unpaid_leaves_lop NUMERIC(4,1) DEFAULT 0,
        effective_paid_days NUMERIC(4,1) NOT NULL,
        
        -- Earnings
        basic NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        hra NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        da NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        conveyance NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        special_allowance NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        medical_allowance NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        overtime_pay NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        bonus_incentives NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        gross_earnings NUMERIC(12,2) DEFAULT 0.00 NOT NULL,

        -- Deductions
        epf_employee NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        esi_employee NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        professional_tax NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        tds_tax NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        other_deductions NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        total_deductions NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        net_salary NUMERIC(12,2) DEFAULT 0.00 NOT NULL,

        -- Employer
        epf_employer NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        esi_employer NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        total_employer_contribution NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
        total_ctc_incurred NUMERIC(12,2) DEFAULT 0.00 NOT NULL,

        payment_status VARCHAR(32) DEFAULT 'unpaid' NOT NULL,
        payment_reference VARCHAR(128),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_run_emp_payslip UNIQUE (payroll_run_id, employee_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips(payroll_run_id);
      CREATE INDEX IF NOT EXISTS idx_payslips_emp ON payslips(employee_id);
    `);

    // 18. Employee Exits & Separation Table (`employee_exits`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_exits (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        resignation_date DATE NOT NULL,
        notice_period_days INTEGER DEFAULT 30 NOT NULL,
        tentative_last_working_day DATE NOT NULL,
        actual_last_working_day DATE,
        resignation_reason TEXT NOT NULL,
        status VARCHAR(32) DEFAULT 'submitted' NOT NULL,
        clearance_checklist JSONB DEFAULT '{"it_assets":false,"id_card":false,"department_handover":false,"finance_loans_cleared":false,"hr_docs":false}'::jsonb,
        final_settlement_days NUMERIC(4,1) DEFAULT 0,
        gratuity_eligible BOOLEAN DEFAULT FALSE,
        gratuity_amount NUMERIC(12,2) DEFAULT 0.00,
        leave_encashment_amount NUMERIC(12,2) DEFAULT 0.00,
        rehire_eligible BOOLEAN DEFAULT TRUE,
        exit_interview_notes TEXT,
        approved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 19. HR Unified Requests Table (`hr_requests`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS hr_requests (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        request_number VARCHAR(64) NOT NULL,
        request_type VARCHAR(64) NOT NULL,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        details JSONB DEFAULT '{}'::jsonb NOT NULL,
        status VARCHAR(32) DEFAULT 'pending' NOT NULL,
        reviewer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        reviewer_comments TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_hr_req_num UNIQUE (organization_id, request_number)
      );
    `);

    // 20. HR Announcements Table (`hr_announcements`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS hr_announcements (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(64) DEFAULT 'company' NOT NULL,
        target_audience VARCHAR(32) DEFAULT 'all' NOT NULL,
        target_branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
        target_dept_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
        priority VARCHAR(32) DEFAULT 'normal' NOT NULL,
        published_by VARCHAR(128) NOT NULL,
        published_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 21. Employee Targets Table (`employee_targets`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_targets (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        target_type VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        period_type VARCHAR(32) DEFAULT 'monthly' NOT NULL,
        period_identifier VARCHAR(32) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        target_value NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        achieved_value NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        achievement_percent NUMERIC(6, 2) DEFAULT 0 NOT NULL,
        unit VARCHAR(32) DEFAULT 'INR',
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 22. Performance Reviews Table (`performance_reviews`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS performance_reviews (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        review_number VARCHAR(64) NOT NULL,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        reviewer_employee_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
        period VARCHAR(64) NOT NULL,
        review_type VARCHAR(32) DEFAULT 'quarterly' NOT NULL,
        rating_score NUMERIC(3, 1),
        status VARCHAR(32) DEFAULT 'submitted' NOT NULL,
        strengths TEXT,
        growth_areas TEXT,
        goals_for_next_period TEXT,
        manager_comments TEXT,
        employee_comments TEXT,
        summary_notes TEXT,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_review_num UNIQUE (organization_id, review_number)
      );
    `);

    // 23. Employee Documents Table (`employee_documents`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_documents (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        document_type VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER,
        file_type VARCHAR(64),
        storage_path TEXT,
        is_verified BOOLEAN DEFAULT FALSE NOT NULL,
        verified_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        verified_at TIMESTAMPTZ,
        expiry_date DATE,
        notes TEXT,
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 24. General Workforce Tasks Table (`people_tasks`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS people_tasks (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        task_number VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_employee_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
        assigned_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
        branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
        source_module VARCHAR(64) DEFAULT 'people' NOT NULL,
        priority VARCHAR(32) DEFAULT 'medium' NOT NULL,
        status VARCHAR(32) DEFAULT 'pending' NOT NULL,
        due_date TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        completed_by VARCHAR(64),
        resolution_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_people_task_num UNIQUE (organization_id, task_number)
      );
    `);

    // 25. Register All Phase 21 RBAC Permissions
    const peoplePermissions = [
      { id: 'perm-p-01', code: 'people.view', module: 'people', description: 'View staff directory, org chart, and people dashboard' },
      { id: 'perm-p-02', code: 'people.create', module: 'people', description: 'Onboard new personnel and create employee profiles' },
      { id: 'perm-p-03', code: 'people.edit', module: 'people', description: 'Modify employee profiles, reporting managers, and compensation tiers' },
      { id: 'perm-p-04', code: 'people.delete', module: 'people', description: 'Archive and process offboarding departures' },
      { id: 'perm-p-05', code: 'attendance.view', module: 'people', description: 'View employee daily attendance records and punch registers' },
      { id: 'perm-p-06', code: 'attendance.create', module: 'people', description: 'Record self or staff attendance check-ins and check-outs' },
      { id: 'perm-p-07', code: 'attendance.edit', module: 'people', description: 'Submit attendance regularization and correction requests' },
      { id: 'perm-p-08', code: 'attendance.approve', module: 'people', description: 'Approve or reject attendance corrections' },
      { id: 'perm-p-09', code: 'leave.view', module: 'people', description: 'View organization leave balances and time-off requests' },
      { id: 'perm-p-10', code: 'leave.create', module: 'people', description: 'Apply for paid and unpaid leave requests' },
      { id: 'perm-p-11', code: 'leave.approve', module: 'people', description: 'Approve, reject, or cancel employee leave applications' },
      { id: 'perm-p-12', code: 'payroll.view', module: 'people', description: 'View salary structures, payroll runs, and payslips' },
      { id: 'perm-p-13', code: 'payroll.run', module: 'people', description: 'Execute and calculate monthly payroll runs' },
      { id: 'perm-p-14', code: 'payroll.approve', module: 'people', description: 'Approve and lock payroll for disbursement and accounting handoff' },
      { id: 'perm-p-15', code: 'shifts.manage', module: 'people', description: 'Define shifts, assign rosters, and configure holidays' },
      { id: 'perm-p-16', code: 'performance.manage', module: 'people', description: 'Manage employee targets, KPIs, and appraisals' },
      { id: 'perm-p-17', code: 'exit.manage', module: 'people', description: 'Manage resignations, clearances, and full-and-final settlements' },
      { id: 'perm-p-18', code: 'ess.access', module: 'people', description: 'Access Employee Self-Service portal' },
    ];

    for (const perm of peoplePermissions) {
      await client.query(`
        INSERT INTO permissions (id, code, module, description, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE
        SET code = EXCLUDED.code,
            module = EXCLUDED.module,
            description = EXCLUDED.description;
      `, [perm.id, perm.code, perm.module, perm.description]);

      await client.query(`
        INSERT INTO role_permissions (id, role_id, permission_id, created_at)
        VALUES ($1, 'role-super-admin', $2, NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [`rp-super-admin-${perm.id}`, perm.id]);
    }

    // 26. Seed Baseline Shifts
    const initialShifts = [
      { id: 'shift-gen', code: 'GEN-01', name: 'General Day Shift (HQ & Admin)', start: '09:00:00', end: '17:30:00', grace: 15, breakMins: 60, half: 4.5, full: 8.5, night: 0, overnight: false },
      { id: 'shift-mfg-a', code: 'MFG-A', name: 'Plant Morning Shift (Line 1 & 2)', start: '06:00:00', end: '14:30:00', grace: 10, breakMins: 45, half: 4.0, full: 8.0, night: 0, overnight: false },
      { id: 'shift-mfg-b', code: 'MFG-B', name: 'Plant Evening Shift (Line 1 & 2)', start: '14:00:00', end: '22:30:00', grace: 10, breakMins: 45, half: 4.0, full: 8.0, night: 150, overnight: false },
      { id: 'shift-mfg-c', code: 'MFG-C', name: 'Plant Night Shift (Overnight Packaging)', start: '22:00:00', end: '06:30:00', grace: 10, breakMins: 45, half: 4.0, full: 8.0, night: 300, overnight: true },
    ];

    for (const s of initialShifts) {
      await client.query(`
        INSERT INTO shifts (
          id, organization_id, code, name, start_time, end_time, grace_period_mins, break_duration_mins,
          half_day_hours, full_day_hours, is_overnight, overtime_eligible, night_allowance, status, created_at, updated_at
        ) VALUES (
          $1, 'org-jyotsvan-corp', $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, 'active', NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time;
      `, [s.id, s.code, s.name, s.start, s.end, s.grace, s.breakMins, s.half, s.full, s.overnight, s.night]);
    }

    // 27. Seed Baseline Designations
    const initialDesignations = [
      { id: 'desig-ceo', orgId: 'org-jyotsvan-corp', code: 'CEO', name: 'Chief Executive Officer', deptId: 'dept-mgmt', desc: 'Enterprise executive leadership & strategic governance' },
      { id: 'desig-coo', orgId: 'org-jyotsvan-corp', code: 'COO', name: 'Chief Operating Officer', deptId: 'dept-mgmt', desc: 'Head of plant manufacturing, supply chain & operations' },
      { id: 'desig-cfo', orgId: 'org-jyotsvan-corp', code: 'CFO', name: 'Chief Financial Officer', deptId: 'dept-fin', desc: 'Financial governance, capital control & statutory reporting' },
      { id: 'desig-vp-mfg', orgId: 'org-jyotsvan-corp', code: 'VP-MFG', name: 'VP of Manufacturing', deptId: 'dept-prod', desc: 'Oversees plant output, shift operations & equipment' },
      { id: 'desig-head-proc', orgId: 'org-jyotsvan-corp', code: 'HEAD-PROC', name: 'Head of Procurement', deptId: 'dept-proc', desc: 'Raw materials sourcing, supplier contracts & POs' },
      { id: 'desig-head-wh', orgId: 'org-jyotsvan-corp', code: 'HEAD-WH', name: 'Head of Warehouse & Logistics', deptId: 'dept-wh', desc: 'Inventory storage, dispatch & multi-depot logistics' },
      { id: 'desig-qc-mgr', orgId: 'org-jyotsvan-corp', code: 'QC-MGR', name: 'Quality Assurance Manager', deptId: 'dept-qc', desc: 'In-process quality testing, COA clearance & inspections' },
      { id: 'desig-sales-dir', orgId: 'org-jyotsvan-corp', code: 'SALES-DIR', name: 'Commercial Sales Director', deptId: 'dept-sales', desc: 'Commercial strategy, field sales force & revenue ops' },
      { id: 'desig-field-mgr', orgId: 'org-jyotsvan-corp', code: 'FIELD-MGR', name: 'Area Field Sales Manager', deptId: 'dept-sales', desc: 'Territory supervision, beat routing & field performance' },
      { id: 'desig-sales-exec', orgId: 'org-jyotsvan-corp', code: 'SALES-EXEC', name: 'Field Sales Executive', deptId: 'dept-sales', desc: 'Retailer visits, order booking & payment collection' },
      { id: 'desig-plant-op', orgId: 'org-jyotsvan-corp', code: 'PLANT-OP', name: 'Senior Plant Operator', deptId: 'dept-prod', desc: 'Production line operator, recipe execution & batching' },
      { id: 'desig-qc-spec', orgId: 'org-jyotsvan-corp', code: 'QC-SPEC', name: 'QC Laboratory Specialist', deptId: 'dept-qc', desc: 'Assay tests, sample collection & laboratory assays' },
      { id: 'desig-wh-coord', orgId: 'org-jyotsvan-corp', code: 'WH-COORD', name: 'Warehouse Logistics Coordinator', deptId: 'dept-wh', desc: 'Bin putaway, stock intake & dispatch verification' },
      { id: 'desig-hr-lead', orgId: 'org-jyotsvan-corp', code: 'HR-LEAD', name: 'Human Resources Lead', deptId: 'dept-hr', desc: 'Talent management, attendance reconciliation & policies' },
      { id: 'desig-fin-ctrl', orgId: 'org-jyotsvan-corp', code: 'FIN-CTRL', name: 'Senior Financial Controller', deptId: 'dept-fin', desc: 'Invoicing audit, payment reconciliation & general ledger' },
      { id: 'desig-mkt-lead', orgId: 'org-jyotsvan-corp', code: 'MKT-LEAD', name: 'Growth Marketing Lead', deptId: 'dept-mkt', desc: 'Brand campaigns, digital advertising & omnichannel marketing' },
    ];

    for (const d of initialDesignations) {
      await client.query(`
        INSERT INTO designations (id, organization_id, code, name, department_id, description, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            code = EXCLUDED.code,
            department_id = EXCLUDED.department_id,
            description = EXCLUDED.description;
      `, [d.id, d.orgId, d.code, d.name, d.deptId, d.desc]);
    }

    // 28. Seed Baseline Leave Types
    const initialLeaveTypes = [
      { id: 'lt-cl', orgId: 'org-jyotsvan-corp', code: 'CL', name: 'Casual Leave', alloc: 12, isPaid: true, carry: false, desc: 'Casual personal time off, short notice leaves' },
      { id: 'lt-sl', orgId: 'org-jyotsvan-corp', code: 'SL', name: 'Sick / Medical Leave', alloc: 10, isPaid: true, carry: true, desc: 'Medical illness, recovery and health checkups' },
      { id: 'lt-el', orgId: 'org-jyotsvan-corp', code: 'EL', name: 'Earned / Privilege Leave', alloc: 18, isPaid: true, carry: true, desc: 'Annual earned vacation with carry-forward privilege' },
      { id: 'lt-co', orgId: 'org-jyotsvan-corp', code: 'CO', name: 'Compensatory Off', alloc: 5, isPaid: true, carry: false, desc: 'Compensatory time for weekend shift or holiday duty' },
      { id: 'lt-ml', orgId: 'org-jyotsvan-corp', code: 'ML', name: 'Maternity / Paternity Leave', alloc: 90, isPaid: true, carry: false, desc: 'Parental leave under statutory enterprise policies' },
      { id: 'lt-ul', orgId: 'org-jyotsvan-corp', code: 'UL', name: 'Unpaid Leave / LOP', alloc: 30, isPaid: false, carry: false, desc: 'Loss of pay leave upon exhaustion of standard balances' },
    ];

    for (const lt of initialLeaveTypes) {
      await client.query(`
        INSERT INTO leave_types (id, organization_id, code, name, annual_allocation, is_paid, carry_forward, description, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            annual_allocation = EXCLUDED.annual_allocation,
            is_paid = EXCLUDED.is_paid,
            carry_forward = EXCLUDED.carry_forward;
      `, [lt.id, lt.orgId, lt.code, lt.name, lt.alloc, lt.isPaid, lt.carry, lt.desc]);
    }

    // 29. Seed Canonical Employees
    const initialEmployees = [
      {
        id: 'emp-001',
        orgId: 'org-jyotsvan-corp',
        code: 'EMP-0001',
        userId: 'usr-super-admin',
        first: 'Aarav',
        middle: 'K.',
        last: 'Singhania',
        display: 'Aarav Singhania',
        dob: '1982-04-15',
        gender: 'male',
        phone: '+91 22 4567 8900',
        email: 'admin@jyotsvan.enterprise',
        personalEmail: 'aarav.singhania@gmail.com',
        address: 'Skyline Towers, Flat 2401, BKC',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400051',
        emgName: 'Pooja Singhania',
        emgPhone: '+91 98200 12345',
        emgRel: 'Spouse',
        joining: '2024-01-01',
        empType: 'full_time',
        deptId: 'dept-mgmt',
        branchId: 'br-hq-01',
        desigId: 'desig-ceo',
        mgrId: null,
        status: 'active',
        shiftId: 'shift-gen',
        bankName: 'HDFC Bank',
        bankAcc: '50100458923412',
        bankIfsc: 'HDFC0000128',
        pan: 'AAACS1940M',
        uan: '101249876543',
        pf: 'MH/BAN/0045892/001',
      },
      {
        id: 'emp-002',
        orgId: 'org-jyotsvan-corp',
        code: 'EMP-0002',
        userId: 'usr-management',
        first: 'Eleanor',
        middle: null,
        last: 'Vance',
        display: 'Eleanor Vance',
        dob: '1986-08-22',
        gender: 'female',
        phone: '+1 (415) 555-0101',
        email: 'management@jyotsvan.enterprise',
        personalEmail: 'eleanor.vance@yahoo.com',
        address: '45 Palm Grove Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        emgName: 'Robert Vance',
        emgPhone: '+1 (415) 555-9988',
        emgRel: 'Brother',
        joining: '2024-02-15',
        empType: 'full_time',
        deptId: 'dept-mgmt',
        branchId: 'br-hq-01',
        desigId: 'desig-coo',
        mgrId: 'emp-001',
        status: 'active',
        shiftId: 'shift-gen',
        bankName: 'ICICI Bank',
        bankAcc: '002405018942',
        bankIfsc: 'ICIC0000024',
        pan: 'BVCPV8912K',
        uan: '101249876544',
        pf: 'MH/BAN/0045892/002',
      },
      {
        id: 'emp-003',
        orgId: 'org-jyotsvan-corp',
        code: 'EMP-0003',
        userId: 'usr-finance',
        first: 'David',
        middle: 'L.',
        last: 'Miller',
        display: 'David Miller',
        dob: '1984-11-10',
        gender: 'male',
        phone: '+1 (415) 555-0105',
        email: 'finance@jyotsvan.enterprise',
        personalEmail: 'david.miller@gmail.com',
        address: 'Harbor View Apartments, Worli',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400018',
        emgName: 'Sarah Miller',
        emgPhone: '+1 (415) 555-8877',
        emgRel: 'Spouse',
        joining: '2024-03-01',
        empType: 'full_time',
        deptId: 'dept-fin',
        branchId: 'br-hq-01',
        desigId: 'desig-cfo',
        mgrId: 'emp-001',
        status: 'active',
        shiftId: 'shift-gen',
        bankName: 'Axis Bank',
        bankAcc: '91801004892143',
        bankIfsc: 'UTIB0000189',
        pan: 'DMILP4412R',
        uan: '101249876545',
        pf: 'MH/BAN/0045892/003',
      },
      {
        id: 'emp-004',
        orgId: 'org-jyotsvan-corp',
        code: 'EMP-0004',
        userId: 'usr-purchase',
        first: 'Arthur',
        middle: null,
        last: 'Pendelton',
        display: 'Arthur Pendelton',
        dob: '1988-06-19',
        gender: 'male',
        phone: '+1 (775) 555-0102',
        email: 'purchase@jyotsvan.enterprise',
        personalEmail: 'arthur.p@gmail.com',
        address: 'Infovalley Greens, Phase 1',
        city: 'Bhubaneswar',
        state: 'Odisha',
        pincode: '752054',
        emgName: 'Helen Pendelton',
        emgPhone: '+1 (775) 555-0999',
        emgRel: 'Spouse',
        joining: '2024-04-10',
        empType: 'full_time',
        deptId: 'dept-proc',
        branchId: 'br-plant-01',
        desigId: 'desig-head-proc',
        mgrId: 'emp-002',
        status: 'active',
        shiftId: 'shift-mfg-a',
        bankName: 'State Bank of India',
        bankAcc: '30914892341',
        bankIfsc: 'SBIN0001894',
        pan: 'APENP9821L',
        uan: '101249876546',
        pf: 'OR/BBS/0012492/004',
      },
      {
        id: 'emp-005',
        orgId: 'org-jyotsvan-corp',
        code: 'EMP-0005',
        userId: 'usr-warehouse',
        first: 'Marcus',
        middle: null,
        last: 'Chen',
        display: 'Marcus Chen',
        dob: '1990-03-14',
        gender: 'male',
        phone: '+1 (510) 555-0103',
        email: 'warehouse@jyotsvan.enterprise',
        personalEmail: 'marcus.chen@gmail.com',
        address: 'Seawoods Grand, Sector 40',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        pincode: '400706',
        emgName: 'Jenny Chen',
        emgPhone: '+1 (510) 555-4433',
        emgRel: 'Sister',
        joining: '2024-04-15',
        empType: 'full_time',
        deptId: 'dept-wh',
        branchId: 'br-hq-01',
        desigId: 'desig-head-wh',
        mgrId: 'emp-002',
        status: 'active',
        shiftId: 'shift-gen',
        bankName: 'HDFC Bank',
        bankAcc: '50100489123490',
        bankIfsc: 'HDFC0000128',
        pan: 'MCHNP3419Q',
        uan: '101249876547',
        pf: 'MH/BAN/0045892/005',
      },
      {
        id: 'emp-007',
        orgId: 'org-jyotsvan-corp',
        code: 'EMP-0007',
        userId: 'usr-fieldsales',
        first: 'Vikram',
        middle: null,
        last: 'Sharma',
        display: 'Vikram Sharma',
        dob: '1991-07-28',
        gender: 'male',
        phone: '+1 (415) 555-0106',
        email: 'field.sales@jyotsvan.enterprise',
        personalEmail: 'vikram.sharma.sales@gmail.com',
        address: 'Okhla Phase II, Block D',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110020',
        emgName: 'Sunita Sharma',
        emgPhone: '+91 98111 22334',
        emgRel: 'Spouse',
        joining: '2024-06-01',
        empType: 'full_time',
        deptId: 'dept-sales',
        branchId: 'br-delhi-01',
        desigId: 'desig-field-mgr',
        mgrId: 'emp-002',
        status: 'active',
        shiftId: 'shift-gen',
        bankName: 'Kotak Mahindra Bank',
        bankAcc: '48123940192',
        bankIfsc: 'KKBK0000192',
        pan: 'VSHRP8914M',
        uan: '101249876548',
        pf: 'DL/DEL/0091482/007',
      },
      {
        id: 'emp-008',
        orgId: 'org-jyotsvan-corp',
        code: 'EMP-0008',
        userId: null,
        first: 'Rajesh',
        middle: 'Kumar',
        last: 'Mohanty',
        display: 'Rajesh Mohanty',
        dob: '1993-12-04',
        gender: 'male',
        phone: '+91 674 255 1290',
        email: 'rajesh.mohanty@jyotsvan.enterprise',
        personalEmail: 'rajesh.mohanty@rediffmail.com',
        address: 'Plot 102, Khurda Industrial Enclave',
        city: 'Bhubaneswar',
        state: 'Odisha',
        pincode: '752055',
        emgName: 'Geeta Mohanty',
        emgPhone: '+91 94370 12345',
        emgRel: 'Mother',
        joining: '2024-07-15',
        empType: 'full_time',
        deptId: 'dept-prod',
        branchId: 'br-plant-01',
        desigId: 'desig-plant-op',
        mgrId: 'emp-004',
        status: 'active',
        shiftId: 'shift-mfg-a',
        bankName: 'State Bank of India',
        bankAcc: '20948192301',
        bankIfsc: 'SBIN0001894',
        pan: 'RMOHP2914Z',
        uan: '101249876549',
        pf: 'OR/BBS/0012492/008',
      },
      {
        id: 'emp-011',
        orgId: 'org-jyotsvan-corp',
        code: 'EMP-0011',
        userId: null,
        first: 'Priya',
        middle: null,
        last: 'Nair',
        display: 'Priya Nair',
        dob: '1990-10-30',
        gender: 'female',
        phone: '+91 22 4567 8911',
        email: 'hr.lead@jyotsvan.enterprise',
        personalEmail: 'priya.nair.hr@gmail.com',
        address: 'Hiranandani Gardens, Powai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400076',
        emgName: 'Arjun Nair',
        emgPhone: '+91 98205 66778',
        emgRel: 'Spouse',
        joining: '2024-03-15',
        empType: 'full_time',
        deptId: 'dept-hr',
        branchId: 'br-hq-01',
        desigId: 'desig-hr-lead',
        mgrId: 'emp-001',
        status: 'active',
        shiftId: 'shift-gen',
        bankName: 'HDFC Bank',
        bankAcc: '50100418923019',
        bankIfsc: 'HDFC0000128',
        pan: 'PNAIP8912T',
        uan: '101249876550',
        pf: 'MH/BAN/0045892/011',
      },
    ];

    for (const emp of initialEmployees) {
      await client.query(`
        INSERT INTO employees (
          id, organization_id, employee_code, user_id, first_name, middle_name, last_name, display_name,
          date_of_birth, gender, phone, email, personal_email, address, city, state, pincode,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
          joining_date, employment_type, department_id, branch_id, designation_id, reporting_manager_id,
          shift_id, bank_name, bank_account_number, bank_ifsc, pan_number, uan, pf_number,
          status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20,
          $21, $22, $23, $24, $25, $26,
          $27, $28, $29, $30, $31, $32, $33,
          $34, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET employee_code = EXCLUDED.employee_code,
            display_name = EXCLUDED.display_name,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            department_id = EXCLUDED.department_id,
            branch_id = EXCLUDED.branch_id,
            designation_id = EXCLUDED.designation_id,
            reporting_manager_id = EXCLUDED.reporting_manager_id,
            status = EXCLUDED.status;
      `, [
        emp.id, emp.orgId, emp.code, emp.userId, emp.first, emp.middle, emp.last, emp.display,
        emp.dob, emp.gender, emp.phone, emp.email, emp.personalEmail, emp.address, emp.city, emp.state, emp.pincode,
        emp.emgName, emp.emgPhone, emp.emgRel,
        emp.joining, emp.empType, emp.deptId, emp.branchId, emp.desigId, emp.mgrId,
        emp.shiftId, emp.bankName, emp.bankAcc, emp.bankIfsc, emp.pan, emp.uan, emp.pf,
        emp.status,
      ]);
    }

    // 30. Seed Baseline Salary Components
    const initialComponents = [
      { id: 'comp-basic', code: 'BASIC', name: 'Basic Salary', class: 'earning', method: 'fixed', val: 40000, tax: true, pf: true, esi: true, order: 1 },
      { id: 'comp-hra', code: 'HRA', name: 'House Rent Allowance (HRA)', class: 'earning', method: 'percentage_of_basic', val: 50, tax: true, pf: false, esi: true, order: 2 },
      { id: 'comp-da', code: 'DA', name: 'Dearness Allowance (DA)', class: 'earning', method: 'percentage_of_basic', val: 10, tax: true, pf: true, esi: true, order: 3 },
      { id: 'comp-spl', code: 'SPECIAL', name: 'Special Allowance', class: 'earning', method: 'fixed', val: 15000, tax: true, pf: false, esi: false, order: 4 },
      { id: 'comp-convey', code: 'CONVEYANCE', name: 'Conveyance Allowance', class: 'earning', method: 'fixed', val: 1600, tax: true, pf: false, esi: false, order: 5 },
      { id: 'comp-med', code: 'MEDICAL', name: 'Medical Allowance', class: 'earning', method: 'fixed', val: 1250, tax: true, pf: false, esi: false, order: 6 },
      { id: 'comp-epf-ee', code: 'EPF_EE', name: 'Employee Provident Fund (12%)', class: 'deduction', method: 'formula', val: 12, tax: false, pf: false, esi: false, order: 7 },
      { id: 'comp-esi-ee', code: 'ESI_EE', name: 'Employee State Insurance (0.75%)', class: 'deduction', method: 'formula', val: 0.75, tax: false, pf: false, esi: false, order: 8 },
      { id: 'comp-pt', code: 'PT', name: 'Professional Tax (State Slab)', class: 'deduction', method: 'fixed', val: 200, tax: false, pf: false, esi: false, order: 9 },
      { id: 'comp-tds', code: 'TDS', name: 'Income Tax (TDS u/s 192)', class: 'deduction', method: 'fixed', val: 2500, tax: false, pf: false, esi: false, order: 10 },
      { id: 'comp-epf-er', code: 'EPF_ER', name: 'Employer EPF & EPS Contribution (12%)', class: 'employer_contribution', method: 'formula', val: 12, tax: false, pf: false, esi: false, order: 11 },
      { id: 'comp-esi-er', code: 'ESI_ER', name: 'Employer ESI Contribution (3.25%)', class: 'employer_contribution', method: 'formula', val: 3.25, tax: false, pf: false, esi: false, order: 12 },
    ];

    for (const c of initialComponents) {
      await client.query(`
        INSERT INTO salary_components (
          id, organization_id, code, name, classification, calculation_method, default_value,
          is_taxable, is_pf_applicable, is_esi_applicable, display_order, status, created_at, updated_at
        ) VALUES (
          $1, 'org-jyotsvan-corp', $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            default_value = EXCLUDED.default_value;
      `, [c.id, c.code, c.name, c.class, c.method, c.val, c.tax, c.pf, c.esi, c.order]);
    }

    // 31. Seed Standard Salary Structure
    await client.query(`
      INSERT INTO salary_structures (
        id, organization_id, code, name, description, total_ctc_monthly, total_ctc_annual, status, created_at, updated_at
      ) VALUES (
        'struct-standard-exec', 'org-jyotsvan-corp', 'EXEC-STD-2026', 'Executive & Professional Standard CTC Structure',
        'Standard compensation structure with EPF, HRA, and statutory allowances', 85000, 1020000, 'active', NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 32. Seed Employee Compensation Assignments
    const sampleSalaries = [
      { empId: 'emp-001', ctcAnnual: 3600000, ctcMonthly: 300000, basic: 150000, hra: 75000, da: 15000, spl: 55000, epf: true, pt: true, tds: 25000 },
      { empId: 'emp-002', ctcAnnual: 2400000, ctcMonthly: 200000, basic: 100000, hra: 50000, da: 10000, spl: 35000, epf: true, pt: true, tds: 15000 },
      { empId: 'emp-003', ctcAnnual: 2160000, ctcMonthly: 180000, basic: 90000, hra: 45000, da: 9000, spl: 31000, epf: true, pt: true, tds: 12000 },
      { empId: 'emp-004', ctcAnnual: 1440000, ctcMonthly: 120000, basic: 60000, hra: 30000, da: 6000, spl: 20000, epf: true, pt: true, tds: 7000 },
      { empId: 'emp-005', ctcAnnual: 1200000, ctcMonthly: 100000, basic: 50000, hra: 25000, da: 5000, spl: 16000, epf: true, pt: true, tds: 5000 },
      { empId: 'emp-007', ctcAnnual: 960000, ctcMonthly: 80000, basic: 40000, hra: 20000, da: 4000, spl: 12000, epf: true, pt: true, tds: 3000 },
      { empId: 'emp-008', ctcAnnual: 600000, ctcMonthly: 50000, basic: 25000, hra: 12500, da: 2500, spl: 8000, epf: true, pt: true, tds: 1000 },
      { empId: 'emp-011', ctcAnnual: 1080000, ctcMonthly: 90000, basic: 45000, hra: 22500, da: 4500, spl: 14000, epf: true, pt: true, tds: 4000 },
    ];

    for (const s of sampleSalaries) {
      await client.query(`
        INSERT INTO employee_salary_assignments (
          id, organization_id, employee_id, salary_structure_id, effective_from,
          base_ctc_annual, base_ctc_monthly, basic_monthly, hra_monthly, da_monthly, special_allowance_monthly,
          epf_applicable, esi_applicable, pt_applicable, tds_monthly, status, created_at
        ) VALUES (
          $1, 'org-jyotsvan-corp', $2, 'struct-standard-exec', '2026-01-01',
          $3, $4, $5, $6, $7, $8,
          $9, FALSE, $10, $11, 'active', NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET base_ctc_monthly = EXCLUDED.base_ctc_monthly,
            basic_monthly = EXCLUDED.basic_monthly;
      `, [
        `sal-assign-${s.empId}`, s.empId, s.ctcAnnual, s.ctcMonthly, s.basic, s.hra, s.da, s.spl,
        s.epf, s.pt, s.tds
      ]);
    }

    // 33. Seed Canonical March 2026 Payroll Period & Run
    await client.query(`
      INSERT INTO payroll_periods (
        id, organization_id, period_name, year, month, start_date, end_date, total_working_days, status, created_at
      ) VALUES (
        'period-2026-03', 'org-jyotsvan-corp', 'March 2026', 2026, 3, '2026-03-01', '2026-03-31', 26, 'open', NOW()
      )
      ON CONFLICT (organization_id, year, month) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO payroll_runs (
        id, organization_id, period_id, run_number, start_date, end_date, payout_date,
        total_employees, total_gross, total_deductions, total_net_payable, total_employer_cost,
        total_epf, total_esi, total_pt, total_tds, status, created_at, updated_at
      ) VALUES (
        'prun-2026-03-01', 'org-jyotsvan-corp', 'period-2026-03', 'PR-2026-03', '2026-03-01', '2026-03-31', '2026-04-05',
        8, 1120000.00, 168400.00, 951600.00, 1205600.00,
        57600.00, 0.00, 1600.00, 67000.00, 'approved', NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 34. Seed Public Holidays
    const holidays = [
      { id: 'hol-01', name: 'New Year Day', date: '2026-01-01', type: 'national' },
      { id: 'hol-02', name: 'Republic Day', date: '2026-01-26', type: 'national' },
      { id: 'hol-03', name: 'Holi Festival', date: '2026-03-04', type: 'national' },
      { id: 'hol-04', name: 'Utkal Divas (Plant Holiday)', date: '2026-04-01', type: 'plant' },
      { id: 'hol-05', name: 'Independence Day', date: '2026-08-15', type: 'national' },
      { id: 'hol-06', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', type: 'national' },
      { id: 'hol-07', name: 'Diwali (Deepavali)', date: '2026-11-08', type: 'national' },
    ];

    for (const h of holidays) {
      await client.query(`
        INSERT INTO holiday_calendar (id, organization_id, holiday_name, holiday_date, holiday_type, is_optional, created_at)
        VALUES ($1, 'org-jyotsvan-corp', $2, $3, $4, FALSE, NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [h.id, h.name, h.date, h.type]);
    }

    // 35. Seed Initial Attendance Logs (Past 20 days)
    const currentMonthPrefix = '2026-03-';
    for (let day = 1; day <= 20; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateStr = `${currentMonthPrefix}${dayStr}`;
      const dateObj = new Date(`${dateStr}T12:00:00Z`);
      const dayOfWeek = dateObj.getUTCDay();

      for (const emp of initialEmployees) {
        let status = 'present';
        let checkIn = `${dateStr}T09:00:00.000Z`;
        let checkOut = `${dateStr}T17:30:00.000Z`;
        let totalHours = 8.5;

        if (dayOfWeek === 0) {
          status = 'weekly_off';
          checkIn = null as any;
          checkOut = null as any;
          totalHours = 0;
        } else if (dayOfWeek === 6) {
          status = 'half_day';
          checkIn = `${dateStr}T09:00:00.000Z`;
          checkOut = `${dateStr}T13:30:00.000Z`;
          totalHours = 4.5;
        }

        const attId = `att-${emp.id}-${dateStr}`;
        await client.query(`
          INSERT INTO attendance_records (
            id, organization_id, employee_id, date, check_in_time, check_out_time,
            total_hours, status, source, is_corrected, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, 'web', FALSE, NOW(), NOW()
          )
          ON CONFLICT (organization_id, employee_id, date) DO UPDATE
          SET status = EXCLUDED.status;
        `, [attId, emp.orgId, emp.id, dateStr, checkIn, checkOut, totalHours, status]);
      }
    }

    // 36. Seed HR Announcements
    await client.query(`
      INSERT INTO hr_announcements (
        id, organization_id, title, content, category, target_audience, priority, published_by, published_at, is_active, created_at
      ) VALUES (
        'ann-001', 'org-jyotsvan-corp', 'Annual Health & Wellness Checkup Camp',
        'Corporate HR has organized an on-site health checkup camp for all plant & HQ staff on 28th March 2026 in collaboration with Apollo Health.',
        'company', 'all', 'normal', 'Priya Nair (HR Lead)', NOW(), TRUE, NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query('COMMIT;');
    console.log('[Phase 21 Migration] -> ✓ Staff, HRMS, Shifts & Indian Payroll Layer schema successfully initialized!');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Phase 21 Migration] -> ✗ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
