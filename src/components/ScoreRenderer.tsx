import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as osmdPkg from 'opensheetmusicdisplay';
import type { OpenSheetMusicDisplay as OSMDType } from 'opensheetmusicdisplay';
import { playMidi } from '../utils/audio';

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

/** Una nota pulsable: dónde está en el papel y qué suena al tocarla. */
interface NotaPulsable {
  ux: number;      // posición en unidades de OSMD, no en píxeles
  uy: number;
  midis: number[]; // un acorde suena entero
}

/**
 * Recorre el modelo gráfico de OSMD y anota dónde quedó dibujada cada nota.
 *
 * OSMD dibuja en SVG sin dejar las alturas en el DOM, así que no hay forma de
 * saber qué nota hay bajo el cursor mirando el elemento pulsado. El modelo
 * gráfico sí guarda, para cada cabeza, su posición y la nota de origen: con eso
 * se construye un índice y se busca la más cercana al clic.
 *
 * Las posiciones van en unidades de OSMD —10 por espacio de pentagrama— y no en
 * píxeles, para que sigan valiendo al cambiar el zoom.
 */
function indexarNotas(osmd: OSMDType): NotaPulsable[] {
  const fuera: NotaPulsable[] = [];
  const hoja = (osmd as any).GraphicSheet;
  for (const fila of hoja?.MeasureList ?? []) {
    for (const compas of fila ?? []) {
      for (const entrada of compas?.staffEntries ?? []) {
        for (const voz of entrada?.graphicalVoiceEntries ?? []) {
          const midis: number[] = [];
          let x = 0, y = 0, n = 0;
          for (const gn of voz?.notes ?? []) {
            const ht = gn?.sourceNote?.Pitch?.halfTone;
            if (typeof ht !== 'number') continue;   // silencio o nota sin altura
            midis.push(ht + 12);                    // OSMD cuenta desde Do-1
            const p = gn.PositionAndShape?.AbsolutePosition;
            if (p) { x += p.x; y += p.y; n++; }
          }
          if (midis.length && n) fuera.push({ ux: x / n, uy: y / n, midis });
        }
      }
    }
  }
  return fuera;
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
  const notasRef = useRef<NotaPulsable[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Toca la nota más cercana al clic, en cualquiera de los dos pentagramas.
   *
   * StaffSVG permitía pulsar una nota para oírla; al pasar al grabado de OSMD
   * esa función se quedó por el camino, y con dos pentagramas se nota
   * especialmente: la mano izquierda parecía muda.
   */
  const alPulsar = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const osmd = osmdRef.current;
    const host = hostRef.current;
    if (!osmd || !host || !notasRef.current.length) return;

    const svg = host.querySelector('svg');
    if (!svg) return;
    const r = svg.getBoundingClientRect();

    // 10 unidades de OSMD por espacio de pentagrama, escaladas por el zoom
    const escala = 10 * ((osmd as any).zoom ?? 1);
    const ux = (e.clientX - r.left) / escala;
    const uy = (e.clientY - r.top) / escala;

    let mejor: NotaPulsable | null = null;
    let mejorD = Infinity;
    for (const n of notasRef.current) {
      // El eje vertical pesa más: en un pentagrama las notas se apilan cerca
      // en altura, y una fallo de línea es peor que uno de tiempo.
      const d = (n.ux - ux) ** 2 + ((n.uy - uy) * 1.6) ** 2;
      if (d < mejorD) { mejorD = d; mejor = n; }
    }
    // Radio de tolerancia en unidades: más allá, el clic fue al papel
    if (mejor && mejorD < 36) {
      for (const m of mejor.midis) playMidi(m, 0.7, 82);
    }
  }, []);

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
        notasRef.current = indexarNotas(osmd);
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
      // El zoom mueve todo: hay que rehacer el índice de posiciones
      notasRef.current = indexarNotas(osmd);
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
      <div
        ref={hostRef}
        onClick={alPulsar}
        className="w-full overflow-x-auto cursor-pointer"
        title="Pulsa una nota para oírla"
      />
    </div>
  );
};
