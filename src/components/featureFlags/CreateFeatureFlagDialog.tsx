import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateFeatureFlag } from "@/hooks/useFeatureFlags";

const schema = z.object({
  featureName: z
    .string()
    .min(1, "Feature name is required")
    .regex(
      /^[a-z][a-zA-Z0-9]*$/,
      "Use camelCase starting with a lowercase letter (e.g. digitalInvoices)",
    ),
  isEnabled: z.boolean(),
  isPaid: z.boolean(),
  planName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateFeatureFlagDialog() {
  const [open, setOpen] = useState(false);
  const { createFeatureFlag, isCreating } = useCreateFeatureFlag();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      featureName: "",
      isEnabled: false,
      isPaid: false,
      planName: "",
    },
  });

  const isEnabled = watch("isEnabled");
  const isPaid = watch("isPaid");

  const onSubmit = async (values: FormValues) => {
    try {
      await createFeatureFlag({
        featureName: values.featureName,
        isEnabled: values.isEnabled,
        isPaid: values.isPaid,
        planName: values.planName?.trim() || null,
      });
      reset();
      setOpen(false);
    } catch {
      // Error toast handled in the hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New feature flag
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create feature flag</DialogTitle>
          <DialogDescription>
            Adds a row to the registry <code className="text-xs">feature_flags</code> table. The
            name must match what tabstr checks in code (camelCase). Per-org toggles are configured
            separately on each organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="featureName">Feature name</Label>
            <Input id="featureName" placeholder="digitalInvoices" {...register("featureName")} />
            {errors.featureName && (
              <p className="text-xs text-destructive">{errors.featureName.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="planName">Plan name (optional)</Label>
            <Input id="planName" placeholder="pro" {...register("planName")} />
            <p className="text-xs text-muted-foreground">
              Used for paid features; leave empty if not tied to a subscription plan.
            </p>
          </div>
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
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
