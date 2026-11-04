/**
 * Jyotsvan Enterprise Platform - Phase 23 Audit Logging Types
 * Central canonical types for immutable compliance, security, and operational audit trail.
 */

export type ActorType = 'USER' | 'SYSTEM' | 'WORKER' | 'INTEGRATION' | 'AI';

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'APPROVE'
  | 'REJECT'
  | 'SUBMIT'
  | 'CANCEL'
  | 'POST'
  | 'VOID'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ASSIGN'
  | 'UNASSIGN'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'SYNC'
  | 'CONNECT'
  | 'DISCONNECT'
  | 'READ_SENSITIVE'
  | 'SYSTEM_EVENT';

export type AuditStatus = 'SUCCESS' | 'FAILED';

export type AuditSource = 'WEB' | 'MOBILE' | 'API' | 'WORKER' | 'INTEGRATION' | 'AI' | 'SYSTEM';

export type AuditModule =
  | 'security'
  | 'organization'
  | 'products'
  | 'suppliers'
  | 'inventory'
  | 'warehouse'
  | 'procurement'
  | 'quality'
  | 'manufacturing'
  | 'batches'
  | 'logistics'
  | 'distribution'
  | 'retail'
  | 'sales'
  | 'finance'
  | 'commerce'
  | 'integrations'
  | 'field_sales'
  | 'people'
  | 'notifications'
  | 'settings'
  | 'system';

export type AuditEventType =
  // Organization & Foundation
  | 'ORGANIZATION_PROFILE_UPDATED'
  | 'BRANCH_CREATED'
  | 'BRANCH_UPDATED'
  | 'BRANCH_STATUS_CHANGED'
  | 'DEPARTMENT_CREATED'
  | 'DEPARTMENT_UPDATED'
  | 'WAREHOUSE_REGISTERED'
  | 'WAREHOUSE_UPDATED'
  | 'BUSINESS_SETTINGS_UPDATED'
  // Security & RBAC
  | 'USER_PROVISIONED'
  | 'USER_STATUS_CHANGED'
  | 'USER_ROLE_ASSIGNED'
  | 'USER_ROLE_REVOKED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'ROLE_PERMISSIONS_UPDATED'
  | 'OPERATOR_LOGIN'
  | 'OPERATOR_LOGOUT'
  | 'SENSITIVE_DATA_ACCESSED'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  // Products
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_PRICING_CHANGED'
  | 'PRODUCT_STATUS_CHANGED'
  | 'SKU_MAPPING_UPDATED'
  // Suppliers
  | 'SUPPLIER_REGISTERED'
  | 'SUPPLIER_UPDATED'
  | 'SUPPLIER_TERMS_CHANGED'
  | 'SUPPLIER_STATUS_CHANGED'
  // Inventory
  | 'INVENTORY_OPENING_BALANCE'
  | 'INVENTORY_STOCK_ADJUSTED'
  | 'STOCK_RESERVED'
  | 'STOCK_RELEASED'
  | 'CYCLE_COUNT_RECONCILED'
  | 'STOCK_VARIANCE_RECORDED'
  // Warehouse & Logistics
  | 'WAREHOUSE_TRANSFER_INITIATED'
  | 'WAREHOUSE_TRANSFER_COMPLETED'
  | 'STOCK_DISPATCHED'
  | 'STOCK_RECEIVED'
  | 'BIN_LOCATION_ASSIGNED'
  // Procurement
  | 'PURCHASE_REQUISITION_CREATED'
  | 'PURCHASE_REQUISITION_APPROVED'
  | 'PURCHASE_ORDER_ISSUED'
  | 'PURCHASE_ORDER_APPROVED'
  | 'PURCHASE_ORDER_CANCELLED'
  | 'GRN_RECORDED'
  // Quality Control
  | 'QC_INSPECTION_CREATED'
  | 'QC_APPROVED'
  | 'QC_REJECTED'
  | 'BATCH_QUARANTINED'
  | 'BATCH_RELEASED'
  // Formulations & Manufacturing
  | 'BOM_CREATED'
  | 'BOM_UPDATED'
  | 'PRODUCTION_ORDER_RELEASED'
  | 'MATERIAL_ISSUED'
  | 'PRODUCTION_COMPLETED'
  | 'SCRAP_RECORDED'
  // Batches
  | 'BATCH_CREATED'
  | 'BATCH_DISPATCHED'
  | 'GENEALOGY_TRACED'
  // C&F & Depot
  | 'CF_DISPATCH_RECORDED'
  | 'CF_STOCK_RECEIVED'
  | 'INDENT_ALLOCATED'
  // Distribution & Retail
  | 'DISTRIBUTOR_CREDIT_UPDATED'
  | 'DISTRIBUTOR_TERMS_CHANGED'
  | 'RETAILER_ONBOARDED'
  | 'RETAILER_TERMS_CHANGED'
  // Sales Orders
  | 'SALES_ORDER_PLACED'
  | 'SALES_ORDER_APPROVED'
  | 'SALES_ORDER_RESERVED'
  | 'SALES_ORDER_DISPATCHED'
  | 'SALES_ORDER_CANCELLED'
  | 'SALES_RETURN_PROCESSED'
  // Finance & Subledger
  | 'INVOICE_GENERATED'
  | 'INVOICE_POSTED'
  | 'INVOICE_CANCELLED'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_ALLOCATED'
  | 'PAYMENT_REVERSED'
  | 'CREDIT_NOTE_ISSUED'
  | 'DEBIT_NOTE_ISSUED'
  | 'CREDIT_LIMIT_CHANGED'
  // Field Sales
  | 'BEAT_ASSIGNED'
  | 'VISIT_CHECKED_IN'
  | 'VISIT_CHECKED_OUT'
  | 'FIELD_ORDER_COLLECTED'
  // People & Staff
  | 'EMPLOYEE_ONBOARDED'
  | 'EMPLOYEE_STATUS_CHANGED'
  | 'LEAVE_APPLIED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'ATTENDANCE_CORRECTED'
  | 'PERFORMANCE_RATED'
  // Notifications
  | 'NOTIFICATION_TEMPLATE_UPDATED'
  | 'NOTIFICATION_RULE_CONFIGURED'
  // System & Administration
  | 'AUDIT_RETENTION_UPDATED'
  | 'AUDIT_INTEGRITY_VERIFIED'
  | 'AUDIT_EXPORT_GENERATED'
  | 'SYSTEM_CONFIGURATION_CHANGED'
  | 'SECURITY_POLICY_CHANGED';

export interface ChangedField {
  key: string;
  label: string;
  old_value: unknown;
  new_value: unknown;
}

export interface CanonicalAuditRecord {
  id: string;
  organization_id: string;
  actor_user_id: string;
  actor_id?: string;
  user_id?: string;
  actor_name: string;
  actor_email: string;
  actor_type: ActorType;
  action: AuditActionType | string;
  event_type: AuditEventType | string;
  module: AuditModule;
  entity_type: string;
  target_resource?: string;
  entity_id: string;
  target_id?: string;
  entity_name?: string;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  changed_fields?: ChangedField[] | null;
  metadata?: Record<string, unknown>;
  details?: Record<string, unknown>;
  request_id?: string;
  correlation_id?: string;
  source: AuditSource;
  ip_address?: string;
  user_agent?: string;
  status: AuditStatus;
  failure_reason?: string;
  previous_hash?: string;
  record_hash?: string;
  created_at: string;
}

export interface AuditLogFilter {
  organizationId?: string;
  actorId?: string;
  actorEmail?: string;
  action?: string;
  eventType?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  status?: string;
  source?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogMetrics {
  totalLogs: number;
  todayLogs: number;
  successCount: number;
  failedCount: number;
  activeActorsCount: number;
  moduleCounts: Record<string, number>;
  actionCounts: Record<string, number>;
  statusCounts: { success: number; failed: number };
  recentFailedEvents: CanonicalAuditRecord[];
}

export interface AuditIntegrityReport {
  verified: boolean;
  totalRecordsScanned: number;
  validHashCount: number;
  brokenHashCount: number;
  anomalies: string[];
  verifiedAt: string;
  organizationId: string;
  latestHash?: string;
  genesisHash?: string;
  verificationDurationMs: number;
}

export interface AuditRetentionPolicy {
  id?: string;
  organization_id: string;
  retention_period_days: number;
  auto_archive_enabled: boolean;
  legal_hold_enabled: boolean;
  tamper_detection_enabled: boolean;
  notify_on_security_event: boolean;
  notify_on_integrity_breach: boolean;
  updated_by?: string;
  updated_at?: string;
  created_at?: string;
}

export interface CreateAuditLogParams {
  organizationId: string;
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  actorType?: ActorType;
  action: AuditActionType | string;
  eventType: AuditEventType | string;
  module: AuditModule;
  entityType: string;
  entityId: string;
  entityName?: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  requestId?: string;
  correlationId?: string;
  source?: AuditSource;
  ipAddress?: string;
  userAgent?: string;
  status?: AuditStatus;
  failureReason?: string;
}
