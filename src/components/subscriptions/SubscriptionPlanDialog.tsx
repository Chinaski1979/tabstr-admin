import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useCreateSubscriptionPlan,
  useDeleteSubscriptionPlan,
  useUpdateSubscriptionPlan,
} from "@/hooks/useSubscriptions";
import type { SubscriptionPlan } from "@/types";
import { BILLING_INTERVAL_OPTIONS } from "@/types";

import { SubscriptionPlanFormFields } from "./SubscriptionPlanFormFields";
import {
  defaultIsActive,
  featureRowsFromPlan,
  newFeatureRow,
  newPriceRow,
  parseFeatureRows,
  parsePriceRows,
  planFormSchema,
  priceRowsFromPlan,
  type FeatureRow,
  type PlanFormValues,
  type PriceRow,
} from "./subscriptionPlanForm";

interface SubscriptionPlanDialogProps {
  plan?: SubscriptionPlan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
}

export function SubscriptionPlanDialog({
  plan,
  open,
  onOpenChange,
  trigger,
}: SubscriptionPlanDialogProps) {
  const isEdit = !!plan;
  const formId = plan?.id ?? "new-plan";

  const [priceRows, setPriceRows] = useState<PriceRow[]>(() =>
    plan ? priceRowsFromPlan(plan) : [newPriceRow()],
  );
  const [featureRows, setFeatureRows] = useState<FeatureRow[]>(() => featureRowsFromPlan(plan));
  const [intervalsError, setIntervalsError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { createSubscriptionPlan, isCreating } = useCreateSubscriptionPlan();
  const { updateSubscriptionPlan, isUpdating } = useUpdateSubscriptionPlan();
  const { deleteSubscriptionPlan, isDeleting } = useDeleteSubscriptionPlan();
  const isSaving = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: { planName: plan?.planName ?? "", isActive: defaultIsActive(plan) },
  });

  const isActive = watch("isActive");
  const canAddRow = priceRows.length < BILLING_INTERVAL_OPTIONS.length;

  const resetForm = useCallback(() => {
    reset({ planName: plan?.planName ?? "", isActive: defaultIsActive(plan) });
    setPriceRows(plan ? priceRowsFromPlan(plan) : [newPriceRow()]);
    setFeatureRows(featureRowsFromPlan(plan));
    setIntervalsError(null);
  }, [plan, reset]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  const optionsForRow = (row: PriceRow) => {
    const used = new Set(
      priceRows.filter((r) => r.key !== row.key && r.interval).map((r) => r.interval),
    );
    return BILLING_INTERVAL_OPTIONS.filter((o) => o.value === row.interval || !used.has(o.value));
  };

  const updateRow = (key: string, patch: Partial<PriceRow>) => {
    setPriceRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const removeRow = (key: string) => {
    setPriceRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  };

  const updateFeature = (key: string, text: string) => {
    setFeatureRows((prev) => prev.map((row) => (row.key === key ? { ...row, text } : row)));
  };

  const removeFeature = (key: string) => {
    setFeatureRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  };

  const onSubmit = async (values: PlanFormValues) => {
    const parsed = parsePriceRows(priceRows);
    if (parsed.ok === false) {
      setIntervalsError(parsed.error);
      return;
    }
    setIntervalsError(null);
    const features = parseFeatureRows(featureRows);

    try {
      if (isEdit) {
        await updateSubscriptionPlan({
          planId: plan.id,
          input: {
            planName: values.planName.trim(),
            prices: parsed.prices,
            features,
            isActive: values.isActive,
          },
        });
      } else {
        await createSubscriptionPlan({
          planName: values.planName.trim(),
          prices: parsed.prices,
          features,
          isActive: values.isActive,
        });
      }
      onOpenChange(false);
    } catch {
      // Error toast handled in the hook.
    }
  };

  const onDelete = async () => {
    if (!plan) return;
    try {
      await deleteSubscriptionPlan(plan.id);
      setDeleteOpen(false);
      onOpenChange(false);
    } catch {
      // Error toast handled in the hook.
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) resetForm();
        }}
      >
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit subscription plan" : "Create subscription plan"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the plan name, prices, features, or billing intervals."
                : "Pick billing intervals, set prices, and list the features shown on the plan card."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <SubscriptionPlanFormFields
              formId={formId}
              register={register}
              errors={errors}
              isActive={isActive}
              setValue={setValue}
              priceRows={priceRows}
              intervalsError={intervalsError}
              canAddRow={canAddRow}
              optionsForRow={optionsForRow}
              onUpdateRow={updateRow}
              onRemoveRow={removeRow}
              onAddRow={() => setPriceRows((prev) => [...prev, newPriceRow()])}
              featureRows={featureRows}
              onUpdateFeature={updateFeature}
              onRemoveFeature={removeFeature}
              onAddFeature={() => setFeatureRows((prev) => [...prev, newFeatureRow()])}
            />
            <DialogFooter className={isEdit ? "gap-2 sm:justify-between" : undefined}>
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSaving || isDeleting}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete plan
                </Button>
              )}
              <Button type="submit" disabled={isSaving || isDeleting}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isEdit && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {plan.planName}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the plan and all its prices from the catalog. Plans linked to active
                subscriptions cannot be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} disabled={isDeleting}>
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

export function CreateSubscriptionPlanDialog() {
  const [open, setOpen] = useState(false);

  return (
    <SubscriptionPlanDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus className="h-4 w-4" />
          New plan
        </Button>
      }
    />
  );
}
