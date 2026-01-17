# Teacher Tools

A privacy-first suite of classroom tools for teachers.

## Features

- **Random Group Generator** — Create fair, randomized student groups
- **Seating Chart Editor** — Visual drag-and-drop seating arrangements
- **Classroom Timers** — Embeddable countdown/stopwatch timers
- **Random Student Picker** — Fair selection for participation
- **Bellringer Creator** — AI-generated warm-up activities
- **Lesson Plan Generator** — Standards-aligned lesson plans
- **Rubric Builder** — Assessment rubrics with AI assistance

## Privacy

Student data (names, rosters, seating assignments) is encrypted in the browser before being sent to the server. The server stores only encrypted blobs and cannot decrypt the data.

## Quick Start

### Option 1: Dev Container (Recommended)

1. Install VS Code and the "Dev Containers" extension
2. Clone the repo and open in VS Code
3. Press `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
4. Wait for setup to complete
5. Run: `Ctrl+Shift+B` → "Start All Dev Servers"

### Option 2: Docker Compose

```bash
# Clone the repo
git clone https://github.com/yourrepo/teacher-tools.git
cd teacher-tools

# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Start development environment
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Pull Ollama model (first time only)
docker compose exec ollama ollama pull llama3.1:8b
```

Access the app at http://localhost:5173

## Development

See [CLAUDE.md](./CLAUDE.md) for development guidelines and conventions.

See [docs/TECHNICAL_SPEC.md](./docs/TECHNICAL_SPEC.md) for the full technical specification.

## Tech Stack

- **Backend:** Python 3.12, FastAPI, PostgreSQL, Redis
- **Frontend:** React 18, TypeScript, Tailwind CSS
- **AI:** Self-hosted Ollama
- **Infrastructure:** Docker, Traefik

## License

TBD
