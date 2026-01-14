'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Note: Better Auth usually uses .signIn.email for email/pass
      const result = await authClient.signIn.email({ 
        email,
        password,
        callbackURL: '/tasks',
      });
      
      // Better Auth handles the redirect automatically if callbackURL is set, 
      // but doing it manually is fine too:
      toast.success("Welcome back!");
      window.location.href = '/tasks'; 
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Dynamic Blobs for the background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-30 bg-[#57025a] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-30 bg-[#ec4899]" />

      <Card className="w-[400px] glass-card border-none text-white z-10">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tighter text-center">LILY V2</CardTitle>
          <p className="text-center text-zinc-400 text-sm">Enter your credentials to sync your progress</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500">Email</label>
              <Input 
                type="email" 
                placeholder="commander@lily.io" 
                className="glass-input h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500">Password</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="glass-input h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full h-12 font-bold button-theme-hover rounded-xl">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}