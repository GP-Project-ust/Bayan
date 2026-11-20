# BAYAN — PREMIUM UI/UX REDESIGN REPORT
## Enterprise Design System & Complete Frontend Visual Transformation
### Stage A: Design System Foundation

**Author:** Bayan Senior Product Design & Frontend Architecture Team  
**Date:** November 19, 2026  
**Branch:** `Mohammed-Alshareef`  
**Scope:** Stage A — Design Tokens Architecture, Arabic Typography, Shared Component Modernization, Global Layout & Navigation  
**Build Status:** Production Build Ready (53/53 Routes) | **Tests:** 338/338 Passing (100%) | **RBAC:** 18/18 Checks Passing (100%)

---

## 1. Executive Summary

Bayan has evolved into a premier enterprise AI Business Intelligence platform designed for universities and higher education institutions. This document establishes the official design system foundation and records the execution of **Stage A: Design System Foundation** under the comprehensive UI/UX Redesign roadmap.

### 1.1 Core Objectives Achieved in Stage A
1. **Unified Design Tokens**: Established a full spectrum of enterprise design tokens (`src/styles/bayan-tokens.css` and `src/lib/bayan-tokens.ts`) encompassing institutional deep navy, refined teal, warm amber/gold, crisp slate neutrals, semantic feedback states, multi-layered shadows, micro-radii, and 4px baseline grid dimensions.
2. **Resilient Arabic Typography & RTL Engineering**: Implemented an offline-safe Arabic typography stack prioritizing high-readability system fonts (`IBM Plex Sans Arabic`, `Noto Sans Arabic`, `Cairo`, `Segoe UI`), enforced strict normal letter-spacing to safeguard Arabic ligatures, applied generous line-heights (1.35 headings / 1.7 body), and isolated SQL and code snippets into strict LTR monospace containers.
3. **Enterprise Shared UI Component Library**: Upgraded the `src/components/ui/` component suite (`Button`, `Card`, `Badge`, `Input`, `Select`, `Textarea`, `DataTable`, `Dialog`, `Drawer`, `Toast`) with glassmorphic overlays, micro-transitions, accessibility attributes, and high-visibility focus indicators. Introduced new enterprise components: `StatCard`, `PageHeader`, and `Breadcrumbs`.
4. **Global Layout & Navigation Refinements**: Modernized `AppShell.tsx`, `PlatformSidebar.tsx`, and `TopBar.tsx` with glassmorphic headers, active gold/teal pills, subtle hover elevations, and responsive drawer transitions.
5. **Strict Architectural Integrity**: Preserved 100% of existing functional RBAC policies, route structures, and protected file contracts (including the SHA-256 checksums verified by `tests/contracts/system-health.test.mjs`).

---

## 2. Design Tokens Architecture

The design tokens are declared as CSS custom properties in `src/styles/bayan-tokens.css` and mirrored as TypeScript constants in `src/lib/bayan-tokens.ts`. All legacy `--bayan-*` variables are preserved for full backward compatibility.

### 2.1 Color Palette Specifications

| Token Family | Key Tokens | Hex Values | Role & Application |
| :--- | :--- | :--- | :--- |
| **Deep Institutional Navy** | `--bayan-navy-950`<br>`--bayan-navy-900`<br>`--bayan-navy-800` | `#061527`<br>`#0A2342`<br>`#123255` | Primary brand identity, dark sidebars, elevated modal surfaces, authoritative contrast. |
| **Refined Institutional Teal** | `--bayan-teal-700`<br>`--bayan-teal-600`<br>`--bayan-teal-500` | `#007681`<br>`#008B96`<br>`#00A6B2` | Primary interactive buttons, accent indicators, active selection glows, link hovers. |
| **Warm Institutional Gold** | `--bayan-gold-600`<br>`--bayan-gold-500`<br>`--bayan-gold-400` | `#B5811A`<br>`#D29E2C`<br>`#E3B34C` | Academic excellence accents, verified status badges, platform governance highlights. |
| **Crisp Slate Neutrals** | `--bayan-slate-900`<br>`--bayan-slate-600`<br>`--bayan-slate-300`<br>`--bayan-slate-100`<br>`--bayan-slate-50` | `#0F172A`<br>`#475569`<br>`#CBD5E1`<br>`#F1F5F9`<br>`#F8FAFC` | Primary text, secondary metadata, crisp borders, subtle dividers, page app background. |
| **Success Feedback** | `--bayan-feedback-success`<br>`--bayan-feedback-success-bg` | `#059669`<br>`#ECFDF5` | Query execution success, connected data sources, active accounts. |
| **Warning Feedback** | `--bayan-feedback-warning`<br>`--bayan-feedback-warning-bg` | `#D97706`<br>`#FFFBEB` | Degradation warnings, draft state notices, permission overrides. |
| **Danger Feedback** | `--bayan-feedback-danger`<br>`--bayan-feedback-danger-bg` | `#DC2626`<br>`#FEF2F2` | Execution failures, deletion dialogs, invalid inputs, access denied. |
| **Info Feedback** | `--bayan-feedback-info`<br>`--bayan-feedback-info-bg` | `#2563EB`<br>`#EFF6FF` | Educational tips, audit details, session information. |

### 2.2 Elevation & Shadow Hierarchy

Modern enterprise software requires subtle, multi-layered shadows combining key directional light with ambient occlusion:

```css
--bayan-shadow-xs: 0 1px 2px 0 rgba(15, 23, 42, 0.05);
--bayan-shadow-sm: 0 1px 3px 0 rgba(15, 23, 42, 0.07), 0 1px 2px -1px rgba(15, 23, 42, 0.05);
--bayan-shadow-md: 0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04);
--bayan-shadow-lg: 0 10px 24px -4px rgba(15, 23, 42, 0.10), 0 4px 10px -3px rgba(15, 23, 42, 0.05);
--bayan-shadow-xl: 0 20px 32px -6px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.06);
--bayan-shadow-card: 0 1px 3px rgba(10, 35, 66, 0.04), 0 6px 16px -2px rgba(10, 35, 66, 0.06);
--bayan-shadow-card-hover: 0 4px 8px rgba(10, 35, 66, 0.06), 0 12px 28px -4px rgba(10, 35, 66, 0.10);
```

### 2.3 Radii & Control Heights

- **Control Heights**: Small `36px` (`--bayan-size-control-sm`), Medium `42px` (`--bayan-size-control-md`), Large `48px` (`--bayan-size-control-lg`).
- **Corner Radii**: Extra Small `4px`, Small `6px`, Medium `10px`, Large `14px`, Extra Large `20px`, Pill `9999px`.
- **Focus Rings**: `0 0 0 3px rgba(0, 166, 178, 0.28)` with `outline-offset: 2px` across all interactive elements.

---

## 3. Arabic Typography System & RTL Engineering Rules

### 3.1 Resilient Font Stack (Offline-Safe)
Bayan operates in secure enterprise and campus environments that may restrict external internet access or CDN font loading. The font stack prioritizes high-quality Arabic system fonts:

```css
--bayan-font-sans: "IBM Plex Sans Arabic", "Noto Sans Arabic", "Cairo", "Segoe UI", -apple-system, BlinkMacSystemFont, Arial, sans-serif;
--bayan-font-mono: "JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, "Courier New", monospace;
```

### 3.2 Arabic Ligature & Letter-Spacing Invariant
In Arabic typography, letter spacing must NEVER be expanded (`letter-spacing: normal !important`). Expanding letter-spacing disconnects cursive Arabic glyphs and produces broken typography:
```css
body :is(h1, h2, h3, h4, h5, h6, p, span, label, button, a, input, select, textarea) {
  letter-spacing: normal !important;
}
```

### 3.3 Monospace & SQL Code Block Isolation
SQL statements, JSON payloads, and system traces require strict LTR isolation with monospace fonts and horizontal scrolling:
```css
.sql-code, .bayan-code-panel pre, pre, code, .code-editor, [data-code-block] {
  font-family: var(--bayan-font-mono) !important;
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
  tab-size: 2;
  overflow-x: auto;
}
```

### 3.4 Tabular Figures for Numbers
Numbers embedded inside Arabic RTL sentences use tabular numerals to prevent layout shift:
```css
.num, [data-numeric] {
  direction: ltr;
  unicode-bidi: embed;
  font-variant-numeric: tabular-nums;
  display: inline-block;
}
```

---

## 4. Modernized Shared Component Library (`src/components/ui/`)

All reusable UI components are encapsulated under the `.bui` namespace in `src/components/ui/ui.css`.

### 4.1 Component Inventory

| Component | Modernization Enhancements | Supported Variants / Sizes |
| :--- | :--- | :--- |
| **`Button`** | Gradient fills, micro-interaction scale press (`:active { transform: scale(0.985); }`), accessible loading spinner, leading/trailing icon alignment. | `primary`, `secondary`, `outline`, `ghost`, `danger`<br>`sm` (36px), `md` (42px), `lg` (48px) |
| **`Card`** | Multi-layer ambient card shadow, subtle border (`#E2E8F0`), refined head/content/foot separation, hover elevation option. | Standard, Hoverable, Subtle |
| **`Badge`** | Soft tinted backgrounds, 1px semi-transparent borders, bold Arabic typography, pill radius. | `neutral`, `success`, `warning`, `danger`, `info` |
| **`Input`** | 10px rounded corners, brand turquoise focus ring with 20% alpha glow, proper RTL icon start-padding (42px), accessible error state. | `sm` (36px), `md` (42px), `lg` (48px) |
| **`Select`** | Custom down-chevron arrow positioned at physical left (RTL end: 14px), seamless focus glow, option list styling. | `md` (42px) |
| **`Textarea`** | Smooth vertical resize, identical focus glow to input, generous padding. | Configurable rows / min-height 96px |
| **`DataTable`** | Rounded shell (`border-radius: 14px`), sticky header in `#F8FAFC`, subtle `#F1F5F9` row dividers, alternating row hover highlight, horizontal scroller with keyboard focus, accessible empty state illustration. | Generic typed `<T>` table |
| **`Dialog`** | Backdrop blur (`backdrop-filter: blur(8px); background: rgba(6, 21, 39, 0.55)`), smooth fade + scale animation, modal focus trap, header close button, sticky footer actions. | Accessible modal dialog |
| **`Drawer`** | Accessible off-canvas slide-in animation, RTL start/end alignment, full-height backdrop blur. | End (RTL Left) / Start (RTL Right) |
| **`Toast`** | Colored 4px indicator border, alert status role, dismiss button, elevated shadow. | `success`, `warning`, `danger`, `info` |

### 4.2 New Enterprise Primitives

1. **`StatCard` (`src/components/ui/StatCard.tsx`)**:
   - Reusable KPI/metric widget for enterprise dashboards.
   - Features: Icon badge container, label, bold metric display (`28px` bold with tabular figures), optional trend badge or description footer.
   - Hover transition: Micro-elevation (`translateY(-2px)`) with teal border accent.
2. **`PageHeader` (`src/components/ui/PageHeader.tsx`)**:
   - Standardized page header component ensuring layout consistency across all 42 registered screens.
   - Features: Title with optional status badge, subtitle description, integrated breadcrumb trail, and right-aligned action buttons.
3. **`Breadcrumbs` (`src/components/ui/Breadcrumbs.tsx`)**:
   - RTL-aware breadcrumb navigation trail with Arabic chevron separators (`<ChevronLeft size={14} />`).
   - Accessible `aria-label="مسار التنقل"` and `aria-current="page"`.

---

## 5. Global Layout & Navigation Refinements

### 5.1 AppShell & Navigation Architecture
- **Desktop Sidebar (`body .app-sidebar`)**:
  - Upgraded to a deep rich gradient: `linear-gradient(160deg, #061527 0%, #0A2342 60%, #0E2A4D 100%)`.
  - Subtle physical left border: `1px solid rgba(226, 232, 240, 0.08)`.
  - Ambient shadow: `-4px 0 24px rgba(6, 21, 39, 0.22)`.
  - Nav items: 10px rounded pills with smooth hover transition (`all 0.18s cubic-bezier(0.16, 1, 0.3, 1)`).
  - Active nav item: Teal gradient with `border-inline-start: 3px solid #00A6B2`, glowing shadow, and bold white text.
  - "محادثة جديدة" (New Chat) Button: Rich teal gradient with hover lift (`translateY(-1px)`) and glowing elevation.
- **TopBar (`body .topbar`)**:
  - Glassmorphic header: `background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(12px)`.
  - Bottom border: `1px solid var(--bayan-border-subtle)`.
  - User menu: Refined hover state (`#F1F5F9`), avatar badge with user label.
  - Notifications: Refined button with active notification dot.
- **Mobile Responsive Drawer (<= 900px)**:
  - Accessible off-canvas sliding drawer with inert background containment (`inert={compact && menuOpen}`).
  - Accessible skip link (`#bayan-main-content`) for screen readers and keyboard power users.

### 5.2 Protection of Reference Hashes
The contract test `tests/contracts/system-health.test.mjs` verifies SHA-256 hashes of approved reference files against `docs/SCREEN_28_REFERENCE_HASHES.json`.
- `Sidebar.tsx`: **UNCHANGED** (`cf8fd10e709c5222f24ab8c540b6e18a7427f945709ecac439a1ec519e9f5511`).
- `app/globals.css`: **UNCHANGED** (`1716690a2cb293a5a660416b672590e013c2d65fa7f5992f0b36a3275ec30de7`).
- `components/ChatView.tsx`: **UNCHANGED** (`b532280cc6d5188285cd15be7d494530de778add61297bdc15bc3e5b2a63336e`).
- `components/AdminDashboard.tsx`: **UNCHANGED** (`d190b698fb2aa4a817d3e62ab23d3c0655f1edb57bef9f3acaf64761fea004b8`).
- `app/page.tsx`: **UNCHANGED** (`7632d9e06b222ec4d279cbec71edc66238b301d80788bc147a70d11c10968831`).
- `app/admin/page.tsx`: **UNCHANGED** (`1e71831de8c561bda1523fadf50d684da1517a5b210006f317410d316ae0c40f`).
- `lib/access/policy.ts`: **UNCHANGED** (`74ec3b7f9cdbb4d05cd3d0e678574f1e97301a8056200e21857a35d5a8c104fb`).
- `lib/screen-catalog.json`: **UNCHANGED** (`523e48f2c0f174ec28cfb13590c493b7ad012df6a12527cbd8b4b3e47a3cdd5b`).

All visual enhancements are implemented additively through the CSS cascade (`bayan-tokens.css`, `bayan-responsive.css`, `ui.css`, and shared UI components), achieving zero contract violations.

---

## 6. Verification & Test Matrix

The entire frontend validation pipeline was executed to confirm complete stability:

| Verification Suite | Command | Execution Result | Details |
| :--- | :--- | :--- | :--- |
| **Final Project Checks** | `npm run check:final` | **PASS (338/338)** | 42/42 catalog routes verified, 100% route coverage, all contract assertions passed. |
| **RBAC Functional Audit** | `node scripts/audit-rbac-functional.mjs` | **PASS (18/18)** | User CRUD, custom roles, ALLOW/DENY evaluation precedence, platform segregation. |
| **TypeScript Typecheck** | `npm run lint` (`tsc --noEmit`) | **PASS (0 errors)** | Full strict type check across all source files, components, and pages. |
| **Next.js Production Build** | `npm run build` | **PASS (53/53 routes)** | All static and dynamic routes compiled, prerendered, and bundled without error. |
| **Dev Server Runtime** | `npm run dev` | **READY (port 3000)** | Development server running on `http://localhost:3000`. |

---

## 7. Next Stage Transition Plan

Stage A is complete and verified. The roadmap transitions to **Stage B: Core Product Experience**:

- **Stage B Targets**:
  1. Main Dashboard & Chat Workspace (`/`, `/prototype-chat`, `/conversations`).
  2. Conversation Details Screen (`/conversations/[id]`).
  3. SQL Query Results, Data Tables, and Code Views.
  4. Agent Traces and Trace Details (`/admin/agent-traces`, `/admin/agent-traces/details`).
- **Prerequisite**: User review and approval of Stage A foundation before beginning Stage B edits.
