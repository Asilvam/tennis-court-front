import { useEffect, useState } from 'react';

export interface VisibleViewport {
    width: number;
    height: number;
    top: number;
    left: number;
}

function readViewport(): VisibleViewport {
    const viewport = window.visualViewport;
    return {
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
        top: viewport?.offsetTop ?? 0,
        left: viewport?.offsetLeft ?? 0,
    };
}

export function useVisibleViewport(enabled = true) {
    const [viewport, setViewport] = useState(readViewport);

    useEffect(() => {
        if (!enabled) return;
        const visualViewport = window.visualViewport;
        let frame = 0;
        const measure = () => {
            const next = readViewport();
            setViewport(previous =>
                previous.width === next.width && previous.height === next.height &&
                previous.top === next.top && previous.left === next.left ? previous : next,
            );
        };
        const scheduleMeasure = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        };
        measure();
        visualViewport?.addEventListener('resize', scheduleMeasure);
        visualViewport?.addEventListener('scroll', scheduleMeasure);
        window.addEventListener('resize', scheduleMeasure);
        return () => {
            cancelAnimationFrame(frame);
            visualViewport?.removeEventListener('resize', scheduleMeasure);
            visualViewport?.removeEventListener('scroll', scheduleMeasure);
            window.removeEventListener('resize', scheduleMeasure);
        };
    }, [enabled]);

    return viewport;
}
