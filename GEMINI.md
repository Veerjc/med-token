# GEMINI.md - Workspace Instructions & Project Protocol

## 1. Project Overview & Tech Stack
This workspace is a production-grade, full-stack medical and healthcare platform organized as an **Nx Integrated Monorepo**.

- **Monorepo Engine**: Nx (latest, integrated apps & libs architecture)
- **Backend**: NestJS (TypeScript, Modular Architecture, REST APIs, WebSockets)
- **Web Frontend**: Angular (Latest standalone components, Signals, Zoneless, SCSS)
- **Mobile Frontend**: Angular (Latest) + Ionic Framework UI + Capacitor (iOS & Android native targets)
- **Shared Code**: Nx TypeScript libraries (`libs/shared/*`) for DTOs, interfaces, and API contracts
- **Package Manager**: npm

---

## 2. Session Protocol for Gemini / Antigravity

Whenever a new session starts:
1. **Always read `PROJECT_STATE.md` first**:
   - Check the **Current Phase**, **Active Task**, and **Immediate Next Steps**.
   - Announce the current project status and confirm the next prioritized task before executing.
2. **Follow Architectural Boundaries**:
   - Web (`apps/web`) and Mobile (`apps/mobile`) must **never** import backend code (`apps/api`).
   - Shared data structures, DTOs, and enums **must** reside in `libs/shared/models`.
   - Never import relative paths across apps (e.g. `../../apps/api`). Always use mapped library paths (e.g. `@medical-proj/shared-models`).
3. **Task Completion Rule**:
   - After completing any significant task, update `PROJECT_STATE.md` (check off completed items, log recent activity with timestamp, and set the next active task).
4. **Backtrack Logging Rule**:
   - Whenever executing commands, installing dependencies, running generators, or creating/modifying files, record the exact command, purpose, and outcome in `BACKTRACK.md` under the current Day/Date.

---

## 3. Engineering Standards & Conventions

### Angular & Ionic (Web & Mobile)
- **Architecture**: 100% Standalone components, directives, and pipes (no legacy `NgModule`).
- **Reactivity**: Prefer Angular **Signals** (`signal()`, `computed()`, `input()`, `output()`) for state.
- **Change Detection**: Aim for Zoneless-ready architecture (`ChangeDetectionStrategy.OnPush` where applicable).
- **Styling**: SCSS using standard design tokens, CSS variables, and Ionic styling conventions.
- **Mobile Optimization**:
  - Virtualize long lists with `@angular/cdk/scrolling` or Ionic virtual scroll.
  - Animate only `transform` and `opacity` for hardware acceleration.
  - Use native Capacitor plugins for device hardware (Haptics, Storage, Biometrics, Camera).

### NestJS (Backend)
- **Architecture**: Feature modules, Controllers, Services, and Repositories.
- **Validation**: Strict DTO validation using `class-validator` and `class-transformer`.
- **API Documentation**: OpenAPI / Swagger decorators on all endpoints.
- **Error Handling**: Standardized HTTP exception filters with structured error responses.

### Code Sharing & Monorepo
- **Libraries Directory Structure**:
  - `libs/shared/models`: Plain TypeScript interfaces, DTOs, enums (no platform-specific dependencies).
  - `libs/shared/data-access`: Shared API services and state management.
  - `libs/shared/ui`: Reusable UI components shared across Web and Mobile.

---

## 4. Git & Workflow Conventions
- **Commit Messages**: Follow Conventional Commits:
  - `feat:` New features
  - `fix:` Bug fixes
  - `chore:` Tooling, dependencies, setup
  - `refactor:` Code improvements without behavioral changes
  - `ci:` CI/CD pipeline changes
  - `docs:` Documentation updates
- **Nx Commands**:
  - Use `nx affected:build`, `nx affected:test`, `nx affected:lint` for fast PR verification.
