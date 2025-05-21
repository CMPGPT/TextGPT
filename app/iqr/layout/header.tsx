'use client'
import { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, LogIn, LayoutGrid, User2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

// Define types for search results
interface _ProductResult {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

interface _MessageResult {
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
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClientComponentClient();
    const searchResultsRef = useRef<HTMLDivElement>(null);
    
    // Check if user is authenticated
    useEffect(() => {
        async function checkUser() {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
            setLoading(false);
        }
        
        checkUser();
        
        // Set up listener for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });
        
        return () => {
            subscription.unsubscribe();
        };
    }, [supabase.auth]);

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
            // Check for business ID first
            const businessId = localStorage.getItem('iqr_business_id');
            console.log('Business ID from localStorage:', businessId);
            
            // Try to search products first
            let productData = null;
            let productError = null;
            
            if (businessId) {
                // Search with business ID restriction
                const productResult = await supabase
                    .from('products')
                    .select('id, name, description, created_at')
                    .eq('business_id', businessId)
                    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
                    .limit(5);
                    
                productData = productResult.data;
                productError = productResult.error;
                
                if (productError) {
                    console.error('Product search with business ID error:', productError);
                }
                
                if (!productData || productData.length === 0) {
                    console.log('No products found with business ID, trying without restriction');
                    // Fallback: Try without business ID restriction
                    const fallbackResult = await supabase
                        .from('products')
                        .select('id, name, description, created_at, business_id')
                        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
                        .limit(5);
                        
                    if (!fallbackResult.error && fallbackResult.data && fallbackResult.data.length > 0) {
                        productData = fallbackResult.data;
                        console.log('Found products without business ID restriction:', productData);
                    }
                }
            } else {
                // Search without business ID restriction
                const productResult = await supabase
                    .from('products')
                    .select('id, name, description, created_at, business_id')
                    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
                    .limit(5);
                    
                productData = productResult.data;
                productError = productResult.error;
            }
            
            console.log('Product search results:', productData);
            
            // Try to search messages
            let messageData = null;
            let messageError = null;
            
            if (businessId) {
                // Search with business ID restriction
                const messageResult = await supabase
                    .from('iqr_chat_messages')
                    .select('id, user_phone, created_at, product_id, business_id')
                    .eq('business_id', businessId)
                    .ilike('user_phone', `%${query}%`)
                    .order('created_at', { ascending: false })
                    .limit(5);
                    
                messageData = messageResult.data;
                messageError = messageResult.error;
                
                if (messageError) {
                    console.error('Message search with business ID error:', messageError);
                }
                
                if (!messageData || messageData.length === 0) {
                    console.log('No messages found with business ID, trying without restriction');
                    // Fallback: Try without business ID restriction
                    const fallbackResult = await supabase
                        .from('iqr_chat_messages')
                        .select('id, user_phone, created_at, product_id, business_id')
                        .ilike('user_phone', `%${query}%`)
                        .order('created_at', { ascending: false })
                        .limit(5);
                        
                    if (!fallbackResult.error && fallbackResult.data && fallbackResult.data.length > 0) {
                        messageData = fallbackResult.data;
                        console.log('Found messages without business ID restriction:', messageData);
                    }
                }
            } else {
                // Search without business ID restriction
                const messageResult = await supabase
                    .from('iqr_chat_messages')
                    .select('id, user_phone, created_at, product_id, business_id')
                    .ilike('user_phone', `%${query}%`)
                    .order('created_at', { ascending: false })
                    .limit(5);
                    
                messageData = messageResult.data;
                messageError = messageResult.error;
            }
            
            console.log('Message search results:', messageData);

            // If we have message data, get the product names in a separate query
            let products: Record<string, string> = {};
            if (messageData && messageData.length > 0) {
                const productIds = messageData
                    .map(msg => msg.product_id)
                    .filter(id => id !== null);
                
                if (productIds.length > 0) {
                    const { data: productsData } = await supabase
                        .from('products')
                        .select('id, name')
                        .in('id', productIds);
                    
                    if (productsData) {
                        products = productsData.reduce((acc: Record<string, string>, product) => {
                            acc[product.id] = product.name;
                            return acc;
                        }, {});
                    }
                }
            }

            // Format and combine results
            const formattedProducts = productData ? productData.map(product => ({
                id: product.id,
                type: 'product',
                title: product.name,
                description: truncateText(product.description || 'No description', 60),
                fullDescription: product.description || 'No description',
                date: new Date(product.created_at).toLocaleDateString()
            })) : [];

            const formattedPhones = messageData ? messageData.map((message) => {
                const productName = message.product_id && products[message.product_id] 
                    ? products[message.product_id] 
                    : 'Unknown';
                
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
            console.log('Combined search results:', combinedResults.length, 'items');
            
            if (combinedResults.length === 0) {
                console.log('No search results found for query:', query);
            }
            
            setSearchResults(combinedResults);
            setShowResults(combinedResults.length > 0);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
            setShowResults(false);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle result click
    const handleResultClick = async (result: any) => {
        setShowResults(false);
        setSearchQuery('');
        
        if (result.type === 'product') {
            // Navigate directly to products tab with parameters to open QR code drawer
            router.push(`/iqr/dashboard?tab=products&action=qrcode&productId=${result.id}`);
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

    // Function to render a group of search results
    const renderResultGroup = (title: string, results: any[]) => {
        if (results.length === 0) return null;
        
        return (
            <div key={title}>
                <div className="px-3 py-2 bg-iqr-100/30 text-iqr-300 text-xs font-medium">
                    {title}
                </div>
                {results.map((result) => (
                    <div 
                        key={`${result.type}-${result.id}`}
                        className="p-3 cursor-pointer hover:bg-iqr-200/10 border-b border-iqr-200/20 last:border-b-0"
                        onClick={() => handleResultClick(result)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1 mr-2">
                                <div className="font-medium text-iqr-400">{result.title}</div>
                                <div className="text-xs text-iqr-300">{result.description}</div>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0 bg-iqr-200/10 border-iqr-200/30">
                                {result.type === 'product' ? 'Product' : 'Phone'}
                            </Badge>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <header className="sticky top-0 z-50 flex items-center justify-between p-3 md:p-4 bg-iqr-100 border-b border-iqr-200/20 shadow-sm">
            <div className="flex items-center">
                <Link href="/iqr/dashboard" className="flex items-center">
                    <span className="font-bold text-lg md:text-xl text-iqr-400 flex items-center">
                        <span className="hidden md:inline mr-2">IQR</span>
                        <span className="inline md:hidden mr-1">IQR</span>
                        <LayoutGrid size={18} className="inline-block text-iqr-200 mr-2" />
                    </span>
                </Link>
                {!loading && user && (
                    <div className="hidden sm:flex items-center space-x-1 ml-4">
                        <Badge variant="outline" className="text-xs py-0 h-6 bg-iqr-200/10 hover:bg-iqr-200/20 transition-colors border-iqr-200/30">
                            <User2 size={12} className="mr-1 text-iqr-200" />
                            <span className="text-iqr-300">{user.email?.split('@')[0] || 'User'}</span>
                        </Badge>
                    </div>
                )}
            </div>

            <div className="flex items-center flex-1 max-w-md md:max-w-lg mx-auto relative">
                <div className="relative w-full">
                    <Input
                        type="text"
                        placeholder="Search products or phone numbers..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="pl-8 pr-8 bg-transparent border-iqr-200/20 focus:border-iqr-200/50 text-iqr-400 placeholder:text-iqr-300/50 focus-visible:ring-iqr-200/20 focus-visible:ring-offset-0"
                        onClick={() => setShowResults(searchResults.length > 0)}
                    />
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-iqr-200/60" />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-iqr-300"
                            onClick={clearSearch}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Show search results if any */}
                {showResults && (
                    <div
                        ref={searchResultsRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-iqr-50 border border-iqr-200/20 rounded-md shadow-lg overflow-hidden z-20 max-h-[400px] overflow-y-auto"
                    >
                        {isSearching ? (
                            <div className="flex items-center justify-center p-4 text-iqr-300">
                                <span className="animate-spin mr-2">
                                    <RefreshCw size={16} />
                                </span>
                                Searching...
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="p-4 text-center text-iqr-300">No results found</div>
                        ) : (
                            <div>
                                {/* Group results by type */}
                                {renderResultGroup("Products", searchResults.filter(r => r.type === 'product'))}
                                {renderResultGroup("Phone Numbers", searchResults.filter(r => r.type === 'phone'))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};
