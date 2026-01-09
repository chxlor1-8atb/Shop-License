'use client';

/**
 * TableSkeleton Component
 * Displays skeleton loading state for tables
 * Prevents CLS by matching table structure
 * 
 * @param {number} rows - Number of skeleton rows
 * @param {Array} columns - Column definitions with optional widths
 */
export default function TableSkeleton({
    rows = 5,
    columns = [
        { width: '25%' },
        { width: '20%' },
        { width: '15%', center: true },
        { width: '15%', center: true },
        { width: '15%', center: true },
        { width: '10%', center: true }
    ]
}) {
    return (
        <>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={`skeleton-row-${rowIndex}`}>
                    {columns.map((col, colIndex) => (
                        <td
                            key={`skeleton-cell-${rowIndex}-${colIndex}`}
                            className={col.center ? 'text-center' : ''}
                        >
                            <div
                                className="skeleton-cell skeleton-animate"
                                style={{
                                    height: col.height || '1rem',
                                    width: col.width || '80%',
                                    margin: col.center ? '0 auto' : undefined,
                                    borderRadius: col.rounded ? '9999px' : '4px'
                                }}
                            />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

/**
 * CardSkeleton Component
 * Displays skeleton loading state for stat cards
 */
export function CardSkeleton({ count = 5 }) {
    return (
        <div className="stats-grid">
            {Array.from({ length: count }).map((_, i) => (
                <div key={`card-skeleton-${i}`} className="stat-card" style={{ opacity: 0.7 }}>
                    <div
                        className="skeleton-cell skeleton-animate"
                        style={{ width: '56px', height: '56px', borderRadius: '12px' }}
                    />
                    <div className="stat-content" style={{ gap: '0.5rem', flex: 1 }}>
                        <div
                            className="skeleton-cell skeleton-animate"
                            style={{ width: '60%', height: '28px' }}
                        />
                        <div
                            className="skeleton-cell skeleton-animate"
                            style={{ width: '80%', height: '16px' }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
