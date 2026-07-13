import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateFeatureFlag, useUpdateFeatureFlag } from "@/hooks/useFeatureFlags";
import type { FeatureFlag } from "@/types";

const schema = z.object({
  featureName: z
    .string()
    .min(1, "Feature name is required")
    .regex(
      /^[a-z][a-zA-Z0-9]*$/,
      "Use camelCase starting with a lowercase letter (e.g. digitalInvoices)",
    ),
  description: z.string().optional(),
  isEnabled: z.boolean(),
  isPaid: z.boolean(),
  planName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface FeatureFlagDialogProps {
  flag?: FeatureFlag;
  trigger?: ReactNode;
}

function defaultValues(flag?: FeatureFlag): FormValues {
  return {
    featureName: flag?.featureName ?? "",
    description: flag?.description ?? "",
    isEnabled: flag?.isEnabled ?? false,
    isPaid: flag?.isPaid ?? false,
    planName: flag?.planName ?? "",
  };
}

export function FeatureFlagDialog({ flag, trigger }: FeatureFlagDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!flag;
  const { createFeatureFlag, isCreating } = useCreateFeatureFlag();
  const { updateFeatureFlag, isUpdating } = useUpdateFeatureFlag();
  const isSaving = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(flag),
  });

  const isEnabled = watch("isEnabled");
  const isPaid = watch("isPaid");

  const resetForm = useCallback(() => {
    reset(defaultValues(flag));
  }, [flag, reset]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit) {
        await updateFeatureFlag({
          flagId: flag.id,
          input: {
            description: values.description?.trim() || null,
            isPaid: values.isPaid,
            planName: values.planName?.trim() || null,
          },
        });
      } else {
        await createFeatureFlag({
          featureName: values.featureName,
          description: values.description?.trim() || null,
          isEnabled: values.isEnabled,
          isPaid: values.isPaid,
          planName: values.planName?.trim() || null,
        });
      }
      setOpen(false);
    } catch {
      // Error toast handled in the hook.
    }
  };

  const defaultTrigger = isEdit ? (
    <Button variant="ghost" size="icon" aria-label={`Edit ${flag.featureName}`}>
      <Pencil className="h-4 w-4" />
    </Button>
  ) : (
    <Button>
      <Plus className="h-4 w-4" />
      New feature flag
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit feature flag" : "Create feature flag"}</DialogTitle>
          <DialogDescription>
            {isEdit ? (
              <>
                Update metadata for <code className="text-xs">{flag.featureName}</code>. The feature
                name cannot be changed.
              </>
            ) : (
              <>
                Adds a row to the registry <code className="text-xs">feature_flags</code> table. The
                name must match what tabstr checks in code (camelCase). Per-org toggles are
                configured separately on each organization.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="featureName">Feature name</Label>
            <Input
              id="featureName"
              placeholder="digitalInvoices"
              disabled={isEdit}
              {...register("featureName")}
            />
            {errors.featureName && (
              <p className="text-xs text-destructive">{errors.featureName.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What this feature flag controls"
              rows={3}
              {...register("description")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="planName">Plan name (optional)</Label>
            <Input id="planName" placeholder="pro" {...register("planName")} />
            <p className="text-xs text-muted-foreground">
              Used for paid features; leave empty if not tied to a subscription plan.
            </p>
          </div>
          {!isEdit && (
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="isEnabled">Enabled globally</Label>
                <span className="text-xs text-muted-foreground">
                  When off, the feature is disabled for all organizations.
                </span>
              </div>
              <Switch
                id="isEnabled"
                checked={isEnabled}
                onCheckedChange={(checked) => setValue("isEnabled", checked)}
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="isPaid">Paid feature</Label>
              <span className="text-xs text-muted-foreground">
                Marks the flag as a paid add-on in the admin UI.
              </span>
            </div>
            <Switch
              id="isPaid"
              checked={isPaid}
              onCheckedChange={(checked) => setValue("isPaid", checked)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
