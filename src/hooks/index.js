/**
 * Hooks Index
 * Re-exports all custom hooks
 * 
 * Note: useShops and useLicenses from useShops.js/useLicenses.js are deprecated.
 * Use the SWR-based versions from useData.js for better caching and performance.
 */

// Pagination hook
export { usePagination } from './usePagination';

// Schema management
export { useSchema } from './useSchema';

// SWR-based data hooks (recommended)
export { 
    useShops,
    useLicenses,
    useLicenseTypes,
    useDropdownData,
    useDashboardStats,
    useExpiringCount,
    useLicenseBreakdown,
    useLicense,
    useExpiringLicenses,
    useActivityLogs,
    useMutation,
    prefetch,
    clearCache
} from './useData';

// Performance/optimization hooks
export {
    useDebounce,
    useDebouncedCallback,
    useThrottle,
    useIntersectionObserver,
    useLocalStorage,
    usePrevious,
    useOnScreen,
    useMediaQuery,
    useIsMobile,
    useIsDesktop,
    useClickOutside,
    useKeyPress,
    useAsync,
    useMemoCompare
} from './useOptimized';
