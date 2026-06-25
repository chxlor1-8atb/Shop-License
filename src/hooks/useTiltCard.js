/**
 * useTiltCard - 3D Tilt + Spotlight ตามเมาส์
 * ทำให้การ์ดเอียงตามเมาส์แบบ 3D พร้อมแสง spotlight วิ่งตาม cursor
 * Optimized: ใช้ rAF + pointer events เพื่อ performance
 */
'use client';

import { useRef, useCallback, useEffect } from 'react';

export function useTiltCard({ max = 8, scale = 1.0, glare = true } = {}) {
    const ref = useRef(null);

    const handleMove = useCallback(
        (e) => {
            const el = ref.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left; // ตำแหน่ง X ในการ์ด
            const y = e.clientY - rect.top; // ตำแหน่ง Y ในการ์ด
            const cx = rect.width / 2;
            const cy = rect.height / 2;

            // คำนวณมุมเอียง (-max ถึง +max องศา)
            const rotateX = ((y - cy) / cy) * -max;
            const rotateY = ((x - cx) / cx) * max;

            // ใช้ CSS custom properties เพื่อ update แบบไม่ trigger re-render
            el.style.setProperty('--tilt-rx', `${rotateX}deg`);
            el.style.setProperty('--tilt-ry', `${rotateY}deg`);
            el.style.setProperty('--tilt-scale', scale);
            el.style.setProperty('--tilt-active', '1');

            if (glare) {
                // ตำแหน่ง spotlight เป็น %
                const px = (x / rect.width) * 100;
                const py = (y / rect.height) * 100;
                el.style.setProperty('--glare-x', `${px}%`);
                el.style.setProperty('--glare-y', `${py}%`);
            }
        },
        [max, scale, glare]
    );

    const handleLeave = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty('--tilt-active', '0');
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Skip บน touch device (ไม่มีประโยชน์ + เปลือง)
        const isTouch =
            window.matchMedia('(pointer: coarse)').matches ||
            'ontouchstart' in window;

        if (isTouch) return;

        // Throttle ด้วย requestAnimationFrame
        let frame = null;
        const onMove = (e) => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                handleMove(e);
                frame = null;
            });
        };

        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', handleLeave);

        return () => {
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerleave', handleLeave);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [handleMove, handleLeave]);

    return ref;
}
