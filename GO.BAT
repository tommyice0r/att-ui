@echo off
REM Lanzador de 2 CMD — todo en la misma carpeta

set "BASE=%~dp0"

REM 1) npm run dev (carpeta panel)
start "Dev (npm run dev)" /D "%BASE%panel" cmd /k "serve -s . -l 5173"

REM 2) server.exe (en la misma carpeta del BAT)
start "OTO Server" /D "%BASE%" cmd /k "%BASE%server\server.exe"

exit
