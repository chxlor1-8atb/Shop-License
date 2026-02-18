'use client';
import { useState, useRef, useEffect, useId, useMemo } from 'react';

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
    const wrapperRef = useRef(null);
    const searchInputRef = useRef(null);
    const searchInputId = useId();

    const selectedOption = useMemo(() => 
        options.find(opt => opt.value == value), 
        [options, value]
    );

    // Filter options based on search term - memoized for performance
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        return options.filter(opt => {
            const label = (opt.label || opt.name || '').toLowerCase();
            return label.includes(lowerSearchTerm);
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
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                if (isOpen) {
                    setIsOpen(false);
                    setSearchTerm('');
                    // Trigger onBlur when clicking outside if we were open (interaction finished)
                     if (onBlur) onBlur(event);
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef, isOpen, onBlur]);

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

            <div 
                className={`custom-select-options ${isOpen ? 'show' : ''}`}
                role="listbox"
                id={`${id || searchInputId}-list`}
            >
                {label && (
                    <div className="custom-select-header">
                        {label}
                    </div>
                )}
                {/* Search Input */}
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

                {/* Options List */}
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
                            {opt.label || opt.name}
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
            </div>
        </div>
    );
}
