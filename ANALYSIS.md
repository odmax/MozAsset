# Asset Management System - Technical Documentation

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Browser   │  │   Mobile    │  │    Tablet   │  │    Other    │  │
│  └──────┬──────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 14 App Router                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │  React 18    │  │  TailwindCSS │  │  shadcn/ui    │          │   │
│  │  │  Components  │  │  Styles      │  │  Components   │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          SERVER LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js API / Server Actions                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │  Auth.js     │  │  Server      │  │  API Routes  │          │   │
│  │  │  (JWT/Sess)  │  │  Actions     │  │              │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL Database                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │   Prisma     │  │    Tables    │  │   Migrations │          │   │
│  │  │   ORM        │  │              │  │              │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Architecture Patterns

#### Pattern: Next.js App Router with Server Components
- **Default**: Server Components for data fetching
- **Interactivity**: Client Components for forms and user interactions
- **Server Actions**: Direct mutations without API routes

```
Request Flow:
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌─────────┐
│ Browser │───▶│ Next.js  │───▶│ Server    │───▶│ Prisma  │
│         │    │ Router   │    │ Action    │    │ Query   │
└─────────┘    └──────────┘    └───────────┘    └─────────┘
     │             │                                    │
     │             ▼                                    ▼
     │        ┌──────────┐                        ┌─────────┐
     │        │ Session  │◀───────────────────────│ Postgres│
     │        │ (JWT)    │                        │  DB    │
     │        └──────────┘                        └─────────┘
     │             │
     ▼             ▼
┌─────────┐   ┌──────────┐
│  React  │◀──│   Auth   │
│   UI    │   │ Provider │
└─────────┘   └──────────┘
```

### 1.3 Component Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                    Server Components (RSC)                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  DashboardLayout ──── renders Sidebar + Page Content     │    │
│  │         │                       │                        │    │
│  │         ▼                       ▼                        │    │
│  │  Sidebar (Client)         Page.tsx (Server)              │    │
│  │         │                       │                        │    │
│  │         │                       ▼                        │    │
│  │         │              Data Fetching (Prisma)            │    │
│  └─────────┼─────────────────────────────────────────────────┘    │
│            │                                                      │
└────────────┼──────────────────────────────────────────────────────┘
             │ Client ↔ Server Interaction
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Client Components                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  AssetForm    │  │  AssetList    │  │  Filters     │        │
│  │  (useForm)    │  │  (useState)   │  │  (useEffect) │        │
│  └──────┬───────┘  └──────────────┘  └──────────────┘        │
│         │                                                         │
│         ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Server Actions                              │ │
│  │  createAsset() | updateAsset() | deleteAsset() | etc.       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        CREATE OPERATION                           │
│  User Input ──▶ Form Validation ──▶ Server Action ──▶ Prisma ──▶ DB
│     │               │                    │                        │
│     ▼               ▼                    ▼                        │
│  React Hook   Zod Schema          Audit Log                      │
│  Form         Validation          Creation                       │
│     │                                │                           │
│     └────────────────────────────────┼───────────────────────────┘
│                                      │
│                                      ▼
│                              revalidatePath()
│                                      │
└──────────────────────────────────────┴──────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        READ OPERATION                             │
│  Page Load ──▶ Server Component ──▶ Prisma Query ──▶ DB         │
│     │                  │                                        │
│     │                  ▼                                        │
│     │         Data Transformation                                │
│     │                  │                                        │
│     │                  ▼                                        │
│     │            React Props                                    │
│     │                  │                                        │
└─────┴──────────────────┴────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       UPDATE OPERATION                            │
│  User Input ──▶ Form Validation ──▶ Server Action ──▶ Prisma    │
│     │               │                    │                      │
│     ▼               ▼                    ▼                      │
│  React Hook   Zod Schema          Audit Log                     │
│  Form         Validation          Creation                      │
│     │                                │                          │
│     └────────────────────────────────┼──────────────────────────┘
│                                      │
│                                      ▼
│                              revalidatePath()
│                                      │
└──────────────────────────────────────┴────────────────────────────┘
```

---

## 2. Folder Structure

```
asset-management-system/
│
├── prisma/                           # Database Layer
│   ├── schema.prisma                 # Database schema definition
│   └── seed.ts                       # Database seeding script
│
├── src/                              # Application Source Code
│   │
│   ├── app/                          # Next.js App Router
│   │   │
│   │   ├── api/                      # API Routes (if needed)
│   │   │   └── auth/                 # NextAuth.js handlers
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   │
│   │   ├── dashboard/                # Protected Dashboard Area
│   │   │   │
│   │   │   ├── layout.tsx            # Dashboard layout (auth check, sidebar)
│   │   │   ├── page.tsx              # Dashboard home (analytics)
│   │   │   │
│   │   │   ├── assets/               # Asset Management Module
│   │   │   │   ├── page.tsx          # Asset list with filters
│   │   │   │   ├── new/page.tsx      # Create asset form
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx      # Asset detail view
│   │   │   │   │   ├── edit/page.tsx # Edit asset form
│   │   │   │   │   ├── assign/page.tsx    # Assign asset
│   │   │   │   │   ├── transfer/page.tsx  # Transfer asset
│   │   │   │   │   ├── maintenance/page.tsx # Add maintenance
│   │   │   │   │   └── retire/page.tsx     # Retire/dispose
│   │   │   │   └── actions.ts       # Asset server actions
│   │   │   │
│   │   │   ├── categories/           # Category Management
│   │   │   │   ├── page.tsx          # Category list
│   │   │   │   ├── new/page.tsx      # Create category
│   │   │   │   └── [id]/
│   │   │   │       └── edit/page.tsx # Edit category
│   │   │   │
│   │   │   ├── departments/          # Department Management
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── edit/page.tsx
│   │   │   │
│   │   │   ├── locations/             # Location Management
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── edit/page.tsx
│   │   │   │
│   │   │   ├── vendors/               # Vendor Management
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── edit/page.tsx
│   │   │   │
│   │   │   ├── users/                 # User Management
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── edit/page.tsx
│   │   │   │
│   │   │   └── audit-logs/            # Audit Log Viewer
│   │   │       └── page.tsx
│   │   │
│   │   ├── login/                     # Public Login Page
│   │   │   └── page.tsx
│   │   │
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Root redirect
│   │   ├── globals.css                # Global styles + CSS vars
│   │   └── globals.css
│   │
│   ├── components/                    # React Components
│   │   │
│   │   ├── ui/                        # shadcn/ui Base Components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── popover.tsx
│   │   │   └── form.tsx
│   │   │
│   │   ├── layout/                    # Layout Components
│   │   │   └── sidebar.tsx            # Responsive sidebar navigation
│   │   │
│   │   └── dashboard/                 # Dashboard-Specific Components
│   │       ├── asset-form.tsx         # Asset CRUD form
│   │       ├── asset-list.tsx          # Asset table with pagination
│   │       ├── asset-filters.tsx      # Search/filter controls
│   │       ├── asset-detail.tsx        # Asset detail view
│   │       ├── assign-form.tsx         # Assign asset form
│   │       ├── transfer-form.tsx       # Transfer asset form
│   │       ├── maintenance-form.tsx    # Maintenance form
│   │       ├── retire-form.tsx         # Retire/dispose form
│   │       ├── category-form.tsx       # Category form
│   │       ├── department-form.tsx    # Department form
│   │       ├── location-form.tsx       # Location form
│   │       ├── vendor-form.tsx         # Vendor form
│   │       └── user-form.tsx           # User form
│   │
│   ├── lib/                           # Library & Utilities
│   │   ├── auth.ts                    # NextAuth.js configuration
│   │   ├── prisma.ts                  # Prisma client singleton
│   │   ├── utils.ts                   # Utility functions
│   │   ├── validations.ts             # Zod schemas
│   │   └── actions.ts                 # Shared server actions
│   │
│   └── types/                         # TypeScript Types
│       └── index.ts                   # Shared type definitions
│
├── .env.example                       # Environment template
├── .env                               # Environment (gitignored)
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript config
├── tailwind.config.ts                 # Tailwind config
├── postcss.config.mjs                 # PostCSS config
├── next.config.mjs                    # Next.js config
└── README.md                          # Documentation
```

### 2.1 Directory Responsibilities

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `prisma/` | Database schema & seeding | `schema.prisma`, `seed.ts` |
| `src/app/` | Next.js App Router pages | Pages, layouts, API routes |
| `src/components/ui/` | Base UI components | 21 shadcn/ui components |
| `src/components/layout/` | Layout components | Sidebar navigation |
| `src/components/dashboard/` | Feature components | Forms, lists, detail views |
| `src/lib/` | Core libraries | Auth, Prisma, utils, validations, actions |
| `src/types/` | TypeScript definitions | Shared types |

---

## 3. Prisma Models

### 3.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     User        │       │   Department    │       │    Category     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │       │ id              │
│ name            │◀──┐   │ name            │       │ name      (U)   │
│ email      (U)  │   │   │ code       (U)  │       │ description     │
│ password        │   │   │ description     │       │ icon            │
│ role            │   │   │ managerId       │       │ createdAt       │
│ departmentId ────┼───┘   │ createdAt       │       │ updatedAt       │
│ isActive        │       │ updatedAt       │       └────────┬────────┘
│ createdAt       │       └────────┬────────┘                │
│ updatedAt       │                │                         │
└────────┬────────┘                │                         │
         │                         ▼                         ▼
         │    ┌─────────────────┬─────────────┬─────────────────┐
         │    │                 │             │                 │
         │    │     ┌───────────▼────┐    ┌────▼───────────┐   │
         │    │     │    Location    │    │     Vendor     │   │
         │    │     ├─────────────────┤    ├─────────────────┤   │
         │    │     │ id              │    │ id              │   │
         │    │     │ name            │    │ name      (U)   │   │
         │    │     │ address         │    │ contactName    │   │
         │    │     │ building        │    │ email           │   │
         │    │     │ floor           │    │ phone           │   │
         │    │     │ room            │    │ address         │   │
         │    │     │ departmentId ────┼───│ website         │   │
         │    │     │ createdAt       │    │ notes           │   │
         │    │     │ updatedAt       │    │ createdAt       │   │
         │    │     └─────────────────┘    │ updatedAt       │   │
         │    │                             └────────┬────────┘   │
         │    │                                      │           │
         ▼    │                                      │           │
┌────────┴─────┴──────────────────────────────────────┴───────────┴┐
│                            Asset                                  │
├──────────────────────────────────────────────────────────────────┤
│ id              │ categoryId        │ vendorId                  │
│ assetTag    (U) │ locationId        │ purchaseDate              │
│ name            │ departmentId       │ purchaseCost              │
│ description     │ assignedToId      │ warrantyExpiry            │
│ serialNumber    │ status            │ notes                     │
│ model           │ condition         │ createdAt                 │
│ brand           │                   │ updatedAt                 │
└────────┬────────┴───────────────────┴───────────────────────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌─────────────────┐               ┌─────────────────────┐
│AssetAssignment  │               │   AssetTransfer      │
├─────────────────┤               ├─────────────────────┤
│ id              │               │ id                   │
│ assetId    (FK) │               │ assetId        (FK)  │
│ userId          │               │ fromDepartmentId     │
│ assignedBy      │               │ toDepartmentId       │
│ assignedAt      │               │ fromLocationId       │
│ returnedAt      │               │ toLocationId         │
│ notes           │               │ fromUserId           │
└─────────────────┘               │ toUserId             │
                                   │ transferredBy        │
┌─────────────────┐               │ transferredAt         │
│  Maintenance    │               │ notes                │
├─────────────────┤               └─────────────────────┘
│ id              │
│ assetId    (FK) │
│ type            │
│ description     │               ┌─────────────────────┐
│ performedBy     │               │    CheckInOut        │
│ performedAt     │               ├─────────────────────┤
│ cost            │               │ id                   │
│ vendorId        │               │ assetId        (FK)  │
│ nextDueDate     │               │ userId               │
│ status          │               │ type                 │
│ notes           │               │ checkedAt             │
│ createdAt       │               │ notes                │
│ updatedAt       │               │ condition            │
└─────────────────┘               │ createdAt            │
                                   └─────────────────────┘

┌─────────────────┐
│    AuditLog     │
├─────────────────┤
│ id              │
│ action          │──────────────▶ Enum: CREATE, UPDATE, DELETE,
│ entityType      │               ASSIGN, TRANSFER, CHECK_IN,
│ entityId        │               CHECK_OUT, MAINTENANCE, RETIRE,
│ assetId    (FK) │               DISPOSE
│ userId     (FK) │
│ changes    (J)  │
│ metadata   (J)  │
│ ipAddress       │
│ userAgent       │
│ createdAt       │
└─────────────────┘

┌─────────────────────────────────────────────────┐
│              NextAuth Support Tables             │
├─────────────────────────────────────────────────┤
│              Account (OAuth)                     │
│              Session                             │
│              VerificationToken                   │
└─────────────────────────────────────────────────┘
```

### 3.2 Model Definitions

#### Core Entities

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | System users with roles | id, name, email, password, role, departmentId, isActive |
| **Asset** | Main asset entity | assetTag, name, serialNumber, model, brand, status, condition |
| **Category** | Asset classification | name, description, icon |
| **Department** | Organizational units | name, code, description, managerId |
| **Location** | Physical locations | name, address, building, floor, room, departmentId |
| **Vendor** | Suppliers | name, contactName, email, phone, website |

#### Asset Lifecycle Entities

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **AssetAssignment** | User assignments | assetId, userId, assignedBy, assignedAt, returnedAt |
| **AssetTransfer** | Location/department transfers | assetId, from/to department/location/user |
| **Maintenance** | Service records | assetId, type, description, cost, performedBy |
| **CheckInOut** | Physical check-in/out | assetId, userId, type, condition |

#### Supporting Entities

| Model | Purpose |
|-------|---------|
| **AuditLog** | Activity tracking for all entities |
| **Account** | OAuth provider accounts |
| **Session** | User sessions |
| **VerificationToken** | Email verification tokens |

### 3.3 Enumerations

```prisma
enum Role {
  SUPER_ADMIN        // Full system access
  ASSET_MANAGER     // Manage assets and reference data
  DEPARTMENT_MANAGER // Manage department assets
  EMPLOYEE          // View and check-in/out assets
}

enum AssetStatus {
  AVAILABLE  // Ready to assign
  ASSIGNED   // Currently assigned
  IN_REPAIR  // Under maintenance
  RETIRED    // No longer in use
  DISPOSED   // Removed from inventory
  LOST       // Cannot be located
}

enum AssetCondition {
  EXCELLENT   // Like new
  GOOD        // Minor wear
  FAIR        // Noticeable wear
  POOR        // Significant wear
  NEEDS_REPAIR // Requires service
}

enum AuditAction {
  CREATE      // New entity created
  UPDATE      // Entity modified
  DELETE      // Entity removed
  ASSIGN      // Asset assigned to user
  TRANSFER    // Asset moved
  CHECK_IN    // Asset returned
  CHECK_OUT   // Asset checked out
  MAINTENANCE // Service performed
  RETIRE      // Asset retired
  DISPOSE     // Asset disposed
}
```

### 3.4 Indexes

| Table | Indexes | Purpose |
|-------|---------|---------|
| User | email, departmentId | Fast user lookup |
| Asset | assetTag, name, status, categoryId, departmentId, assignedToId | Asset queries |
| Category | name | Category lookup |
| Department | name, code | Department queries |
| Location | departmentId, (name, departmentId) | Location queries |
| Vendor | name | Vendor lookup |
| AuditLog | action, (entityType, entityId), assetId, userId, createdAt | Audit queries |
| AssetAssignment | assetId, userId | Assignment history |
| AssetTransfer | assetId | Transfer history |
| Maintenance | assetId, performedBy | Maintenance history |
| CheckInOut | assetId, userId | Check-in/out history |

---

## 4. Implementation Phases

### Phase 1: Foundation (Completed)

**Duration**: Foundation setup
**Goal**: Project scaffolding and core infrastructure

#### 1.1 Project Setup
- [x] Initialize Next.js 14 project with TypeScript
- [x] Configure Tailwind CSS
- [x] Install dependencies:
  - NextAuth.js v5 (Auth.js)
  - Prisma ORM
  - shadcn/ui components
  - Zod validation
  - React Hook Form
  - Recharts
  - Lucide React icons
  - date-fns

#### 1.2 Database Schema
- [x] Design Prisma schema with all models
- [x] Define enumerations (Role, AssetStatus, AssetCondition, AuditAction)
- [x] Set up relationships and constraints
- [x] Add database indexes for performance
- [x] Create seed data script

#### 1.3 Authentication Infrastructure
- [x] Configure NextAuth.js with credentials provider
- [x] Set up session strategy (JWT)
- [x] Create auth.ts configuration
- [x] Set up Prisma adapter
- [x] Create login page
- [x] Implement session protection middleware

#### 1.4 Base UI Components
- [x] Install and configure shadcn/ui
- [x] Create 21 base components:
  - Button, Card, Input, Label, Select
  - Dialog, DropdownMenu, Table, Badge, Avatar
  - Tabs, Textarea, Toast, Tooltip, Separator
  - Progress, Skeleton, Checkbox, Sheet, Calendar, Popover
- [x] Configure Tailwind theme with CSS variables
- [x] Create global styles

---

### Phase 2: Core Infrastructure (Completed)

**Duration**: Dashboard shell and layout
**Goal**: Establish navigation and dashboard framework

#### 2.1 Dashboard Layout
- [x] Create dashboard layout component
- [x] Implement responsive sidebar navigation
- [x] Add role-based menu filtering
- [x] Create sign-out functionality
- [x] Set up mobile drawer (Sheet component)

#### 2.2 Page Structure
- [x] Dashboard home page
- [x] Login page
- [x] Redirect from root to dashboard

#### 2.3 Utility Functions
- [x] Create cn() utility (clsx + tailwind-merge)
- [x] Format currency function
- [x] Format date/time functions
- [x] Asset tag generator
- [x] User initials helper

---

### Phase 3: Asset Management (Completed)

**Duration**: Core feature implementation
**Goal**: Complete asset CRUD and lifecycle management

#### 3.1 Asset Server Actions
- [x] `getAssets()` - List with filtering, sorting, pagination
- [x] `getAsset()` - Single asset with relations
- [x] `createAsset()` - Create new asset
- [x] `updateAsset()` - Update existing asset
- [x] `deleteAsset()` - Remove asset
- [x] `assignAsset()` - Assign to user
- [x] `unassignAsset()` - Unassign from user
- [x] `transferAsset()` - Move to new location/department
- [x] `checkInAsset()` - Check in asset
- [x] `checkOutAsset()` - Check out asset
- [x] `retireAsset()` - Mark as retired
- [x] `disposeAsset()` - Mark as disposed
- [x] `addMaintenance()` - Record maintenance

#### 3.2 Asset Pages
- [x] Asset list page with filters
- [x] New asset form page
- [x] Asset detail page
- [x] Edit asset page
- [x] Assign asset page
- [x] Transfer asset page
- [x] Maintenance record page
- [x] Retire/dispose page

#### 3.3 Asset Components
- [x] AssetForm - Full CRUD form
- [x] AssetList - Table with pagination
- [x] AssetFilters - Search and filter controls
- [x] AssetDetail - View with tabs
- [x] AssignForm - User selection
- [x] TransferForm - Location/department selection
- [x] MaintenanceForm - Service record form
- [x] RetireForm - Retirement/disposal

---

### Phase 4: Reference Data Management (Completed)

**Duration**: Supporting modules
**Goal**: CRUD for categories, departments, locations, vendors

#### 4.1 Categories Module
- [x] Category list page (card view with asset count)
- [x] New category page
- [x] Edit category page
- [x] CategoryForm component
- [x] Server actions (CRUD)

#### 4.2 Departments Module
- [x] Department list page
- [x] New department page
- [x] Edit department page
- [x] DepartmentForm component
- [x] Server actions (CRUD)

#### 4.3 Locations Module
- [x] Location list page (table view)
- [x] New location page
- [x] Edit location page
- [x] LocationForm component
- [x] Server actions (CRUD)

#### 4.4 Vendors Module
- [x] Vendor list page (card view)
- [x] New vendor page
- [x] Edit vendor page
- [x] VendorForm component
- [x] Server actions (CRUD)

---

### Phase 5: User Management (Completed)

**Duration**: User administration
**Goal**: Complete user management for Super Admin

#### 5.1 Users Module
- [x] User list page (table view)
- [x] New user page
- [x] Edit user page
- [x] UserForm component
- [x] Server actions (CRUD)
- [x] Password hashing with bcrypt

---

### Phase 6: Analytics & Dashboard (Completed)

**Duration**: Reporting and visualization
**Goal**: Provide insights and overview

#### 6.1 Dashboard Statistics
- [x] Total assets count
- [x] Available assets count
- [x] Assigned assets count
- [x] In repair assets count
- [x] Retired assets count
- [x] Total asset value

#### 6.2 Charts (Recharts)
- [x] Assets by status (Pie chart)
- [x] Assets by department (Bar chart)
- [x] Assets by category (Bar chart)

#### 6.3 Alerts
- [x] Warranty expiration warning (30 days)

#### 6.4 Activity Feed
- [x] Recent audit log entries
- [x] Link to audit logs

---

### Phase 7: Audit & Compliance (Completed)

**Duration**: Logging and tracking
**Goal**: Complete audit trail

#### 7.1 Audit Logging
- [x] Automatic logging on all CRUD operations
- [x] Log all lifecycle actions (assign, transfer, etc.)
- [x] Store changes as JSON
- [x] Store metadata (timestamps, user info)

#### 7.2 Audit Log Viewer
- [x] Audit logs page
- [x] Paginated list view
- [x] Filter by action type
- [x] Show user, entity, asset, details

---

## 5. Role Permissions Matrix

| Feature | Super Admin | Asset Manager | Dept Manager | Employee |
|---------|:-----------:|:-------------:|:-------------:|:--------:|
| View Dashboard | ✓ | ✓ | ✓ | ✓ |
| View Assets | ✓ | ✓ | ✓ | ✓ |
| Create Assets | ✓ | ✓ | ✓ | ✗ |
| Edit Assets | ✓ | ✓ | ✓ | ✗ |
| Delete Assets | ✓ | ✓ | ✗ | ✗ |
| Assign Assets | ✓ | ✓ | ✓ | ✗ |
| Transfer Assets | ✓ | ✓ | ✓ | ✗ |
| Check-in/out | ✓ | ✓ | ✓ | ✓ |
| Add Maintenance | ✓ | ✓ | ✗ | ✗ |
| Retire/Dispose | ✓ | ✓ | ✗ | ✗ |
| Manage Categories | ✓ | ✓ | ✗ | ✗ |
| Manage Departments | ✓ | ✓ | ✗ | ✗ |
| Manage Locations | ✓ | ✓ | ✗ | ✗ |
| Manage Vendors | ✓ | ✓ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| View Audit Logs | ✓ | ✓ | ✗ | ✗ |

---

## 6. API Endpoints / Server Actions

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handlers |

### Server Actions (lib/actions.ts + assets/actions.ts)

| Action | Module | Purpose |
|--------|--------|---------|
| `getAssets()` | Assets | List with filters |
| `getAsset()` | Assets | Get single asset |
| `createAsset()` | Assets | Create asset |
| `updateAsset()` | Assets | Update asset |
| `deleteAsset()` | Assets | Delete asset |
| `assignAsset()` | Assets | Assign to user |
| `unassignAsset()` | Assets | Unassign |
| `transferAsset()` | Assets | Transfer |
| `checkInAsset()` | Assets | Check in |
| `checkOutAsset()` | Assets | Check out |
| `retireAsset()` | Assets | Retire |
| `disposeAsset()` | Assets | Dispose |
| `addMaintenance()` | Assets | Add maintenance |
| `getCategories()` | Categories | List |
| `createCategory()` | Categories | Create |
| `updateCategory()` | Categories | Update |
| `deleteCategory()` | Categories | Delete |
| `getDepartments()` | Departments | List |
| `createDepartment()` | Departments | Create |
| `updateDepartment()` | Departments | Update |
| `deleteDepartment()` | Departments | Delete |
| `getLocations()` | Locations | List |
| `createLocation()` | Locations | Create |
| `updateLocation()` | Locations | Update |
| `deleteLocation()` | Locations | Delete |
| `getVendors()` | Vendors | List |
| `createVendor()` | Vendors | Create |
| `updateVendor()` | Vendors | Update |
| `deleteVendor()` | Vendors | Delete |
| `getUsers()` | Users | List |
| `createUser()` | Users | Create |
| `updateUser()` | Users | Update |
| `deleteUser()` | Users | Delete |
| `getAuditLogs()` | Audit | List |

---

## 7. Validation Schemas (Zod)

| Schema | Fields Validated |
|--------|-----------------|
| `assetFormSchema` | assetTag, name, description, serialNumber, model, brand, status, condition, categoryId, locationId, departmentId, assignedToId, vendorId, purchaseDate, purchaseCost, warrantyExpiry, notes |
| `userFormSchema` | name, email, password, role, departmentId, isActive |
| `categoryFormSchema` | name, description, icon |
| `departmentFormSchema` | name, code, description, managerId |
| `locationFormSchema` | name, address, building, floor, room, departmentId |
| `vendorFormSchema` | name, contactName, email, phone, address, website, notes |
| `transferFormSchema` | toDepartmentId, toLocationId, toUserId, notes |
| `maintenanceFormSchema` | type, description, cost, vendorId, nextDueDate, notes |

---

## 8. Dependencies Summary

### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2.18 | Framework |
| react | 18.3.1 | UI Library |
| @prisma/client | 5.22.0 | Database ORM |
| next-auth | 5.0.0-beta.25 | Authentication |
| @auth/prisma-adapter | 2.7.4 | Auth Prisma integration |
| tailwindcss | 3.4.16 | Styling |
| @radix-ui/* | Various | UI primitives |
| recharts | 2.14.1 | Charts |
| react-hook-form | 7.54.2 | Form handling |
| zod | 3.24.1 | Validation |
| date-fns | 4.1.0 | Date formatting |
| lucide-react | 0.468.0 | Icons |
| bcryptjs | 2.4.3 | Password hashing |

### Dev Dependencies
| Package | Purpose |
|---------|---------|
| prisma | Database tooling |
| typescript | Type checking |
| eslint | Code linting |
| tsx | TypeScript execution |
