'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  // Explicitly typing 'e' fixes the "implicitly has any type" error
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const { data, error } = await authClient.signUp.email({
      email: formData.email,
      password: formData.password,
      name: formData.name,
    });

    if (error) {
      toast.error(error.message || "Registration failed");
    } else {
      toast.success("Welcome to Lily V2!");
      router.push('/tasks');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 bg-purple-900" />
      
      <Card className="w-[450px] z-10 border-none shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl text-center text-white font-bold tracking-tighter">JOIN LILY</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <Input 
              placeholder="Full Name" 
              required
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <Input 
              placeholder="Email" 
              type="email" 
              required
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            <Input 
              placeholder="Password" 
              type="password" 
              required
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            <Button type="submit" className="w-full">Create Account</Button>
            <p className="text-center text-zinc-500 text-sm mt-4">
              Already a member? <Link href="/login" className="text-pink-500 hover:underline">Log in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}