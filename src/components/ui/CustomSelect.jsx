'use client';
import { useState, useRef, useEffect, useLayoutEffect, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';

const useIsomorphicLayoutEffect =
    typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function CustomSelect({
    value,
    onChange,
    options = [],
    placeholder = 'Select option',
    name,
    label,
    className = '',
    style = {},
    icon,
    disabled = false,
    searchable = false,
    searchPlaceholder = 'ค้นหา...',
    id,
    autoFocus = false,
    onBlur
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownStyle, setDropdownStyle] = useState({});
    const [mounted, setMounted] = useState(false);
    const wrapperRef = useRef(null);
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);
    const searchInputId = useId();

    useEffect(() => { setMounted(true); }, []);

    const selectedOption = useMemo(() => 
        options.find(opt => opt.value == value), 
        [options, value]
    );

    // Filter options based on search term - memoized for performance
    // รองรับ `opt.searchText` เพื่อให้ค้นข้าม field (เช่น ชื่อร้าน + เจ้าของ + เบอร์)
    // โดยไม่ต้องเห็น field เหล่านั้นใน label
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;

        const lowerSearchTerm = searchTerm.toLowerCase();
        return options.filter(opt => {
            const haystack = (
                opt.searchText ||
                opt.label ||
                opt.name ||
                ''
            ).toString().toLowerCase();
            return haystack.includes(lowerSearchTerm);
        });
    }, [options, searchTerm]);

    useEffect(() => {
        if (autoFocus && !disabled) {
            // If autoFocus is true, focus the wrapper and open the dropdown
            if (wrapperRef.current) {
                wrapperRef.current.focus();
            }
            setIsOpen(true);
        }
    }, [autoFocus, disabled]);

    useEffect(() => {
        function handleClickOutside(event) {
            const insideWrapper = wrapperRef.current && wrapperRef.current.contains(event.target);
            const insideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
            if (!insideWrapper && !insideDropdown) {
                if (isOpen) {
                    setIsOpen(false);
                    setSearchTerm('');
                    if (onBlur) onBlur(event);
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onBlur]);

    const handleBlur = (e) => {
        // Only trigger blur if focus leaves the entire wrapper
        if (onBlur && wrapperRef.current && !wrapperRef.current.contains(e.relatedTarget)) {
             // If clicking outside handles this, we might double fire, but usually handleBlur is for Tab navigation
             // We can check if we are clicking inside in the mousedown handler.
             // For simplicity, let's allow onBlur to fire.
             // But we need to close formatting.
             setIsOpen(false);
             onBlur(e);
        }
    };

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen, searchable]);

    // 🔄 Smart positioning via Portal — เลือกบน/ล่างตามพื้นที่ + clamp max-height
    const updatePosition = () => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const MARGIN = 8;
        const GAP = 6;
        const DESIRED_HEIGHT = 320;
        const MIN_HEIGHT = 160;
        // Width: min = trigger width, ให้ขยายตามเนื้อหาได้ (max-content) แต่ไม่เกินจอ
        const minWidth = Math.max(rect.width, 200);
        const maxWidth = Math.max(minWidth, vw - MARGIN * 2);
        let left = rect.left;
        // ถ้า dropdown อาจล้นขวา ให้ชิดขวาของ trigger
        if (left + minWidth > vw - MARGIN) left = Math.max(MARGIN, rect.right - minWidth);
        if (left < MARGIN) left = MARGIN;

        const spaceBelow = vh - rect.bottom - GAP - MARGIN;
        const spaceAbove = rect.top - GAP - MARGIN;
        const preferBelow = spaceBelow >= DESIRED_HEIGHT || spaceBelow >= spaceAbove;

        let top;
        let maxHeight;
        if (preferBelow) {
            top = rect.bottom + GAP;
            maxHeight = Math.max(MIN_HEIGHT, Math.min(DESIRED_HEIGHT, spaceBelow));
        } else {
            maxHeight = Math.max(MIN_HEIGHT, Math.min(DESIRED_HEIGHT, spaceAbove));
            top = rect.top - GAP - maxHeight;
        }
        if (top < MARGIN) top = MARGIN;
        if (top + maxHeight > vh - MARGIN) maxHeight = Math.max(120, vh - MARGIN - top);

        setDropdownStyle({
            position: 'fixed',
            top: `${Math.round(top)}px`,
            left: `${Math.round(left)}px`,
            minWidth: `${Math.round(minWidth)}px`,
            width: 'max-content',
            maxWidth: `${Math.round(maxWidth)}px`,
            maxHeight: `${Math.round(maxHeight)}px`,
            zIndex: 10050,
        });
    };

    useIsomorphicLayoutEffect(() => {
        if (!isOpen) return;
        updatePosition();
        const handle = () => updatePosition();
        window.addEventListener('resize', handle);
        window.addEventListener('scroll', handle, true);
        return () => {
            window.removeEventListener('resize', handle);
            window.removeEventListener('scroll', handle, true);
        };
    }, [isOpen]);

    const handleSelect = (optionValue, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (disabled) return;

        // Mimic event object for compatibility
        const event = {
            target: {
                name: name,
                value: optionValue
            }
        };

        if (onChange) onChange(event);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleToggle = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (disabled) return;
        setIsOpen(!isOpen);
        if (isOpen) setSearchTerm('');
    };

    return (
        <div
            className={`custom-select-wrapper ${className} ${disabled ? 'disabled' : ''} ${searchable ? 'searchable' : ''} ${isOpen ? 'open' : ''}`}
            ref={wrapperRef}
            style={style}
            onBlur={handleBlur}
        >
            <button
                type="button"
                id={id}
                className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={handleToggle}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={`${id || searchInputId}-list`}
                disabled={disabled}
                aria-label={label || placeholder}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        handleToggle(e);
                    }
                }}
            >
                <div className="custom-select-text">
                    {icon && <i className={`${icon} mr-2`}></i>}
                    <span className={!selectedOption ? 'placeholder' : ''}>
                        {selectedOption ? selectedOption.label || selectedOption.name : placeholder}
                    </span>
                </div>
                <div className="arrow-container">
                    <i className="fas fa-chevron-down arrow"></i>
                </div>
            </button>

            {/* Dropdown rendered via Portal to escape stacking/overflow ancestors */}
            {isOpen && mounted && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    className={`custom-select-options custom-select-options--portal show`}
                    role="listbox"
                    id={`${id || searchInputId}-list`}
                    style={dropdownStyle}
                    onClick={(e) => e.stopPropagation()}
                >
                    {label && (
                        <div className="custom-select-header">
                            {label}
                        </div>
                    )}
                    {searchable && (
                        <div className="custom-select-search">
                            <i className="fas fa-search search-icon"></i>
                            <input
                                ref={searchInputRef}
                                id={searchInputId}
                                type="text"
                                className="custom-select-search-input"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Search options"
                            />
                            {searchTerm && (
                                <button
                                    className="search-clear"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchTerm('');
                                    }}
                                    aria-label="Clear search"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                        </div>
                    )}

                    <div className="custom-select-options-list">
                        {filteredOptions.map((opt, index) => (
                            <div
                                key={index}
                                role="option"
                                aria-selected={value == opt.value}
                                className={`custom-option ${value == opt.value ? 'selected' : ''}`}
                                onClick={(e) => handleSelect(opt.value, e)}
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleSelect(opt.value, e);
                                    }
                                }}
                            >
                                {opt.optionLabel || opt.label || opt.name}
                            </div>
                        ))}
                        {filteredOptions.length === 0 && searchTerm && (
                            <div className="custom-option disabled text-center text-muted">
                                <i className="fas fa-search mr-2"></i>
                                ไม่พบข้อมูลที่ค้นหา
                            </div>
                        )}
                        {options.length === 0 && (
                            <div className="custom-option disabled text-center text-muted">No options</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
