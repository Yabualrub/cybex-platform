@echo off
echo Starting Cybex Platform...

REM === Backend API ===
start "API - NestJS" cmd /k "cd apps\api && pnpm start:dev"

REM === Frontend Web ===
start "WEB - Next.js" cmd /k "cd apps\web && pnpm dev"

echo Done.
