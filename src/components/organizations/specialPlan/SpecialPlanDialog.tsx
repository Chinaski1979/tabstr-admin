import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateOrganizationSpecialPlan,
  useDeleteOrganizationSpecialPlan,
  useUpdateOrganizationSpecialPlan,
} from "@/hooks/useSubscriptions";
import type { OrganizationSpecialPlan } from "@/types";

import { SpecialPlanDeleteDialog } from "./SpecialPlanDeleteDialog";
import { SpecialPlanFormFields } from "./SpecialPlanFormFields";
import {
  defaultFormValues,
  featureRowsFromPlan,
  newFeatureRow,
  specialPlanFormSchema,
  specialPlanInputFromForm,
  type FeatureRow,
  type SpecialPlanFormValues,
} from "./specialPlanForm";

interface SpecialPlanDialogProps {
  orgRegistryId: string;
  plan?: OrganizationSpecialPlan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpecialPlanDialog({ orgRegistryId, plan, open, onOpenChange }: SpecialPlanDialogProps) {
  const isEdit = !!plan;
  const formId = plan?.id ?? "new-special-plan";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [featureRows, setFeatureRows] = useState<FeatureRow[]>(() => featureRowsFromPlan(plan));

  const { createSpecialPlan, isCreating } = useCreateOrganizationSpecialPlan(orgRegistryId);
  const { updateSpecialPlan, isUpdating } = useUpdateOrganizationSpecialPlan(orgRegistryId);
  const { deleteSpecialPlan, isDeleting } = useDeleteOrganizationSpecialPlan(orgRegistryId);
  const isSaving = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SpecialPlanFormValues>({
    resolver: zodResolver(specialPlanFormSchema),
    defaultValues: defaultFormValues(plan),
  });

  const isActive = watch("isActive");

  const resetForm = useCallback(() => {
    reset(defaultFormValues(plan));
    setFeatureRows(featureRowsFromPlan(plan));
  }, [plan, reset]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  const updateFeature = (key: string, text: string) => {
    setFeatureRows((prev) => prev.map((row) => (row.key === key ? { ...row, text } : row)));
  };

  const removeFeature = (key: string) => {
    setFeatureRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  };

  const onSubmit = async (values: SpecialPlanFormValues) => {
    const input = specialPlanInputFromForm(values, featureRows);

    try {
      if (isEdit) {
        await updateSpecialPlan({ specialPlanId: plan.id, input });
      } else {
        await createSpecialPlan(input);
      }
      onOpenChange(false);
    } catch {
      // Error toast handled in the hook.
    }
  };

  const onDelete = async () => {
    if (!plan) return;
    try {
      await deleteSpecialPlan(plan.id);
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit special plan" : "Create special plan"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the custom plan, price, and features for this organization."
                : "Define a custom plan, price, and features assigned exclusively to this organization."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <SpecialPlanFormFields
              formId={formId}
              register={register}
              errors={errors}
              isActive={isActive}
              setValue={setValue}
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
                  Delete
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
        <SpecialPlanDeleteDialog
          plan={plan}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={onDelete}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
