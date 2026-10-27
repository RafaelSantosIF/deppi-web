export type PermissionSlug = string;

export type ApiResponse<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string | Record<string, unknown> };

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: PermissionSlug[];
};

export type Session = {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
};

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  personalEmail: string | null;
  institutionalPhones: string[];
  personalPhones: string[];
  role: { id: number; name: string };
  photoId: string | null;
  personalData: { cpf: string; fullName: string; address: string } | null;
};

export type DashboardData = {
  summary: {
    totalUsers: number;
    totalCourses: number;
    totalTeamMembers: number;
    activeCourses: number;
    finishedCourses: number;
    totalEnrollments?: number;
    totalInstitutions: number;
    remainingVacancies?: number;
  };
  charts: {
    usersByRole: { role: string; total: number }[];
    enrollmentsByCourse: {
      courseId: number;
      title: string;
      enrolled: number;
      maxBeneficiaries: number;
    }[];
    enrollmentsByStatus?: { status: string; total: number }[];
    coursesByStatus?: { status: string; total: number }[];
  };
  recentActivity: {
    id: number;
    description: string;
    createdAt: string;
    course: { id: number; title: string };
  }[];
};

export type CourseSummary = {
  id: number;
  title: string;
  campus: string;
  status: string;
  actionType: string;
  startDate: string;
  endDateEstimated: string;
  executionHours: number;
  maxBeneficiaries: number;
  _count?: { teamMembers: number };
};

export type EnrollmentSummary = {
  id: number;
  status: string;
  documents: { id: string }[];
  course: { id: number; title: string; status: string };
};

export type PermissionRecord = {
  id: number;
  name: string;
  slug?: string;
  description?: string;
};

export type RoleRecord = {
  id: number;
  name: string;
  permissions: PermissionRecord[];
};

export type ManagedUser = {
  id: number;
  name: string;
  email: string;
  personalEmail?: string | null;
  institutionalPhones?: string[];
  personalPhones?: string[];
  role: { id: number; name: string } | string;
};

