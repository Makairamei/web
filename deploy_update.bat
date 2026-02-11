@echo off
echo ==========================================
echo  AUTO DEPLOY UPDATES TO VPS (CS Premium)
echo ==========================================
echo.
echo Uploading server.js and database.js...
scp server.js database.js root@172.83.15.6:~/cs-premium/
echo.
echo Restarting Server...
ssh root@172.83.15.6 "cd ~/cs-premium && npm install && pm2 restart cs-premium"
echo.
echo ==========================================
echo  DEPLOY SUCCESS!
echo  Please check if Admin Panel is accessible.
echo ==========================================
pause
