'use client'
import { useState, useEffect } from 'react';
import { Search, X, MessageSquare, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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

    return (
        <>
            <header className="h-16 bg-iqr-100 border-b border-iqr-100/50 flex items-center justify-between px-4 sticky top-0 z-20">
                <div className="flex items-center">
                    <h1 className="text-xl font-semibold text-iqr-400">IQR Dashboard</h1>
                </div>

                <div className="flex items-center space-x-2 md:space-x-4">
                    {/* Search container - hide on mobile */}
                    <div id="search-container" className="relative hidden md:block max-w-xs w-full">
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
                    
                    <Link href="/iqr/chat">
                        <Button className="bg-iqr-200 text-iqr-50 hover:bg-iqr-200/90 px-2 md:px-4">
                            <MessageSquare size={18} className="mr-0 md:mr-2" />
                            <span className="hidden md:inline">Chat</span>
                        </Button>
                    </Link>
                    
                    {loading ? null : user ? (
                        <></>
                    ) : (
                        <Link href="/iqr/login">
                            <Button variant="outline" className="border-iqr-200 text-iqr-300 hover:text-iqr-200 px-2 md:px-4">
                                <LogIn size={18} className="mr-0 md:mr-2" />
                                <span className="hidden md:inline">Sign In</span>
                            </Button>
                        </Link>
                    )}
                </div>
            </header>
        </>
    );
};
