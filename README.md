# ProPartituras

Editor musical profesional de partituras Urtext, construido con React 19 + Vite + TypeScript + Tailwind v4.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 · Vite 8 · TypeScript · Tailwind v4 |
| Routing | React Router v7 |
| Audio | Web Audio API (5 osciladores, rango C2–C7) |
| Iconos | Material Symbols Outlined (Google Fonts) |
| OMR (imagen→notas) | Backend Express + Audiveris (Java) |
| Audio→notas | Autocorrelación en browser (Web Audio API) |

## Páginas

| Ruta | Descripción |
|---|---|
| `/` | Landing — presentación de la plataforma |
| `/login` | Login split 50/50 con hero musical |
| `/dashboard` | Panel principal con proyectos recientes |
| `/editor` | Editor de partitura Urtext (núcleo de la app) |
| `/instruments` | Gestión de instrumentos y biblioteca orquestal |
| `/history` | Control de versiones y auditoría de ediciones |
| `/export` | Exportación PDF/MusicXML con preview |

## Editor — funcionalidades

- Partitura SVG con notas del K.545 de Mozart
- Selección de nota → edición en panel derecho (pitch, duración, dinámica, articulación, ornamentos)
- Toolbar: duraciones, alteraciones, dinámicas, tema papel/oscuro, zoom
- Barra de reproducción inferior
- **Importar partitura** desde imagen (OMR via Audiveris) o desde audio (autocorrelación)
- Toast de guardado en Navbar

## Inicio rápido

```bash
# 1. Instalar dependencias del frontend
npm install

# 2. Iniciar el servidor de desarrollo
npm run dev
# → http://localhost:5200
```

## Backend OMR (importar desde imagen)

El reconocimiento óptico de partituras usa [Audiveris](https://github.com/Audiveris/audiveris/releases) (Java).

```bash
# Pre-requisitos
# - Java JDK 17+
# - Audiveris.jar descargado

# Configurar
cd backend
cp .env.example .env
# Editar .env: apuntar AUDIVERIS_JAR a la ruta del jar

# Instalar dependencias
npm install

# Iniciar servidor OMR (puerto 3001)
npm start
```

El frontend apunta automáticamente a `http://localhost:3001`. Se puede cambiar con `VITE_OMR_URL` en `.env`.

## Variables de entorno

**Frontend** (`.env` en la raíz):
```
VITE_OMR_URL=http://localhost:3001
```

**Backend** (`backend/.env`):
```
AUDIVERIS_JAR=C:\Tools\Audiveris\Audiveris.jar
JAVA_BIN=java
PORT=3001
```

## Estructura del proyecto

```
ProPartitura/
├── backend/              # Servidor OMR (Express + Audiveris)
│   ├── server.js
│   └── .env.example
├── src/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StaffSVG.tsx      # Partitura SVG con renderizado dinámico
│   │   ├── NotePanel.tsx     # Panel de propiedades de nota
│   │   ├── PlaybackBar.tsx
│   │   └── ScoreImporter.tsx # Modal de importación (imagen/audio)
│   ├── pages/
│   │   ├── Editor.tsx
│   │   ├── Instruments.tsx
│   │   ├── History.tsx
│   │   └── ...
│   └── utils/
│       ├── audio.ts          # Síntesis Web Audio API
│       ├── imageToScore.ts   # Cliente OMR → backend
│       └── audioToScore.ts   # Detección de pitch en browser
└── .env.example
```

## Créditos

Proyecto académico — Colegio BAU · Diego Ortiz.  
Sonata K.545 de Mozart como partitura de referencia Urtext.
