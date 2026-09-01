#!/bin/bash
# DSA Evaluator Agent — Start Script
# Run this ONCE to set up, then run the agent

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🤖 DSA Code Evaluator Agent Setup"
echo "=================================="

# Create virtualenv if not exists
if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
fi

# Install dependencies
echo "Installing dependencies..."
./venv/bin/pip install -q \
  "fastapi==0.115.0" \
  "uvicorn[standard]==0.30.6" \
  "langchain-groq==0.2.1" \
  "langchain-core==0.3.15" \
  "langgraph==0.2.39" \
  "python-dotenv==1.0.1" \
  "pydantic==2.9.2"

echo ""
echo "✅ Dependencies installed!"

# Check GROQ_API_KEY
if grep -q "your_groq_api_key_here" .env 2>/dev/null; then
  echo ""
  echo "⚠️  IMPORTANT: Add your Groq API key to agent/.env:"
  echo "   GROQ_API_KEY=gsk_xxxxxxxxxxxx"
  echo ""
fi

echo "🚀 Starting agent on http://localhost:5001"
echo ""
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 5001 --reload
