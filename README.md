
```markdown
# CortexOS

### AI-Powered Second Brain for Knowledge, Tasks, Projects & Decisions

CortexOS is a full-stack AI-powered personal knowledge management system designed to act as a digital second brain.

It brings notes, documents, tasks, projects, memories, decisions, research, reasoning, and relationships between knowledge into a single workspace.

The system combines a modern React interface, a Node.js backend, PostgreSQL persistence, Clerk authentication, and a locally hosted Qwen3 LLM through Ollama.

---

## ✨ Features

### 🧠 Knowledge Management
- Create and manage notes
- Store and manage documents
- Persistent memory entries
- Organize knowledge across projects and topics

### ✅ Task & Project Management
- Create, update, and delete tasks
- Track task status
- Create and manage projects
- Associate work with your broader knowledge base

### 💭 AI Chat
- AI-powered conversations
- Persistent conversation history
- Local LLM integration through Ollama
- Qwen3 8B for AI responses

### 🔎 Research & Reasoning
- Research workflows
- AI reasoning runs
- Decision analysis
- Multi-agent style AI workflows

### 🕸️ Knowledge Graph
- Knowledge nodes and relationships
- Graph-based representation of connected information
- Graph visualization
- Relationship tracking between knowledge entities

### ⚠️ Contradiction Detection
- Track potentially conflicting information
- Detect and manage contradictions within the knowledge base

### 📊 Analytics & Knowledge Health
- Knowledge growth tracking
- Activity trends
- Knowledge coverage
- Consistency monitoring
- Freshness monitoring
- Connectivity analysis

### 🔐 Authentication
- User authentication powered by Clerk
- Protected backend API routes
- User-specific application data

---

## 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │      CortexOS UI     │
                         │   React + Vite + TS  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     REST API         │
                         │   Node.js + Express  │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
        ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
        │  PostgreSQL    │ │    Clerk       │ │  Ollama +      │
        │  + Drizzle ORM │ │ Authentication │ │  Qwen3 8B      │
        └────────────────┘ └────────────────┘ └────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- TanStack Query

### Backend
- Node.js
- Express
- TypeScript
- REST APIs

### Database
- PostgreSQL
- Drizzle ORM

### Authentication
- Clerk

### AI
- Ollama
- Qwen3 8B
- OpenAI-compatible API interface

### Development
- pnpm
- Git
- GitHub

---

## 📁 Project Structure

```text
cortexos-x/
│
├── artifacts/
│   ├── cortexos/                 # React frontend
│   └── api-server/               # Node.js API server
│
├── lib/
│   ├── db/                       # PostgreSQL + Drizzle schema
│   ├── api-spec/                 # OpenAPI specification
│   ├── api-zod/                  # API validation/types
│   ├── api-client-react/         # React API client
│   └── integrations/             # AI integrations
│
├── scripts/
│
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Yuvaraj7777/Cortexos.git
cd Cortexos
```

### 2. Install dependencies

```bash
pnpm install
```

If pnpm is not installed:

```bash
npm install -g pnpm
```

---

## 🔐 Environment Variables

Create the required environment files based on the configuration used by the API server.

Example:

```env
PORT=8080

DATABASE_URL=your_postgresql_connection_string

CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

AI_INTEGRATIONS_OPENAI_BASE_URL=http://localhost:11434/v1
AI_INTEGRATIONS_OPENAI_API_KEY=ollama

LOG_LEVEL=info
```

> Never commit `.env` files or API keys to GitHub.

---

## 🤖 Local AI with Ollama

CortexOS can run AI locally without requiring a paid OpenAI API subscription.

Install Ollama and pull the Qwen3 model:

```bash
ollama pull qwen3:8b
```

Start Ollama:

```bash
ollama run qwen3:8b
```

The application uses the OpenAI-compatible Ollama endpoint:

```text
http://localhost:11434/v1
```

---

## 🗄️ Database Setup

CortexOS uses PostgreSQL with Drizzle ORM.

After configuring `DATABASE_URL`, push the database schema using the project's Drizzle configuration.

```bash
pnpm drizzle-kit push
```

The database contains entities for areas such as:

- Conversations
- Messages
- Notes
- Documents
- Tasks
- Projects
- Memories
- Decisions
- Contradictions
- Knowledge Graph
- Research Runs
- Reasoning Runs

---

## ▶️ Running the Application

### Start the backend

```bash
npx pnpm --filter @workspace/api-server dev
```

The API server runs on:

```text
http://localhost:8080
```

### Start the frontend

Open another terminal:

```bash
npx pnpm --filter @workspace/cortexos dev
```

The frontend runs on:

```text
http://localhost:5173
```

---

## 🧩 Core Modules

| Module | Purpose |
|---|---|
| Dashboard | Overview of knowledge and system health |
| Notes | Capture and manage knowledge |
| Documents | Store and manage documents |
| Tasks | Track work and task progress |
| Projects | Organize work into projects |
| Memory | Persistent knowledge storage |
| Decisions | Record and analyze decisions |
| Research | AI-assisted research workflows |
| Reasoning | AI reasoning workflows |
| Knowledge Graph | Visualize relationships between knowledge |
| Contradictions | Track conflicting information |
| Chat | Interact with the AI assistant |
| Analytics | Monitor knowledge growth and health |

---

## 🎯 Project Goals

CortexOS is designed around the idea that personal information should not remain isolated across separate applications.

Instead, information can be connected across:

```text
Notes
  ↓
Documents
  ↓
Projects
  ↓
Tasks
  ↓
Decisions
  ↓
Memory
  ↓
Knowledge Graph
  ↓
AI Reasoning
```

The goal is to create a unified workspace where stored information becomes increasingly useful as more knowledge is added.

---

## 🔮 Future Improvements

Potential areas for future development include:

- More advanced semantic search
- Improved document understanding
- Automated knowledge extraction
- More sophisticated graph-based retrieval
- Better long-term memory management
- Additional local LLM support
- Improved AI-assisted decision making

---

## 📌 Project Status

CortexOS is an actively developed full-stack project demonstrating:

- Full-stack application development
- REST API design
- Database architecture
- Authentication
- AI/LLM integration
- Knowledge graph concepts
- Data visualization
- Modern React development

---

## 👨‍💻 Author

**Yuvaraj**

Information Science Engineering Student

GitHub:  
https://github.com/Yuvaraj7777

---

## 📄 License

This project is currently intended as a personal/portfolio project.
```
