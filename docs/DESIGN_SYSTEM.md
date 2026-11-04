# Jyotsvan Enterprise Platform — Design System & UI Principles

## 1. Design Philosophy

Jyotsvan is an enterprise operations platform utilized by leadership, plant managers, supply chain operators, and financial controllers. The UI must convey:
- **Precision**: Clean information density without chaotic clutter.
- **Reliability**: Instant feedback, deterministic interactions, and clear state transitions.
- **Zero AI Slop**: Strict rejection of neon drop-shadows, arbitrary gradients, oversized frivolous cartoon elements, or meaningless filler visuals.
- **Data-Oriented Typography**: Clear tabular numbers, high contrast ratios, and structured hierarchy.

---

## 2. Color Tokens & Theme Definition

Jyotsvan utilizes a refined, executive neutral palette with deep slate undertones and high legibility:

### Base Palette
- **Canvas / Background**: Clean off-white `#F8FAFC` (Slate-50) for reduced eye strain during extended operational shifts.
- **Surface / Cards**: Crisp pure white `#FFFFFF` with mathematical borders (`#E2E8F0` / Slate-200).
- **Surface Hover**: `#F1F5F9` (Slate-100).
- **Text Primary**: Deep charcoal `#0F172A` (Slate-900) providing >10:1 WCAG AAA contrast against white.
- **Text Secondary / Muted**: `#475569` (Slate-600) for metadata, labels, and secondary context.
- **Text Subtle**: `#94A3B8` (Slate-400) for disabled states or placeholder hints.

### Semantic Accents
- **Primary Brand / Action**: Deep Navy `#0F2942` and Royal Slate `#1E3A8A` — professional, disciplined enterprise authority.
- **Success**: `#059669` (Emerald-600) / Tint `#ECFDF5`.
- **Warning**: `#D97706` (Amber-600) / Tint `#FFFBEB`.
- **Destructive / Error**: `#DC2626` (Red-600) / Tint `#FEF2F2`.
- **Informational**: `#0284C7` (Sky-600) / Tint `#F0F9FF`.

---

## 3. Typography Scale & Hierarchy

- **Font Family**: Plus Jakarta Sans, Inter, or system enterprise sans-serif (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Tabular Numerics**: `font-variant-numeric: tabular-nums` for all codes, quantities, and timestamps.

| Level | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | 22px (`text-xl`) | 600 (Semi-bold) | 1.3 | Header main titles |
| **Section Title** | 16px (`text-base`) | 600 (Semi-bold) | 1.4 | Module panels, card headers |
| **Body Primary** | 14px (`text-sm`) | 400 / 500 | 1.5 | General data rows, inputs, buttons |
| **Body Small** | 12px (`text-xs`) | 400 / 500 | 1.4 | Metadata, badges, timestamps |
| **Micro** | 11px | 600 (Semi-bold) | 1.2 | System status pills, table headers |

---

## 4. Spacing, Borders & Radius Mathematical Rules

- **Corner Radii**: Standard cards and dialogs capped at `8px` (`rounded-lg`) or `6px` (`rounded-md`). Pill badges use `9999px` (`rounded-full`).
- **Nested Border Radius Rule**: `Inner Radius = Outer Radius - Padding`. For a card with `p-4` (16px padding) and `rounded-lg` (8px), inner elements must not exceed 4px or use sharp borders.
- **Button Sizing**:
  - `sm`: Height 32px, `px-3`, text-xs
  - `default`: Height 38px, `px-4`, text-sm
  - `lg`: Height 44px, `px-5`, text-base
  - Horizontal padding is strictly 2x the vertical balance.
- **Labels**: Button and badge text strictly occupies a single line (`whitespace-nowrap`).

---

## 5. Standard Component Catalog

### Core Primitives
1. **Button**: Primary, Secondary, Outline, Destructive, Ghost, Link with loading spinner states.
2. **Input**: Text, Email, Password, Number with error states, prefix/suffix icons, and clean focus rings.
3. **Select**: Accessible dropdown picker with explicit option values.
4. **Card**: Header, Title, Description, Content, and Footer segments.
5. **Badge**: Semantic variants (`default`, `secondary`, `outline`, `success`, `warning`, `destructive`).
6. **Dialog**: Accessible modal dialog with overlay, close trigger, and action buttons.
7. **DropdownMenu**: Menu items, dividers, and icon support.
8. **Tooltip**: Informative micro-overlays for icons and compact tools.
9. **Breadcrumb**: Path navigation tracking organizational hierarchy.
10. **LoadingState & Skeleton**: High-fidelity animated skeletons for tables, cards, and text lines.
11. **EmptyState**: Clean typographic illustration, title, description, and primary action.
12. **ErrorState**: Non-leaking error banner with retry capability.
13. **Toast**: Lightweight notification toaster for feedback.
14. **PageHeader**: Unified title, description, phase badge, action bar, and breadcrumb slot.
15. **PageContainer**: Outer container constraining max width (`max-w-7xl`), horizontal padding, and layout rhythm.
16. **GlobalSearchModal**: Keyboard-accessible (`⌘K`) command palette indexing all navigation endpoints.

### Phase 5 Enterprise Business UI Foundation
17. **SectionHeader**: Structured section divider with title, subtitle, count badge, and optional icon.
18. **StatusBadge & STATUS_REGISTRY**: 16 standard enterprise semantic statuses (`active`, `approved`, `completed`, `published`, `quality_pass`, `pending`, `processing`, `in_transit`, `draft`, `inactive`, `archived`, `low_stock`, `quarantine`, `overdue`, `rejected`, `cancelled`, `quality_fail`) with accessible icons and non-relying color tints.
19. **KPICard**: Executive metric cards supporting formatted currency, unit metrics, trend indicators (up/down/neutral), tooltip documentation, and loading skeletons.
20. **SearchInput**: Debounced real-time query input with clear trigger and loading indicator.
21. **DateRangePicker**: ISO 8601 calendar date range picker with fast-select presets (Today, Yesterday, Last 7 Days, Last 30 Days, This Month, This Quarter, This Year).
22. **MultiSelect**: Multi-tag dropdown with item counts and search filter.
23. **FilterBar**: Composite search, multi-select, date picker, active filter tags with quick dismissal, and export actions.
24. **Pagination**: Accessible page jumper, records-per-page selector, and total count indicator.
25. **BulkActionBar**: Floating contextual bar for batch operations on selected table records.
26. **TableActions**: Row-level action menu supporting quick view, edit, duplicate, archive, and delete with RBAC permission gating.
27. **DataTable<T>**: Generic, high-performance table engine with column sorting, row selection, bulk operations, pagination, responsive column visibility priority, and built-in empty/loading/error fallbacks.
28. **Form System**:
    - `FormField`: Layout wrapper with label, required asterisk, hint, and validation error message.
    - `FormSection`: Structured grid layout for grouping fields by business domain.
    - `NumberInput`: Currency & unit numeric input with stepper controls, prefix, and suffix.
    - `Textarea`: Multi-line text field with auto-resize options.
    - `Switch`: Toggle control for boolean parameters.
    - `Checkbox`: Custom accessible check control.
    - `RadioGroup`: Semantic single-selection group with description cards.
    - `FormActions`: Unified Save / Cancel / Reset button bar with loading state.
29. **ConfirmDialog**: Safety modal for destructive and confirmation actions with customizable title, description, and button variants.
30. **Drawer**: Slide-out side drawer with smooth animations for quick record view and edit forms without losing table context.
31. **Tabs**: Underline, pill, and segmented navigation tabs with count badges and keyboard navigation.
32. **ActivityTimeline**: Chronological audit trail showing actor avatars, role tags, timestamps, status changes, and expandable JSON metadata accordions.
33. **DetailLayout**: Standardized enterprise record detail page layout with header, highlights bar, tabs slot, main content, and sidebar.
34. **FileUpload & FileList**: Document and certificate attachments supporting drag-and-drop, format validation, size limit checks, and download/delete triggers.
35. **Chart System (Recharts)**:
    - `ChartContainer`: Card wrapper with title, subtitle, loading skeleton, error retry, and empty state.
    - `LineChart`: Trend trajectories with multi-series, dashed budgets, and custom tooltips.
    - `BarChart`: Comparative volume charts with grouped/stacked layouts.
    - `AreaChart`: Gradient area spread for revenue and OPEX metrics.
    - `PieChart / Donut`: Channel distribution and share charts with center KPI labels.

---

## 6. Layout & Spacing Rules

- **Container Constraint**: `max-w-7xl mx-auto` (1280px max) prevents ultra-wide distortion.
- **Horizontal Viewport Padding**: `px-4 sm:px-6 lg:px-8` scales with screen size.
- **Vertical Spacing**: `py-6 space-y-6` provides consistent rhythmic separation between header and content cards.
- **Card Padding**: Standard cards utilize `p-4 sm:p-5` with `rounded-xl` and `border-slate-200`.
- **Nested Border Radius Rule**: `Inner Radius = Outer Radius - Padding`. For a card with `p-4` (16px) and `rounded-xl` (12px), child containers must not exceed 4px radius.

---

## 7. Navigation & Route Hierarchy Rules

- **Centralized Source of Truth**: Never hardcode custom navigation trees inside individual view components. All navigation paths are registered in `/src/config/navigation.ts`.
- **Nesting Depth**:
  - Level 1: Domain / Primary Section (e.g., `Commerce`, `Operations`)
  - Level 2: Submodule (e.g., `Shopify Website`, `Marketplaces`, `Manufacturing`)
  - Level 3: Nested Channel / Sub-facility (e.g., `Amazon`, `Flipkart`, `Myntra`)
- **Active State Indication**: Active links display a high-contrast white text pill on `bg-slate-800` accompanied by an optical left accent indicator.
- **Breadcrumb Navigation**: Clicking intermediate breadcrumb segments navigates upward to the parent domain without reloads.

---

## 8. Responsive Viewport Rules

- **Desktop (≥ 1024px / lg)**:
  - Sidebar rendered as a permanent left rail (`w-64` expanded, `w-16` collapsed).
  - Breadcrumbs visible in top header.
  - Global search bar prominently positioned in header center.
- **Tablet & Mobile (< 1024px)**:
  - Sidebar shifts to an off-canvas slide-out drawer with a dark dimming backdrop (`bg-slate-950/60`).
  - Mobile menu trigger button toggles drawer visibility.
  - Selecting any route automatically dismisses the mobile drawer.
  - Breadcrumbs abbreviate or defer to the page header title to conserve horizontal space.
  - Minimum touch target for all interactive controls is strictly 40px–44px.

