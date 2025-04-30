"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MessageSquare } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-textgpt-200 via-textgpt-100 to-textgpt-200 flex flex-col">
      <nav className="py-6 px-6 md:px-10 flex justify-between items-center relative bg-transparent">
        <div className="flex items-center">
          <MessageSquare size={36} className="text-textgpt-300 mr-3" />
          <span className="text-3xl font-bold text-white">TextG.pt</span>
        </div>
        <Link href="/">
          <Button variant="ghost" className="text-white hover:text-textgpt-300 hover:bg-white/10">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">Sign In</CardTitle>
            <CardDescription className="text-white/70">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                placeholder="email@example.com"
                type="email"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Link 
                  href="/" 
                  className="text-sm text-textgpt-300 hover:text-textgpt-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                placeholder="••••••••"
                type="password"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full bg-textgpt-300 text-textgpt-200 hover:bg-textgpt-400">
              Sign In
            </Button>
            <div className="text-center text-white/70">
              Don&apos;t have an account?{" "}
              <Link 
                href="/auth/register" 
                className="text-textgpt-300 hover:text-textgpt-400 hover:underline"
              >
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>

      <footer className="bg-textgpt-200/80 py-6 text-white/80">
        <div className="container mx-auto px-6 max-w-7xl text-center">
          <div className="flex justify-center items-center mb-4">
            <MessageSquare size={24} className="text-textgpt-300 mr-2" />
            <span className="text-xl font-bold text-white">TextG.pt</span>
          </div>
          <div className="flex justify-center space-x-4 mb-4">
            <Link href="/terms" className="hover:text-textgpt-300">Terms</Link>
            <Link href="/privacy" className="hover:text-textgpt-300">Privacy</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} TextG.pt. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 