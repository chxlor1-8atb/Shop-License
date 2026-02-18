'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Performance monitoring hook for tracking slow operations
 * Usage: const { trackStart, trackEnd, metrics } = usePerformanceMonitor('component-name');
 */
export function usePerformanceMonitor(componentName) {
    const [metrics, setMetrics] = useState({
        averageTime: 0,
        slowOperations: 0,
        totalOperations: 0,
        maxTime: 0
    });
    
    const operationsRef = useRef([]);
    const slowThreshold = 1000; // 1 second

    const trackStart = (operationName) => {
        const startTime = performance.now();
        return {
            operationName,
            startTime,
            end: () => trackEnd(operationName, startTime)
        };
    };

    const trackEnd = (operationName, startTime) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        operationsRef.current.push({
            operationName,
            duration,
            timestamp: Date.now()
        });

        // Keep only last 100 operations
        if (operationsRef.current.length > 100) {
            operationsRef.current = operationsRef.current.slice(-100);
        }

        // Update metrics
        const ops = operationsRef.current;
        const totalOps = ops.length;
        const avgTime = ops.reduce((sum, op) => sum + op.duration, 0) / totalOps;
        const maxTime = Math.max(...ops.map(op => op.duration));
        const slowOps = ops.filter(op => op.duration > slowThreshold).length;

        setMetrics({
            averageTime: Math.round(avgTime),
            slowOperations: slowOps,
            totalOperations: totalOps,
            maxTime: Math.round(maxTime)
        });

        // Log slow operations
        if (duration > slowThreshold) {
            console.warn(`🐌 Slow operation in ${componentName}: ${operationName} took ${Math.round(duration)}ms`);
        }

        return duration;
    };

    const clearMetrics = () => {
        operationsRef.current = [];
        setMetrics({
            averageTime: 0,
            slowOperations: 0,
            totalOperations: 0,
            maxTime: 0
        });
    };

    return {
        trackStart,
        trackEnd,
        metrics,
        clearMetrics
    };
}

/**
 * Simple performance tracker for async operations
 */
export function trackAsyncPerformance(operationName, asyncFn) {
    return async (...args) => {
        const startTime = performance.now();
        try {
            const result = await asyncFn(...args);
            const duration = performance.now() - startTime;
            
            if (duration > 1000) {
                console.warn(`🐌 Slow async operation: ${operationName} took ${Math.round(duration)}ms`);
            } else if (duration > 500) {
                console.log(`⚠️ Moderate async operation: ${operationName} took ${Math.round(duration)}ms`);
            }
            
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            console.error(`❌ Failed async operation: ${operationName} took ${Math.round(duration)}ms`, error);
            throw error;
        }
    };
}
