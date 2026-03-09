@echo off
cd /d "%~dp0"
echo 正在推送到GitHub...
git push -u origin main
echo 推送完成！
pause
