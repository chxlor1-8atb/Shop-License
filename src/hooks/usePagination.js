'use client';

import { useState, useCallback, useMemo } from 'react';
import { PAGINATION_DEFAULTS } from '@/constants';

/**
 * Custom hook for pagination management
 * Follows Single Responsibility - only manages pagination state
 * 
 * @param {number} initialLimit - Items per page (default: 20)
 * @returns {Object} Pagination state and handlers
 */
export function usePagination(initialLimit = PAGINATION_DEFAULTS.LIMIT) {
    const [pagination, setPagination] = useState({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: initialLimit,
        total: 0,
        totalPages: 0
    });

    /**
     * Updates pagination state from API response
     */
    const updateFromResponse = useCallback((response) => {
        setPagination(prev => ({
            ...prev,
            total: response.total ?? prev.total,
            totalPages: response.totalPages ?? prev.totalPages,
            page: response.page ?? prev.page
        }));

        // Auto-correct page if out of bounds
        if (response.page > response.totalPages && response.totalPages > 0) {
            setPagination(prev => ({ ...prev, page: response.totalPages }));
        }
    }, []);

    /**
     * Changes current page
     */
    const setPage = useCallback((page) => {
        setPagination(prev => ({ ...prev, page }));
    }, []);

    /**
     * Changes items per page and resets to page 1
     */
    const setLimit = useCallback((limit) => {
        setPagination(prev => ({ ...prev, limit, page: 1 }));
    }, []);

    /**
     * Resets pagination to initial state
     */
    const reset = useCallback(() => {
        setPagination({
            page: PAGINATION_DEFAULTS.PAGE,
            limit: initialLimit,
            total: 0,
            totalPages: 0
        });
    }, [initialLimit]);

    /**
     * Resets to page 1 (for filter changes)
     */
    const resetPage = useCallback(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, []);

    const paginationResult = useMemo(() => ({
        ...pagination,
        setPage,
        setLimit,
        reset,
        resetPage,
        updateFromResponse
    }), [pagination, setPage, setLimit, reset, resetPage, updateFromResponse]);

    return paginationResult;
}

export default usePagination;
