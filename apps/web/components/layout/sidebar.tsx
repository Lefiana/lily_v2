// 'use client';

// import { authClient } from "@/lib/auth-client";
// import { LogOut, User } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// export function Sidebar() {
//   const { data: session } = authClient.useSession();
//   const router = useRouter();

//   const handleLogout = async () => {
//     await authClient.signOut();
//     router.push("/login");
//   };

//   return (
//     <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-md flex flex-col h-full">
//       <div className="p-6 flex-1">
//         {/* ... (Your existing Navigation Links here) ... */}
//       </div>

//       {/* PROFILE SECTION */}
//       <div className="p-4 border-t border-white/10 bg-white/5">
//         <div className="flex items-center gap-3 px-2 py-3">
//           <Avatar className="h-9 w-9 border border-white/20">
//             <AvatarImage src={`https://avatar.vercel.sh/${session?.user?.name}`} />
//             <AvatarFallback className="bg-zinc-800 text-white">
//               {session?.user?.name?.charAt(0) || "U"}
//             </AvatarFallback>
//           </Avatar>
//           <div className="flex flex-col overflow-hidden">
//             <span className="text-sm font-medium text-white truncate">
//               {session?.user?.name || "Commander"}
//             </span>
//             <span className="text-xs text-zinc-500 truncate">
//               {session?.user?.email}
//             </span>
//           </div>
//         </div>

//         <Button
//           variant="ghost"
//           onClick={handleLogout}
//           className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-400/10 mt-2"
//         >
//           <LogOut className="h-4 w-4 mr-2" />
//           Logout
//         </Button>
//       </div>
//     </aside>
//   );
// }

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Swords,
  Package,
  Box,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const routes = [
  { label: "Quest Board", icon: LayoutDashboard, href: "/tasks" },
  { label: "Assets", icon: Box, href: "/assets" },
  { label: "Checkouts", icon: ClipboardList, href: "/checkouts" },
  { label: "Gacha", icon: Swords, href: "/gacha" },
  { label: "Inventory", icon: Package, href: "/inventory" },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/login";
        },
      },
    });
  };

  return (
    <aside className="w-64 flex flex-col h-full glass-card border-r border-white/10 bg-black/20">
      <div className="p-6 flex-1">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-8">
          LILY V2
        </h1>

        <nav className="space-y-2">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                pathname === route.href
                  ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                  : "text-zinc-500 hover:text-white hover:bg-white/5",
              )}
            >
              <route.icon className="h-5 w-5" />
              {route.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/5">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
