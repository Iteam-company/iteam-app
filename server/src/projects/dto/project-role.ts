export const PROJECT_ROLES = ['HOLDER', 'HELPER'] as const;

export type ProjectRole = (typeof PROJECT_ROLES)[number];
