import { useEffect } from 'react';
import { mutate } from 'swr';

/**
 * Hook for realtime functionality (disabled for Neon)
 * Neon does not support WebSocket connections like Supabase
 * This hook is now a no-op to prevent errors
 * 
 * @param {string} tableName - The table name (unused)
 * @param {Function} [callback] - Optional callback (unused)
 * @param {Array} [dependencyArray] - Dependency array (unused)
 */
export function useRealtime(tableName, callback, dependencyArray = []) {
    // Neon does not support realtime WebSocket connections
    // This hook is disabled to prevent connection errors
    useEffect(() => {
        // No-op - realtime features are disabled with Neon
        return () => {}; // Empty cleanup
    }, [tableName, ...dependencyArray]);
}
