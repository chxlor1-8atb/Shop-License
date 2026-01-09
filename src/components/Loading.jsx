'use client';

/**
 * Themed Loading Component
 * Displays a loading animation that matches the system's orange/amber theme
 */

export default function Loading({ message = 'กำลังโหลดข้อมูล...', fullPage = false }) {
    const containerClass = fullPage
        ? 'loading-container loading-fullpage'
        : 'loading-container';

    return (
        <div className={containerClass}>
            <div className="loading-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-dot"></div>
            </div>
            {message && <p className="loading-text">{message}</p>}
        </div>
    );
}

/**
 * Skeleton Loading for Tables
 */
export function TableSkeleton({ rows = 5, columns = 5 }) {
    return (
        <div className="skeleton-table">
            <div className="skeleton-header">
                {Array(columns).fill(0).map((_, i) => (
                    <div key={i} className="skeleton-cell skeleton-animate"></div>
                ))}
            </div>
            {Array(rows).fill(0).map((_, rowIndex) => (
                <div key={rowIndex} className="skeleton-row">
                    {Array(columns).fill(0).map((_, colIndex) => (
                        <div key={colIndex} className="skeleton-cell skeleton-animate"></div>
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * Skeleton Loading for Cards
 */
export function CardSkeleton({ count = 4 }) {
    return (
        <div className="skeleton-cards">
            {Array(count).fill(0).map((_, i) => (
                <div key={i} className="skeleton-card">
                    <div className="skeleton-card-icon skeleton-animate"></div>
                    <div className="skeleton-card-content">
                        <div className="skeleton-line skeleton-line-lg skeleton-animate"></div>
                        <div className="skeleton-line skeleton-line-sm skeleton-animate"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}
