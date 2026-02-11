import { useState, useRef, useEffect, useCallback } from 'react';

export function useLoginSlider(unlocked, loading, onUnlock) {
    const [slideProgress, setSlideProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const sliderBtnRef = useRef(null);
    const slideContainerRef = useRef(null);
    const startXRef = useRef(0);
    const slideProgressRef = useRef(0);
    const isDraggingRef = useRef(false);
    const rafRef = useRef(null);

    // Stable callback wrapper
    const onUnlockRef = useRef(onUnlock);
    useEffect(() => {
        onUnlockRef.current = onUnlock;
    }, [onUnlock]);

    // Direct DOM update for smooth 60fps tracking (no React re-render)
    const updateDOM = useCallback((progress) => {
        const btn = sliderBtnRef.current;
        const bg = slideContainerRef.current?.querySelector('.slide-bg');
        if (btn) {
            const slideX = progress > 4 ? progress - 4 : 0;
            btn.style.setProperty('--slide-x', `${slideX}px`);
            btn.style.transition = 'none';
        }
        if (bg) {
            bg.style.width = progress > 0 ? `${progress + 48}px` : '0px';
        }
    }, []);

    const handleStartDrag = useCallback((e) => {
        if (unlocked || loading) return;

        isDraggingRef.current = true;
        setIsDragging(true);
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        startXRef.current = clientX;
    }, [unlocked, loading]);

    const handleDrag = useCallback((e) => {
        if (!isDraggingRef.current) return;

        if (e.cancelable) e.preventDefault();

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const moveX = clientX - startXRef.current;

        if (slideContainerRef.current && sliderBtnRef.current) {
            const containerWidth = slideContainerRef.current.offsetWidth;
            const btnWidth = sliderBtnRef.current.offsetWidth;
            const maxMove = containerWidth - btnWidth - 6;

            const newLeft = Math.max(4, Math.min(4 + moveX, maxMove));
            slideProgressRef.current = newLeft;

            // Use rAF for smooth DOM updates instead of setState
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                updateDOM(newLeft);
            });
        }
    }, [updateDOM]);

    const handleEndDrag = useCallback(async () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsDragging(false);

        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        // Restore transition for snap-back animation
        const btn = sliderBtnRef.current;
        if (btn) {
            btn.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), background 0.3s ease';
        }

        if (slideContainerRef.current && sliderBtnRef.current) {
            const containerWidth = slideContainerRef.current.offsetWidth;
            const btnWidth = sliderBtnRef.current.offsetWidth;
            const maxMove = containerWidth - btnWidth - 6;

            if (slideProgressRef.current > maxMove * 0.8) {
                slideProgressRef.current = maxMove;
                setSlideProgress(maxMove);
                if (onUnlockRef.current) {
                    await onUnlockRef.current();
                }
            } else {
                slideProgressRef.current = 0;
                setSlideProgress(0);
                // Animate snap-back via DOM
                updateDOM(0);
            }
        }
    }, [updateDOM]);

    // Global event listeners - stable refs, no stale closures
    useEffect(() => {
        const onMove = (e) => handleDrag(e);
        const onEnd = () => handleEndDrag();

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
        document.addEventListener('touchcancel', onEnd);

        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            document.removeEventListener('touchcancel', onEnd);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [handleDrag, handleEndDrag]);

    const maximizeSlider = useCallback(() => {
        if (slideContainerRef.current && sliderBtnRef.current) {
            const maxMove = slideContainerRef.current.offsetWidth - sliderBtnRef.current.offsetWidth - 6;
            slideProgressRef.current = maxMove;
            setSlideProgress(maxMove);
        }
    }, []);

    const resetSlider = useCallback(() => {
        slideProgressRef.current = 0;
        setSlideProgress(0);
        updateDOM(0);
        // Restore transition
        const btn = sliderBtnRef.current;
        if (btn) {
            btn.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), background 0.3s ease';
        }
    }, [updateDOM]);

    return {
        slideProgress,
        isDragging,
        sliderBtnRef,
        slideContainerRef,
        handleStartDrag,
        maximizeSlider,
        resetSlider
    };
}
