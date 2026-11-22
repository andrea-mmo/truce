# CLAUDE.md — App de rutina de skincare "Truce"

> Se llamaba "Piel". El nombre interno se mantiene donde cambiarlo perdería datos o enlaces: la dirección `piel.pages.dev`, la base de datos local, las claves `piel.*` del navegador y la marca de las copias (`BACKUP_APP`). Todo lo visible dice Truce.

## Quién soy y cómo trabajamos
- Soy Andrea. Vengo del front-end, pero **no quiero programar a mano**: quiero que tú construyas la app y me expliques las decisiones.
- **Háblame en español**, de forma sencilla. Los términos técnicos, en inglés, con una frase de explicación.
- Trabaja **en pasos pequeños**. Antes de un cambio grande, cuéntame el plan en 3–5 líneas y espera mi OK.
- Al acabar cada paso: qué has hecho, cómo lo pruebo yo (comando o URL) y qué viene después.

## Qué es la app
Una app que **organiza la rutina de skincare** de cada persona a partir de sus productos reales y le ayuda a descubrir qué le sienta mal. Lo hace con un protocolo de "reset" y luego reintroduciendo los productos de uno en uno, con seguimiento semanal.

- Especificación completa: `docs/SPEC.md`
- Reglas del motor y de seguridad: `docs/REGLAS.md`
- Caso de prueba (inventado): `docs/demo-case.md`
- Prototipo funcional en HTML (la referencia visual y de comportamiento): `prototype/index.html`

## Principios que NO se negocian
1. **No diagnostica ni trata.** La app organiza, señala ingredientes y recomienda ir a un profesional. Nunca dice "tienes acné hormonal" ni "esto te curará". Mira el apartado de lenguaje en `docs/REGLAS.md`.
2. **Las decisiones las toma un motor de reglas determinista**, no la IA. La IA solo:
   - lee etiquetas (foto → lista INCI), y la persona siempre confirma lo que se ha leído;
   - redacta en lenguaje claro lo que el motor ya ha decidido.
3. **Cada regla y cada dato de un ingrediente lleva su fuente** (campo `source`) y su nivel de evidencia. Si no hay fuente, no entra.
4. **Privacidad primero (local-first).** Las fotos de la piel y el seguimiento son datos de salud: se quedan en el dispositivo por defecto. Las fotos de etiquetas solo se envían a la IA con consentimiento y se borran tras extraer el texto.
5. **Las señales de alarma siempre ganan.** Si salta una (ver `docs/REGLAS.md` → Triaje), se muestra antes que cualquier rutina.

## Stack (propuesto; pregúntame antes de cambiarlo)
- Vite + React + TypeScript, como **PWA** (instalable en el móvil y en el ordenador).
- Datos locales: IndexedDB con Dexie.
- Motor de reglas: módulo TypeScript puro en `src/engine/`, sin dependencias de UI, con tests en Vitest.
- Base de ingredientes: `src/data/ingredients.json`, versionada en git.
- IA: Claude API (visión) detrás de una función serverless (Pages Functions, `functions/`), para que la API key no llegue nunca al navegador.
- Datos de productos: Open Beauty Facts (open data, licencia ODbL) por código de barras. Hay que mostrar la atribución.
- Deploy: Cloudflare Pages (`npm run deploy`), protegido con Cloudflare Access (solo Andrea). Decidido el 21-11-2026 en lugar de Vercel, para tener D1/R2 a mano si más adelante se añade la sincronización cifrada (Fase 5). La función de IA irá en Pages Functions (`functions/`).
- La app arranca con el caso inventado (`src/data/demo-case.ts`): nunca con datos reales de una persona.
- Sincronización (activada el 22-11-2026 a petición de Andrea): opcional y por dispositivo, **cifrada de extremo a extremo** (`src/sync/`, AES-GCM con clave derivada de una frase secreta que nunca sale del dispositivo). Servidor: Pages Functions + D1 (`functions/api/sync`, `migrations/`), que solo guarda texto cifrado y exige un token válido de Access. Cualquier tabla nueva con datos de la persona debe añadirse a `SYNCED_STORES`. Antes de abrir la app a más gente: revisión RGPD (datos de salud).

## Convenciones
- La interfaz en español e inglés (`src/i18n/`): `es.ts` es la referencia y `en.ts` debe tener las mismas claves (lo comprueban TypeScript y `messages.test.ts`). Todo texto nuevo va en los dos idiomas, nunca escrito dentro de un componente. Los textos de salud en inglés también siguen `docs/REGLAS.md` → E y están pendientes de revisión. Código, nombres de variables y commits en inglés.
- Tests obligatorios para todo `src/engine/`. El caso de `docs/demo-case.md` es un test de integración: si cambia su resultado, avísame.
- Nada de secretos en el repo: `.env.local`, y `.env.example` con los nombres de las variables.
- No hagas scraping de webs como INCIDecoder o Skinsort (sus condiciones no lo permiten). Usa solo fuentes abiertas o datos introducidos por la persona.
- Commits pequeños y descriptivos. No hagas push sin que te lo pida.

## Qué hacer primero
Empieza por la **Fase 0** de `docs/SPEC.md`: pasar el prototipo a un proyecto Vite con el motor de reglas separado y tests. Todavía sin IA.
