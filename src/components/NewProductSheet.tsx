import { useMemo } from 'react';
import ingredientsDb from '../data/ingredients.json';
import {
  analyze, buildIndex, buildPhases, effectiveSettings, parseYmd, productKey, readProduct, reviewNewProduct, weekNumber,
  type IngredientDb, type Product,
} from '../engine';
import { fmtDate, useT, type Messages } from '../i18n';
import { queueProduct, setProductStatus, startTrial, useAppData, useProducts } from '../db/hooks';

const index = buildIndex(ingredientsDb as IngredientDb);

const fmt = (ymd: string) => fmtDate(parseYmd(ymd), { day: 'numeric', month: 'long' });
type Active = keyof Messages['products']['active'];
/** Text with one bold part in the middle. */
const Rich = ({ r }: { r: { before: string; bold: string; after: string } }) => <>{r.before}<b>{r.bold}</b>{r.after}</>;

export function NewProductSheet({ id, onClose }: { id: number; onClose: () => void }) {
  const t = useT();
  const n = t.newProduct;
  const data = useAppData();
  const products = useProducts();

  const view = useMemo(() => {
    if (!data || !products) return null;
    const p = products.find((x) => x.id === id) as (Product & { id: number }) | undefined;
    if (!p) return null;
    const today = new Date();
    const settings = effectiveSettings(data.plan.settings, data.profile);
    const all = products.filter((x): x is Product & { id: number } => x.id !== undefined);
    const inUse = all.filter((x) => x.id !== id && (x.status === 'active' || x.status === 'trial')).map((x) => analyze(x, readProduct(x, index)));
    const review = reviewNewProduct(p, readProduct(p, index), {
      inUse,
      phases: buildPhases(data.reintroQueue ?? []),
      week: weekNumber(settings.start, today),
      today,
      adhocTrials: all.filter((x) => x.status === 'trial' && x.trialStart).map((x) => ({ key: productKey(x.id), start: x.trialStart! })),
      reintro: data.plan.reintro,
    });
    const nameOf = (pid: number) => { const x = all.find((y) => y.id === pid); return x ? `${x.brand} ${x.name}`.trim() : '?'; };
    return { p, review, nameOf };
  }, [data, products, id]);

  if (!view) return null;
  const { p, review, nameOf } = view;
  const intro = review.introduce;
  const act = async (fn: () => Promise<unknown>) => { await fn(); onClose(); };

  return (
    <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet newprod" role="dialog" aria-modal="true" aria-label={n.label}>
        <div className="kicker">{n.kicker}</div>
        <h3>{`${p.brand} ${p.name}`.trim()}</h3>

        <div className="np-block">
          <div className="lb">{n.seeTitle}</div>
          {review.total === 0 && review.actives.length === 0 ? (
            <p className="hint">{n.noInci}</p>
          ) : (
            <>
              {review.actives.length > 0
                ? <p>{n.actives(review.actives.map((a) => t.products.active[a.activeClass as Active] + (a.declared ? '*' : '')).join(', '))}</p>
                : <p>{n.noActives}</p>}
              {review.findings.length > 0 ? (
                <ul className="tip-list">
                  {review.findings.map((f) => {
                    const ft = t.analysis.product[f.ruleId];
                    return (
                      <li key={f.ruleId} className={`tip ${f.severity === 'warn' ? 'warn' : 'info'}`}>
                        <div className="tip-ico" aria-hidden="true">{f.severity === 'warn' ? '!' : 'i'}</div>
                        <div><b>{ft.title}</b><p>{ft.body}{f.ingredients.length > 0 && <> ({f.ingredients.map((x) => x.toLowerCase()).join(', ')})</>}</p>{ft.watch && <p><i>{t.analysis.watchDisclaimer}</i></p>}</div>
                      </li>
                    );
                  })}
                </ul>
              ) : review.total > 0 && <p className="data-ok">{n.nothingToWatch}</p>}
            </>
          )}
        </div>

        {review.total > 0 && review.unknown.length > 0 && (
          <div className="np-block">
            <div className="lb">{n.unknownTitle}</div>
            <p className="hint">{n.unknownBody(review.unknown.length, review.total, review.unknown.slice(0, 8).join(', ') + (review.unknown.length > 8 ? '…' : ''))}</p>
          </div>
        )}

        {(review.fit.length > 0 || review.needsUses) && (
          <div className="np-block">
            <div className="lb">{n.fitTitle}</div>
            <ul className="tip-list">
              {review.fit.map((f, i) => {
                const ft = t.fit(f, nameOf);
                return (
                  <li key={i} className={`tip ${f.ruleId === 'R5' ? 'warn' : 'warn'}`}>
                    <div className="tip-ico" aria-hidden="true">!</div>
                    <div title={t.common.source(ft.source)}><b>{ft.title}</b><p>{ft.body}</p></div>
                  </li>
                );
              })}
              {review.needsUses && (
                <li className="tip info"><div className="tip-ico" aria-hidden="true">i</div><div><b>{n.usesTitle}</b><p>{n.usesBody}</p></div></li>
              )}
            </ul>
            {review.fit.length > 0 && <p className="tip-src">{t.common.pendingRules}</p>}
          </div>
        )}

        <div className="np-block">
          <div className="lb">{n.introTitle}</div>
          {intro.kind === 'queue' && <p><Rich r={n.introQueue(intro.startsWeek, intro.weeksFromNow)} /></p>}
          {intro.kind === 'trial-now' && <p><Rich r={n.introTrial} /></p>}
          {intro.kind === 'busy' && <p><Rich r={n.introBusy(fmt(intro.endsOn))} /></p>}
          {intro.kind === 'none' && <p>{n.introNone}</p>}
          <p className="tip-src">{t.common.pendingRules}</p>
        </div>

        <div className="np-actions">
          {intro.kind === 'queue' && <button className="btn" onClick={() => act(() => queueProduct(id))}>{n.queue}</button>}
          {intro.kind === 'trial-now' && <button className="btn" onClick={() => act(() => startTrial(id))}>{n.startTrial}</button>}
          {intro.kind === 'busy' && <button className="btn" onClick={() => act(() => setProductStatus(id, 'paused'))}>{n.pauseForNow}</button>}
          {intro.kind !== 'none' && intro.kind !== 'busy' && <button className="btn ghost" onClick={() => act(() => setProductStatus(id, 'paused'))}>{n.pause}</button>}
          {intro.kind !== 'none' && <button className="btn ghost" onClick={() => act(() => setProductStatus(id, 'active'))}>{n.useNow}</button>}
          {intro.kind === 'none' && <button className="btn" onClick={onClose}>{t.common.done}</button>}
        </div>
      </div>
    </div>
  );
}
