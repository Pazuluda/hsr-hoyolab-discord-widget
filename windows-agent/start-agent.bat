@echo off
cd /d %~dp0

:loop
echo [%date% %time%] Lancement agent.js >> agent.log
node.exe agent.js >> agent.log 2>&1

echo [%date% %time%] Agent stoppe, relance dans 10 secondes >> agent.log
timeout /t 10 /nobreak >nul
goto loop
