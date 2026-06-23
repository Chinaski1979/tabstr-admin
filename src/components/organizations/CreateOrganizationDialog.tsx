import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateOrganization } from "@/hooks/useOrganizations";

const schema = z.object({
  organizationSlug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  supabaseUrl: z.string().url("Enter a valid URL"),
  supabaseAnonKey: z.string().min(1, "Anon key is required"),
});

type FormValues = z.infer<typeof schema>;

/**
 * Registers a new organization in organization_registry. In the single-supabase
 * model, paste the shared registry/tenant project URL + anon key here.
 */
export function CreateOrganizationDialog({ defaults }: { defaults?: Partial<FormValues> }) {
  const [open, setOpen] = useState(false);
  const { createOrganization, isCreating } = useCreateOrganization();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationSlug: defaults?.organizationSlug ?? "",
      supabaseUrl: defaults?.supabaseUrl ?? "",
      supabaseAnonKey: defaults?.supabaseAnonKey ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createOrganization(values);
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
          New organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register organization</DialogTitle>
          <DialogDescription>
            Adds a row to the registry. Use the shared project URL + anon key unless this org runs
            its own Supabase.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="organizationSlug">Slug</Label>
            <Input id="organizationSlug" placeholder="my-restaurant" {...register("organizationSlug")} />
            {errors.organizationSlug && (
              <p className="text-xs text-destructive">{errors.organizationSlug.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supabaseUrl">Supabase URL</Label>
            <Input
              id="supabaseUrl"
              placeholder="https://xxxx.supabase.co"
              {...register("supabaseUrl")}
            />
            {errors.supabaseUrl && (
              <p className="text-xs text-destructive">{errors.supabaseUrl.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supabaseAnonKey">Supabase anon key</Label>
            <Input id="supabaseAnonKey" placeholder="eyJ…" {...register("supabaseAnonKey")} />
            {errors.supabaseAnonKey && (
              <p className="text-xs text-destructive">{errors.supabaseAnonKey.message}</p>
            )}
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
