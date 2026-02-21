import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Plus,
  Circle,
  ShoppingBag,
} from "lucide-react";
import { format, addDays } from "date-fns";
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
    onSuccess: () => toast.success("✓ Añadido a la lista de la compra"),
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Gestor de Dieta</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Controla tu dieta, registra tu peso y sigue tu progreso hacia tus objetivos de salud.
          </p>
        </div>
        <Button size="lg" className="w-full max-w-xs" asChild>
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
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Hola, {user?.name?.split(" ")[0] ?? "usuario"} 👋
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {format(today, "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <Link href="/upload">
          <Button size="sm" className="gap-1.5 h-9">
            <Plus className="w-4 h-4" />
            Subir dieta
          </Button>
        </Link>
      </div>

      {/* Stats rápidas — scroll horizontal en móvil */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          icon={<Scale className="w-5 h-5 text-primary" />}
          bg="bg-primary/8"
          label="Peso actual"
          value={latestWeight ? `${latestWeight.weight} kg` : "—"}
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-50"
          label="Días programados"
          value={String(scheduled?.length ?? 0)}
        />
        <StatCard
          icon={<ShoppingCart className="w-5 h-5 text-orange-600" />}
          bg="bg-orange-50"
          label="Lista compra"
          value={`${pendingShopping} items`}
        />
        <StatCard
          icon={<TrendingDown className="w-5 h-5 text-green-600" />}
          bg="bg-green-50"
          label="Completados"
          value={String(scheduled?.filter((s) => s.scheduled.status === "completed").length ?? 0)}
        />
      </div>

      {/* Menú de hoy */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-5 h-5 text-yellow-500" />
          <h2 className="text-base font-bold">Menú de hoy</h2>
        </div>

        {!todayScheduled || todayScheduled.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted p-8 text-center">
            <Utensils className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-4">No tienes ningún menú programado para hoy.</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Link href="/calendar">
                <Button variant="outline" size="sm">Programar menú</Button>
              </Link>
              <Link href="/upload">
                <Button size="sm">Subir dieta</Button>
              </Link>
            </div>
          </div>
        ) : (
          todayScheduled.map((s) => (
            <DayMenuCard
              key={s.scheduled.id}
              scheduled={s}
              isToday={true}
              onStatusChange={(status) => updateStatus.mutate({ id: s.scheduled.id, status })}
              onAddToShoppingList={(ingredient) =>
                addToShoppingList.mutate({ ingredientName: ingredient, scheduledDayId: s.scheduled.id })
              }
            />
          ))
        )}
      </section>

      {/* Próximos días */}
      {upcomingScheduled && upcomingScheduled.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-bold">Próximos días</h2>
          </div>
          <div className="space-y-3">
            {upcomingScheduled.slice(0, 7).map((s) => (
              <DayMenuCard
                key={s.scheduled.id}
                scheduled={s}
                isToday={false}
                onStatusChange={(status) => updateStatus.mutate({ id: s.scheduled.id, status })}
                onAddToShoppingList={(ingredient) =>
                  addToShoppingList.mutate({ ingredientName: ingredient, scheduledDayId: s.scheduled.id })
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: string }) {
  return (
    <div className={`${bg} rounded-2xl p-3.5 flex items-center gap-3`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="font-bold text-foreground text-sm">{value}</p>
      </div>
    </div>
  );
}

// ─── Ingredient Chip with long-press / tap to add to shopping ─────────────────

function IngredientChip({ text, onAdd }: { text: string; onAdd: () => void }) {
  const [pressed, setPressed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => {
      setPressed(true);
      onAdd();
    }, 600);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div className="relative inline-block">
      <button
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setShowHint(true)}
        onMouseLeave={() => setShowHint(false)}
        onClick={onAdd}
        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all active:scale-95
          ${pressed
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-border text-foreground hover:bg-primary/10 hover:border-primary/40"
          }`}
      >
        <ShoppingBag className="w-3 h-3 opacity-60" />
        {text}
      </button>
      {showHint && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-foreground text-background text-xs rounded-lg px-2 py-1 whitespace-nowrap z-50 pointer-events-none shadow-lg">
          Añadir a la compra
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── Meal Block ───────────────────────────────────────────────────────────────

function MealBlock({
  icon,
  iconColor,
  bgColor,
  borderColor,
  label,
  line1,
  line2,
  completed,
  onComplete,
  onAddIngredient,
}: {
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
  line1: string;
  line2?: string | null;
  completed: boolean;
  onComplete: () => void;
  onAddIngredient: (item: string) => void;
}) {
  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-3.5 transition-all ${completed ? "opacity-60" : ""}`}>
      {/* Header de la comida */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${bgColor}`}>
            {icon}
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wider ${iconColor}`}>{label}</span>
        </div>
        <button
          onClick={onComplete}
          className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 transition-all active:scale-95
            ${completed
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-white/80 text-muted-foreground border border-border hover:border-green-300 hover:text-green-600"
            }`}
        >
          {completed ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <Circle className="w-3.5 h-3.5" />
          )}
          {completed ? "Completado" : "Marcar"}
        </button>
      </div>

      {/* Platos */}
      <div className="space-y-1.5 mb-3">
        {/* Primer plato */}
        <div className="flex items-start gap-2">
          <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 mt-0.5">1°</span>
          <p className="text-sm font-medium text-foreground leading-snug">{line1}</p>
        </div>
        {/* Segundo plato */}
        {line2 && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 mt-0.5">2°</span>
            <p className="text-sm font-medium text-foreground leading-snug">{line2}</p>
          </div>
        )}
      </div>

      {/* Ingredientes / añadir a la compra */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Toca para añadir a la compra:</p>
        <div className="flex flex-wrap gap-1.5">
          <IngredientChip text={line1} onAdd={() => onAddIngredient(line1)} />
          {line2 && <IngredientChip text={line2} onAdd={() => onAddIngredient(line2!)} />}
        </div>
      </div>
    </div>
  );
}

// ─── Day Menu Card ────────────────────────────────────────────────────────────

interface DayMenuCardProps {
  scheduled: {
    scheduled: {
      id: number;
      scheduledDate: Date | string;
      status: string;
      notes?: string | null;
      lunchCompleted?: boolean | null;
      dinnerCompleted?: boolean | null;
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
}

function DayMenuCard({ scheduled, isToday, onStatusChange, onAddToShoppingList }: DayMenuCardProps) {
  const { scheduled: s, menu } = scheduled;
  const dateVal = s.scheduledDate;
  const dateStr = dateVal instanceof Date ? dateVal.toISOString().slice(0, 10) : String(dateVal).slice(0, 10);
  const date = new Date(dateStr + "T12:00:00");

  const [lunchDone, setLunchDone] = useState(s.lunchCompleted ?? false);
  const [dinnerDone, setDinnerDone] = useState(s.dinnerCompleted ?? false);

  const handleLunchComplete = () => {
    const next = !lunchDone;
    setLunchDone(next);
    if (next && dinnerDone) onStatusChange("completed");
    else if (!next) onStatusChange("pending");
  };

  const handleDinnerComplete = () => {
    const next = !dinnerDone;
    setDinnerDone(next);
    if (next && lunchDone) onStatusChange("completed");
    else if (!next) onStatusChange("pending");
  };

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all
        ${isToday ? "border-primary/40 shadow-md" : "border-border shadow-sm"}
        ${s.status === "completed" ? "opacity-70" : ""}
      `}
    >
      {/* Cabecera del día */}
      <div className={`px-4 py-3 flex items-center justify-between ${isToday ? "bg-primary/8" : "bg-muted/30"}`}>
        <div className="flex items-center gap-2">
          {isToday && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">HOY</span>
          )}
          <span className="font-semibold text-sm capitalize">
            {format(date, "EEEE, d 'de' MMMM", { locale: es })}
          </span>
        </div>
        {s.status === "completed" && (
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        )}
      </div>

      {/* Contenido */}
      <div className="p-3 space-y-2.5">
        {menu ? (
          <>
            {/* Desayuno (si existe) */}
            {menu.breakfast && (
              <div className="flex items-start gap-2 px-1 pb-1 border-b border-dashed">
                <Coffee className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Desayuno</p>
                  <p className="text-sm text-foreground">{menu.breakfast}</p>
                </div>
              </div>
            )}

            {/* Almuerzo */}
            <MealBlock
              icon={<Sun className="w-4 h-4 text-orange-500" />}
              iconColor="text-orange-600"
              bgColor="bg-orange-50/60"
              borderColor="border-orange-200"
              label="Almuerzo"
              line1={menu.lunch1}
              line2={menu.lunch2}
              completed={lunchDone}
              onComplete={handleLunchComplete}
              onAddIngredient={onAddToShoppingList}
            />

            {/* Cena */}
            <MealBlock
              icon={<Moon className="w-4 h-4 text-indigo-500" />}
              iconColor="text-indigo-600"
              bgColor="bg-indigo-50/60"
              borderColor="border-indigo-200"
              label="Cena"
              line1={menu.dinner1}
              line2={menu.dinner2}
              completed={dinnerDone}
              onComplete={handleDinnerComplete}
              onAddIngredient={onAddToShoppingList}
            />

            {/* Estado global */}
            {s.status !== "completed" && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5 text-green-700 border-green-300 hover:bg-green-50 h-9"
                  onClick={() => onStatusChange("completed")}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Día completado
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground h-9 px-3"
                  onClick={() => onStatusChange("skipped")}
                >
                  Saltado
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic px-1 py-2">Menú no disponible</p>
        )}
      </div>
    </div>
  );
}
