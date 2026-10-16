import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateManualPayment } from "@/hooks/useRevenue";
import { formatCurrency } from "@/lib/utils";
import { hasPaidInvoiceInMonth } from "@/lib/revenue";
import type { CollectedRevenueInvoice, ContractedRevenuePlan } from "@/types";

import {
  defaultRegisterPaymentValues,
  PAYMENT_METHOD_OPTIONS,
  registerPaymentFormSchema,
  type RegisterPaymentFormValues,
} from "./registerPaymentForm";

interface RegisterPaymentDialogProps {
  plans: ContractedRevenuePlan[];
  invoices: CollectedRevenueInvoice[];
  organizationRegistryId?: string;
  triggerLabel?: string;
  triggerSize?: "default" | "sm";
}

export function RegisterPaymentDialog({
  plans,
  invoices,
  organizationRegistryId,
  triggerLabel = "Register payment",
  triggerSize = "default",
}: RegisterPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const { createManualPayment, isCreating } = useCreateManualPayment();
  const orgLocked = Boolean(organizationRegistryId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterPaymentFormValues>({
    resolver: zodResolver(registerPaymentFormSchema),
    defaultValues: defaultRegisterPaymentValues(organizationRegistryId),
  });

  useEffect(() => {
    if (!open) return;
    reset(defaultRegisterPaymentValues(organizationRegistryId));
  }, [open, organizationRegistryId, reset]);

  const selectedOrgId = watch("organizationRegistryId");
  const paidOn = watch("paidOn");
  const paymentMethod = watch("paymentMethod");

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.organizationRegistryId === selectedOrgId) ?? null,
    [plans, selectedOrgId],
  );

  const duplicateMonth = Boolean(
    selectedOrgId && paidOn && hasPaidInvoiceInMonth(invoices, selectedOrgId, paidOn),
  );

  const onSubmit = async (values: RegisterPaymentFormValues) => {
    try {
      await createManualPayment({
        organizationRegistryId: values.organizationRegistryId,
        paidOn: values.paidOn,
        paymentMethod: values.paymentMethod,
      });
      setOpen(false);
    } catch {
      // Error toast handled in the hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={triggerSize} disabled={plans.length === 0}>
          <Plus className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register payment</DialogTitle>
          <DialogDescription>
            Record a paid invoice at the organization&apos;s special-plan price. Use this for bank
            transfers (and occasional card payments that did not go through PowerTranz).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-payment-org">Organization</Label>
            <Select
              value={selectedOrgId || undefined}
              onValueChange={(value) => setValue("organizationRegistryId", value, { shouldValidate: true })}
              disabled={orgLocked}
            >
              <SelectTrigger id="register-payment-org">
                <SelectValue placeholder="Choose an organization" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.organizationRegistryId} value={plan.organizationRegistryId}>
                    {plan.organizationSlug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.organizationRegistryId && (
              <p className="text-xs text-destructive">{errors.organizationRegistryId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-payment-date">Paid on</Label>
            <Input id="register-payment-date" type="date" {...register("paidOn")} />
            {errors.paidOn && <p className="text-xs text-destructive">{errors.paidOn.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-payment-method">Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) =>
                setValue("paymentMethod", value as RegisterPaymentFormValues["paymentMethod"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="register-payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            Amount:{" "}
            {selectedPlan
              ? `${formatCurrency(selectedPlan.specialPrice)} (from the special plan, ex-IVA)`
              : "choose an organization"}
          </p>

          {duplicateMonth ? (
            <p className="text-sm text-muted-foreground">
              This organization already has a paid invoice in that month. You can still save if they
              paid for more than one period.
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isCreating || !selectedPlan}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
