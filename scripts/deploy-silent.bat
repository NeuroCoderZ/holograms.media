@echo off
REM Deploy Hermes with output to file (bypass terminal deadlock)

cd /d "%~dp0.."

echo Starting deployment... > deploy_log.txt
echo. >> deploy_log.txt

node scripts/deploy.js "fix hermes imports" >> deploy_log.txt 2>&1

echo. >> deploy_log.txt
echo Deployment command completed. >> deploy_log.txt
echo Check deploy_log.txt for results. >> deploy_log.txt

type deploy_log.txt
