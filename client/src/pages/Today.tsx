import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Eye,
  EyeOff,
  Dumbbell,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Link, useLocation } from "wouter";

// Devuelve YYYY-MM-DD usando la fecha LOCAL del navegador.
// Se usa para determinar qué día es "hoy" según la zona horaria del usuario.
function formatLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Extrae la fecha YYYY-MM-DD de un campo DATE de la BD.
// Con mode:'string' en Drizzle, scheduledDate ya viene como string 'YYYY-MM-DD'.
function extractDbDate(d: string): string {
  return String(d).slice(0, 10);
}

export default function Today() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [dayOffset, setDayOffset] = useState(0);
  const [showWeight, setShowWeight] = useState(false);
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const today = new Date();
  // Usamos fecha LOCAL del navegador para saber qué día es "hoy" para el usuario
  const todayStr = formatLocalDate(today);
  const viewDate = addDays(today, dayOffset);
  const viewDateStr = formatLocalDate(viewDate);
  // Cargamos desde 14 días atrás hasta 14 días adelante para poder navegar
  const from = formatLocalDate(addDays(today, -14));
  const to = formatLocalDate(addDays(today, 14));

  const addWeightLog = trpc.health.addWeightLog.useMutation({
    onSuccess: () => {
      toast.success("Peso registrado");
      setWeightModalOpen(false);
      setWeightInput("");
      navigate("/weight");
    },
    onError: () => toast.error("Error al guardar el peso"),
  });

  const handleAddWeight = () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w < 20 || w > 300) { toast.error("Introduce un peso válido (20–300 kg)"); return; }
    addWeightLog.mutate({ weight: w, logDate: formatLocalDate(new Date()) });
  };

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
    const dateStr = extractDbDate(s.scheduled.scheduledDate);
    return dateStr === viewDateStr;
  });
  const upcomingScheduled = scheduled?.filter((s) => {
    const dateStr = extractDbDate(s.scheduled.scheduledDate);
    return dateStr > viewDateStr;
  });;

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
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-9 text-xs"
            onClick={() => setWeightModalOpen(true)}
          >
            <Scale className="w-3.5 h-3.5" />
            Peso
          </Button>
          <Link href="/weight">
            <Button size="sm" variant="outline" className="gap-1.5 h-9 text-xs">
              <Dumbbell className="w-3.5 h-3.5" />
              Ejercicio
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats rápidas — scroll horizontal en móvil */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Tarjeta de peso con toggle de visibilidad */}
        <button
          onClick={() => setShowWeight((v) => !v)}
          className="bg-primary/8 rounded-2xl p-3.5 flex items-center gap-3 text-left w-full active:scale-95 transition-transform"
        >
          <div className="shrink-0"><Scale className="w-5 h-5 text-primary" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">Peso actual</p>
            <p className="font-bold text-foreground text-sm">
              {showWeight
                ? (latestWeight ? `${latestWeight.weight} kg` : "—")
                : (latestWeight ? "●●● kg" : "—")}
            </p>
          </div>
          <div className="shrink-0 text-muted-foreground">
            {showWeight ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </div>
        </button>
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

      {/* Menú del día con navegación */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-yellow-500" />
            <h2 className="text-base font-bold">
              {dayOffset === 0
                ? "Menú de hoy"
                : dayOffset === 1
                ? "Mañana"
                : dayOffset === -1
                ? "Ayer"
                : format(viewDate, "d 'de' MMMM", { locale: es })}
            </h2>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-lg" onClick={() => setDayOffset((o) => o - 1)}>
              ‹
            </Button>
            {dayOffset !== 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => setDayOffset(0)}>
                Hoy
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-lg" onClick={() => setDayOffset((o) => o + 1)}>
              ›
            </Button>
          </div>
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

      {/* Modal: Añadir peso */}
      <Dialog open={weightModalOpen} onOpenChange={setWeightModalOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Registrar peso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Peso de hoy ({format(new Date(), "d MMM", { locale: es })})</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  min="20"
                  max="300"
                  placeholder="Ej: 85.4"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddWeight()}
                  className="flex-1"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground font-medium">kg</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setWeightModalOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1"
                onClick={handleAddWeight}
                disabled={addWeightLog.isPending || !weightInput}
              >
                {addWeightLog.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  showIngredients = true,
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
  showIngredients?: boolean;
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
      {showIngredients && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Toca para añadir a la compra:</p>
          <div className="flex flex-wrap gap-1.5">
            <IngredientChip text={line1} onAdd={() => onAddIngredient(line1)} />
            {line2 && <IngredientChip text={line2} onAdd={() => onAddIngredient(line2!)} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Day Menu Card ────────────────────────────────────────────────────────────

interface DayMenuCardProps {
  scheduled: {
    scheduled: {
      id: number;
      scheduledDate: string;
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
  const dateStr = extractDbDate(s.scheduledDate);
  const date = new Date(dateStr + "T12:00:00");

  const [lunchDone, setLunchDone] = useState(s.lunchCompleted ?? false);
  const [dinnerDone, setDinnerDone] = useState(s.dinnerCompleted ?? false);
  // En días próximos, los ingredientes empiezan colapsados
  const [showIngredients, setShowIngredients] = useState(isToday);

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

  // Recoge todos los ingredientes del día para añadirlos de golpe
  const allIngredients = [
    menu?.lunch1,
    menu?.lunch2,
    menu?.dinner1,
    menu?.dinner2,
  ].filter(Boolean) as string[];

  const handleAddAll = () => {
    allIngredients.forEach((ing) => onAddToShoppingList(ing));
    toast.success(`✓ ${allIngredients.length} ingredientes añadidos a la compra`);
  };

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all
        ${isToday ? "border-primary/40 shadow-md" : "border-border shadow-sm"}
        ${s.status === "completed" ? "opacity-70" : ""}
      `}
    >
      {/* Cabecera del día */}
      <div className={`px-4 py-3 flex items-center justify-between gap-2 ${isToday ? "bg-primary/8" : "bg-muted/30"}`}>
        <div className="flex items-center gap-2 min-w-0">
          {isToday && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full shrink-0">HOY</span>
          )}
          <span className="font-semibold text-sm capitalize truncate">
            {format(date, "EEEE, d 'de' MMMM", { locale: es })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botón añadir todo a la compra */}
          {menu && allIngredients.length > 0 && (
            <button
              onClick={handleAddAll}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 active:scale-95 transition-all"
              title="Añadir todos los ingredientes del día a la lista de la compra"
            >
              <ShoppingCart className="w-3 h-3" />
              <span className="hidden sm:inline">Todo a la compra</span>
              <span className="sm:hidden">Compra</span>
            </button>
          )}
          {s.status === "completed" && (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          )}
        </div>
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
              showIngredients={showIngredients}
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
              showIngredients={showIngredients}
            />

            {/* Botón mostrar/ocultar ingredientes (solo en días próximos) */}
            {!isToday && (
              <button
                onClick={() => setShowIngredients((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {showIngredients ? "Ocultar ingredientes" : "Ver ingredientes para la compra"}
              </button>
            )}

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
