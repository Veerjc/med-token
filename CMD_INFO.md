# CMD_INFO.md — Monorepo Command Reference & Cheat Sheet

This document is the central reference for all commands to run, build, test, lint, and manage applications and libraries in the `medical-proj` monorepo.

---

## 1. Quick Start: Daily Development

| Command                 | Action                                | URL / Environment        |
| :---------------------- | :------------------------------------ | :----------------------- |
| `npm run dev:api`       | Starts the NestJS API server          | `http://localhost:3000`  |
| `npm run dev:web`       | Starts the Angular Web Portal         | `http://localhost:4200`  |
| `npm run dev:mobile`    | Starts the Mobile App in browser      | `http://localhost:4201`  |
| `npm run dev:frontends` | Starts Web & Mobile concurrently      | Ports `4200` and `4201`  |
| `npm run dev:all`       | Starts API, Web & Mobile concurrently | Ports `3000, 4200, 4201` |

### Alternative direct Nx commands:

```bash
npx nx serve api
npx nx serve web
npx nx serve mobile
# Serve on custom port:
npx nx serve api --port=3333
npx nx serve web --port=4300
```

---

## 2. Build Commands

### Build All Projects

```bash
# Using root script
npm run build:all

# Direct Nx command
CI=true npx nx run-many -t build
```

### Build Individual Projects

```bash
# Build NestJS Backend (Webpack bundle in dist/apps/api)
npx nx build api

# Build Angular Web Portal (Production ESBuild bundle in dist/apps/web)
npx nx build web

# Build Angular Mobile App (Output in dist/apps/mobile/browser)
npx nx build mobile
```

### Build Only Affected Projects (Git PR / CI)

```bash
# Builds only projects changed compared to main branch
npx nx affected -t build
```

### Docker Container Build (NestJS Backend API)

```bash
# Using root script
npm run docker:build:api

# Direct docker command
docker build -f apps/api/Dockerfile -t medical-api:latest .
```

### Docker Compose Commands

#### Option A: Run Full Application in Docker (API + PostgreSQL + Redis)

```bash
# Build & start full application stack in background
npm run docker:all:up

# View live container logs
npm run docker:all:logs

# Stop all containers
npm run docker:all:down
```

#### Option B: Run Databases Only (PostgreSQL + Redis) for Native App Development

```bash
# Start PostgreSQL & Redis in the background
npm run docker:db:up

# Run apps natively with hot-reload:
npm run dev:all
```

---

## 3. Test Commands (Unit Testing with Jest)

### Run All Unit Tests

```bash
# Using root script (non-interactive, CI-safe)
npm run test:all

# Direct Nx command
CI=true npx nx run-many -t test
```

### Run Tests for Individual Projects

```bash
# Backend unit tests
CI=true npx nx test api

# Web unit tests
CI=true npx nx test web

# Mobile unit tests
CI=true npx nx test mobile
```

### Run Tests in Watch Mode (Interactive for TDD)

```bash
npx nx test api --watch
npx nx test web --watch
npx nx test mobile --watch
```

### Generate Code Coverage Reports

```bash
# Generates coverage reports in coverage/apps/*
CI=true npx nx run-many -t test --coverage
```

---

## 4. Lint Commands (ESLint)

### Lint All Projects

```bash
# Using root script
npm run lint:all

# Direct Nx command
CI=true npx nx run-many -t lint
```

### Lint Individual Projects

```bash
npx nx lint api
npx nx lint web
npx nx lint mobile
npx nx lint shared-models
```

### Auto-Fix Lint Errors

```bash
# Auto-fixes fixable rules across the entire workspace
CI=true npx nx run-many -t lint --fix
```

---

## 5. Code Formatting & Quality Gates (Prettier & Git Hooks)

### Format Check & Write

```bash
# Check code formatting with Prettier
npm run format:check

# Format and write fixes across all files with Prettier
npm run format:write
```

### Git Hooks (Husky & lint-staged & Commitlint)

- **Pre-commit**: Automatically runs `lint-staged` on staged files before each commit. Staged code is auto-formatted with Prettier and checked/fixed with ESLint.
- **Commit-msg**: Automatically validates commit messages using Commitlint and Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.).
- **Manual Hook Testing**:
  ```bash
  # Test lint-staged manually:
  npx lint-staged

  # Test commitlint on a string:
  echo "feat: add patient record module" | npx commitlint
  ```

---

## 6. Mobile Commands (Ionic & Capacitor)

### Sync Web Assets to Native iOS & Android

Run this every time you modify the mobile application code before testing on a device:

```bash
# Builds mobile app and syncs native assets
npm run mobile:sync

# Or manually:
npx nx build mobile
cd apps/mobile && npx cap sync && cd ../..
```

### Open Native IDEs

```bash
# Open Xcode for iOS native development & simulator
npm run mobile:ios
# Or: cd apps/mobile && npx cap open ios

# Open Android Studio for Android emulator & APK builds
npm run mobile:android
# Or: cd apps/mobile && npx cap open android
```

### Run on Connected Device / Simulator from Terminal

```bash
# iOS simulator
cd apps/mobile && npx cap run ios

# Android emulator or connected USB device
cd apps/mobile && npx cap run android
```

---

## 6. End-to-End (E2E) Testing Commands

When Playwright or Cypress E2E suites are configured:

```bash
# Run all E2E test suites
npx nx run-many -t e2e

# Run Web E2E tests
npx nx e2e web-e2e

# Run Web E2E tests in UI mode (Interactive browser preview)
npx nx e2e web-e2e --ui

# Run Mobile E2E tests
npx nx e2e mobile-e2e
```

### Add a New Playwright E2E Project

```bash
# Add Playwright E2E target for an existing app
npx nx g @nx/playwright:configuration --project=web
```

---

## 7. Code Generation Cheat Sheet (Nx Generators)

### Backend (NestJS) Generators

```bash
# Generate a new Feature Module inside apps/api
npx nx g @nx/nest:module auth --directory=apps/api/src/app/auth

# Generate a Controller
npx nx g @nx/nest:controller auth --directory=apps/api/src/app/auth

# Generate a Service
npx nx g @nx/nest:service auth --directory=apps/api/src/app/auth
```

### Web (Angular) Generators

```bash
# Generate a Standalone Component in apps/web
npx nx g @nx/angular:component features/patients/patient-list --project=web

# Generate an Angular Service
npx nx g @nx/angular:service core/services/auth --project=web

# Generate an Angular Route/Guard
npx nx g @nx/angular:guard core/guards/auth --project=web
```

### Mobile (Angular + Ionic) Generators

```bash
# Generate a Mobile Page/Component
npx nx g @nx/angular:component pages/appointments --project=mobile
```

### Shared Monorepo Library Generators

```bash
# Generate a new Shared TypeScript Library (e.g., for API Clients)
npx nx g @nx/js:library shared-data-access --directory=libs/shared/data-access --bundler=none --unitTestRunner=none --linter=eslint

# Generate a Shared Angular UI Component Library
npx nx g @nx/angular:library shared-ui --directory=libs/shared/ui --standalone=true
```

---

## 8. Monorepo Inspection & Utility Commands

| Command                      | Action                                                                          |
| :--------------------------- | :------------------------------------------------------------------------------ |
| `npx nx graph`               | Opens an interactive 3D/2D visual graph of all apps and dependencies in browser |
| `npx nx show projects`       | Lists all projects configured in the workspace                                  |
| `npx nx show project api`    | Inspects all targets, configurations, and paths for `api`                       |
| `npx nx show project web`    | Inspects all targets, configurations, and paths for `web`                       |
| `npx nx show project mobile` | Inspects all targets, configurations, and paths for `mobile`                    |
| `npx nx reset`               | Clears the Nx daemon and cache if builds feel out-of-sync                       |
