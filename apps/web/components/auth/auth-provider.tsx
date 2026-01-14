'use client';

import { authClient } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not pending and no session, and not on login/register pages
    if (!isPending && !session && pathname !== "/login" && pathname !== "/register") {
      router.push("/login");
    }
    
    // If logged in and trying to access login/register, go to tasks
    if (!isPending && session && (pathname === "/login" || pathname === "/register")) {
      router.push("/tasks");
    }
  }, [session, isPending, pathname, router]);

  if (isPending) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-white">
        <div className="animate-pulse font-bold tracking-widest">LOADING LILY...</div>
      </div>
    );
  }

  return <>{children}</>;
}