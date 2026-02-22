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

## Bug corregido v2.6
- [x] Bug crítico corregido: el servidor Node.js está en UTC-5. Al guardar fechas como Date objects (new Date('2026-02-22') = UTC midnight), mysql2 las convertía a hora local del servidor (2026-02-21 19:00:00 EST) y MySQL guardaba '2026-02-21' en lugar de '2026-02-22'. Solución: cambiar todos los campos DATE del schema de Drizzle a `mode: 'string'` para que se pasen como strings YYYY-MM-DD directamente a MySQL sin conversión.

## Bug corregido v2.7
- [x] Bug corregido: el calendario usaba getUTCDate() para construir las fechas de las columnas. En España (UTC+1), startOfWeek devuelve el lunes a las 00:00 CET = 23:00 UTC del día anterior, por lo que getUTCDate() devolvía el día anterior. Solución: cambiar formatDate() en Calendar.tsx para usar getFullYear/getMonth/getDate (hora local del navegador) en lugar de getUTC*.

## Adaptación VPS (v3.0)
- [x] Schema: añadir campo passwordHash a tabla users
- [x] Backend: router de autenticación local (registro/login/logout con bcrypt + JWT)
- [x] Backend: LLM configurable con OPENAI_API_KEY (compatible con OpenAI y Manus)
- [x] Frontend: página de login/registro con formulario usuario/contraseña
- [x] Frontend: eliminar dependencia de Manus OAuth (VITE_OAUTH_PORTAL_URL)
- [x] Tests: actualizar tests de autenticación (12/12 pasando)

## Bug corregido v3.1
- [x] Bug VPS corregido: "TypeError: Invalid URL" — getLoginUrl() en const.ts usaba VITE_OAUTH_PORTAL_URL sin comprobar si existía. Ahora si no hay portal OAuth, redirige al login local (/login). Se añadió ruta /login en App.tsx fuera del DashboardLayout.

## Bug corregido v3.2
- [x] Bug VPS corregido: login con usuario/contraseña no redirige tras autenticarse. Causa raíz: localAuth.ts usaba `jsonwebtoken` (jwt.sign) para crear el token, pero `sdk.verifySession` usa `jose` (jwtVerify) y además requiere el campo `appId` en el payload. El token generado con jsonwebtoken sin `appId` fallaba la verificación y el usuario nunca se autenticaba. Solución: reemplazar jsonwebtoken por `sdk.signSession()` que usa jose con payload {openId, appId, name}. 16/16 tests pasando.

## Bug corregido v3.3
- [x] Bug VPS corregido: "Storage upload failed (404 Not Found)" al subir dieta. Causa raíz: dietUpload.ts llamaba a storagePut() (S3 de Manus) que no está disponible en VPS propio. Solución: eliminar la dependencia de S3 y procesar archivos directamente — imágenes se envían como data URL base64 a la IA, PDFs se extraen con pdf-parse y se envían como texto plano. Instalado pdf-parse. 19/19 tests pasando.

## Bugs corregidos v3.4
- [x] Bug corregido: imagen → "Invalid schema for response_format 'diet_extraction'" (400 Bad Request). Causa: json_schema strict con campos opcionales (breakfast, lunch2, dinner2) no es válido en OpenAI. Solución: cambiar a response_format: { type: "json_object" } y normalizar campos vacíos a undefined en el servidor.
- [x] Bug corregido: PDF → "Dynamic require of 'pdf-parse' is not supported". Causa: el bundler esbuild no soporta require() dinámico. Solución: import estático de PDFParse desde "pdf-parse" (v2 API: new PDFParse({ data }) + getText()). 21/21 tests pasando.

## Bugs corregidos v3.5
- [x] Bug corregido: recetas → "ingredientsList.map is not a function". Causa: MySQL devuelve columnas JSON como string en algunos drivers. Solución: añadir parseIngredientsList() en Recipes.tsx que parsea el JSON si llega como string, o devuelve el array directamente si ya es array.
- [x] Bug corregido: PDF escaneado → 0 días sin error. Causa: pdf-parse solo extrae texto seleccionable; PDFs escaneados no tienen texto. Solución: detectar texto vacío (<50 chars) y usar pdftoppm para convertir las páginas a imágenes PNG, que se envían a la IA con visión. 21/21 tests pasando.

## Mejoras completadas v3.6
- [x] Mejora 1: Pantalla Hoy — tarjeta de peso con toggle ojo (oculto por defecto, se muestra al pulsar).
- [x] Mejora 2: Pantalla Hoy — botón "Subir dieta" reemplazado por "Peso" (modal de registro + redirige a Control de Peso) y "Ejercicio" (redirige a /weight).
- [x] Mejora 3: Objetivos semanales — botón de edición (lápiz) por fila en la tabla; abre el dialog con los datos precargados. Nueva función updateWeeklyGoal en db.ts y campo id opcional en upsertWeeklyGoal.
- [x] Bug corregido: Calendario — segundo plato (lunch2/dinner2) ahora tiene el mismo estilo que el primero. 21/21 tests pasando.

## Bug corregido v3.7
- [x] Bug corregido: Objetivos semanales — la semana en curso (y futuras) ahora muestra el último peso registrado hasta hoy en la columna "Real", en lugar de buscar el peso más cercano al lunes de la semana. Para semanas pasadas se mantiene la lógica de ±3 días. 21/21 tests pasando.
