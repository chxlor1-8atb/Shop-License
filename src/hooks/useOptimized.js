/**
 * Custom React Hooks สำหรับ Performance Optimization
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * useDebounce - Debounce a value
 * ป้องกันการ update บ่อยเกินไป (เช่น search input)
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * useDebouncedCallback - Debounce a function
 */
export function useDebouncedCallback(callback, delay = 300) {
    const timeoutRef = useRef(null);

    const debouncedCallback = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
}

/**
 * useThrottle - Throttle a value
 * จำกัดความถี่ของการ update
 */
export function useThrottle(value, limit = 300) {
    const [throttledValue, setThrottledValue] = useState(value);
    const lastRan = useRef(Date.now());

    useEffect(() => {
        const handler = setTimeout(() => {
            if (Date.now() - lastRan.current >= limit) {
                setThrottledValue(value);
                lastRan.current = Date.now();
            }
        }, limit - (Date.now() - lastRan.current));

        return () => clearTimeout(handler);
    }, [value, limit]);

    return throttledValue;
}

/**
 * useIntersectionObserver - Lazy load content when visible
 * ใช้สำหรับ infinite scroll หรือ lazy loading
 */
export function useIntersectionObserver(options = {}) {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [hasIntersected, setHasIntersected] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
            if (entry.isIntersecting) {
                setHasIntersected(true);
            }
        }, {
            threshold: 0.1,
            ...options,
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, [options]);

    return { ref, isIntersecting, hasIntersected };
}

/**
 * useLocalStorage - Persist state to localStorage
 * พร้อม SSR safe
 */
export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        if (typeof window === 'undefined') return initialValue;
        
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error('useLocalStorage error:', error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue];
}

/**
 * usePrevious - Track previous value
 * มีประโยชน์สำหรับ comparison
 */
export function usePrevious(value) {
    const ref = useRef();
    
    useEffect(() => {
        ref.current = value;
    }, [value]);
    
    return ref.current;
}

/**
 * useOnScreen - Check if element is on screen
 */
export function useOnScreen(ref, rootMargin = '0px') {
    const [isOnScreen, setIsOnScreen] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => setIsOnScreen(entry.isIntersecting),
            { rootMargin }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [ref, rootMargin]);

    return isOnScreen;
}

/**
 * useMediaQuery - Responsive design helper
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const media = window.matchMedia(query);
        
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        
        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        
        return () => media.removeEventListener('change', listener);
    }, [matches, query]);

    return matches;
}

/**
 * useIsMobile - Check if mobile device
 */
export function useIsMobile() {
    return useMediaQuery('(max-width: 768px)');
}

/**
 * useIsDesktop - Check if desktop device
 */
export function useIsDesktop() {
    return useMediaQuery('(min-width: 1024px)');
}

/**
 * useClickOutside - Detect clicks outside element
 * ใช้สำหรับ close dropdown, modal, etc.
 */
export function useClickOutside(ref, handler) {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handler(event);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}

/**
 * useKeyPress - Detect key press
 */
export function useKeyPress(targetKey) {
    const [keyPressed, setKeyPressed] = useState(false);

    useEffect(() => {
        const downHandler = ({ key }) => {
            if (key === targetKey) setKeyPressed(true);
        };

        const upHandler = ({ key }) => {
            if (key === targetKey) setKeyPressed(false);
        };

        window.addEventListener('keydown', downHandler);
        window.addEventListener('keyup', upHandler);

        return () => {
            window.removeEventListener('keydown', downHandler);
            window.removeEventListener('keyup', upHandler);
        };
    }, [targetKey]);

    return keyPressed;
}

/**
 * useAsync - Handle async operations
 */
export function useAsync(asyncFunction, immediate = true) {
    const [status, setStatus] = useState('idle');
    const [value, setValue] = useState(null);
    const [error, setError] = useState(null);

    const execute = useCallback(async () => {
        setStatus('pending');
        setValue(null);
        setError(null);

        try {
            const response = await asyncFunction();
            setValue(response);
            setStatus('success');
            return response;
        } catch (err) {
            setError(err);
            setStatus('error');
            throw err;
        }
    }, [asyncFunction]);

    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    return { execute, status, value, error, isLoading: status === 'pending' };
}

/**
 * useMemoCompare - Custom comparison for useMemo
 */
export function useMemoCompare(next, compare) {
    const previousRef = useRef();
    const previous = previousRef.current;

    const isEqual = compare(previous, next);

    useEffect(() => {
        if (!isEqual) {
            previousRef.current = next;
        }
    });

    return isEqual ? previous : next;
}
