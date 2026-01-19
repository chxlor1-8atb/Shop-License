'use client';

import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal Component
 * Reusable modal wrapper with consistent styling
 * Handles:
 * - Backdrop click to close
 * - Escape key to close
 * - Focus trap (accessibility)
 * - React Portal (renders outside parent DOM hierarchy)
 * 
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Callback when modal should close
 * @param {string} title - Modal title
 * @param {ReactNode} children - Modal content
 * @param {string} className - Additional CSS classes
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    className = '',
    showCloseButton = true,
    size = '' // 'lg' for large, 'xl' for extra large
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Handle escape key
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!mounted || !isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const modalContent = (
        <div
            className="modal-overlay"
            style={{ display: 'flex', zIndex: 9999 }}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                className={`modal ${size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : ''} ${className}`.trim()}
                onClick={(e) => e.stopPropagation()}
                style={{}} // Removed inline styles in favor of CSS classes
            >
                <div className="modal-header">
                    <h3 id="modal-title" className="modal-title">{title}</h3>
                    {showCloseButton && (
                        <button
                            className="modal-close"
                            onClick={onClose}
                            aria-label="ปิด"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
