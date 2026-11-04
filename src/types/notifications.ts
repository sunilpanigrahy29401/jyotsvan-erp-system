// src/types/notifications.ts
// Enterprise Central Notification Engine Types (Phase 22)

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationCategory =
  | 'system'
  | 'business'
  | 'sales'
  | 'finance'
  | 'inventory'
  | 'procurement'
  | 'manufacturing'
  | 'quality'
  | 'warehouse'
  | 'distribution'
  | 'field_sales'
  | 'people'
  | 'marketing'
  | 'commerce'
  | 'security'
  | 'ai';

export type NotificationActionType = 'navigate' | 'review' | 'approve_reject' | 'dismiss' | 'none';

export type NotificationActionStatus = 'pending' | 'completed' | 'expired' | 'dismissed';

export type NotificationDeliveryStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'failed';

export type NotificationFilterState = 'all' | 'unread' | 'read' | 'archived' | 'important';

export type NotificationType =
  // Procurement
  | 'PURCHASE_REQUEST_PENDING_APPROVAL'
  | 'PURCHASE_ORDER_APPROVED'
  | 'PURCHASE_ORDER_REJECTED'
  | 'GRN_PENDING_QC'
  // Quality Control
  | 'QC_INSPECTION_PENDING'
  | 'QC_APPROVED'
  | 'QC_REJECTED'
  | 'QC_QUARANTINE'
  // Manufacturing / Production
  | 'PRODUCTION_ORDER_PENDING'
  | 'MATERIAL_SHORTAGE'
  | 'PRODUCTION_COMPLETED'
  | 'PRODUCTION_QC_PENDING'
  // Warehouse & Inventory
  | 'TRANSFER_PENDING_APPROVAL'
  | 'TRANSFER_DISPATCHED'
  | 'TRANSFER_RECEIVED'
  | 'STOCK_VARIANCE'
  | 'LOW_STOCK'
  | 'BATCH_EXPIRY_WARNING'
  // Sales Orders & Commercial
  | 'SALES_ORDER_PENDING_APPROVAL'
  | 'SALES_ORDER_APPROVED'
  | 'SALES_ORDER_BACKORDERED'
  | 'SALES_ORDER_READY_TO_DISPATCH'
  | 'SALES_ORDER_DISPATCHED'
  // Finance & Accounting
  | 'INVOICE_POSTED'
  | 'PAYMENT_RECEIVED'
  | 'INVOICE_OVERDUE'
  | 'CREDIT_LIMIT_EXCEEDED'
  | 'COLLECTION_FOLLOWUP_DUE'
  | 'EXPENSE_PENDING_APPROVAL'
  | 'EXPENSE_APPROVED'
  // Field Sales
  | 'VISIT_ASSIGNED'
  | 'VISIT_DUE'
  | 'VISIT_MISSED'
  | 'FOLLOWUP_DUE'
  | 'FIELD_TASK_ASSIGNED'
  // People & Staff
  | 'LEAVE_REQUESTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'ATTENDANCE_CORRECTION_REQUESTED'
  | 'TASK_ASSIGNED'
  | 'TASK_OVERDUE'
  | 'PERFORMANCE_REVIEW_DUE'
  // System & Security
  | 'SECURITY_NEW_LOGIN'
  | 'SECURITY_ROLE_CHANGED'
  | 'SYSTEM_MAINTENANCE'
  | 'SYSTEM_BACKUP_COMPLETED'
  | 'INTEGRATION_WEBHOOK_FAILED';

export interface NotificationEntity {
  id: string;
  organization_id: string;
  recipient_user_id: string;
  recipient_name?: string;
  recipient_email?: string;
  notification_type: NotificationType | string;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
  action_type?: NotificationActionType;
  action_payload?: Record<string, any>;
  action_status?: NotificationActionStatus;
  metadata?: Record<string, any>;
  idempotency_key?: string;
  read_at?: string | null;
  archived_at?: string | null;
  delivery_status: NotificationDeliveryStatus;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  organization_id: string;
  user_id: string;
  notification_type: NotificationType | string;
  category: NotificationCategory;
  in_app_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  min_priority: NotificationPriority;
  created_at: string;
  updated_at: string;
}

export interface NotificationCategoryPreference {
  id: string;
  organization_id: string;
  user_id: string;
  category: NotificationCategory;
  in_app_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessEvent {
  organizationId: string;
  eventType: NotificationType | string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
  actorName?: string;
  targetUserId?: string;
  targetEmployeeId?: string;
  targetRoleSlug?: string;
  targetDepartmentId?: string;
  title?: string;
  message?: string;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  actionUrl?: string;
  actionType?: NotificationActionType;
  actionPayload?: Record<string, any>;
  payload?: Record<string, any>;
  idempotencyKey?: string;
}

export interface NotificationOutboxItem {
  id: string;
  organization_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_user_id?: string;
  payload: Record<string, any>;
  idempotency_key?: string;
  status: 'pending' | 'processed' | 'failed';
  retry_count: number;
  error_message?: string;
  processed_at?: string;
  created_at: string;
}

export interface NotificationTemplate {
  notificationType: NotificationType | string;
  category: NotificationCategory;
  defaultPriority: NotificationPriority;
  titleTemplate: string;
  messageTemplate: string;
  defaultActionType: NotificationActionType;
  actionUrlPattern?: string;
  isNonDisableable?: boolean;
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  category?: NotificationCategory | 'all';
  priority?: NotificationPriority | 'all';
  status?: 'all' | 'unread' | 'read' | 'archived' | 'important';
  search?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export interface NotificationMetrics {
  totalCount: number;
  unreadCount: number;
  criticalCount: number;
  highCount: number;
  archivedCount: number;
  categoryCounts: Record<NotificationCategory, number>;
}
