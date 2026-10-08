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
