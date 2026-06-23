import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate } from "react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FullPageLoader } from "@/components/common/StateViews";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { isAuthenticated, loading, signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (loading) return <FullPageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = async (values: LoginForm) => {
    setSubmitting(true);
    try {
      await signIn(values.email, values.password);
      // AuthProvider's listener updates the store; route guard takes over.
    } catch (error) {
      toast.error("Sign in failed", {
        description: error instanceof Error ? error.message : "Check your credentials and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Tabstr Admin</CardTitle>
          <CardDescription>Sign in with your administrator account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" disabled={submitting} className="mt-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
