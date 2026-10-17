@echo off
title NeuroScope 3D - WhatsApp Clinic Bridge (24/7 Service)
cd /d "%~dp0backend\whatsapp_bridge"

echo ===================================================
echo   NeuroScope 3D - WhatsApp Baileys 24/7 Bridge
echo   Persistent auto-healing runner (Keep Running Always)
echo ===================================================

:loop
echo [%date% %time%] Starting WhatsApp Baileys Bridge on port 3001...
node server.js
echo [%date% %time%] Service stopped or disconnected. Auto-restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
