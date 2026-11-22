import { useMemo, useState } from 'react';
import db from '../data/ingredients.json';
import {
  analyzeProduct, buildIndex, CATEGORIES, readProduct, routineDefaults, type ActiveClass, type IngredientDb, type Product,
} from '../engine';
import { es } from '../i18n/es';
import { useT } from '../i18n';
import { deleteProduct, saveProduct } from '../db/hooks';
import { LabelReader } from './LabelReader';
import { BarcodeLookup } from './BarcodeLookup';
import { IS_DEMO } from '../demo';

const index = buildIndex(db as IngredientDb);
const ACTIVES = Object.keys(es.products.active) as Exclude<ActiveClass, 'none'>[];
const STATUSES = Object.keys(es.products.status) as Product['status'][];

export function emptyProduct(): Product {
  return {
    name: '', brand: '', category: 'serum', inciText: '', ingredientsConfirmed: false,
    declaredActives: [], usesPerWeek: null, status: 'active', ...routineDefaults('serum'), createdAt: 0, updatedAt: 0,
  };
}

export function ProductForm({ initial, onDone }: { initial: Product; onDone: (newId?: number) => void }) {
  const t = useT();
  const f9 = t.productForm;
  const [p, setP] = useState<Product>(initial);
  const set = (patch: Partial<Product>) => setP((x) => ({ ...x, ...patch }));
  const reading = useMemo(() => readProduct(p, index), [p]);
  const findings = useMemo(() => analyzeProduct(p, reading), [p, reading]);
  const canSave = p.name.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    const id = await saveProduct({ ...p, name: p.name.trim(), brand: p.brand.trim() });
    // A brand-new product gets a summary right after saving.
    onDone(p.id ? undefined : (id as number));
  }
  async function remove() {
    if (p.id && window.confirm(f9.confirmDelete(p.name))) {
      await deleteProduct(p.id);
      onDone();
    }
  }
  const toggleActive = (a: ActiveClass) =>
    set({ declaredActives: p.declaredActives.includes(a) ? p.declaredActives.filter((x) => x !== a) : [...p.declaredActives, a] });

  return (
    <form className="section pform" onSubmit={submit}>
      <h3>{p.id ? f9.editTitle : f9.newTitle}</h3>
      <div className="pf-grid">
        <label><span>{f9.name}</span>
          <input value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="Low pH Good Morning Gel" required />
        </label>
        <label><span>{f9.brand}</span>
          <input value={p.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="COSRX" />
        </label>
        <label><span>{f9.type}</span>
          <select
            value={p.category}
            onChange={(e) => {
              const category = e.target.value as Product['category'];
              // New product: follow the type's defaults for when/where it goes.
              set(p.id ? { category } : { category, ...routineDefaults(category), howTo: p.howTo });
            }}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{t.products.category[c]}</option>)}
          </select>
        </label>
        <label><span>{f9.status}</span>
          <select value={p.status} onChange={(e) => set({ status: e.target.value as Product['status'] })}>
            {STATUSES.map((s) => <option key={s} value={s}>{t.products.status[s]}</option>)}
          </select>
        </label>
        <label><span>{f9.usesPerWeek}</span>
          <input
            type="number" min={0} max={14} step={0.1} inputMode="decimal"
            value={p.usesPerWeek ?? ''} placeholder={f9.usesPlaceholder}
            onChange={(e) => set({ usesPerWeek: e.target.value === '' ? null : Math.max(0, Math.min(14, Number(e.target.value))) })}
          />
          <small>{f9.usesHint}</small>
        </label>
      </div>

      <fieldset className="pf-when">
        <legend>{f9.when}</legend>
        <div className="pf-when-row">
          <label className="pf-check"><input type="checkbox" checked={p.am} onChange={(e) => set({ am: e.target.checked })} /> {f9.morning}</label>
          <label className="pf-check"><input type="checkbox" checked={p.pm} onChange={(e) => set({ pm: e.target.checked })} /> {f9.evening}</label>
          <label className="pf-inline"><span>{f9.season}</span>
            <select value={p.season} onChange={(e) => set({ season: e.target.value as Product['season'] })}>
              <option value="all">{f9.seasonAll}</option>
              <option value="summer">{f9.seasonSummer}</option>
              <option value="winter">{f9.seasonWinter}</option>
            </select>
          </label>
        </div>
        <label><span>{f9.howTo} <small>{f9.howToHint}</small></span>
          <input value={p.howTo} maxLength={80} onChange={(e) => set({ howTo: e.target.value })} placeholder={f9.howToPlaceholder} />
        </label>
        <p className="pf-hint">
          {f9.whenHint}
        </p>
      </fieldset>

      <div className="pf-label">
        {/* Barcode lookup goes through the private backend: not in the demo. */}
        {!IS_DEMO && <BarcodeLookup
          onUse={({ barcode, inci, name, brand }) => set({
            barcode,
            inciText: inci,
            // Community data: the person still has to compare it with the pack.
            ingredientsConfirmed: false,
            ...(p.name.trim() ? {} : { name }),
            ...(p.brand.trim() ? {} : { brand }),
          })}
        />}
        <LabelReader
          onConfirm={({ inci, productName, brand }) => set({
            inciText: inci,
            // Reviewed line by line against the label (SPEC §4).
            ingredientsConfirmed: true,
            ...(p.name.trim() ? {} : { name: productName }),
            ...(p.brand.trim() ? {} : { brand }),
          })}
        />
      </div>

      <label className="pf-inci"><span>{f9.inci}</span>
        <textarea
          rows={4} value={p.inciText}
          placeholder={f9.inciPlaceholder}
          onChange={(e) => set({ inciText: e.target.value, ingredientsConfirmed: false })}
        />
      </label>

      {reading.hasInci && (
        <div className="pf-read">
          <div className="pf-read-top">
            {f9.ingredients(reading.parsed.length)}
            {reading.unknown.length > 0 && <> · <b className="unk">{f9.unknown(reading.unknown.length)}</b></>}
          </div>
          <ol className="inci-list">
            {reading.parsed.map((x) => (
              <li key={x.position} className={x.ingredient ? 'ok' : 'unk'} title={x.ingredient ? x.ingredient.cosing.functions.join(', ') : f9.notInDb}>
                {x.ingredient ? x.ingredient.inci.toLowerCase() : x.raw}
              </li>
            ))}
          </ol>
          {reading.unknown.length > 0 && (
            <p className="pf-hint">{f9.unknownHint}</p>
          )}
          <label className="pf-check">
            <input type="checkbox" checked={p.ingredientsConfirmed} onChange={(e) => set({ ingredientsConfirmed: e.target.checked })} />
            {f9.confirmed}
          </label>
        </div>
      )}

      {findings.length > 0 && (
        <div className="pf-findings">
          <div className="pf-read-top">{f9.findingsTitle}</div>
          <ul className="tip-list">
            {findings.map((f) => {
              const ft = t.analysis.product[f.ruleId];
              return (
                <li key={f.ruleId} className={`tip ${f.severity === 'warn' ? 'warn' : 'info'}`}>
                  <div className="tip-ico" aria-hidden="true">{f.severity === 'warn' ? '!' : 'i'}</div>
                  <div title={t.common.source(ft.source)}>
                    <b>{ft.title}</b>
                    <p>{ft.body}{f.ingredients.length > 0 && <> ({f.ingredients.map((x) => x.toLowerCase()).join(', ')})</>}</p>
                    {ft.watch && <p><i>{t.analysis.watchDisclaimer}</i></p>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="tip-src">{t.common.pendingRules}</p>
        </div>
      )}

      <fieldset className="pf-actives">
        <legend>{f9.activesTitle}</legend>
        <p className="pf-hint">{f9.activesHint}</p>
        <div className="daypick">
          {ACTIVES.map((a) => {
            const fromInci = reading.actives.some((x) => x.activeClass === a && x.origin === 'inci');
            const on = fromInci || p.declaredActives.includes(a);
            return (
              <button
                type="button" key={a} className={on ? 'on' : ''} aria-pressed={on} disabled={fromInci}
                title={fromInci ? f9.detected : undefined}
                onClick={() => toggleActive(a)}
              >{t.products.active[a]}{fromInci ? ' ✓' : ''}</button>
            );
          })}
        </div>
      </fieldset>

      <div className="row pf-actions">
        {p.id && <button type="button" className="btn ghost danger" onClick={remove}>{t.common.delete}</button>}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn ghost" onClick={() => onDone()}>{t.common.cancel}</button>
        <button type="submit" className="btn" disabled={!canSave}>{t.common.save}</button>
      </div>
    </form>
  );
}
