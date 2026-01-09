'use client';

import { useState, useEffect, useRef } from 'react';
import DatePicker from './DatePicker';
import CustomSelect from './CustomSelect';

/**
 * EditableCell - Inline editable table cell component
 * Supports: text, number, select, and date input types
 * Features real-time animations and visual feedback
 */
export default function EditableCell({
    value,
    onSave,
    type = 'text', // 'text' | 'number' | 'select' | 'date'
    options = [], // For select type: [{ value: '', label: '' }]
    placeholder = '',
    disabled = false,
    displayValue = null, // Custom display value (e.g., for showing label instead of id)
    className = '',
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const inputRef = useRef(null);
    const cellRef = useRef(null);

    useEffect(() => {
        setEditValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (type === 'text' || type === 'number') {
                inputRef.current.select();
            }
        }
    }, [isEditing, type]);

    // Clear success/error animation after it plays
    useEffect(() => {
        if (saveSuccess) {
            const timer = setTimeout(() => setSaveSuccess(false), 600);
            return () => clearTimeout(timer);
        }
    }, [saveSuccess]);

    useEffect(() => {
        if (saveError) {
            const timer = setTimeout(() => setSaveError(false), 500);
            return () => clearTimeout(timer);
        }
    }, [saveError]);

    const handleClick = () => {
        if (!disabled && !isEditing) {
            setIsEditing(true);
            setEditValue(value);
        }
    };

    const handleSave = async () => {
        if (editValue === value) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            await onSave(editValue);
            setIsEditing(false);
            setSaveSuccess(true);
        } catch (error) {
            console.error('Save failed:', error);
            setEditValue(value); // Revert on error
            setSaveError(true);
        } finally {
            setIsSaving(false);
        }
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

    const handleBlur = (e) => {
        // Don't save on blur if clicking save/cancel buttons
        if (e.relatedTarget?.closest('.editable-cell-actions')) {
            return;
        }
        handleSave();
    };

    const renderInput = () => {
        switch (type) {
            case 'select':
                return (
                    <CustomSelect
                        value={editValue}
                        options={options}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setEditValue(newValue);
                            // Auto save when selecting from dropdown
                            if (newValue !== value) {
                                setIsSaving(true);
                                onSave(newValue)
                                    .then(() => {
                                        setIsEditing(false);
                                        setSaveSuccess(true);
                                    })
                                    .catch((error) => {
                                        console.error('Save failed:', error);
                                        setEditValue(value);
                                        setSaveError(true);
                                    })
                                    .finally(() => {
                                        setIsSaving(false);
                                    });
                            } else {
                                setIsEditing(false);
                            }
                        }}
                        disabled={isSaving}
                        className="editable-cell-custom-select"
                    />
                );
            case 'date':
                return (
                    <DatePicker
                        autoFocus
                        value={editValue || ''}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleBlur}
                        className="editable-cell-date-picker"
                    />
                );
            case 'number':
                return (
                    <input
                        ref={inputRef}
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        disabled={isSaving}
                        placeholder={placeholder}
                        className="editable-cell-input"
                    />
                );
            default:
                return (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        disabled={isSaving}
                        placeholder={placeholder}
                        className="editable-cell-input"
                    />
                );
        }
    };

    const display = displayValue !== null ? displayValue : (value || '-');

    if (disabled) {
        return <span className={`editable-cell disabled ${className}`}>{display}</span>;
    }

    const cellClasses = [
        'editable-cell',
        isEditing ? 'editing' : '',
        isSaving ? 'saving' : '',
        saveSuccess ? 'save-success' : '',
        saveError ? 'error-shake' : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <div ref={cellRef} className={cellClasses}>
            {isEditing ? (
                <div className="editable-cell-editor">
                    {renderInput()}
                    {isSaving && <span className="editable-cell-spinner"></span>}
                </div>
            ) : (
                <div className="editable-cell-display" onClick={handleClick}>
                    <span className="editable-cell-value">{display}</span>
                    <i className="fas fa-pen editable-cell-icon"></i>
                </div>
            )}
        </div>
    );
}
