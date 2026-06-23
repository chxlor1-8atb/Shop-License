import { useRef, useEffect, useCallback } from 'react';

// Transition used for snap-back / maximize animations (restored after drag ends)
const SLIDE_TRANSITION = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), background 0.3s ease';

export function useLoginSlider(unlocked, loading, onUnlock) {
    const sliderBtnRef = useRef(null);
    const slideContainerRef = useRef(null);
    const startXRef = useRef(0);
    const slideProgressRef = useRef(0);
    const isDraggingRef = useRef(false);
    const rafRef = useRef(null);

    // Stable callback wrapper (avoid stale closure + re-binding listeners)
    const onUnlockRef = useRef(onUnlock);
    useEffect(() => {
        onUnlockRef.current = onUnlock;
    }, [onUnlock]);

    // Direct DOM update for smooth 60fps tracking (no React re-render).
    // Reads layout once per frame; called via rAF so it never thrashes mid-drag.
    const updateDOM = useCallback((progress) => {
        const btn = sliderBtnRef.current;
        const container = slideContainerRef.current;
        const bg = container?.querySelector('.slide-bg');

        if (btn) {
            // --slide-x is consumed by .slider-btn { transform: translateX(var(--slide-x)) }
            const slideX = progress > 4 ? progress - 4 : 0;
            btn.style.setProperty('--slide-x', `${slideX}px`);
        }
        if (bg) {
            // Animate width directly (not scaleX) so the pill border-radius
            // stays perfectly round instead of being stretched into an ellipse.
            // Fill extends to the button's right edge: button left (progress) + 4px offset + 44px width = progress + 48.
            bg.style.width = progress > 0 ? `${progress + 48}px` : '0px';
        }
    }, []);

    const handleStartDrag = useCallback((e) => {
        if (unlocked || loading) return;

        isDraggingRef.current = true;
        startXRef.current = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;

        // Disable transition immediately so the first pointer move tracks 1:1
        const btn = sliderBtnRef.current;
        if (btn) btn.style.transition = 'none';
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

            // Batch the DOM write into a single rAF (coalesce rapid pointer events)
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                updateDOM(newLeft);
            });
        }
    }, [updateDOM]);

    const handleEndDrag = useCallback(async () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;

        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        const btn = sliderBtnRef.current;
        if (btn) {
            // Restore transition so snap-back / slide-to-end animates smoothly
            btn.style.transition = SLIDE_TRANSITION;
        }

        if (slideContainerRef.current && sliderBtnRef.current) {
            const containerWidth = slideContainerRef.current.offsetWidth;
            const btnWidth = sliderBtnRef.current.offsetWidth;
            const maxMove = containerWidth - btnWidth - 6;

            if (slideProgressRef.current > maxMove * 0.8) {
                slideProgressRef.current = maxMove;
                updateDOM(maxMove);
                if (onUnlockRef.current) {
                    await onUnlockRef.current();
                }
            } else {
                slideProgressRef.current = 0;
                updateDOM(0);
            }
        }
    }, [updateDOM]);

    // Global listeners - stable refs, bound once
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

    // Programmatic slide-to-end (e.g. Enter key submit)
    const maximizeSlider = useCallback(() => {
        if (slideContainerRef.current && sliderBtnRef.current) {
            const maxMove = slideContainerRef.current.offsetWidth - sliderBtnRef.current.offsetWidth - 6;
            slideProgressRef.current = maxMove;
            const btn = sliderBtnRef.current;
            if (btn) btn.style.transition = SLIDE_TRANSITION;
            updateDOM(maxMove);
        }
    }, [updateDOM]);

    // Reset back to start (e.g. on auth error)
    const resetSlider = useCallback(() => {
        slideProgressRef.current = 0;
        const btn = sliderBtnRef.current;
        if (btn) btn.style.transition = SLIDE_TRANSITION;
        updateDOM(0);
    }, [updateDOM]);

    return {
        sliderBtnRef,
        slideContainerRef,
        handleStartDrag,
        maximizeSlider,
        resetSlider,
    };
}
