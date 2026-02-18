"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * useAutoRefresh - Auto-sync data without manual refresh
 *
 * Features:
 * - Polls at configurable interval (default 30s)
 * - Refetches immediately when window regains focus
 * - Pauses polling when tab is hidden (saves resources)
 * - Cross-tab sync via BroadcastChannel (optional)
 * - Debounced focus refetch to prevent rapid calls
 *
 * @param {Function} fetchFn - The async function to call for data refresh
 * @param {Object} options
 * @param {number} options.interval - Polling interval in ms (default 30000)
 * @param {boolean} options.enabled - Enable/disable auto-refresh (default true)
 * @param {string} options.channel - BroadcastChannel name for cross-tab sync (optional)
 */
export function useAutoRefresh(fetchFn, options = {}) {
    const {
        interval = 30000,
        enabled = true,
        channel = null,
    } = options;

    const intervalRef = useRef(null);
    const lastFetchRef = useRef(0);
    const fetchFnRef = useRef(fetchFn);
    const isMountedRef = useRef(true);

    // Always keep the latest fetchFn
    useEffect(() => {
        fetchFnRef.current = fetchFn;
    }, [fetchFn]);

    // Debounced fetch — prevents rapid consecutive calls
    const debouncedFetch = useCallback(() => {
        const now = Date.now();
        // Minimum 3 seconds between fetches
        if (now - lastFetchRef.current < 3000) return;
        if (!isMountedRef.current) return;

        lastFetchRef.current = now;
        try {
            fetchFnRef.current();
        } catch (e) {
            console.error("[useAutoRefresh] fetch error:", e);
        }
    }, []);

    // Start/stop interval
    const startPolling = useCallback(() => {
        if (intervalRef.current) return;
        intervalRef.current = setInterval(() => {
            if (document.visibilityState === "visible") {
                debouncedFetch();
            }
        }, interval);
    }, [interval, debouncedFetch]);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            stopPolling();
            return;
        }

        // — Visibility change: pause/resume polling
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                // Tab became visible → fetch + restart polling
                debouncedFetch();
                startPolling();
            } else {
                // Tab hidden → stop polling
                stopPolling();
            }
        };

        // — Window focus: refetch when user clicks back on the tab
        const handleFocus = () => {
            debouncedFetch();
        };

        // Start polling
        startPolling();

        // Add event listeners
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);

        // — Cross-tab sync via BroadcastChannel
        let bc = null;
        if (channel && typeof BroadcastChannel !== "undefined") {
            try {
                bc = new BroadcastChannel(channel);
                bc.onmessage = () => {
                    // Another tab notified a data change → refetch
                    debouncedFetch();
                };
            } catch {
                // BroadcastChannel not supported
            }
        }

        return () => {
            isMountedRef.current = false;
            stopPolling();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
            if (bc) {
                bc.close();
            }
        };
    }, [enabled, startPolling, stopPolling, debouncedFetch, channel]);

    // Reset mounted ref on mount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);
}

/**
 * notifyDataChange - Notify other tabs that data has changed
 * Call this after a successful create/update/delete operation
 *
 * @param {string} channelName - Same channel name used in useAutoRefresh
 */
export function notifyDataChange(channelName) {
    if (typeof BroadcastChannel === "undefined") return;
    try {
        const bc = new BroadcastChannel(channelName);
        bc.postMessage({ type: "data-change", timestamp: Date.now() });
        bc.close();
    } catch {
        // Silently fail
    }
}
