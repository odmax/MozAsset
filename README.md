# Asset Management System

A modern, full-featured asset management system built with Next.js 14, PostgreSQL, Prisma ORM, and NextAuth.js.

## Features

- **Authentication & Authorization**
  - Role-based access control (Super Admin, Asset Manager, Department Manager, Employee)
  - Secure login with credentials
  - Session management

- **Asset Management**
  - Complete CRUD operations for assets
  - Asset lifecycle management (assign, transfer, check-in/out)
  - Maintenance tracking
  - Retirement and disposal workflows
  - Comprehensive asset fields (tag, serial, model, brand, status, condition, etc.)

- **Reference Data Management**
  - Categories
  - Departments
  - Locations
  - Vendors
  - Users

- **Analytics Dashboard**
  - Total assets overview
  - Assets by category chart
  - Assets by department chart
  - Assets by status distribution
  - Expiring warranties alerts
  - Recent activity feed

- **Audit Logging**
  - Track all create, update, delete actions
  - Asset lifecycle events
  - User activity tracking

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (Auth.js)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd asset-management-system
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/asset_management?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-generate-with-openssl-rand-base64-32"
```

### 3. Set Up the Database

Generate Prisma client and push the schema to your database:

```bash
npm run db:generate
npm run db:push
```

### 4. Seed the Database (Optional but Recommended)

Seed with sample data including users, categories, departments, locations, vendors, and sample assets:

```bash
npm run db:seed
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Login

Use the default credentials:

- **Email**: admin@example.com
- **Password**: password123

## Demo Accounts

The seed data creates the following users with different roles:

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password123 | Super Admin |
| asset.manager@example.com | password123 | Asset Manager |
| dept.manager@example.com | password123 | Department Manager |
| employee@example.com | password123 | Employee |

## Project Structure

```
asset-management-system/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── src/
│   ├── app/
│   │   ├── api/auth/        # NextAuth API routes
│   │   ├── dashboard/       # Dashboard pages
│   │   │   ├── assets/      # Asset management
│   │   │   ├── categories/  # Category management
│   │   │   ├── departments/ # Department management
│   │   │   ├── locations/   # Location management
│   │   │   ├── vendors/     # Vendor management
│   │   │   ├── users/       # User management
│   │   │   └── audit-logs/  # Audit log viewer
│   │   └── login/           # Login page
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── layout/          # Layout components (sidebar)
│   │   └── dashboard/       # Dashboard-specific components
│   ├── lib/
│   │   ├── auth.ts          # NextAuth configuration
│   │   ├── prisma.ts        # Prisma client
│   │   ├── utils.ts         # Utility functions
│   │   ├── validations.ts   # Zod schemas
│   │   └── actions.ts       # Server actions
│   └── types/
│       └── index.ts         # TypeScript types
├── .env.example             # Environment variables template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:seed       # Seed database with sample data
npm run db:studio     # Open Prisma Studio
npm run db:migrate    # Run database migrations
```

## Role Permissions

| Feature | Super Admin | Asset Manager | Dept Manager | Employee |
|---------|-------------|---------------|--------------|----------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ |
| View Assets | ✓ | ✓ | ✓ | ✓ |
| Create/Edit Assets | ✓ | ✓ | ✓ | ✗ |
| Delete Assets | ✓ | ✓ | ✗ | ✗ |
| Manage Categories | ✓ | ✓ | ✗ | ✗ |
| Manage Departments | ✓ | ✓ | ✗ | ✗ |
| Manage Locations | ✓ | ✓ | ✗ | ✗ |
| Manage Vendors | ✓ | ✓ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| View Audit Logs | ✓ | ✓ | ✗ | ✗ |

## API Routes

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth handlers

## Database Schema

### Models

- **User** - System users with roles
- **Category** - Asset categories
- **Department** - Organization departments
- **Location** - Physical locations
- **Vendor** - Asset vendors/suppliers
- **Asset** - Main asset entity
- **AssetAssignment** - Assignment history
- **AssetTransfer** - Transfer history
- **Maintenance** - Maintenance records
- **CheckInOut** - Check-in/out records
- **AuditLog** - Activity audit trail

### Enums

- **Role**: SUPER_ADMIN, ASSET_MANAGER, DEPARTMENT_MANAGER, EMPLOYEE
- **AssetStatus**: AVAILABLE, ASSIGNED, IN_REPAIR, RETIRED, DISPOSED, LOST
- **AssetCondition**: EXCELLENT, GOOD, FAIR, POOR, NEEDS_REPAIR
- **AuditAction**: CREATE, UPDATE, DELETE, ASSIGN, TRANSFER, CHECK_IN, CHECK_OUT, MAINTENANCE, RETIRE, DISPOSE

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
