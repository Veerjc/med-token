export type UserRole = 'DOCTOR' | 'PATIENT' | 'ADMIN';

export interface UserDto {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface AppointmentDto {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}
