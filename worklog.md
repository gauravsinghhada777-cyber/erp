# Home Automation ERP — Worklog

This worklog tracks all work done on the ERP sidebar refactor.

---
Task ID: 0
Agent: main
Task: Plan the ERP sidebar refactor per the client SRS and set up the build strategy.

Work Log:
- Inspected the existing project: it is a fresh Next.js 16 scaffold (no existing ERP code in `src/app`).
- Confirmed available stack: Tailwind 4, shadcn/ui (New York), Zustand, Recharts, framer-motion, react-hook-form, Prisma.
- Decided to build the entire ERP as a single-page app on the `/` route using a Zustand navigation store (since only `/` is user-visible per the project rules).
- Locked the final sidebar structure per client SRS:

```
Home Automation -> Dashboard
HRM -> Employees / Attendance / Shift Logs / Payroll
Inventory -> Components / Products / Stock / Warehouse / Assembly / Dispatch
Procurement -> Vendors / Purchase Orders
Finance -> Income / Expenses / Cash Flow / Invoices / Billing
Service & Work Logs -> Work Logs / Service History / Clients
Barcode & Serial Numbers -> Serial Numbers / Barcode QR / Scan / Print Labels
Reports
Users & Roles
Settings
```

- Removed-from-scope (must NOT appear anywhere): Sales, top-level Billing, top-level Expenses, top-level Vendor Mgmt.
  - Vendor Mgmt → Procurement → Vendors
  - Billing → Finance → Billing
  - Expenses → Finance → Expenses
  - Sales → removed entirely

Stage Summary:
- Build strategy: navigation config + Zustand store + AppSidebar + ERP shell + per-module views, all on `/`.
- Next agents will implement each module view; this file is the single shared worklog.

---
Task ID: 1
Agent: main
Task: Build the complete Home Automation ERP sidebar + shell + all module views on the `/` route per the client SRS.

Work Log:
- Created `src/lib/erp/navigation.ts` — the single source of truth for the sidebar with exactly 10 modules: Home Automation, HRM, Inventory, Procurement, Finance, Service & Work Logs, Barcode & Serial Numbers, Reports, Users & Roles, Settings. NO Sales, NO top-level Billing/Expenses/Vendor Mgmt.
- Created `src/lib/erp/store.ts` — Zustand store for active route + expanded module.
- Created `src/components/erp/app-sidebar.tsx` — collapsible sidebar rendering the nav config; single-item modules render flat, multi-item modules use Collapsible.
- Created `src/components/erp/erp-shell.tsx` — SidebarProvider + SidebarInset + sticky topbar (breadcrumb, search, theme toggle, notifications, account) + sticky footer (`mt-auto`).
- Created `src/components/erp/module-view.tsx` — reusable table-driven view with stat cards, filterable data table, and action buttons. Extracted `ModuleTableView` to avoid conditional hooks.
- Created `src/components/erp/views/dashboard.tsx` — rich Home Automation dashboard with hero card, 4 KPI cards, 3 Recharts charts (area/bar/line), recent activity feed, quick-link cards. Added `ChartBox` wrapper (mounted-flag) to fix ResponsiveContainer zero-width timing inside CSS Grid. Fixed chart strokes to use `var(--border)` (Tailwind v4 oklch) instead of invalid `hsl(var(--border))`.
- Created `src/components/erp/registry.tsx` — view configs for ALL 30+ sub-pages with realistic Home Automation ERP data (employees, components, vendors, POs, income, invoices, work logs, serial numbers, etc.) + 4 custom component views (Dashboard, Barcode/QR generator, Scanner, Print Labels) + RBAC permissions matrix + Settings forms.
- Created `src/components/erp/view-router.tsx` — routes `${moduleId}.${itemId}` to either a custom component view or a table-driven ModuleView.
- Updated `src/app/page.tsx` to render `<ErpShell />`.
- Updated `src/app/layout.tsx` to wrap with next-themes ThemeProvider (light/dark).
- Fixed lint: moved hooks out of conditional return in ModuleView.
- Fixed import path (`./module-view` not `../module-view`).
- Browser-verified: sidebar shows exactly the 10 required modules; HRM expands to Employees/Attendance/Shift Logs/Payroll; Finance expands to Income/Expenses/Cash Flow/Invoices/Billing; Barcode expands to Serial Numbers/Barcode QR/Scan/Print Labels. Employees table renders + filter works. Scan custom view renders. Theme toggle applies `dark` class. All 3 dashboard charts render data (confirmed via DOM: 2 areas, 6 bars, 2 lines with real path data). Footer sticks to bottom on short pages and pushes down on tall pages. Lint clean. Dev server returns 200 with no errors.

Stage Summary:
- Final sidebar structure matches the client SRS exactly — 10 modules, no Sales, Billing/Expenses folded into Finance, Vendor Mgmt folded into Procurement → Vendors.
- All module pages are functional with realistic data, filterable tables, stat cards, and action buttons.
- Dashboard has 3 working Recharts visualizations + KPIs + activity feed.
- Light/dark theme works. Responsive. Sticky footer. Accessibility: semantic html, aria labels, sr-only text.
- Production-ready. Verified end-to-end via Agent Browser + VLM.

---
Task ID: 2
Agent: main
Task: Make every ERP feature fully functional — real CRUD, cross-module data flow, RBAC, barcode workflow, service search.

Work Log:
- Designed comprehensive Prisma schema (prisma/schema.prisma) with 20+ models covering all modules: Employee, Attendance, ShiftLog, Payroll, Warehouse, Component, Product, StockMovement, Assembly, Dispatch, Vendor, PurchaseOrder, Client, Income, Expense, Invoice, InvoiceItem, BillRun, WorkLog, ServiceHistory, SerialNumber, ScanLog, User, Role, Setting — all with proper relations.
- Pushed schema to SQLite + wrote seed script (prisma/seed.ts) with realistic Home Automation data (8 employees, 8 components, 6 products, 6 serials, 6 vendors, 5 clients, 6 POs, 5 dispatches, income/expenses/invoices/bill-runs, work logs, 5+ year service history, 3 roles + 5 users, 9 settings).
- Built entity registry (src/lib/erp/entities.ts) — single source of truth describing every entity's fields, types, relations, defaults, derived values, permission module. Drives both API and UI.
- Built generic CRUD API: src/app/api/erp/[entity]/route.ts (GET list with search/sort/pagination, POST create with side-effects) + [entity]/[id]/route.ts (GET/PUT/DELETE). Side-effects: dispatch reduces product stock + creates stock movement; PO receipt creates stock movement; paid invoice creates income.
- Built supporting APIs: /api/dashboard (live KPIs + 9-month income/expense + stock-by-category + assembly/dispatch trend), /api/scan (barcode lookup → serial + product + work logs + service history, logs every scan), /api/cash-flow (combined income/expense ledger with running balance), /api/service-search (multi-criteria: client/serial/employee/product/date-range/keyword), /api/current-user (RBAC), /api/relations (dropdown options for any entity).
- Built RBAC context (src/lib/erp/rbac-context.tsx) — fetches current user + permissions, hasPermission() helper, fail-open during load to avoid blocking initial fetches.
- Built generic EntityManager (src/components/erp/entity-manager.tsx) — table with search (debounced), sortable columns, pagination, create/edit Dialog with form validation, delete AlertDialog confirmation, toast feedback (sonner), loading skeletons, empty states, error states with retry, CSV export, RBAC-gated buttons (Add/Edit/Delete hidden by permission).
- Built EntityForm (src/components/erp/entity-form.tsx) — renders inputs by field type (text/number/email/date/datetime/select/textarea/relation), relation selects fetch options from /api/relations, validates required + email format.
- Built custom views: Dashboard (live charts + KPIs from /api/dashboard), CashFlow (live ledger), ServiceHistorySearch (6-filter search), BarcodeGenerator (pick serial or custom value, barcode/QR preview, print), Scan (input code → full product+history lookup), PrintLabels (8-label A4 sheet from live serials), Permissions (RBAC matrix editor — toggle view/create/edit/del/approve per module per role, saves to DB), Settings (key-value editor grouped by Application/Company/Preferences, upserts to DB).
- Built Reports views (5) — each fetches live data from its module's API and aggregates into metric cards (HR/Inventory/Procurement/Finance/Service).
- Wired ViewRouter to use EntityManager for all 22 table-driven routes + custom views for 14 routes.
- Updated AppSidebar to filter modules by RBAC permission (view).
- Updated TopBar to show current user (avatar + name + email + role) via RBAC context.
- Updated layout to wrap with QueryProvider (TanStack Query) + RbacProvider + ThemeProvider + SonnerToaster.
- Fixed bugs: coerce() returned null for empty number/text fields but schema requires non-null (salary, email) → now returns 0 for numbers, "" for text; relations API used wrong label field → now picks name>sku>code; formatCell didn't resolve nested relation objects → now prefers nested object under key-without-Id; openEdit didn't extract relation id from row → fixed; RBAC hasPermission returned false during load blocking queries → now fail-open during load.

Stage Summary:
- Every module is now fully functional with real CRUD against a SQLite database.
- Cross-module flows verified: Product qty decremented on dispatch creation (242→237); invoice status→Paid creates income entry; PO receipt creates stock movement; barcode scan returns product + work logs + service history.
- RBAC enforced on UI (Add/Edit/Delete buttons gated by permission; sidebar modules filtered by view permission) and editable via Permissions matrix.
- Search (debounced), sort (clickable headers), pagination, CSV export all work.
- Toast feedback for create/update/delete success + error.
- Loading skeletons, empty states, error states with retry all implemented.
- Lint clean. Dev server returns 200 across all endpoints.

---
Task ID: 3
Agent: main
Task: Implement login & role-based user authentication.

Work Log:
- Added 4 new roles to seed: HR, Inventory Manager, Finance, Technician (each with module-level view/create/edit/del/approve permissions tailored to that role). Added password hashes (SHA-256 of "password123") to all 7 seeded users. Re-seeded the database.
- Built /api/login (POST) — verifies email+password against DB, checks account status (Locked/Disabled rejected), updates lastLogin, returns user+permissions+session token. Returns 401 for invalid creds, 403 for locked/disabled.
- Built /api/session (GET) — validates session token+userId, returns current user+permissions or 401. Used by AuthProvider to verify persisted sessions.
- Built /api/logout (POST) — symmetric endpoint for server-side session invalidation (client clears sessionStorage).
- Built AuthContext (src/lib/erp/auth-context.tsx) — replaces the old RbacContext. Provides: user, permissions, loading, isAuthenticated, login(), logout(), refresh(), hasPermission(). Session persisted in sessionStorage (survives reload, cleared on logout). On mount, verifies the persisted session against /api/session. Super Admin role grants all permissions.
- Built professional LoginScreen (src/components/erp/login-screen.tsx) — split design with dark brand panel (features list) + white form panel. Email + password fields with icons, show/hide password toggle, validation (required, email format, min password length), error alert for invalid creds, loading state with spinner, "Forgot password?" hint, 6 demo account quick-fill buttons, password hint.
- Updated ErpShell as auth gate: shows loading spinner while session verifies → shows LoginScreen if unauthenticated → shows ERP if authenticated. Resets route to dashboard when user changes (prevents landing on unauthorized route from previous session).
- Added route guard in ViewRouter: extracts module id from route, checks hasPermission(module, "view"), renders AccessDenied card with "Back to Dashboard" button if denied. Prevents unauthorized access even if route state is manipulated.
- Updated TopBar account menu: shows user name, email, role; added "Sign out" menu item (red, with LogOut icon) that calls logout().
- Updated layout to wrap with AuthProvider (replaced RbacProvider). Aliased useRbac = useAuth for backward compatibility with existing components.
- Added error handling to /api/erp/[entity] GET: if sort field is invalid for the model, retries without sorting instead of returning 500.

Stage Summary:
- Complete auth flow: Open ERP → Login → Enter Email+Password → Authenticate → Role Check → Dashboard.
- Unauthenticated users see only the login screen — cannot access the dashboard or any module.
- Session persists across reloads (sessionStorage). Logout clears session and returns to login.
- Role-based access enforced at 3 levels: (1) sidebar filters modules by view permission, (2) ViewRouter route guard blocks unauthorized routes with AccessDenied screen, (3) EntityManager hides Add/Edit/Delete buttons by create/edit/del permissions.
- 6 demo accounts with different roles: Admin (full), HR (HRM only), Finance (Finance+Procurement), Inventory Manager (Inventory+Procurement+Barcode), Technician (Service+Barcode+Inventory view), Prod. Mgr (Inventory+Service+HRM view). All use password "password123".
- Browser-verified: login with correct creds → dashboard; wrong password → "Invalid email or password"; locked account → "account is locked"; Admin sees all 10 modules; HR sees only Dashboard+HRM+Reports+Settings; Finance sees Dashboard+Procurement+Finance+Reports+Settings; Technician sees Dashboard+Inventory+Service+Barcode+Reports+Settings; route guard shows "Access Restricted" for unauthorized modules; logout returns to login; session persists across reload.
