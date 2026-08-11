export const COMPANY_PERMISSIONS = [
  'ADMIN',
  'MANAGE_COMPANY',
  'MANAGE_SETTINGS',
  'MANAGE_ROLES',
  'MANAGE_MEMBERS',
  'MANAGE_SALARY',
  'INVITE_MEMBERS',
  'SEND_MESSAGES',
] as const;

export type CompanyPermission = (typeof COMPANY_PERMISSIONS)[number];
