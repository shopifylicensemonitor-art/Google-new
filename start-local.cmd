@echo off
cd /d "%~dp0"
start "Peak Xender Backend" cmd /k node server.js
cd /d "%~dp0\gfg-main"
call dev.cmd
