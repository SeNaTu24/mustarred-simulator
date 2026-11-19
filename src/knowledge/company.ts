/**
 * Mustarred Company Simulator - Enterprise & Department Knowledge
 *
 * Populates company-level information and departmental responsibilities
 * strictly grounded in the active SCENARIO_MONDAY_MORNING and staff registry.
 *
 * Reuses existing definitions from src/ui/staff.ts without duplicate narrative strings.
 */

import { COMPANY } from '../ui/staff.ts';
import type { CompanyKnowledge, DepartmentKnowledge } from './types.ts';

export const IT_DEPARTMENT_KNOWLEDGE: DepartmentKnowledge = {
  id: 'IT',
  name: 'Information Technology',
  headId: 'tunde-bello',
  primaryResponsibilities: [
    'Corporate network and perimeter infrastructure security',
    'Email gateway configuration, domain filtering, and malicious message quarantine',
    'Active Directory user accounts and corporate credential lifecycle',
    'Session token revocation, password resets, and endpoint telemetry',
  ],
  systemsOwned: [
    'Edge perimeter gateway & mail filter',
    'Active Directory / Identity provider',
    'Corporate email infrastructure',
    'Workstation terminal inspection console',
  ],
};

export const HR_DEPARTMENT_KNOWLEDGE: DepartmentKnowledge = {
  id: 'HR',
  name: 'Human Resources & People Operations',
  headId: 'ngozi-okafor',
  primaryResponsibilities: [
    'Staff welfare, workplace relations, and grievance resolution',
    'Employee Handbook enforcement and formal disciplinary panels',
    'Witness statement documentation and fair hearing processes',
  ],
  systemsOwned: [
    'Employee personnel records',
    'Mustarred Employee Handbook',
  ],
};

export const FINANCE_DEPARTMENT_KNOWLEDGE: DepartmentKnowledge = {
  id: 'FINANCE',
  name: 'Finance & Treasury',
  headId: 'chinedu-eze',
  primaryResponsibilities: [
    'Treasury operations, liquid working capital, and debt obligations',
    'Accounts payable, vendor invoice processing, and payment authorizations',
    'Commercial procurement agreements and vendor onboarding',
  ],
  systemsOwned: [
    'Vendor payment console',
    'Treasury bank accounts',
  ],
};

export const LEGAL_DEPARTMENT_KNOWLEDGE: DepartmentKnowledge = {
  id: 'LEGAL',
  name: 'Legal & Regulatory Compliance',
  headId: 'funmi-adeyemi',
  primaryResponsibilities: [
    'Commercial contract review, contractual risk analysis, and termination penalties',
    'Regulatory compliance, personal data breach registers, and statutory disclosure duties',
    'Corporate governance and external client advisory',
  ],
  systemsOwned: [
    'Compliance breach register',
    'Corporate contracts archive',
  ],
};

export const COMPANY_KNOWLEDGE: CompanyKnowledge = {
  name: COMPANY.name,
  legalName: COMPANY.legalName,
  city: COMPANY.city,
  md: COMPANY.md,
  departments: [
    IT_DEPARTMENT_KNOWLEDGE,
    HR_DEPARTMENT_KNOWLEDGE,
    FINANCE_DEPARTMENT_KNOWLEDGE,
    LEGAL_DEPARTMENT_KNOWLEDGE,
  ],
};
