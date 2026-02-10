'use client';

import { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';

/**
 * Modern Pagination Component
 * - Animated page numbers with hover effects
 * - Smart page range display (shows ... for long lists)
 * - Jump to page feature
 * - Items per page selector
 * - Keyboard navigation support
 */
export default function Pagination({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    itemsPerPage = 20,
    onPageChange,
    onItemsPerPageChange,
    showItemsPerPage = true,
    showPageJump = true,
    showTotalInfo = true,
    siblingCount = 1, // How many pages to show on each side of current
    className = ''
}) {
    const [jumpValue, setJumpValue] = useState('');
    const [isJumpFocused, setIsJumpFocused] = useState(false);

    // Generate page numbers array with ellipsis
    const generatePageNumbers = () => {
        const pages = [];
        const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
        const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

        const showLeftDots = leftSiblingIndex > 2;
        const showRightDots = rightSiblingIndex < totalPages - 1;

        // Always show first page
        if (totalPages > 0) pages.push(1);

        // Left dots
        if (showLeftDots) {
            pages.push('...');
        } else if (leftSiblingIndex > 2) {
            for (let i = 2; i < leftSiblingIndex; i++) {
                pages.push(i);
            }
        }

        // Sibling pages
        for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
            if (i !== 1 && i !== totalPages) {
                pages.push(i);
            }
        }

        // Right dots
        if (showRightDots) {
            pages.push('...');
        } else if (rightSiblingIndex < totalPages - 1) {
            for (let i = rightSiblingIndex + 1; i < totalPages; i++) {
                pages.push(i);
            }
        }

        // Always show last page
        if (totalPages > 1) pages.push(totalPages);

        return pages;
    };

    const pages = generatePageNumbers();

    const handleJumpSubmit = (e) => {
        e.preventDefault();
        const page = parseInt(jumpValue, 10);
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            onPageChange(page);
        }
        setJumpValue('');
        setIsJumpFocused(false);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'ArrowLeft' && currentPage > 1) {
                onPageChange(currentPage - 1);
            } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
                onPageChange(currentPage + 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, totalPages, onPageChange]);

    if (totalPages <= 1 && !showTotalInfo) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className={`pagination-container ${className}`}>
            {/* Left: Total info */}
            {showTotalInfo && (
                <div className="pagination-info">
                    <span className="pagination-info-text">
                        <span className="pagination-range animated-number">{startItem}-{endItem}</span>
                        <span className="pagination-separator">จาก</span>
                        <span className="pagination-total animated-number">{totalItems}</span>
                        <span className="pagination-label">รายการ</span>
                    </span>
                </div>
            )}

            {/* Center: Page numbers */}
            <div className="pagination-nav">
                {/* First & Previous buttons */}
                <button
                    className="pagination-btn pagination-btn-nav"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    title="หน้าแรก"
                    aria-label="ไปหน้าแรก"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="11 17 6 12 11 7"></polyline>
                        <polyline points="18 17 13 12 18 7"></polyline>
                    </svg>
                </button>

                <button
                    className="pagination-btn pagination-btn-nav"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="หน้าก่อนหน้า"
                    aria-label="ก่อนหน้า"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>

                {/* Page numbers */}
                <div className="pagination-pages">
                    {pages.map((page, index) => (
                        page === '...' ? (
                            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                                <span className="ellipsis-dot"></span>
                                <span className="ellipsis-dot"></span>
                                <span className="ellipsis-dot"></span>
                            </span>
                        ) : (
                            <button
                                key={page}
                                className={`pagination-btn pagination-btn-page ${currentPage === page ? 'active' : ''}`}
                                onClick={() => onPageChange(page)}
                                aria-label={`ไปหน้า ${page}`}
                                aria-current={currentPage === page ? 'page' : undefined}
                            >
                                <span className="page-number">{page}</span>
                                {currentPage === page && <span className="active-indicator"></span>}
                            </button>
                        )
                    ))}
                </div>

                {/* Next & Last buttons */}
                <button
                    className="pagination-btn pagination-btn-nav"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    title="หน้าถัดไป"
                    aria-label="ถัดไป"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>

                <button
                    className="pagination-btn pagination-btn-nav"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage >= totalPages}
                    title="หน้าสุดท้าย"
                    aria-label="ไปหน้าสุดท้าย"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="13 17 18 12 13 7"></polyline>
                        <polyline points="6 17 11 12 6 7"></polyline>
                    </svg>
                </button>
            </div>

            {/* Right: Jump to page & Items per page */}
            <div className="pagination-controls">
                {showPageJump && totalPages > 5 && (
                    <form onSubmit={handleJumpSubmit} className={`pagination-jump ${isJumpFocused ? 'focused' : ''}`}>
                        <label htmlFor="jumpPage" className="pagination-jump-label">ไป</label>
                        <input
                            type="number"
                            id="jumpPage"
                            min="1"
                            max={totalPages}
                            value={jumpValue}
                            onChange={(e) => setJumpValue(e.target.value)}
                            onFocus={() => setIsJumpFocused(true)}
                            onBlur={() => setIsJumpFocused(false)}
                            placeholder={currentPage.toString()}
                            className="pagination-jump-input"
                        />
                        <button type="submit" className="pagination-jump-btn" disabled={!jumpValue}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </button>
                    </form>
                )}

                {showItemsPerPage && onItemsPerPageChange && (
                    <div className="pagination-per-page">
                        <span className="pagination-per-page-label">แสดง</span>
                        <CustomSelect
                            id="items-per-page-select"
                            value={itemsPerPage}
                            onChange={(e) => onItemsPerPageChange(parseInt(e.target.value, 10))}
                            options={[
                                { value: 10, label: '10' },
                                { value: 20, label: '20' },
                                { value: 50, label: '50' },
                                { value: 100, label: '100' }
                            ]}
                            className="pagination-select"
                            aria-label="จำนวนรายการต่อหน้า"
                        />
                        <span className="pagination-per-page-suffix">รายการ</span>
                    </div>
                )}
            </div>
        </div>
    );
}
