"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Database, Code } from 'lucide-react';

export default function DebugIndexPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">System Maintenance & Debugging</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/api/debug/page')}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Database Management</span>
            </CardTitle>
            <CardDescription>View and fix database schema issues</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Check database table definitions, constraints, and run migrations to fix issues.
            </p>
            <Button variant="ghost" className="mt-4 w-full" onClick={(e) => { e.stopPropagation(); router.push('/api/debug/page'); }}>
              Open Tool
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/api/iqr/setup-migration')}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5" />
              <span>Run Migrations</span>
            </CardTitle>
            <CardDescription>Apply database migrations directly</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Run the migration script to update database schema and fix constraint issues.
            </p>
            <Button variant="ghost" className="mt-4 w-full" onClick={(e) => { e.stopPropagation(); router.push('/api/iqr/setup-migration'); }}>
              Run Migration
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/api/debug/logs')}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Code className="h-5 w-5" />
              <span>System Logs</span>
            </CardTitle>
            <CardDescription>View application logs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Browse and search system logs to diagnose issues and monitor application behavior.
            </p>
            <Button variant="ghost" className="mt-4 w-full" onClick={(e) => { e.stopPropagation(); router.push('/api/debug/logs'); }}>
              View Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 