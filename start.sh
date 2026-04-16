#!/usr/bin/env bash
# Start both FastAPI backend and Vite frontend together
# Run from the kestrel-app directory

VENV=../../venv   # adjust if your venv is elsewhere

echo "Starting Kestrel..."

# Backend
(cd backend && "$VENV/Scripts/python.exe" -m uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# Frontend
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
