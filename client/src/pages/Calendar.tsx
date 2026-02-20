import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, GripVertical, Trash2, Sun, Moon, Coffee } from "lucide-react";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Calendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);
  const [addDayOpen, setAddDayOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");

  const from = formatDate(weekStart);
  const to = formatDate(addDays(weekStart, 6));

  const { data: scheduled, refetch } = trpc.menu.listScheduledDays.useQuery({ from, to });
  const { data: menuDays } = trpc.menu.listMenuDays.useQuery();
  const scheduleDay = trpc.menu.scheduleDay.useMutation({
    onSuccess: () => { refetch(); setAddDayOpen(false); toast.success("Día programado"); },
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

  const today = formatDate(new Date());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendario de Dieta</h1>
          <p className="text-muted-foreground text-sm">
            Semana del {format(weekStart, "d 'de' MMMM", { locale: es })} al{" "}
            {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Cuadrícula de la semana */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dateStr = formatDate(day);
          const dayItems = getDayScheduled(day);
          const isCurrentDay = dateStr === today;
          const isDragTarget = dropTargetDate === dateStr;

          return (
            <div
              key={dateStr}
              className={`min-h-[180px] rounded-xl border-2 p-2 transition-all ${
                isCurrentDay ? "border-primary bg-primary/5" : "border-border bg-card"
              } ${isDragTarget ? "border-primary/50 bg-primary/10" : ""}`}
              onDragOver={(e) => handleDragOver(e, dateStr)}
              onDrop={(e) => handleDrop(e, dateStr)}
              onDragLeave={() => setDropTargetDate(null)}
            >
              {/* Cabecera del día */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    {format(day, "EEE", { locale: es })}
                  </p>
                  <p className={`text-lg font-bold leading-none ${isCurrentDay ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </p>
                </div>
                {isCurrentDay && (
                  <Badge className="text-xs bg-primary text-primary-foreground">Hoy</Badge>
                )}
              </div>

              {/* Menús del día */}
              <div className="space-y-1">
                {dayItems.map((s) => (
                  <div
                    key={s.scheduled.id}
                    draggable
                    onDragStart={() => handleDragStart(s.scheduled.id)}
                    className={`group relative bg-white rounded-lg border p-2 cursor-grab text-xs shadow-sm hover:shadow-md transition-all ${
                      draggedId === s.scheduled.id ? "opacity-50" : ""
                    } ${s.scheduled.status === "completed" ? "opacity-60 bg-green-50 border-green-200" : ""}`}
                  >
                    <div className="flex items-start gap-1">
                      <GripVertical className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        {s.menu?.breakfast && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <Coffee className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                            <span className="truncate text-muted-foreground">{s.menu.breakfast}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 mb-0.5">
                          <Sun className="w-2.5 h-2.5 text-orange-400 shrink-0" />
                          <span className="truncate font-medium">{s.menu?.lunch1 ?? "—"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Moon className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{s.menu?.dinner1 ?? "—"}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteScheduled.mutate({ id: s.scheduled.id })}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Botón añadir */}
                <button
                  onClick={() => { setSelectedDate(dateStr); setAddDayOpen(true); }}
                  className="w-full border-dashed border-2 border-border rounded-lg p-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Añadir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog añadir menú */}
      <Dialog open={addDayOpen} onOpenChange={setAddDayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar menú</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium mb-1">Fecha</p>
              <p className="text-sm text-muted-foreground">
                {selectedDate && format(new Date(selectedDate + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Seleccionar menú del historial</p>
              <Select value={selectedMenuId} onValueChange={setSelectedMenuId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un menú..." />
                </SelectTrigger>
                <SelectContent>
                  {menuDays?.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      <span className="text-xs">
                        {m.lunch1} / {m.dinner1}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!menuDays || menuDays.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                No hay menús en el historial. Sube una dieta primero.
              </p>
            ) : null}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddDayOpen(false)}>Cancelar</Button>
              <Button
                disabled={!selectedMenuId || !selectedDate}
                onClick={() =>
                  scheduleDay.mutate({
                    menuDayId: Number(selectedMenuId),
                    scheduledDate: selectedDate,
                  })
                }
              >
                Programar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
