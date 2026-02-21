/**
 * Login.tsx — Página de autenticación local (usuario/contraseña)
 * Reemplaza el login de Manus OAuth para despliegue en VPS propio.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Mode = "login" | "register";

interface LoginPageProps {
  onSuccess?: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("¡Bienvenido!");
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Cuenta creada. Ya puedes iniciar sesión.");
      setMode("login");
      setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.email) newErrors.email = "El email es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Email no válido";
    if (!form.password) newErrors.password = "La contraseña es obligatoria";
    else if (form.password.length < 8) newErrors.password = "Mínimo 8 caracteres";
    if (mode === "register") {
      if (!form.name.trim()) newErrors.name = "El nombre es obligatorio";
      if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (mode === "login") {
      loginMutation.mutate({ email: form.email, password: form.password });
    } else {
      registerMutation.mutate({ email: form.email, password: form.password, name: form.name.trim() });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Gestor de Dieta</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login" ? "Accede a tu dieta personalizada" : "Crea tu cuenta"}
            </p>
          </div>
        </div>

        {/* Formulario */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </CardTitle>
            <CardDescription className="text-xs">
              {mode === "login"
                ? "Introduce tu email y contraseña"
                : "Rellena los datos para registrarte"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre (solo en registro) */}
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm">Nombre</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={isPending}
                    autoComplete="name"
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  disabled={isPending}
                  autoComplete="email"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    disabled={isPending}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              {/* Confirmar contraseña (solo en registro) */}
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repite la contraseña"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    disabled={isPending}
                    autoComplete="new-password"
                  />
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>
              )}

              {/* Botón de acción */}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </Button>
            </form>

            {/* Cambiar modo */}
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  ¿No tienes cuenta?{" "}
                  <button
                    onClick={() => { setMode("register"); setErrors({}); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Regístrate
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <button
                    onClick={() => { setMode("login"); setErrors({}); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Inicia sesión
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
