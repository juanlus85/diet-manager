import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, ReferenceLine,
} from "recharts";
import { BarChart2, TrendingDown, TrendingUp, Target, Scale, Activity, CheckCircle2, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

function formatDateStr(d: Date | string) {
  const date = d instanceof Date ? d : new Date(String(d) + "T12:00:00");
  return date.toISOString().slice(0, 10);
}

export default function Reports() {
  const { data: weightLogs } = trpc.health.listWeightLogs.useQuery();
  const { data: weightGoals } = trpc.health.listWeightGoals.useQuery();
  const { data: activityLogs } = trpc.health.listActivityLogs.useQuery();
  const { data: scheduled } = trpc.menu.listScheduledDays.useQuery({
    from: "2020-01-01",
    to: "2030-12-31",
  });

  // Calcular estadísticas
  const sortedWeights = weightLogs ? [...weightLogs].sort((a, b) => {
    const da = formatDateStr(a.logDate);
    const db = formatDateStr(b.logDate);
    return da.localeCompare(db);
  }) : [];

  const firstWeight = sortedWeights[0]?.weight ?? null;
  const latestWeight = sortedWeights[sortedWeights.length - 1]?.weight ?? null;
  const totalLost = firstWeight && latestWeight ? firstWeight - latestWeight : null;

  // Pérdida semanal promedio
  let weeklyAvg: number | null = null;
  if (sortedWeights.length >= 2) {
    const firstDate = new Date(formatDateStr(sortedWeights[0].logDate) + "T12:00:00");
    const lastDate = new Date(formatDateStr(sortedWeights[sortedWeights.length - 1].logDate) + "T12:00:00");
    const weeks = differenceInDays(lastDate, firstDate) / 7;
    if (weeks > 0 && totalLost !== null) {
      weeklyAvg = totalLost / weeks;
    }
  }

  // Datos para gráfica principal de peso
  const weightChartData = sortedWeights.map((log, i) => {
    const dateStr = formatDateStr(log.logDate);
    const prev = sortedWeights[i - 1];
    const weeklyChange = prev
      ? ((log.weight - prev.weight) / (differenceInDays(
          new Date(dateStr + "T12:00:00"),
          new Date(formatDateStr(prev.logDate) + "T12:00:00")
        ) / 7)).toFixed(2)
      : null;

    return {
      date: dateStr,
      peso: log.weight,
      perdidaSemana: weeklyChange ? Number(weeklyChange) : undefined,
    };
  });

  // Añadir objetivos al chart
  const goalsOnChart = weightGoals?.map((g) => ({
    date: formatDateStr(g.targetDate),
    objetivo: g.targetWeight,
    label: g.label ?? "",
  })) ?? [];

  // Combinar datos para chart con objetivos
  const allDates = new Set([
    ...weightChartData.map((d) => d.date),
    ...goalsOnChart.map((d) => d.date),
  ]);
  const combinedData = Array.from(allDates).sort().map((date) => {
    const w = weightChartData.find((d) => d.date === date);
    const g = goalsOnChart.find((d) => d.date === date);
    return {
      date,
      peso: w?.peso,
      objetivo: g?.objetivo,
      perdidaSemana: w?.perdidaSemana,
    };
  });

  // Estadísticas de dieta
  const totalScheduled = scheduled?.length ?? 0;
  const completed = scheduled?.filter((s) => s.scheduled.status === "completed").length ?? 0;
  const skipped = scheduled?.filter((s) => s.scheduled.status === "skipped").length ?? 0;
  const adherenceRate = totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 0;

  // Actividad por tipo
  const activityByType: Record<string, number> = {};
  activityLogs?.forEach((log) => {
    activityByType[log.activityType] = (activityByType[log.activityType] ?? 0) + 1;
  });
  const activityChartData = Object.entries(activityByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Progreso hacia objetivos
  const goalProgress = weightGoals?.map((goal) => {
    const targetDateStr = formatDateStr(goal.targetDate);
    const targetDate = new Date(targetDateStr + "T12:00:00");
    const achieved = latestWeight !== null && latestWeight <= goal.targetWeight;
    const progress = firstWeight && latestWeight
      ? Math.min(100, Math.round(((firstWeight - latestWeight) / (firstWeight - goal.targetWeight)) * 100))
      : 0;
    return { ...goal, achieved, progress, targetDateStr };
  }) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary" />
          Informes y Estadísticas
        </h1>
        <p className="text-muted-foreground text-sm">Seguimiento completo de tu progreso</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Peso inicial</p>
            </div>
            <p className="text-2xl font-bold text-primary">{firstWeight ? `${firstWeight} kg` : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Peso actual</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{latestWeight ? `${latestWeight} kg` : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Total perdido</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {totalLost !== null ? `${totalLost > 0 ? "" : "+"}${Math.abs(totalLost).toFixed(1)} kg` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-orange-600" />
              <p className="text-xs text-muted-foreground">Media semanal</p>
            </div>
            <p className="text-2xl font-bold text-orange-700">
              {weeklyAvg !== null ? `${weeklyAvg > 0 ? "-" : "+"}${Math.abs(weeklyAvg).toFixed(2)} kg` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica principal de evolución */}
      {combinedData.length > 1 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">Evolución del peso y objetivos</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={combinedData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.48 0.15 145)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.48 0.15 145)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.03 145)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => format(new Date(v + "T12:00:00"), "d/M", { locale: es })}
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
                  labelFormatter={(label) => format(new Date(label + "T12:00:00"), "d 'de' MMMM yyyy", { locale: es })}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="peso"
                  stroke="oklch(0.48 0.15 145)"
                  strokeWidth={2.5}
                  fill="url(#pesoGrad)"
                  dot={{ r: 4, fill: "oklch(0.48 0.15 145)" }}
                  connectNulls
                  name="Peso real"
                />
                <Line
                  type="monotone"
                  dataKey="objetivo"
                  stroke="oklch(0.6 0.18 200)"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ r: 5, fill: "oklch(0.6 0.18 200)" }}
                  connectNulls
                  name="Objetivo"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabla de registros detallada */}
      {sortedWeights.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">Registro detallado de peso</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Peso</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Kg perdidos totales</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Kg perdidos semana</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWeights.map((log, i) => {
                    const dateStr = formatDateStr(log.logDate);
                    const date = new Date(dateStr + "T12:00:00");
                    const totalLostSoFar = firstWeight ? firstWeight - log.weight : 0;
                    const prev = sortedWeights[i - 1];
                    const weekLost = prev ? prev.weight - log.weight : null;

                    // Buscar objetivo para esta fecha
                    const goal = weightGoals?.find((g) => {
                      const gDate = formatDateStr(g.targetDate);
                      return gDate <= dateStr;
                    });
                    const isGoalMet = goal ? log.weight <= goal.targetWeight : false;

                    return (
                      <tr key={log.id} className={`border-b hover:bg-muted/30 ${isGoalMet ? "bg-green-50/50" : ""}`}>
                        <td className="py-2 capitalize">
                          {format(date, "d/MM/yyyy", { locale: es })}
                        </td>
                        <td className="py-2 text-right font-bold">{log.weight} kg</td>
                        <td className={`py-2 text-right ${totalLostSoFar > 0 ? "text-green-600" : "text-red-500"}`}>
                          {totalLostSoFar !== 0 ? `${totalLostSoFar > 0 ? "-" : "+"}${Math.abs(totalLostSoFar).toFixed(1)}` : "—"}
                        </td>
                        <td className={`py-2 text-right ${weekLost !== null ? (weekLost > 0 ? "text-green-600" : weekLost < 0 ? "text-red-500" : "text-muted-foreground") : ""}`}>
                          {weekLost !== null ? `${weekLost > 0 ? "-" : "+"}${Math.abs(weekLost).toFixed(1)}` : "—"}
                        </td>
                        <td className="py-2 text-right">
                          {goal && (
                            <Badge
                              variant={isGoalMet ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {isGoalMet ? "✓ CONSEGUIDO" : "NO CONSEGUIDO"}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progreso hacia objetivos */}
      {goalProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Progreso hacia objetivos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {goalProgress.map((goal) => (
              <div key={goal.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {goal.label ?? format(new Date(goal.targetDateStr + "T12:00:00"), "d 'de' MMMM", { locale: es })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{goal.targetWeight} kg</span>
                    <Badge variant={goal.achieved ? "default" : "secondary"} className="text-xs">
                      {goal.achieved ? "✓ Conseguido" : `${goal.progress}%`}
                    </Badge>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${goal.achieved ? "bg-green-500" : "bg-primary"}`}
                    style={{ width: `${Math.max(0, Math.min(100, goal.progress))}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Estadísticas de dieta */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Cumplimiento de dieta
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Días programados</span>
              <span className="font-bold">{totalScheduled}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">Completados</span>
              <span className="font-bold text-green-600">{completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-500">Saltados</span>
              <span className="font-bold text-red-500">{skipped}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Tasa de adherencia</span>
                <span className="font-bold text-primary">{adherenceRate}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${adherenceRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actividad física */}
        {activityChartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Actividad física
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={activityChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.03 145)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="oklch(0.48 0.15 145)" radius={[4, 4, 0, 0]} name="Veces" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mensaje vacío */}
      {sortedWeights.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <BarChart2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay datos suficientes para mostrar informes.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Registra tu peso en la sección "Control de Peso" para ver estadísticas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
