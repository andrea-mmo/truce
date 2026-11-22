import { Glyph } from './Glyph';
import { BADGE_ORDER, type BadgeId, type Score } from '../engine';
import { useT } from '../i18n';

const LEVEL_EMOJI = ['🌱', '🌿', '🍃', '🌸', '🌳'];
const BADGE_EMOJI: Record<BadgeId, string> = {
  firstDay: '✨', streak7: '🔥', diary7: '📖', checkins4: '📊', listened: '🫶', resetDone: '🏁', firstTrial: '🧪', streak30: '🏆',
};

export function ProgressCard({ score }: { score: Score }) {
  const t = useT();
  const { level } = score;
  const pct = level.to ? ((score.totalPoints - level.from) / (level.to - level.from)) * 100 : 100;
  return (
    <div className="section progress">
      <h3>{t.game.title}</h3>
      <p className="lead">{t.game.lead}</p>
      <div className="stats">
        <div className="stat"><div className="big"><Glyph emoji="🔥" icon="flame" size={20} /> {score.streak}</div><div className="lbl">{t.game.streak(score.streak)}</div></div>
        <div className="stat"><div className="big">{score.totalPoints}</div><div className="lbl">{t.game.points(score.todayPoints)}</div></div>
        <div className="stat"><div className="big"><Glyph emoji={LEVEL_EMOJI[level.n]} icon="sprout" size={22} /></div><div className="lbl">{t.game.level(t.game.levels[level.n])}</div></div>
      </div>
      <div className="lvlbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={t.game.levelProgress}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="lvlnext">
        {level.to ? t.game.toNext(level.to - score.totalPoints, t.game.levels[level.n + 1]) : t.game.maxLevel}
        {score.bestStreak > score.streak && t.game.best(score.bestStreak)}
      </div>
      <div className="badges">
        {BADGE_ORDER.map((b) => {
          const bt = t.game.badge[b];
          const got = score.badges.includes(b);
          return (
            <div key={b} className={`bdg${got ? ' got' : ''}`} title={bt.how}>
              <div className="bdg-e" aria-hidden="true">{got ? BADGE_EMOJI[b] : '🔒'}</div>
              <div className="bdg-n">{bt.name}</div>
              {!got && <div className="bdg-h">{bt.how}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
