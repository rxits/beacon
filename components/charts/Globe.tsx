'use client';
import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

export type Marker = { location: [number, number]; size: number };

export function Globe({ markers, size = 460 }: { markers: Marker[]; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phi = useRef(0);
  const drag = useRef<number | null>(null);
  const offset = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = canvas.offsetWidth;
    const onResize = () => { width = canvas.offsetWidth; };
    window.addEventListener('resize', onResize);
    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.28,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.32, 0.34, 0.47] as [number, number, number],
      markerColor: [0.38, 0.82, 1] as [number, number, number],
      glowColor: [0.36, 0.46, 0.86] as [number, number, number],
      markers,
      onRender: (state: Record<string, number>) => {
        if (drag.current === null) phi.current += 0.004;
        state.phi = phi.current + offset.current;
        state.width = width * 2;
        state.height = width * 2;
      },
    } as Parameters<typeof createGlobe>[1]);
    return () => { globe.destroy(); window.removeEventListener('resize', onResize); };
  }, [markers]);

  return (
    <div style={{ width: '100%', maxWidth: size, aspectRatio: '1', margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: 'grab', contain: 'layout paint size' }}
        onPointerDown={(e) => { drag.current = e.clientX - offset.current * 100; e.currentTarget.style.cursor = 'grabbing'; }}
        onPointerUp={(e) => { drag.current = null; e.currentTarget.style.cursor = 'grab'; }}
        onPointerOut={(e) => { drag.current = null; e.currentTarget.style.cursor = 'grab'; }}
        onPointerMove={(e) => { if (drag.current !== null) offset.current = (e.clientX - drag.current) / 100; }}
      />
    </div>
  );
}
