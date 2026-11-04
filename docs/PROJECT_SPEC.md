# Jyotsvan Enterprise Platform — Project Specification

## 1. Executive Overview

**Jyotsvan** is an enterprise-grade unified business operating system engineered for end-to-end commerce, manufacturing, supply chain, and operational intelligence. 

The system consolidates disparate enterprise silos into a cohesive, high-performance platform spanning:
- Manufacturing & Quality Assurance
- Inventory & Multi-Warehouse Operations
- Distribution, C&F, and Multi-Tier Retail Networks
- Commerce, Marketplaces (Amazon, Flipkart, Myntra, Shopify), and Field Sales
- Financial Operations, Invoicing, Payments, and Collections
- Marketing Intelligence & Omni-Channel Ad Analytics (Meta, Google)
- AI Copilot, Prescriptive Insights, and Automated Recommendations

---

## 2. Phased Roadmap

To ensure enterprise-grade stability, scalability, and code discipline, the development of Jyotsvan is executed across controlled phases:

| Phase | Milestone | Scope & Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Project Foundation** | Architecture foundation, documentation, InsForge configuration, database schemas (Org, Branch, User, Role, Warehouse), authentication flow, app shell, navigation layout, reusable UI primitives, error handling. | **COMPLETED** |
| **Phase 2** | **Application Shell & Navigation Framework** | Centralized multi-tier navigation architecture (up to 3 levels), collapsible sidebar with responsive mobile drawer, dynamic breadcrumb engine, global search command palette (⌘K), notification center foundation, user profile menu, reusable PageLayout & PageHeader system, Command Center hero dashboard structural shell, full placeholder coverage across all domain routes, and 404 handler. | **COMPLETED** |
| **Phase 3** | **Core Organization & Master Data** | Multi-entity org configuration, branch management, master warehouse management, role and permission matrix assignment. | **COMPLETED** |
| **Phase 4** | **Master Data & Settings Live Engine** | Production-ready business parameters, multi-warehouse & aisle locations, units of measure (UOM), and user role management. | **COMPLETED** |
| **Phase 5** | **Reusable Business UI & Design System Completion** | Generic DataTable engine with column sorting & multi-selection, FilterBar system with debounced search & date picker presets, KPI Cards with trend metrics, Form system (FormField, FormSection, NumberInput with stepper, Switch, Checkbox, RadioGroup, FormActions), 16-state StatusBadge matrix, ConfirmDialog, Drawer, DetailLayout, ActivityTimeline, FileUpload/FileList, and Recharts telemetry suite. | **COMPLETED** |
| **Phase 6** | **Procurement & Vendor Management** | Purchase requisitions, RFQs, purchase orders, GRN (Goods Receipt Note), vendor ratings, AP invoices. | *Planned* |
| **Phase 7** | **Manufacturing & Quality Control** | Bill of Materials (BOM), formulation engine, work orders, production routing, batch execution, QC inspection stages & quarantine. | *Planned* |
| **Phase 8** | **Distribution, C&F, & Field Sales** | Carrying & Forwarding agents, distributor hierarchies, field sales tracking, beat planning, van sales, retailer ordering. | *Planned* |
| **Phase 9** | **Sales, Invoicing, & Collections** | Quotations, sales orders, automated dispatching, e-invoicing, tax compliance, payments ledger, collections dunning. | *Planned* |
| **Phase 10**| **Omni-Channel Commerce & Marketplaces** | Bidirectional sync with Shopify, Amazon, Flipkart, Myntra for catalog, order routing, and unified inventory reservation. | *Planned* |
| **Phase 11**| **Marketing & Advertising Analytics** | Meta Ads and Google Ads API integrations, campaign attribution, ROAS tracking, blended CAC analytics. | *Planned* |
| **Phase 12**| **Finance, Staff, & People** | Double-entry general ledger, expense claims, payroll foundation, employee master, attendance & leave management. | *Planned* |
| **Phase 13**| **AI Intelligence & Copilot** | Server-side Gemini AI integration for demand forecasting, inventory reorder recommendations, anomaly detection, conversational copilot. | *Planned* |

---

## 3. Scope Boundary for Phase 1 & Phase 2

1. **Phase 1 (Foundation)** established the production-ready modular monolith skeleton, InsForge authentication, PostgreSQL DDL schemas, and design token fundamentals.
2. **Phase 2 (Application Shell & Navigation Framework)** established the complete enterprise navigation hierarchy, responsive layout shell, global search command palette, notification interface foundation, executive command center shell, and placeholder specifications across every planned domain route.
3. In strict accordance with architectural discipline, real business logic, transactional database mutations, and AI model execution remain safely deferred to their respective target phases.
