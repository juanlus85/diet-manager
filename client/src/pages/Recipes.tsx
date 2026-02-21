import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChefHat, Plus, Trash2, Search, Package, Clock } from "lucide-react";

type MealType = "almuerzo" | "cena" | "desayuno" | "snack";

export default function Recipes() {
  const { data: recipes, refetch: refetchRecipes } = trpc.recipes.listRecipes.useQuery();
  const { data: ingredients, refetch: refetchIngredients } = trpc.recipes.listIngredients.useQuery();

  const createRecipe = trpc.recipes.createRecipe.useMutation({
    onSuccess: () => { refetchRecipes(); setRecipeOpen(false); resetRecipeForm(); toast.success("Receta guardada"); },
  });
  const deleteRecipe = trpc.recipes.deleteRecipe.useMutation({ onSuccess: () => { refetchRecipes(); toast.success("Receta eliminada"); } });
  const createIngredient = trpc.recipes.createIngredient.useMutation({
    onSuccess: () => { refetchIngredients(); setIngredientOpen(false); resetIngredientForm(); toast.success("Ingrediente añadido"); },
  });
  const deleteIngredient = trpc.recipes.deleteIngredient.useMutation({ onSuccess: () => refetchIngredients() });

  const [search, setSearch] = useState("");
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [ingredientOpen, setIngredientOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);

  const [recipeForm, setRecipeForm] = useState({
    name: "",
    description: "",
    ingredientsList: "",
    instructions: "",
    mealType: "almuerzo" as MealType,
  });
  // mealType se usa internamente pero no se muestra en el formulario

  const [ingredientForm, setIngredientForm] = useState({
    name: "",
    category: "",
    unit: "",
  });

  const resetRecipeForm = () =>
    setRecipeForm({ name: "", description: "", ingredientsList: "", instructions: "", mealType: "almuerzo" });
  const resetIngredientForm = () =>
    setIngredientForm({ name: "", category: "", unit: "" });

  const filteredRecipes = recipes?.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
    r.mealType.toLowerCase().includes(search.toLowerCase())
  );

  const filteredIngredients = ingredients?.filter((i: { name: string; category?: string | null }) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const selectedRecipe = recipes?.find((r) => r.id === selectedRecipeId) ?? null;

  const mealTypeLabel: Record<MealType, string> = {
    almuerzo: "Almuerzo",
    cena: "Cena",
    desayuno: "Desayuno",
    snack: "Snack",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary" />
            Recetas e Ingredientes
          </h1>
          <p className="text-muted-foreground text-sm">
            {recipes?.length ?? 0} recetas · {ingredients?.length ?? 0} ingredientes
          </p>
        </div>
      </div>

      <Tabs defaultValue="recipes">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recipes">Recetas</TabsTrigger>
          <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
        </TabsList>

        {/* Recetas */}
        <TabsContent value="recipes" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar recetas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setRecipeOpen(true)} className="gap-1">
              <Plus className="w-4 h-4" />
              Nueva receta
            </Button>
          </div>

          {!filteredRecipes || filteredRecipes.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center">
                <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay recetas guardadas.</p>
                <Button onClick={() => setRecipeOpen(true)} variant="outline" className="mt-3">
                  Crear primera receta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRecipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  className="group hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedRecipeId(recipe.id)}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold leading-tight">{recipe.name}</CardTitle>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRecipe.mutate({ id: recipe.id }); }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
  
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {recipe.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{recipe.description}</p>
                    )}
                    {recipe.ingredientsList && recipe.ingredientsList.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {recipe.ingredientsList.length} ingredientes
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Ingredientes */}
        <TabsContent value="ingredients" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ingredientes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setIngredientOpen(true)} className="gap-1">
              <Plus className="w-4 h-4" />
              Nuevo ingrediente
            </Button>
          </div>

          {!filteredIngredients || filteredIngredients.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay ingredientes guardados.</p>
                <Button onClick={() => setIngredientOpen(true)} variant="outline" className="mt-3">
                  Añadir primer ingrediente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredIngredients.map((ing) => (
                <Card key={ing.id} className="group hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{ing.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ing.category && <Badge variant="secondary" className="text-xs">{ing.category}</Badge>}
                        {ing.unit && <span className="text-xs text-muted-foreground">por {ing.unit}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteIngredient.mutate({ id: ing.id })}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog detalle receta */}
      {selectedRecipe && (
        <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipeId(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRecipe.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedRecipe.description && (
                <p className="text-sm text-muted-foreground">{selectedRecipe.description}</p>
              )}

              {selectedRecipe.ingredientsList && selectedRecipe.ingredientsList.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Ingredientes:</p>
                  <ul className="space-y-1">
                    {selectedRecipe.ingredientsList.map((ing, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        {ing.quantity && <span className="font-medium">{ing.quantity} {ing.unit}</span>}
                        {ing.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedRecipe.instructions && (
                <div>
                  <p className="text-sm font-semibold mb-1">Preparación:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedRecipe.instructions}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog crear receta */}
      <Dialog open={recipeOpen} onOpenChange={setRecipeOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva receta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="mb-1.5 block">Nombre *</Label>
              <Input value={recipeForm.name} onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })} placeholder="Nombre de la receta" />
            </div>
            {/* Tipo de comida oculto — se asigna automáticamente como "almuerzo" por defecto */}
            <div>
              <Label className="mb-1.5 block">Descripción</Label>
              <Textarea value={recipeForm.description} onChange={(e) => setRecipeForm({ ...recipeForm, description: e.target.value })} rows={2} placeholder="Descripción breve..." />
            </div>
            <div>
              <Label className="mb-1.5 block">Ingredientes (uno por línea)</Label>
              <Textarea value={recipeForm.ingredientsList} onChange={(e) => setRecipeForm({ ...recipeForm, ingredientsList: e.target.value })} rows={3} placeholder="200g lechuga&#10;2 latas atún&#10;100g jamón york" />
            </div>
            <div>
              <Label className="mb-1.5 block">Instrucciones</Label>
              <Textarea value={recipeForm.instructions} onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })} rows={4} placeholder="Pasos de preparación..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setRecipeOpen(false); resetRecipeForm(); }}>Cancelar</Button>
              <Button
                disabled={!recipeForm.name}
                onClick={() => {
                  const lines = recipeForm.ingredientsList.split("\n").filter(Boolean);
                  const ingList = lines.map((l) => ({ name: l }));
                  createRecipe.mutate({
                    name: recipeForm.name,
                    mealType: recipeForm.mealType,
                    description: recipeForm.description || undefined,
                    instructions: recipeForm.instructions || undefined,
                    ingredientsList: ingList.length > 0 ? ingList : undefined,
                  });
                }}
              >
                Guardar receta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog crear ingrediente */}
      <Dialog open={ingredientOpen} onOpenChange={setIngredientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo ingrediente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="mb-1.5 block">Nombre *</Label>
              <Input value={ingredientForm.name} onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })} placeholder="Lechuga, Atún, Jamón york..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Categoría</Label>
                <Input value={ingredientForm.category} onChange={(e) => setIngredientForm({ ...ingredientForm, category: e.target.value })} placeholder="Verdura, Proteína..." />
              </div>
              <div>
                <Label className="mb-1.5 block">Unidad</Label>
                <Input value={ingredientForm.unit} onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })} placeholder="100g, unidad..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setIngredientOpen(false); resetIngredientForm(); }}>Cancelar</Button>
              <Button
                disabled={!ingredientForm.name}
                onClick={() => createIngredient.mutate({
                  name: ingredientForm.name,
                  category: ingredientForm.category || undefined,
                  unit: ingredientForm.unit || undefined,
                })}
              >
                Guardar ingrediente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
