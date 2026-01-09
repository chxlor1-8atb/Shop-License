'use client';

/**
 * FilterRow Component
 * Container for filter inputs with consistent styling
 * 
 * @param {ReactNode} children - Filter inputs
 * @param {string} className - Additional CSS classes
 */
export default function FilterRow({ children, className = '' }) {
    return (
        <div
            className={`filter-row ${className}`.trim()}
            style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '1rem',
                alignItems: 'center'
            }}
        >
            {children}
        </div>
    );
}

/**
 * SearchInput Component
 * Search input with debounce support
 */
export function SearchInput({
    value,
    onChange,
    placeholder = 'ค้นหา...',
    className = ''
}) {
    return (
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={className}
        />
    );
}
