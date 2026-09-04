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

// Audiveris puede invocarse como JAR (legacy) o como app instalada (v5.x)
const AUDIVERIS_JAR  = process.env.AUDIVERIS_JAR  || path.join(__dirname, 'Audiveris.jar');
const AUDIVERIS_HOME = process.env.AUDIVERIS_HOME || path.join(__dirname, 'audiveris');
const AUDIVERIS_BAT  = path.join(AUDIVERIS_HOME, 'bin', 'Audiveris.bat');
const JAVA_BIN       = process.env.JAVA_BIN       || 'java';
const PORT           = process.env.PORT            || 3001;

// Elige el modo de invocación disponible
function getAudiverisCmd(tmpDir, imgPath) {
  if (fs.existsSync(AUDIVERIS_BAT)) {
    return `"${AUDIVERIS_BAT}" -batch -export -output "${tmpDir}" "${imgPath}"`;
  }
  if (fs.existsSync(AUDIVERIS_JAR)) {
    return `"${JAVA_BIN}" -jar "${AUDIVERIS_JAR}" -batch -export -output "${tmpDir}" "${imgPath}"`;
  }
  return null;
}

function audiverisAvailable() {
  return fs.existsSync(AUDIVERIS_BAT) || fs.existsSync(AUDIVERIS_JAR);
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
  const batFound = fs.existsSync(AUDIVERIS_BAT);
  const jarFound = fs.existsSync(AUDIVERIS_JAR);
  res.json({
    status: 'ok',
    audiverisFound: batFound || jarFound,
    mode: batFound ? 'app' : jarFound ? 'jar' : 'none',
    audiverisBat: AUDIVERIS_BAT,
    audiverisJar: AUDIVERIS_JAR,
  });
});

app.listen(PORT, () => {
  console.log(`OMR server en http://localhost:${PORT}`);
  if (fs.existsSync(AUDIVERIS_BAT))  console.log(`Audiveris app: ${AUDIVERIS_BAT} ✓`);
  else if (fs.existsSync(AUDIVERIS_JAR)) console.log(`Audiveris JAR: ${AUDIVERIS_JAR} ✓`);
  else console.log('Audiveris: NO encontrado. Descarga desde https://github.com/Audiveris/audiveris/releases');
});
