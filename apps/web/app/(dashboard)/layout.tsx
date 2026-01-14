'use client';

import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 1. The Sidebar - Fixed width */}
      <Sidebar />

      {/* 2. Main Content Area */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar">
        {/* We wrap the children in a container for consistent padding */}
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}