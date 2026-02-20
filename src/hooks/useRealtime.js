import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { mutate } from 'swr';

/**
 * Hook to subscribe to realtime changes on a Supabase table
 * @param {string} tableName - The table name to listen to
 * @param {Function} [callback] - Optional callback function to run on changes
 * @param {Array} [dependencyArray] - Explicit dependency array for re-subscription
 */
export function useRealtime(tableName, callback, dependencyArray = []) {
    useEffect(() => {
        // If supabase is not configured, do nothing
        if (!supabase) return;

        // 1. Subscribe to changes
        const channel = supabase
            .channel(`realtime:${tableName}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: tableName
                },
                (payload) => {
                    // console.log(`[Realtime] Change received from ${tableName}:`, payload);

                    // 2. Call callback if provided (e.g. to update local state directly)
                    if (callback) {
                        callback(payload);
                    }

                    // 3. Or just revalidate SWR cache (easiest way)
                    // This will trigger a re-fetch of data automatically for any SWR key 
                    // that might be related to this table based on convention or tagging if implemented.
                    // For now, we rely on the callback or general revalidation.
                }
            )
            .subscribe();

        // 4. Cleanup on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [tableName, ...dependencyArray]);
}
