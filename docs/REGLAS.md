# Reglas del motor (v0.1, pendiente de revisión profesional)

Cada regla tiene un ID estable. El motor devuelve `findings[]` con `{ ruleId, severity: info | warn | stop, productIds[], message_key }`. Los textos salen de plantillas, no de la IA.

## A. Triaje: se evalúa primero y gana a todo
Si la persona marca cualquiera de estas opciones, se muestra un aviso "Esto conviene que lo vea un profesional" **antes** de la rutina. Se le deja continuar, pero el aviso se queda fijo.

| ID | Señal | Mensaje (resumen) |
|---|---|---|
| T1 | Bultos profundos, dolorosos o sin cabeza (nódulos o quistes) | Las cremas no llegan bien a esa profundidad; hay tratamientos con receta |
| T2 | Marcas o cicatrices que se quedan | Tratar pronto evita cicatrices |
| T3 | Brotes en la mandíbula o la barbilla junto con regla irregular, exceso de vello o caída del pelo | Puede haber un componente hormonal que conviene valorar |
| T4 | Embarazo, intentar quedarse embarazada o lactancia | Algunos activos (retinoides) no se recomiendan: consultar |
| T5 | Medicación para la piel o el acné con receta | No cambiar la rutina sin hablar con quien la recetó |
| T6 | Sin mejora tras 6–8 semanas de rutina simple, o empeora mucho | Ir al dermatólogo o al médico de cabecera con el seguimiento |
| T7 | Dolor, calor, pus abundante o fiebre | Valoración médica pronto |

## B. Reglas de rutina
| ID | Regla | Severidad |
|---|---|---|
| R1 | Máximo **un activo fuerte por noche** (retinoide, AHA, BHA, peeling) | warn |
| R2 | Nunca retinoide + AHA/BHA/peeling la misma noche | warn |
| R3 | Nunca peróxido de benzoilo + retinol al mismo tiempo (alternar mañana y noche, o días) | warn |
| R4 | **Carga exfoliante semanal** = suma de exfoliationWeight × usos por semana. Más de 8 → aviso; más de 12 → propuesta de reducir | warn |
| R5 | Si hay AHA, BHA o retinoide → protector solar diario obligatorio en la mañana | stop si falta |
| R6 | Retinoide nuevo: 1 noche por semana durante 3 semanas → 2 → 3, solo si no hay irritación | info |
| R7 | Exfoliantes que se repiten (p. ej., salicílico en limpiador + tónico + mascarilla) → avisar de la duplicidad | warn |
| R8 | Más de 7 capas en una rutina → sugerir simplificar | info |
| R9 | Días de deporte → limpieza después de entrenar; si encaja, el BHA esa noche | info |
| R10 | Si la persona marca irritación ≥ 3 → esa noche sin activo; si se repite 2 semanas, bajar la frecuencia | warn |
| R11 | Máscara LED: sobre la piel limpia y seca, justo después de la limpieza y antes de sérums, activos y cremas (añadida el 22-11-2026; fuente: indicación general de los fabricantes, pendiente de comprobar en el manual de la Shark) | info |

## C. Reglas de ingredientes "a vigilar" (piel con tendencia a comedones)
Siempre con la frase: *"No significa que te vaya a dar granos; es un ingrediente a vigilar si notas comedones."*

- **C1 · Ésteres grasos ricos como primeros ingredientes** (p. ej., ethylhexyl palmitate, isopropyl myristate, isopropyl palmitate) en productos que se dejan puestos, o en limpiadores de aceite que hay que emulsionar bien.
- **C2 · Aceites vegetales pesados o mantecas** entre los 5 primeros ingredientes de una crema que se deja toda la noche.
- **C3 · Ácidos grasos libres** (myristic, palmitic, stearic) combinados con emolientes ricos en una crema de noche.
- **C4 · Limpiador de aceite**: siempre mostrar el consejo de emulsionar con agua antes de aclarar.
- **C5 · Maquillaje de larga duración** (film formers como trimethylsiloxysilicate): recordar la doble limpieza.

Peso por posición: los 5 primeros ingredientes pesan más; lo que va detrás de un conservante (phenoxyethanol), o por debajo de ~1%, pesa poco.

## D. Protocolo reset y reintroducción
- **D1** · Reset: 6 semanas con limpiador suave, hidratante sin C1–C3, protector solar y como mucho 2 activos rotando.
- **D2** · Se pausa: lo que dispare C1–C3, los exfoliantes por encima del límite de R4 y los sérums duplicados.
- **D3** · Al terminar el reset: "¿ha mejorado?" Sí → reintroducción. No → T6.
- **D4** · Reintroducción: un producto cada 2 semanas, ordenados de menor a mayor riesgo (puntuación C + carga exfoliante).
- **D5** · Al final de cada prueba: "¿comedones nuevos?" Sí → `removed` y 1 semana de descanso antes del siguiente.
- **D6 · Incertidumbre** (añadida el 21-11-2026, pendiente de revisión) · Si un producto de textura crema o sérum que se deja puesto (sérum, crema, protector, maquillaje) **no tiene lista de ingredientes**, no se puede calcular su puntuación C. En el orden de D4 cuenta como **riesgo medio: +3** (entre C3 = 2 y C1 = 4), y la app lo marca como "riesgo sin calcular del todo". No se aplica a tónicos, tratamientos ni limpiadores: las reglas C1–C3 se centran en cremas y emolientes que se quedan en la piel. En caso de empate, va antes el producto sin activos.

## F. Etiquetas del diario (añadidas el 22-11-2026, pendientes de revisión)
La persona marca etiquetas fijas en el diario del día. El texto libre **no** se analiza; solo las etiquetas.

| ID | Etiqueta | Qué hace el motor |
|---|---|---|
| F1 | Pica o arde (hoy) | Consejo "esta noche sin tratamiento", el mismo día (adelanta R10 sin esperar al seguimiento semanal) |
| F2 | Me he apretado granos (hoy o ayer) | Consejo: no tocar más; esa noche, sin ácidos ni retinol sobre zonas abiertas o escocidas; protector por la mañana. Recuerda las señales de T7 |
| F3 | Producto nuevo | Durante una prueba de reintroducción → aviso D4 (así no se sabrá qué ha sido). Fuera de prueba → recordar "de uno en uno, 2 semanas" |
| F4 | Me he maquillado | Doble limpieza esa noche (C5) |
| F5 | Dolor, calor, pus o fiebre | Activa **T7** (triaje) ese día y los 2 siguientes: se muestra antes que cualquier rutina |
| F6 | Brote nuevo, regla, dormí mal, estrés, empecé un suplemento | Solo se registran, para ver patrones en el historial. Sin consejo |

## G. Perfil (quiz, añadido el 22-11-2026)
- Las respuestas de triaje del quiz activan T1–T5. T6 sale del veredicto del reset y T7 del diario (F5).
- **T3 se pregunta en dos partes** (22-11-2026): zonas de los brotes y, aparte, si hay regla irregular, más vello o caída del pelo. T3 solo salta si se marca **mandíbula o barbilla y además** "sí" a esos cambios.
- **T4 = sí → el retinoide desaparece del calendario** (esas noches, azelaico) y se muestra el aviso. "Prefiero no decirlo" no cambia nada.
- Días de deporte con sudor → R9 (limpiar al terminar). Maquillaje a diario → C5 cada día.
- Tipo de piel, preocupaciones, tratamientos en cabina y suplementos **solo se registran**: ninguna regla los usa todavía (no hay fuente suficiente para dar consejos de dieta o suplementos).

## E. Lenguaje
| ✅ Sí | ❌ No |
|---|---|
| "Ingrediente a vigilar" | "Comedogénico, evítalo" |
| "Esto conviene que lo vea un profesional" | "Tienes acné hormonal" |
| "Organiza tu rutina", "te ayuda a ver qué te sienta mal" | "Trata o cura el acné" |
| "Según tu seguimiento…" | "Tu piel es…" |

## Fuentes a documentar en `ingredients.json`
- CosIng (base de ingredientes de la UE): funciones oficiales.
- Open Beauty Facts: listas INCI por producto (ODbL).
- Literatura dermatológica para retinoides, AHA/BHA y peróxido de benzoilo (añadir referencias concretas en la revisión profesional).
