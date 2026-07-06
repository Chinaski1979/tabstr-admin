import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Default payment methods seeded for each new organization.
 * These IDs match the standard payment types used across Tabstr.
 */
export const DEFAULT_PAYMENT_METHODS = [
  { name: 'Dólares', icon: 'dollar', default_payment_method_id: 1 },
  { name: 'Colones', icon: 'colon', default_payment_method_id: 2 },
  { name: 'Sinpe Móvil', icon: 'sinpe', default_payment_method_id: 3 },
  { name: 'Tarjeta', icon: 'card', default_payment_method_id: 4 },
  { name: 'Transferencia Bancaria', icon: 'bank', default_payment_method_id: 5 },
  { name: 'Personal (Staff)', icon: 'staff', default_payment_method_id: 6 },
] as const;

/**
 * Seeds default payment methods for a new organization.
 * Should be called with service_role client to bypass RLS.
 * 
 * @param orgClient - Supabase client connected to the org DB (with service_role)
 * @param organizationId - UUID of the organization in the organizations table
 * @throws Error if insertion fails
 */
export async function seedPaymentMethods(
  orgClient: SupabaseClient,
  organizationId: string
): Promise<void> {
  const { error } = await orgClient.from('payment_methods').insert(
    DEFAULT_PAYMENT_METHODS.map(pm => ({
      name: pm.name,
      icon: pm.icon,
      organization_id: organizationId,
      is_active: true,
      default_payment_method_id: pm.default_payment_method_id,
    }))
  );
  
  if (error) {
    throw new Error(`Failed to seed payment methods: ${error.message}`);
  }
}
