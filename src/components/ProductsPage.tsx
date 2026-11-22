import { useMemo, useState } from 'react';
import db from '../data/ingredients.json';
import { analyze, buildIndex, CATEGORIES, readProduct, type IngredientDb, type Product } from '../engine';
import { AnalysisPanel } from './AnalysisPanel';
import { useT, type Messages } from '../i18n';
import { useProducts } from '../db/hooks';
import { emptyProduct, ProductForm } from './ProductForm';
import { NewProductSheet } from './NewProductSheet';

const index = buildIndex(db as IngredientDb);
type Filter = 'all' | Product['status'];

function inciStatus(t: Messages, p: Product, unknown: number, total: number) {
  const l = t.library;
  if (!total) return { cls: 'miss', text: l.inciMissing };
  if (unknown) return { cls: 'warn', text: l.inciUnknown(total, unknown) };
  return p.ingredientsConfirmed
    ? { cls: 'ok', text: l.inciReviewed(total) }
    : { cls: 'warn', text: l.inciNotReviewed(total) };
}

export function ProductsPage() {
  const t = useT();
  const l = t.library;
  const products = useProducts();
  const [editing, setEditing] = useState<Product | null>(null);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const shown = useMemo(() => {
    const list = (products ?? []).filter((p) => filter === 'all' || p.status === filter);
    return list.sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));
  }, [products, filter]);

  const analyzed = useMemo(() => (products ?? []).map((p) => analyze(p, readProduct(p, index))), [products]);

  if (!products) return null;
  if (editing) return <ProductForm initial={editing} onDone={(newId) => { setEditing(null); if (newId) setReviewId(newId); }} />;

  const counts = (s: Filter) => (s === 'all' ? products.length : products.filter((p) => p.status === s).length);
  const missing = products.filter((p) => !p.inciText.trim()).length;

  return (
    <div>
      {reviewId !== null && <NewProductSheet id={reviewId} onClose={() => setReviewId(null)} />}
      <div className="section">
        <div className="lib-head">
          <div>
            <h3>{l.title}</h3>
            <p className="lead" style={{ marginBottom: 0 }}>
              {l.count(products.length, missing)}
            </p>
          </div>
          <button className="btn" onClick={() => setEditing(emptyProduct())}>{l.add}</button>
        </div>
        <div className="cmp-mode lib-filter" role="group" aria-label={l.filterLabel}>
          {(['all', 'active', 'paused', 'trial', 'removed'] as Filter[]).filter((f) => f === 'all' || counts(f) > 0).map((f) => (
            <button key={f} className={filter === f ? 'on' : ''} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? l.all : t.products.status[f]} <span className="cnt">{counts(f)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="plist">
        {shown.map((p) => {
          const a = analyzed.find((x) => x.product.id === p.id)!;
          const r = a.reading;
          const flags = a.findings.filter((f) => f.ruleId !== 'FRAGRANCE' && f.ruleId !== 'ALCOHOL');
          const st = inciStatus(t, p, r.unknown.length, r.parsed.length);
          return (
            <button key={p.id} className="pcard" onClick={() => setEditing(p)}>
              <div className="pc-top">
                <span className="pc-cat">{t.products.category[p.category]}</span>
                <span className={`pc-status ${p.status}`}>{t.products.status[p.status]}</span>
              </div>
              <div className="pc-name">{p.name}</div>
              <div className="pc-brand">{p.brand}</div>
              {r.actives.length > 0 && (
                <div className="pc-actives">
                  {r.actives.map((a) => (
                    <span key={a.activeClass} className={`tg act ${a.origin}`} title={a.origin === 'declared' ? l.declaredByYou : l.inIngredients(a.from.join(', ').toLowerCase())}>
                      {t.products.active[a.activeClass as keyof Messages['products']['active']]}{a.origin === 'declared' ? '*' : ''}
                    </span>
                  ))}
                </div>
              )}
              {flags.length > 0 && (
                <div className="pc-flags">
                  {flags.map((f) => <span key={f.ruleId} className={`tg ${f.severity === 'warn' ? 'new' : 'opt'}`}>{t.analysis.product[f.ruleId].short}</span>)}
                </div>
              )}
              <div className={`pc-inci ${st.cls}`}>{st.text}</div>
              {p.usesPerWeek !== null && <div className="pc-uses">{l.usesPerWeek(p.usesPerWeek)}</div>}
            </button>
          );
        })}
      </div>
      <AnalysisPanel items={analyzed.filter((a) => a.product.status !== 'removed')} />

      <p className="foot">{l.foot}</p>
    </div>
  );
}
