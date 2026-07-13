import { z } from 'zod';

import {
  ORG_MEMBERSHIP_ROLE_OPTIONS,
  type OrgMembershipRole,
  type OrganizationMember,
} from '@/types';

const roleSchema = z.enum(['admin', 'manager', 'cashier', 'accountant']);

export function getOrgUserFormSchema(isEdit: boolean) {
  return z.object({
    email: isEdit ? z.string() : z.string().email('Invalid email'),
    fullName: z.string().min(1, 'Full name is required'),
    password: z.string().optional(),
    role: roleSchema,
    isActive: z.boolean(),
  });
}

export type OrgUserFormValues = z.infer<ReturnType<typeof getOrgUserFormSchema>>;

export function defaultOrgUserFormValues(member?: OrganizationMember): OrgUserFormValues {
  if (member) {
    return {
      email: member.email,
      fullName: member.fullName,
      password: '',
      role: member.role,
      isActive: member.isActive,
    };
  }

  return {
    email: '',
    fullName: '',
    password: '',
    role: 'cashier',
    isActive: true,
  };
}

export function createOrgUserInputFromForm(values: OrgUserFormValues) {
  return {
    email: values.email.trim(),
    fullName: values.fullName.trim(),
    password: values.password ?? '',
    role: values.role as OrgMembershipRole,
  };
}

export function updateOrgUserInputFromForm(values: OrgUserFormValues) {
  return {
    fullName: values.fullName.trim(),
    role: values.role as OrgMembershipRole,
    isActive: values.isActive,
  };
}

export function orgMembershipRoleLabel(role: OrgMembershipRole): string {
  return ORG_MEMBERSHIP_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}
