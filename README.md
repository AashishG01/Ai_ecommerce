# EStoreFront — AI-Powered E-Commerce Platform

A full-stack e-commerce platform with an AI shopping assistant, built as three independent microservices.

## Architecture

```
Client (Browser)
     ↓
Frontend (Next.js 15)
     ↓
Backend API (Express + TypeScript + PostgreSQL)
     ↓
AI Service (FastAPI + Ollama + Gemini)
```

## Services

| Service | Tech Stack | Port |
|---------|-----------|------|
| **Frontend** | Next.js 15, React 18, Tailwind CSS, Radix UI | 3000 |
| **Backend** | Express.js, TypeScript, Prisma, PostgreSQL | 5000 |
| **AI Service** | FastAPI, LangChain, Ollama, Google Gemini | 8000 |

## Quick Start (Docker)

```bash
docker compose up -d
```

This starts all services + PostgreSQL + Redis.

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Python 3.12+
- PostgreSQL 16+
- Ollama (for AI features)

### 1. Backend

```bash
cd backend
cp .env.example .env          # Configure DATABASE_URL
npm install
npx prisma db push            # Create tables
npm run seed                  # Seed sample data
npm run dev                   # Start on :5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # Start on :3000
```

### 3. AI Service

```bash
cd ai-service
cp .env.example .env          # Configure API keys
pip install -r requirements.txt
python main.py                # Start on :8000
```

## Project Structure

```
EStoreFront/
├── frontend/                 # Next.js 15 (SSR, Tailwind, Radix UI)
├── backend/                  # Express.js + TypeScript
│   ├── prisma/schema.prisma  # PostgreSQL schema (Prisma ORM)
│   └── src/
│       ├── modules/          # Feature modules (layered architecture)
│       ├── middleware/        # Error handler, validation, rate limiting
│       └── lib/              # Logger, Prisma client
├── ai-service/               # FastAPI (Ollama chat, Gemini suggestions)
│   ├── services/             # Chat, embeddings, vector search
│   └── models/               # Pydantic schemas
├── docker-compose.yml        # All services orchestration
└── README.md
```
