@echo off
echo ==============================================
echo Launching RemoteBot Local Development Services
echo ==============================================

start cmd /k "echo Starting Backend FastAPI Gateway... && cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start cmd /k "echo Starting Frontend Vite Dev Server... && cd frontend && npm run dev"

echo Backend URL: http://127.0.0.1:8000/docs
echo Frontend URL: http://localhost:5173
