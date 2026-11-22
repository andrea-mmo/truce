"""
Builds src/data/ingredients.json from:
  - scripts/cosing-2026-11-21.json : INCI name, CosIng id, official functions and
    EU annex references, read by hand from the public CosIng site on 2026-11-21.
  - CLASSIFICATION below: how the engine treats each ingredient. These come from
    docs/REGLAS.md v0.1 and are PENDING PROFESSIONAL REVIEW.
Run:  python3 scripts/build-ingredients.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
# Every CosIng lookup batch, by date it was checked.
COSING_BATCHES = ["2026-11-21", "2026-11-22"]
COSING_URL = "https://ec.europa.eu/growth/tools-databases/cosing/details/{}"

ALIASES = {
    "AQUA": ["WATER", "EAU", "AQUA/WATER", "WATER/AQUA"],
    "BUTYLENE GLYCOL": ["BG", "1,3-BUTYLENE GLYCOL"],
    "PARFUM": ["FRAGRANCE", "PERFUME", "PARFUM/FRAGRANCE", "FRAGRANCE/PARFUM"],
    "ASCORBYL GLUCOSIDE": ["L-ASCORBIC ACID 2-GLUCOSIDE", "ASCORBIC ACID 2-GLUCOSIDE"],
    "GLYCERIN": ["GLYCERINE", "GLYCEROL"],
    "ALCOHOL": ["ETHANOL"],
    "ALCOHOL DENAT.": ["DENATURED ALCOHOL", "SD ALCOHOL"],
    "CAPRYLIC/CAPRIC TRIGLYCERIDE": ["CAPRYLIC CAPRIC TRIGLYCERIDE"],
    "HELIANTHUS ANNUUS SEED OIL": ["SUNFLOWER SEED OIL"],
    "OLEA EUROPAEA FRUIT OIL": ["OLIVE OIL"],
    "SIMMONDSIA CHINENSIS SEED OIL": ["JOJOBA SEED OIL", "JOJOBA OIL"],
    "VITIS VINIFERA SEED OIL": ["GRAPE SEED OIL", "GRAPESEED OIL"],
    "MACADAMIA TERNIFOLIA SEED OIL": ["MACADAMIA SEED OIL"],
    "NIACINAMIDE": ["NICOTINAMIDE", "VITAMIN B3"],
    # 2026-11-22 batch: common English names printed on labels.
    "TOCOPHEROL": ["VITAMIN E"],
    "TOCOPHERYL ACETATE": ["VITAMIN E ACETATE"],
    "RETINYL PALMITATE": ["VITAMIN A PALMITATE"],
    "3-O-ETHYL ASCORBIC ACID": ["ETHYL ASCORBIC ACID"],
    "ALPHA-ARBUTIN": ["ALPHA ARBUTIN"],
    "COPPER TRIPEPTIDE-1": ["GHK-CU"],
    "CERAMIDE NP": ["CERAMIDE 3"],
    "CERAMIDE AP": ["CERAMIDE 6 II"],
    "CERAMIDE EOP": ["CERAMIDE 1"],
    "PARAFFINUM LIQUIDUM": ["MINERAL OIL", "PARAFFIN LIQUID"],
    "PETROLATUM": ["PETROLEUM JELLY"],
    "CERA ALBA": ["BEESWAX"],
    "BUTYROSPERMUM PARKII BUTTER": ["SHEA BUTTER", "BUTYROSPERMUM PARKII (SHEA) BUTTER"],
    "COCOS NUCIFERA OIL": ["COCONUT OIL"],
    "THEOBROMA CACAO SEED BUTTER": ["COCOA BUTTER", "COCOA SEED BUTTER"],
    "PERSEA GRATISSIMA OIL": ["AVOCADO OIL"],
    "TRITICUM VULGARE GERM OIL": ["WHEAT GERM OIL"],
    "PRUNUS AMYGDALUS DULCIS OIL": ["SWEET ALMOND OIL"],
    "ARGANIA SPINOSA KERNEL OIL": ["ARGAN OIL"],
    "ROSA CANINA FRUIT OIL": ["ROSEHIP OIL"],
    "ALOE BARBADENSIS LEAF JUICE": ["ALOE VERA LEAF JUICE"],
    "CAMELLIA SINENSIS LEAF EXTRACT": ["GREEN TEA LEAF EXTRACT"],
    "HAMAMELIS VIRGINIANA WATER": ["WITCH HAZEL WATER"],
    "SODIUM LAURETH SULFATE": ["SLES"],
    "SODIUM LAURYL SULFATE": ["SLS"],
    "PROPANEDIOL": ["1,3-PROPANEDIOL"],
    "BUTYL METHOXYDIBENZOYLMETHANE": ["AVOBENZONE"],
    "ETHYLHEXYL METHOXYCINNAMATE": ["OCTINOXATE", "OCTYL METHOXYCINNAMATE"],
    "ETHYLHEXYL SALICYLATE": ["OCTISALATE"],
    "BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE": ["BEMOTRIZINOL"],
    "TITANIUM DIOXIDE": ["CI 77891"],
    "ZINC OXIDE": ["CI 77947"],
}

# ref: where the engine's rule comes from. All v0.1, pending review.
def c(**kw):
    return kw

CLASSIFICATION = {
    # Actives (REGLAS R1, R2, R4, R5, R6; T4)
    "GLYCOLIC ACID": c(activeClass="aha", exfoliationWeight=2, irritancy="med", photosensitizing=True, refs=["R1", "R4", "R5"]),
    "LACTIC ACID": c(activeClass="aha", exfoliationWeight=1, irritancy="low", photosensitizing=True, refs=["R1", "R4", "R5"]),
    "MANDELIC ACID": c(activeClass="aha", exfoliationWeight=1, irritancy="low", photosensitizing=True, refs=["R1", "R4", "R5"]),
    "SALICYLIC ACID": c(activeClass="bha", exfoliationWeight=2, irritancy="med", photosensitizing=True, refs=["R1", "R4", "R5", "R7"]),
    "GLUCONOLACTONE": c(activeClass="pha", exfoliationWeight=1, irritancy="low", refs=["R4"]),
    "RETINOL": c(activeClass="retinoid", irritancy="high", photosensitizing=True, pregnancyCaution=True, refs=["R1", "R2", "R3", "R5", "R6", "T4"]),
    "AZELAIC ACID": c(activeClass="azelaic", irritancy="low", refs=["R1"]),
    "BENZOYL PEROXIDE": c(activeClass="bpo", irritancy="high", refs=["R3"]),
    "ASCORBIC ACID": c(activeClass="vitC", irritancy="med", refs=["DUP-VITC"]),
    "ASCORBYL GLUCOSIDE": c(activeClass="vitC", refs=["DUP-VITC"]),
    "TRISODIUM ASCORBYL PALMITATE PHOSPHATE": c(activeClass="vitC", refs=["DUP-VITC"]),
    "NIACINAMIDE": c(activeClass="niacinamide", refs=["SPEC-6 activeClass"]),
    # "A vigilar" for comedone-prone skin (REGLAS C1–C3, C5). Never a verdict.
    "ETHYLHEXYL PALMITATE": c(watch="C1", richEmollient=True, refs=["C1"]),
    "ISOPROPYL MYRISTATE": c(watch="C1", richEmollient=True, refs=["C1"]),
    "ISOPROPYL PALMITATE": c(watch="C1", richEmollient=True, refs=["C1"]),
    "OLEA EUROPAEA FRUIT OIL": c(watch="C2", richEmollient=True, refs=["C2"]),
    "MACADAMIA TERNIFOLIA SEED OIL": c(watch="C2", richEmollient=True, refs=["C2"]),
    "CAPRYLIC/CAPRIC TRIGLYCERIDE": c(richEmollient=True, refs=["C1", "C3"]),
    "MYRISTIC ACID": c(watch="C3", refs=["C3"]),
    "PALMITIC ACID": c(watch="C3", refs=["C3"]),
    "STEARIC ACID": c(watch="C3", refs=["C3"]),
    "TRIMETHYLSILOXYSILICATE": c(filmFormer=True, refs=["C5"]),
    # Other flags (SPEC §3.3: perfume y alcohol; REGLAS C peso por posición)
    "PARFUM": c(fragrance=True, irritancy="med", refs=["SPEC-3.3"]),
    "ALCOHOL DENAT.": c(drying_alcohol=True, refs=["SPEC-3.3"]),
    "ALCOHOL": c(drying_alcohol=True, refs=["SPEC-3.3"]),
    "PHENOXYETHANOL": c(preservativeMarker=True, refs=["C-position"]),

    # --- 2026-11-22 batch (same rules, same review status) ---
    # Retinoids (R1, R2, R3, R5, R6, T4)
    "RETINAL": c(activeClass="retinoid", irritancy="high", photosensitizing=True, pregnancyCaution=True, refs=["R1", "R2", "R3", "R5", "R6", "T4"]),
    "RETINYL PALMITATE": c(activeClass="retinoid", irritancy="med", photosensitizing=True, pregnancyCaution=True, refs=["R1", "R2", "R3", "R5", "R6", "T4"]),
    "HYDROXYPINACOLONE RETINOATE": c(activeClass="retinoid", irritancy="med", photosensitizing=True, pregnancyCaution=True, refs=["R1", "R2", "R3", "R5", "R6", "T4"]),
    # Exfoliants (R1, R4, R5, R7)
    "LACTOBIONIC ACID": c(activeClass="pha", exfoliationWeight=1, irritancy="low", refs=["R4"]),
    "BETAINE SALICYLATE": c(activeClass="bha", exfoliationWeight=1, irritancy="low", photosensitizing=True, refs=["R1", "R4", "R5", "R7"]),
    # Vitamin C derivatives (duplicate vitamin C)
    "SODIUM ASCORBYL PHOSPHATE": c(activeClass="vitC", refs=["DUP-VITC"]),
    "MAGNESIUM ASCORBYL PHOSPHATE": c(activeClass="vitC", refs=["DUP-VITC"]),
    "TETRAHEXYLDECYL ASCORBATE": c(activeClass="vitC", refs=["DUP-VITC"]),
    "3-O-ETHYL ASCORBIC ACID": c(activeClass="vitC", refs=["DUP-VITC"]),
    # C1: rich fatty esters
    "ISOPROPYL ISOSTEARATE": c(watch="C1", richEmollient=True, refs=["C1"]),
    "MYRISTYL MYRISTATE": c(watch="C1", richEmollient=True, refs=["C1"]),
    "ISOSTEARYL ISOSTEARATE": c(watch="C1", richEmollient=True, refs=["C1"]),
    "DECYL OLEATE": c(watch="C1", richEmollient=True, refs=["C1"]),
    "ETHYLHEXYL STEARATE": c(watch="C1", richEmollient=True, refs=["C1"]),
    "BUTYL STEARATE": c(watch="C1", richEmollient=True, refs=["C1"]),
    # C2: heavy plant oils and butters
    "COCOS NUCIFERA OIL": c(watch="C2", richEmollient=True, refs=["C2"]),
    "BUTYROSPERMUM PARKII BUTTER": c(watch="C2", richEmollient=True, refs=["C2"]),
    "THEOBROMA CACAO SEED BUTTER": c(watch="C2", richEmollient=True, refs=["C2"]),
    "PERSEA GRATISSIMA OIL": c(watch="C2", richEmollient=True, refs=["C2"]),
    "TRITICUM VULGARE GERM OIL": c(watch="C2", richEmollient=True, refs=["C2"]),
    "PRUNUS AMYGDALUS DULCIS OIL": c(watch="C2", richEmollient=True, refs=["C2"]),
    "LANOLIN": c(watch="C2", richEmollient=True, refs=["C2"]),
    # Rich emollients without their own "a vigilar" (count for C3 combinations)
    "PETROLATUM": c(richEmollient=True, refs=["C3"]),
    "PARAFFINUM LIQUIDUM": c(richEmollient=True, refs=["C3"]),
    "OCTYLDODECANOL": c(richEmollient=True, refs=["C3"]),
    # C3: free fatty acids
    "LAURIC ACID": c(watch="C3", refs=["C3"]),
    "OLEIC ACID": c(watch="C3", refs=["C3"]),
    # Fragrance allergens listed in Annex III (SPEC §3.3 perfume)
    "LIMONENE": c(fragrance=True, irritancy="med", refs=["SPEC-3.3"]),
    "LINALOOL": c(fragrance=True, irritancy="med", refs=["SPEC-3.3"]),
    "CITRONELLOL": c(fragrance=True, irritancy="med", refs=["SPEC-3.3"]),
    "GERANIOL": c(fragrance=True, irritancy="med", refs=["SPEC-3.3"]),
    "HEXYL CINNAMAL": c(fragrance=True, irritancy="med", refs=["SPEC-3.3"]),
    "BENZYL SALICYLATE": c(fragrance=True, irritancy="med", refs=["SPEC-3.3"]),
    "COUMARIN": c(fragrance=True, irritancy="med", refs=["SPEC-3.3"]),
    "EUGENOL": c(fragrance=True, irritancy="med", refs=["SPEC-3.3"]),
    "CITRAL": c(fragrance=True, irritancy="med", refs=["SPEC-3.3"]),
    # Preservatives: what comes after them weighs little (C, peso por posición)
    "SODIUM BENZOATE": c(preservativeMarker=True, refs=["C-position"]),
    "POTASSIUM SORBATE": c(preservativeMarker=True, refs=["C-position"]),
    "METHYLPARABEN": c(preservativeMarker=True, refs=["C-position"]),
    "PROPYLPARABEN": c(preservativeMarker=True, refs=["C-position"]),
    "CHLORPHENESIN": c(preservativeMarker=True, refs=["C-position"]),
}

def build():
    raw = []
    for date in COSING_BATCHES:
        for row in json.loads((ROOT / "scripts" / f"cosing-{date}.json").read_text()):
            raw.append((*row, date))
    seen = set()
    out = []
    for inci, cid, functions, annex, checked in raw:
        if inci in seen:
            continue
        seen.add(inci)
        cl = CLASSIFICATION.get(inci, {})
        refs = cl.pop("refs", [])
        entry = {
            "inci": inci,
            "aliases": ALIASES.get(inci, []),
            "cosing": {
                "id": cid,
                "url": COSING_URL.format(cid),
                "functions": functions.split("|") if functions else [],
                "annex": annex.split() if annex else [],
                "checkedOn": checked,
            },
            "activeClass": cl.get("activeClass", "none"),
            "exfoliationWeight": cl.get("exfoliationWeight", 0),
            "watch": cl.get("watch"),
            "richEmollient": cl.get("richEmollient", False),
            "filmFormer": cl.get("filmFormer", False),
            "fragrance": cl.get("fragrance", False),
            "dryingAlcohol": cl.get("drying_alcohol", False),
            "preservativeMarker": cl.get("preservativeMarker", False),
            "irritancy": cl.get("irritancy", "low"),
            "photosensitizing": cl.get("photosensitizing", False),
            "pregnancyCaution": cl.get("pregnancyCaution", False),
            "source": [
                {"kind": "cosing", "ref": COSING_URL.format(cid), "covers": ["inci", "functions", "annex"], "evidence": "official"},
            ] + ([{"kind": "rules", "ref": "docs/REGLAS.md v0.1 · " + ", ".join(refs), "covers": ["classification"], "evidence": "pending-review"}] if refs else []),
        }
        out.append(entry)
    out.sort(key=lambda e: e["inci"])
    (ROOT / "src" / "data" / "ingredients.json").write_text(json.dumps({
        "version": "0.1.0",
        "attribution": "Nombres INCI, funciones y anexos: CosIng, Comisión Europea (reutilización según la Decisión 2011/833/UE). Clasificación del motor: docs/REGLAS.md v0.1, pendiente de revisión profesional.",
        "ingredients": out,
    }, ensure_ascii=False, indent=2) + "\n")
    print(len(out), "ingredients")

build()
