'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * EditableHeader Component
 * Allows inline editing of table column headers
 * 
 * @param {string} value - Current header text
 * @param {string} fieldKey - Unique key for the field
 * @param {function} onSave - Callback when value is saved (fieldKey, newValue)
 * @param {string} className - Additional CSS classes for the th element
 */
export default function EditableHeader({ 
    value, 
    fieldKey, 
    onSave, 
    className = '' 
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef(null);

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Update edit value when prop changes
    useEffect(() => {
        setEditValue(value);
    }, [value]);

    const handleClick = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        const trimmedValue = editValue.trim();
        if (trimmedValue && trimmedValue !== value) {
            onSave(fieldKey, trimmedValue);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(value);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const handleBlur = () => {
        handleSave();
    };

    return (
        <th className={`editable-header ${isEditing ? 'editing' : ''} ${className}`}>
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="editable-header-input"
                />
            ) : (
                <span 
                    className="editable-header-display"
                    onClick={handleClick}
                    title="คลิกเพื่อแก้ไข"
                >
                    <span className="editable-header-value">{value}</span>
                    <i className="fas fa-pencil-alt editable-header-icon"></i>
                </span>
            )}
        </th>
    );
}
