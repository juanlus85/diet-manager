import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Trash2, CheckCheck, Sun, Moon, Calendar, Package,
} from "lucide-react";

function localDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Shopping() {
  const today = useMemo(() => localDateStr(new Date()), []);
  const futureDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 60); return localDateStr(d);
  }, []);

  const { data: items, refetch } = trpc.recipes.getShoppingList.useQuery();
  const { data: scheduledDays } = trpc.menu.listScheduledDays.useQuery({ from: today, to: futureDate });

  const addItem = trpc.recipes.addShoppingItem.useMutation({ onSuccess: () => { refetch(); setNewItem(""); } });
  const toggleItem = trpc.recipes.toggleShoppingItem.useMutation({ onSuccess: () => refetch() });
  const deleteItem = trpc.recipes.deleteShoppingItem.useMutation({ onSuccess: () => refetch() });
  const clearPurchased = trpc.recipes.clearPurchasedItems.useMutation({
    onSuccess: () => { refetch(); toast.success("Artículos comprados eliminados"); },
  });

  const [newItem, setNewItem] = useState("");

  // Agrupar items por día programado
  type ShoppingItem = NonNullable<typeof items>[0];
  const grouped = useMemo(() => {
    if (!items) return { byDay: [] as { date: string; dayItems: ShoppingItem[] }[], noDay: [] as ShoppingItem[] };
    const noDay: typeof items = [];
    const byDayMap = new Map<string, { date: string; dayItems: typeof items }>();
    for (const item of items) {
      if (item.scheduledDate) {
        const dateStr = localDateStr(new Date(item.scheduledDate));
        if (!byDayMap.has(dateStr)) byDayMap.set(dateStr, { date: dateStr, dayItems: [] });
        byDayMap.get(dateStr)!.dayItems.push(item);
      } else {
        noDay.push(item);
      }
    }
    const byDay = Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    return { byDay, noDay };
  }, [items]);

  // Menús pendientes de días programados futuros (para el panel lateral)
  const pendingMenus = useMemo(() => {
    if (!scheduledDays) return [];
    return scheduledDays.filter((sd) => sd.menu).map((sd) => sd.menu!).filter((m) => m.lunch1 || m.dinner1);
  }, [scheduledDays]);

  const totalItems = items?.length ?? 0;
  const purchasedItems = items?.filter((i) => i.isPurchased).length ?? 0;
  const pendingCount = totalItems - purchasedItems;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Lista de la Compra
          </h1>
          <p className="text-muted-foreground text-sm">
            {pendingCount} pendientes · {purchasedItems} comprados
          </p>
        </div>
        {purchasedItems > 0 && (
          <Button variant="outline" size="sm" onClick={() => clearPurchased.mutate()} className="gap-1.5 text-muted-foreground">
            <CheckCheck className="w-4 h-4" />
            Limpiar comprados
          </Button>
        )}
      </div>

      {/* Layout principal */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* Panel lateral izquierdo: menús programados pendientes */}
        {pendingMenus.length > 0 && (
          <div className="lg:w-52 shrink-0">
            <Card className="bg-muted/30 border-dashed">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Menús programados
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-3">
                {pendingMenus.map((menu, idx) => (
                  <div key={idx} className="space-y-1.5">
                    {(menu.lunch1 || menu.lunch2) && (
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <Sun className="w-2.5 h-2.5 text-orange-400 shrink-0" />
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Almuerzo</span>
                        </div>
                        {menu.lunch1 && <p className="text-[11px] leading-snug pl-3.5 text-foreground">{menu.lunch1}</p>}
                        {menu.lunch2 && <p className="text-[11px] leading-snug pl-3.5 text-foreground">{menu.lunch2}</p>}
                      </div>
                    )}
                    {(menu.dinner1 || menu.dinner2) && (
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <Moon className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Cena</span>
                        </div>
                        {menu.dinner1 && <p className="text-[11px] leading-snug pl-3.5 text-foreground">{menu.dinner1}</p>}
                        {menu.dinner2 && <p className="text-[11px] leading-snug pl-3.5 text-foreground">{menu.dinner2}</p>}
                      </div>
                    )}
                    {idx < pendingMenus.length - 1 && <div className="border-t border-dashed pt-1.5" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Columna derecha: lista de la compra */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Añadir item */}
          <div className="flex gap-2">
            <Input
              placeholder="Añadir ingrediente..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newItem.trim()) addItem.mutate({ ingredientName: newItem.trim() }); }}
              className="flex-1"
            />
            <Button onClick={() => { if (newItem.trim()) addItem.mutate({ ingredientName: newItem.trim() }); }} disabled={!newItem.trim()} className="gap-1 shrink-0">
              <Plus className="w-4 h-4" />
              Añadir
            </Button>
          </div>

          {/* Lista vacía */}
          {totalItems === 0 && (
            <Card className="border-dashed border-2">
              <CardContent className="p-10 text-center">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">La lista de la compra está vacía.</p>
                <p className="text-muted-foreground text-xs mt-1">Añade ingredientes manualmente o márcalos como faltantes desde el menú del día.</p>
              </CardContent>
            </Card>
          )}

          {/* Items agrupados por día */}
          {grouped.byDay.map(({ date, dayItems }) => (
            <Card key={date}>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="capitalize">{formatDate(date)}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {dayItems.filter((i) => !i.isPurchased).length} pendientes
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1">
                {dayItems.map((item) => (
                  <div key={item.id} className={`flex items-center gap-3 py-2 px-2 rounded-lg transition-colors ${item.isPurchased ? "opacity-50" : "hover:bg-muted/40"}`}>
                    <Checkbox checked={item.isPurchased} onCheckedChange={(checked) => toggleItem.mutate({ id: item.id, isPurchased: !!checked })} className="shrink-0" />
                    <span className={`flex-1 text-sm ${item.isPurchased ? "line-through text-muted-foreground" : ""}`}>
                      {item.ingredientName}
                      {item.quantity && <span className="text-muted-foreground ml-1 text-xs">({item.quantity})</span>}
                    </span>
                    <button onClick={() => deleteItem.mutate({ id: item.id })} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1 touch-target">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Items sin día asignado */}
          {grouped.noDay.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  Sin día asignado
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {grouped.noDay.filter((i) => !i.isPurchased).length} pendientes
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1">
                {grouped.noDay.map((item) => (
                  <div key={item.id} className={`flex items-center gap-3 py-2 px-2 rounded-lg transition-colors ${item.isPurchased ? "opacity-50" : "hover:bg-muted/40"}`}>
                    <Checkbox checked={item.isPurchased} onCheckedChange={(checked) => toggleItem.mutate({ id: item.id, isPurchased: !!checked })} className="shrink-0" />
                    <span className={`flex-1 text-sm ${item.isPurchased ? "line-through text-muted-foreground" : ""}`}>
                      {item.ingredientName}
                      {item.quantity && <span className="text-muted-foreground ml-1 text-xs">({item.quantity})</span>}
                    </span>
                    <button onClick={() => deleteItem.mutate({ id: item.id })} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1 touch-target">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
