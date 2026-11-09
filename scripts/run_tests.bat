@echo off
echo ==============================================
echo Running RemoteBot Automated Pytest Suite...
echo ==============================================
python -m pytest backend/tests -v
pause
