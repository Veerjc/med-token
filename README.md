# MedToken — Full-Stack Healthcare & Patient Queue Monorepo

[![CI / PR Quality Gates](https://github.com/Veerjc/med-token/actions/workflows/ci.yml/badge.svg)](https://github.com/Veerjc/med-token/actions/workflows/ci.yml)
[![Nx Integrated Monorepo](https://img.shields.io/badge/Nx-v24.0.2-blue?logo=nx)](https://nx.dev)
[![NestJS Backend](https://img.shields.io/badge/NestJS-v11.0-red?logo=nestjs)](https://nestjs.com)
[![Angular Web](https://img.shields.io/badge/Angular-v22.2-crimson?logo=angular)](https://angular.dev)
[![Ionic + Capacitor](https://img.shields.io/badge/Ionic%20%2B%20Capacitor-iOS%20%26%20Android-3880ff?logo=ionic)](https://capacitorjs.com)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

Production-grade medical clinic management, patient portal, and real-time appointment/OPD queue token platform architected as an **Nx Integrated Monorepo**.

---

## 🏥 Architecture Overview

```
medical-proj/
├── apps/
│   ├── api/             # NestJS 11 Backend API Gateway & Microservices
│   ├── web/             # Angular 22 Web Clinic & Doctor Portal (Standalone, Signals)
│   └── mobile/          # Angular 22 + Ionic 9 + Capacitor 8 (iOS & Android)
├── libs/
│   └── shared/
│       └── models/      # Cross-platform TypeScript DTOs, Enums & Interfaces
├── .github/workflows/   # CI/CD Quality Gates (Nx Affected PR Validation)
├── docker-compose.yml   # Local PostgreSQL 16 & Redis 7 Infrastructure
└── .husky/              # Git Hooks (lint-staged Pre-commit & Commitlint)
```

---

## ⚡ Tech Stack & Cloud Infrastructure

- **Monorepo Manager**: Nx Integrated Workspace (v24.0.2)
- **Backend**: NestJS 11 (Modular architecture, OpenAPI/Swagger, `@nestjs/config` + Joi validation)
- **Web Frontend**: Angular 22 (100% Standalone components, Signals, SCSS, Zoneless-ready)
- **Mobile Frontend**: Angular 22 + Ionic Framework UI + Capacitor 8 (iOS Xcode & Android Gradle native targets)
- **Shared Code**: `@medical-proj/shared-models` (Zero-dependency pure TypeScript models)
- **Database & Cache**: PostgreSQL 16 & Redis 7 (via Docker Compose locally)
- **Cloud Target (ADR-006)**: **Amazon Web Services (AWS)**
  - **API**: AWS ECS Fargate (Serverless Docker containers)
  - **Web**: Amazon CloudFront CDN + S3 SPA bucket
  - **Database**: Amazon RDS PostgreSQL 16 (Multi-AZ, KMS encrypted)
  - **Cache & Real-time Queue**: Amazon ElastiCache for Redis
  - **Documents / Scans**: Amazon S3 with SSE-KMS and presigned URLs

---

## 🚀 Quick Start: Local Development

### 1. Prerequisites

- **Node.js**: `v22.x`
- **npm**: `v10.x`
- **Docker & Docker Compose** (for PostgreSQL & Redis)

### 2. Installation & Setup

```bash
# Clone the repository
git clone https://github.com/Veerjc/med-token.git
cd med-token/medical-proj

# Install all dependencies
npm install

# Setup local environment variables
cp .env.example .env
```

### 3. Start Local Infrastructure (PostgreSQL & Redis)

```bash
npm run docker:db:up
```

### 4. Run Applications Concurrently

```bash
# Run all 3 applications simultaneously:
npm run dev:all

# Or run individual applications:
npm run dev:api     # http://localhost:3000/api
npm run dev:web     # http://localhost:4200
npm run dev:mobile  # http://localhost:4201
```

---

## 🛠️ Verification & Quality Gates

This repository enforces strict automated quality gates locally via **Husky** and remotely via **GitHub Actions**:

```bash
# Verify code formatting across entire workspace
npm run format:check

# Auto-fix code formatting with Prettier
npm run format:write

# Run ESLint across all projects
npm run lint:all

# Run Jest unit test suites
npm run test:all

# Build all applications for production
npm run build:all
```

---

## 📱 Mobile Development (Ionic + Capacitor)

```bash
# Build mobile web assets and sync to native iOS & Android projects:
npm run mobile:sync

# Open native iOS project in Xcode (macOS only):
npm run mobile:ios

# Open native Android project in Android Studio:
npm run mobile:android
```

---

## 📖 Governance & Documentation

- [PROJECT_STATE.md](PROJECT_STATE.md) — Living project status, active phase, and master roadmap.
- [ARCHITECTURE.md](ARCHITECTURE.md) — System boundaries, data flow, and AWS deployment topology.
- [CMD_INFO.md](CMD_INFO.md) — Central command reference and developer cheat sheet.
- [BACKTRACK.md](BACKTRACK.md) — Chronological execution audit log of all commands and changes.
- [GEMINI.md](GEMINI.md) — Coding conventions, architectural rules, and session protocols.
