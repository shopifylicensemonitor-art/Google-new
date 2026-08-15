@echo off
powershell -ExecutionPolicy Bypass -NoProfile -Command "cd '%~dp0'; npm run dev -- --host 0.0.0.0"
