import { useState, useRef, useEffect, useCallback } from 'react';

export function useLoginSlider(unlocked, loading, onUnlock) {
    const [slideProgress, setSlideProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const sliderBtnRef = useRef(null);
    const slideContainerRef = useRef(null);
    const startXRef = useRef(0);
    const slideProgressRef = useRef(0);

    // Stable callback wrapper
    const onUnlockRef = useRef(onUnlock);
    useEffect(() => {
        onUnlockRef.current = onUnlock;
    }, [onUnlock]);

    const handleStartDrag = useCallback((e) => {
        if (unlocked || loading) return;

        setIsDragging(true);
        // Supports both mouse and touch events
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        startXRef.current = clientX;
    }, [unlocked, loading]);

    const handleDrag = useCallback((e) => {
        if (!isDragging) return;

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const moveX = clientX - startXRef.current;

        if (slideContainerRef.current && sliderBtnRef.current) {
            const containerWidth = slideContainerRef.current.offsetWidth;
            const btnWidth = sliderBtnRef.current.offsetWidth;
            const maxMove = containerWidth - btnWidth - 6; // 6px padding adjustment

            // Constrain movement
            // Add 4px (initial left) to moveX so it starts moving immediately
            let newLeft = Math.max(4, Math.min(4 + moveX, maxMove));
            slideProgressRef.current = newLeft;
            setSlideProgress(newLeft);
        }
    }, [isDragging]);

    const handleEndDrag = useCallback(async () => {
        if (!isDragging) return;
        setIsDragging(false);

        if (slideContainerRef.current && sliderBtnRef.current) {
            const containerWidth = slideContainerRef.current.offsetWidth;
            const btnWidth = sliderBtnRef.current.offsetWidth;
            const maxMove = containerWidth - btnWidth - 6;

            // Threshold: 80% to unlock
            if (slideProgressRef.current > maxMove * 0.8) {
                if (onUnlockRef.current) {
                    await onUnlockRef.current();
                }
            } else {
                setSlideProgress(0); // Snap back if not reached
            }
        }
    }, [isDragging]);

    // Global event listeners for drag interactions
    useEffect(() => {
        if (isDragging) {
            const events = [
                ['mousemove', handleDrag],
                ['mouseup', handleEndDrag],
                ['touchmove', handleDrag],
                ['touchend', handleEndDrag]
            ];

            events.forEach(([event, handler]) => document.addEventListener(event, handler));
            return () => events.forEach(([event, handler]) => document.removeEventListener(event, handler));
        }
    }, [isDragging, handleDrag, handleEndDrag]);

    const maximizeSlider = useCallback(() => {
        if (slideContainerRef.current && sliderBtnRef.current) {
            const maxMove = slideContainerRef.current.offsetWidth - sliderBtnRef.current.offsetWidth - 6;
            setSlideProgress(maxMove);
        }
    }, []);

    const resetSlider = useCallback(() => {
        slideProgressRef.current = 0;
        setSlideProgress(0);
    }, []);

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
