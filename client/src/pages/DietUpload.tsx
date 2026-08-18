import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, Image, CheckCircle2, AlertCircle, Sun, Moon, Coffee, Loader2, Plus, Trash2 } from "lucide-react";

interface ExtractedDay {
  dayLabel: string;
  breakfast?: string;
  lunch1: string;
  lunch2?: string;
  dinner1: string;
  dinner2?: string;
}

export default function DietUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [extractedDays, setExtractedDays] = useState<ExtractedDay[]>([]);
  const [step, setStep] = useState<"upload" | "processing" | "review" | "done">("upload");
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.dietUpload.uploadAndExtract.useMutation({
    onSuccess: (data) => {
      setUploadId(data.uploadId);
      setExtractedDays(data.extractedDays ?? []);
      setStep("review");
    },
    onError: (err) => {
      toast.error("Error al procesar el archivo: " + err.message);
      setStep("upload");
    },
  });

  const confirmMutation = trpc.dietUpload.confirmExtractedDays.useMutation({
    onSuccess: (results) => {
      const duplicates = results.filter((r) => r.isDuplicate).length;
      const added = results.filter((r) => !r.isDuplicate).length;
      if (duplicates > 0) {
        toast.warning(`${added} menús añadidos, ${duplicates} duplicados omitidos`);
      } else {
        const codes = results.filter((r) => !r.isDuplicate).map((r) => r.menuCode);
        const codeRange = codes.length > 0 ? ` (${codes[0]}${codes.length > 1 ? ` – ${codes[codes.length - 1]}` : ""})` : "";
        toast.success(`${added} menús añadidos al historial${codeRange}`);
      }
      setStep("done");
    },
    onError: (err) => toast.error("Error al guardar: " + err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStep("processing");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      const fileType = file.type.startsWith("image/") ? "image" : "pdf";
      uploadMutation.mutate({
        fileBase64: base64,
        fileName: file.name,
        fileType,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const updateDay = (idx: number, field: keyof ExtractedDay, value: string) => {
    setExtractedDays((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const removeDay = (idx: number) => {
    setExtractedDays((prev) => prev.filter((_, i) => i !== idx));
  };

  const addDay = () => {
    setExtractedDays((prev) => [
      ...prev,
      { dayLabel: `Día ${prev.length + 1}`, lunch1: "", dinner1: "" },
    ]);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="w-6 h-6 text-primary" />
          Subir Dieta Semanal
        </h1>
        <p className="text-muted-foreground text-sm">
          Sube una foto o PDF de tu dieta y la extraeremos automáticamente con IA
        </p>
      </div>

      {/* Pasos */}
      <div className="flex items-center gap-2 text-sm">
        {["upload", "processing", "review", "done"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : ["processing", "review", "done"].indexOf(step) > i
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {["processing", "review", "done"].indexOf(step) > i ? "✓" : i + 1}
            </div>
            <span className={step === s ? "font-medium" : "text-muted-foreground"}>
              {["Subir", "Procesando", "Revisar", "Listo"][i]}
            </span>
            {i < 3 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Paso 1: Subir archivo */}
      {step === "upload" && (
        <Card>
          <CardContent className="p-6">
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) {
                  setFile(f);
                  if (f.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setPreview(ev.target?.result as string);
                    reader.readAsDataURL(f);
                  }
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="space-y-3">
                  {preview ? (
                    <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                  ) : (
                    <FileText className="w-12 h-12 text-primary mx-auto" />
                  )}
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB · {file.type}
                  </p>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}>
                    Cambiar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center gap-4">
                    <Image className="w-10 h-10 text-muted-foreground" />
                    <FileText className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="font-medium">Arrastra o haz clic para subir</p>
                  <p className="text-sm text-muted-foreground">Soporta imágenes (JPG, PNG, WEBP) y PDF</p>
                  <p className="text-xs text-muted-foreground">Máximo 16 MB</p>
                </div>
              )}
            </div>
            {file && (
              <Button className="w-full mt-4 gap-2" onClick={handleUpload}>
                <Upload className="w-4 h-4" />
                Extraer menús con IA
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Procesando */}
      {step === "processing" && (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="font-medium">Analizando tu dieta con IA...</p>
            <p className="text-sm text-muted-foreground">
              Estamos extrayendo los menús del documento. Esto puede tardar unos segundos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Paso 3: Revisar */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">
              {extractedDays.length} menús extraídos. Revisa y edita si es necesario:
            </p>
            <Button variant="outline" size="sm" onClick={addDay} className="gap-1">
              <Plus className="w-3 h-3" />
              Añadir día
            </Button>
          </div>

          {extractedDays.map((day, idx) => (
            <Card key={idx} className={editingDay === idx ? "border-primary" : ""}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{day.dayLabel}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingDay(editingDay === idx ? null : idx)}
                    >
                      {editingDay === idx ? "Cerrar" : "Editar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeDay(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {editingDay === idx ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1 mb-1">
                        <Coffee className="w-3 h-3 text-amber-500" /> Desayuno
                      </Label>
                      <Input
                        value={day.breakfast ?? ""}
                        onChange={(e) => updateDay(idx, "breakfast", e.target.value)}
                        placeholder="Desayuno (opcional)"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1 mb-1">
                        <Sun className="w-3 h-3 text-orange-400" /> Almuerzo 1 *
                      </Label>
                      <Input
                        value={day.lunch1}
                        onChange={(e) => updateDay(idx, "lunch1", e.target.value)}
                        placeholder="Primer plato almuerzo"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Almuerzo 2</Label>
                      <Input
                        value={day.lunch2 ?? ""}
                        onChange={(e) => updateDay(idx, "lunch2", e.target.value)}
                        placeholder="Segundo plato almuerzo (opcional)"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1 mb-1">
                        <Moon className="w-3 h-3 text-indigo-400" /> Cena 1 *
                      </Label>
                      <Input
                        value={day.dinner1}
                        onChange={(e) => updateDay(idx, "dinner1", e.target.value)}
                        placeholder="Primer plato cena"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Cena 2</Label>
                      <Input
                        value={day.dinner2 ?? ""}
                        onChange={(e) => updateDay(idx, "dinner2", e.target.value)}
                        placeholder="Segundo plato cena (opcional)"
                        className="text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-sm">
                    {day.breakfast && (
                      <div className="flex items-center gap-2">
                        <Coffee className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-muted-foreground">{day.breakfast}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Sun className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{day.lunch1}</span>
                        {day.lunch2 && <span className="text-muted-foreground"> · {day.lunch2}</span>}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Moon className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{day.dinner1}</span>
                        {day.dinner2 && <span className="text-muted-foreground"> · {day.dinner2}</span>}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {extractedDays.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No se extrajeron menús. Añade días manualmente.</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setStep("upload"); setExtractedDays([]); }}>
              Volver
            </Button>
            <Button
              disabled={extractedDays.length === 0 || extractedDays.some((d) => !d.lunch1 || !d.dinner1)}
              onClick={() => uploadId !== null && confirmMutation.mutate({ uploadId, days: extractedDays })}
              className="gap-2"
            >
              {confirmMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar {extractedDays.length} menús
            </Button>
          </div>
        </div>
      )}

      {/* Paso 4: Listo */}
      {step === "done" && (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">¡Dieta importada con éxito!</h2>
            <p className="text-muted-foreground">
              Los menús han sido añadidos al historial. Ahora puedes programarlos en el calendario.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setPreview(null); setExtractedDays([]); }}>
                Subir otra dieta
              </Button>
              <Button asChild>
                <a href="/calendar">Ir al calendario</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
