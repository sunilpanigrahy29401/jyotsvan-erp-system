// scripts/execute-people-db.js
const http = require('http');

function runSql(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ sql });
    const req = http.request('http://localhost:3000/api/db/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 400 || json.error) reject(new Error(json.error || body));
          else resolve(json);
        } catch(e) { reject(new Error(body)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function migrate() {
  console.log('[HRMS Database Engine] Starting live schema deployment across 20+ tables...');

  // 1. Shifts Master Table
  console.log('1. Creating shifts table...');
  await runSql(`
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
    CREATE INDEX IF NOT EXISTS idx_shifts_org ON shifts(organization_id);
  `);

  // 2. Employees Master Table
  console.log('2. Creating employees table...');
  await runSql(`
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
      bank_name VARCHAR(128),
      bank_account_number VARCHAR(64),
      bank_ifsc VARCHAR(32),
      bank_branch VARCHAR(128),
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
    CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
    CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
    CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
    CREATE INDEX IF NOT EXISTS idx_employees_mgr ON employees(reporting_manager_id);
    CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
    CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
  `);

  // 3. Shift Assignments & Holiday Calendar
  console.log('3. Creating shift_assignments & holiday_calendar...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS shift_assignments (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      shift_id VARCHAR(64) NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
      effective_from DATE NOT NULL,
      effective_to DATE,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

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

  // 4. Attendance Records & Corrections
  console.log('4. Creating attendance_records & attendance_corrections...');
  await runSql(`
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
    CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance_records(organization_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_emp ON attendance_records(employee_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
    CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

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
    CREATE INDEX IF NOT EXISTS idx_att_corr_org ON attendance_corrections(organization_id);
    CREATE INDEX IF NOT EXISTS idx_att_corr_emp ON attendance_corrections(employee_id);
  `);

  // 5. Leave Types, Balances & Requests
  console.log('5. Creating leave_types, leave_balances & leave_requests...');
  await runSql(`
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
    CREATE INDEX IF NOT EXISTS idx_leave_types_org ON leave_types(organization_id);

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
    CREATE INDEX IF NOT EXISTS idx_leave_bal_org ON leave_balances(organization_id);
    CREATE INDEX IF NOT EXISTS idx_leave_bal_emp ON leave_balances(employee_id);

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
    CREATE INDEX IF NOT EXISTS idx_leave_req_org ON leave_requests(organization_id);
    CREATE INDEX IF NOT EXISTS idx_leave_req_emp ON leave_requests(employee_id);
  `);

  // 6. Salary Components, Structures & Assignments
  console.log('6. Creating salary_components, salary_structures & assignments...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS salary_components (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      code VARCHAR(64) NOT NULL,
      name VARCHAR(128) NOT NULL,
      classification VARCHAR(32) NOT NULL,
      calculation_method VARCHAR(32) NOT NULL,
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

    CREATE TABLE IF NOT EXISTS salary_structure_components (
      id VARCHAR(64) PRIMARY KEY,
      salary_structure_id VARCHAR(64) NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
      component_id VARCHAR(64) NOT NULL REFERENCES salary_components(id) ON DELETE CASCADE,
      amount_or_percentage NUMERIC(12,2) NOT NULL,
      display_order INTEGER DEFAULT 1 NOT NULL
    );

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

  // 7. Payroll Periods, Runs & Payslips
  console.log('7. Creating payroll_periods, payroll_runs & payslips...');
  await runSql(`
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
      basic NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      hra NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      da NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      conveyance NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      special_allowance NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      medical_allowance NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      overtime_pay NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      bonus_incentives NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      gross_earnings NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      epf_employee NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      esi_employee NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      professional_tax NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      tds_tax NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      other_deductions NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      total_deductions NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      net_salary NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      epf_employer NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      esi_employer NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      total_employer_contribution NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      total_ctc_incurred NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
      payment_status VARCHAR(32) DEFAULT 'unpaid' NOT NULL,
      payment_reference VARCHAR(128),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT uk_run_emp_payslip UNIQUE (payroll_run_id, employee_id)
    );
    CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips(payroll_run_id);
    CREATE INDEX IF NOT EXISTS idx_payslips_emp ON payslips(employee_id);
  `);

  // 8. Exits, HR Requests, Announcements & Operational Tasks
  console.log('8. Creating exits, requests, announcements & targets...');
  await runSql(`
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

  console.log('9. Checking deployed tables...');
  const res = await runSql(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN (
        'employees', 'shifts', 'designations', 'attendance_records', 'leave_types',
        'leave_balances', 'leave_requests', 'salary_components', 'salary_structures',
        'employee_salary_assignments', 'payroll_periods', 'payroll_runs', 'payslips',
        'employee_exits', 'hr_requests', 'hr_announcements'
      )
    ORDER BY table_name;
  `);

  console.log('Deployed HRMS tables verification:');
  console.table(res.rows);
}

migrate().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
