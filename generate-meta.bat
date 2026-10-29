@echo off
rem ============================================================
rem  generate-meta.bat
rem  Generates mvpsounds-meta.json from file modification dates
rem  in the audios/ folder (used as the date source for the player)
rem ============================================================

set "PROJECT_DIR=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%generate-meta.ps1"
if errorlevel 1 (
    echo ERROR: failed to generate meta file.
    pause
    exit /b 1
)

pause