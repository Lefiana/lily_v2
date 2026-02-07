# Inventory-to-Task File Mapping & Task Categorization

## Strategic Implementation Plan

**Date:** 2026-02-07  
**Author:** Principal Software Engineer & System Architect  
**Status:** Phase I Complete - Ready for Phase II Review  
**Estimated Effort:** 3-4 Sprints (6-8 weeks)  
**Risk Level:** Medium (requires database migration and UI transformation)

---

## Table of Contents

1. [Phase I: Architectural Audit Findings](#phase-i-architectural-audit-findings)
2. [Phase II: Strategic Implementation Plan](#phase-ii-strategic-implementation-plan)
3. [Clarification Gates (Required)](#clarification-gates-required)
4. [Appendix: Technical Specifications](#appendix-technical-specifications)

---

## Phase I: Architectural Audit Findings

### 1.1 Project Overview

**Lily_V2** is a full-stack task management application with a gamified "Quest Board" interface. The codebase follows modern architectural patterns with clear separation of concerns.

**Architecture Pattern:** Monorepo (Turborepo + pnpm workspaces)  
**Frontend:** Next.js 16.1.0 + React 19.2.0 + TypeScript 5.9.2  
**Backend:** NestJS 11.x + TypeScript 5.7.3  
**Database:** PostgreSQL + Prisma ORM 6.19.0  
**State Management:** SWR for server state, WebSocket for real-time updates  
**Styling:** Tailwind CSS 3 + Custom Glass-morphism theme  
**Auth:** Better-Auth with session-based authentication

### 1.2 Current Data Schema Analysis

#### 1.2.1 Core Entities

```prisma
// apps/backend/prisma/schema.prisma (Lines 26-46)

model Task {
  id             String           @id @default(cuid())
  title          String
  description    String?
  status         TaskStatus       @default(TODO)
  priority       TaskPriority     @default(MEDIUM)
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
}

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
```

#### 1.2.2 Current Enumerations

```prisma
// Existing Classification Systems (Lines 80-104)

enum TaskPriority { LOW, MEDIUM, HIGH }
enum TaskStatus { TODO, IN_PROGRESS, COMPLETED, CANCELLED }
enum UserRole { USER, ADMIN }
enum RecurrenceType { NONE, DAILY, WEEKLY, MONTHLY, YEARLY }
```

**Critical Finding:** No `TaskCategory` or `TaskType` enumeration exists. This will require schema extension.

### 1.3 File Storage Architecture

**Current Implementation:**

- **Storage Type:** Local disk storage via Multer
- **Location:** `apps/backend/uploads/`
- **Max File Size:** 10MB per file
- **Max Files:** 10 files per bulk upload
- **Naming Convention:** `file-${timestamp}-${random}.${ext}`
- **URL Pattern:** `/uploads/${filename}`

**Key Endpoints:**

```typescript
// apps/backend/src/modules/tasks/controllers/tasks.controller.ts

@Post(':id/attachments')           // Single file upload (Line 65)
@Post(':id/attachments/bulk')      // Bulk upload (Line 85)
@Get('attachments/:id/download')   // File download (Line 45)
@Delete('attachments/:id')         // File deletion (Line 57)
```

**Security Considerations:**

- ✅ Files are scoped to task ownership via user verification
- ✅ File metadata stored in database with CUID references
- ⚠️ No virus scanning implemented
- ⚠️ No file type restrictions beyond Multer defaults

### 1.4 Frontend Component Architecture

#### 1.4.1 Available UI Components (Shadcn/UI)

```
apps/web/components/ui/
├── button.tsx          # Custom glass-themed buttons
├── badge.tsx           # Status/priority indicators
├── card.tsx            # Container components
├── dialog.tsx          # Modal system
├── select.tsx          # Dropdowns (@radix-ui/react-select)
├── input.tsx           # Form inputs
├── textarea.tsx        # Multi-line text
├── collapsible.tsx     # Expandable sections
└── avatar.tsx          # User avatars
```

#### 1.4.2 Task-Specific Components

```
apps/web/components/tasks/
├── task-table-row.tsx       # Main task display (408 lines)
├── task-card.tsx            # Alternative card view
├── create-task-modal.tsx    # Task creation (73 lines)
├── edit-task-modal.tsx      # Task editing
├── attachment-list.tsx      # File display component
└── file-upload.tsx          # Upload interface
```

#### 1.4.3 Current Task List Features

The `TaskTableRow` component (`apps/web/components/tasks/task-table-row.tsx`) provides:

1. **Collapsible Row Design** (Lines 139-404)
   - Expand/collapse with Chevron animation
   - Drag-and-drop file upload support
   - Progress bar for subtask completion

2. **Task Information Display** (Lines 159-184)
   - Title with completion strikethrough
   - Status badge (TODO, IN_PROGRESS, COMPLETED, CANCELLED)
   - Due date with calendar icon
   - Mini progress bar for subtasks

3. **Expanded Details Section** (Lines 216-403)
   - **Subtasks Panel:** Toggle completion, add/remove objectives
   - **Description Panel:** Lore/description display
   - **Attachments Panel:** Grid display with image preview, download, delete

### 1.5 State Management & Data Flow

#### 1.5.1 Backend Data Flow

```
Controller → Service → Repository → Prisma → PostgreSQL
     ↓           ↓           ↓
Gateway (WebSocket for real-time updates)
```

**Key Files:**

- Controller: `apps/backend/src/modules/tasks/controllers/tasks.controller.ts`
- Service: `apps/backend/src/modules/tasks/services/tasks.service.ts`
- Repository: `apps/backend/src/modules/tasks/repositories/tasks.repository.ts`
- Gateway: `apps/backend/src/modules/tasks/gateways/tasks.gateway.ts`

#### 1.5.2 Frontend Data Flow

```
Page Component → useTasks Hook → SWR → API Client → Backend
                      ↓
              useTaskSocket (WebSocket events)
                      ↓
              Optimistic UI Updates
```

**Key Files:**

- Hook: `apps/web/hooks/useTasks.ts`
- Socket Hook: `apps/web/hooks/use-tasks.socket.ts`
- API Client: `apps/web/lib/api.ts`

#### 1.5.3 Real-time Event System

**WebSocket Events (Line 37-40 in use-tasks.socket.ts):**

```typescript
const refreshEvents = [
  "task_created",
  "task_updated",
  "task_deleted",
  "attachment_added",
  "attachment_deleted",
  "subtask_deleted",
  "subtask_added",
  "subtask_updated",
];
```

### 1.6 API Contract Analysis

#### 1.6.1 Current Task Endpoints

```typescript
// apps/backend/src/modules/tasks/controllers/tasks.controller.ts

@Post()                            // Create task
@Get('search')                     // Search by query
@Get()                             // List all tasks
@Get(':id')                        // Get single task
@Patch(':id')                      // Update task
@Delete(':id')                     // Delete task

// Subtask Endpoints
@Post(':id/subtasks')              // Add subtask (Line 106)
@Patch('subtasks/:subtaskId')      // Update subtask (Line 115)
@Delete('subtasks/:subtaskId')     // Delete subtask (Line 124)

// Attachment Endpoints
@Post(':id/attachments')           // Upload file (Line 65)
@Post(':id/attachments/bulk')      // Bulk upload (Line 85)
@Get('attachments/:id/download')   // Download (Line 45)
@Delete('attachments/:id')         // Delete (Line 57)
```

#### 1.6.2 TypeScript Interfaces

```typescript
// apps/web/types/task.ts (Lines 31-43, 87-90)

interface ITask {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  status: TaskStatus;
  priority?: string | null;
  dueDate?: Date | String | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  recurrence: string | null;
}

interface ITaskWithSubtasks extends ITask {
  subtask: ISubtask[];
  TaskAttachment: ITaskAttachment[];
}
```

### 1.7 Navigation & Routing Structure

```
apps/web/app/
├── (dashboard)/
│   ├── layout.tsx              # Dashboard shell with sidebar
│   ├── tasks/
│   │   └── page.tsx            # Quest Board (main view)
│   └── inventory/              # ❌ DOES NOT EXIST - needs creation
├── login/
│   └── page.tsx
├── register/
│   └── page.tsx
└── page.tsx                    # Root redirect
```

**Sidebar Navigation** (`apps/web/components/layout/sidebar.tsx` Lines 65-69):

```typescript
const routes = [
  { label: "Quest Board", icon: LayoutDashboard, href: "/tasks" },
  { label: "Gacha", icon: Swords, href: "/gacha" },
  { label: "Inventory", icon: Package, href: "/inventory" }, // Route exists but page doesn't
];
```

### 1.8 Identified Architectural Constraints

#### 1.8.1 Database Constraints

1. **No Category Field:** Tasks lack categorization capability
2. **No File Metadata Indexing:** Cannot efficiently query files by task attributes
3. **No Soft Deletes:** Task deletion cascades to attachments (physical file deletion)

#### 1.8.2 API Constraints

1. **Search Limitations:** Current search only covers title/description (Line 59-64 in tasks.repository.ts)
2. **No Bulk Operations:** Cannot update multiple tasks simultaneously
3. **No Pagination:** Task list loads all records (performance risk at scale)

#### 1.8.3 Frontend Constraints

1. **No Virtual Scrolling:** Task list renders all items regardless of viewport
2. **Filter State Not Persisted:** No URL query params or localStorage for filters
3. **Mobile Layout Limitations:** Table design not optimized for mobile

### 1.9 Security & Performance Audit

#### 1.9.1 Security Findings

**Strengths:**

- ✅ Authentication via Better-Auth with session management
- ✅ Authorization checks on all task operations (userId verification)
- ✅ CSRF protection via cookie-based sessions
- ✅ File access requires task ownership verification

**Vulnerabilities:**

- ⚠️ `@AllowAnonymous()` decorator on TasksController (Line 18) - allows unauthenticated access
- ⚠️ No rate limiting on file upload endpoints
- ⚠️ No file type validation beyond mimetype (easily spoofed)
- ⚠️ No file size validation on frontend before upload

#### 1.9.2 Performance Findings

**Bottlenecks:**

- ⚠️ No database connection pooling configuration visible
- ⚠️ File downloads load entire file into memory before streaming
- ⚠️ Task queries load all attachments unconditionally
- ⚠️ WebSocket broadcasts to all user sessions simultaneously

**Recommendations:**

- Implement cursor-based pagination for task lists
- Add Redis caching layer for frequent queries
- Use streams for file downloads
- Implement lazy loading for attachments

### 1.10 Mission-Critical Features Analysis

#### 1.10.1 Features Adjacent to Proposed Changes

| Feature            | Location                     | Impact Risk | Notes                                       |
| ------------------ | ---------------------------- | ----------- | ------------------------------------------- |
| Real-time Updates  | `tasks.gateway.ts`           | **HIGH**    | WebSocket events must include category data |
| File Upload        | `tasks.controller.ts:65-102` | **MEDIUM**  | Upload flow must maintain compatibility     |
| Task Search        | `tasks.repository.ts:55-72`  | **HIGH**    | Search must support category filtering      |
| Task Creation      | `create-task-modal.tsx`      | **MEDIUM**  | Must default to legacy category             |
| Optimistic Updates | `useTasks.ts:36-58`          | **MEDIUM**  | Category field must be handled              |

#### 1.10.2 Shared Utilities

```
apps/web/lib/
├── api.ts              # Axios client - no changes needed
├── utils.ts            # cn() utility - no changes needed
└── auth-client.ts      # Better-auth client - no changes needed

apps/backend/src/core/
├── prisma/
│   └── prisma.service.ts    # Database connection - monitor migration impact
└── decorators/
    └── active-user.decorator.ts  # User context - no changes needed
```

---

## Phase II: Strategic Implementation Plan

### 2.1 Executive Summary

This plan outlines the implementation of two major features:

1. **Inventory UI Transformation:** A Google Drive-style file browser where Task titles act as folders containing associated files
2. **Task Categorization System:** A type discriminator (TASK vs ITEM vs LOG) with UI filtering

**Strategic Goals:**

- Enhance file discoverability through task-based organization
- Enable better task classification and filtering
- Maintain 100% backward compatibility
- Zero production downtime during migration

### 2.2 Core Logic Roadmap

#### 2.2.1 Database Schema Changes

**Migration 1: Add TaskCategory Enum and Field**

```prisma
// apps/backend/prisma/schema.prisma

// Add new enum (after line 104)
enum TaskCategory {
  TASK      // Standard actionable task (default)
  ITEM      // Inventory item, reference material
  LOG       // Journal entry, note, or record
  ARCHIVE   // Legacy/completed items (for future use)
}

// Modify Task model (line 26-46)
model Task {
  id             String           @id @default(cuid())
  title          String
  description    String?
  status         TaskStatus       @default(TODO)
  priority       TaskPriority     @default(MEDIUM)
  category       TaskCategory     @default(TASK)  // NEW FIELD
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
  @@index([category])  // NEW INDEX
}
```

**Migration SQL:**

```sql
-- Create enum type
CREATE TYPE "TaskCategory" AS ENUM ('TASK', 'ITEM', 'LOG', 'ARCHIVE');

-- Add column with default
ALTER TABLE "Task" ADD COLUMN "category" "TaskCategory" NOT NULL DEFAULT 'TASK';

-- Create index
CREATE INDEX "Task_category_idx" ON "Task"("category");

-- Update Prisma migration metadata
```

#### 2.2.2 Backend API Extensions

**1. Update DTOs** (`apps/backend/src/modules/tasks/domain/task.dto.ts`)

```typescript
// Add import
import { TaskCategory } from "@prisma/client";

// Update CreateTaskDto (Line 11-41)
export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(TaskCategory) // NEW
  @IsOptional()
  category?: TaskCategory;

  @IsDateString()
  @IsOptional()
  dueDate?: Date;

  @IsEnum(RecurrenceType)
  @IsOptional()
  recurrence?: RecurrenceType;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateSubtaskDto)
  subtasks?: CreateSubtaskDto[];
}

// UpdateTaskDto inherits from CreateTaskDto via PartialType - no changes needed
```

**2. Update Repository** (`apps/backend/src/modules/tasks/repositories/tasks.repository.ts`)

```typescript
// Update findAll method (Line 55-72)
async findAll(
  userId: string,
  filters?: {
    status?: any;
    query?: string;
    category?: TaskCategory;  // NEW
  }
) {
  const where: Prisma.TaskWhereInput = {
    userId,
    ...(filters?.status && { status: filters.status }),
    ...(filters?.category && { category: filters.category }),  // NEW
    ...(filters?.query && {
      OR: [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ],
    }),
  };

  return this.prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: { createdAt: 'desc' },
  });
}

// Add new method for inventory view
async findAllWithAttachments(userId: string, filters?: { category?: TaskCategory }) {
  const where: Prisma.TaskWhereInput = {
    userId,
    TaskAttachment: { some: {} },  // Only tasks with attachments
    ...(filters?.category && { category: filters.category }),
  };

  return this.prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: { updatedAt: 'desc' },
  });
}
```

**3. Update Service** (`apps/backend/src/modules/tasks/services/tasks.service.ts`)

```typescript
// Add import
import { TaskCategory } from '@prisma/client';

// Update findAll signature (Line 147-153)
async findAll(
  userId: string,
  query?: string,
  category?: TaskCategory  // NEW
) {
  try {
    return await this.repo.findAll(userId, { query, category });
  } catch (error) {
    this.handleError(error, 'Error fetching tasks');
  }
}

// Add new method for inventory
async findAllForInventory(userId: string, category?: TaskCategory) {
  try {
    return await this.repo.findAllWithAttachments(userId, { category });
  } catch (error) {
    this.handleError(error, 'Error fetching inventory');
  }
}
```

**4. Update Controller** (`apps/backend/src/modules/tasks/controllers/tasks.controller.ts`)

```typescript
// Add import
import { TaskCategory } from '@prisma/client';

// Update search endpoint (Line 30-36)
@Get('search')
async search(
  @Query('q') q: string,
  @Query('category') category?: TaskCategory,  // NEW
  @ActiveUser('id') userId: string
) {
  return this.tasksService.findAll(userId, q, category);
}

// Update findAll endpoint (Line 38-42)
@Get()
async findAll(
  @Query('category') category?: TaskCategory,  // NEW
  @ActiveUser('id') userId: string
) {
  console.log(`✅ Controller received UserID from Decorator: ${userId}`);
  return this.tasksService.findAll(userId, undefined, category);
}

// Add new inventory endpoint
@Get('inventory')
async getInventory(
  @Query('category') category?: TaskCategory,
  @ActiveUser('id') userId: string
) {
  return this.tasksService.findAllForInventory(userId, category);
}
```

#### 2.2.3 Frontend Type Extensions

**1. Update TypeScript Interfaces** (`apps/web/types/task.ts`)

```typescript
// Add new enum (after line 8)
export enum TaskCategory {
  TASK = "TASK",
  ITEM = "ITEM",
  LOG = "LOG",
  ARCHIVE = "ARCHIVE",
}

// Update ITask interface (Line 31-43)
export interface ITask {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  status: TaskStatus;
  priority?: string | null;
  category?: TaskCategory | null; // NEW
  dueDate?: Date | String | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  recurrence: string | null;
}

// Update DTOs
export interface ICreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: string;
  category?: TaskCategory; // NEW
  dueDate?: Date | string | null;
  subtasks?: ICreateSubtaskDto[];
}

export interface IUpdateTaskDto {
  title?: string;
  description?: string;
  completed?: boolean;
  status?: TaskStatus;
  priority?: string;
  category?: TaskCategory; // NEW
  dueDate?: Date | string | null;
}
```

#### 2.2.4 Frontend Hook Updates

**1. Update useTasks Hook** (`apps/web/hooks/useTasks.ts`)

```typescript
// Add import
import { TaskCategory } from "@/types/task";

// Update hook signature
export const useTasks = (
  userId: string,
  category?: TaskCategory, // NEW
  query?: string, // NEW - for search
) => {
  // Build query string
  const queryParams = new URLSearchParams();
  if (category) queryParams.append("category", category);
  if (query) queryParams.append("q", query);

  const queryString = queryParams.toString();
  const endpoint = `/tasks${queryString ? `?${queryString}` : ""}`;

  const {
    data: tasks,
    error,
    isLoading,
    mutate,
  } = useSWR<ITaskWithSubtasks[]>(userId ? endpoint : null, fetcher);

  // ... rest of implementation remains the same

  // Update createTask to include category
  const createTask = async (
    title: string,
    description?: string,
    taskCategory?: TaskCategory, // NEW
  ) => {
    const optimisticTask: ITaskWithSubtasks = {
      id: `temp-${Date.now()}`,
      title,
      description: description || null,
      completed: false,
      status: TaskStatus.TODO,
      category: taskCategory || TaskCategory.TASK, // NEW
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
      subtask: [],
      TaskAttachment: [],
      recurrence: null,
    };

    mutate([optimisticTask, ...(tasks || [])], false);

    try {
      await api.post("/tasks", {
        title,
        description,
        category: taskCategory || TaskCategory.TASK, // NEW
      });
      toast.success("Quest started!");
    } catch (err) {
      mutate();
      toast.error("Failed to create quest.");
    }
  };

  return {
    tasks: tasks || [],
    isLoading,
    error,
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
    revalidate: () => mutate(),
  };
};

// Add new hook for inventory
export const useInventory = (userId: string, category?: TaskCategory) => {
  const queryParams = new URLSearchParams();
  if (category) queryParams.append("category", category);

  const queryString = queryParams.toString();
  const endpoint = `/tasks/inventory${queryString ? `?${queryString}` : ""}`;

  const {
    data: tasks,
    error,
    isLoading,
    mutate,
  } = useSWR(userId ? endpoint : null, fetcher);

  return {
    tasks: tasks || [],
    isLoading,
    error,
    revalidate: () => mutate(),
  };
};
```

#### 2.2.5 Inventory UI Implementation

**1. Create Inventory Page** (`apps/web/app/(dashboard)/inventory/page.tsx`)

```typescript
'use client';

import { useState } from "react"
import { useInventory } from "@/hooks/useTasks";
import { authClient } from "@/lib/auth-client";
import { TaskCategory } from "@/types/task";
import { InventoryBrowser } from "@/components/inventory/inventory-browser";
import { CategoryFilter } from "@/components/tasks/category-filter";
import { Folder, FileText, Scroll } from "lucide-react";

export default function InventoryPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || "";
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | undefined>();

  const { tasks, isLoading } = useInventory(userId, selectedCategory);

  if (isLoading) return <div className="text-white p-8">Loading Inventory...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white uppercase">Inventory</h2>
          <p className="text-zinc-400">Browse files organized by task.</p>
        </div>

        <CategoryFilter
          value={selectedCategory}
          onChange={setSelectedCategory}
        />
      </div>

      <InventoryBrowser tasks={tasks} />
    </div>
  );
}
```

**2. Create Inventory Browser Component** (`apps/web/components/inventory/inventory-browser.tsx`)

```typescript
"use client";

import { useState } from "react";
import { ITaskWithSubtasks, TaskCategory } from "@/types/task";
import { Folder, FileText, ChevronRight, ChevronDown, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InventoryBrowserProps {
  tasks: ITaskWithSubtasks[];
}

interface TaskNode {
  id: string;
  title: string;
  category: TaskCategory;
  attachments: ITaskWithSubtasks['TaskAttachment'];
  isOpen: boolean;
}

export function InventoryBrowser({ tasks }: InventoryBrowserProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Filter tasks by search query
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.TaskAttachment.some(att => att.filename.toLowerCase().includes(query))
    );
  });

  // Group tasks by first letter for organization
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const firstLetter = task.title[0].toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(task);
    return acc;
  }, {} as Record<string, ITaskWithSubtasks[]>);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Search tasks and files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 glass-input"
        />
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
          <Folder className="h-12 w-12 mb-4 opacity-50" />
          <p>No files found in inventory.</p>
          <p className="text-sm">Upload files to tasks to see them here.</p>
        </div>
      )}

      {/* File Browser */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        {Object.entries(groupedTasks)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([letter, letterTasks]) => (
          <div key={letter} className="border-b border-white/5 last:border-b-0">
            {/* Section Header */}
            <div className="px-4 py-2 bg-white/[0.02] text-xs font-bold text-zinc-600 uppercase tracking-wider">
              {letter}
            </div>

            {/* Task Folders */}
            <div className="divide-y divide-white/5">
              {letterTasks.map((task) => (
                <div key={task.id}>
                  {/* Task Folder Header */}
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 transition-colors",
                      "hover:bg-white/[0.02]"
                    )}
                  >
                    {expandedTasks.has(task.id) ? (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    )}
                    <Folder className="h-5 w-5 text-blue-400" />
                    <span className="flex-1 text-left text-sm text-zinc-300 truncate">
                      {task.title}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {task.TaskAttachment.length} file{task.TaskAttachment.length !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Expanded Files */}
                  {expandedTasks.has(task.id) && (
                    <div className="bg-black/20">
                      {task.TaskAttachment.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 px-12 py-2 hover:bg-white/[0.02] transition-colors"
                        >
                          <FileText className="h-4 w-4 text-zinc-600" />
                          <span className="flex-1 text-sm text-zinc-400 truncate">
                            {attachment.filename}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {(attachment.size / 1024).toFixed(1)} KB
                          </span>
                          <a
                            href={`http://localhost:3001/api/tasks/attachments/${attachment.id}/download`}
                            download
                            className="p-2 hover:bg-white/10 rounded transition-colors"
                            title="Download"
                          >
                            <Download className="h-3 w-3 text-zinc-500" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**3. Create Category Filter Component** (`apps/web/components/tasks/category-filter.tsx`)

```typescript
"use client";

import { TaskCategory } from "@/types/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Folder, Package, Scroll, Archive } from "lucide-react";

interface CategoryFilterProps {
  value?: TaskCategory;
  onChange: (category: TaskCategory | undefined) => void;
}

const categoryIcons = {
  [TaskCategory.TASK]: Folder,
  [TaskCategory.ITEM]: Package,
  [TaskCategory.LOG]: Scroll,
  [TaskCategory.ARCHIVE]: Archive,
};

const categoryLabels = {
  [TaskCategory.TASK]: "Tasks",
  [TaskCategory.ITEM]: "Items",
  [TaskCategory.LOG]: "Logs",
  [TaskCategory.ARCHIVE]: "Archive",
};

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <Select
      value={value || "all"}
      onValueChange={(val) => onChange(val === "all" ? undefined : val as TaskCategory)}
    >
      <SelectTrigger className="w-[180px] glass-input">
        <SelectValue placeholder="All Categories" />
      </SelectTrigger>
      <SelectContent className="glass-card border-white/10">
        <SelectItem value="all">All Categories</SelectItem>
        {Object.values(TaskCategory).map((category) => {
          const Icon = categoryIcons[category];
          return (
            <SelectItem key={category} value={category}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{categoryLabels[category]}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
```

#### 2.2.6 Task Page Enhancements

**1. Update Tasks Page with Category Filter** (`apps/web/app/(dashboard)/tasks/page.tsx`)

```typescript
'use client';

import { useState } from "react"
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { TaskTableRow } from "@/components/tasks/task-table-row";
import { EditTaskModal } from "@/components/tasks/edit-task-modal";
import { useTasks } from "@/hooks/useTasks";
import { authClient } from "@/lib/auth-client";
import { ITaskWithSubtasks, TaskCategory } from "@/types/task";
import { useTaskSocket } from "@/hooks/use-tasks.socket";
import { CategoryFilter } from "@/components/tasks/category-filter";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function TasksPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || "";

  // NEW: State for filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | undefined>();

  const { tasks, isLoading, deleteTask, updateTask } = useTasks(
    userId,
    selectedCategory,  // NEW
    searchQuery        // NEW
  );

  // State for the Edit Modal
  const [selectedTask, setSelectedTask] = useState<ITaskWithSubtasks | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useTaskSocket(userId);

  const handleEditClick = (task: ITaskWithSubtasks) => {
    setSelectedTask(task)
    setIsEditOpen(true)
  }

  if (isLoading) return <div className="text-white p-8">Loading Quests...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white uppercase">Quest Board</h2>
          <p className="text-zinc-400">Complete tasks to earn rewards and progress.</p>
        </div>

        <CreateTaskModal userId={session?.user?.id || ""} />
      </div>

      {/* NEW: Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search quests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass-input"
          />
        </div>
        <CategoryFilter
          value={selectedCategory}
          onChange={setSelectedCategory}
        />
      </div>

      {/* TABLE SECTION */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        {/* Header Row */}
        <div className="hidden md:flex items-center gap-4 px-6 py-3 bg-white/5 border-b border-white/10 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          <div className="w-8" />
          <div className="flex-1">Active Quests</div>
          <div className="w-32">Category</div>  {/* NEW */}
          <div className="w-24 text-right">Actions</div>
        </div>

        <div className="flex flex-col">
          {tasks.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-500 italic">
              No active quests. Click "New Quest" to begin.
            </div>
          ) : (
            tasks.map((task: ITaskWithSubtasks) => (
              <TaskTableRow
                key={task.id}
                task={task}
                onDelete={(id) => deleteTask(id)}
                onEdit={() => handleEditClick(task)}
              />
            ))
          )}
        </div>

        {/* Edit Task Modal */}
        <EditTaskModal
          task={selectedTask}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSave={updateTask}
        />
      </div>
    </div>
  );
}
```

**2. Update Task Table Row to Display Category** (`apps/web/components/tasks/task-table-row.tsx`)

```typescript
// Add import
import { TaskCategory } from "@/types/task";
import { Folder, Package, Scroll } from "lucide-react";

// Add category icon mapping
const categoryIcons = {
  [TaskCategory.TASK]: Folder,
  [TaskCategory.ITEM]: Package,
  [TaskCategory.LOG]: Scroll,
};

// Update the main row display (around Line 159-184)
<div className="flex items-center gap-3">
  <span className={`font-medium truncate text-zinc-100 ${task.status === TaskStatus.COMPLETED ? 'line-through text-zinc-500' : ''}`}>
    {task.title}
  </span>
  <Badge variant="outline" className="text-[10px] border-white/20 text-zinc-400 uppercase font-bold px-1.5 h-5">
    {task.status}
  </Badge>

  {/* NEW: Category Badge */}
  {task.category && task.category !== TaskCategory.TASK && (
    <Badge
      variant="outline"
      className="text-[10px] border-blue-500/30 text-blue-400 uppercase font-bold px-1.5 h-5"
    >
      {task.category}
    </Badge>
  )}

  {dueDate && (
    <span className="flex items-center gap-1 text-xs text-zinc-500">
      <Calendar className="h-3 w-3" />
      {dueDate}
    </span>
  )}
</div>
```

**3. Update Create Task Modal** (`apps/web/components/tasks/create-task-modal.tsx`)

```typescript
// Add imports
import { TaskCategory } from "@/types/task";
import { CategoryFilter } from "./category-filter";

// Add state
const [category, setCategory] = useState<TaskCategory>(TaskCategory.TASK);

// Update onSubmit
const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!title.trim()) return;

  await createTask(title, description, category);  // Pass category
  setTitle("");
  setDescription("");
  setCategory(TaskCategory.TASK);  // Reset
  setOpen(false);
};

// Add category selector to form
<div className="space-y-2">
  <label className="text-xs uppercase text-zinc-500 font-bold">Category</label>
  <CategoryFilter
    value={category}
    onChange={(cat) => setCategory(cat || TaskCategory.TASK)}
  />
</div>
```

**4. Update Edit Task Modal** (`apps/web/components/tasks/edit-task-modal.tsx`)

```typescript
// Add category editing capability similar to create modal
// This ensures full CRUD support for the category field
```

### 2.3 Zero Breaking Changes Strategy

#### 2.3.1 Database Migration Strategy

**Approach:** Backward-Compatible Migration with Default Values

```sql
-- Migration: 20260207000000_add_task_category

-- Step 1: Create enum (safe - new type)
CREATE TYPE "TaskCategory" AS ENUM ('TASK', 'ITEM', 'LOG', 'ARCHIVE');

-- Step 2: Add column with default (safe - no nulls)
ALTER TABLE "Task"
ADD COLUMN "category" "TaskCategory" NOT NULL DEFAULT 'TASK';

-- Step 3: Create index concurrently (safe - no table lock)
CREATE INDEX CONCURRENTLY "Task_category_idx" ON "Task"("category");

-- Step 4: Backfill data (if any specific logic needed)
-- UPDATE "Task" SET "category" = 'ITEM' WHERE title ILIKE '%item%';
```

**Rollback Plan:**

```sql
-- Rollback: 20260207000000_add_task_category

DROP INDEX IF EXISTS "Task_category_idx";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "category";
DROP TYPE IF EXISTS "TaskCategory";
```

#### 2.3.2 API Compatibility

**Strategy:** Optional Parameters with Defaults

```typescript
// All category parameters are optional
@Query('category') category?: TaskCategory

// Default value ensures backward compatibility
const category = dto.category || TaskCategory.TASK;
```

**Response Compatibility:**

- Category field will be included in all task responses
- Existing clients will receive the new field but can ignore it
- Default value (TASK) ensures semantic consistency

#### 2.3.3 Frontend Compatibility

**Strategy:** Feature Flags and Progressive Enhancement

```typescript
// Category filter defaults to "all" (undefined)
const [selectedCategory, setSelectedCategory] = useState<
  TaskCategory | undefined
>();

// Only apply filter when explicitly selected
const endpoint = category ? `/tasks?category=${category}` : "/tasks";
```

### 2.4 Full-Stack Type Integrity Plan

#### 2.4.1 Type Synchronization Strategy

**Approach:** Single Source of Truth via Prisma Client

```typescript
// Backend types derived from Prisma
import { TaskCategory } from "@prisma/client";
export { TaskCategory };

// Frontend types manually synchronized
export enum TaskCategory {
  TASK = "TASK",
  ITEM = "ITEM",
  LOG = "LOG",
  ARCHIVE = "ARCHIVE",
}
```

**Validation:**

1. **Pre-commit Hook:** Check enum values match between schema and frontend
2. **CI/CD Check:** Type-check both frontend and backend before deployment
3. **Runtime Validation:** DTO validation ensures only valid categories accepted

#### 2.4.2 API Contract Validation

**Strategy:** OpenAPI/Swagger Documentation

```typescript
// Controller documentation
@ApiTags("tasks")
@Controller("tasks")
export class TasksController {
  @Get()
  @ApiQuery({ name: "category", enum: TaskCategory, required: false })
  async findAll(
    @Query("category") category?: TaskCategory,
    @ActiveUser("id") userId: string,
  ) {
    // Implementation
  }
}
```

### 2.5 Edge Case & Failure Mode Mitigation

#### 2.5.1 Database Migration Failures

| Scenario                | Mitigation                                                           |
| ----------------------- | -------------------------------------------------------------------- |
| Migration timeout       | Use `CONCURRENTLY` for index creation; run during low-traffic period |
| Enum type conflict      | Ensure enum name is unique; verify no existing type with same name   |
| Default value rejection | Test migration on staging copy of production data first              |
| Lock contention         | Perform migration during maintenance window if table is large        |

#### 2.5.2 API Failures

```typescript
// Robust error handling in service
async findAll(userId: string, query?: string, category?: TaskCategory) {
  try {
    // Validate category enum value
    if (category && !Object.values(TaskCategory).includes(category)) {
      throw new BadRequestException('Invalid category value');
    }

    return await this.repo.findAll(userId, { query, category });
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    this.handleError(error, 'Error fetching tasks');
  }
}
```

#### 2.5.3 Frontend Failures

**Optimistic Update Rollback:**

```typescript
// Already implemented in useTasks.ts (Line 56-57)
try {
  await api.post("/tasks", { title, description, category });
} catch (err) {
  mutate(); // Automatic rollback
  toast.error("Failed to create quest.");
}
```

**Graceful Degradation:**

```typescript
// If category filter fails, show all tasks
const { tasks, error } = useTasks(userId, selectedCategory);

if (error) {
  // Fallback to unfiltered view
  return <TasksList tasks={unfilteredTasks} showError={true} />;
}
```

#### 2.5.4 File Handling Edge Cases

| Scenario                      | Mitigation                                                 |
| ----------------------------- | ---------------------------------------------------------- |
| Task deleted but file remains | Cascade delete already implemented (schema.prisma Line 56) |
| File download fails           | Try-catch with user-friendly error message                 |
| Large file upload             | Frontend file size check before upload                     |
| Duplicate filenames           | Backend generates unique filenames automatically           |
| Corrupted file metadata       | Validate file record exists before serving                 |

### 2.6 Verification & Validation Protocol

#### 2.6.1 Pre-Deployment Checklist

**Database:**

- [ ] Migration tested on staging environment
- [ ] Rollback procedure tested
- [ ] Index performance verified with EXPLAIN ANALYZE
- [ ] Enum values match between Prisma schema and frontend

**Backend:**

- [ ] All existing tests pass
- [ ] New DTO validation tests written
- [ ] API documentation updated (Swagger)
- [ ] WebSocket events include category field
- [ ] Authorization checks verified

**Frontend:**

- [ ] TypeScript compilation successful
- [ ] Lint checks pass
- [ ] Category filter works in all states
- [ ] Inventory page loads and displays files correctly
- [ ] Mobile responsiveness verified
- [ ] Accessibility audit (ARIA labels, keyboard navigation)

#### 2.6.2 Post-Deployment Verification

**Smoke Tests:**

```bash
# API health check
curl http://localhost:3001/api/tasks

# Category filter test
curl "http://localhost:3001/api/tasks?category=ITEM"

# Inventory endpoint test
curl http://localhost:3001/api/tasks/inventory
```

**Monitoring:**

- [ ] Error rates within normal parameters
- [ ] Database query performance monitoring
- [ ] WebSocket connection stability
- [ ] File upload/download success rates

**User Acceptance:**

- [ ] Category filter visible and functional
- [ ] Inventory page accessible from sidebar
- [ ] File browser displays correctly
- [ ] Existing tasks show default category
- [ ] New tasks can be created with any category

#### 2.6.3 Regression Testing

**Critical Path Tests:**

1. Create task (without category specified) → Should default to TASK
2. Create task with ITEM category → Should persist correctly
3. Edit task category → Should update and emit WebSocket event
4. Delete task with attachments → Should cascade delete files
5. Upload file to task → Should appear in Inventory
6. Search tasks → Should work with and without category filter
7. Real-time updates → Should reflect category changes immediately

---

## Clarification Gates (Required)

Before proceeding to implementation, the following clarifications are required:

### Clarification 1: File Source Scope

**Question:** Should the Inventory pull all historical task files or only active (non-archived) ones?

**Options:**

1. **All Files:** Show files from all tasks regardless of status
   - _Pros:_ Complete file history, users can find old documents
   - _Cons:_ Potentially overwhelming if many completed tasks exist

2. **Active Tasks Only:** Only show files from tasks with status !== COMPLETED
   - _Pros:_ Focused view of current work
   - _Cons:_ May hide important reference documents

3. **Configurable:** User preference to show/hide completed task files
   - _Pros:_ Flexibility for different use cases
   - _Cons:_ More complex UI and state management

**Recommendation:** Option 1 (All Files) with filtering capability

---

### Clarification 2: Filter Persistence

**Question:** Should the UI category filter persist in localStorage or the database?

**Options:**

1. **localStorage:** Store filter preference in browser
   - _Pros:_ Fast, no database writes, per-device preference
   - _Cons:_ Lost when switching devices or clearing cache

2. **Database:** Store filter preference in user profile
   - _Pros:_ Consistent across devices, survives cache clears
   - _Cons:_ Requires new database column, slower initial load

3. **URL Query Params:** Encode filter in URL
   - _Pros:_ Shareable links, bookmarkable views, survives refresh
   - _Cons:_ URL can become long with multiple filters

**Recommendation:** Option 3 (URL Query Params) + localStorage for user preference persistence

---

### Clarification 3: Search Scope

**Question:** Should search query only match titles, or include file names within those tasks?

**Options:**

1. **Task Titles Only:** Search only matches task.title
   - _Pros:_ Simple, fast, predictable
   - _Cons:_ Cannot find tasks by their file names

2. **Titles + File Names:** Search matches both task.title and attachment.filename
   - _Pros:_ More comprehensive search, better file discoverability
   - _Cons:_ May return unexpected results (task matches due to attachment name)

3. **Separate Search Modes:** Toggle between "Task Search" and "File Search"
   - _Pros:_ Precise control over search behavior
   - _Cons:_ More complex UI, may confuse users

**Recommendation:** Option 2 (Titles + File Names) for Inventory page, Option 1 (Titles Only) for Quest Board

---

### Clarification 4: Category Icons and Colors

**Question:** What icons and colors should represent each category?

**Current Proposal:**

| Category | Icon    | Color |
| -------- | ------- | ----- |
| TASK     | Folder  | Blue  |
| ITEM     | Package | Green |
| LOG      | Scroll  | Amber |
| ARCHIVE  | Archive | Gray  |

**Awaiting confirmation on:**

- Icon choices (Lucide icons available)
- Color scheme consistency with existing UI
- Badge styling (outline vs solid)

---

### Clarification 5: Default Category for Existing Tasks

**Question:** Should we retroactively categorize existing tasks based on content analysis?

**Options:**

1. **All Default to TASK:** Simple migration, all existing tasks become TASK
   - _Pros:_ Safe, predictable, no data analysis needed
   - _Cons:_ Missed opportunity for organization

2. **Heuristic Categorization:** Analyze task titles/descriptions to suggest categories
   - _Pros:_ Better initial organization
   - _Cons:_ Risk of incorrect categorization, complex migration

3. **User Review Post-Migration:** Prompt users to review and categorize tasks
   - _Pros:_ Accurate categorization
   - _Cons:_ User burden, may be ignored

**Recommendation:** Option 1 (All Default to TASK) with bulk edit capability added later

---

## Appendix: Technical Specifications

### A.1 Affected Files Summary

#### Backend Changes

| File                                                    | Change Type | Lines Changed | Description                     |
| ------------------------------------------------------- | ----------- | ------------- | ------------------------------- |
| `prisma/schema.prisma`                                  | Modify      | +10           | Add TaskCategory enum and field |
| `prisma/migrations/20260207_add_category/migration.sql` | Create      | +15           | Database migration              |
| `src/modules/tasks/domain/task.types.ts`                | Modify      | +5            | Export TaskCategory enum        |
| `src/modules/tasks/domain/task.dto.ts`                  | Modify      | +4            | Add category to DTOs            |
| `src/modules/tasks/repositories/tasks.repository.ts`    | Modify      | +15           | Add category filtering          |
| `src/modules/tasks/services/tasks.service.ts`           | Modify      | +10           | Add inventory method            |
| `src/modules/tasks/controllers/tasks.controller.ts`     | Modify      | +10           | Add inventory endpoint          |

#### Frontend Changes

| File                                         | Change Type | Lines Changed | Description                               |
| -------------------------------------------- | ----------- | ------------- | ----------------------------------------- |
| `types/task.ts`                              | Modify      | +10           | Add TaskCategory enum and field           |
| `hooks/useTasks.ts`                          | Modify      | +20           | Add category parameter and inventory hook |
| `components/tasks/category-filter.tsx`       | Create      | +50           | Category filter component                 |
| `app/(dashboard)/tasks/page.tsx`             | Modify      | +15           | Add category filter to UI                 |
| `components/tasks/task-table-row.tsx`        | Modify      | +10           | Display category badge                    |
| `components/tasks/create-task-modal.tsx`     | Modify      | +8            | Category selector                         |
| `components/tasks/edit-task-modal.tsx`       | Modify      | +8            | Category editing                          |
| `app/(dashboard)/inventory/page.tsx`         | Create      | +30           | Inventory page                            |
| `components/inventory/inventory-browser.tsx` | Create      | +150          | File browser component                    |

**Total:** ~325 lines of new/modified code

### A.2 Component Hierarchy

```
app/(dashboard)/
├── layout.tsx
│   └── Sidebar (existing)
├── tasks/
│   └── page.tsx
│       ├── CategoryFilter (NEW)
│       ├── Search Input (ENHANCED)
│       ├── CreateTaskModal (ENHANCED)
│       │   └── CategoryFilter (NEW)
│       ├── TaskTableRow (ENHANCED)
│       │   └── Category Badge (NEW)
│       └── EditTaskModal (ENHANCED)
│           └── CategoryFilter (NEW)
└── inventory/
    └── page.tsx (NEW)
        ├── CategoryFilter (NEW)
        └── InventoryBrowser (NEW)
            ├── Search Input
            ├── Letter Group Headers
            └── Task Folders (expandable)
                └── File List
```

### A.3 API Endpoint Summary

| Method | Endpoint           | Query Params    | Description                      |
| ------ | ------------------ | --------------- | -------------------------------- |
| GET    | `/tasks`           | `category`, `q` | List tasks with optional filters |
| GET    | `/tasks/inventory` | `category`      | List tasks with attachments only |
| GET    | `/tasks/search`    | `q`, `category` | Search tasks                     |
| POST   | `/tasks`           | -               | Create task (includes category)  |
| PATCH  | `/tasks/:id`       | -               | Update task (includes category)  |

### A.4 WebSocket Event Updates

**Existing Events (No Changes):**

- `task_created`
- `task_updated`
- `task_deleted`
- `attachment_added`
- `attachment_deleted`
- `subtask_added`
- `subtask_updated`
- `subtask_deleted`

**Note:** Task events will now include `category` field in payload automatically through Prisma includes.

### A.5 Performance Considerations

**Database Queries:**

```sql
-- Category filter with index (fast)
SELECT * FROM "Task"
WHERE "userId" = $1 AND "category" = $2;
-- Uses: Task_category_idx

-- Inventory query (tasks with attachments)
SELECT * FROM "Task"
WHERE "userId" = $1
AND EXISTS (SELECT 1 FROM "TaskAttachment" WHERE "taskId" = "Task".id);
-- Uses: Task_userId_idx + TaskAttachment_taskId_idx
```

**Optimization Notes:**

- Index on `category` field ensures O(log n) lookup
- Composite index on `(userId, category)` could be added if needed
- File downloads remain streamed (not loaded into memory)
- SWR caching reduces redundant API calls

### A.6 Security Checklist

- [ ] Category parameter validated against enum values
- [ ] All endpoints require authentication (remove @AllowAnonymous if applicable)
- [ ] User ownership verified for all task operations
- [ ] File access requires task ownership
- [ ] No SQL injection risk (Prisma query builder)
- [ ] XSS protection via React's built-in escaping
- [ ] CSRF protection via cookie-based sessions

---

## Implementation Timeline

### Sprint 1: Foundation (Weeks 1-2)

- [ ] Database migration created and tested
- [ ] Backend DTO and type updates
- [ ] Repository and service layer extensions
- [ ] API endpoint implementations
- [ ] Frontend type updates

### Sprint 2: Core Features (Weeks 3-4)

- [ ] Category filter component
- [ ] useTasks hook enhancements
- [ ] Task page category integration
- [ ] Create/Edit modal updates
- [ ] Real-time event testing

### Sprint 3: Inventory Feature (Weeks 5-6)

- [ ] Inventory page creation
- [ ] Inventory browser component
- [ ] File organization UI
- [ ] Search integration
- [ ] Responsive design

### Sprint 4: Polish & Testing (Weeks 7-8)

- [ ] Integration testing
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Documentation updates
- [ ] Production deployment

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding hierarchical Inventory-to-Task file mapping and enhanced Task categorization to the Lily_V2 application. The architecture maintains backward compatibility while introducing powerful new organizational capabilities.

**Key Success Factors:**

1. Zero breaking changes to existing functionality
2. Backward-compatible database migration
3. Consistent type safety across the stack
4. Robust error handling and edge case coverage
5. Comprehensive testing and validation

**Next Steps:**

1. Review and approve clarification gates
2. Create feature branch: `feature/inventory-categorization`
3. Begin Sprint 1 implementation
4. Schedule daily standups for coordination

---

_Document Version: 1.0_  
_Last Updated: 2026-02-07_  
_Review Status: Pending Phase II Approval_
