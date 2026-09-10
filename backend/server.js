require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const { spawnSync } = require('child_process');
const AdmZip  = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const sharp   = require('sharp');

const app = express();
app.use(cors());

// os.tmpdir() on Windows returns 8.3 short paths (PROFES~1) which Java cannot resolve.
// Use a local tmp folder with a known long path instead.
const LOCAL_TMP = path.join(__dirname, 'tmp');
if (!fs.existsSync(LOCAL_TMP)) fs.mkdirSync(LOCAL_TMP);
const upload = multer({ dest: LOCAL_TMP });

const PORT = process.env.PORT || 3001;

// Posibles rutas de Audiveris (en orden de preferencia)
const AUDIVERIS_CANDIDATES = [
  process.env.AUDIVERIS_EXE,
  path.join(__dirname, 'audiveris', 'Audiveris', 'Audiveris.exe'),
  path.join(__dirname, 'audiveris', 'bin', 'Audiveris.bat'),
  path.join(__dirname, 'Audiveris.jar'),
].filter(Boolean);

function findAudiveris() {
  return AUDIVERIS_CANDIDATES.find(p => fs.existsSync(p)) || null;
}

function getAudiverisArgs(tmpDir, imgPath) {
  // Lower grid detection thresholds so watermarked/screen-res images work
  return [
    '-batch', '-export',
    '-option', 'GRID.minStaffLines=3',
    '-option', 'SCALE.minInterline=8',
    '-output', tmpDir,
    imgPath,
  ];
}

function getAudiverisCmd(tmpDir, imgPath) {
  const bin = findAudiveris();
  if (!bin) return null;
  const args = getAudiverisArgs(tmpDir, imgPath).map(a => `"${a}"`).join(' ');
  if (bin.endsWith('.exe') || bin.endsWith('.bat')) {
    return `"${bin}" ${args}`;
  }
  const java = process.env.JAVA_BIN || 'java';
  return `"${java}" -jar "${bin}" ${args}`;
}

/**
 * Mide el interlineado del pentagrama, en píxeles del archivo original.
 *
 * Es la medida que decide si una imagen sirve para OMR, y no los píxeles
 * totales: de ella dependen el puntillo de aumento, el grosor del corchete y la
 * distinción entre cabeza rellena y hueca, que son los rasgos que fijan la
 * DURACIÓN de cada nota.
 *
 * Medido con partituras sintéticas de verdad conocida:
 *   6.5 px → alturas 18/18, duraciones 18/18   (música sencilla)
 *   5.0 px → alturas 17/18, duraciones 12/18   ← las duraciones caen primero
 *   4.0 px → alturas  2/18, duraciones  5/18
 *
 * Las alturas aguantan mucho más porque salen de la POSICIÓN de la cabeza, que
 * sobrevive al reescalado. Por eso una partitura de baja resolución sale con la
 * melodía reconocible y el ritmo equivocado.
 *
 * Ampliar la imagen después no ayuda: interpolar un puntillo de 1.6 px a 6 px
 * da un puntillo borroso más grande, no información que la cámara no capturó.
 */
async function medirInterlinea(imgPath) {
  try {
    const { data, info } = await sharp(imgPath)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    if (!w || h < 20) return null;

    // Oscuridad media de cada fila: las líneas del pentagrama son filas oscuras
    const osc = new Float64Array(h);
    for (let y = 0; y < h; y++) {
      let s = 0;
      const base = y * w;
      for (let x = 0; x < w; x++) s += 255 - data[base + x];
      osc[y] = s / w;
    }
    let media = 0;
    for (let y = 0; y < h; y++) media += osc[y];
    media /= h;
    let varianza = 0;
    for (let y = 0; y < h; y++) varianza += (osc[y] - media) ** 2;
    const sd = Math.sqrt(varianza / h);
    const umbral = media + 1.6 * sd;

    // Agrupar filas contiguas: cada grupo es una línea del pentagrama
    const centros = [];
    let grupo = [];
    for (let y = 0; y < h; y++) {
      if (osc[y] > umbral) grupo.push(y);
      else if (grupo.length) {
        centros.push(grupo.reduce((a, b) => a + b, 0) / grupo.length);
        grupo = [];
      }
    }
    if (grupo.length) centros.push(grupo.reduce((a, b) => a + b, 0) / grupo.length);
    if (centros.length < 6) return null;

    // La mediana de las distancias entre líneas consecutivas es el interlineado
    const difs = [];
    for (let i = 1; i < centros.length; i++) {
      const d = centros[i] - centros[i - 1];
      if (d > 1.5 && d < 60) difs.push(d);
    }
    if (difs.length < 4) return null;
    difs.sort((a, b) => a - b);
    return difs[Math.floor(difs.length / 2)];
  } catch (_) {
    return null;
  }
}

// Python venv + script para parsear MXL con music21
const PYTHON_EXE  = path.join(__dirname, '..', 'backend-py', '.venv', 'Scripts', 'python.exe');
const PHOTO_SCRIPT = path.join(__dirname, '..', 'backend-py', 'photo.py');

/**
 * Corrige una foto de partitura antes de pasarla al motor de OMR.
 *
 * Solo actúa si la imagen parece hecha con cámara: hay inclinación, sombras o
 * perspectiva. Sobre un escaneo o una captura limpia no aporta y puede
 * empeorar el resultado, así que en ese caso devuelve `aplicado: false` y el
 * flujo sigue con el preprocesado de siempre.
 *
 * Medido con una foto simulada (perspectiva, 1.8° de giro y sombra diagonal):
 * sin este paso Audiveris no reconocía ni una nota; con él recupera compases
 * y duraciones.
 */
function corregirFoto(srcPath, dstPath) {
  try {
    const proc = spawnSync(PYTHON_EXE, [PHOTO_SCRIPT, srcPath, dstPath], {
      timeout: 90_000, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    });
    if (proc.status !== 0) return { aplicado: false };
    const info = JSON.parse((proc.stdout || '').trim());
    return info.error ? { aplicado: false } : info;
  } catch (_) {
    // Si el corrector falla, seguir con el camino normal es mejor que abortar
    return { aplicado: false };
  }
}
const PARSE_SCRIPT = path.join(__dirname, 'parse_mxl.py');

// Devuelve la partitura completa: notas, voces, MusicXML y metadatos.
// El MusicXML se conserva para poder renderizarlo con un motor de grabado real.
function parseMxlWithMusic21(mxlPath) {
  const proc = spawnSync(PYTHON_EXE, [PARSE_SCRIPT, mxlPath], {
    timeout: 60_000,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,   // el MusicXML puede pesar varios MB
  });
  const out = (proc.stdout || '').trim();
  if (proc.status !== 0) {
    // El script reporta errores como JSON; si lo logró, se usa ese mensaje
    try {
      const parsed = JSON.parse(out);
      if (parsed.error) throw new Error(parsed.error);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error('music21 parse error: ' + (proc.stderr || out).slice(-500));
      }
      throw e;
    }
    throw new Error('music21 parse error: ' + (proc.stderr || out).slice(-500));
  }
  const result = JSON.parse(out);
  if (result.error) throw new Error(result.error);
  return result;
}

// step name → semitone offset within octave
const STEP_SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// MusicXML note type → our duration label
const TYPE_MAP = {
  whole: 'whole',
  half: 'half',
  quarter: 'quarter',
  eighth: 'eighth',
  '16th': 'sixteenth',
};

function parseMusicXml(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => ['note', 'measure', 'part'].includes(name),
  });

  const doc = parser.parse(xml);
  const notes = [];

  const parts = doc?.['score-partwise']?.part ?? [];
  for (const part of parts) {
    for (const measure of (part.measure ?? [])) {
      const rawNotes = measure.note ?? [];
      // Group consecutive chord notes together, then pick the highest pitch
      let pending = null; // { note, midi }
      for (const note of rawNotes) {
        if (note.rest !== undefined) { if (pending) { notes.push(pending); pending = null; } continue; }
        const p = note.pitch;
        if (!p) continue;
        const step   = String(p.step ?? 'C');
        const octave = parseInt(p.octave ?? 4, 10);
        const alter  = parseFloat(p.alter ?? 0);
        const midi   = (octave + 1) * 12 + (STEP_SEMI[step] ?? 0) + Math.round(alter);
        const pitch  = `${step}${alter === 1 ? '#' : alter === -1 ? 'b' : ''}${octave}`;
        const duration = TYPE_MAP[note.type] ?? 'quarter';

        if (note.chord !== undefined && pending) {
          // Part of a chord: keep the highest MIDI (melody note)
          if (midi > pending.midi) pending = { pitch, duration, midi };
        } else {
          if (pending) notes.push(pending);
          pending = { pitch, duration, midi };
        }
      }
      if (pending) { notes.push(pending); pending = null; }
    }
    break; // only first part (treble melody)
  }
  return notes;
}

app.post('/api/omr', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen.' });

  const cmd = getAudiverisCmd('__TMP__', req.file.path);
  if (!cmd) {
    fs.unlinkSync(req.file.path);
    return res.status(503).json({
      error: 'Audiveris no está instalado. Instala Java 21 y descarga Audiveris desde https://github.com/Audiveris/audiveris/releases. Extrae en backend/audiveris/ o configura AUDIVERIS_JAR en backend/.env',
    });
  }

  // Audiveris requires proper extension and high-resolution B&W image
  const origName = req.file.originalname || 'score.png';
  const ext = path.extname(origName) || '.png';
  const rawPath = req.file.path + ext;
  try { fs.renameSync(req.file.path, rawPath); } catch (_) {}

  // Preprocess: upscale to ~300 DPI equivalent, grayscale, high contrast
  // Audiveris needs thick, clear staff lines to detect staves
  const tmpDir = fs.mkdtempSync(path.join(LOCAL_TMP, 'omr-'));
  const imgPath = path.join(tmpDir, 'score_processed.png');
  let srcW = 0, srcH = 0;
  // Se mide sobre el original, antes de ampliar: ampliar no añade información
  const interlinea = await medirInterlinea(rawPath);

  // Si viene de una cámara, se corrige antes de nada. El resultado sustituye a
  // la imagen de partida para el resto del proceso.
  const foto = corregirFoto(rawPath, path.join(tmpDir, 'foto_corregida.png'));
  const fuente = foto.aplicado ? path.join(tmpDir, 'foto_corregida.png') : rawPath;
  if (foto.aplicado) {
    console.log('[foto] corregida:', JSON.stringify(foto.señales || {}));
  }

  try {
    const meta = await sharp(fuente).metadata();
    srcW = meta.width || 0;
    srcH = meta.height || 0;
    const w = meta.width || 1000;
    // Scale to at least 2400px wide — Audiveris needs thick, visible staff lines
    const targetW = Math.max(w, 2400);
    let img = sharp(fuente).resize({ width: targetW, kernel: 'lanczos3' }).grayscale();
    // El corrector de foto ya normaliza luz y escala; repetirlo aquí solo
    // añadiría artefactos sobre una imagen que ya viene tratada
    if (!foto.aplicado) {
      img = img.normalise().sharpen({ sigma: 1.5 });
    }
    await img.png({ compressionLevel: 0 }).toFile(imgPath);
  } catch (preprocessErr) {
    console.error('[preprocess]', preprocessErr.message);
    fs.copyFileSync(fuente, imgPath);
  }
  try {
    {
      const bin = findAudiveris();
      const audArgs = getAudiverisArgs(tmpDir, imgPath);
      const proc = spawnSync(bin, audArgs, { timeout: 120_000, encoding: 'utf8' });
      const combined = (proc.stdout || '') + '\n' + (proc.stderr || '');
      console.log('[Audiveris]', combined.slice(-1000));
      if (proc.status !== 0) {
        // "No regularly spaced lines found" = Audiveris no ve pentagramas.
        // Casi siempre es una imagen demasiado pequeña o de baja resolución.
        if (combined.includes('No regularly spaced lines found')) {
          const dim = srcW && srcH ? ` (la tuya es ${srcW}×${srcH} px)` : '';
          throw new Error(
            `No se detectaron pentagramas en la imagen${dim}. ` +
            'Usa una foto o escaneo donde las 5 líneas del pentagrama se vean nítidas y horizontales. ' +
            'Recomendado: al menos 1000 px de ancho, buena iluminación y sin inclinación.'
          );
        }
        if (combined.includes('No installed OCR languages')) {
          console.warn('[Audiveris] OCR sin idiomas instalados — no afecta la detección de notas');
        }
        const warnLines = combined.split('\n')
          .filter(l => l.includes('WARN') || l.includes('Exception') || l.includes('Error'))
          .join('\n').slice(-800);
        throw new Error(warnLines || proc.error?.message || 'Audiveris retornó error');
      }
    }

    const mxlFiles = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mxl'));
    if (!mxlFiles.length) throw new Error('Audiveris procesó la imagen pero no detectó pentagramas. Usa una imagen de partitura clara (PNG/JPG, >300 dpi).');

    const mxlPath = path.join(tmpDir, mxlFiles[0]);
    const score = parseMxlWithMusic21(mxlPath);

    if (!score.notes?.length) throw new Error('No se detectaron notas en la imagen. Prueba con una imagen más nítida.');

    // Aviso de calidad: por debajo de ~6 px de interlineado las duraciones
    // dejan de ser fiables aunque las alturas sigan saliendo bien. Conviene
    // decirlo, porque el resultado parece correcto de un vistazo y no lo es.
    // Umbrales según lo que recomienda el propio Audiveris (interlineado ≥ 16 px)
    // y lo medido con partituras de verdad conocida: por debajo de 8 px las
    // duraciones dejan de ser fiables aunque las alturas sigan bien.
    let aviso = null;
    if (interlinea !== null && interlinea < 14.0) {
      const objetivo = Math.round(srcW * (16 / interlinea));
      const critico = interlinea < 8.0;
      aviso = {
        interlinea: Math.round(interlinea * 10) / 10,
        nivel: critico ? 'critico' : 'bajo',
        mensaje: critico
          ? `El pentagrama mide ${interlinea.toFixed(1)} px entre líneas, cuando ` +
            'hacen falta 16. A esta resolución el puntillo de aumento ocupa ' +
            `${(interlinea * 0.25).toFixed(1)} px y el corchete ${(interlinea * 0.5).toFixed(1)} px: ` +
            'las alturas saldrán bien pero los ritmos no son fiables. ' +
            `Usa una imagen de ~${objetivo} px de ancho o escanea a 300 dpi.`
          : `El pentagrama mide ${interlinea.toFixed(1)} px entre líneas; lo ` +
            'recomendable son 16. Puede haber errores en puntillos y ' +
            `figuras rápidas. Ideal: ~${objetivo} px de ancho.`,
      };
    }

    res.json({
      notes:         score.notes,
      voices:        score.voices,
      musicXml:      score.musicXml,
      timeSignature: score.timeSignature,
      tempo:         score.tempo,
      keyLabel:      score.keyLabel,
      measures:      score.measures,
      engine:        'audiveris+notation',
      quality:       aviso,
      photo:         foto.aplicado ? {
        anguloCorregido: foto.anguloCorregido,
        perspectivaCorregida: foto.perspectivaCorregida,
        interlineaAntes: foto.interlineaAntes,
        interlineaDespues: foto.interlineaDespues,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    try { fs.unlinkSync(rawPath); } catch (_) {}
  }
});

app.get('/api/health', (_req, res) => {
  const bin = findAudiveris();
  res.json({ status: 'ok', audiverisFound: !!bin, audiverisBin: bin || 'none' });
});

app.listen(PORT, () => {
  const bin = findAudiveris();
  console.log(`OMR server en http://localhost:${PORT}`);
  console.log(bin ? `Audiveris: ${bin} ✓` : 'Audiveris: NO encontrado');
});
