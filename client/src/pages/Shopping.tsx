import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, CheckCheck, Package } from "lucide-react";

export default function Shopping() {
  const { data: items, refetch } = trpc.recipes.getShoppingList.useQuery();
  const addItem = trpc.recipes.addShoppingItem.useMutation({ onSuccess: () => { refetch(); setNewItem(""); } });
  const toggleItem = trpc.recipes.toggleShoppingItem.useMutation({ onSuccess: () => refetch() });
  const deleteItem = trpc.recipes.deleteShoppingItem.useMutation({ onSuccess: () => refetch() });
  const clearPurchased = trpc.recipes.clearPurchasedItems.useMutation({
    onSuccess: () => { refetch(); toast.success("Artículos comprados eliminados"); },
  });

  const [newItem, setNewItem] = useState("");

  const pending = items?.filter((i) => !i.isPurchased) ?? [];
  const purchased = items?.filter((i) => i.isPurchased) ?? [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Lista de la Compra
          </h1>
          <p className="text-muted-foreground text-sm">
            {pending.length} pendientes · {purchased.length} comprados
          </p>
        </div>
        {purchased.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => clearPurchased.mutate()} className="gap-1">
            <CheckCheck className="w-4 h-4" />
            Limpiar comprados
          </Button>
        )}
      </div>

      {/* Añadir item */}
      <div className="flex gap-2">
        <Input
          placeholder="Añadir ingrediente..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newItem.trim()) {
              addItem.mutate({ ingredientName: newItem.trim() });
            }
          }}
        />
        <Button
          onClick={() => { if (newItem.trim()) addItem.mutate({ ingredientName: newItem.trim() }); }}
          disabled={!newItem.trim()}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          Añadir
        </Button>
      </div>

      {/* Pendientes */}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" />
              Por comprar ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {pending.map((item) => (
              <div key={item.id} className="flex items-center gap-3 group py-1">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => toggleItem.mutate({ id: item.id, isPurchased: true })}
                />
                <span className="flex-1 text-sm">{item.ingredientName}</span>
                {item.quantity && (
                  <Badge variant="secondary" className="text-xs">{item.quantity}</Badge>
                )}
                <button
                  onClick={() => deleteItem.mutate({ id: item.id })}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Comprados */}
      {purchased.length > 0 && (
        <Card className="opacity-75">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <CheckCheck className="w-4 h-4 text-green-500" />
              Comprados ({purchased.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {purchased.map((item) => (
              <div key={item.id} className="flex items-center gap-3 group py-1">
                <Checkbox
                  checked={true}
                  onCheckedChange={() => toggleItem.mutate({ id: item.id, isPurchased: false })}
                />
                <span className="flex-1 text-sm line-through text-muted-foreground">{item.ingredientName}</span>
                <button
                  onClick={() => deleteItem.mutate({ id: item.id })}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!items || items.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">La lista de la compra está vacía.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Añade ingredientes manualmente o desde el menú del día.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
