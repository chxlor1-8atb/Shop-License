/**
 * Custom SWR Hooks for optimized data fetching
 * ใช้สำหรับ fetch ข้อมูลจาก API พร้อม caching และ deduplication
 */

'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher, swrConfigVariants as CONFIG } from '@/lib/swr-config';

/**
 * Fetcher for POST/PUT/DELETE requests
 */
const mutationFetcher = async (url, { arg }) => {
    const { method = 'POST', body } = arg;
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const error = new Error('An error occurred');
        error.info = await res.json().catch(() => ({}));
        error.status = res.status;
        throw error;
    }
    return res.json();
};

// ===== Dashboard Hooks =====

/**
 * Hook for dashboard statistics
 */
export function useDashboardStats() {
    const { data, error, isLoading, mutate } = useSWR(
        '/api/dashboard?action=stats',
        fetcher,
        CONFIG.dashboard
    );

    return {
        stats: data?.stats,
        isLoading,
        isError: error,
        refresh: mutate,
    };
}

/**
 * Hook for expiring licenses count (for header badge)
 */
export function useExpiringCount() {
    const { data, error, isLoading } = useSWR(
        '/api/dashboard?action=expiring_count',
        fetcher,
        CONFIG.realtime
    );

    return {
        count: data?.count || 0,
        isLoading,
        isError: error,
    };
}

/**
 * Hook for license breakdown by type
 */
export function useLicenseBreakdown() {
    const { data, error, isLoading } = useSWR(
        '/api/dashboard?action=license_breakdown',
        fetcher,
        CONFIG.dashboard
    );

    return {
        breakdown: data?.breakdown || [],
        isLoading,
        isError: error,
    };
}

// ===== License Types Hooks =====

/**
 * Hook for license types list
 */
export function useLicenseTypes() {
    const { data, error, isLoading, mutate } = useSWR(
        '/api/license-types',
        fetcher,
        CONFIG.static
    );

    return {
        licenseTypes: data?.types || data?.licenseTypes || [],
        isLoading,
        isError: error,
        refresh: mutate,
    };
}

/**
 * Hook for dropdown data (shops + license types)
 * Uses SWR for caching and deduplication
 * Pre-formats options for CustomSelect component
 */
export function useDropdownData() {
    const { data: shopsData, isLoading: shopsLoading } = useSWR(
        '/api/shops?limit=1000',
        fetcher,
        CONFIG.static
    );

    const { data: typesData, isLoading: typesLoading } = useSWR(
        '/api/license-types',
        fetcher,
        CONFIG.static
    );

    // Wrap in useMemo to prevent dependency changes on every render
    const shops = useMemo(() => shopsData?.shops || [], [shopsData?.shops]);
    const licenseTypes = useMemo(() => typesData?.types || typesData?.licenseTypes || [], [typesData?.types, typesData?.licenseTypes]);

    // Pre-formatted options for CustomSelect
    const shopOptions = useMemo(() => shops.map(s => ({
        value: s.id,
        label: s.shop_name || s.name
    })), [shops]);

    const typeOptions = useMemo(() => licenseTypes.map(t => ({
        value: t.id,
        label: t.name
    })), [licenseTypes]);

    return {
        shops,
        licenseTypes,
        shopOptions,
        typeOptions,
        loading: shopsLoading || typesLoading,
    };
}

// ===== Shops Hooks =====

/**
 * Hook for shops list
 */
export function useShops(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', params.page);
    if (params.limit) searchParams.set('limit', params.limit);

    const url = `/api/shops${searchParams.toString() ? `?${searchParams}` : ''}`;

    const { data, error, isLoading, mutate } = useSWR(
        url,
        fetcher,
        CONFIG.list
    );

    return {
        shops: data?.shops || [],
        pagination: data?.pagination,
        isLoading,
        isError: error,
        refresh: mutate,
    };
}

// ===== Licenses Hooks =====

/**
 * Hook for licenses list with filters
 */
export function useLicenses(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.license_type) searchParams.set('license_type', params.license_type);
    if (params.status) searchParams.set('status', params.status);
    if (params.page) searchParams.set('page', params.page);
    if (params.limit) searchParams.set('limit', params.limit);

    const url = `/api/licenses${searchParams.toString() ? `?${searchParams}` : ''}`;

    const { data, error, isLoading, mutate } = useSWR(
        url,
        fetcher,
        CONFIG.list
    );

    return {
        licenses: data?.licenses || [],
        pagination: data?.pagination,
        isLoading,
        isError: error,
        refresh: mutate,
    };
}

/**
 * Hook for single license
 */
export function useLicense(id) {
    const { data, error, isLoading, mutate } = useSWR(
        id ? `/api/licenses?id=${id}` : null,
        fetcher,
        CONFIG.static
    );

    return {
        license: data?.license,
        isLoading,
        isError: error,
        refresh: mutate,
    };
}

/**
 * Hook for expiring licenses
 */
export function useExpiringLicenses() {
    const { data, error, isLoading, mutate } = useSWR(
        '/api/licenses/expiring',
        fetcher,
        CONFIG.dashboard
    );

    return {
        licenses: data?.licenses || [],
        isLoading,
        isError: error,
        refresh: mutate,
    };
}

// ===== Activity Logs Hooks =====

/**
 * Hook for activity logs (admin only)
 */
export function useActivityLogs(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page);
    if (params.limit) searchParams.set('limit', params.limit);
    if (params.user_id) searchParams.set('user_id', params.user_id);

    const url = `/api/activity-logs${searchParams.toString() ? `?${searchParams}` : ''}`;

    const { data, error, isLoading, mutate } = useSWR(
        url,
        fetcher,
        CONFIG.list
    );

    return {
        logs: data?.logs || [],
        pagination: data?.pagination,
        isLoading,
        isError: error,
        refresh: mutate,
    };
}

// ===== Mutation Hooks =====

/**
 * Hook for creating/updating/deleting data
 * Usage:
 * const { trigger, isMutating } = useMutation('/api/licenses');
 * await trigger({ method: 'POST', body: { ... } });
 */
export function useMutation(url) {
    const { trigger, isMutating, error } = useSWRMutation(
        url,
        mutationFetcher
    );

    return {
        trigger,
        isMutating,
        error,
    };
}

// ===== Utility Functions =====

/**
 * Prefetch data for faster navigation
 * Call this on hover or before navigation
 */
export function prefetch(url) {
    return fetcher(url);
}

/**
 * Clear all SWR cache
 * Call when user logs out
 */
export function clearCache(mutate) {
    mutate(
        () => true, // match all keys
        undefined,  // set data to undefined
        { revalidate: false }
    );
}
