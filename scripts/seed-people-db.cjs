// scripts/seed-people-db.cjs
const http = require('http');

function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ sql, params });
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

async function seed() {
  console.log('[HRMS Seeder] Seeding core foundation records...');

  // 1. Shifts
  console.log('Seeding shifts...');
  await runSql(`
    INSERT INTO shifts (
      id, organization_id, code, name, start_time, end_time, grace_period_mins, break_duration_mins,
      half_day_hours, full_day_hours, is_overnight, overtime_eligible, night_allowance, status, created_at, updated_at
    ) VALUES
      ('shift-gen', 'org-jyotsvan-corp', 'GEN-01', 'General Day Shift (HQ & Admin)', '09:00:00', '17:30:00', 15, 60, 4.5, 8.5, FALSE, TRUE, 0.00, 'active', NOW(), NOW()),
      ('shift-mfg-a', 'org-jyotsvan-corp', 'MFG-A', 'Plant Morning Shift (Line 1 & 2)', '06:00:00', '14:30:00', 10, 45, 4.0, 8.0, FALSE, TRUE, 0.00, 'active', NOW(), NOW()),
      ('shift-mfg-b', 'org-jyotsvan-corp', 'MFG-B', 'Plant Evening Shift (Line 1 & 2)', '14:00:00', '22:30:00', 10, 45, 4.0, 8.0, FALSE, TRUE, 150.00, 'active', NOW(), NOW()),
      ('shift-mfg-c', 'org-jyotsvan-corp', 'MFG-C', 'Plant Night Shift (Overnight Packaging)', '22:00:00', '06:30:00', 10, 45, 4.0, 8.0, TRUE, TRUE, 300.00, 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;
  `);

  // 2. Designations
  console.log('Seeding designations...');
  await runSql(`
    INSERT INTO designations (id, organization_id, code, name, department_id, description, status, created_at, updated_at) VALUES
      ('desig-ceo', 'org-jyotsvan-corp', 'CEO', 'Chief Executive Officer', 'dept-mgmt', 'Enterprise executive leadership & strategic governance', 'active', NOW(), NOW()),
      ('desig-coo', 'org-jyotsvan-corp', 'COO', 'Chief Operating Officer', 'dept-mgmt', 'Head of plant manufacturing, supply chain & operations', 'active', NOW(), NOW()),
      ('desig-cfo', 'org-jyotsvan-corp', 'CFO', 'Chief Financial Officer', 'dept-fin', 'Financial governance, capital control & statutory reporting', 'active', NOW(), NOW()),
      ('desig-vp-mfg', 'org-jyotsvan-corp', 'VP-MFG', 'VP of Manufacturing', 'dept-prod', 'Oversees plant output, shift operations & equipment', 'active', NOW(), NOW()),
      ('desig-head-proc', 'org-jyotsvan-corp', 'HEAD-PROC', 'Head of Procurement', 'dept-proc', 'Raw materials sourcing, supplier contracts & POs', 'active', NOW(), NOW()),
      ('desig-head-wh', 'org-jyotsvan-corp', 'HEAD-WH', 'Head of Warehouse & Logistics', 'dept-wh', 'Inventory storage, dispatch & multi-depot logistics', 'active', NOW(), NOW()),
      ('desig-qc-mgr', 'org-jyotsvan-corp', 'QC-MGR', 'Quality Assurance Manager', 'dept-qc', 'In-process quality testing, COA clearance & inspections', 'active', NOW(), NOW()),
      ('desig-sales-dir', 'org-jyotsvan-corp', 'SALES-DIR', 'Commercial Sales Director', 'dept-sales', 'Commercial strategy, field sales force & revenue ops', 'active', NOW(), NOW()),
      ('desig-field-mgr', 'org-jyotsvan-corp', 'FIELD-MGR', 'Area Field Sales Manager', 'dept-sales', 'Territory supervision, beat routing & field performance', 'active', NOW(), NOW()),
      ('desig-sales-exec', 'org-jyotsvan-corp', 'SALES-EXEC', 'Field Sales Executive', 'dept-sales', 'Retailer visits, order booking & payment collection', 'active', NOW(), NOW()),
      ('desig-plant-op', 'org-jyotsvan-corp', 'PLANT-OP', 'Senior Plant Operator', 'dept-prod', 'Production line operator, recipe execution & batching', 'active', NOW(), NOW()),
      ('desig-qc-spec', 'org-jyotsvan-corp', 'QC-SPEC', 'QC Laboratory Specialist', 'dept-qc', 'Assay tests, sample collection & laboratory assays', 'active', NOW(), NOW()),
      ('desig-wh-coord', 'org-jyotsvan-corp', 'WH-COORD', 'Warehouse Logistics Coordinator', 'dept-wh', 'Bin putaway, stock intake & dispatch verification', 'active', NOW(), NOW()),
      ('desig-hr-lead', 'org-jyotsvan-corp', 'HR-LEAD', 'Human Resources Lead', 'dept-hr', 'Talent management, attendance reconciliation & policies', 'active', NOW(), NOW()),
      ('desig-fin-ctrl', 'org-jyotsvan-corp', 'FIN-CTRL', 'Senior Financial Controller', 'dept-fin', 'Invoicing audit, payment reconciliation & general ledger', 'active', NOW(), NOW()),
      ('desig-mkt-lead', 'org-jyotsvan-corp', 'MKT-LEAD', 'Growth Marketing Lead', 'dept-mkt', 'Brand campaigns, digital advertising & omnichannel marketing', 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, code = EXCLUDED.code;
  `);

  // 3. Leave Types
  console.log('Seeding leave types...');
  await runSql(`
    INSERT INTO leave_types (id, organization_id, code, name, annual_allocation, is_paid, carry_forward, description, status, created_at, updated_at) VALUES
      ('lt-cl', 'org-jyotsvan-corp', 'CL', 'Casual Leave', 12, TRUE, FALSE, 'Casual personal time off, short notice leaves', 'active', NOW(), NOW()),
      ('lt-sl', 'org-jyotsvan-corp', 'SL', 'Sick / Medical Leave', 10, TRUE, TRUE, 'Medical illness, recovery and health checkups', 'active', NOW(), NOW()),
      ('lt-el', 'org-jyotsvan-corp', 'EL', 'Earned / Privilege Leave', 18, TRUE, TRUE, 'Annual earned vacation with carry-forward privilege', 'active', NOW(), NOW()),
      ('lt-co', 'org-jyotsvan-corp', 'CO', 'Compensatory Off', 5, TRUE, FALSE, 'Compensatory time for weekend shift or holiday duty', 'active', NOW(), NOW()),
      ('lt-ml', 'org-jyotsvan-corp', 'ML', 'Maternity / Paternity Leave', 90, TRUE, FALSE, 'Parental leave under statutory enterprise policies', 'active', NOW(), NOW()),
      ('lt-ul', 'org-jyotsvan-corp', 'UL', 'Unpaid Leave / LOP', 30, FALSE, FALSE, 'Loss of pay leave upon exhaustion of standard balances', 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, annual_allocation = EXCLUDED.annual_allocation;
  `);

  // 4. Employees
  console.log('Seeding canonical employees...');
  await runSql(`
    INSERT INTO employees (
      id, organization_id, employee_code, user_id, first_name, middle_name, last_name, display_name,
      date_of_birth, gender, phone, email, personal_email, address, city, state, pincode,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      joining_date, employment_type, department_id, branch_id, designation_id, reporting_manager_id,
      shift_id, bank_name, bank_account_number, bank_ifsc, pan_number, uan, pf_number,
      status, created_at, updated_at
    ) VALUES
      ('emp-001', 'org-jyotsvan-corp', 'EMP-0001', 'usr-super-admin', 'Aarav', 'K.', 'Singhania', 'Aarav Singhania', '1982-04-15', 'male', '+91 22 4567 8900', 'admin@jyotsvan.enterprise', 'aarav.singhania@gmail.com', 'Skyline Towers, Flat 2401, BKC', 'Mumbai', 'Maharashtra', '400051', 'Pooja Singhania', '+91 98200 12345', 'Spouse', '2024-01-01', 'full_time', 'dept-mgmt', 'br-hq-01', 'desig-ceo', NULL, 'shift-gen', 'HDFC Bank', '50100458923412', 'HDFC0000128', 'AAACS1940M', '101249876543', 'MH/BAN/0045892/001', 'active', NOW(), NOW()),
      ('emp-002', 'org-jyotsvan-corp', 'EMP-0002', 'usr-management', 'Eleanor', NULL, 'Vance', 'Eleanor Vance', '1986-08-22', 'female', '+1 (415) 555-0101', 'management@jyotsvan.enterprise', 'eleanor.vance@yahoo.com', '45 Palm Grove Avenue', 'Mumbai', 'Maharashtra', '400050', 'Robert Vance', '+1 (415) 555-9988', 'Brother', '2024-02-15', 'full_time', 'dept-mgmt', 'br-hq-01', 'desig-coo', 'emp-001', 'shift-gen', 'ICICI Bank', '002405018942', 'ICIC0000024', 'BVCPV8912K', '101249876544', 'MH/BAN/0045892/002', 'active', NOW(), NOW()),
      ('emp-003', 'org-jyotsvan-corp', 'EMP-0003', 'usr-finance', 'David', 'L.', 'Miller', 'David Miller', '1984-11-10', 'male', '+1 (415) 555-0105', 'finance@jyotsvan.enterprise', 'david.miller@gmail.com', 'Harbor View Apartments, Worli', 'Mumbai', 'Maharashtra', '400018', 'Sarah Miller', '+1 (415) 555-8877', 'Spouse', '2024-03-01', 'full_time', 'dept-fin', 'br-hq-01', 'desig-cfo', 'emp-001', 'shift-gen', 'Axis Bank', '91801004892143', 'UTIB0000189', 'DMILP4412R', '101249876545', 'MH/BAN/0045892/003', 'active', NOW(), NOW()),
      ('emp-004', 'org-jyotsvan-corp', 'EMP-0004', 'usr-purchase', 'Arthur', NULL, 'Pendelton', 'Arthur Pendelton', '1988-06-19', 'male', '+1 (775) 555-0102', 'purchase@jyotsvan.enterprise', 'arthur.p@gmail.com', 'Infovalley Greens, Phase 1', 'Bhubaneswar', 'Odisha', '752054', 'Helen Pendelton', '+1 (775) 555-0999', 'Spouse', '2024-04-10', 'full_time', 'dept-proc', 'br-plant-01', 'desig-head-proc', 'emp-002', 'shift-mfg-a', 'State Bank of India', '30914892341', 'SBIN0001894', 'APENP9821L', '101249876546', 'OR/BBS/0012492/004', 'active', NOW(), NOW()),
      ('emp-005', 'org-jyotsvan-corp', 'EMP-0005', 'usr-warehouse', 'Marcus', NULL, 'Chen', 'Marcus Chen', '1990-03-14', 'male', '+1 (510) 555-0103', 'warehouse@jyotsvan.enterprise', 'marcus.chen@gmail.com', 'Seawoods Grand, Sector 40', 'Navi Mumbai', 'Maharashtra', '400706', 'Jenny Chen', '+1 (510) 555-4433', 'Sister', '2024-04-15', 'full_time', 'dept-wh', 'br-hq-01', 'desig-head-wh', 'emp-002', 'shift-gen', 'HDFC Bank', '50100489123490', 'HDFC0000128', 'MCHNP3419Q', '101249876547', 'MH/BAN/0045892/005', 'active', NOW(), NOW()),
      ('emp-007', 'org-jyotsvan-corp', 'EMP-0007', 'usr-fieldsales', 'Vikram', NULL, 'Sharma', 'Vikram Sharma', '1991-07-28', 'male', '+1 (415) 555-0106', 'field.sales@jyotsvan.enterprise', 'vikram.sharma.sales@gmail.com', 'Okhla Phase II, Block D', 'New Delhi', 'Delhi', '110020', 'Sunita Sharma', '+91 98111 22334', 'Spouse', '2024-06-01', 'full_time', 'dept-sales', 'br-delhi-01', 'desig-field-mgr', 'emp-002', 'shift-gen', 'Kotak Mahindra Bank', '48123940192', 'KKBK0000192', 'VSHRP8914M', '101249876548', 'DL/DEL/0091482/007', 'active', NOW(), NOW()),
      ('emp-008', 'org-jyotsvan-corp', 'EMP-0008', NULL, 'Rajesh', 'Kumar', 'Mohanty', 'Rajesh Mohanty', '1993-12-04', 'male', '+91 674 255 1290', 'rajesh.mohanty@jyotsvan.enterprise', 'rajesh.mohanty@rediffmail.com', 'Plot 102, Khurda Industrial Enclave', 'Bhubaneswar', 'Odisha', '752055', 'Geeta Mohanty', '+91 94370 12345', 'Mother', '2024-07-15', 'full_time', 'dept-prod', 'br-plant-01', 'desig-plant-op', 'emp-004', 'shift-mfg-a', 'State Bank of India', '20948192301', 'SBIN0001894', 'RMOHP2914Z', '101249876549', 'OR/BBS/0012492/008', 'active', NOW(), NOW()),
      ('emp-011', 'org-jyotsvan-corp', 'EMP-0011', NULL, 'Priya', NULL, 'Nair', 'Priya Nair', '1990-10-30', 'female', '+91 22 4567 8911', 'hr.lead@jyotsvan.enterprise', 'priya.nair.hr@gmail.com', 'Hiranandani Gardens, Powai', 'Mumbai', 'Maharashtra', '400076', 'Arjun Nair', '+91 98205 66778', 'Spouse', '2024-03-15', 'full_time', 'dept-hr', 'br-hq-01', 'desig-hr-lead', 'emp-001', 'shift-gen', 'HDFC Bank', '50100418923019', 'HDFC0000128', 'PNAIP8912T', '101249876550', 'MH/BAN/0045892/011', 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name, email = EXCLUDED.email, bank_name = EXCLUDED.bank_name;
  `);

  // 5. Salary Components
  console.log('Seeding salary components...');
  await runSql(`
    INSERT INTO salary_components (
      id, organization_id, code, name, classification, calculation_method, default_value,
      is_taxable, is_pf_applicable, is_esi_applicable, display_order, status, created_at, updated_at
    ) VALUES
      ('comp-basic', 'org-jyotsvan-corp', 'BASIC', 'Basic Salary', 'earning', 'fixed', 40000, TRUE, TRUE, TRUE, 1, 'active', NOW(), NOW()),
      ('comp-hra', 'org-jyotsvan-corp', 'HRA', 'House Rent Allowance (HRA)', 'earning', 'percentage_of_basic', 50, TRUE, FALSE, TRUE, 2, 'active', NOW(), NOW()),
      ('comp-da', 'org-jyotsvan-corp', 'DA', 'Dearness Allowance (DA)', 'earning', 'percentage_of_basic', 10, TRUE, TRUE, TRUE, 3, 'active', NOW(), NOW()),
      ('comp-spl', 'org-jyotsvan-corp', 'SPECIAL', 'Special Allowance', 'earning', 'fixed', 15000, TRUE, FALSE, FALSE, 4, 'active', NOW(), NOW()),
      ('comp-convey', 'org-jyotsvan-corp', 'CONVEYANCE', 'Conveyance Allowance', 'earning', 'fixed', 1600, TRUE, FALSE, FALSE, 5, 'active', NOW(), NOW()),
      ('comp-med', 'org-jyotsvan-corp', 'MEDICAL', 'Medical Allowance', 'earning', 'fixed', 1250, TRUE, FALSE, FALSE, 6, 'active', NOW(), NOW()),
      ('comp-epf-ee', 'org-jyotsvan-corp', 'EPF_EE', 'Employee Provident Fund (12%)', 'deduction', 'formula', 12, FALSE, FALSE, FALSE, 7, 'active', NOW(), NOW()),
      ('comp-esi-ee', 'org-jyotsvan-corp', 'ESI_EE', 'Employee State Insurance (0.75%)', 'deduction', 'formula', 0.75, FALSE, FALSE, FALSE, 8, 'active', NOW(), NOW()),
      ('comp-pt', 'org-jyotsvan-corp', 'PT', 'Professional Tax (State Slab)', 'deduction', 'fixed', 200, FALSE, FALSE, FALSE, 9, 'active', NOW(), NOW()),
      ('comp-tds', 'org-jyotsvan-corp', 'TDS', 'Income Tax (TDS u/s 192)', 'deduction', 'fixed', 2500, FALSE, FALSE, FALSE, 10, 'active', NOW(), NOW()),
      ('comp-epf-er', 'org-jyotsvan-corp', 'EPF_ER', 'Employer EPF & EPS Contribution (12%)', 'employer_contribution', 'formula', 12, FALSE, FALSE, FALSE, 11, 'active', NOW(), NOW()),
      ('comp-esi-er', 'org-jyotsvan-corp', 'ESI_ER', 'Employer ESI Contribution (3.25%)', 'employer_contribution', 'formula', 3.25, FALSE, FALSE, FALSE, 12, 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, default_value = EXCLUDED.default_value;
  `);

  // 6. Salary Structure & Assignments
  console.log('Seeding salary structure & assignments...');
  await runSql(`
    INSERT INTO salary_structures (
      id, organization_id, code, name, description, total_ctc_monthly, total_ctc_annual, status, created_at, updated_at
    ) VALUES (
      'struct-standard-exec', 'org-jyotsvan-corp', 'EXEC-STD-2026', 'Executive & Professional Standard CTC Structure',
      'Standard compensation structure with EPF, HRA, and statutory allowances', 85000, 1020000, 'active', NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO employee_salary_assignments (
      id, organization_id, employee_id, salary_structure_id, effective_from,
      base_ctc_annual, base_ctc_monthly, basic_monthly, hra_monthly, da_monthly, special_allowance_monthly,
      epf_applicable, esi_applicable, pt_applicable, tds_monthly, status, created_at
    ) VALUES
      ('sal-assign-emp-001', 'org-jyotsvan-corp', 'emp-001', 'struct-standard-exec', '2026-01-01', 3600000, 300000, 150000, 75000, 15000, 55000, TRUE, FALSE, TRUE, 25000, 'active', NOW()),
      ('sal-assign-emp-002', 'org-jyotsvan-corp', 'emp-002', 'struct-standard-exec', '2026-01-01', 2400000, 200000, 100000, 50000, 10000, 35000, TRUE, FALSE, TRUE, 15000, 'active', NOW()),
      ('sal-assign-emp-003', 'org-jyotsvan-corp', 'emp-003', 'struct-standard-exec', '2026-01-01', 2160000, 180000, 90000, 45000, 9000, 31000, TRUE, FALSE, TRUE, 12000, 'active', NOW()),
      ('sal-assign-emp-004', 'org-jyotsvan-corp', 'emp-004', 'struct-standard-exec', '2026-01-01', 1440000, 120000, 60000, 30000, 6000, 20000, TRUE, FALSE, TRUE, 7000, 'active', NOW()),
      ('sal-assign-emp-005', 'org-jyotsvan-corp', 'emp-005', 'struct-standard-exec', '2026-01-01', 1200000, 100000, 50000, 25000, 5000, 16000, TRUE, FALSE, TRUE, 5000, 'active', NOW()),
      ('sal-assign-emp-007', 'org-jyotsvan-corp', 'emp-007', 'struct-standard-exec', '2026-01-01', 960000, 80000, 40000, 20000, 4000, 12000, TRUE, FALSE, TRUE, 3000, 'active', NOW()),
      ('sal-assign-emp-008', 'org-jyotsvan-corp', 'emp-008', 'struct-standard-exec', '2026-01-01', 600000, 50000, 25000, 12500, 2500, 8000, TRUE, FALSE, TRUE, 1000, 'active', NOW()),
      ('sal-assign-emp-011', 'org-jyotsvan-corp', 'emp-011', 'struct-standard-exec', '2026-01-01', 1080000, 90000, 45000, 22500, 4500, 14000, TRUE, FALSE, TRUE, 4000, 'active', NOW())
    ON CONFLICT (id) DO UPDATE
    SET base_ctc_monthly = EXCLUDED.base_ctc_monthly, basic_monthly = EXCLUDED.basic_monthly;
  `);

  // 7. Payroll Period & Run
  console.log('Seeding payroll period & run...');
  await runSql(`
    INSERT INTO payroll_periods (
      id, organization_id, period_name, year, month, start_date, end_date, total_working_days, status, created_at
    ) VALUES (
      'period-2026-03', 'org-jyotsvan-corp', 'March 2026', 2026, 3, '2026-03-01', '2026-03-31', 26, 'open', NOW()
    ) ON CONFLICT (organization_id, year, month) DO NOTHING;

    INSERT INTO payroll_runs (
      id, organization_id, period_id, run_number, start_date, end_date, payout_date,
      total_employees, total_gross, total_deductions, total_net_payable, total_employer_cost,
      total_epf, total_esi, total_pt, total_tds, status, created_at, updated_at
    ) VALUES (
      'prun-2026-03-01', 'org-jyotsvan-corp', 'period-2026-03', 'PR-2026-03', '2026-03-01', '2026-03-31', '2026-04-05',
      8, 1120000.00, 168400.00, 951600.00, 1205600.00,
      57600.00, 0.00, 1600.00, 67000.00, 'approved', NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;
  `);

  // 8. Public Holidays
  console.log('Seeding holidays...');
  await runSql(`
    INSERT INTO holiday_calendar (id, organization_id, holiday_name, holiday_date, holiday_type, is_optional, created_at) VALUES
      ('hol-01', 'org-jyotsvan-corp', 'New Year Day', '2026-01-01', 'national', FALSE, NOW()),
      ('hol-02', 'org-jyotsvan-corp', 'Republic Day', '2026-01-26', 'national', FALSE, NOW()),
      ('hol-03', 'org-jyotsvan-corp', 'Holi Festival', '2026-03-04', 'national', FALSE, NOW()),
      ('hol-04', 'org-jyotsvan-corp', 'Utkal Divas (Plant Holiday)', '2026-04-01', 'plant', FALSE, NOW()),
      ('hol-05', 'org-jyotsvan-corp', 'Independence Day', '2026-08-15', 'national', FALSE, NOW()),
      ('hol-06', 'org-jyotsvan-corp', 'Mahatma Gandhi Jayanti', '2026-10-02', 'national', FALSE, NOW()),
      ('hol-07', 'org-jyotsvan-corp', 'Diwali (Deepavali)', '2026-11-08', 'national', FALSE, NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // 9. HR Announcements
  console.log('Seeding announcements...');
  await runSql(`
    INSERT INTO hr_announcements (
      id, organization_id, title, content, category, target_audience, priority, published_by, published_at, is_active, created_at
    ) VALUES (
      'ann-001', 'org-jyotsvan-corp', 'Annual Health & Wellness Checkup Camp',
      'Corporate HR has organized an on-site health checkup camp for all plant & HQ staff on 28th March 2026 in collaboration with Apollo Health.',
      'company', 'all', 'normal', 'Priya Nair (HR Lead)', NOW(), TRUE, NOW()
    ) ON CONFLICT (id) DO NOTHING;
  `);

  console.log('✓ HRMS Seed data successfully applied!');
}

seed().catch(err => {
  console.error('Seed failure:', err);
  process.exit(1);
});
