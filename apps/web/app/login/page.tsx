"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      // Better Auth returns { data, error } - errors are not thrown
      const { data, error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/tasks",
      });

      if (error) {
        toast.error(error.message || "Invalid credentials");
        setIsLoading(false);
        return;
      }

      // Success
      toast.success("Welcome back!");
      window.location.href = "/tasks";
    } catch (err: any) {
      // Handle network or unexpected errors
      toast.error(err.message || "An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Dynamic Blobs for the background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-30 bg-[#57025a] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-30 bg-[#ec4899]" />

      <Card className="w-[400px] glass-card border-none text-white z-10">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tighter text-center">
            LILY V2
          </CardTitle>
          <p className="text-center text-zinc-400 text-sm">
            Enter your credentials to sync your progress
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500">
                Email
              </label>
              <Input
                type="email"
                placeholder="commander@lily.io"
                className="glass-input h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                className="glass-input h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 font-bold button-theme-hover rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
