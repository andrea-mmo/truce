/**
 * English texts (British English: en-GB dates and spelling).
 * Same keys as es.ts; TypeScript and messages.test.ts check nothing is missing.
 * Language rules from docs/REGLAS.md → E apply here too: "an ingredient to
 * watch", never "comedogenic" or "bad"; no diagnosis, no promises.
 *
 * Health and safety texts (triage, tips, analysis) were translated from the
 * Spanish and are pending review by a fluent speaker, like the rules themselves.
 */
import type { ActiveClass, ChallengeWarning, FitIssue, RoutineFinding, TagLabel, TipId, Treatment } from '../engine';
import type { Messages, TipText } from './es';
import { fmtNum } from './format';

type Active = Exclude<ActiveClass, 'none'>;
type Text3 = { title: string; body: string; source: string };
type NameOf<K> = (key: K) => string;
const list = (ids: number[], nameOf: NameOf<number>) => ids.map(nameOf).join(', ');
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const active: Messages['products']['active'] = {
  aha: 'AHA',
  bha: 'BHA',
  pha: 'PHA',
  retinoid: 'Retinoid',
  azelaic: 'Azelaic acid',
  vitC: 'Vitamin C',
  niacinamide: 'Niacinamide',
  bpo: 'Benzoyl peroxide',
};

const treatment: Messages['treatment'] = {
  az: { short: 'Azelaic', tiny: 'Azel.' },
  bha: { short: 'BHA', tiny: 'BHA' },
  ret: { short: 'Retinol', tiny: 'Ret.' },
};

const PENDING_RULES = 'These rules are pending professional review.';
const SESSION_EXPIRED = 'Your session has expired: reload the app and try again.';

const tips: Record<TipId, TipText> = {
  irritationTonight: {
    title: 'Tonight, no treatment',
    body: () => 'In your check-in you scored irritation 3 or higher. Tonight just cleanse, moisturise and use the LED, and skip step 3.',
    source: 'REGLAS.md · R10',
    why: 'When skin is irritated, one more active usually makes it worse. A break helps it recover before you carry on.',
  },
  irritationLowerFreq: {
    title: 'Two weeks in a row with irritation',
    body: () => 'Time to use your actives less often. Remove a retinol night in ⚙ or swap one for azelaic acid. If it doesn’t improve, talk to a professional.',
    source: 'REGLAS.md · R10',
    why: 'If the irritation keeps coming back, the routine is too much for your skin right now.',
  },
  retinolHold: {
    title: 'Retinol: better not to step up yet',
    body: () => 'This week you’d move to 2 nights, but you’ve had irritation. Stay at 1 night: pick it yourself in ⚙.',
    source: 'REGLAS.md · R6',
    why: 'Retinol is increased little by little, and only if your skin tolerates it.',
  },
  retinolRamp: {
    title: 'Retinol night',
    body: () => 'In weeks 1–3, 1 night a week. From week 4, 2 nights, only if there’s no irritation. A few drops are enough.',
    source: 'REGLAS.md · R6',
    why: 'Going slowly reduces the irritation at the start.',
  },
  spfAfterActive: {
    title: 'Sunscreen, no matter what',
    body: () => 'Last night was an exfoliating active or retinol. Today, wear sunscreen even if it’s cloudy, and reapply if you sweat.',
    source: 'REGLAS.md · R5',
    why: 'Acids and retinoids make skin more sensitive to the sun.',
  },
  activesBackToBack: {
    title: 'BHA and retinol on back-to-back nights',
    body: () => 'Last night and tonight are BHA and retinol in a row. If your skin feels sensitive, swap tonight’s for azelaic acid.',
    source: 'REGLAS.md · R2 and the "This week" card',
    why: 'Rule R2 keeps them apart on the same night. The plan also suggests leaving a day between the two.',
  },
  trialFocus: {
    title: 'You’re in a trial',
    body: (t, nameOf) => `${t.trial ? nameOf(t.trial.id) : 'Product'}: day ${t.trial?.day ?? '–'} of ${t.trial?.of ?? 14}. Don’t start anything else until it ends, so you’ll know what caused what.`,
    source: 'REGLAS.md · D4',
    why: 'If you change two things at once, you can’t tell which one doesn’t suit you.',
  },
  stingingTonight: {
    title: 'Stinging or burning today: no treatment tonight',
    body: () => 'You marked it in your diary. Tonight just a gentle cleanse, moisturiser and LED; skip step 3 with “Skip today”.',
    source: 'REGLAS.md · F1 (brings R10 forward)',
    why: 'When skin is irritated, one more active usually makes it worse. Better to wait until it calms down.',
  },
  afterPicking: {
    title: 'Picked spots: leave them alone',
    body: () => 'Don’t touch them again. Tonight, no acids or retinol on open or stinging areas (or skip the treatment). Tomorrow, sunscreen so the marks don’t darken. If you notice pain, heat, pus or fever, mark it in your diary.',
    source: 'REGLAS.md · F2',
    why: 'Picking can leave marks and break the skin; actives on a wound usually irritate more.',
  },
  newProductInTrial: {
    title: 'New product in the middle of a trial',
    body: () => 'You’re testing another product right now. If you start something else, you won’t know which of the two it was. Better to keep it until the trial ends.',
    source: 'REGLAS.md · F3 and D4',
    why: 'Reintroduction works because only one thing changes at a time.',
  },
  newProductOneByOne: {
    title: 'New product',
    body: () => 'Add it in “Products” and use it on its own for about 2 weeks before starting another. That way you’ll know if it suits you.',
    source: 'REGLAS.md · F3 and D4',
    why: 'If you change several things at once, you won’t know which one it was.',
  },
  makeupDoubleCleanse: {
    title: 'Make-up today: double cleanse',
    body: () => 'Tonight, a first cleanse to remove the make-up (or micellar water), then your usual cleanser.',
    source: 'REGLAS.md · F4 and C5',
    why: 'Long-wear make-up stays on the skin if you only cleanse once.',
  },
  afterSport: {
    title: 'Exercise today',
    body: () => 'Wash your face with your gentle cleanser as soon as you finish, especially if you sweat a lot, and avoid touching your face with dirty hands.',
    source: 'REGLAS.md · R9',
    why: 'Sweat and dirt left on the skin for hours can make comedones worse.',
  },
  weeklyCheckIn: {
    title: 'Check-in day',
    body: () => 'It’s Sunday: score your week below and, if you can, take the photo in your usual light.',
    source: 'SPEC.md · 3.7',
    why: 'Scoring on the same day and in the same light makes the weeks comparable.',
  },
};

export const en: Messages = {
  locale: 'en-GB',

  common: {
    product: 'Product',
    today: 'Today',
    yesterday: 'Yesterday',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved ✓',
    cancel: 'Cancel',
    close: 'Close',
    done: 'Done',
    yes: 'Yes',
    no: 'No',
    edit: 'Edit',
    delete: 'Delete',
    takePhoto: 'Take photo',
    fromGallery: 'From gallery',
    source: (s) => `Source: ${s}`,
    pendingRules: PENDING_RULES,
    days: (n) => plural(n, 'day', 'days'),
    dayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },

  app: {
    title: 'Truce · My routine today',
    kicker: (name) => `Reset routine${name ? ` · ${name}` : ''}`,
    greeting: { morning: 'Good morning', afternoon: 'Good afternoon', night: 'Good evening' },
    prevDay: 'Previous day',
    nextDay: 'Next day',
    backToday: 'Back to today',
    chipNotStarted: 'Starting soon',
    chipReset: (week, of) => `Week ${week} of ${of} · Reset`,
    chipPhase: (week, name) => `Week ${week} · ${name}`,
    streakTitle: 'Days in a row with both routines',
    settings: 'Settings',
    sections: 'Sections',
    tabToday: 'Today',
    tabProducts: 'Products',
    tabPhotos: 'Photos',
    morning: 'Morning',
    evening: 'Evening',
    steps: (n) => `${n} ${plural(n, 'step', 'steps')}`,
    tonight: (isToday, t) => `${isToday ? 'Tonight' : 'That night'}: ${t}`,
    foot: 'General guidance, not a substitute for seeing a dermatologist. Your ticks, notes, photos and settings are stored only on this device.',
    clearToday: 'Untick today',
    clearDay: 'Untick this day',
  },

  demo: {
    bar: 'Demo with invented data. Whatever you do stays in this browser.',
    restart: 'Restart demo',
    confirmRestart: 'Start the demo again? Everything you changed will be deleted.',
    syncTitle: 'Sync between devices',
    syncOff: 'Not available in the demo. In the real app it is end-to-end encrypted with a phrase only you know.',
  },

  update: {
    available: 'A new version of the app is available.',
    apply: 'Update',
    version: 'App version',
    applyNew: 'Update to the new version',
    check: 'Check for updates',
    checking: 'Checking…',
    upToDate: 'You have the latest version.',
    offline: 'Offline: can’t check right now.',
  },

  treatment,

  tag: (label: TagLabel, t?: Treatment) => {
    switch (label) {
      case 'trial': return 'On trial';
      case 'glyToday': return 'Today';
      case 'optional': return 'Optional';
      case 'firstCleanse': return 'First cleanse';
      case 'nightCream': return 'Night cream';
      case 'treatment': return `Tonight: ${t ? treatment[t].short : ''}`;
    }
  },

  phase: {
    reset: { name: 'Reset', desc: 'Just the basic routine. Whatever is paused comes back later, one at a time.' },
    keep: { name: 'Maintenance', desc: 'Your routine with whatever passed its trial. New product: one at a time, for 2 weeks.' },
    trial: {
      default: 'Back into your routine. If you notice new comedones within 2 weeks, it’s out.',
      oilCleanser: 'Back as the first cleanse at night. If the comedones come back, it’s out for good.',
      moisturizer: 'Back as your moisturiser instead of the usual one.',
      aha: 'At most 2 mornings a week, never after a retinol night.',
      serum: 'Back in the morning. Only if you really miss it.',
    },
  },

  triage: {
    T1: 'Deep, painful bumps or bumps without a head: creams don’t reach that deep and there are prescription treatments. In the meantime, don’t squeeze them or put patches on them.',
    T2: 'Marks or scars that stay: getting it looked at early helps prevent scarring.',
    T3: 'Breakouts on the jaw or chin together with other changes: it’s worth having a professional look at it.',
    T4: 'Pregnancy, trying to conceive or breastfeeding: some actives, such as retinoids, are not recommended. Check first.',
    T5: 'Prescription medication for your skin: don’t change your routine without talking to whoever prescribed it.',
    T6: 'According to your check-ins, the simple routine hasn’t brought an improvement. Take your check-ins to a dermatologist or your GP. In the meantime, keep to the basic routine; reintroduction is paused.',
    T7: 'Pain, heat, a lot of pus or fever: get medical advice soon.',
  },

  banners: {
    triageTitle: 'This is worth having a professional look at',
    triageUndo: 'I got it wrong, it did improve',
    notStartedTitle: 'The reset hasn’t started yet',
    notStartedBody: (date) => `It starts on ${date}. Change it in ⚙ if you want to start today.`,
    profileReviewTitle: 'Review your skin profile',
    profileNewTitle: 'Complete your skin profile',
    profileReviewBody: 'I’ve filled it in with what you already had. Review it (2 minutes): your answers drive the alerts and some of the tips.',
    profileNewBody: '5 quick questions about your skin, your habits and your health. They drive the alerts and some of the tips.',
    profileReviewBtn: 'Review profile',
    profileNewBtn: 'Start',
    pastTitle: (date) => `You’re looking at ${date}`,
    pastBody: 'Tick what you did that day or finish the note. You can go back up to 7 days.',
    climbTitle: 'Climbing today',
    climbBody: 'Wash your face with the COSRX gel as soon as you finish, don’t touch your face with chalky hands, and tonight is BHA.',
    firstWeekTitle: 'First week',
    firstWeekBody: 'It’s normal for skin to stay unsettled for 1–2 weeks after the clean-up. Comedones take about 4–6 weeks to show a change of routine.',
    decisionTitle: (weeks) => `${weeks} weeks have passed: has your skin improved?`,
    decisionBody: 'Look at your check-ins and photos.',
    decisionBetter: 'Yes, it’s improved',
    decisionSame: 'Same or worse',
    trialEndTitle: (name) => `End of trial: ${name}`,
    trialEndBody: 'Have you had new comedones in these 2 weeks?',
    trialKeep: 'No, it stays',
    trialOut: 'Yes, it’s out',
  },

  routine: {
    led: { name: 'Shark LED mask', what: 'On clean, dry skin, before serums and creams' },
    treatmentNone: (t) => ({ name: `Treatment: ${t}`, what: 'You have no product of this type in use.' }),
    oilCleanseHow: 'Emulsify well with water before rinsing',
    firstCleanse: (name) => `First cleanse: ${name}`,
    firstCleanseWhat: 'Or micellar water if you’re wearing make-up',
    secondCleanseWhat: 'Second cleanse, massage for about 60 seconds',
    skipped: 'Skipped on purpose',
    rule: (id) => `Rule ${id}`,
    advSkip: 'Better not today',
    advCaution: 'Careful: avoid open areas',
    undoSkipLabel: 'Undo skipping the treatment',
    skipLabel: 'Skip the treatment tonight',
    undo: 'Undo',
    skip: 'Skip today',
    allDone: (am) => `✓ ${am ? 'Morning' : 'Evening'} routine done`,
  },

  tipsCard: {
    title: 'Tips for today',
    lead: 'They come from the plan’s rules and your check-ins. Tap "Why?" to see where each one comes from.',
    why: 'Why?',
    evidence: 'Plan rule v0.1, pending professional review.',
  },

  tips,

  products: {
    category: {
      'oil-cleanser': 'Oil cleanser',
      cleanser: 'Cleanser',
      toner: 'Toner / lotion',
      serum: 'Serum',
      treatment: 'Treatment',
      moisturizer: 'Moisturiser',
      spf: 'Sunscreen',
      mask: 'Face mask',
      peel: 'Peel',
      makeup: 'Make-up',
    },
    active,
    status: {
      active: 'In use',
      paused: 'Paused',
      trial: 'On trial',
      removed: 'Discarded',
    },
  },

  library: {
    title: 'My products',
    count: (n, missing) => `${n} ${plural(n, 'product', 'products')}${missing ? ` · ${missing} missing ingredients` : ''}.`,
    add: '+ Add',
    filterLabel: 'Filter by status',
    all: 'All',
    inciMissing: 'Ingredients missing',
    inciUnknown: (total, unknown) => `${total} ingredients · ${unknown} unknown`,
    inciReviewed: (total) => `${total} ingredients · reviewed`,
    inciNotReviewed: (total) => `${total} ingredients · not reviewed`,
    declaredByYou: 'You marked this',
    inIngredients: (l) => `In the ingredients: ${l}`,
    usesPerWeek: (n) => `${fmtNum(n)} ${plural(n, 'time', 'times')}/week`,
    foot: '* Active marked by you, while the ingredient list is missing. INCI names and functions: CosIng (European Commission).',
  },

  analysis: {
    watchDisclaimer: 'It doesn’t mean it will give you spots; it’s an ingredient to watch if you notice comedones.',
    product: {
      C1: {
        short: 'To watch · esters', title: 'Fatty esters among the first ingredients',
        body: 'They are rich emollients and appear high up the list, so there’s quite a lot of them.', source: 'REGLAS.md · C1', watch: true,
      },
      C2: {
        short: 'To watch · oils', title: 'Heavy plant oils in a night cream',
        body: 'They are among the first 5 ingredients of a cream that stays on all night.', source: 'REGLAS.md · C2', watch: true,
      },
      C3: {
        short: 'To watch · fatty acids', title: 'Fatty acids with rich emollients',
        body: 'Free fatty acids combined with rich emollients in a cream are something to watch.', source: 'REGLAS.md · C3', watch: true,
      },
      C4: {
        short: 'Emulsify', title: 'Oil cleanser: emulsify well',
        body: 'Massage onto dry skin, add a little water until it turns milky and rinse thoroughly.', source: 'REGLAS.md · C4', watch: false,
      },
      C5: {
        short: 'Double cleanse', title: 'Make-up: double cleanse that day',
        body: 'Long-wear make-up comes off better with two cleanses at night.', source: 'REGLAS.md · C5', watch: false,
      },
      FRAGRANCE: {
        short: 'Fragrance', title: 'Contains fragrance',
        body: 'If your skin is sensitive or irritated, it’s something to bear in mind.', source: 'SPEC.md · 3.3', watch: false,
      },
      ALCOHOL: {
        short: 'Alcohol', title: 'Alcohol among the first ingredients',
        body: 'It can be drying if your skin is irritated.', source: 'SPEC.md · 3.3', watch: false,
      },
    },

    routine: (f: RoutineFinding, nameOf: NameOf<number>): Text3 => {
      switch (f.ruleId) {
        case 'R4':
          return {
            title: f.load > 12 ? 'Too much exfoliation per week' : 'Quite a lot of exfoliation per week',
            body: `Weekly load: ${fmtNum(f.load)} (warning from 8, suggestion to cut down from 12). Adding up the most: ${f.contributions.slice(0, 3).map((c) => `${nameOf(c.id)} (${fmtNum(c.load)})`).join(', ')}.`,
            source: 'REGLAS.md · R4',
          };
        case 'R7':
          return {
            title: `${active[f.activeClass as Active]} repeated in ${f.productIds.length} products`,
            body: `${list(f.productIds, nameOf)}. One is usually enough.`,
            source: 'REGLAS.md · R7',
          };
        case 'VITC-DUP':
          return {
            title: 'Vitamin C in more than one product',
            body: `${list(f.productIds, nameOf)}. You can pause one without losing anything.`,
            source: 'demo-case.md · result 4 (still to be moved into REGLAS)',
          };
        case 'R5':
          return {
            title: 'Sunscreen missing',
            body: `You use ${list(f.productIds, nameOf)}, which make skin more sensitive to the sun. You need sunscreen every morning.`,
            source: 'REGLAS.md · R5',
          };
        case 'R3':
          return {
            title: 'Benzoyl peroxide and a retinoid',
            body: `${list(f.productIds, nameOf)}: don’t use them together; alternate morning and night, or by day.`,
            source: 'REGLAS.md · R3',
          };
      }
    },

    pauseReason: {
      comedones: 'has ingredients to watch',
      exfoliation: 'to bring exfoliation down',
      'duplicate-vitc': 'repeated vitamin C',
    },

    panel: {
      title: 'Analysis of your products',
      lead: 'I look at all your products (except discarded ones) with the times per week you entered. It’s guidance only: not a substitute for a professional.',
      nothing: 'Nothing stands out in the routine as a whole.',
      resetTitle: 'Reset proposal',
      resetBody: (load) => `What the engine would pause for the 6 weeks. With this, exfoliation drops to ${fmtNum(load)} a week.`,
      reintroTitle: 'Reintroduction order',
      reintroBody: 'One every 2 weeks, from lowest to highest risk.',
      unknownRisk: (counted) => `no ingredients: risk not fully calculated${counted ? ', counts as medium risk (D6)' : ''}`,
      notReintroduced: (names) => `No need to test ${names} again: they repeat an exfoliant you already use.`,
      footer: `${PENDING_RULES} For now your “Today” tab follows the order of your case.`,
    },
  },

  fit: (f: FitIssue, nameOf: NameOf<number>): Text3 => {
    switch (f.ruleId) {
      case 'R7':
        return {
          title: `Repeats ${active[f.activeClass as Active]}`,
          body: `You already use it in ${list(f.withIds, nameOf)}. One is usually enough: if you try it, better as a replacement than as an extra.`,
          source: 'REGLAS.md · R7',
        };
      case 'VITC-DUP':
        return { title: 'Another vitamin C', body: `You already have vitamin C in ${list(f.withIds, nameOf)}. Using two doesn’t add much.`, source: 'demo-case.md · result 4' };
      case 'R4':
        return {
          title: 'Raises your weekly exfoliation',
          body: `It would go from ${fmtNum(f.before)} to ${fmtNum(f.after)} (warning from 8). Use it less often or replace another exfoliant.`,
          source: 'REGLAS.md · R4',
        };
      case 'R3':
        return { title: 'Benzoyl peroxide and a retinoid', body: `With ${list(f.withIds, nameOf)}: never together; alternate morning and night, or by day.`, source: 'REGLAS.md · R3' };
      case 'R5':
        return { title: 'You need sunscreen', body: 'It makes skin more sensitive to the sun: sunscreen every morning.', source: 'REGLAS.md · R5' };
    }
  },

  productForm: {
    editTitle: 'Edit product',
    newTitle: 'New product',
    name: 'Name',
    brand: 'Brand',
    type: 'Type',
    status: 'Status',
    usesPerWeek: 'Times per week',
    usesPlaceholder: 'e.g. 2',
    usesHint: 'Morning and night every day = 14. Once a month ≈ 0.25.',
    when: 'When do you use it?',
    morning: 'Morning',
    evening: 'Evening',
    season: 'Season',
    seasonAll: 'All year',
    seasonSummer: 'Summer only',
    seasonWinter: 'Outside summer',
    howTo: 'How to use it',
    howToHint: '(shown under the name in “Today”)',
    howToPlaceholder: 'e.g. A few drops, let it absorb',
    whenHint: 'Night treatments (azelaic acid, BHA, retinoid) go in step 3, following the week’s calendar. Face masks, peels and make-up don’t appear in the daily routine.',
    inci: 'Ingredients (INCI)',
    inciPlaceholder: 'Paste the list exactly as it appears on the label, separated by commas.',
    ingredients: (n) => `${n} ingredients`,
    unknown: (n) => `${n} unknown`,
    notInDb: 'Not in our database: we don’t guess.',
    unknownHint: 'The unknown ones aren’t in our database yet. Check they’re spelt correctly; if they are, that’s fine: the analysis simply won’t take them into account.',
    confirmed: 'I’ve compared the list with the label and it’s complete',
    findingsTitle: 'What I see in this product',
    activesTitle: 'Which actives does it have?',
    activesHint: 'Mark them if you don’t have the ingredient list yet. If the list includes them, they’re detected automatically.',
    detected: 'Detected in the ingredients',
    confirmDelete: (name) => `Delete “${name}”? This can’t be undone.`,
  },

  newProduct: {
    label: 'New product summary',
    kicker: 'New product',
    seeTitle: 'What I see',
    noInci: 'Without an ingredient list I can’t analyse it. You can add it later with the barcode, a photo or by pasting it.',
    actives: (names) => `Actives: ${names}.`,
    noActives: 'No strong actives (acids, retinoids, vitamin C…).',
    nothingToWatch: 'Among the ingredients I know, nothing to watch.',
    unknownTitle: 'What I can’t know',
    unknownBody: (n, total, names) => `${n} of ${total} ingredients aren’t in my database yet, so I say nothing about them: ${names}.`,
    fitTitle: 'With what you already use',
    usesTitle: 'How many times a week?',
    usesBody: 'It’s an exfoliant: enter how often you’ll use it so it counts towards your weekly exfoliation.',
    introTitle: 'How to introduce it',
    introQueue: (week, inWeeks) => ({
      before: 'You’re on your reset and reintroduction plan. To find out if it suits you, it goes in ',
      bold: 'on its own, at the end of the queue',
      after: `: its 2-week trial would start in week ${week} (in about ${inWeeks} weeks).`,
    }),
    introTrial: { before: 'Try it ', bold: 'on its own for 2 weeks', after: ', without starting anything else. At the end I’ll ask whether it stays or goes.' },
    introBusy: (date) => ({
      before: 'You’re currently testing another product until ',
      bold: date,
      after: '. Better to wait until it ends so you know which one doesn’t suit you, if any.',
    }),
    introNone: 'Make-up isn’t part of the daily routine. On the days you wear it, mark it in your diary so you’re reminded to double cleanse.',
    queue: 'Add to the queue',
    startTrial: 'Start trial today',
    pauseForNow: 'Pause it for now',
    pause: 'Pause it',
    useNow: 'Use it now, without a trial',
  },

  label: {
    open: 'Read ingredients from a photo',
    error: {
      'not-configured': 'Photo reading isn’t set up yet (the API key is missing).',
      refused: 'This label couldn’t be read. Try another photo or paste the list by hand.',
      busy: 'The service is busy. Wait a moment and try again.',
      'bad-image': 'I couldn’t use that photo. Try another one (JPG or PNG).',
      offline: 'Offline. Photo reading needs an internet connection.',
      login: SESSION_EXPIRED,
      'not-available': 'Photo reading only works in the published app (piel.pages.dev).',
      failed: 'Something went wrong reading the label. Try again.',
    },
    warning: {
      'ocr-no-marker': 'I couldn’t find the word “Ingredients”: check that this is the right list.',
      'ocr-fixed': 'I corrected some misread letters: they’re marked for review.',
    },
    confidence: { high: '', medium: 'Check', low: 'Unsure' },
    consentTitle: 'Before you start',
    consent: {
      before: 'The photo is sent to Claude (by Anthropic) ',
      bold: 'only to read the text',
      after: ' on the label. Neither the app nor Cloudflare keeps it, and you review every ingredient before anything is saved. Photograph only the packaging: keep your face out of it.',
    },
    agree: 'OK',
    photoTitle: 'Photo of the ingredient list',
    howLabel: 'How to read the photo',
    modeDevice: 'On the phone · free',
    modeCloud: 'With AI · more accurate',
    deviceHint: 'It’s read on your phone: the photo never leaves it. Works best with lists in Latin script; you’ll need to check more than with the AI.',
    cloudHint: 'It’s sent to Claude only to read the text. It costs a few cents per label.',
    photosHint: (max) => `Up to ${max} photos if the list covers several sides. Best close up, straight on, in good light and without glare.`,
    photosReady: (n) => `${n} ${plural(n, 'photo', 'photos')} ready.`,
    preparing: 'Getting the reader ready… (only slow the first time)',
    reading: (pct) => `Reading… ${pct}%`,
    readingShort: 'Reading…',
    read: 'Read label',
    notFound: 'I can’t find the ingredient list in the photo. Try a closer photo, in good light and without glare.',
    deviceFailed: 'I couldn’t read the photo on the phone. Try another photo, closer and in good light.',
    reviewTitle: (n) => `Review the list (${n} ingredients)`,
    reviewCompare: 'Compare it with the label. ',
    reviewDoubtful: (n) => ({ before: '', bold: String(n), after: ` ${plural(n, 'is', 'are')} marked for review. ` }),
    reviewEdit: 'You can correct, remove or add. Nothing is saved until you confirm.',
    ingredient: 'Ingredient',
    unknown: 'Unknown',
    removeIngredient: 'Remove ingredient',
    addIngredient: '+ Add ingredient',
    unknownHint: (n) => `${n} ${plural(n, 'isn’t', 'aren’t')} in our ingredient database: saved anyway, but the analysis won’t take ${plural(n, 'it', 'them')} into account.`,
    discard: 'Discard',
    use: 'I’ve reviewed the list: use it',
  },

  barcode: {
    error: {
      'bad-code': 'That number doesn’t look like a valid barcode. Check it.',
      offline: 'Offline. Searching needs an internet connection.',
      login: SESSION_EXPIRED,
      'not-available': 'Barcode search only works in the published app (piel.pages.dev).',
      failed: 'Couldn’t reach Open Beauty Facts. Try again.',
    },
    camera: 'I can’t use the camera. Allow it in your browser or type the number by hand.',
    open: '▥ Search by barcode',
    title: 'Search by barcode',
    lead: 'Looks the product up in Open Beauty Facts, a free, open database.',
    stopCamera: 'Stop the camera',
    scan: 'Scan with the camera',
    typePlaceholder: 'or type the number (13 digits)',
    searching: 'Searching…',
    search: 'Search',
    notFound: { before: 'It’s not in Open Beauty Facts. You can paste the list by hand (from the brand’s or shop’s website) and, if you like, ', link: 'add it to Open Beauty Facts yourself', after: '.' },
    found: 'Product found',
    count: (n) => `${n} ingredients in Open Beauty Facts.`,
    notInci: 'This doesn’t look like an ingredient list: check it carefully before using it.',
    compare: 'Formulas change over time: afterwards, compare it with your packaging and tick “I’ve compared the list with the label”.',
    noInci: 'It’s listed, but without an ingredient list. You’ll have to paste it by hand.',
    attribution: { before: 'Data from ', after: ', ODbL licence.' },
    use: 'Use these ingredients',
  },

  profile: {
    skin: { dry: 'Dry', oily: 'Oily', combination: 'Combination', normal: 'Normal', unsure: 'Not sure' },
    concern: {
      comedones: 'Comedones / blackheads', pimples: 'Spots', redness: 'Redness', spots: 'Dark spots', wrinkles: 'Wrinkles', pores: 'Pores',
    },
    makeup: {
      never: 'Never', occasional: 'On special occasions', weekly: 'Some days a week', daily: 'Every day',
    },
    salon: {
      none: 'No', occasional: 'Now and then', regular: 'Regularly (e.g. every 2–3 months)',
    },
    supplement: {
      collagen: 'Collagen', whey: 'Protein (whey)', biotin: 'Biotin', vitamins: 'Vitamins', zinc: 'Zinc', omega3: 'Omega-3', other: 'Other',
    },
    area: {
      jaw: 'Jaw or chin', forehead: 'Forehead', cheeks: 'Cheeks', nose: 'Nose', back: 'Back or chest',
    },
    triageQ: {
      T1: { q: 'Do you have deep, painful bumps, or bumps without a head (like cysts or nodules)?', why: 'Creams don’t reach that deep and there are prescription treatments.' },
      T2: { q: 'Do your spots leave marks or scars?', why: 'Getting it looked at early helps prevent scarring.' },
      T5: { q: 'Do you use prescription medication for your skin or acne (creams or tablets)?', why: 'It’s best not to change your routine without talking to whoever prescribed it.' },
      T4: { q: 'Are you pregnant, trying to conceive or breastfeeding?', why: 'Some actives, such as retinoids, are not recommended. If you answer yes, the app removes retinol from your calendar.' },
    },
    hormonal: {
      q: 'Do you have any of these changes: irregular periods, more body or facial hair than usual, or hair loss?',
      why: 'If your breakouts are also mostly on the jaw or chin, it’s worth having a professional look at it.',
    },
  },

  quiz: {
    label: 'Your skin profile',
    steps: ['You', 'Your skin', 'Habits', 'Health', 'An event'],
    progress: (n, of) => `Your profile · ${n} of ${of}`,
    name: 'What’s your name?',
    namePlaceholder: 'Your name',
    nameHint: 'Only used to greet you. Everything you answer is stored on your devices (and encrypted if you sync).',
    skinType: 'How would you describe your skin?',
    concerns: 'What would you like to improve?',
    several: '(you can pick several)',
    optional: '(optional)',
    sport: 'Which days do you do exercise that makes you sweat?',
    sportHint: 'On those days it will remind you to cleanse afterwards. BHA nights are chosen in Settings.',
    makeup: 'How often do you wear make-up?',
    salon: 'Do you have salon treatments, such as facials?',
    salonHint: 'It’s just noted down. If you have one, also mark it in that day’s diary.',
    supplements: 'Do you take any supplements?',
    supplementOther: 'Which one?',
    supplementsHint: 'Only as a record for you or your dermatologist: the app doesn’t give advice on supplements.',
    healthIntro: 'These questions help tell when it’s worth having a professional look at it. The app doesn’t diagnose.',
    areas: 'Where do your breakouts mostly appear?',
    areasHint: 'Noted for you and your dermatologist.',
    preferNot: 'I’d rather not say',
    hasChallenge: 'You already have a dated goal. You can change it from the “My goal” card.',
    eventIntro: 'Do you have a special date coming up? A wedding, a trip… I’ll help you get there with a steady routine. It’s optional.',
    eventWhat: 'What is it?',
    eventPlaceholder: 'Laura’s wedding',
    eventWhen: 'When?',
    notNow: 'Not now',
    back: 'Back',
    next: 'Next',
    finish: 'Save profile',
    answerAll: 'Answer them all to continue.',
  },

  diary: {
    tag: {
      breakout: 'New breakout',
      stinging: 'Stinging or burning',
      picked: 'I picked spots',
      makeup: 'I wore make-up',
      newProduct: 'New product',
      supplement: 'Started a supplement',
      period: 'Period',
      badSleep: 'Slept badly',
      stress: 'Stress',
      warningSigns: 'Pain, heat, pus or fever',
    },
    title: 'Diary',
    leadToday: 'How’s your skin today?',
    leadPast: 'You can fill in that day.',
    lead: 'Mark whatever fits and, if you like, write a note. The tags are what the app uses to give you tips; the note is just for you.',
    tagsLabel: 'Tags for the day',
    noteLabel: 'Note for the day',
    notePlaceholder: 'Today I noticed…',
    photosLink: (n) => `${n} ${plural(n, 'photo', 'photos')} · See in Photos`,
    photosAdd: 'Add photos in the Photos tab',
    last30: 'Last 30 days',
    previous: 'Earlier notes',
  },

  photos: {
    alt: (date) => `Photo from ${date}`,
    delete: 'Delete photo',
    readError: 'I couldn’t open that photo. If it’s an iPhone photo (HEIC) and you’re on a computer, upload it from your phone or save it as JPG first.',
    saveError: 'The photo couldn’t be saved. The device may be out of space.',
    confirmDelete: 'Delete this photo? This can’t be undone.',
    hint: '🔒 Photos stay only on this device. Tip: same light, same distance and your face clear.',
  },

  photosPage: {
    todayTitle: 'Today’s photos',
    todayLead: 'One photo a week is enough. Same place, light from the front (a window is best) and the same angles: both profiles and the front.',
    galleryTitle: 'All photos',
    galleryEmpty: 'Photos from other days will show up here.',
  },

  compare: {
    title: 'Compare photos',
    empty: 'Once you have at least 2 photos, you can put them side by side here.',
    sameDay: 'Same day.',
    gap: (n) => `${n} ${plural(n, 'day', 'days')} apart.`,
    light: 'Compare in the same light: skin changes slowly and light is very deceptive.',
    week: (w) => `wk ${w}`,
    nth: (n) => `#${n}`,
    before: 'Before',
    after: 'After',
    modeLabel: 'Comparison mode',
    side: 'Side by side',
    slide: 'Slider',
    beforeAlt: 'Before photo',
    afterAlt: 'After photo',
    sliderLabel: 'Slide between before and after',
  },

  game: {
    levels: ['Seed', 'Sprout', 'Leaf', 'Flower', 'Garden'],
    badge: {
      firstDay: { name: 'First day', how: 'Complete morning and evening in one day.' },
      streak7: { name: 'A week in a row', how: '7 days in a row with both routines.' },
      diary7: { name: 'Steady diary', how: 'Write 7 notes in the diary.' },
      checkins4: { name: 'A month of check-ins', how: 'Score 4 weeks.' },
      listened: { name: 'You listened to your skin', how: 'Skip the treatment when the app suggests it because of irritation.' },
      resetDone: { name: 'Reset complete', how: 'Finish the reset weeks and answer whether it has improved.' },
      firstTrial: { name: 'First trial', how: 'Finish a product trial.' },
      streak30: { name: 'A month in a row', how: '30 days in a row with both routines.' },
    },
    title: 'Your achievements',
    lead: 'You earn points for being consistent, not for using more products. Skipping the treatment when your skin needs it counts too.',
    streak: (n) => (n === 1 ? 'day in a row' : 'days in a row'),
    points: (today) => `points · today +${today}`,
    level: (name) => `Level ${name}`,
    levelProgress: 'Level progress',
    toNext: (n, name) => `${n} points to ${name}`,
    maxLevel: 'Top level!',
    best: (n) => ` · best streak: ${n} days`,
  },

  challenge: {
    title: 'My goal',
    lead: 'Do you have a special date? A wedding, a trip… I’ll help you get there with a steady routine and see how you’re getting on.',
    what: 'What is it?',
    placeholder: 'Laura’s wedding',
    when: 'When?',
    create: 'Create goal',
    past: 'It’s passed!',
    today: 'It’s today! 🎉',
    consistency: 'Consistency since you started the goal',
    complete: (done, tracked) => `${done} of ${tracked} ${plural(tracked, 'day', 'days')} with both routines complete`,
    note: 'I can’t promise a result: every skin goes at its own pace. What you can do is get there with your routine done and see how you’ve changed in your check-ins.',
    delete: 'Delete goal',
    warning: (w: ChallengeWarning, nameOf: NameOf<string>, fmt: (ymd: string) => string): Text3 => {
      switch (w.kind) {
        case 'noNewProducts':
          return {
            title: 'Last 3 weeks: nothing new',
            body: 'Don’t start new products before the day. A trial lasts 2 weeks and, if something doesn’t suit you, you need 1 week of rest.',
            source: 'REGLAS.md · D4 and D5',
          };
        case 'trialClash':
          return {
            title: `The ${nameOf(w.trial)} trial overlaps with your date`,
            body: `It runs from ${fmt(w.trialStart)} to ${fmt(w.trialEnd)}, plus 1 week of margin. If you want to play it safe, leave it until afterwards.`,
            source: 'REGLAS.md · D4 and D5',
          };
      }
    },
  },

  week: {
    title: 'This week',
    lead: 'Each night’s treatment (step 3). Only one active per night. Tap a past day to open it.',
    climb: ' climbing',
    open: (date) => `Open ${date}`,
    rules: [
      { bold: 'Never BHA and retinol on the same night.', rest: ' Leave at least one day between them.' },
      { bold: 'If it stings, burns or peels:', rest: ' that night just cleanse, moisturise and LED, no treatment.' },
      { bold: 'BHA with a cotton pad, in a thin layer,', rest: ' away from the eyes. The next day, sunscreen without fail.' },
    ],
  },

  plan: {
    title: 'My plan',
    lead: 'Which phase you’re in and what comes next.',
    weeks: (from, to, name) => `Weeks ${from}–${to} · ${name}`,
    stays: '✓ stays',
    out: '✕ out',
    paused: 'Reintroduction paused until you’ve talked to a professional.',
  },

  tracker: {
    title: 'Check-in',
    week: (n) => `· week ${n}`,
    lead: 'Score from 0 (none) to 5 (a lot). Ideally every Sunday, with a photo in the same light.',
    rows: {
      comedones: { label: 'Comedones', short: 'Com.' },
      jaw: { label: 'Jaw', short: 'Jaw' },
      irritation: { label: 'Irritation', short: 'Irrit.' },
    },
    notePlaceholder: 'Notes: period, stress, sleep, something new…',
    save: 'Save week',
    history: 'History',
    weekRow: (n) => `Week ${n}`,
  },

  settings: {
    title: 'Settings',
    profile: 'My skin profile',
    profileSummary: (name, skin, date) => `${name}${skin ? ` · ${skin.toLowerCase()} skin` : ''} · reviewed on ${date}.`,
    profilePending: 'Still to complete or review.',
    retinolPaused: ' Retinol paused (pregnancy or breastfeeding).',
    redoQuiz: 'Retake the quiz',
    doQuiz: 'Take the quiz',
    language: 'Language',
    languageHint: 'Only changes on this device.',
    style: 'Style',
    styleHint: (hint) => `${hint}. Only changes on this device.`,
    themes: {
      clinico: { name: 'Clinical', hint: 'Cool white, teal, line icons and clear data' },
      elegante: { name: 'Elegant', hint: 'Cream and sand, serif headings' },
      suave: { name: 'Clean', hint: 'Off-white, a single green, lots of space' },
      fresco: { name: 'Fresh', hint: 'Peach and lilac pastels, rounder' },
    },
    start: 'Day I started the reset',
    startHint: 'I use this to work out your week and phase.',
    climb: 'Days I climb (BHA those nights)',
    retinol: 'Retinol nights',
    retinolHint: {
      paused: 'Paused: your profile says pregnancy, trying to conceive or breastfeeding. Those nights are azelaic acid.',
      manual: 'Chosen by you.',
      'auto-later': 'Automatic: 2 nights from week 4.',
      'auto-early': 'Automatic: 1 night (Thursday) until week 3; from week 4, 2 nights.',
    },
    clash: (days) => `Heads up: ${days} is a climbing day, so that night is BHA, not retinol.`,
    gly: 'Glycolic toner mornings (from week 9)',
    glyHint: 'At most 2 a week. Never the morning after a retinol night.',
  },

  data: {
    error: {
      'not-json': 'That file isn’t a Truce backup.',
      'not-piel': 'That file isn’t a Truce backup.',
      newer: 'This backup is from a newer version of the app. Update the app and try again.',
      older: 'This backup is from an older version of the app and can’t be restored yet.',
      broken: 'The backup is incomplete or damaged.',
      photo: 'Some photo in the backup is damaged.',
    },
    fileName: (date, withPhotos) => `truce-backup-${date}${withPhotos ? '' : '-no-photos'}.json`,
    downloaded: 'Backup downloaded. Keep it somewhere safe: it contains your notes and photos.',
    createFailed: 'The backup couldn’t be created.',
    readFailed: 'The file couldn’t be read.',
    restored: 'Data restored.',
    restoreFailed: 'Couldn’t restore. Your data hasn’t changed.',
    title: 'Your data',
    intro: 'Everything is stored only on this device. Make a backup now and then, and before changing phone or browser.',
    lastBackup: (date) => `Last backup: ${date}.`,
    noBackup: 'You haven’t made a backup yet.',
    withPhotos: (n, bigger) => `Include photos (${n})${bigger ? ' · the file will be larger' : ''}`,
    download: 'Download backup',
    restore: 'Restore backup…',
    confirmLabel: 'Confirm restore',
    confirmTitle: 'Restore this backup?',
    summary: (s) =>
      `From ${s.date}: ${s.products} products, ${s.days} days ticked, ${s.notes} notes, ${s.weeks} weeks of check-ins${s.photos !== null ? ` and ${s.photos} photos` : ' (no photos: the ones on this device are kept)'}.`,
    replaces: 'It replaces everything currently on this device.',
    replacesHint: ' If you’re not sure, download a backup of what’s here first.',
    confirm: 'Yes, restore',
    confirmDeletePhotos: 'Delete all diary photos? This can’t be undone.',
    deletePhotos: 'Delete all photos',
    healthHint: 'The backup file contains health data: don’t share it or upload it anywhere public.',
  },

  sync: {
    wrongPhrase: 'That phrase doesn’t match the one on your other devices.',
    sessionExpired: SESSION_EXPIRED,
    notAvailable: 'Sync only works in the published app (piel.pages.dev).',
    failed: 'Couldn’t connect. Check your connection and try again.',
    statusError: { login: 'Your session has expired: reload the app to sign in again.', failed: 'Couldn’t sync. It will try again by itself.' },
    justNow: 'just now',
    minutesAgo: (n) => `${n} min ago`,
    confirmJoin: 'This device will use the data in the cloud. Whatever is here now will be replaced. Continue?',
    created: 'Sync turned on. Now turn it on on your other device with the same phrase.',
    joined: 'Done: this device now has your data and will keep itself up to date.',
    confirmOff: 'Stop syncing on this device? Your data stays here and on your other devices.',
    confirmWipe: 'Delete the cloud copy? Your devices keep their data, but they’ll stop syncing until you turn it on again (with a new phrase if you like). This can’t be undone.',
    wiped: 'Cloud copy deleted.',
    syncing: 'Syncing…',
    offline: 'Offline: it will sync when you’re back online.',
    synced: (when) => `Synced ${when}.`,
    pending: 'Waiting for the first sync.',
    title: 'Sync between devices',
    onHint: 'Encrypted with your secret phrase before it leaves this device. It syncs by itself when you open the app and when something changes.',
    now: 'Sync now',
    turnOff: 'Turn off here',
    offHint: 'Keep your phone and computer up to date without making backups. Everything is encrypted on the device with a phrase only you know: neither Cloudflare nor anyone else can read your data.',
    checking: 'Checking…',
    enable: 'Turn on sync',
    newTitle: 'Choose your secret phrase',
    newHint: (min) => ({
      before: `At least ${min} characters; a phrase you’ll remember, for example “raindrops in march”. `,
      bold: 'If you forget it, the cloud copy can’t be recovered',
      after: ' (your devices do keep their data).',
    }),
    phrase: 'Secret phrase',
    repeat: 'Repeat it',
    mismatch: 'They don’t match.',
    joinTitle: 'You already have sync turned on on another device',
    joinHint: { before: 'Type the same secret phrase. This device will download your data and ', bold: 'replace', after: ' whatever it has now.' },
    wait: 'One moment…',
    activate: 'Turn on',
    join: 'Join this device',
    wipe: 'Delete the cloud copy',
  },
};
