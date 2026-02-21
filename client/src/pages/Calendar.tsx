import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, addDays, startOfWeek, addWeeks, subWeeks, isToday as dateFnsIsToday } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  GripVertical,
  Trash2,
  Sun,
  Moon,
  Coffee,
  Search,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";

function formatDate(d: Date) {
  // Usamos getUTC* para evitar desfase de zona horaria
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const PAGE_SIZE = 7;

export default function Calendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);
  const [addDayOpen, setAddDayOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuPage, setMenuPage] = useState(0);
  type ScheduledItem = NonNullable<typeof scheduled>[0];
  const [detailItem, setDetailItem] = useState<ScheduledItem | null>(null);

  const from = formatDate(weekStart);
  const to = formatDate(addDays(weekStart, 6));

  const { data: scheduled, refetch } = trpc.menu.listScheduledDays.useQuery({ from, to });
  const { data: menuDays } = trpc.menu.listMenuDays.useQuery();

  const scheduleDay = trpc.menu.scheduleDay.useMutation({
    onSuccess: () => {
      refetch();
      setAddDayOpen(false);
      setSelectedMenuId(null);
      setSearchQuery("");
      toast.success("Día programado correctamente");
    },
  });
  const deleteScheduled = trpc.menu.deleteScheduledDay.useMutation({
    onSuccess: () => { refetch(); toast.success("Día eliminado del calendario"); },
  });
  const reorder = trpc.menu.reorderScheduledDays.useMutation({ onSuccess: () => refetch() });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getDayScheduled = (date: Date) => {
    const dateStr = formatDate(date);
    return scheduled?.filter((s) => {
      const d = s.scheduled.scheduledDate;
      const ds = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
      return ds === dateStr;
    }) ?? [];
  };

  // Filtered + paginated menu list
  const filteredMenus = useMemo(() => {
    if (!menuDays) return [];
    const q = searchQuery.toLowerCase();
    if (!q) return menuDays;
    return menuDays.filter(
      (m) =>
        m.lunch1.toLowerCase().includes(q) ||
        (m.lunch2 ?? "").toLowerCase().includes(q) ||
        m.dinner1.toLowerCase().includes(q) ||
        (m.dinner2 ?? "").toLowerCase().includes(q)
    );
  }, [menuDays, searchQuery]);

  const totalPages = Math.ceil(filteredMenus.length / PAGE_SIZE);
  const pagedMenus = filteredMenus.slice(menuPage * PAGE_SIZE, (menuPage + 1) * PAGE_SIZE);

  const handleDragStart = (id: number) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    setDropTargetDate(date);
  };
  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    if (draggedId === null) return;
    const targetItems = scheduled?.filter((s) => {
      const d = s.scheduled.scheduledDate;
      const ds = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
      return ds === targetDate;
    }) ?? [];
    reorder.mutate([{ id: draggedId, sortOrder: targetItems.length, scheduledDate: targetDate }]);
    setDraggedId(null);
    setDropTargetDate(null);
  };

  const openAddDialog = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedMenuId(null);
    setSearchQuery("");
    setMenuPage(0);
    setAddDayOpen(true);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">Calendario</h1>
          <p className="text-xs text-muted-foreground">
            {format(weekStart, "d MMM", { locale: es })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Vista semanal: lista en móvil, cuadrícula en desktop */}
      <div className="flex flex-col sm:grid sm:grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dateStr = formatDate(day);
          const dayItems = getDayScheduled(day);
          const isCurrentDay = dateFnsIsToday(day);
          const isDragTarget = dropTargetDate === dateStr;

          return (
            <div
              key={dateStr}
              className={`rounded-2xl border-2 p-3.5 transition-all
                ${isCurrentDay ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-border bg-card"}
                ${isDragTarget ? "border-primary/60 bg-primary/10 scale-[1.01]" : ""}
              `}
              onDragOver={(e) => handleDragOver(e, dateStr)}
              onDrop={(e) => handleDrop(e, dateStr)}
              onDragLeave={() => setDropTargetDate(null)}
            >
              {/* Cabecera del día */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shrink-0
                    ${isCurrentDay ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {format(day, "d")}
                  </div>
                  <div>
                    <p className={`text-sm font-bold capitalize ${isCurrentDay ? "text-primary" : "text-foreground"}`}>
                      {format(day, "EEEE", { locale: es })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(day, "d 'de' MMMM", { locale: es })}
                    </p>
                  </div>
                </div>
                {isCurrentDay && (
                  <Badge className="text-[10px] h-5 bg-primary text-primary-foreground">Hoy</Badge>
                )}
              </div>

              {/* Menús del día */}
              <div className="space-y-1.5">
                {dayItems.map((s) => (
                  <div
                    key={s.scheduled.id}
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); handleDragStart(s.scheduled.id); }}
                    onClick={() => setDetailItem(s)}
                    className={`group relative rounded-xl border bg-background p-2.5 cursor-pointer shadow-sm hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.98]
                      ${draggedId === s.scheduled.id ? "opacity-40 scale-95" : ""}
                      ${s.scheduled.status === "completed" ? "opacity-60 bg-green-50/80 border-green-200" : ""}
                    `}
                  >
                    <div className="flex items-start gap-1.5 pr-5">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1">
                        {s.menu?.breakfast && (
                          <div className="flex items-center gap-1">
                            <Coffee className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{s.menu.breakfast}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-1">
                          <Sun className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground leading-tight truncate">{s.menu?.lunch1 ?? "—"}</p>
                            {s.menu?.lunch2 && <p className="text-xs text-muted-foreground truncate">{s.menu.lunch2}</p>}
                          </div>
                        </div>
                        <div className="flex items-start gap-1">
                          <Moon className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground leading-tight truncate">{s.menu?.dinner1 ?? "—"}</p>
                            {s.menu?.dinner2 && <p className="text-xs text-muted-foreground truncate">{s.menu.dinner2}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                    {s.scheduled.status === "completed" && (
                      <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-green-600" />
                    )}
                    <button
                      onClick={() => deleteScheduled.mutate({ id: s.scheduled.id })}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Botón añadir */}
                <button
                  onClick={() => openAddDialog(dateStr)}
                  className="w-full border-dashed border-2 border-border/60 rounded-xl py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir menú
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog añadir menú — mejorado con búsqueda y paginación */}
      <Dialog open={addDayOpen} onOpenChange={setAddDayOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="w-4 h-4 text-primary" />
              Programar menú
            </DialogTitle>
            {selectedDate && (
              <p className="text-sm text-muted-foreground capitalize">
                {format(new Date(selectedDate + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col px-4 py-3 gap-3">
            {/* Búsqueda */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por plato..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setMenuPage(0); }}
                className="pl-9 h-9"
              />
            </div>

            {/* Lista de menús */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredMenus.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">
                    {searchQuery ? "No hay menús que coincidan con la búsqueda." : "No hay menús en el historial. Sube una dieta primero."}
                  </p>
                </div>
              ) : (
                pagedMenus.map((m) => {
                  const isSelected = selectedMenuId === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMenuId(isSelected ? null : m.id)}
                      className={`w-full text-left rounded-xl border-2 p-3 transition-all active:scale-[0.99]
                        ${isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                        }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center
                          ${isSelected ? "border-primary bg-primary" : "border-border"}`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start gap-1.5">
                            <Sun className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground leading-tight">{m.lunch1}</p>
                              {m.lunch2 && <p className="text-xs text-muted-foreground">{m.lunch2}</p>}
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground leading-tight">{m.dinner1}</p>
                              {m.dinner2 && <p className="text-xs text-muted-foreground">{m.dinner2}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between shrink-0 pt-1 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={menuPage === 0}
                  onClick={() => setMenuPage((p) => p - 1)}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  {menuPage + 1} / {totalPages} ({filteredMenus.length} menús)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={menuPage >= totalPages - 1}
                  onClick={() => setMenuPage((p) => p + 1)}
                  className="h-8 px-2"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Footer con botones */}
          <div className="flex gap-2 px-4 pb-4 pt-2 border-t shrink-0">
            <Button variant="outline" className="flex-1" onClick={() => setAddDayOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedMenuId || !selectedDate || scheduleDay.isPending}
              onClick={() =>
                scheduleDay.mutate({
                  menuDayId: selectedMenuId!,
                  scheduledDate: selectedDate,
                })
              }
            >
              {scheduleDay.isPending ? "Programando..." : "Programar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog detalle del día */}
      <Dialog open={!!detailItem} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
          {detailItem && (
            <>
              <DialogHeader className="px-4 pt-4 pb-3 border-b">
                <DialogTitle className="text-base capitalize">
                  {format(new Date((
                    detailItem.scheduled.scheduledDate instanceof Date
                      ? detailItem.scheduled.scheduledDate.toISOString()
                      : String(detailItem.scheduled.scheduledDate)
                  ).slice(0, 10) + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </DialogTitle>
                {detailItem.scheduled.status === "completed" && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full w-fit">
                    <CheckCircle2 className="w-3 h-3" />
                    Completado
                  </span>
                )}
              </DialogHeader>
              <div className="p-4 space-y-4">
                {/* Desayuno */}
                {detailItem.menu?.breakfast && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Coffee className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Desayuno</span>
                    </div>
                    <p className="text-sm text-foreground">{detailItem.menu.breakfast}</p>
                  </div>
                )}
                {/* Almuerzo */}
                {detailItem.menu && (
                  <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-700">Almuerzo</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-orange-400 w-5 shrink-0 mt-0.5">1°</span>
                        <p className="text-sm font-medium text-foreground leading-snug">{detailItem.menu.lunch1}</p>
                      </div>
                      {detailItem.menu.lunch2 && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-orange-400 w-5 shrink-0 mt-0.5">2°</span>
                          <p className="text-sm font-medium text-foreground leading-snug">{detailItem.menu.lunch2}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Cena */}
                {detailItem.menu && (
                  <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Cena</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-indigo-400 w-5 shrink-0 mt-0.5">1°</span>
                        <p className="text-sm font-medium text-foreground leading-snug">{detailItem.menu.dinner1}</p>
                      </div>
                      {detailItem.menu.dinner2 && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-indigo-400 w-5 shrink-0 mt-0.5">2°</span>
                          <p className="text-sm font-medium text-foreground leading-snug">{detailItem.menu.dinner2}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Notas */}
                {detailItem.scheduled.notes && (
                  <div className="rounded-xl bg-muted/40 border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Notas</p>
                    <p className="text-sm text-foreground">{detailItem.scheduled.notes}</p>
                  </div>
                )}
                {/* Acciones */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => {
                      deleteScheduled.mutate({ id: detailItem.scheduled.id });
                      setDetailItem(null);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Eliminar
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => setDetailItem(null)}>
                    Cerrar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
