require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const { execSync } = require('child_process');
const AdmZip  = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');

const app = express();
app.use(cors());

const upload = multer({ dest: os.tmpdir() });

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

function getAudiverisCmd(tmpDir, imgPath) {
  const bin = findAudiveris();
  if (!bin) return null;
  if (bin.endsWith('.exe') || bin.endsWith('.bat')) {
    return `"${bin}" -batch -export -output "${tmpDir}" "${imgPath}"`;
  }
  // JAR legacy
  const java = process.env.JAVA_BIN || 'java';
  return `"${java}" -jar "${bin}" -batch -export -output "${tmpDir}" "${imgPath}"`;
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
      for (const note of (measure.note ?? [])) {
        // skip rests and chords (only take the top voice note)
        if (note.rest !== undefined) continue;
        if (note.chord !== undefined) continue;

        const p = note.pitch;
        if (!p) continue;

        const step   = String(p.step ?? 'C');
        const octave = parseInt(p.octave ?? 4, 10);
        const alter  = parseInt(p.alter  ?? 0, 10);

        const midi  = (octave + 1) * 12 + (STEP_SEMI[step] ?? 0) + alter;
        const pitch = `${step}${alter === 1 ? '#' : alter === -1 ? 'b' : ''}${octave}`;
        const duration = TYPE_MAP[note.type] ?? 'quarter';

        notes.push({ pitch, duration, midi });
      }
    }
    break; // only first part (treble melody)
  }
  return notes;
}

app.post('/api/omr', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen.' });

  const cmd = getAudiverisCmd('__TMP__', req.file.path);
  if (!cmd) {
    fs.unlinkSync(req.file.path);
    return res.status(503).json({
      error: 'Audiveris no está instalado. Instala Java 21 y descarga Audiveris desde https://github.com/Audiveris/audiveris/releases. Extrae en backend/audiveris/ o configura AUDIVERIS_JAR en backend/.env',
    });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'propart-omr-'));
  try {
    execSync(
      getAudiverisCmd(tmpDir, req.file.path),
      { timeout: 90_000, stdio: 'pipe' }
    );

    const mxlFiles = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mxl'));
    if (!mxlFiles.length) throw new Error('Audiveris no generó ningún archivo MXL. Comprueba que la imagen sea legible.');

    const zip = new AdmZip(path.join(tmpDir, mxlFiles[0]));
    const xmlEntry = zip.getEntries().find(e => e.entryName.endsWith('.xml'));
    if (!xmlEntry) throw new Error('El MXL de Audiveris no contiene XML interno.');

    const xmlContent = zip.readAsText(xmlEntry);
    const notes = parseMusicXml(xmlContent);

    if (!notes.length) throw new Error('No se detectaron notas en la imagen. Prueba con una imagen más nítida.');

    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    try { fs.unlinkSync(req.file.path); } catch (_) {}
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
