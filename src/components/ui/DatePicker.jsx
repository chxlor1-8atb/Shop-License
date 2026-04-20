'use client';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatThaiDateShort } from '@/utils/formatters';

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const DROPDOWN_WIDTH = 320;
const DROPDOWN_HEIGHT = 420; // approximate height for flip detection
const GAP = 8;

// Use useLayoutEffect only on client to avoid SSR warnings
const useIsomorphicLayoutEffect =
    typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function DatePicker({
    value,
    onChange,
    name,
    placeholder = 'เลือกวันที่',
    disabled = false,
    lang = 'th', // 'th' or 'en'
    className = '',
    onBlur,
    autoFocus = false,
    id
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    const [dropdownStyle, setDropdownStyle] = useState({});
    const [mounted, setMounted] = useState(false);
    const wrapperRef = useRef(null);
    const dropdownRef = useRef(null);

    // Track mount for SSR-safe portal
    useEffect(() => {
        setMounted(true);
    }, []);

    // Compute dropdown position based on trigger rect + viewport.
    // Strategy: pick the side (above/below) with MORE available space,
    // and clamp max-height so the dropdown never overflows the viewport.
    // Internal content scrolls if clamped.
    const updatePosition = () => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const MARGIN = 8; // minimum gap from viewport edges
        const MIN_HEIGHT = 220; // don't shrink smaller than this if possible

        // Horizontal: align left by default; if overflow right, shift left
        const width = Math.min(DROPDOWN_WIDTH, vw - MARGIN * 2);
        let left = rect.left;
        if (left + width > vw - MARGIN) {
            left = Math.max(MARGIN, rect.right - width);
        }
        if (left < MARGIN) left = MARGIN;

        // Vertical: compare space above vs below, pick the larger side
        const spaceBelow = vh - rect.bottom - GAP - MARGIN;
        const spaceAbove = rect.top - GAP - MARGIN;
        const preferBelow = spaceBelow >= DROPDOWN_HEIGHT || spaceBelow >= spaceAbove;

        let top;
        let maxHeight;
        if (preferBelow) {
            top = rect.bottom + GAP;
            maxHeight = Math.max(MIN_HEIGHT, Math.min(DROPDOWN_HEIGHT, spaceBelow));
        } else {
            maxHeight = Math.max(MIN_HEIGHT, Math.min(DROPDOWN_HEIGHT, spaceAbove));
            top = rect.top - GAP - maxHeight;
        }

        // Final clamp: if viewport is so small that neither side fits MIN_HEIGHT,
        // pin to viewport edges so nothing is cut off.
        if (top < MARGIN) top = MARGIN;
        if (top + maxHeight > vh - MARGIN) {
            maxHeight = Math.max(120, vh - MARGIN - top);
        }

        setDropdownStyle({
            position: 'fixed',
            top: `${Math.round(top)}px`,
            left: `${Math.round(left)}px`,
            width: `${Math.round(width)}px`,
            maxHeight: `${Math.round(maxHeight)}px`,
            zIndex: 10050,
        });
    };

    useIsomorphicLayoutEffect(() => {
        if (!isOpen) return;
        updatePosition();
        const handle = () => updatePosition();
        window.addEventListener('resize', handle);
        window.addEventListener('scroll', handle, true); // capture to catch nested scroll containers
        return () => {
            window.removeEventListener('resize', handle);
            window.removeEventListener('scroll', handle, true);
        };
    }, [isOpen]);

    const selectedDate = value ? new Date(value) : null;
    const DAYS = lang === 'th' ? DAYS_TH : DAYS_EN;

    useEffect(() => {
        if (autoFocus && !disabled) {
            setIsOpen(true);
        }
    }, [autoFocus, disabled]);

    useEffect(() => {
        function handleClickOutside(event) {
            const insideWrapper = wrapperRef.current && wrapperRef.current.contains(event.target);
            const insideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
            if (!insideWrapper && !insideDropdown) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle focus loss
    const handleBlur = (e) => {
        if (onBlur && wrapperRef.current && !wrapperRef.current.contains(e.relatedTarget)) {
            // Delay slightly to allow click events to process
            setTimeout(() => {
                onBlur(e);
            }, 100);
        }
    };

    // Get days in month
    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    // Get first day of month (0 = Sunday)
    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };

    // Navigate months
    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    // Handle date selection
    const handleSelectDate = (day) => {
        if (disabled) return;

        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        // Format as YYYY-MM-DD using local time to avoid timezone issues
        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        const formattedDate = `${year}-${month}-${d}`;

        const event = {
            target: {
                name: name,
                value: formattedDate
            }
        };

        if (onChange) onChange(event);
        setIsOpen(false);
    };

    // Format display date - use shared formatter
    const formatDisplayDate = formatThaiDateShort;

    // Generate calendar days
    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];

        // Empty cells for days before first day of month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="datepicker-day empty"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;

            const isToday = new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

            days.push(
                <div
                    key={day}
                    className={`datepicker-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent bubbling causing issues
                        handleSelectDate(day);
                    }}
                >
                    {day}
                </div>
            );
        }

        return days;
    };

    return (
        <div
            className={`datepicker-wrapper ${disabled ? 'disabled' : ''} ${className}`}
            ref={wrapperRef}
            tabIndex={disabled ? -1 : 0}
            onBlur={handleBlur}
            style={{ outline: 'none' }} // Remove focus outline
        >
            {/* Input Trigger */}
            <button
                type="button"
                id={id}
                className={`datepicker-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
            >
                <i className="fas fa-calendar-alt"></i>
                <span className={!value ? 'placeholder' : ''}>
                    {value ? formatDisplayDate(value) : placeholder}
                </span>
                <i className={`fas fa-chevron-down arrow ${isOpen ? 'open' : ''}`}></i>
            </button>

            {/* Calendar Dropdown rendered via Portal to escape stacking/overflow of ancestors */}
            {isOpen && mounted && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    className="datepicker-dropdown datepicker-dropdown--portal"
                    style={dropdownStyle}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                >
                    {/* Top Display (Selected Date) */}
                    <div className="datepicker-display-top">
                        <span className="display-label">วันที่เลือก</span>
                        <div className="display-date-text">
                            {value ? formatDisplayDate(value) : (lang === 'th' ? 'เลือกวันที่' : 'Select Date')}
                        </div>
                    </div>

                    <div className="datepicker-divider"></div>

                    {/* Month Nav Header */}
                    <div className="datepicker-calendar-header">
                        <span className="datepicker-title">
                            {MONTHS_TH[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
                        </span>
                        <div className="datepicker-nav-buttons">
                            <button type="button" className="datepicker-nav" onClick={prevMonth}>
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            <button type="button" className="datepicker-nav" onClick={nextMonth}>
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>

                    {/* Day Headers */}
                    <div className="datepicker-days-header">
                        {DAYS.map((day, i) => (
                            <div key={i} className="datepicker-day-name">{day}</div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="datepicker-days">
                        {renderCalendar()}
                    </div>

                    <div className="datepicker-divider"></div>

                    {/* Footer */}
                    <div className="datepicker-footer">
                        <button
                            type="button"
                            className="datepicker-reset-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onChange) onChange({ target: { name, value: '' } });
                                setIsOpen(false);
                            }}
                        >
                            รีเซ็ต
                        </button>
                        <button
                            type="button"
                            className="datepicker-apply-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                        >
                            ตกลง
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
