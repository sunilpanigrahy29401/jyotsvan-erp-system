-- 0002_permissions: permission modules that the server-side route map needs but the original catalogue lacked
-- (payroll, crm, products, suppliers), plus conservative default grants for the built-in roles.
-- Super admins hold '*:*' and need no grants. Tenants can adjust grants in the Roles screen afterwards.

INSERT INTO permissions (id, code, module, description) VALUES
  ('perm-payroll-view',   'payroll.view',   'payroll',   'View payroll runs, payslips and salary structures'),
  ('perm-payroll-create', 'payroll.create', 'payroll',   'Create payroll runs and salary assignments'),
  ('perm-payroll-edit',   'payroll.edit',   'payroll',   'Edit payroll runs and salary assignments'),
  ('perm-payroll-approve','payroll.approve','payroll',   'Approve and lock payroll runs'),
  ('perm-crm-view',       'crm.view',       'crm',       'View leads, deals, accounts and activities'),
  ('perm-crm-create',     'crm.create',     'crm',       'Create leads, deals, accounts and activities'),
  ('perm-crm-edit',       'crm.edit',       'crm',       'Edit and convert leads, deals and accounts'),
  ('perm-crm-delete',     'crm.delete',     'crm',       'Delete CRM records'),
  ('perm-products-view',  'products.view',  'products',  'View product and SKU master'),
  ('perm-products-create','products.create','products',  'Create products and SKUs'),
  ('perm-products-edit',  'products.edit',  'products',  'Edit products and SKUs'),
  ('perm-products-delete','products.delete','products',  'Archive or delete products and SKUs'),
  ('perm-suppliers-view', 'suppliers.view', 'suppliers', 'View supplier master'),
  ('perm-suppliers-create','suppliers.create','suppliers','Create suppliers'),
  ('perm-suppliers-edit', 'suppliers.edit', 'suppliers', 'Edit suppliers'),
  ('perm-suppliers-delete','suppliers.delete','suppliers','Archive or delete suppliers')
ON CONFLICT (code) DO NOTHING;

-- helper: grant a list of permission codes to a role (by slug)
CREATE OR REPLACE FUNCTION pg_temp.grant_codes(role_slug TEXT, codes TEXT[]) RETURNS VOID AS $$
  -- NOT EXISTS (not ON CONFLICT): the live database has no unique constraint on (role_id, permission_id).
  INSERT INTO role_permissions (id, role_id, permission_id)
  SELECT 'rp-' || r.id || '-' || p.id, r.id, p.id
  FROM roles r JOIN permissions p ON p.code = ANY(codes)
  WHERE r.slug = role_slug
    AND NOT EXISTS (SELECT 1 FROM role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM role_permissions x WHERE x.id = 'rp-' || r.id || '-' || p.id);
$$ LANGUAGE sql;

SELECT pg_temp.grant_codes('management', ARRAY[
  'payroll.view','crm.view','crm.create','crm.edit','crm.delete',
  'products.view','products.create','products.edit','products.delete',
  'suppliers.view','suppliers.create','suppliers.edit','suppliers.delete']);
SELECT pg_temp.grant_codes('finance', ARRAY[
  'payroll.view','payroll.create','payroll.edit','payroll.approve','products.view','suppliers.view','crm.view']);
SELECT pg_temp.grant_codes('hr_manager', ARRAY['payroll.view','payroll.create','payroll.edit','payroll.approve']);
SELECT pg_temp.grant_codes('marketing', ARRAY['crm.view','crm.create','crm.edit','products.view']);
SELECT pg_temp.grant_codes('sales_manager', ARRAY['crm.view','crm.create','crm.edit','products.view','products.edit']);
SELECT pg_temp.grant_codes('field_sales', ARRAY['crm.view','crm.create','crm.edit','products.view']);
SELECT pg_temp.grant_codes('ecommerce_manager', ARRAY['crm.view','products.view','products.create','products.edit']);
SELECT pg_temp.grant_codes('production_manager', ARRAY['products.view','products.create','products.edit','suppliers.view']);
SELECT pg_temp.grant_codes('warehouse_manager', ARRAY['products.view','products.create','products.edit','suppliers.view']);
SELECT pg_temp.grant_codes('purchase_manager', ARRAY['products.view','products.create','products.edit','suppliers.view','suppliers.create','suppliers.edit','suppliers.delete']);
