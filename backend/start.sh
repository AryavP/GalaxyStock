#!/bin/bash
# Railway startup script for GalacticStocks backend

# Use Railway's PORT environment variable or default to 8000
PORT=${PORT:-8000}

# Start uvicorn server
exec uvicorn main:app --host 0.0.0.0 --port $PORT
