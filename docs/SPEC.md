# Especificación — App de rutina de skincare

## 1. Problema
Mucha gente acumula productos con activos (ácidos, retinol, vitamina C…) y no sabe:
- en qué orden ni qué días usar cada uno;
- si se está pasando con los exfoliantes;
- qué producto le provoca comedones o irritación.

Las apps que existen ordenan rutinas y ponen recordatorios, pero **no guían un experimento personal** para averiguar qué te sienta mal: primero un reset y luego reintroducir los productos de uno en uno, con seguimiento.

## 2. Qué es (y qué no es)
**Es:** un organizador de rutina, un lector de ingredientes y un diario de seguimiento con un protocolo de eliminación y reintroducción.

**No es:** una herramienta de diagnóstico ni un tratamiento médico. No analiza fotos de la piel para decir qué tienes.

> Importante: en Reino Unido, el software con finalidad de diagnóstico o tratamiento puede considerarse un producto sanitario (regulado por la MHRA). Mantener la app como organizador y diario, sin afirmaciones médicas, es una decisión de producto **y** legal. Antes de lanzarla al público hay que revisarlo con alguien que sepa de regulación.

## 3. Cómo funciona: el flujo
1. **Perfil rápido.** Tipo de piel declarado, preocupaciones (comedones, granos, rojeces, manchas…), deporte, si se maquilla a diario, y el embarazo o la lactancia como pregunta opcional y explicada. Las preguntas de triaje (ver REGLAS) van aquí.
2. **Añadir productos**, de tres formas:
   - **Código de barras** → Open Beauty Facts → lista INCI.
   - **Foto de la etiqueta** → la IA extrae la lista INCI → la persona revisa y confirma (paso obligatorio).
   - **Manual**: nombre, marca y pegar los ingredientes.
3. **Análisis por producto** (motor de reglas): activos que contiene y su categoría, carga exfoliante, ingredientes "a vigilar" para piel con tendencia a comedones (con aviso de evidencia), perfume y alcohol.
4. **Análisis de la rutina completa**: carga exfoliante semanal, choques entre activos la misma noche, falta de protector solar con activos fotosensibilizantes, demasiadas capas.
5. **Rutina propuesta**: mañana y noche, con un calendario semanal de activos (un activo fuerte por noche) y subida progresiva de los retinoides.
6. **Modo reset (opcional)**: 6 semanas con la rutina mínima, pausando lo sospechoso. Después, reintroducción de uno en uno (2 semanas por producto), ordenada de menor a mayor riesgo.
7. **Seguimiento**: puntuación semanal de 0 a 5 (comedones, inflamación, irritación, otros), notas y foto opcional con la misma luz. Al final de cada reintroducción: "¿se queda o se va?".
8. **Vista "Hoy"**: lo que toca hoy, con casillas. Es el prototipo actual.

## 4. Papel de la IA (y sus límites)
| Tarea | ¿IA? | Cómo se controla la precisión |
|---|---|---|
| Leer la etiqueta de una foto | Sí (Claude visión) | Salida en JSON con esquema fijo; marca los ingredientes con baja confianza; **la persona confirma**; si la foto no se lee, se pide otra. Soporta etiquetas en japonés, coreano, etc. (devuelve el INCI estándar) |
| Normalizar nombres INCI | Primero diccionario de alias; IA solo de apoyo | Si no hay coincidencia exacta en la base, el ingrediente sale como "desconocido", no inventado |
| Clasificar ingredientes y decidir la rutina | **No** | Motor de reglas determinista + base de ingredientes con fuentes |
| Explicar el resultado en lenguaje claro | Sí | La IA recibe la salida del motor y solo la redacta; no puede añadir conclusiones. Plantillas fijas para avisos de seguridad |
| Diagnosticar por foto | **No** (fuera del alcance) | — |

### Prompt de lectura de etiquetas (borrador)
- Entrada: 1–3 fotos del mismo producto.
- Salida JSON: `{ product_name, brand, language_detected, inci: [{ name, confidence: "high"|"medium"|"low", raw_text }], warnings: [], unreadable: boolean }`.
- Reglas del prompt: copiar solo lo que se ve; no completar desde la memoria; marcar como `low` cualquier palabra cortada o borrosa; si la lista no está completa, `warnings: ["lista incompleta"]`.

## 5. La precisión: cómo la conseguimos sin "diagnosticar"
La app **no necesita saber qué tipo de acné tienes** para ayudarte. Su precisión viene de:
1. **Ingredientes exactos** de la etiqueta real (no del nombre del producto, porque las fórmulas cambian).
2. **Reglas explícitas y revisadas**, con fuente y versión.
3. **Tus propios datos**: el experimento de reset y reintroducción dice qué te pasa *a ti*, no a la media.
4. **Saber cuándo parar**: el triaje deriva a un profesional en los casos que una app no debe gestionar (nódulos y quistes, cicatrices, sospecha hormonal, embarazo, medicación, que no mejore en 6–8 semanas).

Escalas de comedogenicidad: se usan solo como "a vigilar", nunca como veredicto. Vienen de ensayos antiguos con oreja de conejo con ingredientes puros, y el producto final se comporta distinto. La UI lo explica.

## 6. Modelo de datos (borrador)
- `Ingredient`: inci, aliases[], functions[], activeClass (aha | bha | pha | retinoid | azelaic | vitC | niacinamide | bpo | none), exfoliationWeight (0–3), watchForComedones (none | low | moderate) + evidenceNote, irritancy (low | med | high), photosensitizing (bool), pregnancyCaution (bool), source[].
- `Product`: id, name, brand, barcode?, category (cleanser | oil-cleanser | toner | serum | moisturizer | spf | treatment | mask | peel | makeup), inci[], ingredientsConfirmed (bool), photoDeletedAt?, status (active | paused | trial | removed).
- `Routine`: am[], pm[] (orden), schedule (activo por día de la semana), phase.
- `Plan`: startDate, resetWeeks=6, reintroQueue[], results{productId: ok | bad}.
- `WeeklyLog`: week, scores{comedones, inflamacion, irritacion}, note, photoId?.
- `Profile`: skinType, concerns[], sportDays[], makeupDaily, pregnancy?, triageAnswers.

## 7. Fases
**Fase 0 · Proyecto base (sin IA)**
- Vite + React + TS + PWA. Pasar `prototype/index.html` a componentes.
- `src/engine/` con: cálculo de la semana y la fase, tratamiento por día, reintroducción.
- Tests con el caso de prueba (`docs/demo-case.md`).
- ✅ Hecho cuando: la vista "Hoy" funciona igual que el prototipo y los tests pasan.

**Fase 1 · Biblioteca de productos y motor de reglas**
- Añadir y editar productos a mano (pegando el INCI).
- `ingredients.json` inicial (unos 150 ingredientes comunes, con fuentes).
- Análisis de producto y de rutina, y generación del calendario.
- ✅ Con los productos del caso de prueba, el motor saca los avisos esperados de `docs/demo-case.md`.

**Fase 2 · Foto de la etiqueta con IA**
- Función serverless con Claude visión, con su esquema y pantalla de revisión.
- Borrado de la foto tras confirmar. Consentimiento explícito.
- ✅ Probar con las fotos reales (Fit Me, BB L'Oréal y las etiquetas japonesas) y que la persona pueda corregir cada ingrediente.

**Fase 3 · Código de barras**
- Escáner (cámara del móvil) → Open Beauty Facts → si falta, ofrecer foto o modo manual.

**Fase 4 · Reset, reintroducción y seguimiento**
- Protocolo completo, decisiones de "se queda o se va" y diario con fotos locales.

**Fase 5 (opcional) · Cuenta y sincronización**
- Solo si hace falta: login y sync cifrado. Revisar el RGPD antes (son datos de salud: categoría especial).

## 8. Antes de abrirla al público
- Revisión de `REGLAS.md` y de los textos por un dermatólogo o farmacéutico.
- Revisión legal: MHRA (producto sanitario o no), RGPD del Reino Unido (datos de salud) y atribución de Open Beauty Facts.
- Política de privacidad clara y opción de borrar todos los datos.
