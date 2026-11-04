import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import {
  SectionHeader,
  KPICard,
  StatusBadge,
  DataTable,
  FilterBar,
  MultiSelect,
  DateRangePicker,
  FormField,
  FormSection,
  Input,
  NumberInput,
  Textarea,
  Select,
  Switch,
  Checkbox,
  RadioGroup,
  FormActions,
  ConfirmDialog,
  Drawer,
  Tabs,
  ActivityTimeline,
  DetailLayout,
  FileUpload,
  FileList,
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  Button,
  Badge,
  Card,
  TableSkeleton,
  EmptyState,
  ErrorState,
} from '../../components/ui';
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Layers,
  Sparkles,
  Filter,
  Download,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  FileCheck,
  ShieldCheck,
  Building2,
  Calendar,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatQuantity, formatDate } from '../../lib/format';
import type {
  TableColumn,
  SortState,
  DateRange,
  ActivityTimelineItem,
  FileAttachment,
  SemanticStatus,
} from '../../types/common';

interface SampleRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  totalValue: number;
  status: SemanticStatus;
  lastUpdated: string;
}

const SAMPLE_TABLE_DATA: SampleRecord[] = [
  {
    id: 'REC-001',
    code: 'SKU-IND-901',
    name: 'Industrial Polymer Resin Grade-A',
    category: 'Raw Materials',
    quantity: 14500,
    uom: 'kg',
    unitPrice: 185,
    totalValue: 2682500,
    status: 'active',
    lastUpdated: '2026-09-08',
  },
  {
    id: 'REC-002',
    code: 'SKU-IND-902',
    name: 'Precision Hydraulic Seals (Viton 75)',
    category: 'Components',
    quantity: 420,
    uom: 'units',
    unitPrice: 1450,
    totalValue: 609000,
    status: 'approved',
    lastUpdated: '2026-09-07',
  },
  {
    id: 'REC-003',
    code: 'SKU-IND-903',
    name: 'High-Temp Thermal Conductive Paste',
    category: 'Formulation',
    quantity: 85,
    uom: 'kg',
    unitPrice: 4200,
    totalValue: 357000,
    status: 'processing',
    lastUpdated: '2026-09-06',
  },
  {
    id: 'REC-004',
    code: 'SKU-IND-904',
    name: 'Stainless Steel Fasteners M8x40',
    category: 'Hardware',
    quantity: 25000,
    uom: 'units',
    unitPrice: 12.5,
    totalValue: 312500,
    status: 'low_stock',
    lastUpdated: '2026-09-05',
  },
  {
    id: 'REC-005',
    code: 'SKU-IND-905',
    name: 'Batch #B-8812 Lubricant Sample',
    category: 'Quality QC',
    quantity: 12,
    uom: 'liters',
    unitPrice: 950,
    totalValue: 11400,
    status: 'quarantine',
    lastUpdated: '2026-09-04',
  },
  {
    id: 'REC-006',
    code: 'SKU-IND-906',
    name: 'Recycled Polypropylene Pellets',
    category: 'Raw Materials',
    quantity: 32000,
    uom: 'kg',
    unitPrice: 92,
    totalValue: 2944000,
    status: 'quality_pass',
    lastUpdated: '2026-09-03',
  },
];

const SAMPLE_TIMELINE: ActivityTimelineItem[] = [
  {
    id: 'act-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    user: { id: 'u1', name: 'Sunil Panigrahy', role: 'Super Admin' },
    action: 'approved purchase requisition',
    target: 'PR-2026-094',
    description: 'Authorized procurement of 14.5MT Polymer Resin for Plant 1.',
    status: 'approved',
    metadata: { poNumber: 'PO-2026-881', approvedValue: 2682500, branch: 'Bhubaneswar Depot' },
  },
  {
    id: 'act-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    user: { id: 'u2', name: 'Alok Sharma', role: 'Plant Manager' },
    action: 'logged shift production yield',
    target: 'Batch #B-8812',
    description: 'Recorded 4,200kg output from Line 2 extrusion machine with 99.2% yield.',
    status: 'completed',
    metadata: { shift: 'Morning A', machineId: 'EXT-02', scrapRateKg: 34 },
  },
  {
    id: 'act-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    user: { id: 'u3', name: 'Priya Patel', role: 'QC Chemist' },
    action: 'placed batch on quarantine hold',
    target: 'Batch #B-8813',
    description: 'Viscosity test deviation detected. Awaiting secondary spectrophotometer assay.',
    status: 'quarantine',
    metadata: { testId: 'QC-VISC-99', expectedRange: '450-500 cP', actualReading: '535 cP' },
  },
];

const SAMPLE_FILES: FileAttachment[] = [
  {
    id: 'f-1',
    name: 'Certificate_of_Analysis_Batch_8812.pdf',
    size: 2450000,
    type: 'application/pdf',
    uploadedAt: '2026-09-08',
    uploadedBy: 'Priya Patel',
  },
  {
    id: 'f-2',
    name: 'Supplier_Tax_Invoice_INV-9092.pdf',
    size: 1120000,
    type: 'application/pdf',
    uploadedAt: '2026-09-07',
    uploadedBy: 'Finance Ops',
  },
  {
    id: 'f-3',
    name: 'Raw_Material_Inventory_Audit_Q3.xlsx',
    size: 4500000,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedAt: '2026-09-06',
    uploadedBy: 'Sunil Panigrahy',
  },
];

const CHART_MONTHLY_REVENUE = [
  { month: 'Apr 26', actual: 4200000, target: 3900000, opex: 1800000 },
  { month: 'May 26', actual: 4850000, target: 4100000, opex: 1950000 },
  { month: 'Jun 26', actual: 5120000, target: 4500000, opex: 2100000 },
  { month: 'Jul 26', actual: 4900000, target: 4800000, opex: 2050000 },
  { month: 'Aug 26', actual: 5750000, target: 5000000, opex: 2250000 },
  { month: 'Sep 26', actual: 6420000, target: 5400000, opex: 2380000 },
];

const CHART_CHANNEL_SHARE = [
  { name: 'Distributor Network', value: 3450000, color: '#0f172a' },
  { name: 'DTC Website (Shopify)', value: 1680000, color: '#2563eb' },
  { name: 'Amazon Marketplace', value: 890000, color: '#059669' },
  { name: 'Flipkart & Retail', value: 400000, color: '#d97706' },
];

export function DesignSystemPage() {
  const [activeMainTab, setActiveMainTab] = useState('overview');

  // KPI Interactive state
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(false);

  // Table State
  const [tableSearch, setTableSearch] = useState('');
  const [tableCategory, setTableCategory] = useState<string[]>([]);
  const [tableDateRange, setTableDateRange] = useState<DateRange | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [tableSort, setTableSort] = useState<SortState>({ column: 'totalValue', direction: 'desc' });
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(5);
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Dialog & Drawer state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit'>('view');
  const [activeDrawerRecord, setActiveDrawerRecord] = useState<SampleRecord | null>(SAMPLE_TABLE_DATA[0]);

  // Form State
  const [formValues, setFormValues] = useState({
    code: 'SKU-IND-907',
    name: 'Premium Hydraulic Oil ISO-VG-68',
    category: 'Lubricants',
    quantity: 1200,
    unitPrice: 240,
    uom: 'liters',
    reorderLevel: 300,
    status: 'active',
    isTaxable: true,
    allowNegativeStock: false,
    notes: 'Approved for automated plant filling lines.',
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Filter table data
  const filteredTableData = SAMPLE_TABLE_DATA.filter((item) => {
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      const matches =
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (tableCategory.length > 0 && !tableCategory.includes(item.category)) {
      return false;
    }
    return true;
  });

  const tableColumns: TableColumn<SampleRecord>[] = [
    {
      key: 'code',
      header: 'SKU / Code',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
          {row.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Item Description',
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 truncate max-w-xs">{row.name}</p>
          <p className="text-[11px] text-slate-400">{row.category}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums font-medium text-slate-800">
          {formatQuantity(row.quantity, row.uom)}
        </span>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      align: 'right',
      sortable: true,
      priority: 'medium',
      render: (row) => (
        <span className="tabular-nums text-slate-700">
          {formatCurrency(row.unitPrice)}
        </span>
      ),
    },
    {
      key: 'totalValue',
      header: 'Total Value',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums font-bold text-slate-900">
          {formatCurrency(row.totalValue)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveDrawerRecord(row);
              setDrawerMode('view');
              setIsDrawerOpen(true);
            }}
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveDrawerRecord(row);
              setDrawerMode('edit');
              setIsDrawerOpen(true);
            }}
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
            title="Edit Item"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const handleFormSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setTimeout(() => {
      setFormSubmitting(false);
      setFormSuccessMessage('Item parameters updated in local state successfully.');
      setTimeout(() => setFormSuccessMessage(null), 4000);
    }, 600);
  };

  return (
    <PageContainer
      title="UI Foundation & Reusable Design System"
      description="Enterprise interaction language, data table engine, KPI cards, form controls, charts, dialogs, drawers, and status badge registry (Phase 5)."
      phaseBadge="Phase 5 Complete"
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsTableLoading(true);
              setIsLoadingKPIs(true);
              setTimeout(() => {
                setIsTableLoading(false);
                setIsLoadingKPIs(false);
              }, 800);
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Test Loading States
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsConfirmOpen(true)}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Open Confirm Dialog
          </Button>
        </div>
      }
    >
      {/* Navigation Tabs */}
      <Tabs
        activeTab={activeMainTab}
        onChange={setActiveMainTab}
        variant="segmented"
        tabs={[
          { id: 'overview', label: 'Component Catalog', icon: <Layers className="w-4 h-4" /> },
          { id: 'tables', label: 'Data Tables & Filters', icon: <Filter className="w-4 h-4" />, count: SAMPLE_TABLE_DATA.length },
          { id: 'forms', label: 'Form System', icon: <FileCheck className="w-4 h-4" /> },
          { id: 'charts', label: 'Telemetry & Charts', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'detail', label: 'Detail Page Layout', icon: <Building2 className="w-4 h-4" /> },
        ]}
      />

      {/* TAB 1: OVERVIEW & COMPONENT CATALOG */}
      {activeMainTab === 'overview' && (
        <div className="space-y-8">
          {/* Section 1: KPI Cards & Metrics */}
          <div className="space-y-4">
            <SectionHeader
              title="Enterprise KPI Cards & Telemetry Counters"
              description="High-density metric cards with formatted currency, unit ratios, trend tags, and tooltip documentation."
              badge="4 Metrics"
              icon={<Sparkles className="w-4 h-4" />}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                label="Total Revenue (MTD)"
                value={formatCurrency(6420000, { compact: true })}
                change="+₹6.7L"
                changePercentage={12.4}
                trend="up"
                trendLabel="vs previous month"
                icon={<DollarSign className="w-4 h-4 text-slate-800" />}
                tooltip="Aggregated gross billing across all distributor and DTC sales channels."
                isLoading={isLoadingKPIs}
                highlight
              />

              <KPICard
                label="Manufacturing Inventory"
                value="46,950 kg"
                change="-1,200 kg"
                changePercentage={-2.5}
                trend="down"
                trendLabel="safety stock delta"
                icon={<Package className="w-4 h-4 text-slate-800" />}
                tooltip="Active raw materials and packaging materials in warehouse custody."
                isLoading={isLoadingKPIs}
              />

              <KPICard
                label="Active Dispatches"
                value="148 Orders"
                change="+18"
                changePercentage={8.6}
                trend="up"
                trendLabel="today's beat quota"
                icon={<ShoppingCart className="w-4 h-4 text-slate-800" />}
                isLoading={isLoadingKPIs}
              />

              <KPICard
                label="Plant Quality Pass Rate"
                value="99.4%"
                change="0.0%"
                changePercentage={0}
                trend="neutral"
                trendLabel="target: >99.0%"
                icon={<ShieldCheck className="w-4 h-4 text-slate-800" />}
                tooltip="Certificate of Analysis compliance across in-line extrusion batches."
                isLoading={isLoadingKPIs}
              />
            </div>
          </div>

          {/* Section 2: Semantic Status Badges Matrix */}
          <div className="space-y-4">
            <SectionHeader
              title="Semantic Status Badge Registry"
              description="Color-independent enterprise status badges with high-contrast accessibility tints and icons."
              badge="16 Statuses"
            />

            <Card className="p-5 bg-white border border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatusBadge status="active" />
                <StatusBadge status="approved" />
                <StatusBadge status="completed" />
                <StatusBadge status="published" />
                <StatusBadge status="quality_pass" />
                <StatusBadge status="pending" />
                <StatusBadge status="processing" />
                <StatusBadge status="in_transit" />
                <StatusBadge status="draft" />
                <StatusBadge status="inactive" />
                <StatusBadge status="archived" />
                <StatusBadge status="low_stock" />
                <StatusBadge status="quarantine" />
                <StatusBadge status="overdue" />
                <StatusBadge status="rejected" />
                <StatusBadge status="cancelled" />
                <StatusBadge status="quality_fail" />
              </div>
            </Card>
          </div>

          {/* Section 3: Feedback, Skeletons, and State Placeholders */}
          <div className="space-y-4">
            <SectionHeader
              title="State Handlers: Loading, Empty, and Error"
              description="Standardized fallback and diagnostic boundaries across all views."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-white border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wider">Empty State Container</p>
                <EmptyState
                  title="No Invoices Dispatched"
                  description="No sales orders have been generated in this billing cycle."
                  actionLabel="Create Invoice"
                  onAction={() => alert('Empty state action triggered')}
                />
              </Card>

              <Card className="p-4 bg-white border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wider">Error & Diagnostic Container</p>
                <ErrorState
                  title="Database Sync Notice"
                  message="InsForge connection pool latency exceeded 120ms threshold."
                  onRetry={() => alert('Retrying connection...')}
                />
              </Card>

              <Card className="p-4 bg-white border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wider">Interactive Dialogs & Drawers</p>
                <div className="space-y-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-xs"
                    onClick={() => setIsConfirmOpen(true)}
                  >
                    Open Confirmation Modal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      setActiveDrawerRecord(SAMPLE_TABLE_DATA[0]);
                      setDrawerMode('view');
                      setIsDrawerOpen(true);
                    }}
                  >
                    Open Slide-out Quick View Drawer
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATA TABLES & FILTER SYSTEM */}
      {activeMainTab === 'tables' && (
        <div className="space-y-6">
          <SectionHeader
            title="Generic Enterprise Data Table & Filter Bar"
            description="Strongly typed table engine with column sorting, row multi-selection, bulk action bar, filter pills, search debounce, and pagination."
          />

          <DataTable<SampleRecord>
            data={filteredTableData}
            columns={tableColumns}
            keyExtractor={(item) => item.id}
            selectable
            selectedKeys={selectedRowKeys}
            onSelectionChange={setSelectedRowKeys}
            sortState={tableSort}
            onSortChange={setTableSort}
            page={tablePage}
            pageSize={tablePageSize}
            totalRecords={filteredTableData.length}
            onPageChange={setTablePage}
            onPageSizeChange={setTablePageSize}
            isLoading={isTableLoading}
            headerSlot={
              <FilterBar
                searchValue={tableSearch}
                onSearchChange={setTableSearch}
                searchPlaceholder="Search SKUs, names, categories..."
                showDateRange
                dateRange={tableDateRange}
                onDateRangeChange={setTableDateRange}
                activeTags={[
                  ...(tableCategory.length > 0
                    ? [{ key: 'cat', label: 'Category', value: tableCategory.join(', '), onRemove: () => setTableCategory([]) }]
                    : []),
                ]}
                hasActiveFilters={Boolean(tableSearch || tableCategory.length > 0 || tableDateRange)}
                onResetAll={() => {
                  setTableSearch('');
                  setTableCategory([]);
                  setTableDateRange(null);
                }}
                actions={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => alert(`Exporting ${filteredTableData.length} records to CSV...`)}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Export
                  </Button>
                }
              >
                <MultiSelect
                  placeholder="Filter Category"
                  options={[
                    { value: 'Raw Materials', label: 'Raw Materials', count: 2 },
                    { value: 'Components', label: 'Components', count: 1 },
                    { value: 'Formulation', label: 'Formulation', count: 1 },
                    { value: 'Hardware', label: 'Hardware', count: 1 },
                    { value: 'Quality QC', label: 'Quality QC', count: 1 },
                  ]}
                  value={tableCategory}
                  onChange={setTableCategory}
                />
              </FilterBar>
            }
            bulkActions={(keys, clearSelection) => (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700 h-7 text-xs"
                  onClick={() => {
                    alert(`Approved ${keys.length} items.`);
                    clearSelection();
                  }}
                  leftIcon={<CheckCircle className="w-3 h-3 text-emerald-400" />}
                >
                  Approve Selected
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700 h-7 text-xs"
                  onClick={() => {
                    alert(`Exporting ${keys.length} selected items...`);
                  }}
                  leftIcon={<Download className="w-3 h-3" />}
                >
                  Export ({keys.length})
                </Button>
              </div>
            )}
          />
        </div>
      )}

      {/* TAB 3: FORM SYSTEM */}
      {activeMainTab === 'forms' && (
        <div className="space-y-6 max-w-4xl">
          <SectionHeader
            title="Enterprise Form Foundation"
            description="Modular form layout with FormSection, FormField, NumberInput with stepper, Switch, Checkbox, RadioGroup, and FormActions."
          />

          {formSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{formSuccessMessage}</span>
            </div>
          )}

          <Card className="p-6 bg-white border border-slate-200">
            <form onSubmit={handleFormSave} className="space-y-6">
              <FormSection
                title="Primary Master Information"
                description="Core product identifiers and organizational classification."
                columns={2}
              >
                <FormField label="Item SKU / Code" required hint="Unique alphanumeric master identifier">
                  <Input
                    value={formValues.code}
                    onChange={(e) => setFormValues({ ...formValues, code: e.target.value })}
                  />
                </FormField>

                <FormField label="Item Name" required>
                  <Input
                    value={formValues.name}
                    onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  />
                </FormField>

                <FormField label="Master Category" required>
                  <Select
                    value={formValues.category}
                    onChange={(e) => setFormValues({ ...formValues, category: e.target.value })}
                    options={[
                      { value: 'Raw Materials', label: 'Raw Materials' },
                      { value: 'Lubricants', label: 'Lubricants' },
                      { value: 'Components', label: 'Components' },
                      { value: 'Formulation', label: 'Formulation' },
                    ]}
                  />
                </FormField>

                <FormField label="Unit of Measure (UOM)" required>
                  <Select
                    value={formValues.uom}
                    onChange={(e) => setFormValues({ ...formValues, uom: e.target.value })}
                    options={[
                      { value: 'kg', label: 'Kilograms (kg)' },
                      { value: 'liters', label: 'Liters (L)' },
                      { value: 'units', label: 'Units / Pieces' },
                      { value: 'meters', label: 'Meters (m)' },
                    ]}
                  />
                </FormField>
              </FormSection>

              <FormSection
                title="Inventory & Financial Parameters"
                description="Stock thresholds, unit pricing, and tax calculation settings."
                columns={3}
              >
                <FormField label="Current Stock Quantity" required>
                  <NumberInput
                    value={formValues.quantity}
                    onChange={(v) => setFormValues({ ...formValues, quantity: v || 0 })}
                    suffix={formValues.uom}
                    showStepper
                  />
                </FormField>

                <FormField label="Reorder Threshold" required hint="Triggers low-stock alert">
                  <NumberInput
                    value={formValues.reorderLevel}
                    onChange={(v) => setFormValues({ ...formValues, reorderLevel: v || 0 })}
                    suffix={formValues.uom}
                    showStepper
                  />
                </FormField>

                <FormField label="Unit Price (INR)" required>
                  <NumberInput
                    value={formValues.unitPrice}
                    onChange={(v) => setFormValues({ ...formValues, unitPrice: v || 0 })}
                    prefix="₹"
                  />
                </FormField>
              </FormSection>

              <FormSection
                title="Governance & Policies"
                description="System flags, validation rules, and internal operator notes."
                columns={2}
              >
                <div className="space-y-4">
                  <Switch
                    label="GST Taxable Item"
                    description="Include standard 18% GST tax computation on invoice creation."
                    checked={formValues.isTaxable}
                    onChange={(checked) => setFormValues({ ...formValues, isTaxable: checked })}
                  />

                  <Checkbox
                    label="Allow Negative Stock Allocation"
                    description="Permits production dispatch prior to Goods Receipt Note (GRN) physical post."
                    checked={formValues.allowNegativeStock}
                    onChange={(checked) => setFormValues({ ...formValues, allowNegativeStock: checked })}
                  />
                </div>

                <FormField label="Status Designation">
                  <RadioGroup
                    name="item-status"
                    value={formValues.status}
                    onChange={(val) => setFormValues({ ...formValues, status: val })}
                    options={[
                      { value: 'active', label: 'Active - Available for PO & Sales', description: 'Item is actively traded and manufactured.' },
                      { value: 'draft', label: 'Draft - Pending Compliance Review', description: 'Item cannot be dispatched until verified.' },
                      { value: 'inactive', label: 'Inactive / Discontinued', description: 'No new PO or sales orders allowed.' },
                    ]}
                  />
                </FormField>
              </FormSection>

              <FormField label="Internal Notes / Formulation Specs">
                <Textarea
                  value={formValues.notes}
                  onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
                  rows={3}
                />
              </FormField>

              <FormActions
                isSubmitting={formSubmitting}
                onSave={() => {}}
                onCancel={() => alert('Form cancelled')}
                onReset={() =>
                  setFormValues({
                    code: 'SKU-IND-907',
                    name: 'Premium Hydraulic Oil ISO-VG-68',
                    category: 'Lubricants',
                    quantity: 1200,
                    unitPrice: 240,
                    uom: 'liters',
                    reorderLevel: 300,
                    status: 'active',
                    isTaxable: true,
                    allowNegativeStock: false,
                    notes: '',
                  })
                }
              />
            </form>
          </Card>
        </div>
      )}

      {/* TAB 4: TELEMETRY & CHARTS */}
      {activeMainTab === 'charts' && (
        <div className="space-y-6">
          <SectionHeader
            title="Enterprise Charting Foundation (Recharts)"
            description="Responsive, accessible analytics visualization with high-contrast executive palettes."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LineChart
              title="Revenue vs Target Performance"
              subtitle="Monthly billing trajectory compared against executive operational budget."
              data={CHART_MONTHLY_REVENUE}
              xAxisKey="month"
              formatAsCurrency
              series={[
                { key: 'actual', name: 'Actual Revenue', color: '#0f172a', strokeWidth: 2.5 },
                { key: 'target', name: 'Budget Target', color: '#2563eb', strokeDasharray: '4 4' },
              ]}
            />

            <AreaChart
              title="Revenue & Operating Expense Spread"
              subtitle="Net gross revenue with OPEX baseline breakdown."
              data={CHART_MONTHLY_REVENUE}
              xAxisKey="month"
              formatAsCurrency
              series={[
                { key: 'actual', name: 'Gross Revenue', color: '#059669' },
                { key: 'opex', name: 'Operating Expenses', color: '#d97706' },
              ]}
            />

            <BarChart
              title="Revenue by Sales Quarter"
              subtitle="Comparative breakdown across billing cycles."
              data={CHART_MONTHLY_REVENUE}
              xAxisKey="month"
              formatAsCurrency
              series={[
                { key: 'actual', name: 'Revenue', color: '#0f172a' },
                { key: 'opex', name: 'OPEX', color: '#94a3b8' },
              ]}
            />

            <PieChart
              title="Sales Channel Revenue Contribution"
              subtitle="Distribution network vs direct-to-consumer share."
              data={CHART_CHANNEL_SHARE}
              donut
              centerLabel="Total YTD"
              centerValue="₹64.2L"
              formatAsCurrency
            />
          </div>
        </div>
      )}

      {/* TAB 5: DETAIL PAGE TEMPLATE */}
      {activeMainTab === 'detail' && (
        <DetailLayout
          title="Industrial Polymer Resin Grade-A"
          subtitle="SKU: SKU-IND-901 • Created on 01 Sep 2026 by Sunil Panigrahy"
          status="active"
          onBack={() => setActiveMainTab('overview')}
          backLabel="Back to Catalog"
          actions={
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" leftIcon={<Edit className="w-3.5 h-3.5" />}>
                Edit Record
              </Button>
              <Button type="button" variant="primary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                Export COA
              </Button>
            </div>
          }
          highlights={[
            { label: 'Current Inventory', value: '14,500 kg', icon: <Package className="w-4 h-4" /> },
            { label: 'Unit Valuation', value: '₹185.00 / kg', icon: <DollarSign className="w-4 h-4" /> },
            { label: 'Total Value', value: '₹26,82,500', icon: <TrendingUp className="w-4 h-4" /> },
            { label: 'Custody Warehouse', value: 'Bhubaneswar Central', icon: <Building2 className="w-4 h-4" /> },
          ]}
          sidebar={
            <div className="space-y-6">
              <Card className="p-4 bg-white border border-slate-200 space-y-3">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Associated Documents & COA
                </h4>
                <FileUpload
                  maxFiles={2}
                  onFilesSelected={(files) => alert(`Uploaded ${files.length} documents.`)}
                />
                <FileList
                  files={SAMPLE_FILES}
                  onDownload={(f) => alert(`Downloading ${f.name}...`)}
                  onDelete={(id) => alert(`Deleting file ${id}...`)}
                />
              </Card>

              <Card className="p-4 bg-white border border-slate-200 space-y-2 text-xs">
                <h4 className="font-semibold text-slate-900 uppercase tracking-wider">Metadata</h4>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tax Category:</span>
                  <span className="font-medium text-slate-800">GST 18% (HSN 3901)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Hazard Class:</span>
                  <span className="font-medium text-slate-800">Non-Hazardous</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Shelf Life:</span>
                  <span className="font-medium text-slate-800">24 Months</span>
                </div>
              </Card>
            </div>
          }
        >
          <Card className="p-5 bg-white border border-slate-200 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Audit Trail & Activity Log</h3>
            <ActivityTimeline items={SAMPLE_TIMELINE} />
          </Card>
        </DetailLayout>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          alert('Action confirmed.');
        }}
        title="Deactivate SKU Master Record?"
        description="This will mark SKU-IND-901 as inactive. Future purchase orders and inventory dispatches will be locked until reactivated by an authorized manager."
        confirmLabel="Deactivate Record"
        variant="danger"
      />

      {/* SLIDE-OUT DRAWER */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={drawerMode === 'view' ? 'Record Details' : 'Edit Master Parameters'}
        description={activeDrawerRecord?.code}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDrawerOpen(false)}>
              Close
            </Button>
            {drawerMode === 'edit' && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsDrawerOpen(false);
                  alert('Changes saved in local session.');
                }}
              >
                Save
              </Button>
            )}
          </div>
        }
      >
        {activeDrawerRecord && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Item Name</span>
              <p className="text-sm font-bold text-slate-900">{activeDrawerRecord.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-500">Category:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{activeDrawerRecord.category}</p>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-500">Current Stock:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{formatQuantity(activeDrawerRecord.quantity, activeDrawerRecord.uom)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-500">Unit Price:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{formatCurrency(activeDrawerRecord.unitPrice)}</p>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-500">Total Valuation:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{formatCurrency(activeDrawerRecord.totalValue)}</p>
              </div>
            </div>

            <div className="p-3 bg-white rounded border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Operational Status:</span>
              <StatusBadge status={activeDrawerRecord.status} size="sm" />
            </div>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
}
