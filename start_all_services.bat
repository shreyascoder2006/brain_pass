@echo off
title NeuroScope 3D - Full Studio & WhatsApp Services
cd /d "%~dp0"

echo ===================================================
echo   Starting NeuroScope 3D Full System
echo   1. FastAPI Clinical Engine (Port 8008)
echo   2. WhatsApp 24/7 Baileys Bridge (Port 3001)
echo   3. Vite Frontend Studio (Port 5173)
echo ===================================================

start "FastAPI Server (8008)" cmd /k "cd /d %~dp0backend && set PYTHONUTF8=1 && python -m uvicorn server.main:app --host 127.0.0.1 --port 8008"
start "WhatsApp Bridge (3001)" cmd /k "cd /d %~dp0 && start_whatsapp_bridge.bat"
start "Frontend Studio (5173)" cmd /k "cd /d %~dp0 && npm run dev -- --port 5173"

echo [OK] All NeuroScope 3D services launched successfully!
