// =========================================================================
// MedToken Domain Enums — Healthcare Queue & Token Platform
// Source: TECH_SPEC.md & context.md
// =========================================================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ONBOARDING_PARTNER = 'ONBOARDING_PARTNER',
  CLINIC_ADMIN = 'CLINIC_ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PATIENT = 'PATIENT',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum OrganizationType {
  SOLO_CLINIC = 'SOLO_CLINIC',
  POLYCLINIC = 'POLYCLINIC',
  HOSPITAL = 'HOSPITAL',
}

export enum FacilityDisplayType {
  CLINIC = 'CLINIC',
  HOSPITAL = 'HOSPITAL',
  BRANCH = 'BRANCH',
}

export enum SessionType {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
}

export enum SessionStatus {
  NOT_ARRIVED = 'NOT_ARRIVED',
  ARRIVED = 'ARRIVED',
  OPD_STARTED = 'OPD_STARTED',
  LUNCH_BREAK = 'LUNCH_BREAK',
  ON_ROUNDS = 'ON_ROUNDS',
  EMERGENCY_DUTY = 'EMERGENCY_DUTY',
  CLOSED = 'CLOSED',
}

export enum TokenStatus {
  BOOKED = 'BOOKED',
  CALLED = 'CALLED',
  SERVING = 'SERVING',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum BookingSource {
  ONLINE_QR = 'ONLINE_QR',
  RECEPTION_WALK_IN = 'RECEPTION_WALK_IN',
}

export enum PaymentMode {
  ONLINE_GATEWAY = 'ONLINE_GATEWAY',
  COUNTER_CASH = 'COUNTER_CASH',
  COUNTER_UPI = 'COUNTER_UPI',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

// Backwards-compatibility alias for initial template test fixtures
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
