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

// Python venv + script para parsear MXL con music21
const PYTHON_EXE  = path.join(__dirname, '..', 'backend-py', '.venv', 'Scripts', 'python.exe');
const PARSE_SCRIPT = path.join(__dirname, 'parse_mxl.py');

function parseMxlWithMusic21(mxlPath) {
  const proc = spawnSync(PYTHON_EXE, [PARSE_SCRIPT, mxlPath], {
    timeout: 30_000,
    encoding: 'utf8',
  });
  if (proc.status !== 0) {
    const err = (proc.stderr || proc.stdout || '').slice(-500);
    throw new Error('music21 parse error: ' + err);
  }
  const out = (proc.stdout || '').trim();
  const result = JSON.parse(out);
  if (result.error) throw new Error(result.error);
  return result.notes;
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
  try {
    const meta = await sharp(rawPath).metadata();
    const w = meta.width || 1000;
    // Scale to at least 2400px wide — Audiveris needs thick, visible staff lines
    const targetW = Math.max(w, 2400);
    await sharp(rawPath)
      .resize({ width: targetW, kernel: 'lanczos3' })
      .grayscale()
      .normalise()
      .sharpen({ sigma: 1.5 })   // enhance line edges without breaking them
      .png({ compressionLevel: 0 })
      .toFile(imgPath);
  } catch (preprocessErr) {
    console.error('[preprocess]', preprocessErr.message);
    fs.copyFileSync(rawPath, imgPath);
  }
  try {
    {
      const bin = findAudiveris();
      const audArgs = getAudiverisArgs(tmpDir, imgPath);
      const proc = spawnSync(bin, audArgs, { timeout: 120_000, encoding: 'utf8' });
      const combined = (proc.stdout || '') + '\n' + (proc.stderr || '');
      console.log('[Audiveris]', combined.slice(-1000));
      if (proc.status !== 0) {
        const warnLines = combined.split('\n')
          .filter(l => l.includes('WARN') || l.includes('Exception') || l.includes('Error'))
          .join('\n').slice(-800);
        throw new Error(warnLines || proc.error?.message || 'Audiveris retornó error');
      }
    }

    const mxlFiles = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mxl'));
    if (!mxlFiles.length) throw new Error('Audiveris procesó la imagen pero no detectó pentagramas. Usa una imagen de partitura clara (PNG/JPG, >300 dpi).');

    const mxlPath = path.join(tmpDir, mxlFiles[0]);
    const notes = parseMxlWithMusic21(mxlPath);

    if (!notes.length) throw new Error('No se detectaron notas en la imagen. Prueba con una imagen más nítida.');

    res.json({ notes });
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
