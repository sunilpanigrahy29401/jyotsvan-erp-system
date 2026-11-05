# Finance, People/HRMS, CRM

Generated from repository structure on 2026-11-04 (file map, tables, sizes) + audit notes. Status/classification: see ../IMPLEMENTATION_STATUS.md. Risks: ../KNOWN_ISSUES.md, ../SECURITY_ARCHITECTURE.md.

## Finance
- Migration: `src/server/migrate-finance.ts`
- Tables (18): `collection_activity_logs`, `collections`, `credit_note_items`, `credit_notes`, `debit_note_items`, `debit_notes`, `expense_categories`, `expense_status_history`, `expenses`, `finance_transactions`, `financial_settings`, `invoice_items`, `invoice_status_history`, `invoices`, `payment_allocations`, `payment_methods`, `payment_status_history`, `payments`
- Server: `src/server/finance-routes.ts`, `src/server/finance-service.ts`, `src/server/invoice-preparation-service.ts`
- UI/client: `src/app/pages/finance/*`, `src/app/pages/FinancePage.tsx`, `src/services/financeApi.ts` (~6077 lines)
- Notes: Invoice-preparation only for e-invoice/e-way; no GSP client found.

## People/HRMS
- Migration: `src/server/migrate-people.ts`
- Tables (24): `attendance_corrections`, `attendance_records`, `designations`, `employee_documents`, `employee_exits`, `employee_salary_assignments`, `employee_targets`, `employees`, `holiday_calendar`, `hr_announcements`, `hr_requests`, `leave_balances`, `leave_requests`, `leave_types`, `payroll_periods`, `payroll_runs`, `payslips`, `people_tasks`, `performance_reviews`, `salary_components`, `salary_structure_components`, `salary_structures`, `shift_assignments`, `shifts`
- Server: `src/server/people-routes.ts`, `src/server/people-service.ts`, `src/server/hrms-payroll-service.ts`
- UI/client: `src/app/pages/people/*`, `src/app/pages/PeoplePage.tsx`, `src/services/people-api.ts` (~7223 lines)
- Notes: Largest router (52 handlers); no authz on payroll endpoints. Pending HRMS master prompt in public/assets/aistudio.

## CRM
- Migration: `src/server/migrate-crm.ts`
- Tables (19): `crm_account_links`, `crm_accounts`, `crm_activities`, `crm_automation_logs`, `crm_automation_rules`, `crm_contacts`, `crm_deal_handoffs`, `crm_deal_items`, `crm_deal_stage_history`, `crm_deals`, `crm_integration_configs`, `crm_lead_sources`, `crm_lead_status_history`, `crm_lead_tags`, `crm_leads`, `crm_notes`, `crm_pipeline_stages`, `crm_pipelines`, `crm_webhook_logs`
- Server: `src/server/crm-routes.ts`, `src/server/crm-service.ts`
- UI/client: `src/app/pages/crm/*`, `src/app/pages/CrmPage.tsx`, `src/services/crmApi.ts` (~3660 lines)
- Notes: BROKEN typecheck (KI-07).
