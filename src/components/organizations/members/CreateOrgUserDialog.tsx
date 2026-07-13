import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { resolveOrgServiceKey } from '@/config/sharedSupabaseProjects';
import { useCreateOrgUser, useUpdateOrgUser } from '@/hooks/useOrgUsers';
import { checkOrgUserExistsByEmail } from '@/services/provisioning/checkOrgUser';
import { ORG_MEMBERSHIP_ROLE_OPTIONS, type OrganizationMember, type OrganizationRegistry } from '@/types';

import {
  createOrgUserInputFromForm,
  defaultOrgUserFormValues,
  getOrgUserFormSchema,
  updateOrgUserInputFromForm,
  type OrgUserFormValues,
} from './orgUserForm';

interface CreateOrgUserDialogProps {
  organization: OrganizationRegistry;
  member?: OrganizationMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrgUserDialog({
  organization,
  member,
  open,
  onOpenChange,
}: CreateOrgUserDialogProps) {
  const isEdit = !!member;
  const formId = member?.id ?? 'new-org-user';
  const [reuseExistingUser, setReuseExistingUser] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const { createOrgUser, isCreating } = useCreateOrgUser(organization);
  const { updateOrgUser, isUpdating } = useUpdateOrgUser(organization);
  const isSaving = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrgUserFormValues>({
    resolver: zodResolver(getOrgUserFormSchema(isEdit)),
    defaultValues: defaultOrgUserFormValues(member),
  });

  const email = watch('email');
  const role = watch('role');
  const isActive = watch('isActive');

  const resetForm = useCallback(() => {
    reset(defaultOrgUserFormValues(member));
    setReuseExistingUser(false);
    setIsCheckingEmail(false);
  }, [member, reset]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (isEdit) return;

    let cancelled = false;

    const checkEmail = async () => {
      if (!email || !z.string().email().safeParse(email).success) {
        setReuseExistingUser(false);
        return;
      }

      let serviceKey: string;
      try {
        serviceKey = resolveOrgServiceKey(organization.supabaseUrl);
      } catch {
        setReuseExistingUser(false);
        return;
      }

      setIsCheckingEmail(true);
      try {
        const exists = await checkOrgUserExistsByEmail(
          organization.supabaseUrl,
          serviceKey,
          email,
        );
        if (!cancelled) {
          setReuseExistingUser(exists);
          if (exists) setValue('password', '');
        }
      } catch {
        if (!cancelled) setReuseExistingUser(false);
      } finally {
        if (!cancelled) setIsCheckingEmail(false);
      }
    };

    const timer = setTimeout(checkEmail, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email, isEdit, organization.supabaseUrl, setValue]);

  const onSubmit = async (values: OrgUserFormValues) => {
    if (!isEdit && !reuseExistingUser && (!values.password || values.password.length < 6)) {
      toast.error('Password required', { description: 'Min 6 characters for new users' });
      return;
    }

    try {
      if (isEdit && member) {
        await updateOrgUser({ member, input: updateOrgUserInputFromForm(values) });
      } else {
        await createOrgUser(createOrgUserInputFromForm(values));
      }
      onOpenChange(false);
    } catch {
      // Error toast handled in the hook.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="max-h-[min(90dvh,100%)] overflow-y-auto p-4 sm:max-w-md sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>{isEdit ? 'Edit member' : 'Create user'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update membership details for ${member?.email || 'this user'}.`
              : `Add a user to ${organization.organizationSlug}. Creates an auth account when the email is new in this Supabase project.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-email`}>Email</Label>
            <div className="relative">
              <Input
                id={`${formId}-email`}
                type="email"
                placeholder="user@example.com"
                readOnly={isEdit}
                disabled={isEdit}
                className={isEdit ? 'bg-muted' : undefined}
                {...register('email')}
              />
              {!isEdit && isCheckingEmail && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            {!isEdit && errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
            {!isEdit && reuseExistingUser && (
              <p className="text-xs text-muted-foreground">
                User already exists in this database — password not required.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-full-name`}>Full name</Label>
            <Input id={`${formId}-full-name`} placeholder="Jane Doe" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          {!isEdit && !reuseExistingUser && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-password`}>Password</Label>
              <Input
                id={`${formId}-password`}
                type="password"
                placeholder="Min 6 characters"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-role`}>Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setValue('role', value as OrgUserFormValues['role'])}
            >
              <SelectTrigger id={`${formId}-role`}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ORG_MEMBERSHIP_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>

          {isEdit && (
            <div className="flex items-start gap-3">
              <Switch
                id={`${formId}-is-active`}
                className="mt-0.5"
                checked={isActive}
                onCheckedChange={(checked) => setValue('isActive', checked)}
              />
              <Label htmlFor={`${formId}-is-active`} className="cursor-pointer leading-snug">
                Active membership
              </Label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
