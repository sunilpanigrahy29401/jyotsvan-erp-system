# Graph Report - jyotsvan-erp-system  (2026-11-04)

## Corpus Check
- Large corpus: 602 files · ~737,683 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3739 nodes · 11724 edges · 124 communities (110 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 175 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123

## God Nodes (most connected - your core abstractions)
1. `react` - 374 edges
2. `lucide-react` - 351 edges
3. `cn()` - 92 edges
4. `pool` - 87 edges
5. `Button` - 79 edges
6. `useAuth()` - 79 edges
7. `DatabaseService` - 79 edges
8. `useToast()` - 77 edges
9. `AuthUser` - 68 edges
10. `Badge()` - 60 edges

## Surprising Connections (you probably didn't know these)
- `Planned phases 6-13 (procurement through AI)` --semantically_similar_to--> `Module directory to planned phase mapping`  [AMBIGUOUS] [semantically similar]
  docs/PROJECT_SPEC.md → src/modules/README.md
- `Planned permissions by phase` --semantically_similar_to--> `Phased roadmap (Phases 1-13)`  [AMBIGUOUS] [semantically similar]
  docs/PERMISSIONS.md → docs/PROJECT_SPEC.md
- `audit_logs (Immutable Compliance Trail)` --semantically_similar_to--> `audit_logs table`  [AMBIGUOUS] [semantically similar]
  docs/JYOTSVAN_DATABASE_SCHEMA_REPORT.md → docs/DATABASE_SCHEMA.md
- `SEC-03 Unauthenticated SQL proxy /api/db/query (HIGH)` --semantically_similar_to--> `Express API gateway (server.ts)`  [AMBIGUOUS] [semantically similar]
  docs/JYOTSVAN_SECURITY_AUDIT.md → docs/JYOTSVAN_TECH_STACK_REPORT.md
- `runAllMigrations()` --indirect_call--> `runMetaAdsMigration()`  [INFERRED]
  server.ts → src/server/migrate-meta-ads.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pre-production critical security gaps** — docs_jyotsvan_complete_project_audit_sec01, docs_jyotsvan_complete_project_audit_sec02, docs_jyotsvan_complete_project_audit_sec03, docs_jyotsvan_complete_project_audit_sec04 [EXTRACTED 1.00]
- **Marketplace connectors implementing IntegrationProviderAdapter** — docs_jyotsvan_integration_status_amazon, docs_jyotsvan_integration_status_flipkart, docs_jyotsvan_integration_status_myntra, docs_jyotsvan_integration_status_shopify, docs_jyotsvan_integration_status_adapter_registry [EXTRACTED 1.00]
- **Cryptographic audit trail system** — docs_architecture_audit_service, docs_database_schema_audit_logs, docs_database_schema_audit_retention_policies, docs_architecture_hash_chain [INFERRED 0.85]
- **Critical and high severity security findings** — docs_jyotsvan_security_audit_sec01_rls_disabled, docs_jyotsvan_security_audit_sec02_passwordless_login, docs_jyotsvan_security_audit_sec03_sql_proxy, docs_jyotsvan_security_audit_sec04_hardcoded_headers [INFERRED 0.85]
- **Marketplace hubs sharing adapter pattern** — docs_jyotsvan_complete_project_audit_mod_myntra, docs_jyotsvan_complete_project_audit_mod_flipkart, docs_jyotsvan_complete_project_audit_mod_amazon, docs_jyotsvan_complete_project_audit_mod_shopify, docs_jyotsvan_complete_project_audit_adapter_pattern [INFERRED 0.85]
- **VPS deployment stack artifacts** — docs_jyotsvan_vps_deployment_readiness_architecture, docs_jyotsvan_vps_deployment_readiness_docker_spec, docs_jyotsvan_vps_deployment_readiness_nginx_config, docs_jyotsvan_vps_deployment_readiness_db_migration [INFERRED 0.85]

## Communities (124 total, 14 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (50): DbStatus, ENV, EnvConfig, AuthContextType, INITIAL_AUDIT_LOGS, INITIAL_BRANCHES, INITIAL_BUSINESS_SETTINGS, INITIAL_DEFAULT_USER (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (98): CHART_CHANNEL_SHARE, CHART_MONTHLY_REVENUE, DesignSystemPage(), SAMPLE_FILES, SAMPLE_TABLE_DATA, SAMPLE_TIMELINE, SampleRecord, ActivityTimeline() (+90 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (72): AdGroupDetailDrawer(), AdGroupDetailDrawerProps, AdGroupsTab(), AdGroupsTabProps, CampaignDetailDrawer(), CampaignDetailDrawerProps, CampaignsTab(), CampaignsTabProps (+64 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (51): app, runAllMigrations(), startServer(), batchRouter, initDatabaseSchema(), pool, query(), fieldSalesRouter (+43 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (46): CreateGoodsReceiptModal(), CreateGoodsReceiptModalProps, GrnItemInput, CreatePurchaseOrderModal(), CreatePurchaseOrderModalProps, PoItemRow, SkuOption, SupplierOption (+38 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (50): CheckInModal(), CheckInModalProps, CheckOutModalProps, CollectionModal(), CollectionModalProps, CreateRouteModal(), CreateRouteModalProps, RouteStopDraft (+42 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (47): IntegrityReconciliationTab(), InventoryPage(), InventoryPageProps, TabKey, MovementLedgerTab(), OpeningBalanceModal(), OpeningBalanceModalProps, Sku360ProfileTab() (+39 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (33): CATEGORY_MAP, NotificationCenterPage(), NotificationCenterPageProps, CATEGORY_ICONS, NotificationBellDropdown(), NotificationBellDropdownProps, CATEGORY_DEFINITIONS, NotificationPreferencesModal() (+25 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (42): BatchDetailDrawer(), BatchDetailDrawerProps, BatchExpiryTab(), BatchExpiryTabProps, BatchHoldsTab(), BatchHoldsTabProps, BatchModule(), BatchModuleTab (+34 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (38): MaterialAvailabilityModal(), MaterialAvailabilityModalProps, MaterialIssueModal(), MaterialIssueModalProps, MaterialReturnModal(), MaterialReturnModalProps, ProductionOrderCreateModal(), ProductionOrderCreateModalProps (+30 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (38): CreateInspectionModal(), CreateInspectionModalProps, CreateParameterModal(), CreateParameterModalProps, CreateTemplateModal(), CreateTemplateModalProps, InspectionDetailDrawer(), InspectionDetailDrawerProps (+30 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (43): CommercialPricingEngineView(), CreateReturnModal(), CreateSalesOrderModal(), CreateSalesOrderModalProps, CustomerOption, SkuOption, WarehouseOption, DispatchOrderModal() (+35 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (35): AccountsAndContacts(), ActivitiesAndEngagement(), ActivitiesAndEngagementProps, CrmOverview(), CrmOverviewProps, DealsPipeline(), DealsPipelineProps, LeadCaptureIntegrations() (+27 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (35): lucide-react, react, AccessDeniedPageProps, EntityAuditHistory(), EntityAuditHistoryProps, BadgeProps, BulkActionBarProps, ButtonProps (+27 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (44): AmazonCapabilitiesCard(), CapabilityItem, AmazonConfigModal(), AmazonConfigModalProps, AmazonHeader(), AmazonHeaderProps, AmazonInventoryTab(), AmazonInventoryTabProps (+36 more)

### Community 15 - "Community 15"
Cohesion: 0.21
Nodes (41): AccessDeniedPage(), ShopifyCommercePage(), ShopifyConfigModal(), ModulePlaceholder(), AuditLogsSettings(), BRANCH_TYPE_BADGES, BRANCH_TYPE_LABELS, BranchesSettings() (+33 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (30): BatchScalingWorkbench(), Props, FormulationDetailDrawer(), Props, FormulationEditorModal(), Props, SkuOption, FormulationListTable() (+22 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (17): CreateReturnModalProps, DispatchOrderModalProps, CreditService, PricingService, salesOrderRouter, salesReturnRouter, recordAudit(), SalesOrderService (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (39): recharts, AdDetailDrawer(), AdDetailDrawerProps, AdSetDetailDrawer(), AdSetDetailDrawerProps, AdSetsTab(), AdSetsTabProps, AdsTab() (+31 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (37): MetaSyncAttentionBanner(), MetaSyncAttentionBannerProps, SyncHealthTab(), SyncHealthTabProps, MetaConfigModal(), MetaConfigModalProps, MetaSyncModal(), MetaSyncModalProps (+29 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (21): ShopifyClient, ShopifyService, UserProfile, IntegrationEntityMapping, ShopifyCustomer, ShopifyCustomerAddress, ShopifyDiscountCode, ShopifyImage (+13 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (20): AiActionsService, auditRouter, AuditService, computeFieldDiff(), formatFieldLabel(), sanitizeSensitiveData(), SENSITIVE_KEY_PATTERNS, ActorType (+12 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (23): @google/genai@^2.4.0, @google/genai, AiAlertsPage(), AiCopilotPage(), Message, AiInsightsPage(), AiRecommendationsPage(), AiPage() (+15 more)

### Community 23 - "Community 23"
Cohesion: 0.06
Nodes (23): RFC-1918, express, ProviderCatalogProps, amazonRouter, crmRouter, decryptCredentials(), DERIVED_KEY, encryptCredentials() (+15 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (36): SupplierAddressModal(), SupplierAddressModalProps, SupplierContactModal(), SupplierContactModalProps, SupplierDetailsPage(), SupplierDetailsPageProps, SupplierDocumentModal(), SupplierDocumentModalProps (+28 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (28): AddRetailerFollowupModal(), AddRetailerFollowupModalProps, CreateRetailerModal(), CreateRetailerModalProps, CreateRetailerOrderModal(), CreateRetailerOrderModalProps, CreateRetailerReturnModal(), CreateRetailerReturnModalProps (+20 more)

### Community 26 - "Community 26"
Cohesion: 0.08
Nodes (42): Database & Business Logic Audit (ACID, Tenant Isolation), Master Technical Audit & Development Status Report, Express API Gateway (server.ts), InsForge Backend Infrastructure Audit Section, InsForge Managed PostgreSQL 17.4 (131 tables), Project Overview (Jyotsvan Ayurvedic Enterprises), Performance, Scalability & Code Quality, React 19 SPA Frontend (+34 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (27): FlipkartCapabilitiesCard(), FlipkartConfigModal(), FlipkartConfigModalProps, FlipkartHeader(), FlipkartHeaderProps, FlipkartInventoryTab(), FlipkartListingsTab(), FlipkartMappingTab() (+19 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (16): MappingFormModalProps, MarketplaceMappingsTabProps, ProductDetailsModalProps, SkuDirectoryTabProps, SkuFormModalProps, ProductService, DocumentType, ExternalPlatform (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (10): PeopleService, AttendanceCorrection, AttendanceRecord, EmployeeDocument, EmployeeTarget, LeaveRequest, LeaveType, PeopleDashboardMetrics (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.07
Nodes (40): AI Controlled Actions Module, ai_actions table (human-in-the-loop), ai_insights table, ai_recommendations table, Enterprise AI Intelligence & Governance Schema, batch_genealogy table, batches table, categories table (+32 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (39): GET /api/auth/profile, Authentication & RBAC Bridge, Phase 1 Authentication & Session Access Workflow, Business Workflows Specification, E-Way Bill & E-Invoicing, Marketing Attribution & Ad Spend Optimization Workflow, Order-to-Cash (O2C) Workflow, Omni-Channel Marketplace Sync Workflow (+31 more)

### Community 32 - "Community 32"
Cohesion: 0.08
Nodes (15): HrmsPayrollService, peopleRouter, ApprovedPayrollRunHandoff, EmployeeExit, EmployeeSalaryAssignment, HolidayCalendar, HRAnnouncement, HRRequest (+7 more)

### Community 33 - "Community 33"
Cohesion: 0.08
Nodes (8): RetailerDetailDrawerProps, RetailerService, RetailerAddress, RetailerAssortment, RetailerCommercialTerms, RetailerContact, RetailerDistributorMapping, RetailerSalespersonAssignment

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (28): AppShell(), AppShellProps, Breadcrumb(), BreadcrumbProps, GlobalSearchModal(), GlobalSearchModalProps, Header(), HeaderProps (+20 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (14): MyntraApiClient, MyntraService, MarketplaceEntityMapping, MarketplaceOrderItem, MyntraApiConfig, MyntraAuthCredentials, MyntraCapabilityManifest, MyntraFulfillmentModel (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.16
Nodes (11): validateSafeUrl(), HealthCheckResult, IntegrationProviderAdapter, SyncOptions, SyncResult, AdapterRegistry, CustomRestApiAdapter, META_ADS_PROVIDER (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (22): DistributionPage(), DistributionPageProps, CreateDistributorModal(), CreateDistributorModalProps, CreateDistributorTransferModal(), CreateDistributorTransferModalProps, DistributorDetailDrawer(), DistributorDetailDrawerProps (+14 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (23): ConnectionConfigModal(), ConnectionsList(), IntegrationLogsConsole(), IntegrationLogsConsoleProps, IntegrationsOverview(), IntegrationsOverviewProps, ProviderCatalog(), ProviderIcon() (+15 more)

### Community 39 - "Community 39"
Cohesion: 0.09
Nodes (23): FinanceOverviewProps, InvoiceDetailModalProps, CollectionActivityLog, CollectionPriority, CollectionStatus, CreditNoteItem, CreditNoteStatus, CustomerAgeingSummary (+15 more)

### Community 40 - "Community 40"
Cohesion: 0.11
Nodes (14): RetailerDashboardViewProps, RetailerFollowupsViewProps, RetailerActivityService, FollowupPriority, FollowupStatus, RetailerAddressType, RetailerContactDesignation, RetailerDocument (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (6): AmazonService, AmazonClientConfig, AmazonSpApiClient, AmazonSpApiError, AmazonMarketplaceParticipation, AmazonRegion

### Community 42 - "Community 42"
Cohesion: 0.16
Nodes (3): MetaClient, MetaService, MetaAdAccount

### Community 43 - "Community 43"
Cohesion: 0.11
Nodes (10): ShopifyConfigModalProps, ConnectionConfigModalProps, ConnectionsListProps, RestConsolePlaygroundProps, maskSecret(), sanitizeConfiguration(), IntegrationService, CreateConnectionParams (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.17
Nodes (18): MyntraCatalogTab(), MyntraConfigModal(), MyntraConfigModalProps, MyntraHeader(), MyntraHeaderProps, MyntraInventoryTab(), MyntraMappingTab(), MyntraMarketplacePage() (+10 more)

### Community 45 - "Community 45"
Cohesion: 0.12
Nodes (9): DistributorListView(), DistributorListViewProps, DistributorService, DistributorAssortment, DistributorCommercialTerms, DistributorMaster, DistributorStatus, DistributorType (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.11
Nodes (22): OperationsPage(), OperationsPageProps, CreateWarehouseModal(), CreateWarehouseModalProps, WAREHOUSE_TYPES, TransferDetailDrawer(), TransferDetailDrawerProps, TransferListTable() (+14 more)

### Community 47 - "Community 47"
Cohesion: 0.09
Nodes (29): /command-center Placeholder, Command Center / Hero Dashboard, Dashboard Specification, No Fake Charts or Mock KPIs Policy, Warehouse & Inventory Dashboard, Chart System (Recharts), Color Tokens & Theme (Slate/Navy palette), Standard Component Catalog (+21 more)

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (21): CategoryFormModal(), CategoryFormModalProps, CategoryTaxonomyTab(), CategoryTaxonomyTabProps, MappingFormModal(), MarketplaceMappingsTab(), ProductCatalogTab(), ProductCatalogTabProps (+13 more)

### Community 50 - "Community 50"
Cohesion: 0.11
Nodes (25): devDependencies, autoprefixer@^10.4.21, esbuild@^0.25.0, tailwindcss@^4.1.14, tsx@^4.21.0, @types/express@^4.17.21, @types/node@^22.14.0, @types/pg@^8.23.1 (+17 more)

### Community 51 - "Community 51"
Cohesion: 0.13
Nodes (18): AgeingAndLedgerView(), AllocatePaymentModal(), CollectionsView(), CreateCreditDebitNoteModal(), CreateExpenseModal(), CreateInvoiceModal(), CreditDebitNotesView(), CreditDebitNotesViewProps (+10 more)

### Community 52 - "Community 52"
Cohesion: 0.16
Nodes (25): Phase 23 Audit Logging & Cryptographic Compliance Workflow, Key Compliance Rules (Append-Only, Hash Chain, Legal Hold), Legal Hold Enforcement, audit_logs table, audit_retention_policies table, branches table, business_settings table, Architectural Conventions (IDs, Tenant, Audit Columns, Status) (+17 more)

### Community 53 - "Community 53"
Cohesion: 0.34
Nodes (12): OverviewTabProps, MetaAnalyticsService, MetaAnalyticsFilter, MetaExecutiveOverviewData, buildKPICard(), calcCPA(), calcCPC(), calcCPM() (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (21): OnboardEmployeeModalProps, AttendanceSource, AttendanceStatus, CalculationMethod, ComponentClassification, CorrectionStatus, Designation, DocumentType (+13 more)

### Community 55 - "Community 55"
Cohesion: 0.19
Nodes (6): LocationTreeViewerProps, recordAudit(), WarehouseService, StockCountSession, WarehouseLocationHierarchy, WarehouseTransfer

### Community 56 - "Community 56"
Cohesion: 0.16
Nodes (5): ProviderAdapterContext, AmazonConnector, FlipkartConnector, MetaAdsAdapter, MyntraConnector

### Community 57 - "Community 57"
Cohesion: 0.11
Nodes (24): Branch Scoping (branch_id), Directory Layout Blueprint, Architectural Specification, InsForge Integration Model, Layered Separation of Concerns, Modular Monolith Architecture, No Secrets in Client Bundles, Object Storage Buckets (+16 more)

### Community 58 - "Community 58"
Cohesion: 0.18
Nodes (15): CFDashboardView(), CFDetailDrawer(), CFDiscrepanciesView(), CFDiscrepanciesViewProps, CFDispatchesView(), CFInventoryView(), CFListView(), CFModule() (+7 more)

### Community 59 - "Community 59"
Cohesion: 0.12
Nodes (3): DistributorApiService, DistributorAddress, DistributorContact

### Community 60 - "Community 60"
Cohesion: 0.11
Nodes (23): Certificate of Analysis (COA), Plan-to-Produce (Manufacturing & QC) Workflow, Manufacturing & Production Dashboard, Batch Traceability Module, C&F Depot Network Module, Distributor Network Module, Field Sales Execution Module, Finance & Invoicing Module (+15 more)

### Community 61 - "Community 61"
Cohesion: 0.19
Nodes (10): AgeingAndLedgerViewProps, CollectionsViewProps, CreateCreditDebitNoteModalProps, LineItemInput, CustomerLedgerModalProps, LogCollectionActivityModalProps, financeApi, CollectionTask (+2 more)

### Community 62 - "Community 62"
Cohesion: 0.14
Nodes (16): DesignationsModal(), handleCreate(), loadDesignations(), DesignationsModalProps, Employee360Modal(), handleDeleteDoc(), handleSaveEdit(), handleUploadDoc() (+8 more)

### Community 63 - "Community 63"
Cohesion: 0.20
Nodes (22): audit_logs, branches, business_settings, departments, idx_audit_logs_created_at, idx_audit_logs_org_id, idx_branches_org_id, idx_departments_org_id (+14 more)

### Community 64 - "Community 64"
Cohesion: 0.13
Nodes (20): AttendanceManagement(), handlePunch(), handleReviewDecision(), handleSubmitCorrection(), loadData(), LeaveManagement(), handleApply(), handleReviewDecision() (+12 more)

### Community 65 - "Community 65"
Cohesion: 0.12
Nodes (13): DistributorOrdersView(), DistributorOrdersViewProps, DistributorAddressType, DistributorContactRole, DistributorDiscrepancyType, DistributorDocument, DistributorOrder, DistributorOrderItem (+5 more)

### Community 66 - "Community 66"
Cohesion: 0.20
Nodes (6): CreateInvoiceModalProps, InvoiceListViewProps, FinanceService, CreditNote, DebitNote, Invoice

### Community 67 - "Community 67"
Cohesion: 0.16
Nodes (17): cfRouter, cfDispatchService, cfInventoryService, cfMetricsService, cfsService, cfTransferService, CFAddress, CFContact (+9 more)

### Community 68 - "Community 68"
Cohesion: 0.12
Nodes (20): POST /api/db/init, POST /api/db/query, GET /api/db/status, GET /api/health, GET /api/insforge/health, Server Endpoints & API Surface, Phase 23 Enterprise Audit Engine, audit_logs table (+12 more)

### Community 69 - "Community 69"
Cohesion: 0.17
Nodes (13): App(), MainRouter(), CommandCenterPage(), CommandCenterPageProps, FinancePage(), FinancePageProps, MetaMarketingPage(), MarketingPage() (+5 more)

### Community 70 - "Community 70"
Cohesion: 0.14
Nodes (11): BusinessAnalyticsPage(), BusinessAnalyticsPageProps, BusinessOverviewPage(), BusinessOverviewPageProps, BusinessReportsPage(), BusinessReportsPageProps, BusinessPage(), BusinessPageProps (+3 more)

### Community 71 - "Community 71"
Cohesion: 0.19
Nodes (6): RetailerOrderService, RetailerOrderRequest, RetailerOrderStatus, RetailerReturn, RetailerReturnReason, RetailerReturnStatus

### Community 72 - "Community 72"
Cohesion: 0.15
Nodes (19): /ai Placeholder Route, MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API, Jyotsvan Enterprise Copilot, AI Architecture Specification, Google Gemini via @google/genai SDK, Marketing Ad Copy & Performance Diagnostics, Phase 1 No Active AI Execution, Predictive Inventory & Formulation Recommendations (+11 more)

### Community 73 - "Community 73"
Cohesion: 0.11
Nodes (19): dependencies, dotenv@^17.2.3, express@^4.21.2, @insforge/sdk@^1.5.2, lucide-react@^0.546.0, motion@^12.23.24, pg@^8.23.0, pg-mem@^3.0.14 (+11 more)

### Community 74 - "Community 74"
Cohesion: 0.28
Nodes (7): Employee360ModalProps, PeoplePageProps, PeopleAPI, Employee, Employee360View, LeaveBalance, Payslip

### Community 75 - "Community 75"
Cohesion: 0.15
Nodes (11): COUNT_TYPES, CreateCountModal(), CreateCountModalProps, CreateTransferModal(), CreateTransferModalProps, TransferItemRow, DockStagingConsole(), DockStagingConsoleProps (+3 more)

### Community 76 - "Community 76"
Cohesion: 0.11
Nodes (17): AuthType, ConfigFieldOption, ConfigFieldType, ConnectionHealthStatus, ConnectionStatus, EventDirection, EventProcessingStatus, IntegrationCategory (+9 more)

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (7): CFTransfersView(), CFTransfersViewProps, ReceiveTransferModal(), ReceiveTransferModalProps, CFSTransferService, CFTransfer, CFTransferStatus

### Community 79 - "Community 79"
Cohesion: 0.17
Nodes (13): CountEntryWorksheetDrawer(), CountEntryWorksheetDrawerProps, CountSessionListTable(), CountSessionListTableProps, CountSessionStatus, CountType, LocationType, StockCountItem (+5 more)

### Community 80 - "Community 80"
Cohesion: 0.17
Nodes (8): FlipkartApiClient, FlipkartApiConfig, FlipkartAuthCredentials, FlipkartDispatchShipmentRequest, FlipkartInventoryResponse, FlipkartListingItem, FlipkartOrderSearchResponse, FlipkartTokenResponse

### Community 81 - "Community 81"
Cohesion: 0.15
Nodes (17): Module and Feature Inventory, Batch, Lot and Traceability module, Command Center module, Distribution and C&F Depot Network module, Field Sales Execution module, Finance, Invoicing and Subledger module, Formulation and BOM module, Inventory and Warehouse Management module (+9 more)

### Community 82 - "Community 82"
Cohesion: 0.15
Nodes (12): http, migrateAndSeed(), runSql(), http, migrate(), runSql(), http, runSql() (+4 more)

### Community 83 - "Community 83"
Cohesion: 0.20
Nodes (6): CFDetailDrawerProps, CFListViewProps, CreateCFModalProps, CreateTransferModalProps, CFSService, CFMaster

### Community 85 - "Community 85"
Cohesion: 0.16
Nodes (8): RetailerInventoryService, retActService, retailerRouter, retInvService, retOrdService, retService, RetailerReceivingRecord, RetailerStockItem

### Community 86 - "Community 86"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+7 more)

### Community 87 - "Community 87"
Cohesion: 0.21
Nodes (11): CreateLocationModal(), CreateLocationModalProps, LOCATION_TYPES, getLocationTypeIcon(), LocationTreeViewer(), TreeNode(), WarehouseDrawer(), WarehouseDrawerProps (+3 more)

### Community 90 - "Community 90"
Cohesion: 0.18
Nodes (12): Google Gemini AI integration (gemini-3.8-flash), Enterprise AI Hub module, Technology Stack Audit Report, Express API gateway (server.ts), Custom History Router (no react-router), Environment variables, Frontend stack (React 19, Vite, Tailwind 4, recharts), Modular monolith architecture (+4 more)

### Community 91 - "Community 91"
Cohesion: 0.26
Nodes (4): CFDispatchesViewProps, CFSDispatchService, CFDispatch, CFDispatchStatus

### Community 92 - "Community 92"
Cohesion: 0.23
Nodes (6): AllocatePaymentModalProps, AllocationDraft, PaymentListViewProps, AllocationDraft, RecordPaymentModalProps, Payment

### Community 93 - "Community 93"
Cohesion: 0.24
Nodes (5): CreateExpenseModalProps, ExpenseListViewProps, Expense, ExpenseCategory, ExpenseStatus

### Community 94 - "Community 94"
Cohesion: 0.20
Nodes (11): InsForge Managed PostgreSQL (131 tables), Security Audit Report, SEC-01 Row Level Security disabled (CRITICAL), SEC-02 Passwordless login bypass (CRITICAL), SEC-03 Unauthenticated SQL proxy /api/db/query (HIGH), SEC-05 Unencrypted data in localStorage (MEDIUM), SEC-06 PostgreSQL SSL verification disabled (MEDIUM), SEC-08 AES-256-GCM crypto vault (INFORMATIONAL, positive) (+3 more)

### Community 95 - "Community 95"
Cohesion: 0.27
Nodes (7): ModulePlaceholderProps, NotFoundPage(), NotFoundPageProps, PageContainer(), PageContainerProps, PageHeader(), PageHeaderProps

### Community 96 - "Community 96"
Cohesion: 0.29
Nodes (10): Integrations Status Audit, IntegrationProviderAdapter and AdapterRegistry pattern, Amazon SP-API, Flipkart Seller API Hub, Meta Ads and Google Ads (simulated telemetry), Myntra Partner Bridge (PPMP), Not implemented integrations (WhatsApp, payment gateways, shipping, GSTN e-invoicing), Shopify D2C Adapter (+2 more)

### Community 97 - "Community 97"
Cohesion: 0.22
Nodes (10): Project Specification, Jyotsvan executive overview (unified business operating system), Phase 1 Project Foundation, Phase 2 Application Shell and Navigation, Phase 5 Reusable Business UI and Design System, Phased roadmap (Phases 1-13), Planned phases 6-13 (procurement through AI), QA and Verification Checklist (+2 more)

### Community 98 - "Community 98"
Cohesion: 0.27
Nodes (6): MarketplacesHubPage(), MarketplacesHubPageProps, CommercePage(), CommercePageProps, MarketplaceHubOverview, MarketplaceHubService

### Community 99 - "Community 99"
Cohesion: 0.44
Nodes (4): recordAudit(), SalesReturnService, SalesReturn, SalesReturnItem

### Community 100 - "Community 100"
Cohesion: 0.22
Nodes (7): @tailwindcss/vite@^4.1.14, vite@^6.2.3, @vitejs/plugin-react@^5.0.4, vite@^6.2.3, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 101 - "Community 101"
Cohesion: 0.28
Nodes (4): AnalyticsEngineService, CANONICAL_METRICS, CanonicalMetricDefinition, analyticsRouter

### Community 102 - "Community 102"
Cohesion: 0.25
Nodes (5): DistributorInventoryService, distInvService, distributorRouter, distService, distTrfService

### Community 103 - "Community 103"
Cohesion: 0.25
Nodes (8): Settings and Security Governance module, SEC-04 Hardcoded identity headers in client APIs (HIGH), Permissions and RBAC Matrix, Baseline roles (super_admin, org_admin, operations_manager, sales_director, finance_controller, operator), Permission code standard module:resource:action, Planned permissions by phase, RBAC architecture (users, roles, permissions), Phase 23 verification: Immutable Audit Logs

### Community 104 - "Community 104"
Cohesion: 0.29
Nodes (3): CFInventoryViewProps, CFSInventoryService, CFStockItem

### Community 105 - "Community 105"
Cohesion: 0.38
Nodes (7): SEC-07 Permissive CORS and 10mb body limit (LOW), Build pipeline and package scripts, VPS Deployment Readiness Audit, Recommended VPS architecture (Nginx, Node, self-hosted InsForge, Postgres), VPS readiness checklist, Docker and docker-compose specification, Nginx reverse proxy configuration

### Community 106 - "Community 106"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, start

### Community 107 - "Community 107"
Cohesion: 0.33
Nodes (3): DistributorReturnsView(), DistributorReturnsViewProps, DistributorReturn

### Community 108 - "Community 108"
Cohesion: 0.40
Nodes (3): CFDashboardViewProps, CFSMetricsService, CFSummaryMetrics

### Community 109 - "Community 109"
Cohesion: 0.40
Nodes (3): DistributorDashboardView(), DistributorDashboardViewProps, DistributorSummaryMetrics

### Community 110 - "Community 110"
Cohesion: 0.53
Nodes (5): MetaAdsHeader(), MetaAdsHeaderProps, MetaComparePeriod, MetaDateRangePreset, getCurrencySymbol()

### Community 112 - "Community 112"
Cohesion: 0.70
Nodes (5): PayrollManagement(), handleApproveRun(), handleExecuteRun(), loadData(), loadPayslips()

### Community 115 - "Community 115"
Cohesion: 0.83
Nodes (4): EmployeeSelfService(), handleApplyLeave(), handlePunch(), loadPortalData()

### Community 116 - "Community 116"
Cohesion: 0.83
Nodes (4): HRWorkflowCenter(), handleCreateAnnouncement(), handleSubmitExit(), loadData()

### Community 117 - "Community 117"
Cohesion: 0.83
Nodes (4): WorkforceTasks(), handleCreateTask(), handleUpdateStatus(), loadData()

## Ambiguous Edges - Review These
- `RBAC 127 Permission Codes / 11 Roles` → `11 Enterprise RBAC Roles`  [AMBIGUOUS]
  docs/JYOTSVAN_COMPLETE_PROJECT_AUDIT.md · relation: conceptually_related_to
- `audit_logs table` → `audit_logs (Immutable Compliance Trail)`  [AMBIGUOUS]
  docs/JYOTSVAN_DATABASE_SCHEMA_REPORT.md · relation: semantically_similar_to
- `Prioritized Pending Development Roadmap (Phases A-E)` → `Phase A Existing Functionality Hardening`  [AMBIGUOUS]
  docs/JYOTSVAN_DEVELOPMENT_ROADMAP.md · relation: conceptually_related_to
- `Prioritized Pending Development Roadmap (Phases A-E)` → `Phase Lettering Differs vs Master Audit Part 13 (A-E vs A-G)`  [AMBIGUOUS]
  docs/JYOTSVAN_DEVELOPMENT_ROADMAP.md · relation: references
- `Prioritized Development Roadmap` → `Phase Lettering Differs vs Master Audit Part 13 (A-E vs A-G)`  [AMBIGUOUS]
  docs/JYOTSVAN_DEVELOPMENT_ROADMAP.md · relation: references
- `Module and Feature Inventory` → `Phased roadmap (Phases 1-13)`  [AMBIGUOUS]
  docs/PROJECT_SPEC.md · relation: conceptually_related_to
- `SEC-03 Unauthenticated SQL proxy /api/db/query (HIGH)` → `Express API gateway (server.ts)`  [AMBIGUOUS]
  docs/JYOTSVAN_SECURITY_AUDIT.md · relation: semantically_similar_to
- `Planned permissions by phase` → `Phased roadmap (Phases 1-13)`  [AMBIGUOUS]
  docs/PERMISSIONS.md · relation: semantically_similar_to
- `Planned phases 6-13 (procurement through AI)` → `Module directory to planned phase mapping`  [AMBIGUOUS]
  docs/PROJECT_SPEC.md · relation: semantically_similar_to

## Knowledge Gaps
- **54 isolated node(s):** `RFC-1918`, `Marketing Ad Copy & Performance Diagnostics`, `Directory Layout Blueprint`, `Branch Scoping (branch_id)`, `Sensitive Field Redactor` (+49 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 606 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Community 13` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 16`, `Community 18`, `Community 19`, `Community 22`, `Community 24`, `Community 25`, `Community 27`, `Community 28`, `Community 33`, `Community 34`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 50`, `Community 51`, `Community 54`, `Community 58`, `Community 61`, `Community 62`, `Community 64`, `Community 65`, `Community 69`, `Community 70`, `Community 73`, `Community 74`, `Community 75`, `Community 78`, `Community 79`, `Community 83`, `Community 87`, `Community 91`, `Community 92`, `Community 93`, `Community 95`, `Community 98`, `Community 104`, `Community 107`, `Community 108`, `Community 109`, `Community 110`, `Community 119`?**
  _High betweenness centrality (0.303) - this node is a cross-community bridge._
- **What connects `RFC-1918`, `Marketing Ad Copy & Performance Diagnostics`, `Directory Layout Blueprint` to the rest of the system?**
  _54 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05240373661426293 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Community 13` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 16`, `Community 18`, `Community 19`, `Community 22`, `Community 24`, `Community 25`, `Community 27`, `Community 28`, `Community 33`, `Community 34`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 50`, `Community 51`, `Community 54`, `Community 58`, `Community 61`, `Community 62`, `Community 64`, `Community 65`, `Community 69`, `Community 70`, `Community 73`, `Community 74`, `Community 75`, `Community 78`, `Community 79`, `Community 83`, `Community 87`, `Community 91`, `Community 92`, `Community 93`, `Community 95`, `Community 98`, `Community 104`, `Community 107`, `Community 108`, `Community 109`, `Community 110`, `Community 119`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04671699188149836 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `RBAC 127 Permission Codes / 11 Roles` and `11 Enterprise RBAC Roles`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `audit_logs table` and `audit_logs (Immutable Compliance Trail)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._