'use client'
import { Bell, Search, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';



export const Header = () => {




    return (
        <header className="h-16 bg-iqr-100 border-b border-iqr-100/50 flex items-center justify-between px-4 sticky top-0 z-20">
            <div className="flex items-center">
                <h1 className="text-xl font-semibold text-iqr-400">IQR Dashboard</h1>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative max-w-xs hidden md:block">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-iqr-300/50" />
                    <Input
                        className="pl-8 bg-iqr-100/70 border-iqr-100/30 focus-visible:ring-iqr-200 text-sm"
                        placeholder="Search..."
                    />
                </div>

                <Button variant="ghost" size="icon" className="text-iqr-300 hover:text-iqr-400 hover:bg-iqr-100/50">
                    <Bell className="h-5 w-5" />
                </Button>

                <Button variant="ghost" size="icon" className="text-iqr-300 hover:text-iqr-400 hover:bg-iqr-100/50">
                    <Settings className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
};
