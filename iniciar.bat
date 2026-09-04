@echo off
echo Iniciando ProPartitura...

start "Python Backend" cmd /k "cd /d C:\ProPartitura\backend-py && .venv\Scripts\python.exe -m uvicorn server:app --port 3002"
timeout /t 2 /nobreak >nul

start "OMR Backend" cmd /k "cd /d C:\ProPartitura\backend && node server.js"
timeout /t 2 /nobreak >nul

start "Web (Vite)" cmd /k "cd /d C:\ProPartitura && node node_modules\vite\bin\vite.js"
timeout /t 3 /nobreak >nul

start "" http://localhost:5173
echo Listo. Cierra esta ventana cuando termines.
