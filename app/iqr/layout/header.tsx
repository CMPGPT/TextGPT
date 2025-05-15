'use client'
import { useState, useEffect } from 'react';
import { Bell, Search, Settings, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

// Define types for search results
interface ProductResult {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

interface MessageResult {
    id: string;
    user_phone: string;
    created_at: string;
    product_id: string;
    products: {
        name: string;
    } | null;
}

export const Header = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const router = useRouter();
    const supabase = createClientComponentClient();

    // Helper function to truncate text
    const truncateText = (text: string, maxLength: number = 60): string => {
        if (!text) return '';
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    // Handle search input changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        if (query.length > 2) {
            performSearch(query);
        } else {
            setSearchResults([]);
            setShowResults(false);
        }
    };

    // Perform the search across products and phone numbers
    const performSearch = async (query: string) => {
        setIsSearching(true);
        try {
            const businessId = localStorage.getItem('iqr_business_id');
            if (!businessId) return;

            // Search products
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id, name, description, created_at')
                .eq('business_id', businessId)
                .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
                .limit(5);

            if (productError) throw productError;

            // Search phone numbers in messages
            const { data: messageData, error: messageError } = await supabase
                .from('iqr_chat_messages')
                .select('id, user_phone, created_at, product_id, products:product_id(name)')
                .eq('business_id', businessId)
                .ilike('user_phone', `%${query}%`)
                .order('created_at', { ascending: false })
                .limit(5);

            if (messageError) throw messageError;

            // Format and combine results
            const formattedProducts = productData ? productData.map(product => ({
                id: product.id,
                type: 'product',
                title: product.name,
                description: truncateText(product.description || 'No description', 60),
                fullDescription: product.description || 'No description',
                date: new Date(product.created_at).toLocaleDateString()
            })) : [];

            const formattedPhones = messageData ? messageData.map((message: any) => {
                let productName = 'Unknown';
                
                // Handle different possible structures returned by Supabase
                if (message.products) {
                    if (Array.isArray(message.products) && message.products.length > 0) {
                        productName = message.products[0].name || 'Unknown';
                    } else if (typeof message.products === 'object') {
                        productName = message.products.name || 'Unknown';
                    }
                }
                
                return {
                    id: message.id,
                    type: 'phone',
                    title: message.user_phone,
                    description: `Related to product: ${productName}`,
                    date: new Date(message.created_at).toLocaleDateString(),
                    productId: message.product_id
                };
            }) : [];

            // Combine and set results
            const combinedResults = [...formattedProducts, ...formattedPhones];
            setSearchResults(combinedResults);
            setShowResults(combinedResults.length > 0);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle result click
    const handleResultClick = (result: any) => {
        setShowResults(false);
        setSearchQuery('');
        
        if (result.type === 'product') {
            // Navigate to the products tab
            router.push('/iqr/dashboard?tab=products');
        } else if (result.type === 'phone') {
            // Navigate to the messages tab
            router.push(`/iqr/dashboard?tab=messages&search=${result.title}`);
        }
    };

    // Close search results
    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
    };

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const searchContainer = document.getElementById('search-container');
            if (searchContainer && !searchContainer.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="h-16 bg-iqr-100 border-b border-iqr-100/50 flex items-center justify-between px-4 sticky top-0 z-20">
            <div className="flex items-center">
                <h1 className="text-xl font-semibold text-iqr-400">IQR Dashboard</h1>
            </div>

            <div className="flex items-center space-x-2">
                <div id="search-container" className="relative max-w-xs hidden md:block">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-iqr-300/50" />
                    
                    <Input
                        className="pl-8 bg-iqr-100/70 border-iqr-100/30 focus-visible:ring-iqr-200 text-sm"
                        placeholder="Search products, phone #..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                    
                    {searchQuery && (
                        <button 
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-iqr-300/50 hover:text-iqr-400"
                            onClick={clearSearch}
                        >
                            <X size={16} />
                        </button>
                    )}
                    
                    {/* Search Results Dropdown */}
                    {showResults && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-iqr-100 border border-iqr-100/30 rounded-md shadow-lg z-30 max-h-96 overflow-y-auto">
                            {isSearching ? (
                                <div className="p-3 text-iqr-300 text-sm">Searching...</div>
                            ) : searchResults.length === 0 ? (
                                <div className="p-3 text-iqr-300 text-sm">No results found</div>
                            ) : (
                                <div>
                                    {searchResults.map((result) => (
                                        <div 
                                            key={`${result.type}-${result.id}`}
                                            className="p-3 cursor-pointer hover:bg-iqr-200/20 border-b border-iqr-100/30 last:border-b-0"
                                            onClick={() => handleResultClick(result)}
                                            title={result.type === 'product' ? result.fullDescription : ''}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 mr-2">
                                                    <div className="font-medium text-iqr-400">{result.title}</div>
                                                    <div className="text-xs text-iqr-300 whitespace-normal">{result.description}</div>
                                                </div>
                                                <Badge variant="outline" className="text-xs shrink-0">
                                                    {result.type === 'product' ? 'Product' : 'Phone'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
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
