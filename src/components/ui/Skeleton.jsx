/**
 * Optimized Loading Skeleton Components
 * Lightweight, CSS-only animations for better performance
 */

'use client';

import { memo } from 'react';

/**
 * Base Skeleton - CSS-only animation
 */
export const Skeleton = memo(function Skeleton({ 
    width = '100%', 
    height = '20px', 
    borderRadius = '4px',
    className = '' 
}) {
    return (
        <div 
            className={`skeleton-base ${className}`}
            style={{ 
                width, 
                height, 
                borderRadius,
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-shimmer 1.5s infinite',
            }}
        />
    );
});

/**
 * Card Skeleton
 */
export const CardSkeleton = memo(function CardSkeleton() {
    return (
        <div className="card" style={{ padding: '1.5rem' }}>
            <Skeleton width="60%" height="24px" style={{ marginBottom: '1rem' }} />
            <Skeleton width="100%" height="16px" style={{ marginBottom: '0.5rem' }} />
            <Skeleton width="80%" height="16px" style={{ marginBottom: '0.5rem' }} />
            <Skeleton width="40%" height="16px" />
        </div>
    );
});

/**
 * Table Skeleton
 */
export const TableSkeleton = memo(function TableSkeleton({ rows = 5, columns = 4 }) {
    return (
        <div className="table-skeleton">
            {/* Header */}
            <div style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #eee' }}>
                {[...Array(columns)].map((_, i) => (
                    <Skeleton key={i} width={`${100/columns}%`} height="20px" />
                ))}
            </div>
            {/* Rows */}
            {[...Array(rows)].map((_, rowIndex) => (
                <div key={rowIndex} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #f5f5f5' }}>
                    {[...Array(columns)].map((_, colIndex) => (
                        <Skeleton key={colIndex} width={`${100/columns}%`} height="16px" />
                    ))}
                </div>
            ))}
        </div>
    );
});

/**
 * Stats Grid Skeleton
 */
export const StatsGridSkeleton = memo(function StatsGridSkeleton({ count = 5 }) {
    return (
        <div className="stats-grid">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="stat-card" style={{ opacity: 0.7 }}>
                    <Skeleton width="56px" height="56px" borderRadius="12px" />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Skeleton width="60%" height="28px" />
                        <Skeleton width="80%" height="16px" />
                    </div>
                </div>
            ))}
        </div>
    );
});

/**
 * Chart Skeleton
 */
export const ChartSkeleton = memo(function ChartSkeleton() {
    return (
        <div className="card" style={{ minHeight: '350px' }}>
            <div className="card-header">
                <Skeleton width="200px" height="24px" />
            </div>
            <div className="card-body" style={{ 
                height: '300px', 
                display: 'flex', 
                alignItems: 'flex-end', 
                justifyContent: 'space-around',
                padding: '2rem'
            }}>
                {/* Fake bar chart */}
                {[60, 80, 45, 90, 70, 55].map((height, i) => (
                    <Skeleton 
                        key={i} 
                        width="12%" 
                        height={`${height}%`} 
                        borderRadius="4px 4px 0 0"
                    />
                ))}
            </div>
        </div>
    );
});

/**
 * Form Skeleton
 */
export const FormSkeleton = memo(function FormSkeleton({ fields = 4 }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[...Array(fields)].map((_, i) => (
                <div key={i}>
                    <Skeleton width="30%" height="16px" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton width="100%" height="40px" borderRadius="8px" />
                </div>
            ))}
            <Skeleton width="120px" height="44px" borderRadius="8px" />
        </div>
    );
});

/**
 * List Skeleton
 */
export const ListSkeleton = memo(function ListSkeleton({ items = 5 }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[...Array(items)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Skeleton width="40px" height="40px" borderRadius="50%" />
                    <div style={{ flex: 1 }}>
                        <Skeleton width="60%" height="16px" style={{ marginBottom: '0.5rem' }} />
                        <Skeleton width="40%" height="14px" />
                    </div>
                </div>
            ))}
        </div>
    );
});

/**
 * Page Loading Skeleton
 */
export const PageSkeleton = memo(function PageSkeleton() {
    return (
        <div>
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <Skeleton width="200px" height="32px" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="300px" height="16px" />
            </div>
            
            {/* Stats */}
            <StatsGridSkeleton count={4} />
            
            {/* Table */}
            <div style={{ marginTop: '2rem' }}>
                <TableSkeleton rows={5} columns={5} />
            </div>
        </div>
    );
});

/**
 * Inline CSS for skeleton animation
 * Add this to your global CSS or include in component
 */
export const skeletonStyles = `
@keyframes skeleton-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

.skeleton-base {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
}
`;

// Default export
const SkeletonComponents = {
    Skeleton,
    CardSkeleton,
    TableSkeleton,
    StatsGridSkeleton,
    ChartSkeleton,
    FormSkeleton,
    ListSkeleton,
    PageSkeleton,
};

export default SkeletonComponents;
