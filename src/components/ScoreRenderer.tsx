import React, { useEffect, useRef, useState } from 'react';
import * as osmdPkg from 'opensheetmusicdisplay';
import type { OpenSheetMusicDisplay as OSMDType } from 'opensheetmusicdisplay';

// OSMD se publica como CommonJS y, según cómo lo empaquete el bundler, sus
// clases quedan colgando de `default` en vez de exportarse por nombre. Los
// tipos declaran exports con nombre, así que TypeScript acepta el import
// directo y luego el constructor llega `undefined` en tiempo de ejecución.
// Verificado en este proyecto: Vite las deja bajo `default`.
type OSMDCtor = new (host: HTMLElement, opts?: Record<string, unknown>) => OSMDType;
const OpenSheetMusicDisplay: OSMDCtor =
  (osmdPkg as Record<string, any>).OpenSheetMusicDisplay ??
  (osmdPkg as Record<string, any>).default?.OpenSheetMusicDisplay;

interface ScoreRendererProps {
  musicXml: string;
  theme?: 'dark' | 'paper';
  zoom?: number;
  /** Índice global de la nota que suena, para seguir la reproducción. */
  activeNoteIdx?: number;
  onReady?: (measures: number) => void;
}

/**
 * Graba la partitura con OpenSheetMusicDisplay a partir del MusicXML.
 *
 * StaffSVG dibuja elipses y plicas a mano, y eso topa enseguida: barrados,
 * ligaduras, silencios con su figura, acordes, voces simultáneas y alteraciones
 * accidentales son meses de trabajo cada uno. OSMD es un grabador completo y el
 * MusicXML ya se genera en las dos rutas de importación, así que el trabajo está
 * en conectarlos, no en reimplementar la notación.
 */
export const ScoreRenderer: React.FC<ScoreRendererProps> = ({
  musicXml,
  theme = 'dark',
  zoom = 100,
  activeNoteIdx = -1,
  onReady,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OSMDType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';

  // Carga y grabado. Se rehace al cambiar el XML o el tema porque OSMD fija los
  // colores al construir el objeto, no al redibujar.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !musicXml) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const osmd = new OpenSheetMusicDisplay(host, {
      autoResize: true,
      drawTitle: false,
      drawSubtitle: false,
      drawComposer: false,
      drawLyricist: false,
      backend: 'svg',
      // OSMD graba en negro sobre blanco; en modo oscuro hay que teñir cada
      // familia de elementos o la partitura queda invisible sobre el fondo.
      defaultColorMusic: isDark ? '#E8E4DC' : '#1A1D23',
      defaultColorStem:  isDark ? '#E8E4DC' : '#1A1D23',
      defaultColorLabel: isDark ? '#A7ADB9' : '#4A4F5A',
      defaultColorTitle: isDark ? '#E8E4DC' : '#1A1D23',
    });
    osmdRef.current = osmd;

    osmd
      .load(musicXml)
      .then(() => {
        if (cancelled) return;
        osmd.zoom = zoom / 100;
        osmd.render();
        setLoading(false);
        onReady?.(osmd.Sheet?.SourceMeasures?.length ?? 0);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setError(e instanceof Error ? e.message : 'No se pudo grabar la partitura.');
      });

    return () => {
      cancelled = true;
      try {
        osmd.clear();
      } catch {
        /* OSMD lanza si se limpia antes de terminar de cargar */
      }
      osmdRef.current = null;
    };
  }, [musicXml, isDark]);

  // El zoom no necesita recargar el documento, solo volver a grabar
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || loading) return;
    try {
      osmd.zoom = zoom / 100;
      osmd.render();
    } catch {
      /* redibujado durante una descarga en curso */
    }
  }, [zoom, loading]);

  // Cursor de reproducción: OSMD lo mueve nota a nota desde el principio
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || loading) return;
    try {
      const cursor = osmd.cursor;
      if (!cursor) return;
      if (activeNoteIdx < 0) {
        cursor.hide();
        return;
      }
      cursor.show();
      cursor.reset();
      for (let i = 0; i < activeNoteIdx && !cursor.iterator.EndReached; i++) {
        cursor.next();
      }
    } catch {
      /* el cursor no está disponible en todos los estados de carga */
    }
  }, [activeNoteIdx, loading]);

  if (error) {
    return (
      <div className="w-full rounded border border-red-500/25 bg-red-500/5 px-4 py-3">
        <p className="text-xs font-semibold text-red-400">No se pudo grabar la partitura</p>
        <p className="mt-1 text-[11px] text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center gap-2 px-1 py-3 text-xs text-slate-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#C8A84B] border-t-transparent" />
          Grabando partitura...
        </div>
      )}
      <div ref={hostRef} className="w-full overflow-x-auto" />
    </div>
  );
};
