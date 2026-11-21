# @medical-proj/shared-models

Pure TypeScript library providing shared Data Transfer Objects (DTOs), interfaces, types, and enums across all applications in the `medical-proj` monorepo.

---

## 🏛️ Architectural Rule

> [!IMPORTANT]
> This library must remain **100% pure TypeScript** with **zero runtime dependencies** on NestJS, Angular, Ionic, or Capacitor.
> Both `apps/api`, `apps/web`, and `apps/mobile` import from this library to maintain single-source-of-truth contracts.

---

## 📦 Exported Contracts

### 1. `UserDto` & `UserRole`

Represents system actors across backend and frontend clients:

- `id`: string
- `email`: string
- `firstName`: string
- `lastName`: string
- `role`: `'PATIENT' | 'DOCTOR' | 'ADMIN' | 'RECEPTIONIST'`
- `createdAt`: Date

### 2. `AppointmentDto` & `AppointmentStatus`

Core appointment and clinic consultation model:

- `id`: string
- `patientId`: string
- `doctorId`: string
- `scheduledAt`: Date
- `status`: `'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'`
- `notes`?: string

### 3. `ApiResponse<T>`

Standardized HTTP response envelope:

- `success`: boolean
- `data`: `T`
- `message`?: string
- `timestamp`: string

---

## 🚀 Usage in Applications

```typescript
// In NestJS controller, Angular component, or Mobile page:
import { ApiResponse, UserDto, UserRole, AppointmentDto } from '@medical-proj/shared-models';
```
