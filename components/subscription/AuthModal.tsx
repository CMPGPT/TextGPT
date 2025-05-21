import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl: string;
}

export const AuthModal = ({ isOpen, onClose, returnUrl }: AuthModalProps) => {
  const router = useRouter();
  
  const handleLogin = () => {
    router.push(`/iqr/login?redirect=${encodeURIComponent(returnUrl)}`);
    onClose();
  };
  
  const handleSignup = () => {
    router.push(`/iqr/signup?redirect=${encodeURIComponent(returnUrl)}`);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Authentication Required</DialogTitle>
          <DialogDescription>
            You need to be logged in to subscribe to a plan.
          </DialogDescription>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
          <p>
            Please log in to your existing account or create a new account to continue with your subscription.
          </p>
        </div>
        <DialogFooter className="flex flex-row space-x-2">
          <Button variant="outline" onClick={handleLogin}>
            Log In
          </Button>
          <Button onClick={handleSignup}>
            Sign Up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 