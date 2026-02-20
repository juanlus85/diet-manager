import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from "recharts";
import { Scale, Plus, Trash2, Target, TrendingDown, TrendingUp, Activity, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function formatDateStr(d: Date | string) {
  const date = d instanceof Date ? d : new Date(String(d) + "T12:00:00");
  return date.toISOString().slice(0, 10);
}

export default function WeightTracker() {
  const { data: weightLogs, refetch: refetchWeight } = trpc.health.listWeightLogs.useQuery();
  const { data: weightGoals, refetch: refetchGoals } = trpc.health.listWeightGoals.useQuery();
  const { data: activityLogs, refetch: refetchActivity } = trpc.health.listActivityLogs.useQuery();
  const { data: stats } = trpc.health.getWeightStats.useQuery();

  const addWeight = trpc.health.addWeightLog.useMutation({
    onSuccess: () => { refetchWeight(); setWeightOpen(false); toast.success("Peso registrado"); },
  });
  const deleteWeight = trpc.health.deleteWeightLog.useMutation({ onSuccess: () => refetchWeight() });
  const addGoal = trpc.health.addWeightGoal.useMutation({
    onSuccess: () => { refetchGoals(); setGoalOpen(false); toast.success("Objetivo añadido"); },
  });
  const deleteGoal = trpc.health.deleteWeightGoal.useMutation({ onSuccess: () => refetchGoals() });
  const addActivity = trpc.health.addActivityLog.useMutation({
    onSuccess: () => { refetchActivity(); setActivityOpen(false); toast.success("Actividad registrada"); },
  });
  const deleteActivity = trpc.health.deleteActivityLog.useMutation({ onSuccess: () => refetchActivity() });

  const [weightOpen, setWeightOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [weightForm, setWeightForm] = useState({ weight: "", logDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [goalForm, setGoalForm] = useState({ targetDate: "", targetWeight: "", label: "" });
  const [activityForm, setActivityForm] = useState({
    logDate: new Date().toISOString().slice(0, 10),
    activityType: "",
    duration: "",
    intensity: "media" as "baja" | "media" | "alta",
    notes: "",
  });

  // Preparar datos para la gráfica
  const chartData = weightLogs?.map((log) => ({
    date: formatDateStr(log.logDate),
    peso: log.weight,
    objetivo: log.targetWeight ?? undefined,
  })) ?? [];

  // Añadir objetivos al chart
  const goalsMap: Record<string, number> = {};
  weightGoals?.forEach((g) => {
    goalsMap[formatDateStr(g.targetDate)] = g.targetWeight;
  });

  const latestWeight = weightLogs && weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;
  const firstWeight = weightLogs && weightLogs.length > 0 ? weightLogs[0].weight : null;
  const totalLost = firstWeight && latestWeight ? firstWeight - latestWeight : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            Control de Peso
          </h1>
          <p className="text-muted-foreground text-sm">Seguimiento de peso y actividad física</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setActivityOpen(true)} className="gap-1">
            <Dumbbell className="w-4 h-4" />
            Actividad
          </Button>
          <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)} className="gap-1">
            <Target className="w-4 h-4" />
            Objetivo
          </Button>
          <Button size="sm" onClick={() => setWeightOpen(true)} className="gap-1">
            <Plus className="w-4 h-4" />
            Registrar peso
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Peso actual</p>
            <p className="text-2xl font-bold text-primary">{latestWeight ? `${latestWeight} kg` : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Peso inicial</p>
            <p className="text-2xl font-bold text-blue-700">{firstWeight ? `${firstWeight} kg` : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total perdido</p>
            <p className="text-2xl font-bold text-green-700">
              {totalLost !== null ? `${totalLost > 0 ? "-" : "+"}${Math.abs(totalLost).toFixed(1)} kg` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-orange-50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Registros</p>
            <p className="text-2xl font-bold text-orange-700">{weightLogs?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">Evolución del peso</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.48 0.15 145)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.48 0.15 145)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.03 145)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => {
                    const d = new Date(v + "T12:00:00");
                    return format(d, "d/M", { locale: es });
                  }}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}kg`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} kg`,
                    name === "peso" ? "Peso real" : "Objetivo",
                  ]}
                  labelFormatter={(label) => {
                    const d = new Date(label + "T12:00:00");
                    return format(d, "d 'de' MMMM yyyy", { locale: es });
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="peso"
                  stroke="oklch(0.48 0.15 145)"
                  strokeWidth={2.5}
                  fill="url(#weightGrad)"
                  dot={{ r: 4, fill: "oklch(0.48 0.15 145)" }}
                  name="Peso real"
                />
                {chartData.some((d) => d.objetivo) && (
                  <Line
                    type="monotone"
                    dataKey="objetivo"
                    stroke="oklch(0.6 0.18 200)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Objetivo"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Objetivos */}
      {weightGoals && weightGoals.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Objetivos de peso
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {weightGoals.map((goal) => {
                const targetDateStr = formatDateStr(goal.targetDate);
                const targetDate = new Date(targetDateStr + "T12:00:00");
                const achieved = latestWeight !== null && latestWeight <= goal.targetWeight;
                return (
                  <div key={goal.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Badge variant={achieved ? "default" : "secondary"} className="text-xs">
                        {achieved ? "✓ Conseguido" : "Pendiente"}
                      </Badge>
                      <span className="text-sm font-medium">{goal.label ?? format(targetDate, "d 'de' MMMM", { locale: es })}</span>
                      <span className="text-sm text-muted-foreground">{goal.targetWeight} kg</span>
                    </div>
                    <button
                      onClick={() => deleteGoal.mutate({ id: goal.id })}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de registros */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Registros de peso */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">Historial de peso</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {!weightLogs || weightLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin registros aún</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {[...weightLogs].reverse().map((log, i) => {
                  const prev = weightLogs[weightLogs.length - 2 - i];
                  const diff = prev ? log.weight - prev.weight : null;
                  const dateStr = formatDateStr(log.logDate);
                  const date = new Date(dateStr + "T12:00:00");
                  return (
                    <div key={log.id} className="flex items-center justify-between group py-1 text-sm">
                      <span className="text-muted-foreground">
                        {format(date, "d MMM yyyy", { locale: es })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{log.weight} kg</span>
                        {diff !== null && (
                          <span className={`text-xs ${diff < 0 ? "text-green-600" : diff > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                          </span>
                        )}
                        <button
                          onClick={() => deleteWeight.mutate({ id: log.id })}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actividad física */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Actividad física
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {!activityLogs || activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin actividad registrada</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {[...activityLogs].reverse().map((log) => {
                  const dateStr = formatDateStr(log.logDate);
                  const date = new Date(dateStr + "T12:00:00");
                  return (
                    <div key={log.id} className="flex items-center justify-between group py-1 text-sm">
                      <div>
                        <span className="font-medium">{log.activityType}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {format(date, "d MMM", { locale: es })}
                          {log.duration ? ` · ${log.duration}min` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs capitalize">{log.intensity}</Badge>
                        <button
                          onClick={() => deleteActivity.mutate({ id: log.id })}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <Dialog open={weightOpen} onOpenChange={setWeightOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar peso</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Peso (kg) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="143.5"
                  value={weightForm.weight}
                  onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Fecha *</Label>
                <Input
                  type="date"
                  value={weightForm.logDate}
                  onChange={(e) => setWeightForm({ ...weightForm, logDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Notas</Label>
              <Textarea
                placeholder="Comentarios..."
                value={weightForm.notes}
                onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setWeightOpen(false)}>Cancelar</Button>
              <Button
                disabled={!weightForm.weight || !weightForm.logDate}
                onClick={() => addWeight.mutate({ weight: Number(weightForm.weight), logDate: weightForm.logDate, notes: weightForm.notes })}
              >
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Añadir objetivo de peso</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Etiqueta (ej: "20 abril")</Label>
              <Input
                placeholder="20 abril"
                value={goalForm.label}
                onChange={(e) => setGoalForm({ ...goalForm, label: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Fecha objetivo *</Label>
                <Input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Peso objetivo (kg) *</Label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="122"
                  value={goalForm.targetWeight}
                  onChange={(e) => setGoalForm({ ...goalForm, targetWeight: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setGoalOpen(false)}>Cancelar</Button>
              <Button
                disabled={!goalForm.targetDate || !goalForm.targetWeight}
                onClick={() => addGoal.mutate({ targetDate: goalForm.targetDate, targetWeight: Number(goalForm.targetWeight), label: goalForm.label })}
              >
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar actividad</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Actividad *</Label>
              <Input
                placeholder="Gimnasio 1h, Baloncesto, Paseo..."
                value={activityForm.activityType}
                onChange={(e) => setActivityForm({ ...activityForm, activityType: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Fecha *</Label>
                <Input
                  type="date"
                  value={activityForm.logDate}
                  onChange={(e) => setActivityForm({ ...activityForm, logDate: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Duración (min)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={activityForm.duration}
                  onChange={(e) => setActivityForm({ ...activityForm, duration: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Intensidad</Label>
              <div className="flex gap-2">
                {(["baja", "media", "alta"] as const).map((i) => (
                  <button
                    key={i}
                    onClick={() => setActivityForm({ ...activityForm, intensity: i })}
                    className={`px-3 py-1.5 rounded-lg text-sm capitalize border transition-colors ${
                      activityForm.intensity === i
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setActivityOpen(false)}>Cancelar</Button>
              <Button
                disabled={!activityForm.activityType || !activityForm.logDate}
                onClick={() =>
                  addActivity.mutate({
                    logDate: activityForm.logDate,
                    activityType: activityForm.activityType,
                    duration: activityForm.duration ? Number(activityForm.duration) : undefined,
                    intensity: activityForm.intensity,
                  })
                }
              >
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
