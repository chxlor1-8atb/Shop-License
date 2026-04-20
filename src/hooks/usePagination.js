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
     * - Merges total/totalPages/page in a single setState to avoid double-render
     * - Auto-corrects page if it exceeds totalPages (ป้องกันอยู่หน้าที่ข้อมูลว่าง
     *   เช่น หลัง filter ทำให้ totalPages ลดลง)
     */
    const updateFromResponse = useCallback((response) => {
        if (!response) return;

        setPagination(prev => {
            const total      = response.total      ?? prev.total;
            const totalPages = response.totalPages ?? prev.totalPages;
            let   page       = response.page       ?? prev.page;

            // Auto-correct: ถ้าหน้าปัจจุบันเกิน totalPages ให้ย้อนไปหน้าสุดท้าย
            if (totalPages > 0 && page > totalPages) {
                page = totalPages;
            }
            if (page < 1) page = 1;

            return { ...prev, total, totalPages, page };
        });
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
