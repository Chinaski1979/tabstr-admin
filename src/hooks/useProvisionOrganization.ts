import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { provisionOrganization } from '@/services/provisioning/browserProvisioner';
import { queryKeys } from '@/lib/queryKeys';
import type { ProvisionOrganizationInput, ProvisionResult } from '@/types';

/** Hook for creating a complete organization with migrations, admin user, and initial data. */
export function useProvisionOrganization() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: ProvisionOrganizationInput) => provisionOrganization(input),
    onSuccess: (result: ProvisionResult) => {
      if (result.success) {
        toast.success('Organization created', {
          description: `${result.organizationSlug} is ready`,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.organizations() });
      } else {
        // Handle error case when result.success is false
        handleProvisionError(result.error || 'Unknown error', result.errorCode);
      }
    },
    onError: (error: Error & { code?: string }) => {
      handleProvisionError(error.message, error.code);
    },
  });

  return {
    provisionOrganization: mutation.mutateAsync,
    isProvisioning: mutation.isPending,
  };
}

/**
 * Handles provisioning errors with specific messages for common cases.
 */
function handleProvisionError(message: string, code?: string): void {
  if (code === '23505') {
    toast.error('Slug already exists', {
      description: 'Choose a different organization slug',
    });
    return;
  }
  
  if (message?.includes('exec_sql')) {
    toast.error('exec_sql function required', {
      description: 'Create the exec_sql function in SQL Editor before provisioning',
      duration: 10000,
    });
    return;
  }
  
  toast.error('Provisioning failed', { description: message });
}
