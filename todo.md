# Diet Manager - TODO

## Base de datos y backend
- [x] Esquema de tablas: menuDays, scheduledDays, weightLogs, activityLogs, recipes, ingredients, shoppingList
- [x] Migración de base de datos (pnpm db:push)
- [x] Helpers de DB para todas las entidades
- [x] Router tRPC: dietas (subir, listar, OCR)
- [x] Router tRPC: calendario (programar días, reordenar, drag&drop)
- [x] Router tRPC: historial de menús (con deduplicación)
- [x] Router tRPC: ingredientes y lista de la compra
- [x] Router tRPC: peso y actividad física
- [x] Router tRPC: recetas
- [x] Router tRPC: informes y estadísticas

## Frontend - Layout y estilos
- [x] Tema visual (verde salud, tipografía moderna, responsive)
- [x] DashboardLayout con sidebar de navegación
- [x] Rutas en App.tsx

## Frontend - Páginas
- [x] Página: Hoy (vista del día actual + próximos días)
- [x] Página: Calendario semanal con drag & drop
- [x] Página: Historial de menús
- [x] Página: Subir dieta (foto/PDF con OCR)
- [x] Página: Ingredientes y lista de la compra
- [x] Página: Registro de peso y actividad
- [x] Página: Recetas
- [x] Página: Informes y gráficas de progreso
- [x] Página: Configuración / perfil

## Funcionalidades avanzadas
- [x] OCR con LLM para extraer dietas de imágenes/PDF
- [x] Drag & drop para reordenar días en calendario
- [x] Deduplicación automática de días de menú
- [x] Gráfica de peso con objetivos y tendencias
- [x] Lista de la compra automática por ingredientes faltantes
- [x] Marcado de ingredientes disponibles por día

## Tests
- [x] Tests vitest para routers principales (12 tests, todos pasan)

## Pendiente / Mejoras futuras
- [ ] Exportar lista de la compra a PDF
- [ ] Notificaciones push para recordar registrar el peso
- [ ] Importar datos históricos desde Excel/CSV
- [ ] Modo oscuro
- [ ] Versión PWA para móvil

## Mejoras v2 (completadas)
- [x] Página Hoy: mejorar claridad visual de primer y segundo plato (1° y 2° con etiqueta clara)
- [x] Página Hoy: tap/hover sobre ingredientes → tooltip "Añadir a lista de la compra"
- [x] Página Hoy: marcar almuerzo/cena con "todos los ingredientes disponibles"
- [x] Página Hoy: marcar comida como completada (almuerzo y cena por separado)
- [x] Calendario: lista vertical en móvil, cuadrícula en desktop, celdas más grandes
- [x] Calendario: drag & drop entre días
- [x] Calendario: selector de menús con búsqueda y paginación, muestra todos los platos
- [x] Control de Peso: sin placeholder en el input de peso
- [x] Control de Peso: análisis completo de objetivos (kg perdidos, kg restantes, días, % logrado, ritmo necesario)
- [x] Recetas: campo "tipo de comida" eliminado del formulario

## Mejoras mobile-first (v2.1 completadas)
- [x] DayMenuCard: tarjetas separadas almuerzo/cena con colores diferenciados (naranja/índigo)
- [x] Chips de ingredientes con tooltip y tap para añadir a la compra
- [x] Botones touch-friendly para marcar almuerzo y cena completados
- [x] Bottom navigation bar en móvil + sidebar en desktop
- [x] Tipografía y espaciado optimizados (font-size 16px en inputs para evitar zoom en iOS)
- [x] Calendario: lista vertical en móvil con días más grandes y legibles
