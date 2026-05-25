#!/bin/bash

# Exit on error
set -e

echo "🚀 Setting up Wreck Link..."

# Backend Setup (optional venv/pip install)
echo "📦 Checking python packages..."
pip install -r backend/requirements.txt || echo "pip install failed, please run manually if needed"

# Run
echo "🌟 Starting Wreck Link Services..."
echo "   - Backend: http://localhost:8000"
echo "   - Frontend: http://localhost:3000 (or default Next.js port)"

# Start backend
python3 backend/main.py &
BACKEND_PID=$!

# Start frontend
npm run dev &
FRONTEND_PID=$!

# Handle shutdown gracefully
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# Wait
wait
