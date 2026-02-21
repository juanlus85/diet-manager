import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit2, Sun, Moon, Coffee, BookOpen } from "lucide-react";

export default function MenuHistory() {
  const { data: menuDays, refetch } = trpc.menu.listMenuDays.useQuery();
  const createMenu = trpc.menu.createMenuDay.useMutation({
    onSuccess: (result) => {
      if (result.isDuplicate) {
        toast.warning("Este menú ya existe en el historial (duplicado detectado)");
      } else {
        toast.success("Menú añadido al historial");
      }
      refetch();
      setCreateOpen(false);
      resetForm();
    },
  });
  const deleteMenu = trpc.menu.deleteMenuDay.useMutation({
    onSuccess: () => { refetch(); toast.success("Menú eliminado"); },
  });

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    breakfast: "",
    lunch1: "",
    lunch2: "",
    dinner1: "",
    dinner2: "",
    notes: "",
  });

  const resetForm = () => setForm({ breakfast: "", lunch1: "", lunch2: "", dinner1: "", dinner2: "", notes: "" });

  const filtered = menuDays?.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.lunch1.toLowerCase().includes(q) ||
      (m.lunch2 ?? "").toLowerCase().includes(q) ||
      m.dinner1.toLowerCase().includes(q) ||
      (m.dinner2 ?? "").toLowerCase().includes(q) ||
      (m.breakfast ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Historial de Menús
          </h1>
          <p className="text-muted-foreground text-sm">
            {menuDays?.length ?? 0} menús únicos en el historial
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo menú
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por plato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista de menús */}
      {!filtered || filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              {search ? "No se encontraron menús con esa búsqueda" : "El historial está vacío"}
            </p>
            {!search && (
              <Button onClick={() => setCreateOpen(true)} variant="outline" className="mt-2">
                Crear primer menú
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((menu, idx) => (
            <Card key={menu.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    Menú #{idx + 1}
                  </Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMenu.mutate({ id: menu.id })}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {menu.breakfast && (
                  <div className="flex items-start gap-2">
                    <Coffee className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Desayuno</p>
                      <p className="text-xs">{menu.breakfast}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Sun className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Almuerzo</p>
                    <p className="text-sm font-medium leading-tight">{menu.lunch1}</p>
                    {menu.lunch2 && <p className="text-sm font-medium leading-tight mt-0.5">{menu.lunch2}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Moon className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Cena</p>
                    <p className="text-sm font-medium leading-tight">{menu.dinner1}</p>
                    {menu.dinner2 && <p className="text-sm font-medium leading-tight mt-0.5">{menu.dinner2}</p>}
                  </div>
                </div>
                {menu.notes && (
                  <p className="text-xs text-muted-foreground italic border-t pt-2">{menu.notes}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <Badge variant="outline" className="text-xs">
                    {menu.source === "ocr" ? "📷 OCR" : menu.source === "imported" ? "📥 Importado" : "✏️ Manual"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog crear menú */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear nuevo menú</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="flex items-center gap-1 mb-1.5">
                <Coffee className="w-3.5 h-3.5 text-amber-500" />
                Desayuno (opcional)
              </Label>
              <Input
                placeholder="Café solo, té o infusiones..."
                value={form.breakfast}
                onChange={(e) => setForm({ ...form, breakfast: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-orange-400" />
                Almuerzo *
              </Label>
              <Input
                placeholder="Primer plato del almuerzo *"
                value={form.lunch1}
                onChange={(e) => setForm({ ...form, lunch1: e.target.value })}
              />
              <Input
                placeholder="Segundo plato del almuerzo (opcional)"
                value={form.lunch2}
                onChange={(e) => setForm({ ...form, lunch2: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Cena *
              </Label>
              <Input
                placeholder="Primer plato de la cena *"
                value={form.dinner1}
                onChange={(e) => setForm({ ...form, dinner1: e.target.value })}
              />
              <Input
                placeholder="Segundo plato de la cena (opcional)"
                value={form.dinner2}
                onChange={(e) => setForm({ ...form, dinner2: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Notas (opcional)</Label>
              <Textarea
                placeholder="Notas adicionales..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button
                disabled={!form.lunch1 || !form.dinner1}
                onClick={() => createMenu.mutate(form)}
              >
                Guardar menú
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
