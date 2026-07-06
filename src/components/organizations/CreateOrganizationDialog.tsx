import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useProvisionOrganization } from '@/hooks/useProvisionOrganization';
import { generateSlugFromName } from '@/lib/slugUtils';
import {
  SHARED_SUPABASE_PROJECTS,
} from '@/config/sharedSupabaseProjects';
import { checkOrgUserExistsByEmail } from '@/services/provisioning/checkOrgUser';
import {
  resolveProvisioningCredentials,
  tryResolveProvisioningCredentials,
} from '@/services/provisioning/resolveProvisioningCredentials';

const schema = z
  .object({
    email: z.string().email('Invalid email'),
    password: z.string().optional(),
    fullName: z.string().min(1, 'Full name is required'),
    organizationName: z.string().min(1, 'Organization name is required'),
    organizationSlug: z
      .string()
      .min(1, 'Slug is required')
      .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only'),
    runMigrations: z.boolean(),
    sharedProjectId: z.string().optional(),
    supabaseUrl: z.string().optional(),
    supabaseAnonKey: z.string().optional(),
    supabaseServiceKey: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.runMigrations) {
      if (!data.supabaseUrl?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'Project URL is required', path: ['supabaseUrl'] });
      } else if (!z.string().url().safeParse(data.supabaseUrl).success) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid URL', path: ['supabaseUrl'] });
      }
      if (!data.supabaseAnonKey?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'Anon key is required', path: ['supabaseAnonKey'] });
      }
      if (!data.supabaseServiceKey?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Service role key is required',
          path: ['supabaseServiceKey'],
        });
      }
    } else if (!data.sharedProjectId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Select a Supabase project',
        path: ['sharedProjectId'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const defaultSharedProjectId = SHARED_SUPABASE_PROJECTS[0]?.id ?? '';

export function CreateOrganizationDialog() {
  const [open, setOpen] = useState(false);
  const [reuseExistingUser, setReuseExistingUser] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const { provisionOrganization, isProvisioning } = useProvisionOrganization();

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
      runMigrations: false,
      sharedProjectId: defaultSharedProjectId,
    },
  });

  const runMigrations = watch('runMigrations');
  const sharedProjectId = watch('sharedProjectId');
  const email = watch('email');
  const supabaseUrl = watch('supabaseUrl');
  const supabaseAnonKey = watch('supabaseAnonKey');
  const supabaseServiceKey = watch('supabaseServiceKey');

  useEffect(() => {
    let cancelled = false;

    const checkEmail = async () => {
      if (!email || !z.string().email().safeParse(email).success) {
        setReuseExistingUser(false);
        return;
      }

      const credentials = tryResolveProvisioningCredentials({
        runMigrations,
        sharedProjectId,
        supabaseUrl,
        supabaseAnonKey,
        supabaseServiceKey,
      });

      if (!credentials) {
        setReuseExistingUser(false);
        return;
      }

      setIsCheckingEmail(true);
      try {
        const exists = await checkOrgUserExistsByEmail(
          credentials.supabaseUrl,
          credentials.supabaseServiceKey,
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
  }, [email, runMigrations, sharedProjectId, supabaseUrl, supabaseAnonKey, supabaseServiceKey, setValue]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
      setReuseExistingUser(false);
      setIsCheckingEmail(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('organizationName', e.target.value);
    if (e.target.value) {
      setValue('organizationSlug', generateSlugFromName(e.target.value));
    }
  };

  const onSubmit = async (values: FormValues) => {
    let credentials: {
      supabaseUrl: string;
      supabaseAnonKey: string;
      supabaseServiceKey: string;
    };

    try {
      credentials = resolveProvisioningCredentials({
        runMigrations: values.runMigrations,
        sharedProjectId: values.sharedProjectId,
        supabaseUrl: values.supabaseUrl,
        supabaseAnonKey: values.supabaseAnonKey,
        supabaseServiceKey: values.supabaseServiceKey,
      });
    } catch (error) {
      toast.error('Could not create organization', {
        description: error instanceof Error ? error.message : 'Invalid Supabase configuration',
      });
      return;
    }

    if (!reuseExistingUser && (!values.password || values.password.length < 6)) {
      toast.error('Password required', { description: 'Min 6 characters for new admin users' });
      return;
    }

    try {
      await provisionOrganization({
        email: values.email,
        password: values.password ?? '',
        fullName: values.fullName,
        organizationName: values.organizationName,
        organizationSlug: values.organizationSlug,
        ...credentials,
        skipMigrations: !values.runMigrations,
      });
      reset();
      handleOpenChange(false);
    } catch {
      // Error toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New organization
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New organization</DialogTitle>
          <DialogDescription>
            Registers the org and sets up admin user and initial data. Use a shared project for
            existing Supabase DBs; enable migrations only for empty projects.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="space-y-4 rounded-md border p-4">
            <h3 className="flex items-center gap-2 border-b pb-3 text-sm font-semibold">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                1
              </span>
              Supabase Database
            </h3>

            <div className="flex items-center space-x-2">
              <Switch
                id="runMigrations"
                checked={runMigrations}
                onCheckedChange={(checked) => setValue('runMigrations', checked)}
              />
              <Label htmlFor="runMigrations" className="cursor-pointer">
                Apply migration files (new empty Supabase project)
              </Label>
            </div>

            {!runMigrations ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sharedProjectId">Shared Supabase project</Label>
                <Select
                  value={sharedProjectId}
                  onValueChange={(value) => setValue('sharedProjectId', value)}
                >
                  <SelectTrigger id="sharedProjectId">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHARED_SUPABASE_PROJECTS.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sharedProjectId && (
                  <p className="text-xs text-destructive">{errors.sharedProjectId.message}</p>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="supabaseUrl">Project URL</Label>
                  <Input
                    id="supabaseUrl"
                    placeholder="https://xxx.supabase.co"
                    {...register('supabaseUrl')}
                  />
                  {errors.supabaseUrl && (
                    <p className="text-xs text-destructive">{errors.supabaseUrl.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="supabaseAnonKey">Anon Key</Label>
                  <Input id="supabaseAnonKey" placeholder="eyJ..." {...register('supabaseAnonKey')} />
                  {errors.supabaseAnonKey && (
                    <p className="text-xs text-destructive">{errors.supabaseAnonKey.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="supabaseServiceKey">Service Role Key (temporary, not stored)</Label>
                  <Input
                    id="supabaseServiceKey"
                    type="password"
                    placeholder="eyJ..."
                    {...register('supabaseServiceKey')}
                  />
                  {errors.supabaseServiceKey && (
                    <p className="text-xs text-destructive">{errors.supabaseServiceKey.message}</p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="space-y-4 rounded-md border p-4">
            <h3 className="flex items-center gap-2 border-b pb-3 text-sm font-semibold">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                2
              </span>
              Organization info
            </h3>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                placeholder="My Restaurant"
                {...register('organizationName')}
                onChange={handleNameChange}
              />
              {errors.organizationName && (
                <p className="text-xs text-destructive">{errors.organizationName.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="organizationSlug">Slug (auto-generated)</Label>
              <Input id="organizationSlug" placeholder="my-restaurant" {...register('organizationSlug')} />
              {errors.organizationSlug && (
                <p className="text-xs text-destructive">{errors.organizationSlug.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-4 rounded-md border p-4">
            <h3 className="flex items-center gap-2 border-b pb-3 text-sm font-semibold">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                3
              </span>
              Admin User
            </h3>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  {...register('email')}
                />
                {isCheckingEmail && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              {reuseExistingUser && (
                <p className="text-xs text-muted-foreground">
                  User already exists in this database — password not required.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="John Doe" {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>
            {!reuseExistingUser && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  {...register('password')}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isProvisioning}>
              {isProvisioning && <Loader2 className="h-4 w-4 animate-spin" />}
              {isProvisioning ? 'Creating...' : 'Create organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
