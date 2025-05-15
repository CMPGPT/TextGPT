import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define types for the cached data
interface CachedData {
  products?: {
    productsList: any[];
    lastFetched: number;
  };
  analytics?: {
    productsDeployed: number;
    totalMessages: number;
    uniqueUsers: number;
    chartData: any[];
    lastFetched: number;
  };
  messages?: {
    messagesList: any[];
    totalMessages: number;
    currentPage: number;
    filters: {
      searchQuery: string;
      selectedProduct: string;
      date?: Date;
    };
    lastFetched: number;
  };
  [key: string]: any; // Allow indexing with string
}

interface DashboardCacheContextType {
  cache: CachedData;
  setCache: (key: keyof CachedData, data: any) => void;
  getCacheTimestamp: (key: keyof CachedData) => number;
  clearCache: (key?: keyof CachedData) => void;
  isDataCached: (key: keyof CachedData, maxAge?: number) => boolean;
}

// Create the context
const DashboardCacheContext = createContext<DashboardCacheContextType | undefined>(undefined);

// Cache expiration in milliseconds (default: 5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

// Create a singleton cache object that persists across renders
const globalCache: CachedData = {};

export const DashboardCacheProvider = ({ children }: { children: ReactNode }) => {
  const [cache, setDataCache] = useState<CachedData>(globalCache);

  // Set data in the cache
  const setCache = (key: keyof CachedData, data: any) => {
    // First update the global cache object
    if (key === 'products') {
      globalCache[key] = {
        productsList: Array.isArray(data) ? data : [],
        lastFetched: Date.now()
      };
    } else if (key === 'messages') {
      globalCache[key] = {
        messagesList: data.messagesList || [],
        totalMessages: data.totalMessages || 0,
        currentPage: data.currentPage || 1,
        filters: data.filters || { searchQuery: '', selectedProduct: '', date: undefined },
        lastFetched: Date.now()
      };
    } else if (key === 'analytics') {
      globalCache[key] = {
        ...data,
        lastFetched: Date.now()
      };
    } else {
      // Fallback for any other keys
      globalCache[key] = {
        ...(typeof data === 'object' ? data : { data }),
        lastFetched: Date.now()
      };
    }
    
    // Then update the state to trigger rerenders
    setDataCache({...globalCache});
  };

  // Get the timestamp when data was cached
  const getCacheTimestamp = (key: keyof CachedData): number => {
    const cachedItem = cache[key];
    if (!cachedItem) return 0;
    
    // Safely access the lastFetched property
    return (typeof cachedItem === 'object' && 'lastFetched' in cachedItem) 
      ? (cachedItem.lastFetched as number) 
      : 0;
  };

  // Clear the cache for a specific key or the entire cache
  const clearCache = (key?: keyof CachedData) => {
    if (key) {
      // Delete from global cache
      delete globalCache[key];
      // Update state
      setDataCache({...globalCache});
    } else {
      // Clear entire global cache
      Object.keys(globalCache).forEach(k => {
        delete globalCache[k];
      });
      setDataCache({});
    }
  };

  // Check if data is cached and valid (not expired)
  const isDataCached = (key: keyof CachedData, maxAge = DEFAULT_CACHE_TTL): boolean => {
    const timestamp = getCacheTimestamp(key);
    if (!timestamp) return false;
    
    const now = Date.now();
    return now - timestamp < maxAge;
  };

  return (
    <DashboardCacheContext.Provider value={{ 
      cache, 
      setCache, 
      getCacheTimestamp,
      clearCache,
      isDataCached
    }}>
      {children}
    </DashboardCacheContext.Provider>
  );
};

// Hook to use the dashboard cache
export const useDashboardCache = () => {
  const context = useContext(DashboardCacheContext);
  if (context === undefined) {
    throw new Error('useDashboardCache must be used within a DashboardCacheProvider');
  }
  return context;
}; 