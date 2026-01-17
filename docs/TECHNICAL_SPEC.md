# Teacher Tools Suite — Technical Specification

**Version:** 0.1.0 (Draft)  
**Author:** Rob Wolfe  
**Date:** December 31, 2025  

---

## 1. Executive Summary

A self-hosted, multi-tenant suite of classroom tools for teachers. The system prioritizes student data privacy through client-side encryption for any personally identifiable information (PHI), while leveraging a self-hosted Ollama instance for AI-powered features like lesson planning and rubric generation.

### Core Principles

1. **Privacy by Design** — PHI never touches the server in plaintext
2. **Teacher Ownership** — Teachers control their data; optional Google Drive sync
3. **AI Without Compromise** — Self-hosted Ollama means no data leaves your infrastructure
4. **Multi-Tenant Ready** — Architecture supports scaling from day one
5. **Embeddable & Standalone** — Tools work independently or integrate with Google Slides/Canva

---

## 2. Tool Inventory

| # | Tool | Contains PHI | Requires AI | Priority |
|---|------|--------------|-------------|----------|
| 1 | Random Group Generator | ✅ Yes | ❌ No | High |
| 2 | Seating Chart Editor | ✅ Yes | ❌ No | High |
| 3 | Classroom Timers | ❌ No | ❌ No | High |
| 4 | Random Student Picker | ✅ Yes | ❌ No | High |
| 5 | Bellringer Creator | ❌ No | ✅ Yes | Medium |
| 6 | Lesson Plan Generator | ❌ No | ✅ Yes | Medium |
| 7 | Rubric Builder | ❌ No | ✅ Yes | Medium |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Web App   │  │Google Slides│  │   Canva     │  │  Standalone Embeds  │ │
│  │   (React)   │  │   Add-on    │  │    App      │  │    (iframe/widget)  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                    │            │
│         └────────────────┴────────────────┴────────────────────┘            │
│                                    │                                        │
│                    ┌───────────────┴───────────────┐                        │
│                    │     Client-Side Encryption    │                        │
│                    │   (PHI encrypted before send) │                        │
│                    └───────────────┬───────────────┘                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ HTTPS
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVER (Docker Stack)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │   API Gateway   │───▶│   App Server    │───▶│   PostgreSQL            │  │
│  │    (Traefik)    │    │   (FastAPI)     │    │   (encrypted-at-rest)   │  │
│  └─────────────────┘    └────────┬────────┘    └─────────────────────────┘  │
│                                  │                                          │
│                                  ▼                                          │
│                         ┌─────────────────┐                                 │
│                         │     Ollama      │                                 │
│                         │  (Local LLM)    │                                 │
│                         └─────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Container Architecture (Docker Compose)

```yaml
services:
  traefik:        # Reverse proxy, TLS termination, rate limiting
  api:            # FastAPI application server
  db:             # PostgreSQL with encryption-at-rest
  ollama:         # Self-hosted LLM
  redis:          # Session cache, rate limiting, job queue
  worker:         # Background job processor (Celery/ARQ)
```

### 3.2 Multi-Tenancy Model

**Approach:** Shared database with tenant isolation via `tenant_id` foreign key on all tables.

Each teacher gets:
- Unique `tenant_id` (UUID)
- Isolated data views (row-level security in PostgreSQL)
- Encrypted PHI blob storage (server cannot read plaintext)

Future option: Per-tenant schema or database for enterprise/district deployments.

---

## 4. Data Privacy & Security

### 4.1 PHI Classification

**PHI (Personally Identifiable Information)** includes:
- Student names
- Student IDs
- Roster associations
- Seating positions (when linked to names)
- Any data that could identify a specific student

**Non-PHI** includes:
- Lesson plans, rubrics, bellringer content
- Timer configurations
- Standards/curriculum references
- Anonymous aggregate data

### 4.2 Client-Side Encryption Model

PHI is encrypted in the browser before transmission using **AES-256-GCM**.

```
┌─────────────────────────────────────────────────────────────────┐
│                        KEY DERIVATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Teacher Password ──▶ Argon2id ──▶ Master Key (never sent)    │
│                              │                                  │
│                              ▼                                  │
│                    Key Encryption Key (KEK)                     │
│                              │                                  │
│                              ▼                                  │
│              ┌───────────────┴───────────────┐                  │
│              ▼                               ▼                  │
│     Data Encryption Key (DEK)      Encrypted DEK (stored)      │
│     (held in memory only)          (sent to server)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key points:**
- Master key derived from password, never leaves client
- DEK encrypted by KEK, stored on server
- Server stores only encrypted blobs — cannot decrypt without teacher's password
- Password reset = data loss (by design) unless recovery key is set up

### 4.3 Data Storage Strategy

| Data Type | Storage Location | Encryption |
|-----------|------------------|------------|
| PHI (rosters, names) | PostgreSQL (encrypted blob) | Client-side AES-256-GCM |
| Non-PHI (lessons, rubrics) | PostgreSQL (plaintext) | TLS in transit, at-rest encryption |
| Session tokens | Redis | Server-side, ephemeral |
| File uploads (if any) | Object storage / filesystem | Client-side if PHI, server-side otherwise |

### 4.4 Google Integration (Optional)

Teachers can optionally sync encrypted roster data to their own Google Drive:
- Encrypted blob stored as a file in teacher's Drive
- App requests only `drive.file` scope (access only to files it creates)
- Teacher's Google account = their backup; we never see it

---

## 5. Authentication & Authorization

### 5.1 Authentication Flow

**Primary:** Email + password with Argon2id hashing  
**Optional:** Google OAuth (for convenience, not for data access)  
**Future:** SAML/SSO for district deployments

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Login     │────▶│  Validate   │────▶│  Issue JWT  │
│   (email +  │     │  Password   │     │  + Refresh  │
│   password) │     │  (Argon2id) │     │    Token    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                           ┌───────────────────┘
                           ▼
                    ┌─────────────┐
                    │  Derive KEK │ (client-side, from password)
                    │  Decrypt DEK│
                    │  Unlock PHI │
                    └─────────────┘
```

### 5.2 Authorization Model

**Roles:**
- `teacher` — Standard user, owns their data
- `school_admin` — Can view aggregate (non-PHI) usage stats for their school
- `system_admin` — Platform operations, zero PHI access

**Permissions:** Resource-based (RBAC with resource ownership)

```python
# Example permission check
def can_access_roster(user, roster):
    return roster.tenant_id == user.tenant_id
```

---

## 6. Tool Specifications

### 6.1 Random Group Generator

**Purpose:** Divide a class roster into randomized groups.

**Features:**
- Import roster (manual entry, CSV, or Google Classroom sync)
- Set group size or number of groups
- Exclude absent students
- Lock certain students together or apart
- Save group configurations
- History of past groupings (avoid repeats)

**Data Flow:**
```
Encrypted roster ──▶ Decrypt (client) ──▶ Randomize (client) ──▶ Display
                                                │
                                                ▼
                              Save config (encrypted) ──▶ Server
```

**API Endpoints:**
- `GET /api/rosters` — List encrypted roster blobs
- `POST /api/rosters` — Save encrypted roster
- `GET /api/groups/history` — Retrieve past groupings (encrypted)

---

### 6.2 Seating Chart Editor

**Purpose:** Visual drag-and-drop seating arrangement tool.

**Features:**
- Multiple room layout templates (rows, pods, U-shape, custom)
- Drag-and-drop student placement
- Multiple charts per class
- Print-friendly export
- Randomize seating with constraints

**UI Components:**
- Canvas-based room editor
- Student list sidebar
- Template selector
- Export controls (PDF, PNG, print)

**Data Model:**
```json
{
  "chart_id": "uuid",
  "roster_id": "uuid",
  "layout": {
    "type": "grid",
    "rows": 5,
    "cols": 6,
    "positions": [
      {"seat": "A1", "student_id_encrypted": "..."},
      {"seat": "A2", "student_id_encrypted": "..."}
    ]
  }
}
```

---

### 6.3 Classroom Timers

**Purpose:** Embeddable countdown/count-up timers for activities.

**Features:**
- Countdown and count-up modes
- Preset durations (5 min, 10 min, custom)
- Visual themes (minimal, colorful, progress bar)
- Audio alerts (optional, selectable sounds)
- Fullscreen mode
- Embed modes: iframe, Google Slides add-on, Canva app

**No PHI, No Auth Required** — Timers are stateless utilities.

**Embed Strategy:**
- Standalone URL: `https://tools.example.com/timer?duration=300&theme=minimal`
- Google Slides: Apps Script sidebar/dialog
- Canva: Canva Apps SDK integration

**API:** None required (client-only), unless saving presets:
- `POST /api/timers/presets` — Save named timer configs

---

### 6.4 Random Student Picker

**Purpose:** Fairly select students for participation.

**Features:**
- Weighted randomization (optional: boost students who haven't been picked recently)
- "No repeats until everyone picked" mode
- Visual spinner/animation
- History tracking (encrypted)
- Exclude absent students

**Data Flow:** Same as Group Generator — all PHI decrypted/processed client-side.

---

### 6.5 Bellringer Creator (AI)

**Purpose:** Generate daily warm-up questions/prompts.

**Features:**
- Input: topic, subject, grade level, learning objectives
- Output: 3-5 bellringer options (multiple choice, short answer, discussion prompt)
- Save to library
- Schedule bellringers to calendar

**AI Integration:**
```
User Input ──▶ API ──▶ Ollama (local) ──▶ Generated Content ──▶ Response
```

**Prompt Template:**
```
You are a {grade_level} {subject} teacher. Create a bellringer activity about {topic}.
Learning objective: {objective}
Format: {format_preference}
Difficulty: {difficulty}

Generate 3 options with varying question types.
```

**API Endpoints:**
- `POST /api/bellringers/generate` — Generate new bellringers
- `GET /api/bellringers` — List saved bellringers
- `POST /api/bellringers` — Save to library

---

### 6.6 Lesson Plan Generator (AI)

**Purpose:** Generate standards-aligned lesson plans.

**Features:**
- Input: standards (auto-lookup), topic, duration, grade level
- Output: structured lesson plan (objectives, materials, procedure, assessment)
- Template customization
- Export to Google Docs, PDF, or Markdown

**Standards Integration:**
- Preloaded database of Common Core, state standards
- Search/autocomplete for standards codes
- Map generated content to specific standards

**AI Prompt Strategy:**
```
Create a {duration}-minute lesson plan for {grade_level} {subject}.
Topic: {topic}
Standards addressed: {standards_list}
Include: objectives, materials, warm-up, direct instruction, guided practice, 
         independent practice, assessment, differentiation suggestions.
```

**API Endpoints:**
- `POST /api/lessons/generate` — Generate lesson plan
- `GET /api/standards/search?q=` — Search standards database
- `POST /api/lessons` — Save lesson plan

---

### 6.7 Rubric Builder (AI)

**Purpose:** Generate and customize assessment rubrics.

**Features:**
- Input: assignment description, criteria, point scale
- Output: detailed rubric with level descriptors
- Single-point, analytic, and holistic rubric types
- Edit/refine generated rubrics
- Export to Google Docs, PDF, printable format

**AI Prompt Strategy:**
```
Create a {rubric_type} rubric for the following assignment:
{assignment_description}

Criteria to assess: {criteria_list}
Point scale: {scale} (e.g., 4-point, 100-point)
Grade level: {grade_level}

For each criterion, provide clear descriptors for each performance level.
```

**API Endpoints:**
- `POST /api/rubrics/generate` — Generate rubric
- `PUT /api/rubrics/{id}` — Update/refine rubric
- `GET /api/rubrics` — List saved rubrics

---

## 7. Technology Stack

### 7.1 Backend

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Language | Python 3.12+ | Fast development, strong ML/AI ecosystem |
| Framework | FastAPI | Async, type hints, auto-generated OpenAPI docs |
| Database | PostgreSQL 16 | Robust, row-level security, JSONB for flexible schemas |
| Cache/Queue | Redis | Session storage, rate limiting, job queue backend |
| Task Queue | ARQ (or Celery) | Background jobs for AI generation |
| AI Runtime | Ollama | Self-hosted LLMs, simple HTTP API |

### 7.2 Frontend

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | React 18 + TypeScript | Component reuse, type safety |
| State | Zustand or Jotai | Lightweight, good for encrypted state |
| Styling | Tailwind CSS | Rapid UI development |
| Crypto | Web Crypto API + tweetnacl | Client-side encryption |
| Canvas | Fabric.js or Konva | Seating chart editor |
| Embeds | iframe + postMessage API | Cross-platform embedding |

### 7.3 Infrastructure

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Containers | Docker + Compose | Consistent dev/prod environments |
| Reverse Proxy | Traefik | Auto TLS, routing, rate limiting |
| Secrets | Docker secrets + .env | Secure config management |
| Monitoring | Prometheus + Grafana | Metrics and dashboards |
| Logging | Loki or stdout + rsyslog | Centralized logging |

---

## 8. API Design

### 8.1 Base URL Structure

```
https://api.teachertools.example.com/v1/
```

### 8.2 Authentication Header

```
Authorization: Bearer <jwt_token>
```

### 8.3 Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "timestamp": "ISO8601"
  }
}
```

### 8.4 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

### 8.5 Core Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Authenticate, receive tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/rosters` | List encrypted rosters |
| POST | `/rosters` | Create/update roster |
| GET | `/seating-charts` | List seating charts |
| POST | `/seating-charts` | Save seating chart |
| POST | `/ai/bellringer` | Generate bellringer |
| POST | `/ai/lesson` | Generate lesson plan |
| POST | `/ai/rubric` | Generate rubric |
| GET | `/standards` | Search standards database |

---

## 9. Deployment Strategy

### 9.1 Development Environment

```bash
# Clone and start
git clone https://github.com/yourrepo/teacher-tools.git
cd teacher-tools
cp .env.example .env
docker compose up -d
```

### 9.2 Staging / Multi-Instance Testing

Use Docker Compose profiles to simulate multi-server:

```yaml
# docker-compose.override.yml
services:
  api-tenant-a:
    extends: api
    environment:
      - TENANT_ISOLATION=strict
  
  api-tenant-b:
    extends: api
    environment:
      - TENANT_ISOLATION=strict
```

### 9.3 Production (Dedicated Server)

```
┌─────────────────────────────────────────────────────┐
│              Linode / Dedicated Server              │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐    │
│  │              Docker Host                    │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │ Traefik │ │   API   │ │ Ollama  │       │    │
│  │  └─────────┘ └─────────┘ └─────────┘       │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │Postgres │ │  Redis  │ │ Worker  │       │    │
│  │  └─────────┘ └─────────┘ └─────────┘       │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Minimum Server Specs:**
- 4+ CPU cores (Ollama benefits from more)
- 16GB+ RAM (8GB for Ollama with 7B model)
- 100GB+ SSD
- Ubuntu 22.04 LTS or Fedora Server

---

## 10. Development Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project scaffolding (FastAPI + React)
- [ ] Docker Compose setup
- [ ] Authentication system
- [ ] Client-side encryption library
- [ ] Basic roster management (encrypted CRUD)

### Phase 2: Core Tools (Weeks 5-8)
- [ ] Random Group Generator
- [ ] Random Student Picker
- [ ] Classroom Timers (standalone + embed)
- [ ] Seating Chart Editor (basic)

### Phase 3: AI Integration (Weeks 9-12)
- [ ] Ollama integration
- [ ] Bellringer Creator
- [ ] Lesson Plan Generator
- [ ] Rubric Builder

### Phase 4: Polish & Integrations (Weeks 13-16)
- [ ] Google Slides add-on
- [ ] Google Classroom roster import
- [ ] Standards database integration
- [ ] Export features (PDF, Docs)
- [ ] UI/UX refinement

### Phase 5: Multi-Tenant & Scaling (Ongoing)
- [ ] Onboarding flow
- [ ] School/district admin features
- [ ] Usage analytics (non-PHI)
- [ ] Performance optimization

---

## 11. Security Checklist

- [ ] All PHI encrypted client-side before transmission
- [ ] Server never stores plaintext PHI
- [ ] TLS 1.3 enforced for all connections
- [ ] PostgreSQL encryption-at-rest enabled
- [ ] Rate limiting on all endpoints
- [ ] JWT tokens with short expiry (15 min access, 7 day refresh)
- [ ] CSRF protection on state-changing endpoints
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React escaping + CSP headers)
- [ ] Regular dependency audits
- [ ] Penetration testing before public launch

---

## 12. Open Questions

1. **LLM Model Choice:** Which Ollama model? Llama 3.1 8B for speed, or 70B for quality? May need different models for different tasks.

2. **Offline Mode:** Should teachers be able to use PHI tools offline (local-first with sync)?

3. **Collaboration:** Will teachers ever share rosters/charts with co-teachers? Adds key-sharing complexity.

4. **Mobile:** Native apps eventually, or PWA sufficient?

5. **Standards Database:** Build our own, or integrate with existing API (e.g., Achievement Standards Network)?

---

## 13. Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| PHI | Personally Identifiable Information (student data) |
| DEK | Data Encryption Key (encrypts actual data) |
| KEK | Key Encryption Key (encrypts the DEK) |
| Tenant | A single teacher or organizational unit |
| Bellringer | Short warm-up activity at start of class |

### B. References

- FERPA: https://www2.ed.gov/policy/gen/guid/fpco/ferpa/index.html
- COPPA: https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- Ollama: https://ollama.ai/
- FastAPI: https://fastapi.tiangolo.com/

---

*This is a living document. Update as requirements evolve.*
