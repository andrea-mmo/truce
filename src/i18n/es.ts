/**
 * Spanish texts (the reference language). The engine returns keys; this file
 * holds the words. Wording follows docs/REGLAS.md → E (Lenguaje). Safety texts
 * (triage, warnings) are fixed here, never generated.
 *
 * Every other language must have exactly the same keys (see `Messages` and
 * messages.test.ts).
 */
import type {
  ActiveClass, BadgeId, BreakoutArea, Category, ChallengeWarning, Concern, DiaryTag, FitIssue, Makeup, PauseReason,
  ProductRuleId, ProductStatus, RoutineFinding, Salon, SkinType, Supplement, TagLabel, Tip, TipId, Treatment, TriageId,
} from '../engine';
import type { BackupErrorCode } from '../db/backup';
import type { LabelError } from '../label/label';
import type { LookupError } from '../barcode/barcode';
import type { Theme } from '../theme';
import { fmtNum } from './format';

type Active = Exclude<ActiveClass, 'none'>;
type Text3 = { title: string; body: string; source: string };
type NameOf<K> = (key: K) => string;
export type TipText = { title: string; body: (tip: Tip, nameOf: NameOf<string>) => string; source: string; why: string };
/** Gives a value a declared type while checking it (missing keys are errors). */
const typed = <T,>(x: T): T => x;
const list = (ids: number[], nameOf: NameOf<number>) => ids.map(nameOf).join(', ');

const active: Record<Active, string> = {
  aha: 'AHA',
  bha: 'BHA',
  pha: 'PHA',
  retinoid: 'Retinoide',
  azelaic: 'Azelaico',
  vitC: 'Vitamina C',
  niacinamide: 'Niacinamida',
  bpo: 'Peróxido de benzoilo',
};

const treatment: Record<Treatment, { short: string; tiny: string }> = {
  az: { short: 'Azelaico', tiny: 'Azel.' },
  bha: { short: 'BHA', tiny: 'BHA' },
  ret: { short: 'Retinol', tiny: 'Ret.' },
};

const PENDING_RULES = 'Estas reglas están pendientes de revisión profesional.';
const SESSION_EXPIRED = 'Tu sesión ha caducado: recarga la app y vuelve a intentarlo.';

export const es = {
  locale: 'es-ES',

  common: {
    product: 'Producto',
    today: 'Hoy',
    yesterday: 'Ayer',
    save: 'Guardar',
    saving: 'Guardando…',
    saved: 'Guardado ✓',
    cancel: 'Cancelar',
    close: 'Cerrar',
    done: 'Listo',
    yes: 'Sí',
    no: 'No',
    edit: 'Editar',
    delete: 'Borrar',
    takePhoto: 'Hacer foto',
    fromGallery: 'De la galería',
    source: (s: string) => `Fuente: ${s}`,
    pendingRules: PENDING_RULES,
    days: (n: number): string => (n === 1 ? 'día' : 'días'),
    /** Short week days, Sunday first (Date.getDay order). */
    dayShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  },

  app: {
    title: 'Truce · Mi rutina de hoy',
    kicker: (name: string) => `Rutina reset${name ? ` · ${name}` : ''}`,
    greeting: { morning: 'Buenos días', afternoon: 'Buenas tardes', night: 'Buenas noches' },
    prevDay: 'Día anterior',
    nextDay: 'Día siguiente',
    backToday: 'Volver a hoy',
    chipNotStarted: 'Empieza pronto',
    chipReset: (week: number, of: number) => `Semana ${week} de ${of} · Reset`,
    chipPhase: (week: number, name: string) => `Semana ${week} · ${name}`,
    streakTitle: 'Días seguidos con las dos rutinas',
    settings: 'Ajustes',
    sections: 'Secciones',
    tabToday: 'Hoy',
    tabProducts: 'Productos',
    tabPhotos: 'Fotos',
    morning: 'Mañana',
    evening: 'Noche',
    steps: (n: number) => `${n} pasos`,
    tonight: (isToday: boolean, t: string) => `${isToday ? 'Hoy toca' : 'Tocaba'}: ${t}`,
    foot: 'Guía orientativa, no sustituye la consulta con un dermatólogo. Tus marcas, notas, fotos y ajustes se guardan solo en este dispositivo.',
    clearToday: 'Desmarcar hoy',
    clearDay: 'Desmarcar este día',
  },

  /** Only in the demo build (src/demo.ts). */
  demo: {
    bar: 'Demo con datos inventados. Lo que hagas se queda en este navegador.',
    restart: 'Reiniciar demo',
    confirmRestart: '¿Volver a empezar la demo? Se borra todo lo que hayas cambiado.',
    syncTitle: 'Sincronización entre dispositivos',
    syncOff: 'No está disponible en la demo. En la app real se cifra de extremo a extremo con una frase que solo sabes tú.',
  },

  update: {
    available: 'Hay una versión nueva de la app.',
    apply: 'Actualizar',
    version: 'Versión de la app',
    applyNew: 'Actualizar a la nueva versión',
    check: 'Buscar actualizaciones',
    checking: 'Buscando…',
    upToDate: 'Ya tienes la última versión.',
    offline: 'Sin conexión: no se puede comprobar ahora.',
  },

  treatment,

  tag: (label: TagLabel, t?: Treatment): string => {
    switch (label) {
      case 'trial': return 'En prueba';
      case 'glyToday': return 'Hoy toca';
      case 'optional': return 'Opcional';
      case 'firstCleanse': return 'Primer lavado';
      case 'nightCream': return 'Crema de noche';
      case 'treatment': return `Toca hoy: ${t ? treatment[t].short : ''}`;
    }
  },

  phase: {
    reset: { name: 'Reset', desc: 'Solo la rutina base. Lo que está en pausa vuelve después, de uno en uno.' },
    keep: { name: 'Mantenimiento', desc: 'Tu rutina con lo que haya pasado la prueba. Producto nuevo: de uno en uno y 2 semanas.' },
    trial: {
      default: 'Vuelve a tu rutina. Si en 2 semanas notas comedones nuevos, fuera.',
      oilCleanser: 'Vuelve como primer lavado por la noche. Si vuelven los comedones, fuera del todo.',
      moisturizer: 'Vuelve como crema en lugar de la habitual.',
      aha: 'Como mucho 2 mañanas por semana, nunca después de una noche de retinol.',
      serum: 'Vuelve por la mañana. Solo si de verdad lo echas de menos.',
    },
  },

  /** Triage messages (REGLAS → A). Fixed templates, never generated. */
  triage: {
    T1: 'Bultos profundos, dolorosos o sin cabeza: las cremas no llegan bien a esa profundidad y hay tratamientos con receta. Mientras tanto, no los aprietes ni les pongas parches.',
    T2: 'Marcas o cicatrices que se quedan: tratar pronto ayuda a evitar cicatrices.',
    T3: 'Brotes en la mandíbula o la barbilla junto con otros cambios: conviene valorarlo con un profesional.',
    T4: 'Embarazo, búsqueda de embarazo o lactancia: algunos activos, como los retinoides, no se recomiendan. Consulta antes.',
    T5: 'Medicación con receta para la piel: no cambies la rutina sin hablar con quien te la recetó.',
    T6: 'Según tu seguimiento, la rutina simple no ha traído mejora. Lleva tu seguimiento al dermatólogo o al médico de cabecera. Mientras tanto, sigue con la rutina base; la reintroducción queda en pausa.',
    T7: 'Dolor, calor, pus abundante o fiebre: pide valoración médica pronto.',
  } satisfies Record<TriageId, string>,

  banners: {
    triageTitle: 'Esto conviene que lo vea un profesional',
    triageUndo: 'Me he equivocado, sí mejoró',
    notStartedTitle: 'El reset aún no ha empezado',
    notStartedBody: (date: string) => `Empieza el ${date}. Cámbialo en ⚙ si quieres empezar hoy.`,
    profileReviewTitle: 'Revisa tu perfil de piel',
    profileNewTitle: 'Completa tu perfil de piel',
    profileReviewBody: 'Lo he rellenado con lo que ya tenías. Revísalo (2 minutos): de tus respuestas salen los avisos y algunos consejos.',
    profileNewBody: '5 preguntas rápidas sobre tu piel, tus hábitos y tu salud. De ahí salen los avisos y algunos consejos.',
    profileReviewBtn: 'Revisar perfil',
    profileNewBtn: 'Empezar',
    pastTitle: (date: string) => `Estás viendo el ${date}`,
    pastBody: 'Marca lo que hiciste ese día o completa la nota. Puedes volver hasta 7 días atrás.',
    climbTitle: 'Hoy escalas',
    climbBody: 'Lávate la cara con el gel COSRX en cuanto termines, no te toques la cara con las manos llenas de magnesio y esta noche toca BHA.',
    firstWeekTitle: 'Primera semana',
    firstWeekBody: 'Es normal que la piel siga revuelta 1–2 semanas después de la limpieza. Los comedones tardan unas 4–6 semanas en notar un cambio de rutina.',
    decisionTitle: (weeks: number) => `Han pasado ${weeks} semanas: ¿ha mejorado la piel?`,
    decisionBody: 'Mira tu seguimiento y las fotos.',
    decisionBetter: 'Sí, ha mejorado',
    decisionSame: 'Igual o peor',
    trialEndTitle: (name: string) => `Fin de la prueba: ${name}`,
    trialEndBody: '¿Te han salido comedones nuevos en estas 2 semanas?',
    trialKeep: 'No, se queda',
    trialOut: 'Sí, fuera',
  },

  routine: {
    led: { name: 'Máscara LED Shark', what: 'Sobre la piel limpia y seca, antes de sérums y cremas' },
    treatmentNone: (t: string) => ({ name: `Tratamiento: ${t}`, what: 'No tienes ningún producto de este tipo en uso.' }),
    oilCleanseHow: 'Emulsiona bien con agua antes de aclarar',
    firstCleanse: (name: string) => `Primer lavado: ${name}`,
    firstCleanseWhat: 'O agua micelar si llevas maquillaje',
    secondCleanseWhat: 'Segundo lavado, masajea unos 60 segundos',
    skipped: 'Saltado a propósito',
    rule: (id: string) => `Regla ${id}`,
    advSkip: 'Mejor no hoy',
    advCaution: 'Con cuidado: evita las zonas abiertas',
    undoSkipLabel: 'Deshacer saltar el tratamiento',
    skipLabel: 'Saltar el tratamiento esta noche',
    undo: 'Deshacer',
    skip: 'Saltar hoy',
    allDone: (am: boolean) => `✓ Rutina de ${am ? 'mañana' : 'noche'} hecha`,
  },

  tipsCard: {
    title: 'Consejos para hoy',
    lead: 'Salen de las reglas del plan y de tu seguimiento. Toca "¿Por qué?" para ver de dónde viene cada uno.',
    why: '¿Por qué?',
    evidence: 'Regla del plan v0.1, pendiente de revisión profesional.',
  },

  /** Daily tips. Every tip names its source (CLAUDE.md principle 3). */
  tips: typed<Record<TipId, TipText>>({
    irritationTonight: {
      title: 'Esta noche, sin tratamiento',
      body: () => 'En tu seguimiento marcaste irritación de 3 o más. Esta noche haz solo limpieza, crema y LED, y salta el paso 3.',
      source: 'REGLAS.md · R10',
      why: 'Con la piel irritada, un activo más suele empeorarla. Dar un respiro ayuda a que se recupere antes de seguir.',
    },
    irritationLowerFreq: {
      title: 'Dos semanas seguidas con irritación',
      body: () => 'Toca bajar la frecuencia de los activos. Quita una noche de retinol en ⚙ o cambia alguna por azelaico. Si no mejora, coméntalo con un profesional.',
      source: 'REGLAS.md · R10',
      why: 'Si la irritación se repite, la rutina está siendo demasiado para tu piel ahora mismo.',
    },
    retinolHold: {
      title: 'Retinol: mejor no subir todavía',
      body: () => 'Esta semana tocaría pasar a 2 noches, pero has tenido irritación. Quédate en 1 noche: elígela a mano en ⚙.',
      source: 'REGLAS.md · R6',
      why: 'El retinol se sube poco a poco y solo si la piel lo tolera.',
    },
    retinolRamp: {
      title: 'Noche de retinol',
      body: () => 'Durante las semanas 1–3, 1 noche por semana. Desde la semana 4, 2 noches, solo si no hay irritación. Unas gotas bastan.',
      source: 'REGLAS.md · R6',
      why: 'Subir despacio reduce la irritación del principio.',
    },
    spfAfterActive: {
      title: 'Protector sin falta',
      body: () => 'Anoche tocó un activo exfoliante o retinol. Hoy, protector solar aunque esté nublado, y vuelve a ponértelo si sudas.',
      source: 'REGLAS.md · R5',
      why: 'Los ácidos y los retinoides hacen la piel más sensible al sol.',
    },
    activesBackToBack: {
      title: 'BHA y retinol en noches seguidas',
      body: () => 'Anoche y hoy tocan BHA y retinol seguidos. Si notas la piel sensible, cambia el de hoy por azelaico.',
      source: 'REGLAS.md · R2 y tarjeta "Esta semana"',
      why: 'La regla R2 los separa en la misma noche. El plan, además, recomienda dejar un día entre los dos.',
    },
    trialFocus: {
      title: 'Estás en una prueba',
      body: (t, nameOf) => `${t.trial ? nameOf(t.trial.id) : 'Producto'}: día ${t.trial?.day ?? '–'} de ${t.trial?.of ?? 14}. No estrenes nada más hasta que termine, así sabrás qué ha sido.`,
      source: 'REGLAS.md · D4',
      why: 'Si cambias dos cosas a la vez, no puedes saber cuál te sienta mal.',
    },
    stingingTonight: {
      title: 'Hoy pica o arde: esta noche, sin tratamiento',
      body: () => 'Lo has marcado en el diario. Esta noche solo limpieza suave, crema y LED; salta el paso 3 con «Saltar hoy».',
      source: 'REGLAS.md · F1 (adelanta R10)',
      why: 'Con la piel irritada, un activo más suele empeorarla. Mejor esperar a que se calme.',
    },
    afterPicking: {
      title: 'Granos apretados: déjalos tranquilos',
      body: () => 'No los toques más. Esta noche, nada de ácidos ni retinol sobre las zonas abiertas o que escuezan (o salta el tratamiento). Mañana, protector solar para que las marcas no oscurezcan. Si notas dolor, calor, pus o fiebre, márcalo en el diario.',
      source: 'REGLAS.md · F2',
      why: 'Apretar puede dejar marcas y abrir la piel; los activos sobre una herida suelen irritar más.',
    },
    newProductInTrial: {
      title: 'Producto nuevo en plena prueba',
      body: () => 'Ahora mismo estás probando otro producto. Si estrenas algo más, no sabrás cuál de los dos ha sido. Mejor guardarlo hasta que termine la prueba.',
      source: 'REGLAS.md · F3 y D4',
      why: 'La reintroducción funciona porque solo cambia una cosa cada vez.',
    },
    newProductOneByOne: {
      title: 'Producto nuevo',
      body: () => 'Añádelo en «Productos» y úsalo solo, unas 2 semanas, antes de estrenar otro. Así sabrás si te sienta bien.',
      source: 'REGLAS.md · F3 y D4',
      why: 'Si cambias varias cosas a la vez, no sabrás cuál ha sido.',
    },
    makeupDoubleCleanse: {
      title: 'Hoy te has maquillado: doble limpieza',
      body: () => 'Esta noche, primer lavado para quitar el maquillaje (o agua micelar) y luego el limpiador de siempre.',
      source: 'REGLAS.md · F4 y C5',
      why: 'El maquillaje de larga duración se queda en la piel si solo limpias una vez.',
    },
    afterSport: {
      title: 'Hoy haces deporte',
      body: () => 'Lávate la cara con tu limpiador suave en cuanto termines, sobre todo si sudas mucho, y evita tocarte la cara con las manos sucias.',
      source: 'REGLAS.md · R9',
      why: 'El sudor y la suciedad que se quedan en la piel durante horas pueden empeorar los comedones.',
    },
    weeklyCheckIn: {
      title: 'Hoy toca seguimiento',
      body: () => 'Es domingo: puntúa la semana abajo y, si puedes, haz la foto con la misma luz de siempre.',
      source: 'SPEC.md · 3.7',
      why: 'Puntuar siempre el mismo día y con la misma luz hace que las semanas se puedan comparar.',
    },
  }),

  products: {
    category: {
      'oil-cleanser': 'Limpiador de aceite',
      cleanser: 'Limpiador',
      toner: 'Tónico / loción',
      serum: 'Sérum',
      treatment: 'Tratamiento',
      moisturizer: 'Crema',
      spf: 'Protector solar',
      mask: 'Mascarilla',
      peel: 'Peeling',
      makeup: 'Maquillaje',
    } satisfies Record<Category, string>,
    active,
    status: {
      active: 'En uso',
      paused: 'En pausa',
      trial: 'En prueba',
      removed: 'Descartado',
    } satisfies Record<ProductStatus, string>,
  },

  library: {
    title: 'Mis productos',
    count: (n: number, missing: number) => `${n} productos${missing ? ` · a ${missing} les faltan los ingredientes` : ''}.`,
    add: '+ Añadir',
    filterLabel: 'Filtrar por estado',
    all: 'Todos',
    inciMissing: 'Faltan los ingredientes',
    inciUnknown: (total: number, unknown: number) => `${total} ingredientes · ${unknown} desconocidos`,
    inciReviewed: (total: number) => `${total} ingredientes · revisados`,
    inciNotReviewed: (total: number) => `${total} ingredientes · sin revisar`,
    declaredByYou: 'Lo has marcado tú',
    inIngredients: (list: string) => `En los ingredientes: ${list}`,
    usesPerWeek: (n: number) => `${fmtNum(n)} ${n === 1 ? 'vez' : 'veces'}/semana`,
    foot: '* Activo marcado por ti, a falta de la lista de ingredientes. Nombres INCI y funciones: CosIng (Comisión Europea).',
  },

  /** Analysis texts. Language rules: docs/REGLAS.md → E. "A vigilar", never "comedogénico" or "malo". */
  analysis: {
    watchDisclaimer: 'No significa que te vaya a dar granos; es un ingrediente a vigilar si notas comedones.',
    product: {
      C1: {
        short: 'A vigilar · ésteres', title: 'Ésteres grasos entre los primeros ingredientes',
        body: 'Son emolientes ricos y van muy arriba en la lista, así que hay bastante cantidad.', source: 'REGLAS.md · C1', watch: true,
      },
      C2: {
        short: 'A vigilar · aceites', title: 'Aceites vegetales pesados en una crema de noche',
        body: 'Están entre los 5 primeros ingredientes de una crema que se queda puesta toda la noche.', source: 'REGLAS.md · C2', watch: true,
      },
      C3: {
        short: 'A vigilar · ácidos grasos', title: 'Ácidos grasos con emolientes ricos',
        body: 'La combinación de ácidos grasos libres y emolientes ricos en una crema es algo a vigilar.', source: 'REGLAS.md · C3', watch: true,
      },
      C4: {
        short: 'Emulsionar', title: 'Limpiador de aceite: emulsiona bien',
        body: 'Masajea en seco, añade un poco de agua hasta que se vuelva lechoso y aclara a fondo.', source: 'REGLAS.md · C4', watch: false,
      },
      C5: {
        short: 'Doble limpieza', title: 'Maquillaje: doble limpieza ese día',
        body: 'Los maquillajes de larga duración se quitan mejor con dos limpiezas por la noche.', source: 'REGLAS.md · C5', watch: false,
      },
      FRAGRANCE: {
        short: 'Perfume', title: 'Lleva perfume',
        body: 'Si tu piel está sensible o irritada, es algo a tener en cuenta.', source: 'SPEC.md · 3.3', watch: false,
      },
      ALCOHOL: {
        short: 'Alcohol', title: 'Alcohol entre los primeros ingredientes',
        body: 'Puede resecar si la piel está irritada.', source: 'SPEC.md · 3.3', watch: false,
      },
    } satisfies Record<ProductRuleId, { short: string; title: string; body: string; source: string; watch: boolean }>,

    routine: (f: RoutineFinding, nameOf: NameOf<number>): Text3 => {
      switch (f.ruleId) {
        case 'R4':
          return {
            title: f.load > 12 ? 'Demasiada exfoliación a la semana' : 'Bastante exfoliación a la semana',
            body: `Carga semanal: ${fmtNum(f.load)} (aviso a partir de 8, propuesta de reducir a partir de 12). Lo que más suma: ${f.contributions.slice(0, 3).map((c) => `${nameOf(c.id)} (${fmtNum(c.load)})`).join(', ')}.`,
            source: 'REGLAS.md · R4',
          };
        case 'R7':
          return {
            title: `${active[f.activeClass as Active]} repetido en ${f.productIds.length} productos`,
            body: `${list(f.productIds, nameOf)}. Con uno suele bastar.`,
            source: 'REGLAS.md · R7',
          };
        case 'VITC-DUP':
          return {
            title: 'Vitamina C en más de un producto',
            body: `${list(f.productIds, nameOf)}. Puedes pausar uno sin perder nada.`,
            source: 'demo-case.md · resultado 4 (pendiente de pasar a REGLAS)',
          };
        case 'R5':
          return {
            title: 'Falta protector solar',
            body: `Usas ${list(f.productIds, nameOf)}, que hacen la piel más sensible al sol. Hace falta protector todas las mañanas.`,
            source: 'REGLAS.md · R5',
          };
        case 'R3':
          return {
            title: 'Peróxido de benzoilo y retinoide',
            body: `${list(f.productIds, nameOf)}: no los uses a la vez; altérnalos mañana y noche, o por días.`,
            source: 'REGLAS.md · R3',
          };
      }
    },

    pauseReason: {
      comedones: 'tiene ingredientes a vigilar',
      exfoliation: 'para bajar la exfoliación',
      'duplicate-vitc': 'vitamina C repetida',
    } satisfies Record<PauseReason, string>,

    panel: {
      title: 'Análisis de tus productos',
      lead: 'Miro todos tus productos (menos los descartados) con las veces por semana que has puesto. Es orientativo: no sustituye a un profesional.',
      nothing: 'No veo nada que destacar en el conjunto.',
      resetTitle: 'Propuesta de reset',
      resetBody: (load: number) => `Lo que el motor pausaría durante las 6 semanas. Con esto la exfoliación baja a ${fmtNum(load)} a la semana.`,
      reintroTitle: 'Orden de reintroducción',
      reintroBody: 'Uno cada 2 semanas, de menor a mayor riesgo.',
      unknownRisk: (counted: boolean) => `sin ingredientes: riesgo sin calcular del todo${counted ? ', cuenta como riesgo medio (D6)' : ''}`,
      notReintroduced: (names: string) => `No hace falta volver a probar ${names}: repiten un exfoliante que ya usas.`,
      footer: `${PENDING_RULES} Tu pestaña «Hoy» sigue de momento el orden de tu caso.`,
    },
  },

  /** How a new product fits with what is already in use. */
  fit: (f: FitIssue, nameOf: NameOf<number>): Text3 => {
    switch (f.ruleId) {
      case 'R7':
        return {
          title: `Repite ${active[f.activeClass as Active]}`,
          body: `Ya lo usas en ${list(f.withIds, nameOf)}. Con uno suele bastar: si lo pruebas, mejor como sustituto que como extra.`,
          source: 'REGLAS.md · R7',
        };
      case 'VITC-DUP':
        return { title: 'Otra vitamina C', body: `Ya tienes vitamina C en ${list(f.withIds, nameOf)}. No suma mucho usar dos.`, source: 'demo-case.md · resultado 4' };
      case 'R4':
        return {
          title: 'Sube la exfoliación semanal',
          body: `Pasaría de ${fmtNum(f.before)} a ${fmtNum(f.after)} (aviso a partir de 8). Úsalo menos veces o sustituye otro exfoliante.`,
          source: 'REGLAS.md · R4',
        };
      case 'R3':
        return { title: 'Peróxido de benzoilo y retinoide', body: `Con ${list(f.withIds, nameOf)}: nunca a la vez; altérnalos mañana y noche, o por días.`, source: 'REGLAS.md · R3' };
      case 'R5':
        return { title: 'Necesitas protector solar', body: 'Hace la piel más sensible al sol: protector todas las mañanas.', source: 'REGLAS.md · R5' };
    }
  },

  productForm: {
    editTitle: 'Editar producto',
    newTitle: 'Nuevo producto',
    name: 'Nombre',
    brand: 'Marca',
    type: 'Tipo',
    status: 'Estado',
    usesPerWeek: 'Veces por semana',
    usesPlaceholder: 'p. ej. 2',
    usesHint: 'Mañana y noche cada día = 14. Una vez al mes ≈ 0,25.',
    when: '¿Cuándo lo usas?',
    morning: 'Mañana',
    evening: 'Noche',
    season: 'Temporada',
    seasonAll: 'Todo el año',
    seasonSummer: 'Solo en verano',
    seasonWinter: 'Fuera del verano',
    howTo: 'Cómo usarlo',
    howToHint: '(sale debajo del nombre en «Hoy»)',
    howToPlaceholder: 'p. ej. Unas gotas, dejar absorber',
    whenHint: 'Los tratamientos de noche (azelaico, BHA, retinoide) van en el paso 3 según el calendario de la semana. Mascarillas, peelings y maquillaje no salen en la rutina diaria.',
    inci: 'Ingredientes (INCI)',
    inciPlaceholder: 'Pega la lista tal cual aparece en la etiqueta, separada por comas.',
    ingredients: (n: number) => `${n} ingredientes`,
    unknown: (n: number) => `${n} desconocidos`,
    notInDb: 'No está en nuestra base: no lo adivinamos.',
    unknownHint: 'Los desconocidos no están en nuestra base todavía. Revisa que estén bien escritos; si lo están, no pasa nada: el análisis simplemente no los tendrá en cuenta.',
    confirmed: 'He comparado la lista con la etiqueta y está completa',
    findingsTitle: 'Lo que veo en este producto',
    activesTitle: '¿Qué activos tiene?',
    activesHint: 'Márcalos si aún no tienes la lista de ingredientes. Si la lista los incluye, se detectan solos.',
    detected: 'Detectado en los ingredientes',
    confirmDelete: (name: string) => `¿Borrar «${name}»? No se puede deshacer.`,
  },

  newProduct: {
    label: 'Resumen del producto nuevo',
    kicker: 'Producto nuevo',
    seeTitle: 'Lo que veo',
    noInci: 'Sin lista de ingredientes no puedo analizarlo. Puedes añadirla luego con el código de barras, una foto o pegándola.',
    actives: (names: string) => `Activos: ${names}.`,
    noActives: 'No lleva activos fuertes (ácidos, retinoides, vitamina C…).',
    nothingToWatch: 'Entre los ingredientes que conozco, nada a vigilar.',
    unknownTitle: 'Lo que no puedo saber',
    unknownBody: (n: number, total: number, names: string) => `${n} de ${total} ingredientes no están en mi base todavía, así que no digo nada de ellos: ${names}.`,
    fitTitle: 'Con lo que ya usas',
    usesTitle: '¿Cuántas veces por semana?',
    usesBody: 'Es exfoliante: indica cuántas veces lo usarás para que cuente en la exfoliación semanal.',
    introTitle: 'Cómo introducirlo',
    introQueue: (week: number, inWeeks: number) => ({
      before: 'Estás en tu plan de reset y reintroducción. Para saber si te sienta bien, entra ',
      bold: 'solo y al final de la cola',
      after: `: su prueba de 2 semanas empezaría en la semana ${week} (dentro de unas ${inWeeks} semanas).`,
    }),
    introTrial: { before: 'Pruébalo ', bold: 'solo durante 2 semanas', after: ', sin estrenar nada más. Al final te preguntaré si se queda o se va.' },
    introBusy: (date: string) => ({
      before: 'Ahora mismo estás probando otro producto hasta el ',
      bold: date,
      after: '. Mejor esperar a que termine para saber cuál te sienta mal, si alguno.',
    }),
    introNone: 'El maquillaje no entra en la rutina diaria. Los días que lo uses, márcalo en el diario para recordarte la doble limpieza.',
    queue: 'Añadir a la cola',
    startTrial: 'Empezar prueba hoy',
    pauseForNow: 'Dejarlo en pausa por ahora',
    pause: 'Dejarlo en pausa',
    useNow: 'Usarlo ya, sin prueba',
  },

  label: {
    open: 'Leer ingredientes con una foto',
    error: {
      'not-configured': 'La lectura con foto aún no está configurada (falta la clave de la API).',
      refused: 'No se ha podido leer esta etiqueta. Prueba con otra foto o pega la lista a mano.',
      busy: 'El servicio está ocupado. Espera un momento y vuelve a intentarlo.',
      'bad-image': 'No he podido usar esa foto. Prueba con otra (JPG o PNG).',
      offline: 'Sin conexión. La lectura con foto necesita internet.',
      login: SESSION_EXPIRED,
      'not-available': 'La lectura con foto solo funciona en la app publicada (piel.pages.dev).',
      failed: 'Algo ha fallado al leer la etiqueta. Vuelve a intentarlo.',
    } satisfies Record<LabelError, string>,
    /** Warnings produced on the device (see label/ocr-parse.ts). */
    warning: {
      'ocr-no-marker': 'No he encontrado la palabra «Ingredients»: comprueba que sea la lista correcta.',
      'ocr-fixed': 'He corregido algunas letras mal leídas: están marcadas para revisar.',
    },
    confidence: { high: '', medium: 'Revisar', low: 'Dudoso' },
    consentTitle: 'Antes de empezar',
    consent: {
      before: 'La foto se envía a Claude (de Anthropic) ',
      bold: 'solo para leer el texto',
      after: ' de la etiqueta. Ni la app ni Cloudflare la guardan, y tú revisas cada ingrediente antes de guardar nada. Haz la foto solo del envase: que no salga tu cara.',
    },
    agree: 'De acuerdo',
    photoTitle: 'Foto de la lista de ingredientes',
    howLabel: 'Cómo leer la foto',
    modeDevice: 'En el móvil · gratis',
    modeCloud: 'Con IA · más precisa',
    deviceHint: 'Se lee en tu móvil: la foto no sale de él. Funciona mejor con listas en letras latinas; tendrás que revisar más que con la IA.',
    cloudHint: 'Se envía a Claude solo para leer el texto. Cuesta unos céntimos por etiqueta.',
    photosHint: (max: number) => `Hasta ${max} fotos si la lista ocupa varias caras. Mejor cerca, recta, con buena luz y sin reflejos.`,
    photosReady: (n: number) => `${n} ${n === 1 ? 'foto lista' : 'fotos listas'}.`,
    preparing: 'Preparando el lector… (solo tarda la primera vez)',
    reading: (pct: number) => `Leyendo… ${pct}%`,
    readingShort: 'Leyendo…',
    read: 'Leer etiqueta',
    notFound: 'No encuentro la lista de ingredientes en la foto. Prueba con una foto más cerca, con buena luz y sin reflejos.',
    deviceFailed: 'No he podido leer la foto en el móvil. Prueba con otra foto, más cerca y con buena luz.',
    reviewTitle: (n: number) => `Revisa la lista (${n} ingredientes)`,
    reviewCompare: 'Compárala con la etiqueta. ',
    reviewDoubtful: (n: number) => ({ before: 'Hay ', bold: String(n), after: ' marcados para revisar. ' }),
    reviewEdit: 'Puedes corregir, quitar o añadir. Nada se guarda hasta que confirmes.',
    ingredient: 'Ingrediente',
    unknown: 'Desconocido',
    removeIngredient: 'Quitar ingrediente',
    addIngredient: '+ Añadir ingrediente',
    unknownHint: (n: number) => `${n} no están en nuestra base de ingredientes: se guardan igual, pero el análisis no los tendrá en cuenta.`,
    discard: 'Descartar',
    use: 'He revisado la lista: usarla',
  },

  barcode: {
    error: {
      'bad-code': 'Ese número no parece un código de barras válido. Revísalo.',
      offline: 'Sin conexión. La búsqueda necesita internet.',
      login: SESSION_EXPIRED,
      'not-available': 'La búsqueda por código solo funciona en la app publicada (piel.pages.dev).',
      failed: 'No se ha podido consultar Open Beauty Facts. Vuelve a intentarlo.',
    } satisfies Record<LookupError, string>,
    camera: 'No puedo usar la cámara. Dale permiso en el navegador o escribe el número a mano.',
    open: '▥ Buscar por código de barras',
    title: 'Buscar por código de barras',
    lead: 'Busca el producto en Open Beauty Facts, una base de datos abierta y gratuita.',
    stopCamera: 'Parar la cámara',
    scan: 'Escanear con la cámara',
    typePlaceholder: 'o escribe el número (13 cifras)',
    searching: 'Buscando…',
    search: 'Buscar',
    notFound: { before: 'No está en Open Beauty Facts. Puedes pegar la lista a mano (de la web de la marca o de la tienda) y, si quieres, ', link: 'añadirlo tú a Open Beauty Facts', after: '.' },
    found: 'Producto encontrado',
    count: (n: number) => `${n} ingredientes en Open Beauty Facts.`,
    notInci: 'Esto no parece una lista de ingredientes: compruébalo bien antes de usarlo.',
    compare: 'Las fórmulas cambian con el tiempo: después compárala con tu envase y marca «He comparado la lista con la etiqueta».',
    noInci: 'Está registrado, pero sin lista de ingredientes. Tendrás que pegarla a mano.',
    attribution: { before: 'Datos de ', after: ', licencia ODbL.' },
    use: 'Usar estos ingredientes',
  },

  profile: {
    skin: { dry: 'Seca', oily: 'Grasa', combination: 'Mixta', normal: 'Normal', unsure: 'No lo sé' } satisfies Record<SkinType, string>,
    concern: {
      comedones: 'Comedones / puntos negros', pimples: 'Granos', redness: 'Rojeces', spots: 'Manchas', wrinkles: 'Arrugas', pores: 'Poros',
    } satisfies Record<Concern, string>,
    makeup: {
      never: 'Nunca', occasional: 'En ocasiones especiales', weekly: 'Algunos días a la semana', daily: 'A diario',
    } satisfies Record<Makeup, string>,
    salon: {
      none: 'No', occasional: 'Alguna vez', regular: 'Con regularidad (p. ej. cada 2–3 meses)',
    } satisfies Record<Salon, string>,
    supplement: {
      collagen: 'Colágeno', whey: 'Proteína (whey)', biotin: 'Biotina', vitamins: 'Vitaminas', zinc: 'Zinc', omega3: 'Omega-3', other: 'Otro',
    } satisfies Record<Supplement, string>,
    area: {
      jaw: 'Mandíbula o barbilla', forehead: 'Frente', cheeks: 'Mejillas', nose: 'Nariz', back: 'Espalda o pecho',
    } satisfies Record<BreakoutArea, string>,
    /** Triage questions (REGLAS → A). The order and which are optional live in QuizSheet. */
    triageQ: {
      T1: { q: '¿Tienes bultos profundos, dolorosos o sin cabeza (como quistes o nódulos)?', why: 'Las cremas no llegan bien a esa profundidad y existen tratamientos con receta.' },
      T2: { q: '¿Te quedan marcas o cicatrices después de los granos?', why: 'Tratarlo pronto ayuda a evitar cicatrices.' },
      T5: { q: '¿Usas medicación con receta para la piel o el acné (cremas o pastillas)?', why: 'No conviene cambiar la rutina sin hablar con quien te la recetó.' },
      T4: { q: '¿Estás embarazada, intentando quedarte embarazada o en lactancia?', why: 'Algunos activos, como los retinoides, no se recomiendan. Si respondes que sí, la app quita el retinol de tu calendario.' },
    },
    hormonal: {
      q: '¿Tienes alguno de estos cambios: regla irregular, más vello del habitual o caída del pelo?',
      why: 'Si además los brotes salen sobre todo en la mandíbula o la barbilla, conviene valorarlo con un profesional.',
    },
  },

  quiz: {
    label: 'Tu perfil de piel',
    steps: ['Tú', 'Tu piel', 'Hábitos', 'Salud', 'Un evento'],
    progress: (n: number, of: number) => `Tu perfil · ${n} de ${of}`,
    name: '¿Cómo te llamas?',
    namePlaceholder: 'Tu nombre',
    nameHint: 'Solo se usa para saludarte. Todo lo que respondas se guarda en tus dispositivos (y cifrado si sincronizas).',
    skinType: '¿Cómo dirías que es tu piel?',
    concerns: '¿Qué te gustaría mejorar?',
    several: '(puedes marcar varias)',
    optional: '(opcional)',
    sport: '¿Qué días haces deporte en el que sudas?',
    sportHint: 'Esos días te recordará limpiarte al terminar. Las noches de BHA se eligen en Ajustes.',
    makeup: '¿Con qué frecuencia te maquillas?',
    salon: '¿Te haces tratamientos en cabina, como limpiezas de cutis?',
    salonHint: 'Solo se apunta. Si te haces uno, márcalo también en el diario de ese día.',
    supplements: '¿Tomas algún suplemento?',
    supplementOther: '¿Cuál?',
    supplementsHint: 'Solo como registro para ti o para tu dermatóloga: la app no da consejos de suplementos.',
    healthIntro: 'Estas preguntas sirven para saber cuándo conviene que lo vea un profesional. La app no diagnostica.',
    areas: '¿Dónde te salen los brotes sobre todo?',
    areasHint: 'Se apunta para ti y para tu dermatóloga.',
    preferNot: 'Prefiero no decirlo',
    hasChallenge: 'Ya tienes un reto con fecha. Puedes cambiarlo desde la tarjeta «Mi reto».',
    eventIntro: '¿Tienes alguna fecha especial pronto? Una boda, un viaje… Te ayudo a llegar con la rutina constante. Es opcional.',
    eventWhat: '¿Qué es?',
    eventPlaceholder: 'Boda de Laura',
    eventWhen: '¿Cuándo?',
    notNow: 'Ahora no',
    back: 'Atrás',
    next: 'Siguiente',
    finish: 'Guardar perfil',
    answerAll: 'Responde todas para seguir.',
  },

  diary: {
    tag: {
      breakout: 'Brote nuevo',
      stinging: 'Pica o arde',
      picked: 'Me he apretado granos',
      makeup: 'Me he maquillado',
      newProduct: 'Producto nuevo',
      supplement: 'Empecé un suplemento',
      period: 'Regla',
      badSleep: 'Dormí mal',
      stress: 'Estrés',
      warningSigns: 'Dolor, calor, pus o fiebre',
    } satisfies Record<DiaryTag, string>,
    title: 'Diario',
    leadToday: '¿Qué tal la piel hoy?',
    leadPast: 'Puedes completar ese día.',
    lead: 'Marca lo que encaje y, si quieres, escribe una nota. Las etiquetas son las que usa la app para darte consejos; la nota es solo para ti.',
    tagsLabel: 'Etiquetas del día',
    noteLabel: 'Nota del día',
    notePlaceholder: 'Hoy he notado…',
    photosLink: (n: number) => `${n} ${n === 1 ? 'foto' : 'fotos'} · Ver en Fotos`,
    photosAdd: 'Añadir fotos en la pestaña Fotos',
    last30: 'Últimos 30 días',
    previous: 'Notas anteriores',
  },

  photos: {
    alt: (date: string) => `Foto del ${date}`,
    delete: 'Borrar foto',
    readError: 'No he podido abrir esa foto. Si es del iPhone (formato HEIC) y estás en el ordenador, súbela desde el móvil o guárdala antes como JPG.',
    saveError: 'No se ha podido guardar la foto. Puede que no quede espacio en el dispositivo.',
    confirmDelete: '¿Borrar esta foto? No se puede deshacer.',
    hint: '🔒 Las fotos se quedan solo en este dispositivo. Consejo: misma luz, misma distancia y la cara despejada.',
  },

  photosPage: {
    todayTitle: 'Fotos de hoy',
    todayLead: 'Una foto a la semana basta. Mismo sitio, luz de frente (mejor una ventana) y los mismos ángulos: los dos perfiles y de frente.',
    galleryTitle: 'Todas las fotos',
    galleryEmpty: 'Aquí irán apareciendo las fotos de otros días.',
  },

  compare: {
    title: 'Comparar fotos',
    empty: 'Cuando tengas al menos 2 fotos, aquí podrás ponerlas una al lado de la otra.',
    sameDay: 'Mismo día.',
    gap: (n: number) => `${n} ${n === 1 ? 'día' : 'días'} entre las dos.`,
    light: 'Mira con la misma luz: los cambios de la piel son lentos y la luz engaña mucho.',
    week: (w: number) => `sem. ${w}`,
    nth: (n: number) => `${n}ª`,
    before: 'Antes',
    after: 'Después',
    modeLabel: 'Modo de comparación',
    side: 'Lado a lado',
    slide: 'Deslizar',
    beforeAlt: 'Foto de antes',
    afterAlt: 'Foto de después',
    sliderLabel: 'Deslizar entre antes y después',
  },

  game: {
    levels: ['Semilla', 'Brote', 'Hoja', 'Flor', 'Jardín'],
    badge: {
      firstDay: { name: 'Primer día', how: 'Completa mañana y noche un día.' },
      streak7: { name: 'Una semana seguida', how: '7 días seguidos con las dos rutinas.' },
      diary7: { name: 'Diario constante', how: 'Escribe 7 notas en el diario.' },
      checkins4: { name: 'Un mes de seguimiento', how: 'Puntúa 4 semanas.' },
      listened: { name: 'Escuchaste a tu piel', how: 'Salta el tratamiento cuando la app te lo aconseje por irritación.' },
      resetDone: { name: 'Reset completado', how: 'Termina las semanas de reset y responde si ha mejorado.' },
      firstTrial: { name: 'Primera prueba', how: 'Termina la prueba de un producto.' },
      streak30: { name: 'Un mes seguido', how: '30 días seguidos con las dos rutinas.' },
    } satisfies Record<BadgeId, { name: string; how: string }>,
    title: 'Tus logros',
    lead: 'Sumas puntos por ser constante, no por usar más productos. Saltarte el tratamiento cuando la piel lo pide también cuenta.',
    streak: (n: number): string => (n === 1 ? 'día seguido' : 'días seguidos'),
    points: (today: number) => `puntos · hoy +${today}`,
    level: (name: string) => `Nivel ${name}`,
    levelProgress: 'Progreso de nivel',
    toNext: (n: number, name: string) => `${n} puntos para ${name}`,
    maxLevel: '¡Nivel máximo!',
    best: (n: number) => ` · mejor racha: ${n} días`,
  },

  challenge: {
    title: 'Mi reto',
    lead: '¿Tienes una fecha especial? Una boda, un viaje… Te ayudo a llegar con la rutina constante y a ver tu evolución.',
    what: '¿Qué es?',
    placeholder: 'Boda de Laura',
    when: '¿Cuándo?',
    create: 'Crear reto',
    past: '¡Ya pasó!',
    today: '¡Es hoy! 🎉',
    consistency: 'Constancia desde que empezaste el reto',
    complete: (done: number, tracked: number) => `${done} de ${tracked} ${tracked === 1 ? 'día' : 'días'} con las dos rutinas completas`,
    note: 'No te prometo un resultado: cada piel va a su ritmo. Lo que sí puedes es llegar con la rutina hecha y ver tu evolución en el seguimiento.',
    delete: 'Borrar reto',
    warning: (w: ChallengeWarning, nameOf: NameOf<string>, fmt: (ymd: string) => string): Text3 => {
      switch (w.kind) {
        case 'noNewProducts':
          return {
            title: 'Últimas 3 semanas: nada nuevo',
            body: 'No estrenes productos hasta el día. Una prueba dura 2 semanas y, si algo sienta mal, hace falta 1 semana de descanso.',
            source: 'REGLAS.md · D4 y D5',
          };
        case 'trialClash':
          return {
            title: `La prueba de ${nameOf(w.trial)} coincide con tu fecha`,
            body: `Va del ${fmt(w.trialStart)} al ${fmt(w.trialEnd)}, más 1 semana de margen. Si quieres ir tranquila, déjala para después.`,
            source: 'REGLAS.md · D4 y D5',
          };
      }
    },
  },

  week: {
    title: 'Esta semana',
    lead: 'El tratamiento de cada noche (paso 3). Un solo activo por noche. Toca un día pasado para abrirlo.',
    climb: ' escalada',
    open: (date: string) => `Abrir ${date}`,
    rules: [
      { bold: 'Nunca BHA y retinol la misma noche.', rest: ' Que haya al menos un día entre los dos.' },
      { bold: 'Si pica, arde o se pela:', rest: ' esa noche solo limpieza, crema y LED, sin tratamiento.' },
      { bold: 'BHA con algodón y en capa fina,', rest: ' sin tocar los ojos. Al día siguiente, protector sin falta.' },
    ],
  },

  plan: {
    title: 'Mi plan',
    lead: 'En qué fase estás y qué toca después.',
    weeks: (from: number, to: number, name: string) => `Semanas ${from}–${to} · ${name}`,
    stays: '✓ se queda',
    out: '✕ fuera',
    paused: 'Reintroducción en pausa hasta hablar con un profesional.',
  },

  tracker: {
    title: 'Seguimiento',
    week: (n: number) => `· semana ${n}`,
    lead: 'Puntúa del 0 (nada) al 5 (muchísimo). Ideal hacerlo cada domingo, con foto y la misma luz.',
    rows: {
      comedones: { label: 'Comedones', short: 'Comed.' },
      jaw: { label: 'Mandíbula', short: 'Mand.' },
      irritation: { label: 'Irritación', short: 'Irrit.' },
    },
    notePlaceholder: 'Notas: regla, estrés, sueño, algo nuevo…',
    save: 'Guardar semana',
    history: 'Historial',
    weekRow: (n: number) => `Semana ${n}`,
  },

  settings: {
    title: 'Ajustes',
    profile: 'Mi perfil de piel',
    profileSummary: (name: string, skin: string | null, date: string) => `${name}${skin ? ` · piel ${skin.toLowerCase()}` : ''} · revisado el ${date}.`,
    profilePending: 'Pendiente de completar o revisar.',
    retinolPaused: ' Retinol en pausa (embarazo o lactancia).',
    redoQuiz: 'Repetir el quiz',
    doQuiz: 'Hacer el quiz',
    language: 'Idioma',
    languageHint: 'Solo cambia en este dispositivo.',
    style: 'Estilo',
    styleHint: (hint: string) => `${hint}. Solo cambia en este dispositivo.`,
    themes: {
      clinico: { name: 'Clínico', hint: 'Blanco frío, azul verdoso, iconos de línea y datos claros' },
      elegante: { name: 'Elegante', hint: 'Crema y arena, títulos con serifa' },
      suave: { name: 'Limpio', hint: 'Blanco roto, un solo verde, mucho aire' },
      fresco: { name: 'Fresco', hint: 'Pastel melocotón y lila, más redondo' },
    } satisfies Record<Theme, { name: string; hint: string }>,
    start: 'Día en que empecé el reset',
    startHint: 'Con esto calculo la semana y la fase en la que estás.',
    climb: 'Días que escalo (BHA esas noches)',
    retinol: 'Noches de retinol',
    retinolHint: {
      paused: 'En pausa: has indicado embarazo, búsqueda de embarazo o lactancia en tu perfil. Esas noches toca azelaico.',
      manual: 'Elegido a mano.',
      'auto-later': 'Automático: 2 noches desde la semana 4.',
      'auto-early': 'Automático: 1 noche (jueves) hasta la semana 3; desde la semana 4, 2 noches.',
    },
    clash: (days: string) => `Ojo: ${days} es día de escalada, así que esa noche toca BHA y no retinol.`,
    gly: 'Mañanas de tónico glicólico (desde la semana 9)',
    glyHint: 'Como mucho 2 a la semana. Nunca la mañana siguiente a una noche de retinol.',
  },

  data: {
    error: {
      'not-json': 'Ese archivo no es una copia de Truce.',
      'not-piel': 'Ese archivo no es una copia de Truce.',
      newer: 'Esta copia es de una versión más nueva de la app. Actualiza la app y vuelve a intentarlo.',
      older: 'Esta copia es de una versión anterior de la app y todavía no se puede restaurar.',
      broken: 'La copia está incompleta o dañada.',
      photo: 'Alguna foto de la copia está dañada.',
    } satisfies Record<BackupErrorCode, string>,
    /** Name of the downloaded backup file. */
    fileName: (date: string, withPhotos: boolean) => `truce-copia-${date}${withPhotos ? '' : '-sin-fotos'}.json`,
    downloaded: 'Copia descargada. Guárdala en un sitio seguro: tiene tus notas y fotos.',
    createFailed: 'No se ha podido crear la copia.',
    readFailed: 'No se ha podido leer el archivo.',
    restored: 'Datos restaurados.',
    restoreFailed: 'No se ha podido restaurar. Tus datos no han cambiado.',
    title: 'Tus datos',
    intro: 'Todo se guarda solo en este dispositivo. Haz una copia de vez en cuando, y antes de cambiar de móvil o de navegador.',
    lastBackup: (date: string) => `Última copia: ${date}.`,
    noBackup: 'Todavía no has hecho ninguna copia.',
    withPhotos: (n: number, bigger: boolean) => `Incluir fotos (${n})${bigger ? ' · el archivo será más grande' : ''}`,
    download: 'Descargar copia',
    restore: 'Restaurar copia…',
    confirmLabel: 'Confirmar restauración',
    confirmTitle: '¿Restaurar esta copia?',
    summary: (s: { date: string; products: number; days: number; notes: number; weeks: number; photos: number | null }) =>
      `Del ${s.date}: ${s.products} productos, ${s.days} días marcados, ${s.notes} notas, ${s.weeks} semanas de seguimiento${s.photos !== null ? ` y ${s.photos} fotos` : ' (sin fotos: las de este dispositivo se mantienen)'}.`,
    replaces: 'Sustituye todo lo que hay ahora en este dispositivo.',
    replacesHint: ' Si no estás segura, descarga antes una copia de lo actual.',
    confirm: 'Sí, restaurar',
    confirmDeletePhotos: '¿Borrar todas las fotos del diario? No se puede deshacer.',
    deletePhotos: 'Borrar todas las fotos',
    healthHint: 'El archivo de copia contiene datos de salud: no lo compartas ni lo subas a sitios públicos.',
  },

  sync: {
    wrongPhrase: 'Esa frase no coincide con la de tus otros dispositivos.',
    sessionExpired: SESSION_EXPIRED,
    notAvailable: 'La sincronización solo funciona en la app publicada (piel.pages.dev).',
    failed: 'No se ha podido conectar. Revisa la conexión y vuelve a intentarlo.',
    /** Shown in the status line while sync runs by itself. */
    statusError: { login: 'Tu sesión ha caducado: recarga la app para volver a entrar.', failed: 'No se ha podido sincronizar. Se reintentará solo.' },
    justNow: 'hace un momento',
    minutesAgo: (n: number) => `hace ${n} min`,
    confirmJoin: 'Este dispositivo usará los datos de la nube. Lo que haya ahora aquí se sustituye. ¿Seguir?',
    created: 'Sincronización activada. Ahora actívala en tu otro dispositivo con la misma frase.',
    joined: 'Listo: este dispositivo ya tiene tus datos y se mantendrá al día solo.',
    confirmOff: '¿Dejar de sincronizar en este dispositivo? Tus datos se quedan aquí y en tus otros dispositivos.',
    confirmWipe: '¿Borrar la copia de la nube? Tus dispositivos conservan sus datos, pero dejarán de sincronizar hasta que la actives de nuevo (con una frase nueva si quieres). No se puede deshacer.',
    wiped: 'Copia de la nube borrada.',
    syncing: 'Sincronizando…',
    offline: 'Sin conexión: se sincronizará cuando vuelva.',
    synced: (when: string) => `Sincronizado ${when}.`,
    pending: 'Pendiente de la primera sincronización.',
    title: 'Sincronización entre dispositivos',
    onHint: 'Cifrada con tu frase secreta antes de salir de este dispositivo. Se sincroniza sola al abrir la app y al cambiar algo.',
    now: 'Sincronizar ahora',
    turnOff: 'Desactivar aquí',
    offHint: 'Mantén el móvil y el ordenador al día sin hacer copias. Todo se cifra en el dispositivo con una frase que solo sabes tú: ni Cloudflare ni nadie puede leer tus datos.',
    checking: 'Comprobando…',
    enable: 'Activar sincronización',
    newTitle: 'Elige tu frase secreta',
    newHint: (min: number) => ({
      before: `Al menos ${min} caracteres; una frase que recuerdes, por ejemplo «gota de lluvia en marzo». `,
      bold: 'Si la olvidas, la copia de la nube no se puede recuperar',
      after: ' (tus dispositivos sí conservan sus datos).',
    }),
    phrase: 'Frase secreta',
    repeat: 'Repítela',
    mismatch: 'No coinciden.',
    joinTitle: 'Ya tienes la sincronización activada en otro dispositivo',
    joinHint: { before: 'Escribe la misma frase secreta. Este dispositivo descargará tus datos y ', bold: 'sustituirá', after: ' lo que tenga ahora.' },
    wait: 'Un momento…',
    activate: 'Activar',
    join: 'Unir este dispositivo',
    wipe: 'Borrar la copia de la nube',
  },
};

export type Messages = typeof es;
