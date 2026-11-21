import {
  UserRole,
  Gender,
  FacilityDisplayType,
  SessionType,
  SessionStatus,
  TokenStatus,
  BookingSource,
  PaymentMode,
  PaymentStatus,
  AppointmentStatus,
} from './enums';

// =========================================================================
// Standard API Envelope
// =========================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  error?: {
    code: string;
    details?: unknown;
  };
}

// =========================================================================
// User & Auth Contracts
// =========================================================================

export interface UserDto {
  id: string;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  role: UserRole | `${UserRole}`;
  avatarUrl?: string | null;
  gender?: Gender | `${Gender}` | null;
  dateOfBirth?: string | null;
  organizationId?: string | null;
  clinicId?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;

  // Backwards-compatibility fields for legacy phase 1 template tests
  firstName?: string;
  lastName?: string;
}

// =========================================================================
// Organization & Clinic Contracts
// =========================================================================

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  displayType: FacilityDisplayType | `${FacilityDisplayType}`;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  contactPhone: string;
  contactEmail?: string | null;
  platformFeePercent: number;
  referralCode?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicDto {
  id: string;
  organizationId: string;
  name: string;
  clinicQrSlug: string;
  city: string;
  address: string;
  mapUrl?: string | null;
  images: string[];
  latitude?: number | null;
  longitude?: number | null;
  contactPhone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicOperatingHourDto {
  id: string;
  clinicId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  isOpen: boolean;
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
  breakStartTime?: string | null;
  breakEndTime?: string | null;
}

export interface ClinicHolidayDto {
  id: string;
  clinicId: string;
  date: string; // YYYY-MM-DD
  title: string;
}

export interface DepartmentDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

// =========================================================================
// Doctor & Scheduling Contracts
// =========================================================================

export interface DoctorDto {
  id: string;
  userId: string;
  organizationId: string;
  clinicId: string;
  departmentId?: string | null;
  specialization: string;
  qualifications?: string | null;
  registrationNumber?: string | null;
  experienceYears?: number | null;
  languages: string[];
  about?: string | null;
  avatarUrl?: string | null;
  consultationFee: number;
  defaultSlotDurationMins: number;
  defaultTokenCapacity: number;
  doctorQrSlug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Embedded User Details for client displays
  user?: Partial<UserDto>;
}

export interface DoctorScheduleShiftDto {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  sessionType: SessionType | `${SessionType}`;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  tokenCapacity: number;
  isActive: boolean;
}

export interface DoctorHolidayDto {
  id: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  sessionType?: SessionType | `${SessionType}` | null; // null = Full-Day Leave
  reason?: string | null;
}

// =========================================================================
// Session & Real-Time Queue Contracts
// =========================================================================

export interface SessionDto {
  id: string;
  doctorId: string;
  clinicId: string;
  date: string; // YYYY-MM-DD
  sessionType: SessionType | `${SessionType}`;
  status: SessionStatus | `${SessionStatus}`;
  tokenCapacity: number;
  bookingCutoffAt: string;
  currentServingTokenNumber?: number | null;
  rollingAvgDurationSeconds: number;
  createdAt: string;
  updatedAt: string;

  // Joined relations
  doctor?: Partial<DoctorDto>;
  clinic?: Partial<ClinicDto>;
}

export interface LiveQueueStateDto {
  sessionId: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialization?: string;
  clinicId: string;
  clinicName?: string;
  sessionType: SessionType | `${SessionType}`;
  status: SessionStatus | `${SessionStatus}`;
  currentServingTokenNumber: number;
  totalWaitingTokens: number;
  estimatedWaitMinutes: number;
  estimatedWaitRange: string; // e.g. "15 - 25 mins"
  lastCalledAt?: string | null;
}

// =========================================================================
// Token & Consultation Contracts
// =========================================================================

export interface TokenDto {
  id: string;
  universalTrackingId: string;
  tokenNumber: number;
  sessionId: string;
  doctorId: string;
  clinicId: string;
  patientUserId?: string | null;
  patientPhone: string;
  patientName: string;
  source: BookingSource | `${BookingSource}`;
  status: TokenStatus | `${TokenStatus}`;
  holdCount: number;
  calledAt?: string | null;
  checkupStartedAt?: string | null;
  checkupCompletedAt?: string | null;
  consultationDurationSeconds?: number | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;

  // Joined relations
  session?: Partial<SessionDto>;
  payment?: Partial<PaymentDto>;
  consultationNote?: Partial<ConsultationNoteDto>;
}

export interface PaymentDto {
  id: string;
  tokenId: string;
  consultationFee: number;
  platformFee: number;
  totalAmount: number;
  mode: PaymentMode | `${PaymentMode}`;
  status: PaymentStatus | `${PaymentStatus}`;
  gatewayTxnId?: string | null;
  collectedByUserId?: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItemDto {
  medicineName: string;
  dosage: string; // e.g. "500mg"
  frequency: string; // e.g. "1-0-1 (After Food)"
  durationDays: number;
  instructions?: string;
}

export interface ConsultationNoteDto {
  id: string;
  tokenId: string;
  doctorId: string;
  diagnosis?: string | null;
  prescriptions?: PrescriptionItemDto[] | null;
  recommendedTests: string[];
  treatmentInstructions?: string | null;
  followUpDate?: string | null; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// Onboarding Partner Contracts
// =========================================================================

export interface OnboardingPartnerDto {
  id: string;
  userId?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  referralCode: string;
  referredByPartnerId?: string | null;
  commissionPercentage: number;
  overrideCommissionPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// Backwards Compatibility for Template Test Fixtures
// =========================================================================

export interface AppointmentDto {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: AppointmentStatus | `${AppointmentStatus}`;
  notes?: string;
}
