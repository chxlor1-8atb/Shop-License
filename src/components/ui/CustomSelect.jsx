'use client';
import { useState, useRef, useEffect } from 'react';

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
    searchPlaceholder = 'ค้นหา...'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);
    const searchInputRef = useRef(null);

    const selectedOption = options.find(opt => opt.value == value);

    // Filter options based on search term
    const filteredOptions = searchTerm
        ? options.filter(opt => {
            const label = (opt.label || opt.name || '').toLowerCase();
            return label.includes(searchTerm.toLowerCase());
        })
        : options;

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

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
        >
            <div
                className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={handleToggle}
            >
                <div className="value-container">
                    {icon && <i className={`${icon} mr-2`}></i>}
                    <span className={!selectedOption ? 'placeholder' : ''}>
                        {selectedOption ? selectedOption.label || selectedOption.name : placeholder}
                    </span>
                </div>
                <div className="arrow-container">
                    <i className="fas fa-chevron-down arrow"></i>
                </div>
            </div>

            <div className={`custom-select-options ${isOpen ? 'show' : ''}`}>
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
                            type="text"
                            className="custom-select-search-input"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                        {searchTerm && (
                            <button
                                className="search-clear"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchTerm('');
                                }}
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
                            className={`custom-option ${value == opt.value ? 'selected' : ''}`}
                            onClick={(e) => handleSelect(opt.value, e)}
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
