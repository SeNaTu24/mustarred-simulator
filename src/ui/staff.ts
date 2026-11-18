/**
 * Mustarred Company Simulator - Cast and company profile
 *
 * The player is not "the CEO". Mustarred is a Lagos company: the Managing
 * Director sets direction, department heads own their desks, and the player
 * chairs the morning as Chief Compliance Officer. One place for those names so
 * the office, the briefings and the memos never drift apart.
 */

export type StaffDepartment = 'IT' | 'HR' | 'FINANCE' | 'LEGAL' | 'COMPLIANCE';

export interface StaffProfile {
  readonly name: string;
  /** First name, used where a full name would read stiff. */
  readonly short: string;
  readonly role: string;
  readonly initials: string;
  readonly color: string;
  readonly department: StaffDepartment;
}

export const COMPANY = {
  name: 'Mustarred',
  legalName: 'Mustarred Ltd',
  city: 'Lekki Phase 1, Lagos',
  md: 'Mrs. Folake Adebayo',
} as const;

/** The person the player controls. */
export const PLAYER: StaffProfile = {
  name: 'Amaka Obi',
  short: 'Amaka',
  role: 'Chief Compliance Officer',
  initials: 'AO',
  color: '#f472b6',
  department: 'COMPLIANCE',
};

export const STAFF = {
  IT: {
    name: 'Tunde Bello',
    short: 'Tunde',
    role: 'Head of IT',
    initials: 'TB',
    color: '#38bdf8',
    department: 'IT',
  },
  HR: {
    name: 'Ngozi Okafor',
    short: 'Ngozi',
    role: 'Head of People',
    initials: 'NO',
    color: '#34d399',
    department: 'HR',
  },
  FINANCE: {
    name: 'Chinedu Eze',
    short: 'Chinedu',
    role: 'Finance Manager',
    initials: 'CE',
    color: '#f59e0b',
    department: 'FINANCE',
  },
  LEGAL: {
    name: 'Funmi Adeyemi',
    short: 'Funmi',
    role: 'Company Secretary',
    initials: 'FA',
    color: '#a78bfa',
    department: 'LEGAL',
  },
} as const satisfies Record<string, StaffProfile>;

export type StaffKey = keyof typeof STAFF;

export const DEPARTMENT_LABEL: Record<StaffKey, string> = {
  IT: 'IT',
  HR: 'People',
  FINANCE: 'Finance',
  LEGAL: 'Legal',
};

/** The staff member who owns a desk, tolerant of ids coming from the engine. */
export function staffForDepartment(department: string): StaffProfile {
  const key = String(department).toUpperCase();
  if (key === 'IT' || key === 'HR' || key === 'FINANCE' || key === 'LEGAL') {
    return STAFF[key];
  }
  return STAFF.IT;
}

export function departmentLabel(department: string): string {
  const key = String(department).toUpperCase();
  if (key === 'IT' || key === 'HR' || key === 'FINANCE' || key === 'LEGAL') {
    return DEPARTMENT_LABEL[key];
  }
  return department;
}
