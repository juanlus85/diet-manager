import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Scale, Info, Save, LogOut } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const { data: profile } = trpc.health.getProfile.useQuery();
  const updateProfile = trpc.health.updateProfile.useMutation({
    onSuccess: () => { toast.success("Perfil actualizado"); },
  });

  const [form, setForm] = useState({
    initialWeight: "",
    targetWeight: "",
    height: "",
    birthDate: "",
  });

  // Inicializar el formulario con los datos guardados en la base de datos
  useEffect(() => {
    if (profile) {
      setForm({
        initialWeight: profile.initialWeight != null ? String(profile.initialWeight) : "",
        targetWeight: profile.targetWeight != null ? String(profile.targetWeight) : "",
        height: profile.height != null ? String(profile.height) : "",
        birthDate: profile.birthDate ? String(profile.birthDate).slice(0, 10) : "",
      });
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate({
      initialWeight: form.initialWeight ? Number(form.initialWeight) : undefined,
      targetWeight: form.targetWeight ? Number(form.targetWeight) : undefined,
      height: form.height ? Number(form.height) : undefined,
      birthDate: form.birthDate || undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Mi Perfil
        </h1>
        <p className="text-muted-foreground text-sm">Gestiona tu información personal y objetivos</p>
      </div>

      {/* Info de usuario */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-bold text-lg">{user?.name ?? "Usuario"}</p>
              <p className="text-muted-foreground text-sm">{user?.email ?? ""}</p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {user?.role === "admin" ? "Administrador" : "Usuario"}
              </Badge>
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos de salud */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Datos de salud
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Peso inicial (kg)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="143.5"
                value={form.initialWeight}
                onChange={(e) => setForm({ ...form, initialWeight: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Peso objetivo (kg)</Label>
              <Input
                type="number"
                step="0.5"
                placeholder="100"
                value={form.targetWeight}
                onChange={(e) => setForm({ ...form, targetWeight: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Altura (cm)</Label>
              <Input
                type="number"
                placeholder="175"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Fecha de nacimiento</Label>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateProfile.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      {/* Recomendaciones de la clínica */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Recomendaciones de la dieta (C.E.A.)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Regla fundamental:</strong> Siga la dieta estrictamente.
              No cambie alimentos de la comida por otros de la cena. No se salte ninguna comida.
            </p>
            <p>
              <strong className="text-foreground">Entre comidas:</strong> Café solo, té, manzanilla, tila, consomé, jamón york, naranja, manzana, pera, melón, sandía y fresas.
            </p>
            <p>
              <strong className="text-foreground">A partir de la primera semana:</strong> Además de los anteriores, gambas, langostinos, otros mariscos, mortadela, pavo trufado, pavo frío, chopped. No coma pan, picos o biscotes en absoluto, a menos que se le indique en la dieta.
            </p>
            <p>
              <strong className="text-foreground">Actividad física:</strong> Camine todos los días de 1/2 a 1 hora, preferentemente por la tarde. Active sus músculos regularmente de forma moderada.
            </p>
            <p>
              <strong className="text-foreground">Cocinado:</strong> Utilice poco aceite. En los fritos, séquelos con papel absorbente. Sustituya el azúcar por sacarina.
            </p>
            <p>
              <strong className="text-foreground">Bebidas:</strong> Agua abundante. Si sale a comer fuera puede tomar tinto o cava de calidad. Excepcionalmente, cantidades moderadas de whisky.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
