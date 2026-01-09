/**
 * SWR Configuration for optimized data fetching
 * Usage: import { useSWRConfig } from './swr-config'
 */

/**
 * Default fetcher function
 */
export const fetcher = async (url) => {
    const res = await fetch(url);
    
    if (!res.ok) {
        const error = new Error('An error occurred while fetching data.');
        error.info = await res.json();
        error.status = res.status;
        throw error;
    }
    
    return res.json();
};

/**
 * Global SWR configuration options
 * Apply these settings when using SWR hooks
 */
export const swrConfig = {
    // Fetcher function
    fetcher,
    
    // Revalidation settings
    revalidateOnFocus: false,        // Don't refetch when window gains focus
    revalidateOnReconnect: true,     // Refetch when network reconnects
    refreshWhenHidden: false,        // Don't refresh when page is hidden
    refreshWhenOffline: false,       // Don't refresh when offline
    
    // Deduplication
    dedupingInterval: 5000,          // Dedupe requests within 5 seconds
    
    // Error retry
    errorRetryCount: 3,              // Retry failed requests 3 times
    errorRetryInterval: 1000,        // Wait 1 second between retries
    
    // Loading states
    loadingTimeout: 3000,            // Show loading after 3 seconds
    
    // Cache
    provider: () => new Map(),       // Use Map for cache
    
    // Suspense (optional - requires React 18)
    suspense: false,
};

/**
 * Specific configurations for different data types
 */
export const swrConfigVariants = {
    // For data that changes rarely (license types, settings)
    static: {
        ...swrConfig,
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    },
    
    // For dashboard data (moderate refresh)
    dashboard: {
        ...swrConfig,
        refreshInterval: 60 * 1000,  // Refresh every minute
        revalidateOnFocus: true,
    },
    
    // For real-time data (notifications, activity)
    realtime: {
        ...swrConfig,
        refreshInterval: 30 * 1000,  // Refresh every 30 seconds
        revalidateOnFocus: true,
    },
    
    // For lists with pagination (shops, licenses, logs)
    list: {
        ...swrConfig,
        refreshInterval: 0,
        revalidateOnFocus: false,
        dedupingInterval: 10000,     // Dedupe for 10 seconds
    },
    
    // For heavy data (reports, exports)
    heavy: {
        ...swrConfig,
        refreshInterval: 0,
        revalidateOnFocus: false,
        dedupingInterval: 60000,     // Dedupe for 1 minute
    }
};

/**
 * Example usage with useSWR:
 * 
 * import useSWR from 'swr';
 * import { swrConfigVariants, fetcher } from '@/lib/swr-config';
 * 
 * function Dashboard() {
 *     const { data, error, isLoading } = useSWR(
 *         '/api/dashboard?action=stats',
 *         fetcher,
 *         swrConfigVariants.dashboard
 *     );
 * 
 *     if (isLoading) return <Loading />;
 *     if (error) return <Error />;
 *     return <DashboardContent data={data} />;
 * }
 */
