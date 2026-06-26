import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

const DEMO_PASSWORD = "Password123";
const demoAccounts = [
  { label: "Admin", email: "admin@demo.com", icon: ShieldCheck },
  { label: "User (Alice)", email: "alice@demo.com", icon: User },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoPending, setDemoPending] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? "/tasks";

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, "Login failed"));
    }
  });

  const handleDemoLogin = async (email: string) => {
    // Fill the fields (so it's visible) then sign in.
    setValue("email", email);
    setValue("password", DEMO_PASSWORD);
    setServerError(null);
    setDemoPending(email);
    try {
      await login(email, DEMO_PASSWORD);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, "Login failed"));
    } finally {
      setDemoPending(null);
    }
  };

  const busy = isSubmitting || demoPending !== null;

  return (
    <div className="relative flex min-h-svh items-center justify-center p-4">
      {/* Full-bleed background image */}
      <img
        src="/bg-cover-long.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      {/* Darkening gradient overlay so the form stays readable */}
      <div className="absolute inset-0 bg-linear-to-tr from-background via-background/5 to-background/55" />

      <Card className="relative w-full max-w-sm border-white/10 bg-card/70 shadow-2xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Log in to your account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Log in
            </Button>
          </form>

          {/* Quick demo logins for evaluators */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Quick demo login
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {demoAccounts.map(({ label, email, icon: Icon }) => (
                <Button
                  key={email}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleDemoLogin(email)}
                >
                  {demoPending === email ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                  {label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Demo password: <code>{DEMO_PASSWORD}</code>
            </p>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
