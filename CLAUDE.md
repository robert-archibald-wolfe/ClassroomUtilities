# CLAUDE.md — Teacher Tools Suite

> This file provides context for Claude Code when working on this project.

## Project Overview

A self-hosted, multi-tenant suite of classroom tools for teachers. See `docs/TECHNICAL_SPEC.md` for the full specification.

**Core tools:**
1. Random Group Generator (PHI)
2. Seating Chart Editor (PHI)
3. Classroom Timers (no PHI, embeddable)
4. Random Student Picker (PHI)
5. Bellringer Creator (AI)
6. Lesson Plan Generator (AI)
7. Rubric Builder (AI)

## Critical Constraints

### Privacy First — READ THIS

**PHI (student names, rosters, seating assignments) must NEVER be stored in plaintext on the server.**

- All PHI is encrypted client-side using AES-256-GCM before transmission
- Server stores only encrypted blobs
- Decryption happens exclusively in the browser
- The `crypto/` module in the frontend handles all encryption
- If you're writing code that touches student data, ask: "Is this decrypted? If so, it stays client-side."

### Multi-Tenancy

- Every database table with user data has a `tenant_id` column
- Always filter queries by `tenant_id` — never trust client-provided IDs alone
- Use the `get_current_tenant()` dependency in FastAPI routes

### AI Integration

- All AI calls go through self-hosted Ollama (no external APIs)
- AI endpoints are under `/api/ai/`
- AI never processes PHI — only curriculum content, standards, etc.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL 16 with row-level security |
| Cache/Queue | Redis, ARQ for background jobs |
| AI | Ollama (local), accessed via HTTP API |
| Frontend | React 18, TypeScript, Zustand, Tailwind CSS |
| Crypto | Web Crypto API, tweetnacl |
| Infrastructure | Docker Compose, Traefik |

## Project Structure

```
teacher-tools/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py
│   │   │   │   ├── rosters.py
│   │   │   │   ├── seating.py
│   │   │   │   ├── timers.py
│   │   │   │   └── ai.py
│   │   │   └── deps.py          # Dependencies (auth, tenant)
│   │   ├── core/
│   │   │   ├── config.py        # Settings via pydantic-settings
│   │   │   ├── security.py      # JWT, password hashing
│   │   │   └── ollama.py        # Ollama client
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   └── main.py
│   ├── alembic/                 # DB migrations
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/              # Zustand stores
│   │   ├── crypto/              # Client-side encryption
│   │   ├── api/                 # API client
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── ollama/
├── docs/
│   └── TECHNICAL_SPEC.md
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
└── CLAUDE.md                    # You are here
```

## Dev Container (Recommended)

This project includes VS Code Dev Container support. To use it:

1. Install the "Dev Containers" extension in VS Code
2. Open the project folder
3. Press `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
4. Wait for the container to build and start

The dev container automatically:
- Sets up Python 3.12 with a virtual environment
- Installs Node.js 20 and npm dependencies
- Starts PostgreSQL, Redis, and Ollama services
- Configures VS Code extensions and settings

## Development Commands

### Inside Dev Container

```bash
# Start backend (from /workspace)
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

# Start frontend (from /workspace)
cd frontend && npm run dev

# Or use VS Code tasks: Ctrl+Shift+B → "Start All Dev Servers"
```

### Without Dev Container

```bash
# Start all services (dev mode)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Backend only (with hot reload)
docker compose up -d db redis
cd backend && uvicorn app.main:app --reload

# Frontend only (with hot reload)
cd frontend && npm run dev

# Run backend tests
cd backend && pytest

# Run frontend tests
cd frontend && npm test

# Database migrations
cd backend && alembic upgrade head
cd backend && alembic revision --autogenerate -m "description"

# Ollama model management
docker compose exec ollama ollama pull llama3.1:8b
docker compose exec ollama ollama list
```

## Code Style & Conventions

### Python (Backend)

- Use type hints everywhere
- Pydantic models for all request/response schemas
- Async functions for all route handlers and DB operations
- Use `sqlalchemy.select()` style, not legacy `Query` API
- Dependency injection via FastAPI's `Depends()`

```python
# Good
@router.get("/rosters", response_model=list[RosterResponse])
async def list_rosters(
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
) -> list[RosterResponse]:
    stmt = select(Roster).where(Roster.tenant_id == tenant.id)
    result = await db.execute(stmt)
    return result.scalars().all()
```

### TypeScript (Frontend)

- Strict TypeScript — no `any` types
- Functional components with hooks
- Zustand for global state, local state for component-specific
- All API calls through `src/api/client.ts`
- Encryption/decryption isolated in `src/crypto/`

```typescript
// Good
interface Student {
  id: string;
  encryptedName: string; // Always encrypted when from server
}

const decryptedName = await decrypt(student.encryptedName, dek);
```

### Crypto Rules

- Never log decrypted PHI
- Never send decrypted PHI to the server
- DEK (Data Encryption Key) lives only in memory, never persisted client-side
- Use `crypto.subtle` (Web Crypto API) for all cryptographic operations

## API Conventions

- Base path: `/api/v1/`
- Auth header: `Authorization: Bearer <jwt>`
- All responses follow:
  ```json
  {"success": true, "data": {...}}
  {"success": false, "error": {"code": "...", "message": "..."}}
  ```
- Use HTTP status codes correctly (201 for created, 404 for not found, etc.)

## Database Conventions

- Table names: plural, snake_case (`rosters`, `seating_charts`)
- Primary keys: `id` (UUID)
- Timestamps: `created_at`, `updated_at` (auto-managed)
- All tenant-scoped tables have `tenant_id` FK with index
- Encrypted fields suffixed with `_encrypted` (e.g., `roster_data_encrypted`)

## Testing

- Backend: pytest with async support (`pytest-asyncio`)
- Frontend: Vitest + React Testing Library
- Crypto operations must be tested with known test vectors
- Never use real student data in tests — use fixtures

## Common Tasks

### Adding a New API Route

1. Create route file in `backend/app/api/routes/`
2. Add Pydantic schemas in `backend/app/schemas/`
3. Register router in `backend/app/api/routes/__init__.py`
4. Write tests in `backend/tests/api/`

### Adding a New Tool (Frontend)

1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. If uses PHI: integrate with `crypto/` module
4. If uses server state: add to relevant Zustand store

### Adding a New AI Feature

1. Create prompt template in `backend/app/core/prompts/`
2. Add service function in `backend/app/services/ai.py`
3. Create route in `backend/app/api/routes/ai.py`
4. Test with various Ollama models for quality

## Environment Variables

Key variables (see `.env.example` for full list):

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/teachertools

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SECRET_KEY=<generate-secure-key>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Ollama
OLLAMA_BASE_URL=http://ollama:11434

# Encryption (server-side at-rest, not PHI)
ENCRYPTION_KEY=<generate-secure-key>
```

## Getting Help

- Full technical spec: `docs/TECHNICAL_SPEC.md`
- API docs (when running): http://localhost:8000/docs
- Ollama API: http://localhost:11434/api

## Current Phase

**Phase 1: Foundation** — Setting up project scaffolding, auth, and encryption infrastructure.

Priority order:
1. Docker Compose setup with all services
2. FastAPI skeleton with auth endpoints
3. PostgreSQL models and migrations
4. React app with routing and auth flow
5. Client-side encryption module
6. Basic roster CRUD (encrypted)

---

*When in doubt about privacy implications, ask. When in doubt about architecture, check the spec.*
