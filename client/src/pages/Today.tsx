import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CalendarDays,
  ChefHat,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Utensils,
  Moon,
  Sun,
  Coffee,
  TrendingDown,
  Scale,
} from "lucide-react";
import { format, addDays, isToday, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Today() {
  const { user, isAuthenticated } = useAuth();
  const today = new Date();
  const from = formatDate(today);
  const to = formatDate(addDays(today, 13));

  const { data: scheduled, refetch } = trpc.menu.listScheduledDays.useQuery({ from, to });
  const { data: weightLogs } = trpc.health.listWeightLogs.useQuery();
  const { data: shoppingItems } = trpc.recipes.getShoppingList.useQuery();
  const updateStatus = trpc.menu.updateScheduledDay.useMutation({ onSuccess: () => refetch() });
  const addToShoppingList = trpc.recipes.addShoppingItem.useMutation({
    onSuccess: () => toast.success("Ingrediente añadido a la lista de la compra"),
  });

  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestor de Dieta Médica</h1>
          <p className="text-muted-foreground max-w-md">
            Controla tu dieta, registra tu peso y sigue tu progreso hacia tus objetivos de salud.
          </p>
        </div>
        <Button size="lg" asChild>
          <a href={getLoginUrl()}>Iniciar sesión</a>
        </Button>
      </div>
    );
  }

  const todayScheduled = scheduled?.filter((s) => {
    const d = s.scheduled.scheduledDate;
    const dateStr = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
    return dateStr === from;
  });

  const upcomingScheduled = scheduled?.filter((s) => {
    const d = s.scheduled.scheduledDate;
    const dateStr = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
    return dateStr > from;
  });

  const latestWeight = weightLogs && weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const pendingShopping = shoppingItems?.filter((i) => !i.isPurchased).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Buenos días, {user?.name?.split(" ")[0] ?? "usuario"} 👋
          </h1>
          <p className="text-muted-foreground">
            {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/upload">
            <Button variant="outline" size="sm" className="gap-2">
              <ChefHat className="w-4 h-4" />
              Subir dieta
            </Button>
          </Link>
          <Link href="/calendar">
            <Button size="sm" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Calendario
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peso actual</p>
              <p className="font-bold text-foreground">
                {latestWeight ? `${latestWeight.weight} kg` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Días programados</p>
              <p className="font-bold text-foreground">{scheduled?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lista compra</p>
              <p className="font-bold text-foreground">{pendingShopping} items</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Días completados</p>
              <p className="font-bold text-foreground">
                {scheduled?.filter((s) => s.scheduled.status === "completed").length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menú de hoy */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Sun className="w-5 h-5 text-yellow-500" />
          Menú de hoy
        </h2>
        {!todayScheduled || todayScheduled.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-8 text-center">
              <Utensils className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No tienes ningún menú programado para hoy.</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Link href="/calendar">
                  <Button variant="outline" size="sm">Programar menú</Button>
                </Link>
                <Link href="/upload">
                  <Button size="sm">Subir dieta</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          todayScheduled.map((s) => (
            <DayMenuCard
              key={s.scheduled.id}
              scheduled={s}
              isToday={true}
              onStatusChange={(status) =>
                updateStatus.mutate({ id: s.scheduled.id, status })
              }
              onAddToShoppingList={(ingredient) =>
                addToShoppingList.mutate({ ingredientName: ingredient, scheduledDayId: s.scheduled.id })
              }
              expanded={expandedDay === s.scheduled.id}
              onToggleExpand={() =>
                setExpandedDay(expandedDay === s.scheduled.id ? null : s.scheduled.id)
              }
            />
          ))
        )}
      </div>

      {/* Próximos días */}
      {upcomingScheduled && upcomingScheduled.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Próximos días programados
          </h2>
          <div className="space-y-3">
            {upcomingScheduled.slice(0, 7).map((s) => (
              <DayMenuCard
                key={s.scheduled.id}
                scheduled={s}
                isToday={false}
                onStatusChange={(status) =>
                  updateStatus.mutate({ id: s.scheduled.id, status })
                }
                onAddToShoppingList={(ingredient) =>
                  addToShoppingList.mutate({ ingredientName: ingredient, scheduledDayId: s.scheduled.id })
                }
                expanded={expandedDay === s.scheduled.id}
                onToggleExpand={() =>
                  setExpandedDay(expandedDay === s.scheduled.id ? null : s.scheduled.id)
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface DayMenuCardProps {
  scheduled: {
    scheduled: {
      id: number;
      scheduledDate: Date | string;
      status: string;
      notes?: string | null;
    };
    menu: {
      id: number;
      breakfast?: string | null;
      lunch1: string;
      lunch2?: string | null;
      dinner1: string;
      dinner2?: string | null;
    } | null;
  };
  isToday: boolean;
  onStatusChange: (status: "pending" | "completed" | "skipped") => void;
  onAddToShoppingList: (ingredient: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

function DayMenuCard({ scheduled, isToday, onStatusChange, onAddToShoppingList, expanded, onToggleExpand }: DayMenuCardProps) {
  const { scheduled: s, menu } = scheduled;
  const dateVal = s.scheduledDate;
  const dateStr = dateVal instanceof Date ? dateVal.toISOString().slice(0, 10) : String(dateVal).slice(0, 10);
  const date = new Date(dateStr + "T12:00:00");

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800 border-green-200",
    pending: "bg-yellow-50 text-yellow-800 border-yellow-200",
    skipped: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <Card
      className={`border transition-all ${isToday ? "border-primary/30 shadow-md" : "shadow-sm"} ${
        s.status === "completed" ? "opacity-75" : ""
      }`}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isToday && (
              <Badge className="bg-primary text-primary-foreground text-xs">HOY</Badge>
            )}
            <span className="font-semibold text-sm capitalize">
              {format(date, "EEEE, d 'de' MMMM", { locale: es })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${statusColors[s.status] ?? ""}`}>
              {s.status === "completed" ? "Completado" : s.status === "skipped" ? "Saltado" : "Pendiente"}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onToggleExpand} className="h-7 px-2 text-xs">
              {expanded ? "Ver menos" : "Ver más"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {menu ? (
          <div className="space-y-3">
            {/* Desayuno */}
            {menu.breakfast && (
              <div className="flex items-start gap-2">
                <Coffee className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Desayuno</p>
                  <p className="text-sm">{menu.breakfast}</p>
                </div>
              </div>
            )}

            {/* Almuerzo */}
            <div className="flex items-start gap-2">
              <Sun className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Almuerzo</p>
                <p className="text-sm font-medium">{menu.lunch1}</p>
                {menu.lunch2 && <p className="text-sm text-muted-foreground">{menu.lunch2}</p>}
              </div>
            </div>

            <Separator />

            {/* Cena */}
            <div className="flex items-start gap-2">
              <Moon className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cena</p>
                <p className="text-sm font-medium">{menu.dinner1}</p>
                {menu.dinner2 && <p className="text-sm text-muted-foreground">{menu.dinner2}</p>}
              </div>
            </div>

            {/* Acciones expandidas */}
            {expanded && (
              <div className="pt-2 border-t space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Ingredientes principales:</p>
                  <div className="flex flex-wrap gap-1">
                    {[menu.lunch1, menu.lunch2, menu.dinner1, menu.dinner2]
                      .filter(Boolean)
                      .map((item, i) => (
                        <button
                          key={i}
                          onClick={() => onAddToShoppingList(item!)}
                          className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full hover:bg-primary/10 transition-colors"
                        >
                          + {item}
                        </button>
                      ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Toca un plato para añadirlo a la lista de la compra</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {s.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                      onClick={() => onStatusChange("completed")}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Marcar completado
                    </Button>
                  )}
                  {s.status !== "skipped" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-muted-foreground"
                      onClick={() => onStatusChange("skipped")}
                    >
                      Saltado
                    </Button>
                  )}
                  {s.status !== "pending" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-muted-foreground"
                      onClick={() => onStatusChange("pending")}
                    >
                      Pendiente
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Menú no disponible</p>
        )}
      </CardContent>
    </Card>
  );
}
