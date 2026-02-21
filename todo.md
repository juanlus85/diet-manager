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
- [x] Bottom navigation bar en móvil
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

## Mejoras v2 (completadas)
- [x] Página Hoy: 1° y 2° plato con etiqueta clara y mismo tamaño visual
- [x] Página Hoy: tap/hover sobre ingredientes → añadir a lista de la compra
- [x] Página Hoy: marcar almuerzo/cena completados por separado
- [x] Página Hoy: navegación de días (flechas anterior/siguiente + botón "Hoy")
- [x] Calendario: lista vertical en móvil, cuadrícula en desktop
- [x] Calendario: click en menú abre panel de detalle completo del día
- [x] Calendario: selector de menús con búsqueda y paginación
- [x] Control de Peso: sin placeholder en el input de peso
- [x] Control de Peso: análisis completo de objetivos (kg perdidos, kg restantes, días, % logrado)
- [x] Recetas: campo "tipo de comida" eliminado del formulario
- [x] Lista de la compra: panel lateral con menús pendientes (almuerzo/cena sin fecha)
- [x] Bug: zona horaria UTC vs local corregida en Today.tsx y db.ts
- [x] Bug: db.ts duplicado de getShoppingList eliminado
- [x] Bug visual: 2° plato igualado al 1° en todos los componentes

## Pendiente / Mejoras futuras
- [ ] Exportar lista de la compra a PDF
- [ ] Notificaciones push para recordar registrar el peso
- [ ] Importar datos históricos desde Excel/CSV
- [ ] Modo oscuro
- [ ] Versión PWA para móvil

## Mejoras v2.5 (completadas)
- [x] Bug crítico: corregir bug zona horaria en Today.tsx (usar fecha local del navegador para "hoy", UTC para comparar con BD)
- [x] Bug: eliminar getShoppingList duplicado en db.ts (causa error de esbuild)
- [x] Mejora: objetivos semanales de peso (tabla con fecha, objetivo semanal, peso real, kg perdidos semana, estado vs objetivo)
- [x] Mejora: tabla de seguimiento semanal en Control de Peso con generación automática de objetivos
- [x] Mejora: router tRPC para weeklyGoals (listWeeklyGoals, upsertWeeklyGoal, deleteWeeklyGoal, generateWeeklyGoals)
