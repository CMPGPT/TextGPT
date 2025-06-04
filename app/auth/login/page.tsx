"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui-shadcn/Button';
import { Input } from '@/components/ui-shadcn/Input';
import { Label } from '@/components/ui-shadcn/Label';
import { Alert, AlertDescription } from '@/components/ui-shadcn/Alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui-shadcn/Card';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Since we're not using Supabase Auth but a custom authentication
      // Get the user directly from our iqr_users table
      const { data, error: queryError } = await supabase
        .from('iqr_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (queryError || !data) {
        throw new Error('Invalid username or password');
      }

      // Fetch business info
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', data.business_id)
        .single();

      if (businessError) {
        throw new Error('Error fetching business data');
      }

      // Set a cookie to indicate authentication
      Cookies.set('iqr_authenticated', 'true', { expires: 1 }); // Expires in 1 day
      
      // Store business ID and user info in localStorage for session management
      localStorage.setItem('iqr_business_id', data.business_id);
      localStorage.setItem('iqr_user_id', data.id);
      localStorage.setItem('iqr_username', data.username);
      localStorage.setItem('iqr_user_role', data.role);
      localStorage.setItem('iqr_business_name', businessData.name);
      localStorage.setItem('iqr_business_number', businessData.iqr_number);
      
      // Redirect to dashboard
      router.push('/iqr/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#14213D] p-4">
      <Card className="w-full max-w-md border-0">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">IQR Business Login</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your IQR dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            This is only for IQR business accounts.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 