import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";
import {
  Scale, Plus, Trash2, Target, TrendingDown, Activity,
  Dumbbell, CalendarDays, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

function formatDateStr(d: Date | string) {
  const date = d instanceof Date ? d : new Date(String(d) + "T12:00:00");
  return date.toISOString().slice(0, 10);
}

export default function WeightTracker() {
  const { data: weightLogs, refetch: refetchWeight } = trpc.health.listWeightLogs.useQuery();
  const { data: weightGoals, refetch: refetchGoals } = trpc.health.listWeightGoals.useQuery();
  const { data: activityLogs, refetch: refetchActivity } = trpc.health.listActivityLogs.useQuery();

  const addWeight = trpc.health.addWeightLog.useMutation({
    onSuccess: () => { refetchWeight(); setWeightOpen(false); setWeightForm({ weight: "", logDate: new Date().toISOString().slice(0, 10), notes: "" }); toast.success("Peso registrado"); },
  });
  const deleteWeight = trpc.health.deleteWeightLog.useMutation({ onSuccess: () => refetchWeight() });
  const addGoal = trpc.health.addWeightGoal.useMutation({
    onSuccess: () => { refetchGoals(); setGoalOpen(false); setGoalForm({ targetDate: "", targetWeight: "", label: "" }); toast.success("Objetivo añadido"); },
  });
  const deleteGoal = trpc.health.deleteWeightGoal.useMutation({ onSuccess: () => refetchGoals() });
  const addActivity = trpc.health.addActivityLog.useMutation({
    onSuccess: () => { refetchActivity(); setActivityOpen(false); setActivityForm({ logDate: new Date().toISOString().slice(0, 10), activityType: "", duration: "", intensity: "media", notes: "" }); toast.success("Actividad registrada"); },
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

  // Datos calculados
  const sortedLogs = [...(weightLogs ?? [])].sort((a, b) =>
    new Date(String(a.logDate)).getTime() - new Date(String(b.logDate)).getTime()
  );
  const latestWeight = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1].weight : null;
  const firstWeight = sortedLogs.length > 0 ? sortedLogs[0].weight : null;
  const totalLost = firstWeight !== null && latestWeight !== null ? firstWeight - latestWeight : null;

  // Datos para la gráfica
  const chartData = sortedLogs.map((log) => ({
    date: formatDateStr(log.logDate),
    peso: log.weight,
  }));

  // Análisis de objetivos
  const today = new Date();
  const goalsAnalysis = (weightGoals ?? []).map((goal) => {
    const targetDate = new Date(formatDateStr(goal.targetDate) + "T12:00:00");
    const daysTotal = firstWeight && sortedLogs.length > 0
      ? differenceInDays(targetDate, new Date(formatDateStr(sortedLogs[0].logDate) + "T12:00:00"))
      : null;
    const daysElapsed = sortedLogs.length > 0
      ? differenceInDays(today, new Date(formatDateStr(sortedLogs[0].logDate) + "T12:00:00"))
      : null;
    const daysRemaining = differenceInDays(targetDate, today);
    const kgToLose = firstWeight !== null ? firstWeight - goal.targetWeight : null;
    const kgLost = totalLost ?? 0;
    const kgRemaining = latestWeight !== null ? latestWeight - goal.targetWeight : null;
    const progressPct = kgToLose && kgToLose > 0 ? Math.min(100, Math.max(0, (kgLost / kgToLose) * 100)) : 0;
    const achieved = latestWeight !== null && latestWeight <= goal.targetWeight;
    const overdue = daysRemaining < 0 && !achieved;

    return {
      ...goal,
      targetDate,
      daysTotal,
      daysElapsed,
      daysRemaining,
      kgToLose,
      kgLost,
      kgRemaining,
      progressPct,
      achieved,
      overdue,
    };
  });

  // Semana anterior
  const weeklyChange = (() => {
    if (sortedLogs.length < 2) return null;
    const last = sortedLogs[sortedLogs.length - 1];
    const prev = sortedLogs[sortedLogs.length - 2];
    return last.weight - prev.weight;
  })();

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Control de Peso
          </h1>
          <p className="text-sm text-muted-foreground">Seguimiento y objetivos</p>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setActivityOpen(true)} className="gap-1.5 h-9">
            <Dumbbell className="w-4 h-4" />
            <span className="hidden sm:inline">Actividad</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)} className="gap-1.5 h-9">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Objetivo</span>
          </Button>
          <Button size="sm" onClick={() => setWeightOpen(true)} className="gap-1.5 h-9">
            <Plus className="w-4 h-4" />
            Peso
          </Button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-primary/8 rounded-2xl p-3.5">
          <p className="text-xs text-muted-foreground">Peso actual</p>
          <p className="text-2xl font-bold text-primary">{latestWeight ? `${latestWeight}` : "—"}<span className="text-sm font-normal ml-1">kg</span></p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-3.5">
          <p className="text-xs text-muted-foreground">Peso inicial</p>
          <p className="text-2xl font-bold text-blue-700">{firstWeight ? `${firstWeight}` : "—"}<span className="text-sm font-normal ml-1">kg</span></p>
        </div>
        <div className="bg-green-50 rounded-2xl p-3.5">
          <p className="text-xs text-muted-foreground">Total perdido</p>
          <p className="text-2xl font-bold text-green-700">
            {totalLost !== null ? `${totalLost > 0 ? "-" : "+"}${Math.abs(totalLost).toFixed(1)}` : "—"}
            <span className="text-sm font-normal ml-1">kg</span>
          </p>
        </div>
        <div className={`rounded-2xl p-3.5 ${weeklyChange !== null && weeklyChange < 0 ? "bg-emerald-50" : weeklyChange !== null && weeklyChange > 0 ? "bg-red-50" : "bg-muted/30"}`}>
          <p className="text-xs text-muted-foreground">Último cambio</p>
          <p className={`text-2xl font-bold ${weeklyChange !== null && weeklyChange < 0 ? "text-emerald-700" : weeklyChange !== null && weeklyChange > 0 ? "text-red-600" : "text-foreground"}`}>
            {weeklyChange !== null ? `${weeklyChange > 0 ? "+" : ""}${weeklyChange.toFixed(1)}` : "—"}
            <span className="text-sm font-normal ml-1">kg</span>
          </p>
        </div>
      </div>

      {/* Análisis de objetivos */}
      {goalsAnalysis.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Análisis de objetivos
          </h2>
          <div className="space-y-3">
            {goalsAnalysis.map((goal) => (
              <div
                key={goal.id}
                className={`rounded-2xl border p-4 space-y-3
                  ${goal.achieved ? "border-green-200 bg-green-50/60" : goal.overdue ? "border-red-200 bg-red-50/40" : "border-border bg-card"}`}
              >
                {/* Cabecera del objetivo */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {goal.achieved ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    ) : goal.overdue ? (
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    ) : (
                      <Target className="w-5 h-5 text-primary shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">{goal.label || `Objetivo: ${goal.targetWeight} kg`}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(goal.targetDate, "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{goal.targetWeight} kg</p>
                    <Badge
                      variant={goal.achieved ? "default" : goal.overdue ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {goal.achieved ? "✓ Conseguido" : goal.overdue ? "Vencido" : "En curso"}
                    </Badge>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{goal.progressPct.toFixed(0)}% completado</span>
                    <span>{goal.kgRemaining !== null && goal.kgRemaining > 0 ? `Faltan ${goal.kgRemaining.toFixed(1)} kg` : goal.achieved ? "¡Objetivo alcanzado!" : "—"}</span>
                  </div>
                  <Progress
                    value={goal.progressPct}
                    className={`h-2.5 ${goal.achieved ? "[&>div]:bg-green-500" : goal.overdue ? "[&>div]:bg-red-500" : "[&>div]:bg-primary"}`}
                  />
                </div>

                {/* Estadísticas del objetivo */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-background/80 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Kg perdidos</p>
                    <p className="font-bold text-sm text-green-700">
                      {goal.kgLost > 0 ? `-${goal.kgLost.toFixed(1)}` : "0"} kg
                    </p>
                  </div>
                  <div className="bg-background/80 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Días transcurridos</p>
                    <p className="font-bold text-sm">{goal.daysElapsed ?? "—"}</p>
                  </div>
                  <div className="bg-background/80 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">
                      {goal.daysRemaining >= 0 ? "Días restantes" : "Días pasados"}
                    </p>
                    <p className={`font-bold text-sm ${goal.daysRemaining < 0 ? "text-red-600" : goal.daysRemaining < 14 ? "text-orange-600" : "text-foreground"}`}>
                      {Math.abs(goal.daysRemaining)}
                    </p>
                  </div>
                </div>

                {/* Ritmo necesario */}
                {!goal.achieved && goal.daysRemaining > 0 && goal.kgRemaining !== null && goal.kgRemaining > 0 && (
                  <div className="bg-background/60 rounded-xl p-2.5 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Necesitas perder <strong className="text-foreground">{(goal.kgRemaining / (goal.daysRemaining / 7)).toFixed(2)} kg/semana</strong> para alcanzar el objetivo
                    </p>
                  </div>
                )}

                <button
                  onClick={() => deleteGoal.mutate({ id: goal.id })}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Eliminar objetivo
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gráfica */}
      {chartData.length > 1 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Evolución del peso</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.48 0.15 145)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.48 0.15 145)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 145)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => format(new Date(v + "T12:00:00"), "d/M", { locale: es })}
                />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  formatter={(value: number) => [`${value} kg`, "Peso"]}
                  labelFormatter={(label) => format(new Date(label + "T12:00:00"), "d 'de' MMMM yyyy", { locale: es })}
                />
                <Area
                  type="monotone"
                  dataKey="peso"
                  stroke="oklch(0.48 0.15 145)"
                  strokeWidth={2.5}
                  fill="url(#weightGrad)"
                  dot={{ r: 3, fill: "oklch(0.48 0.15 145)" }}
                  name="Peso"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Historial de registros */}
      <section>
        <h2 className="text-sm font-bold mb-3">Historial de registros</h2>
        {sortedLogs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted p-8 text-center">
            <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Aún no has registrado ningún peso.</p>
            <Button size="sm" onClick={() => setWeightOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Registrar primer peso
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {[...sortedLogs].reverse().map((log, i) => {
              const prev = sortedLogs[sortedLogs.length - 1 - i - 1];
              const diff = prev ? log.weight - prev.weight : null;
              return (
                <div key={log.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
                      <Scale className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{log.weight} kg</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(formatDateStr(log.logDate) + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: es })}
                      </p>
                      {log.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{log.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {diff !== null && (
                      <span className={`text-sm font-semibold ${diff < 0 ? "text-green-600" : diff > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                      </span>
                    )}
                    <button
                      onClick={() => deleteWeight.mutate({ id: log.id })}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Actividad física reciente */}
      {activityLogs && activityLogs.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Actividad física reciente
          </h2>
          <div className="space-y-2">
            {[...activityLogs].reverse().slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{log.activityType}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(formatDateStr(log.logDate) + "T12:00:00"), "d 'de' MMMM", { locale: es })}
                      </p>
                      {log.duration && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {log.duration} min
                        </span>
                      )}
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{log.intensity}</Badge>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteActivity.mutate({ id: log.id })}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Dialogs ─────────────────────────────────────────────────────────── */}

      {/* Registrar peso */}
      <Dialog open={weightOpen} onOpenChange={setWeightOpen}>
        <DialogContent className="max-w-sm w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Registrar peso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Peso (kg) *</Label>
              <Input
                type="number"
                step="0.1"
                min="30"
                max="300"
                value={weightForm.weight}
                onChange={(e) => setWeightForm((f) => ({ ...f, weight: e.target.value }))}
                className="mt-1.5 text-lg font-semibold h-12"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha</Label>
              <Input
                type="date"
                value={weightForm.logDate}
                onChange={(e) => setWeightForm((f) => ({ ...f, logDate: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Notas (opcional)</Label>
              <Textarea
                value={weightForm.notes}
                onChange={(e) => setWeightForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1.5 resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setWeightOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1"
                disabled={!weightForm.weight || addWeight.isPending}
                onClick={() => addWeight.mutate({
                  weight: parseFloat(weightForm.weight),
                  logDate: weightForm.logDate,
                  notes: weightForm.notes || undefined,
                })}
              >
                {addWeight.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Añadir objetivo */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="max-w-sm w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Nuevo objetivo de peso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Peso objetivo (kg) *</Label>
              <Input
                type="number"
                step="0.5"
                min="30"
                max="300"
                value={goalForm.targetWeight}
                onChange={(e) => setGoalForm((f) => ({ ...f, targetWeight: e.target.value }))}
                className="mt-1.5 text-lg font-semibold h-12"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha límite *</Label>
              <Input
                type="date"
                value={goalForm.targetDate}
                onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Etiqueta (ej: "20 de abril")</Label>
              <Input
                value={goalForm.label}
                onChange={(e) => setGoalForm((f) => ({ ...f, label: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setGoalOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1"
                disabled={!goalForm.targetWeight || !goalForm.targetDate || addGoal.isPending}
                onClick={() => addGoal.mutate({
                  targetWeight: parseFloat(goalForm.targetWeight),
                  targetDate: goalForm.targetDate,
                  label: goalForm.label || undefined,
                })}
              >
                {addGoal.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Registrar actividad */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="max-w-sm w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              Registrar actividad
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Actividad *</Label>
              <Input
                value={activityForm.activityType}
                onChange={(e) => setActivityForm((f) => ({ ...f, activityType: e.target.value }))}
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Fecha</Label>
                <Input
                  type="date"
                  value={activityForm.logDate}
                  onChange={(e) => setActivityForm((f) => ({ ...f, logDate: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Duración (min)</Label>
                <Input
                  type="number"
                  value={activityForm.duration}
                  onChange={(e) => setActivityForm((f) => ({ ...f, duration: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Intensidad</Label>
              <div className="flex gap-2 mt-1.5">
                {(["baja", "media", "alta"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setActivityForm((f) => ({ ...f, intensity: level }))}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium capitalize transition-all
                      ${activityForm.intensity === level ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Notas</Label>
              <Textarea
                value={activityForm.notes}
                onChange={(e) => setActivityForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1.5 resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setActivityOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1"
                disabled={!activityForm.activityType || addActivity.isPending}
                onClick={() => addActivity.mutate({
                  activityType: activityForm.activityType,
                  logDate: activityForm.logDate,
                  duration: activityForm.duration ? parseInt(activityForm.duration) : undefined,
                  intensity: activityForm.intensity,
                  notes: activityForm.notes || undefined,
                })}
              >
                {addActivity.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
