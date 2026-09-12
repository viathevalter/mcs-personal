@echo off
title MCS B2B Lead Harvester Daemon 24/7
echo ==============================================================================
echo [MCS] INICIANDO MINERADOR B2B 24/7 (ESPANHA, FRANCA, ITALIA)
echo ==============================================================================
cd /d "%~dp0"
node scripts/b2b_lead_harvester_daemon.cjs
pause