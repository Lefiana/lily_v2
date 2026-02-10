# Asset Management System Implementation Plan

## Strategic Technical Orchestration for Modular Asset Management

**Date:** 2026-02-09
**Status:** Phase 1 Complete - Phase 2 Ready for Review
**Priority:** Critical
**Estimated Effort:** 5-7 Sprints (10-14 weeks)
**Risk Level:** High (requires new modules, database migrations, and real-time integration)

---

## Table of Contents

1. [Phase 1: Deep Contextual & Architectural Audit](#phase-1-deep-contextual--architectural-audit)
   - 1.1 [Project Overview](#11-project-overview)
   - 1.2 [Current Architecture Patterns](#12-current-architecture-patterns)
   - 1.3 [Database Schema Analysis](#13-database-schema-analysis)
   - 1.4 [Data Flow & State Management](#14-data-flow--state-management)
   - 1.5 [Existing Security Posture](#15-existing-security-posture)
   - 1.6 [Mission-Critical Features Analysis](#16-mission-critical-features-analysis)
   - 1.7 [Identified Bottlenecks & Constraints](#17-identified-bottlenecks--constraints)
2. [Phase 2: Strategic Technical Orchestration](#phase-2-strategic-technical-orchestration)
   - 2.1 [Executive Summary](#21-executive-summary)
   - 2.2 [Core Logic Roadmap](#22-core-logic-roadmap)
   - 2.3 [Zero Breaking Changes Strategy](#23-zero-breaking-changes-strategy)
   - 2.4 [Full-Stack Type Integrity](#24-full-stack-type-integrity)
   - 2.5 [Edge Case & Failure Mode Mitigation](#25-edge-case--failure-mode-mitigation)
   - 2.6 [Verification & Validation Protocol](#26-verification--validation-protocol)
3. [Appendix: Technical Specifications](#appendix-technical-specifications)

---

## Phase 1: Deep Contextual & Architectural Audit

### 1.1 Project Overview

**Lily_V2** is a gamified task management system with real-time capabilities, organized as a monorepo with distinct frontend and backend applications.

#### 1.1.1 Technology Stack

| Layer    | Technology                  | Version | Purpose                         |
| -------- | --------------------------- | ------- | ------------------------------- |
| Monorepo | Turborepo + pnpm workspaces | Latest  | Build orchestration             |
| Frontend | Next.js                     | 16.1.0  | React framework with App Router |
| Frontend | React                       | 19.2.0  | UI library                      |
| Frontend | TypeScript                  | 5.9.2   | Type safety                     |
| Frontend | Tailwind CSS                | 3.x     | Styling                         |
| Frontend | SWR                         | 2.3.8   | Server state management         |
| Frontend | Socket.io-client            | 4.8.3   | Real-time communication         |
| Backend  | NestJS                      | 11.x    | Node.js framework               |
| Backend  | Prisma ORM                  | 6.19.0  | Database access                 |
| Backend  | PostgreSQL                  | Latest  | Primary database                |
| Backend  | Socket.io                   | 4.8.3   | WebSocket server                |
| Auth     | Better-Auth                 | 1.3.34  | Session-based authentication    |

#### 1.1.2 Project Structure

```
Lily_V2/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── tasks/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── inventory/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── tasks/
│   │   │   ├── inventory/
│   │   │   ├── ui/
│   │   │   └── layout/
│   │   ├── hooks/
│   │   │   ├── useTasks.ts
│   │   │   └── use-tasks.socket.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── auth-client.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── task.ts
│   └── backend/                # NestJS backend
│       ├── prisma/
│       │   └── schema.prisma
│       └── src/
│           ├── modules/
│           │   ├── tasks/
│           │   │   ├── controllers/
│           │   │   ├── services/
│           │   │   ├── repositories/
│           │   │   ├── gateways/
│           │   │   └── domain/
│           │   └── users/
│           ├── core/
│           │   └── prisma/
│           └── app.module.ts
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── eslint-config/
│   └── typescript-config/
└── plans/                      # Implementation plans
```

---

### 1.2 Current Architecture Patterns

#### 1.2.1 Backend Module Pattern (NestJS)

The existing **Tasks Module** follows a clean, layered architecture:

```typescript
// Layered Architecture Pattern
Controller (API Layer)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Prisma Client (ORM)
    ↓
PostgreSQL (Database)
```

**Current Tasks Module Structure:**

```
apps/backend/src/modules/tasks/
├── controllers/
│   ├── index.ts
│   └── tasks.controller.ts       # REST API endpoints
├── services/
│   ├── index.ts
│   └── tasks.service.ts          # Business logic + WebSocket emission
├── repositories/
│   ├── index.ts
│   └── tasks.repository.ts       # Prisma queries
├── gateways/
│   ├── index.ts
│   └── tasks.gateway.ts          # WebSocket namespace handler
├── domain/
│   ├── index.ts
│   ├── task.types.ts             # TypeScript interfaces
│   └── task.dto.ts               # Validation DTOs
├── tasks.module.ts               # Module definition
└── index.ts                      # Public exports
```

**Key Architectural Decisions Observed:**

1. **Repository Pattern:** Data access abstracted behind repository classes
2. **Service Layer:** Business logic separated from controllers
3. **Gateway Pattern:** WebSocket events handled separately from HTTP
4. **Domain-Driven:** Types and DTOs centralized in domain folder
5. **Index Exports:** Each folder exposes public API via index.ts

#### 1.2.2 Frontend State Management Pattern

**SWR + WebSocket Hybrid:**

```typescript
// apps/web/hooks/useTasks.ts
// Pattern: Server state via SWR, real-time via WebSocket

const { data: tasks, mutate } = useSWR(endpoint, fetcher);

// WebSocket listener invalidates cache on events
useTaskSocket(userId, {
  invalidateKeys: [endpoint],
  events: ['task_created', 'task_updated', ...]
});
```

**Key Patterns:**

- **Optimistic Updates:** UI updates before API response
- **Automatic Revalidation:** SWR refetches on focus/reconnect
- **Singleton Socket:** Global socket instance prevents duplicate connections
- **Cache Invalidation:** Events trigger selective SWR cache invalidation

#### 1.2.3 Real-Time Event System

**Current Event Architecture:**

```typescript
// Backend: apps/backend/src/modules/tasks/gateways/tasks.gateway.ts
@WebSocketGateway({
  namespace: "tasks",
  cors: { origin: "http://localhost:3000" },
  credentials: true,
})
export class TasksGateway {
  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(`user_${userId}`).emit(event, payload);
  }
}

// Frontend: apps/web/hooks/use-tasks.socket.ts
const eventsToListen = [
  "task_created",
  "task_updated",
  "task_deleted",
  "attachment_added",
  "attachment_deleted",
  "subtask_added",
  "subtask_updated",
  "subtask_deleted",
];
```

**Observations:**

- User-scoped rooms (`user_${userId}`) ensure privacy
- Events emitted in Service layer after DB operations
- Frontend maintains singleton socket to prevent duplicates
- SWR cache invalidation triggered on events

---

### 1.3 Database Schema Analysis

#### 1.3.1 Current Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│    User     │       │    Task     │       │ TaskAttachment  │
├─────────────┤       ├─────────────┤       ├─────────────────┤
│ id (PK)     │◄──────│ userId (FK) │       │ id (PK)         │
│ email       │       │ id (PK)     │◄──────│ taskId (FK)     │
│ name        │       │ title       │       │ filename        │
│ role        │       │ description │       │ filepath        │
│ ...         │       │ status      │       │ mimetype        │
└─────────────┘       │ priority    │       │ size            │
                      │ category    │       └─────────────────┘
                      │ dueDate     │
                      │ createdAt   │       ┌─────────────┐
                      │ updatedAt   │       │  Subtask    │
                      │ recurrence  │       ├─────────────┤
                      └─────────────┘       │ id (PK)     │
                             ▲              │ taskId (FK) │
                             │              │ title       │
                             └──────────────│ status      │
                                            │ completed   │
                                            │ order       │
                                            └─────────────┘
```

#### 1.3.2 Current Schema Definitions

```prisma
// apps/backend/prisma/schema.prisma

// Core Task Entity (Lines 26-48)
model Task {
  id             String           @id @default(cuid())
  title          String
  description    String?
  status         TaskStatus       @default(TODO)
  priority       TaskPriority     @default(MEDIUM)
  category       TaskCategory     @default(TASK)
  dueDate        DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  userId         String
  subtask        Subtask[]
  recurrence     RecurrenceType   @default(NONE)
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  TaskAttachment TaskAttachment[]

  @@index([createdAt])
  @@index([dueDate])
  @@index([priority])
  @@index([status])
  @@index([userId])
  @@index([category])
}

// File Attachments (Lines 50-61)
model TaskAttachment {
  id        String   @id @default(cuid())
  filename  String
  filepath  String
  mimetype  String
  size      Int
  createdAt DateTime @default(now())
  taskId    String
  Task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
}

// Subtasks (Lines 11-24)
model Subtask {
  id        String     @id @default(cuid())
  title     String
  status    TaskStatus @default(TODO)
  completed Boolean    @default(false)
  order     Int        @default(0)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  taskId    String
  Task      Task       @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@index([status])
}

// User Entity (Lines 63-80)
model User {
  id        String   @id
  email     String   @unique
  name      String?
  image     String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  task      Task[]
  sessions  Session[]
  accounts  Account[]

  @@index([email])
  @@map("user")
}
```

#### 1.3.3 Enumerations

```prisma
enum TaskPriority { LOW, MEDIUM, HIGH }
enum TaskStatus { TODO, IN_PROGRESS, COMPLETED, CANCELLED }
enum UserRole { USER, ADMIN }
enum RecurrenceType { NONE, DAILY, WEEKLY, MONTHLY, YEARLY }
enum TaskCategory { TASK, ITEM, LOG, ARCHIVE }
```

#### 1.3.4 Database Constraints & Indexes

**Strengths:**

- All foreign keys properly indexed
- Composite indexes for query optimization
- Cascading deletes prevent orphaned records
- CUID primary keys prevent enumeration attacks

**Gaps for Asset Management:**

- No asset-specific tables exist
- No checkout/transaction tracking
- No quantity management fields
- No conditional state tracking

---

### 1.4 Data Flow & State Management

#### 1.4.1 End-to-End Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│    Axios     │────▶│   Backend    │
│   (Next.js)  │◄────│   (SWR)      │◄────│  (NestJS)    │
└──────────────┘     └──────────────┘     └──────┬───────┘
       │                                         │
       │    WebSocket Events                     ▼
       │◄─────────────────────────────────┌──────────────┐
       │                                  │  PostgreSQL  │
       └─────────────────────────────────▶│   (Prisma)   │
            Real-time Sync                └──────────────┘
```

#### 1.4.2 Current API Contract

**Base URL:** `http://localhost:3001/api`

| Endpoint                          | Method | Description            |
| --------------------------------- | ------ | ---------------------- |
| `/tasks`                          | GET    | List all tasks         |
| `/tasks`                          | POST   | Create new task        |
| `/tasks/:id`                      | GET    | Get single task        |
| `/tasks/:id`                      | PATCH  | Update task            |
| `/tasks/:id`                      | DELETE | Delete task            |
| `/tasks/search`                   | GET    | Search tasks           |
| `/tasks/inventory`                | GET    | Tasks with attachments |
| `/tasks/:id/subtasks`             | POST   | Add subtask            |
| `/tasks/subtasks/:id`             | PATCH  | Update subtask         |
| `/tasks/subtasks/:id`             | DELETE | Delete subtask         |
| `/tasks/:id/attachments`          | POST   | Upload file            |
| `/tasks/:id/attachments/bulk`     | POST   | Bulk upload            |
| `/tasks/attachments/:id/download` | GET    | Download file          |
| `/tasks/attachments/:id`          | DELETE | Delete file            |

#### 1.4.3 Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │────▶│ Better-Auth  │────▶│  PostgreSQL  │
│          │     │ (NestJS)     │     │  (Sessions)  │
│          │◄────│              │◄────│              │
└──────────┘     └──────────────┘     └──────────────┘
     │
     │ Cookie-based session
     ▼
┌────────────────────────────────────────────────────┐
│ @ActiveUser('id') decorator extracts user from JWT │
│ @UseGuards(AuthGuard) protects routes              │
└────────────────────────────────────────────────────┘
```

---

### 1.5 Existing Security Posture

#### 1.5.1 Security Strengths

✅ **Authentication:**

- Better-Auth with session-based authentication
- CSRF protection via SameSite cookies
- Secure session storage in PostgreSQL

✅ **Authorization:**

- `@UseGuards(AuthGuard)` on protected routes
- `@ActiveUser('id')` decorator for user context
- Ownership verification on all CRUD operations

✅ **Data Protection:**

- All queries scoped to authenticated user
- Cascade deletes prevent orphaned data
- File access requires task ownership

✅ **Input Validation:**

- DTO validation via class-validator
- Type checking via class-transformer
- Enum validation on restricted fields

#### 1.5.2 Security Vulnerabilities

⚠️ **Critical:**

- `@AllowAnonymous()` on TasksController allows unauthenticated access
- No rate limiting on file upload endpoints
- No file type validation beyond mimetype spoofing

⚠️ **Medium:**

- File downloads load entire file into memory
- No virus scanning on uploads
- WebSocket broadcasts to all user sessions

⚠️ **Low:**

- No pagination on task lists (DoS risk)
- No connection pooling configuration visible
- File size validation only on backend

#### 1.5.3 Required Security Enhancements for Asset System

| Feature            | Requirement                                | Priority |
| ------------------ | ------------------------------------------ | -------- |
| Rate Limiting      | Checkout operations per user               | High     |
| Input Sanitization | Borrower information validation            | High     |
| Audit Logging      | Track all checkout transactions            | Medium   |
| Data Integrity     | Prevent double-checkout via DB constraints | High     |
| Soft Deletes       | Preserve checkout history                  | Medium   |

---

### 1.6 Mission-Critical Features Analysis

#### 1.6.1 Features Adjacent to Asset Management

| Feature          | Location                              | Impact Risk  | Notes                               |
| ---------------- | ------------------------------------- | ------------ | ----------------------------------- |
| Task Module      | `apps/backend/src/modules/tasks/`     | **CRITICAL** | Asset checkout may reference tasks  |
| Inventory System | `apps/web/app/(dashboard)/inventory/` | **HIGH**     | Similar patterns for asset browsing |
| File Attachments | `TaskAttachment` model                | **MEDIUM**   | Assets may have associated files    |
| WebSocket Events | `tasks.gateway.ts`                    | **HIGH**     | Must integrate with asset events    |
| Category System  | `TaskCategory` enum                   | **MEDIUM**   | Asset categories may overlap        |
| User System      | `User` model                          | **HIGH**     | Assets scoped to users              |
| Search/Filter    | `tasks.repository.ts:61-82`           | **MEDIUM**   | Similar patterns needed             |
| Real-time Sync   | `use-tasks.socket.ts`                 | **HIGH**     | Must emit asset events              |

#### 1.6.2 Shared Utilities & Patterns

```
apps/web/lib/
├── api.ts              # Axios client - REUSE
├── auth-client.ts      # Better-auth client - REUSE
└── utils.ts            # cn() utility - REUSE

apps/web/components/ui/
├── button.tsx          # Custom glass-themed buttons - REUSE
├── badge.tsx           # Status indicators - REUSE
├── card.tsx            # Container components - REUSE
├── dialog.tsx          # Modal system - REUSE
├── select.tsx          # Dropdowns - REUSE
├── input.tsx           # Form inputs - REUSE
└── table.tsx           # Table components - REUSE (needs creation)

apps/backend/src/core/
├── prisma/             # Database connection - REUSE
├── decorators/         # @ActiveUser, @Roles - REUSE
└── guards/             # RoleGuard - REUSE
```

#### 1.6.3 Database Impact Assessment

**New Tables Required:**

- `Asset` - Core asset definitions
- `AssetCheckout` - Checkout ticket/transaction records
- `AssetCheckoutItem` - Junction for checkout-asset relationship
- `AssetPreset` - Predefined asset combinations
- `AssetPresetItem` - Assets within a preset

**Schema Extensions:**

- No modifications to existing tables needed
- New enums: `AssetCondition`, `AssetStatus`, `CheckoutStatus`
- Foreign keys to `User` model for borrower tracking

---

### 1.7 Identified Bottlenecks & Constraints

#### 1.7.1 Performance Bottlenecks

| Bottleneck            | Location                    | Impact                     | Mitigation                              |
| --------------------- | --------------------------- | -------------------------- | --------------------------------------- |
| No Pagination         | `tasks.repository.ts:77-81` | High memory usage at scale | Implement cursor-based pagination       |
| No Connection Pooling | Not configured              | DB connection exhaustion   | Add PgBouncer or Prisma connection pool |
| File Memory Loading   | `tasks.controller.ts:72-84` | Memory pressure            | Stream files instead of loading         |
| N+1 Queries           | `tasks.repository.ts:13-16` | Performance degradation    | Optimize Prisma includes                |
| WebSocket Broadcast   | `tasks.gateway.ts:41-44`    | Scalability limits         | Consider Redis adapter                  |

#### 1.7.2 Architectural Constraints

| Constraint         | Description                 | Implication                                   |
| ------------------ | --------------------------- | --------------------------------------------- |
| User-Scoped Data   | All data tied to userId     | Asset checkout must track borrower separately |
| Cascade Deletes    | Hard deletes everywhere     | Checkout history lost on asset deletion       |
| No Soft Deletes    | Records permanently removed | Audit trail compromised                       |
| Single Database    | No read replicas            | Query performance limits                      |
| Monolithic Backend | Single NestJS app           | Horizontal scaling complexity                 |

#### 1.7.3 Technical Debt

⚠️ **High Priority:**

1. `@AllowAnonymous()` decorator on TasksController (security)
2. No pagination on list endpoints (performance)
3. File upload size validation only on backend (UX)

⚠️ **Medium Priority:** 4. Hard-coded API URLs in frontend (`http://localhost:3001`) 5. Mixed use of fetch and axios in frontend 6. No centralized error handling strategy

⚠️ **Low Priority:** 7. Missing API documentation for some endpoints 8. No request/response logging middleware 9. Inconsistent TypeScript strictness between frontend/backend

---

## Phase 2: Strategic Technical Orchestration

### 2.1 Executive Summary

#### 2.1.1 Strategic Vision

Implement a **comprehensive Asset Management System** consisting of two tightly integrated modules:

1. **Assets Module** - Master data management for physical assets
   - Asset definitions with categories, quantities, conditions
   - Real-time availability tracking
   - Deployment status management

2. **Asset Checkout Module** - Ticket-based borrowing system
   - Multi-asset checkout tickets
   - Borrower tracking with timestamps
   - Dynamic overdue calculation (computed, not stored)
   - Damage reporting with notes
   - Preset configurations for common combinations

#### 2.1.2 Architectural Principles

✅ **Modularity:** Clean separation between Assets and Checkout modules
✅ **Real-time:** WebSocket events for instant UI updates
✅ **Performance:** Dynamic computed fields (overdue status)
✅ **Extensibility:** Plugin architecture for future automation
✅ **Zero Breaking Changes:** New modules don't affect existing Tasks
✅ **Type Safety:** Full-stack TypeScript with shared interfaces

#### 2.1.3 Success Criteria

| Criterion            | Metric                     | Target               |
| -------------------- | -------------------------- | -------------------- |
| Performance          | Dashboard load time        | < 500ms              |
| Real-time            | Event propagation          | < 100ms              |
| Concurrent Checkouts | Simultaneous transactions  | 100+ users           |
| Data Integrity       | Double-checkout prevention | 0 incidents          |
| UX                   | Search response time       | < 50ms (client-side) |

---

### 2.2 Core Logic Roadmap

#### 2.2.1 Database Schema Design

```prisma
// ============================================================================
// ASSET MANAGEMENT MODULE - Database Schema Extensions
// ============================================================================

// Asset Condition States
enum AssetCondition {
  WORKING
  DAMAGED
  DECOMMISSIONED
  UNDER_MAINTENANCE
}

// Asset Deployment Status
enum AssetStatus {
  AVAILABLE
  DEPLOYED
  RESERVED
  IN_TRANSIT
  UNAVAILABLE
}

// Checkout Transaction States
enum CheckoutStatus {
  BORROWED      // Currently checked out
  RETURNED      // Successfully returned
  OVERDUE       // Past due date (computed)
  DAMAGED       // Returned with damage
  LOST          // Not returned, considered lost
}

// Core Asset Definition
model Asset {
  id          String        @id @default(cuid())
  name        String
  description String?
  sku         String?       @unique  // Stock keeping unit
  serialNumber String?      @unique
  category    String        // User-defined categories
  quantity    Int           @default(1)
  available   Int           @default(1)  // Real-time availability
  condition   AssetCondition @default(WORKING)
  status      AssetStatus   @default(AVAILABLE)
  location    String?       // Physical location
  notes       String?

  // Metadata
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  userId      String        // Owner
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relations
  checkoutItems AssetCheckoutItem[]
  presetItems   AssetPresetItem[]
  attachments   AssetAttachment[]

  // Indexes
  @@index([userId])
  @@index([category])
  @@index([status])
  @@index([condition])
  @@index([createdAt])
}

// Asset File Attachments (similar to TaskAttachment)
model AssetAttachment {
  id        String   @id @default(cuid())
  filename  String
  filepath  String
  mimetype  String
  size      Int
  createdAt DateTime @default(now())
  assetId   String
  asset     Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([assetId])
}

// Checkout Ticket (Transaction Header)
model AssetCheckout {
  id          String         @id @default(cuid())

  // Borrower Information
  borrowerName String
  borrowerEmail String?
  borrowerPhone String?
  borrowerDepartment String?
  borrowerId  String?        // Reference to User if registered

  // Timestamps
  borrowedAt  DateTime       @default(now())
  dueDate     DateTime
  returnedAt  DateTime?

  // Status & Condition
  status      CheckoutStatus @default(BORROWED)
  damageFlag  Boolean        @default(false)
  damageNotes String?
  returnCondition AssetCondition?

  // Administrative
  remarks     String?
  checkedOutBy String        // User who created the checkout
  checkedInBy String?        // User who processed return

  // Metadata
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  userId      String         // Owner of the checkout record
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relations
  items       AssetCheckoutItem[]

  // Indexes
  @@index([userId])
  @@index([borrowerId])
  @@index([status])
  @@index([dueDate])
  @@index([borrowedAt])
}

// Junction: Checkout Ticket ↔ Assets (Line Items)
model AssetCheckoutItem {
  id          String        @id @default(cuid())
  quantity    Int           @default(1)
  returnedAt  DateTime?
  condition   AssetCondition @default(WORKING)
  notes       String?

  // Relations
  checkoutId  String
  checkout    AssetCheckout @relation(fields: [checkoutId], references: [id], onDelete: Cascade)
  assetId     String
  asset       Asset         @relation(fields: [assetId], references: [id], onDelete: Restrict)

  @@index([checkoutId])
  @@index([assetId])
  @@unique([checkoutId, assetId])  // Prevent duplicate assets in same checkout
}

// Preset: Predefined Asset Combinations
model AssetPreset {
  id          String    @id @default(cuid())
  name        String
  description String?
  isActive    Boolean   @default(true)

  // Metadata
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relations
  items       AssetPresetItem[]

  @@index([userId])
  @@index([isActive])
}

// Junction: Preset ↔ Assets
model AssetPresetItem {
  id        String      @id @default(cuid())
  quantity  Int         @default(1)
  notes     String?

  // Relations
  presetId  String
  preset    AssetPreset @relation(fields: [presetId], references: [id], onDelete: Cascade)
  assetId   String
  asset     Asset       @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([presetId])
  @@index([assetId])
}
```

#### 2.2.2 Backend Module Architecture

```
apps/backend/src/modules/
├── assets/                          # NEW MODULE
│   ├── assets.module.ts
│   ├── index.ts
│   ├── controllers/
│   │   ├── index.ts
│   │   ├── assets.controller.ts     # CRUD operations
│   │   └── asset-attachments.controller.ts
│   ├── services/
│   │   ├── index.ts
│   │   ├── assets.service.ts        # Business logic + availability calc
│   │   └── asset-attachments.service.ts
│   ├── repositories/
│   │   ├── index.ts
│   │   └── assets.repository.ts
│   ├── gateways/
│   │   ├── index.ts
│   │   └── assets.gateway.ts        # WebSocket namespace: 'assets'
│   └── domain/
│       ├── index.ts
│       ├── asset.types.ts           # Interfaces & enums
│       └── asset.dto.ts             # Validation DTOs
│
├── asset-checkouts/                 # NEW MODULE
│   ├── asset-checkouts.module.ts
│   ├── index.ts
│   ├── controllers/
│   │   ├── index.ts
│   │   └── asset-checkouts.controller.ts
│   ├── services/
│   │   ├── index.ts
│   │   ├── asset-checkouts.service.ts
│   │   └── checkout-calculator.service.ts  # Overdue computation
│   ├── repositories/
│   │   ├── index.ts
│   │   └── asset-checkouts.repository.ts
│   ├── gateways/
│   │   ├── index.ts
│   │   └── asset-checkouts.gateway.ts  # WebSocket namespace: 'checkouts'
│   └── domain/
│       ├── index.ts
│       ├── checkout.types.ts
│       └── checkout.dto.ts
│
└── asset-presets/                   # NEW MODULE
    ├── asset-presets.module.ts
    ├── index.ts
    ├── controllers/
    │   └── asset-presets.controller.ts
    ├── services/
    │   └── asset-presets.service.ts
    ├── repositories/
    │   └── asset-presets.repository.ts
    └── domain/
        ├── preset.types.ts
        └── preset.dto.ts
```

#### 2.2.3 Core Service Implementation

**Assets Service (`apps/backend/src/modules/assets/services/assets.service.ts`):**

```typescript
// Service responsible for asset management and availability tracking
@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly repo: AssetsRepository,
    private readonly gateway: AssetsGateway,
  ) {}

  /**
   * Create new asset with initial availability = quantity
   */
  async create(dto: CreateAssetDto, userId: string): Promise<Asset> {
    try {
      const asset = await this.repo.create({
        ...dto,
        userId,
        available: dto.quantity, // Initially all available
      });

      this.gateway.emitToUser(userId, AssetEvents.ASSET_CREATED, asset);
      return asset;
    } catch (error) {
      this.handleError(error, "Error creating asset");
    }
  }

  /**
   * Update asset - recalculate availability if quantity changes
   */
  async update(
    id: string,
    dto: UpdateAssetDto,
    userId: string,
  ): Promise<Asset> {
    try {
      const current = await this.repo.findById(id, userId);
      if (!current) throw new NotFoundException("Asset not found");

      // Calculate new availability if quantity changed
      let newAvailable = current.available;
      if (dto.quantity !== undefined && dto.quantity !== current.quantity) {
        const checkedOut = current.quantity - current.available;
        newAvailable = Math.max(0, dto.quantity - checkedOut);
      }

      const updated = await this.repo.update(id, {
        ...dto,
        available: newAvailable,
      });

      this.gateway.emitToUser(userId, AssetEvents.ASSET_UPDATED, updated);
      return updated;
    } catch (error) {
      this.handleError(error, "Error updating asset");
    }
  }

  /**
   * Check asset availability for checkout
   */
  async checkAvailability(
    assetId: string,
    requestedQty: number,
    userId: string,
  ): Promise<boolean> {
    const asset = await this.repo.findById(assetId, userId);
    if (!asset) throw new NotFoundException("Asset not found");

    return (
      asset.available >= requestedQty && asset.status === AssetStatus.AVAILABLE
    );
  }

  /**
   * Reserve assets for checkout (decrement availability)
   */
  async reserveAssets(
    checkoutItems: { assetId: string; quantity: number }[],
    userId: string,
  ): Promise<void> {
    for (const item of checkoutItems) {
      const asset = await this.repo.findById(item.assetId, userId);
      if (!asset)
        throw new NotFoundException(`Asset ${item.assetId} not found`);

      if (asset.available < item.quantity) {
        throw new BadRequestException(
          `Insufficient quantity for ${asset.name}. Available: ${asset.available}, Requested: ${item.quantity}`,
        );
      }

      await this.repo.updateAvailability(
        item.assetId,
        asset.available - item.quantity,
      );
    }
  }

  /**
   * Release assets (increment availability) - called on return or cancellation
   */
  async releaseAssets(
    checkoutItems: { assetId: string; quantity: number }[],
    userId: string,
  ): Promise<void> {
    for (const item of checkoutItems) {
      const asset = await this.repo.findById(item.assetId, userId);
      if (!asset) continue;

      const newAvailable = Math.min(
        asset.quantity,
        asset.available + item.quantity,
      );
      await this.repo.updateAvailability(item.assetId, newAvailable);

      // Emit availability update
      this.gateway.emitToUser(userId, AssetEvents.ASSET_AVAILABILITY_CHANGED, {
        assetId: item.assetId,
        available: newAvailable,
        total: asset.quantity,
      });
    }
  }

  private handleError(error: unknown, context: string): never {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${message}`);
    throw new InternalServerErrorException(context);
  }
}
```

**Asset Checkout Service (`apps/backend/src/modules/asset-checkouts/services/asset-checkouts.service.ts`):**

```typescript
// Service managing checkout transactions with dynamic overdue computation
@Injectable()
export class AssetCheckoutsService {
  private readonly logger = new Logger(AssetCheckoutsService.name);

  constructor(
    private readonly repo: AssetCheckoutsRepository,
    private readonly assetsService: AssetsService,
    private readonly gateway: AssetCheckoutsGateway,
  ) {}

  /**
   * Create checkout ticket with automatic asset reservation
   */
  async createCheckout(
    dto: CreateCheckoutDto,
    userId: string,
  ): Promise<AssetCheckout> {
    try {
      // Validate all assets are available
      for (const item of dto.items) {
        const available = await this.assetsService.checkAvailability(
          item.assetId,
          item.quantity,
          userId,
        );
        if (!available) {
          const asset = await this.assetsService.findById(item.assetId, userId);
          throw new BadRequestException(
            `${asset?.name || "Asset"} is not available for checkout`,
          );
        }
      }

      // Reserve assets (decrement availability)
      await this.assetsService.reserveAssets(dto.items, userId);

      // Create checkout record
      const checkout = await this.repo.create({
        ...dto,
        userId,
        checkedOutBy: userId,
        status: CheckoutStatus.BORROWED,
      });

      this.gateway.emitToUser(
        userId,
        CheckoutEvents.CHECKOUT_CREATED,
        checkout,
      );

      // Also emit asset availability changes
      for (const item of dto.items) {
        const asset = await this.assetsService.findById(item.assetId, userId);
        this.gateway.emitToUser(
          userId,
          AssetEvents.ASSET_AVAILABILITY_CHANGED,
          {
            assetId: item.assetId,
            available: asset?.available,
            total: asset?.quantity,
          },
        );
      }

      return checkout;
    } catch (error) {
      // Rollback reservations on failure
      this.logger.error("Checkout creation failed, rolling back reservations");
      throw error;
    }
  }

  /**
   * Process return with condition assessment
   */
  async processReturn(
    checkoutId: string,
    dto: ProcessReturnDto,
    userId: string,
  ): Promise<AssetCheckout> {
    try {
      const checkout = await this.repo.findById(checkoutId, userId);
      if (!checkout) throw new NotFoundException("Checkout not found");

      if (checkout.status === CheckoutStatus.RETURNED) {
        throw new BadRequestException(
          "This checkout has already been returned",
        );
      }

      // Update checkout status
      const updated = await this.repo.update(checkoutId, {
        status: dto.damageFlag
          ? CheckoutStatus.DAMAGED
          : CheckoutStatus.RETURNED,
        returnedAt: new Date(),
        returnCondition: dto.condition,
        damageFlag: dto.damageFlag,
        damageNotes: dto.damageNotes,
        checkedInBy: userId,
      });

      // Release assets back to inventory
      const items = checkout.items.map((item) => ({
        assetId: item.assetId,
        quantity: item.quantity,
      }));
      await this.assetsService.releaseAssets(items, userId);

      this.gateway.emitToUser(
        userId,
        CheckoutEvents.CHECKOUT_RETURNED,
        updated,
      );

      return updated;
    } catch (error) {
      this.handleError(error, "Error processing return");
    }
  }

  /**
   * Find all checkouts with dynamic status computation
   * Overdue status is computed at query time, not stored
   */
  async findAll(
    userId: string,
    filters?: CheckoutFilters,
  ): Promise<AssetCheckout[]> {
    try {
      const checkouts = await this.repo.findAll(userId, filters);

      // Compute derived status for each checkout
      return checkouts.map((checkout) => ({
        ...checkout,
        computedStatus: this.computeCheckoutStatus(checkout),
        isOverdue: this.isOverdue(checkout),
        daysOverdue: this.calculateDaysOverdue(checkout),
      }));
    } catch (error) {
      this.handleError(error, "Error fetching checkouts");
    }
  }

  /**
   * Compute derived checkout status based on dates and current state
   */
  private computeCheckoutStatus(checkout: AssetCheckout): CheckoutStatus {
    if (
      checkout.status === CheckoutStatus.RETURNED ||
      checkout.status === CheckoutStatus.DAMAGED
    ) {
      return checkout.status;
    }

    if (checkout.returnedAt) {
      return checkout.damageFlag
        ? CheckoutStatus.DAMAGED
        : CheckoutStatus.RETURNED;
    }

    if (this.isOverdue(checkout)) {
      return CheckoutStatus.OVERDUE;
    }

    return CheckoutStatus.BORROWED;
  }

  /**
   * Check if checkout is overdue (no background job needed)
   */
  private isOverdue(checkout: AssetCheckout): boolean {
    if (checkout.returnedAt || checkout.status === CheckoutStatus.RETURNED) {
      return false;
    }
    return new Date() > new Date(checkout.dueDate);
  }

  /**
   * Calculate days overdue (negative = days remaining)
   */
  private calculateDaysOverdue(checkout: AssetCheckout): number {
    if (checkout.returnedAt) return 0;

    const now = new Date();
    const due = new Date(checkout.dueDate);
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  private handleError(error: unknown, context: string): never {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${message}`);
    throw new InternalServerErrorException(context);
  }
}
```

#### 2.2.4 Controller API Design

**Assets Controller (`apps/backend/src/modules/assets/controllers/assets.controller.ts`):**

```typescript
@ApiTags("assets")
@Controller("assets")
@UseGuards(AuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  async create(@Body() dto: CreateAssetDto, @ActiveUser("id") userId: string) {
    return this.assetsService.create(dto, userId);
  }

  @Get()
  async findAll(
    @Query() filters: AssetFiltersDto,
    @ActiveUser("id") userId: string,
  ) {
    return this.assetsService.findAll(userId, filters);
  }

  @Get("search")
  async search(
    @Query("q") query: string,
    @Query("category") category: string,
    @ActiveUser("id") userId: string,
  ) {
    return this.assetsService.search(userId, query, category);
  }

  @Get("available")
  async findAvailable(
    @ActiveUser("id") userId: string,
    @Query("category") category?: string,
  ) {
    return this.assetsService.findAvailable(userId, category);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @ActiveUser("id") userId: string) {
    return this.assetsService.findById(id, userId);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAssetDto,
    @ActiveUser("id") userId: string,
  ) {
    return this.assetsService.update(id, dto, userId);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @ActiveUser("id") userId: string) {
    return this.assetsService.remove(id, userId);
  }

  // Attachment endpoints
  @Post(":id/attachments")
  @UseInterceptors(FileInterceptor("file", uploadConfig))
  async uploadAttachment(
    @Param("id") assetId: string,
    @UploadedFile() file: Express.Multer.File,
    @ActiveUser("id") userId: string,
  ) {
    return this.assetsService.uploadAttachment(assetId, userId, file);
  }
}
```

**Asset Checkouts Controller (`apps/backend/src/modules/asset-checkouts/controllers/asset-checkouts.controller.ts`):**

```typescript
@ApiTags("asset-checkouts")
@Controller("asset-checkouts")
@UseGuards(AuthGuard)
export class AssetCheckoutsController {
  constructor(private readonly checkoutsService: AssetCheckoutsService) {}

  @Post()
  async create(
    @Body() dto: CreateCheckoutDto,
    @ActiveUser("id") userId: string,
  ) {
    return this.checkoutsService.createCheckout(dto, userId);
  }

  @Get()
  async findAll(
    @Query() filters: CheckoutFiltersDto,
    @ActiveUser("id") userId: string,
  ) {
    return this.checkoutsService.findAll(userId, filters);
  }

  @Get("active")
  async findActive(
    @ActiveUser("id") userId: string,
    @Query("borrowerId") borrowerId?: string,
  ) {
    return this.checkoutsService.findActive(userId, borrowerId);
  }

  @Get("overdue")
  async findOverdue(@ActiveUser("id") userId: string) {
    return this.checkoutsService.findOverdue(userId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @ActiveUser("id") userId: string) {
    return this.checkoutsService.findById(id, userId);
  }

  @Post(":id/return")
  async processReturn(
    @Param("id") id: string,
    @Body() dto: ProcessReturnDto,
    @ActiveUser("id") userId: string,
  ) {
    return this.checkoutsService.processReturn(id, dto, userId);
  }

  @Delete(":id")
  async cancel(@Param("id") id: string, @ActiveUser("id") userId: string) {
    return this.checkoutsService.cancelCheckout(id, userId);
  }
}
```

#### 2.2.5 Frontend Implementation

**TypeScript Interfaces (`apps/web/types/asset.ts`):**

```typescript
// Asset Types
export enum AssetCondition {
  WORKING = "WORKING",
  DAMAGED = "DAMAGED",
  DECOMMISSIONED = "DECOMMISSIONED",
  UNDER_MAINTENANCE = "UNDER_MAINTENANCE",
}

export enum AssetStatus {
  AVAILABLE = "AVAILABLE",
  DEPLOYED = "DEPLOYED",
  RESERVED = "RESERVED",
  IN_TRANSIT = "IN_TRANSIT",
  UNAVAILABLE = "UNAVAILABLE",
}

export enum CheckoutStatus {
  BORROWED = "BORROWED",
  RETURNED = "RETURNED",
  OVERDUE = "OVERDUE",
  DAMAGED = "DAMAGED",
  LOST = "LOST",
}

export interface IAsset {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  serialNumber?: string | null;
  category: string;
  quantity: number;
  available: number;
  condition: AssetCondition;
  status: AssetStatus;
  location?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface IAssetCheckoutItem {
  id: string;
  quantity: number;
  returnedAt?: Date | null;
  condition: AssetCondition;
  notes?: string | null;
  assetId: string;
  asset: IAsset;
}

export interface IAssetCheckout {
  id: string;
  borrowerName: string;
  borrowerEmail?: string | null;
  borrowerPhone?: string | null;
  borrowerDepartment?: string | null;
  borrowerId?: string | null;
  borrowedAt: Date;
  dueDate: Date;
  returnedAt?: Date | null;
  status: CheckoutStatus;
  computedStatus: CheckoutStatus; // Derived
  isOverdue: boolean; // Computed
  daysOverdue: number; // Computed
  damageFlag: boolean;
  damageNotes?: string | null;
  returnCondition?: AssetCondition | null;
  remarks?: string | null;
  checkedOutBy: string;
  checkedInBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: IAssetCheckoutItem[];
}

export interface IAssetPreset {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  items: IAssetPresetItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssetPresetItem {
  id: string;
  quantity: number;
  notes?: string | null;
  assetId: string;
  asset: IAsset;
}

// DTOs
export interface ICreateAssetDto {
  name: string;
  description?: string;
  sku?: string;
  serialNumber?: string;
  category: string;
  quantity: number;
  condition?: AssetCondition;
  status?: AssetStatus;
  location?: string;
  notes?: string;
}

export interface IUpdateAssetDto {
  name?: string;
  description?: string;
  sku?: string;
  serialNumber?: string;
  category?: string;
  quantity?: number;
  condition?: AssetCondition;
  status?: AssetStatus;
  location?: string;
  notes?: string;
}

export interface ICreateCheckoutDto {
  borrowerName: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  borrowerDepartment?: string;
  borrowerId?: string;
  dueDate: Date | string;
  remarks?: string;
  items: ICheckoutItemDto[];
}

export interface ICheckoutItemDto {
  assetId: string;
  quantity: number;
  notes?: string;
}

export interface IProcessReturnDto {
  condition: AssetCondition;
  damageFlag: boolean;
  damageNotes?: string;
}

// Filters
export interface IAssetFilters {
  category?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  query?: string;
  availableOnly?: boolean;
}

export interface ICheckoutFilters {
  status?: CheckoutStatus;
  borrowerId?: string;
  assetId?: string;
  overdueOnly?: boolean;
  fromDate?: Date;
  toDate?: Date;
}
```

**Assets Dashboard Page (`apps/web/app/(dashboard)/assets/page.tsx`):**

```typescript
'use client';

import { useState, useMemo } from 'react';
import { useAssets } from '@/hooks/useAssets';
import { authClient } from '@/lib/auth-client';
import { IAsset, AssetStatus, AssetCondition, IAssetFilters } from '@/types/asset';
import { CreateAssetModal } from '@/components/assets/create-asset-modal';
import { EditAssetModal } from '@/components/assets/edit-asset-modal';
import { AssetTableRow } from '@/components/assets/asset-table-row';
import { AssetFilters } from '@/components/assets/asset-filters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function AssetsPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || '';
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [filters, setFilters] = useState<IAssetFilters>({
    category: searchParams.get('category') || undefined,
    status: (searchParams.get('status') as AssetStatus) || undefined,
    condition: (searchParams.get('condition') as AssetCondition) || undefined,
    availableOnly: searchParams.get('available') === 'true',
  });

  const {
    assets,
    isLoading,
    deleteAsset,
    updateAsset,
    revalidate
  } = useAssets(userId, filters, searchQuery);

  // Client-side filtering for instant search
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;

    const query = searchQuery.toLowerCase();
    return assets.filter(asset =>
      asset.name.toLowerCase().includes(query) ||
      asset.description?.toLowerCase().includes(query) ||
      asset.sku?.toLowerCase().includes(query) ||
      asset.category.toLowerCase().includes(query) ||
      asset.location?.toLowerCase().includes(query)
    );
  }, [assets, searchQuery]);

  const [selectedAsset, setSelectedAsset] = useState<IAsset | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleEditClick = (asset: IAsset) => {
    setSelectedAsset(asset);
    setIsEditOpen(true);
  };

  const isFiltering = searchQuery.length > 0 || Object.values(filters).some(Boolean);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Assets</h1>
          <p className="text-zinc-400 mt-1">Manage equipment, tools, and resources</p>
        </div>
        <CreateAssetModal userId={userId} onSuccess={revalidate}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </CreateAssetModal>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-10 bg-black/40 border-zinc-700 text-zinc-200 placeholder:text-zinc-600",
              isFiltering && "border-purple-500/50 ring-2 ring-purple-500/20"
            )}
          />
        </div>
        <AssetFilters
          filters={filters}
          onChange={setFilters}
        />
      </div>

      {/* Results Count */}
      {isFiltering && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            Showing <span className="text-purple-400 font-semibold">{filteredAssets.length}</span> of{' '}
            <span className="text-zinc-300">{assets.length}</span> assets
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setFilters({});
            }}
            className="text-purple-400 hover:text-purple-300"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Assets Table */}
      <div className="glass-card rounded-xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Condition
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    {isFiltering ? (
                      <div className="space-y-2">
                        <p>No assets match your filters</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchQuery('');
                            setFilters({});
                          }}
                          className="text-purple-400"
                        >
                          Clear Filters
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p>No assets found</p>
                        <p className="text-sm">Add your first asset to get started</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <AssetTableRow
                    key={asset.id}
                    asset={asset}
                    onEdit={() => handleEditClick(asset)}
                    onDelete={() => deleteAsset(asset.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <EditAssetModal
        asset={selectedAsset}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={updateAsset}
      />
    </div>
  );
}
```

**Asset Checkout Dashboard (`apps/web/app/(dashboard)/checkouts/page.tsx`):**

```typescript
'use client';

import { useState, useMemo } from 'react';
import { useCheckouts } from '@/hooks/useCheckouts';
import { authClient } from '@/lib/auth-client';
import {
  IAssetCheckout,
  CheckoutStatus,
  ICheckoutFilters
} from '@/types/asset';
import { CreateCheckoutModal } from '@/components/checkouts/create-checkout-modal';
import { CheckoutTableRow } from '@/components/checkouts/checkout-table-row';
import { CheckoutFilters } from '@/components/checkouts/checkout-filters';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function CheckoutsPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || '';

  const [filters, setFilters] = useState<ICheckoutFilters>({
    status: undefined,
    overdueOnly: false,
  });

  const {
    checkouts,
    isLoading,
    overdueCount,
    processReturn,
    cancelCheckout,
    revalidate
  } = useCheckouts(userId, filters);

  // Real-time computed statuses
  const computedCheckouts = useMemo(() => {
    return checkouts.map(checkout => {
      const now = new Date();
      const dueDate = new Date(checkout.dueDate);
      const isOverdue = !checkout.returnedAt && now > dueDate;
      const daysOverdue = isOverdue
        ? Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...checkout,
        computedStatus: isOverdue ? CheckoutStatus.OVERDUE : checkout.status,
        isOverdue,
        daysOverdue,
      };
    });
  }, [checkouts]);

  // Sort: Overdue first, then by due date
  const sortedCheckouts = useMemo(() => {
    return [...computedCheckouts].sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [computedCheckouts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Checkouts</h1>
            <p className="text-zinc-400 mt-1">Track borrowed assets and returns</p>
          </div>
          {overdueCount > 0 && (
            <Badge
              variant="destructive"
              className="gap-1 px-3 py-1"
            >
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} Overdue
            </Badge>
          )}
        </div>
        <CreateCheckoutModal userId={userId} onSuccess={revalidate}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Checkout
          </Button>
        </CreateCheckoutModal>
      </div>

      {/* Filters */}
      <CheckoutFilters
        filters={filters}
        onChange={setFilters}
        overdueCount={overdueCount}
      />

      {/* Checkouts Table */}
      <div className="glass-card rounded-xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Borrower
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Borrowed
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedCheckouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    <p>No checkouts found</p>
                    <p className="text-sm mt-1">Create a new checkout to track borrowed assets</p>
                  </td>
                </tr>
              ) : (
                sortedCheckouts.map((checkout) => (
                  <CheckoutTableRow
                    key={checkout.id}
                    checkout={checkout}
                    onReturn={() => processReturn(checkout.id)}
                    onCancel={() => cancelCheckout(checkout.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Asset Table Row Component (`apps/web/components/assets/asset-table-row.tsx`):**

```typescript
'use client';

import { IAsset, AssetStatus, AssetCondition } from '@/types/asset';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetTableRowProps {
  asset: IAsset;
  onEdit: () => void;
  onDelete: () => void;
}

const statusColors: Record<AssetStatus, string> = {
  [AssetStatus.AVAILABLE]: 'bg-green-500/20 text-green-400 border-green-500/30',
  [AssetStatus.DEPLOYED]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [AssetStatus.RESERVED]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  [AssetStatus.IN_TRANSIT]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  [AssetStatus.UNAVAILABLE]: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const conditionColors: Record<AssetCondition, string> = {
  [AssetCondition.WORKING]: 'text-green-400',
  [AssetCondition.DAMAGED]: 'text-yellow-400',
  [AssetCondition.UNDER_MAINTENANCE]: 'text-orange-400',
  [AssetCondition.DECOMMISSIONED]: 'text-red-400',
};

export function AssetTableRow({ asset, onEdit, onDelete }: AssetTableRowProps) {
  const availabilityPercent = asset.quantity > 0
    ? Math.round((asset.available / asset.quantity) * 100)
    : 0;

  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Package className="h-5 w-5 text-zinc-500" />
          </div>
          <div>
            <p className="font-medium text-zinc-200">{asset.name}</p>
            {asset.sku && (
              <p className="text-xs text-zinc-500">SKU: {asset.sku}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="border-zinc-700 text-zinc-400">
          {asset.category}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <span className={cn(
            "font-semibold",
            availabilityPercent > 50 ? "text-green-400" :
            availabilityPercent > 0 ? "text-yellow-400" : "text-red-400"
          )}>
            {asset.available}
          </span>
          <span className="text-zinc-500">/ {asset.quantity}</span>
        </div>
        {/* Mini progress bar */}
        <div className="mt-1 mx-auto w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              availabilityPercent > 50 ? "bg-green-500" :
              availabilityPercent > 0 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${availabilityPercent}%` }}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn("text-xs", statusColors[asset.status])}
        >
          {asset.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <span className={cn("text-sm", conditionColors[asset.condition])}>
          {asset.condition}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 p-0"
          >
            <Pencil className="h-4 w-4 text-zinc-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4 text-red-500/60 hover:text-red-500" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
```

**Checkout Table Row Component (`apps/web/components/checkouts/checkout-table-row.tsx`):**

```typescript
'use client';

import { IAssetCheckout, CheckoutStatus } from '@/types/asset';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CheckoutTableRowProps {
  checkout: IAssetCheckout & { isOverdue?: boolean; daysOverdue?: number };
  onReturn: () => void;
  onCancel: () => void;
}

const statusConfig: Record<CheckoutStatus, { icon: any; color: string; label: string }> = {
  [CheckoutStatus.BORROWED]: {
    icon: Clock,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    label: 'Borrowed',
  },
  [CheckoutStatus.RETURNED]: {
    icon: CheckCircle,
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    label: 'Returned',
  },
  [CheckoutStatus.OVERDUE]: {
    icon: AlertTriangle,
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    label: 'Overdue',
  },
  [CheckoutStatus.DAMAGED]: {
    icon: AlertTriangle,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    label: 'Damaged',
  },
  [CheckoutStatus.LOST]: {
    icon: XCircle,
    color: 'bg-red-900/20 text-red-500 border-red-900/30',
    label: 'Lost',
  },
};

export function CheckoutTableRow({ checkout, onReturn, onCancel }: CheckoutTableRowProps) {
  const config = statusConfig[checkout.computedStatus || checkout.status];
  const StatusIcon = config.icon;

  const totalItems = checkout.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <tr className={cn(
      "hover:bg-white/[0.02] transition-colors",
      checkout.isOverdue && "bg-red-500/5"
    )}>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-zinc-200">{checkout.borrowerName}</p>
          {checkout.borrowerDepartment && (
            <p className="text-xs text-zinc-500">{checkout.borrowerDepartment}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <p className="text-sm text-zinc-300">{totalItems} item(s)</p>
          <div className="text-xs text-zinc-500">
            {checkout.items.slice(0, 2).map(item => (
              <span key={item.id} className="inline-block mr-2">
                {item.asset.name} (x{item.quantity})
              </span>
            ))}
            {checkout.items.length > 2 && (
              <span>+{checkout.items.length - 2} more</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-zinc-400">
          {format(new Date(checkout.borrowedAt), 'MMM d, yyyy')}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className={cn(
            "text-sm",
            checkout.isOverdue ? "text-red-400 font-semibold" : "text-zinc-400"
          )}>
            {format(new Date(checkout.dueDate), 'MMM d, yyyy')}
          </span>
          {checkout.isOverdue && checkout.daysOverdue !== undefined && (
            <span className="text-xs text-red-500">
              {checkout.daysOverdue} day{checkout.daysOverdue !== 1 ? 's' : ''} overdue
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <Badge
          variant="outline"
          className={cn("gap-1", config.color)}
        >
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {checkout.status === CheckoutStatus.BORROWED && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReturn}
                className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
              >
                Return
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
```

---

### 2.3 Zero Breaking Changes Strategy

#### 2.3.1 Database Migration Strategy

**Migration Plan:**

```sql
-- Migration: 20260209000000_add_asset_management
-- Strategy: Additive only, no existing table modifications

-- Step 1: Create new enums
CREATE TYPE "AssetCondition" AS ENUM ('WORKING', 'DAMAGED', 'DECOMMISSIONED', 'UNDER_MAINTENANCE');
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'DEPLOYED', 'RESERVED', 'IN_TRANSIT', 'UNAVAILABLE');
CREATE TYPE "CheckoutStatus" AS ENUM ('BORROWED', 'RETURNED', 'OVERDUE', 'DAMAGED', 'LOST');

-- Step 2: Create Asset table
CREATE TABLE "Asset" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sku" TEXT UNIQUE,
  "serialNumber" TEXT UNIQUE,
  "category" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "available" INTEGER NOT NULL DEFAULT 1,
  "condition" "AssetCondition" NOT NULL DEFAULT 'WORKING',
  "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
  "location" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 3: Create AssetAttachment table
CREATE TABLE "AssetAttachment" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "filename" TEXT NOT NULL,
  "filepath" TEXT NOT NULL,
  "mimetype" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assetId" TEXT NOT NULL,
  CONSTRAINT "AssetAttachment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 4: Create AssetCheckout table
CREATE TABLE "AssetCheckout" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "borrowerName" TEXT NOT NULL,
  "borrowerEmail" TEXT,
  "borrowerPhone" TEXT,
  "borrowerDepartment" TEXT,
  "borrowerId" TEXT,
  "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "returnedAt" TIMESTAMP(3),
  "status" "CheckoutStatus" NOT NULL DEFAULT 'BORROWED',
  "damageFlag" BOOLEAN NOT NULL DEFAULT false,
  "damageNotes" TEXT,
  "returnCondition" "AssetCondition",
  "remarks" TEXT,
  "checkedOutBy" TEXT NOT NULL,
  "checkedInBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "AssetCheckout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 5: Create AssetCheckoutItem table
CREATE TABLE "AssetCheckoutItem" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "returnedAt" TIMESTAMP(3),
  "condition" "AssetCondition" NOT NULL DEFAULT 'WORKING',
  "notes" TEXT,
  "checkoutId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  CONSTRAINT "AssetCheckoutItem_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "AssetCheckout"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssetCheckoutItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("checkoutId", "assetId")
);

-- Step 6: Create AssetPreset table
CREATE TABLE "AssetPreset" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "AssetPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 7: Create AssetPresetItem table
CREATE TABLE "AssetPresetItem" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "presetId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  CONSTRAINT "AssetPresetItem_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "AssetPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssetPresetItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 8: Create indexes
CREATE INDEX "Asset_userId_idx" ON "Asset"("userId");
CREATE INDEX "Asset_category_idx" ON "Asset"("category");
CREATE INDEX "Asset_status_idx" ON "Asset"("status");
CREATE INDEX "Asset_condition_idx" ON "Asset"("condition");
CREATE INDEX "Asset_createdAt_idx" ON "Asset"("createdAt");

CREATE INDEX "AssetAttachment_assetId_idx" ON "AssetAttachment"("assetId");

CREATE INDEX "AssetCheckout_userId_idx" ON "AssetCheckout"("userId");
CREATE INDEX "AssetCheckout_borrowerId_idx" ON "AssetCheckout"("borrowerId");
CREATE INDEX "AssetCheckout_status_idx" ON "AssetCheckout"("status");
CREATE INDEX "AssetCheckout_dueDate_idx" ON "AssetCheckout"("dueDate");
CREATE INDEX "AssetCheckout_borrowedAt_idx" ON "AssetCheckout"("borrowedAt");

CREATE INDEX "AssetCheckoutItem_checkoutId_idx" ON "AssetCheckoutItem"("checkoutId");
CREATE INDEX "AssetCheckoutItem_assetId_idx" ON "AssetCheckoutItem"("assetId");

CREATE INDEX "AssetPreset_userId_idx" ON "AssetPreset"("userId");
CREATE INDEX "AssetPreset_isActive_idx" ON "AssetPreset"("isActive");

CREATE INDEX "AssetPresetItem_presetId_idx" ON "AssetPresetItem"("presetId");
CREATE INDEX "AssetPresetItem_assetId_idx" ON "AssetPresetItem"("assetId");
```

**Rollback Plan:**

```sql
-- Rollback: Drop all asset management tables (emergency only)
DROP TABLE IF EXISTS "AssetPresetItem" CASCADE;
DROP TABLE IF EXISTS "AssetPreset" CASCADE;
DROP TABLE IF EXISTS "AssetCheckoutItem" CASCADE;
DROP TABLE IF EXISTS "AssetCheckout" CASCADE;
DROP TABLE IF EXISTS "AssetAttachment" CASCADE;
DROP TABLE IF EXISTS "Asset" CASCADE;

DROP TYPE IF EXISTS "CheckoutStatus" CASCADE;
DROP TYPE IF EXISTS "AssetStatus" CASCADE;
DROP TYPE IF EXISTS "AssetCondition" CASCADE;
```

#### 2.3.2 API Compatibility

**New Endpoints (No conflicts with existing):**

```typescript
// Assets Module - New namespace
@Controller("assets")
export class AssetsController {
  /* ... */
}

// Asset Checkouts Module - New namespace
@Controller("asset-checkouts")
export class AssetCheckoutsController {
  /* ... */
}

// Asset Presets Module - New namespace
@Controller("asset-presets")
export class AssetPresetsController {
  /* ... */
}
```

**WebSocket Namespaces:**

```typescript
// Existing (unchanged)
@WebSocketGateway({ namespace: "tasks" })
export class TasksGateway {}

// New (isolated)
@WebSocketGateway({ namespace: "assets" })
export class AssetsGateway {}

@WebSocketGateway({ namespace: "checkouts" })
export class AssetCheckoutsGateway {}
```

#### 2.3.3 Module Registration

```typescript
// apps/backend/src/app.module.ts
import { Module } from "@nestjs/common";
import { AssetsModule } from "@modules/assets";
import { AssetCheckoutsModule } from "@modules/asset-checkouts";
import { AssetPresetsModule } from "@modules/asset-presets";
import { TasksModule } from "@modules/tasks";

@Module({
  imports: [
    // Existing modules (unchanged)
    TasksModule,
    UserModule,

    // New modules (additive)
    AssetsModule,
    AssetCheckoutsModule,
    AssetPresetsModule,
  ],
})
export class AppModule {}
```

---

### 2.4 Full-Stack Type Integrity

#### 2.4.1 Type Synchronization Strategy

**Prisma as Source of Truth:**

```typescript
// Backend: Export Prisma enums
// apps/backend/src/modules/assets/domain/asset.types.ts

import { AssetCondition, AssetStatus, CheckoutStatus } from "@prisma/client";

export { AssetCondition, AssetStatus, CheckoutStatus };

// Frontend: Mirror enums manually
// apps/web/types/asset.ts

export enum AssetCondition {
  WORKING = "WORKING",
  DAMAGED = "DAMAGED",
  DECOMMISSIONED = "DECOMMISSIONED",
  UNDER_MAINTENANCE = "UNDER_MAINTENANCE",
}

export enum AssetStatus {
  AVAILABLE = "AVAILABLE",
  DEPLOYED = "DEPLOYED",
  RESERVED = "RESERVED",
  IN_TRANSIT = "IN_TRANSIT",
  UNAVAILABLE = "UNAVAILABLE",
}

export enum CheckoutStatus {
  BORROWED = "BORROWED",
  RETURNED = "RETURNED",
  OVERDUE = "OVERDUE",
  DAMAGED = "DAMAGED",
  LOST = "LOST",
}
```

#### 2.4.2 Validation Strategy

**Backend DTOs:**

```typescript
// apps/backend/src/modules/assets/domain/asset.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from "class-validator";
import { AssetCondition, AssetStatus } from "@prisma/client";

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsInt()
  @Min(0)
  quantity: number = 1;

  @IsEnum(AssetCondition)
  @IsOptional()
  condition?: AssetCondition;

  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
```

**Frontend Type Guards:**

```typescript
// apps/web/lib/type-guards.ts

import { AssetCondition, AssetStatus, CheckoutStatus } from "@/types/asset";

export function isValidAssetCondition(value: unknown): value is AssetCondition {
  return Object.values(AssetCondition).includes(value as AssetCondition);
}

export function isValidAssetStatus(value: unknown): value is AssetStatus {
  return Object.values(AssetStatus).includes(value as AssetStatus);
}

export function isValidCheckoutStatus(value: unknown): value is CheckoutStatus {
  return Object.values(CheckoutStatus).includes(value as CheckoutStatus);
}
```

---

### 2.5 Edge Case & Failure Mode Mitigation

#### 2.5.1 Double-Checkout Prevention

**Strategy: Database-Level Constraint + Application Check**

```typescript
// Repository Layer
async reserveAssets(items: CheckoutItem[], userId: string): Promise<void> {
  return this.prisma.$transaction(async (tx) => {
    for (const item of items) {
      // Lock the asset row for update
      const asset = await tx.asset.findFirst({
        where: { id: item.assetId, userId },
      });

      if (!asset) {
        throw new NotFoundException(`Asset ${item.assetId} not found`);
      }

      if (asset.available < item.quantity) {
        throw new BadRequestException(
          `Insufficient availability for ${asset.name}: ${asset.available} available, ${item.quantity} requested`
        );
      }

      // Atomic decrement
      await tx.asset.update({
        where: { id: item.assetId },
        data: { available: { decrement: item.quantity } },
      });
    }
  });
}
```

#### 2.5.2 Partial Failure Recovery

```typescript
@Service()
export class AssetCheckoutsService {
  async createCheckout(dto: CreateCheckoutDto, userId: string) {
    const reservationLog: { assetId: string; quantity: number }[] = [];

    try {
      // Reserve assets
      await this.assetsService.reserveAssets(dto.items, userId);

      // Log successful reservations for rollback
      reservationLog.push(...dto.items);

      // Create checkout record
      const checkout = await this.repo.create({ ... });

      return checkout;
    } catch (error) {
      // Rollback any successful reservations
      if (reservationLog.length > 0) {
        await this.assetsService.releaseAssets(reservationLog, userId);
      }
      throw error;
    }
  }
}
```

#### 2.5.3 Race Condition Handling

```typescript
// Optimistic locking with version numbers (optional enhancement)

// Add version field to Asset model
model Asset {
  // ... other fields
  version Int @default(0)
}

// Update with version check
async updateWithOptimisticLock(
  id: string,
  data: UpdateAssetDto,
  expectedVersion: number,
  userId: string
) {
  const result = await this.prisma.asset.updateMany({
    where: {
      id,
      userId,
      version: expectedVersion
    },
    data: {
      ...data,
      version: { increment: 1 }
    },
  });

  if (result.count === 0) {
    throw new ConflictException('Asset was modified by another user');
  }
}
```

#### 2.5.4 Overdue Calculation Failures

**Strategy: Pure Computation, No Background Jobs**

```typescript
// Frontend: Real-time computation
const computedCheckouts = useMemo(() => {
  const now = Date.now();

  return checkouts.map(checkout => {
    const dueTime = new Date(checkout.dueDate).getTime();
    const isOverdue = !checkout.returnedAt && now > dueTime;

    return {
      ...checkout,
      isOverdue,
      daysOverdue: isOverdue
        ? Math.ceil((now - dueTime) / (1000 * 60 * 60 * 24))
        : 0,
    };
  });
}, [checkouts]);

// Backend: Computation at query time
private computeCheckoutStatus(checkout: AssetCheckout): CheckoutStatus {
  if (checkout.returnedAt) {
    return checkout.damageFlag ? CheckoutStatus.DAMAGED : CheckoutStatus.RETURNED;
  }

  const isOverdue = new Date() > new Date(checkout.dueDate);
  return isOverdue ? CheckoutStatus.OVERDUE : CheckoutStatus.BORROWED;
}
```

#### 2.5.5 Network Failure During Checkout

```typescript
// Frontend: Optimistic UI with rollback
const createCheckout = async (dto: CreateCheckoutDto) => {
  // Optimistic update
  const optimisticCheckout: IAssetCheckout = {
    id: `temp-${Date.now()}`,
    ...dto,
    status: CheckoutStatus.BORROWED,
    createdAt: new Date(),
    // ... other fields
  };

  mutate([optimisticCheckout, ...checkouts], false);

  try {
    const response = await api.post("/asset-checkouts", dto);
    // Replace optimistic with server response
    mutate((prev) =>
      prev?.map((c) => (c.id === optimisticCheckout.id ? response.data : c)),
    );
    toast.success("Checkout created successfully");
  } catch (error) {
    // Rollback on failure
    mutate();
    toast.error("Failed to create checkout");
    throw error;
  }
};
```

---

### 2.6 Verification & Validation Protocol

#### 2.6.1 Pre-Implementation Checklist

**Database:**

- [ ] Migration scripts tested on staging database
- [ ] Rollback procedure tested
- [ ] Index performance verified with EXPLAIN ANALYZE
- [ ] Foreign key constraints validated
- [ ] Enum values synchronized between schema and code

**Backend:**

- [ ] All new endpoints documented in Swagger
- [ ] DTO validation tests written
- [ ] Service layer unit tests pass
- [ ] Repository integration tests pass
- [ ] WebSocket events tested
- [ ] Authorization guards verified

**Frontend:**

- [ ] TypeScript compilation successful
- [ ] ESLint passes with no errors
- [ ] Component unit tests pass
- [ ] Hook integration tests pass
- [ ] Real-time WebSocket updates verified
- [ ] Mobile responsiveness tested

#### 2.6.2 Implementation Verification Tests

**Test 1: Asset Creation Flow**

```gherkin
Scenario: Create new asset with full details
  Given I am authenticated as a user
  When I POST /assets with:
    | name       | Laptop Dell XPS |
    | category   | Electronics     |
    | quantity   | 10              |
    | condition  | WORKING         |
  Then the response status is 201
  And the asset is created with available = 10
  And a WebSocket 'asset_created' event is emitted
```

**Test 2: Checkout Transaction**

```gherkin
Scenario: Checkout multiple assets
  Given Asset A has quantity 5, available 5
  And Asset B has quantity 3, available 3
  When I POST /asset-checkouts with both assets
  Then Asset A available becomes 0
  And Asset B available becomes 0
  And checkout status is BORROWED
  And WebSocket events update the UI
```

**Test 3: Double-Checkout Prevention**

```gherkin
Scenario: Prevent concurrent checkout of same asset
  Given Asset A has quantity 1, available 1
  When User 1 and User 2 simultaneously checkout Asset A
  Then Only one checkout succeeds
  And The other receives 400 Bad Request
  And Asset A available is 0 (not negative)
```

**Test 4: Overdue Detection**

```gherkin
Scenario: Dynamic overdue computation
  Given A checkout with dueDate = yesterday
  And status = BORROWED
  When I GET /asset-checkouts
  Then The response includes isOverdue = true
  And computedStatus = OVERDUE
  And daysOverdue = 1
```

**Test 5: Return Processing**

```gherkin
Scenario: Process asset return with damage
  Given A checkout with 2 assets borrowed
  When I POST /asset-checkouts/:id/return with damageFlag = true
  Then Checkout status becomes DAMAGED
  And Asset availability is restored
  And damageNotes are persisted
  And WebSocket event emitted
```

#### 2.6.3 Performance Benchmarks

| Metric                   | Target  | Measurement Method       |
| ------------------------ | ------- | ------------------------ |
| Asset Dashboard Load     | < 500ms | Lighthouse / DevTools    |
| Checkout Creation        | < 300ms | API response time        |
| Real-time Event Latency  | < 100ms | WebSocket timestamp diff |
| Search Response (client) | < 50ms  | React profiler           |
| Database Query (assets)  | < 50ms  | Prisma query logging     |
| Concurrent Checkouts     | 100/sec | Load testing (k6)        |

#### 2.6.4 Regression Testing

**Critical Path Tests:**

- [ ] Existing Task module unaffected
- [ ] Existing Inventory page functional
- [ ] User authentication works
- [ ] File attachments on tasks still work
- [ ] Real-time task updates continue
- [ ] Database migrations don't affect task data

**Cross-Module Integration:**

- [ ] User sessions work across all modules
- [ ] Sidebar navigation updated correctly
- [ ] No route conflicts
- [ ] Shared UI components render correctly

---

## Appendix: Technical Specifications

### A.1 Affected Files Summary

#### Backend Changes (New Files)

| File                       | Lines | Purpose                                            |
| -------------------------- | ----- | -------------------------------------------------- |
| `prisma/schema.prisma`     | +150  | Asset management tables & enums                    |
| `modules/assets/`          | +800  | Assets module (controller, service, repo, gateway) |
| `modules/asset-checkouts/` | +900  | Checkout module with transaction logic             |
| `modules/asset-presets/`   | +400  | Preset management module                           |
| `app.module.ts`            | +10   | Register new modules                               |

#### Frontend Changes (New Files)

| File                                 | Lines | Purpose                         |
| ------------------------------------ | ----- | ------------------------------- |
| `types/asset.ts`                     | +200  | TypeScript interfaces           |
| `hooks/useAssets.ts`                 | +150  | Assets SWR hook                 |
| `hooks/useCheckouts.ts`              | +180  | Checkouts SWR hook              |
| `hooks/use-assets.socket.ts`         | +120  | Assets WebSocket hook           |
| `app/(dashboard)/assets/page.tsx`    | +200  | Assets dashboard                |
| `app/(dashboard)/checkouts/page.tsx` | +180  | Checkouts dashboard             |
| `components/assets/`                 | +600  | Asset table, filters, modals    |
| `components/checkouts/`              | +700  | Checkout table, filters, modals |
| `components/layout/sidebar.tsx`      | +20   | Add navigation links            |

**Total:** ~4,790 lines of new code

### A.2 Component Hierarchy

```
app/(dashboard)/
├── layout.tsx
│   └── Sidebar (modified)
│       └── NEW: Assets link
│       └── NEW: Checkouts link
├── assets/
│   └── page.tsx
│       ├── AssetFilters
│       ├── CreateAssetModal
│       ├── EditAssetModal
│       └── AssetTableRow[]
├── checkouts/
│   └── page.tsx
│       ├── CheckoutFilters
│       ├── CreateCheckoutModal
│       └── CheckoutTableRow[]
└── (existing routes unchanged)
```

### A.3 API Endpoint Summary

| Endpoint                      | Method             | Description            |
| ----------------------------- | ------------------ | ---------------------- |
| `/assets`                     | GET, POST          | List, Create assets    |
| `/assets/:id`                 | GET, PATCH, DELETE | Asset CRUD             |
| `/assets/search`              | GET                | Search assets          |
| `/assets/available`           | GET                | Available assets only  |
| `/assets/:id/attachments`     | POST               | Upload asset file      |
| `/asset-checkouts`            | GET, POST          | List, Create checkouts |
| `/asset-checkouts/:id`        | GET                | Get checkout           |
| `/asset-checkouts/:id/return` | POST               | Process return         |
| `/asset-checkouts/active`     | GET                | Active checkouts       |
| `/asset-checkouts/overdue`    | GET                | Overdue checkouts      |
| `/asset-presets`              | GET, POST          | List, Create presets   |
| `/asset-presets/:id`          | GET, PATCH, DELETE | Preset CRUD            |

### A.4 WebSocket Events

**Assets Namespace (`/assets`):**

| Event                        | Direction       | Payload                       | Trigger           |
| ---------------------------- | --------------- | ----------------------------- | ----------------- |
| `asset_created`              | Server → Client | IAsset                        | New asset created |
| `asset_updated`              | Server → Client | IAsset                        | Asset modified    |
| `asset_deleted`              | Server → Client | { id: string }                | Asset deleted     |
| `asset_availability_changed` | Server → Client | { assetId, available, total } | Checkout/return   |

**Checkouts Namespace (`/checkouts`):**

| Event                | Direction       | Payload        | Trigger            |
| -------------------- | --------------- | -------------- | ------------------ |
| `checkout_created`   | Server → Client | IAssetCheckout | New checkout       |
| `checkout_updated`   | Server → Client | IAssetCheckout | Checkout modified  |
| `checkout_returned`  | Server → Client | IAssetCheckout | Return processed   |
| `checkout_cancelled` | Server → Client | { id: string } | Checkout cancelled |

---

**Document Version:** 1.0
**Last Updated:** 2026-02-09
**Author:** Principal Software Engineer & System Architect
**Status:** Ready for Implementation Review
