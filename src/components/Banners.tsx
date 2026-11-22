import { Glyph, type IconName } from './Glyph';
import type { Banner, Phase } from '../engine';
import { findPhase, parseYmd } from '../engine';
import { fmtDate, useT } from '../i18n';
import { saveTrialResult, saveVerdict } from '../db/hooks';
import type { PlanState } from '../engine';

interface Props {
  banners: Banner[];
  plan: PlanState;
  phases: Phase[];
  /** Day being shown (today or an earlier one). */
  day: Date;
  nameOf: (key: string) => string;
  onOpenQuiz: () => void;
}

function Box({ cls, em, icon, children }: { cls: string; em: string; icon: IconName; children: React.ReactNode }) {
  return (
    <div className={`banner ${cls}`} role={cls === 'alert' ? 'alert' : undefined}>
      <div className="em"><Glyph emoji={em} icon={icon} size={20} /></div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export function Banners({ banners, plan, phases, day, nameOf, onOpenQuiz }: Props) {
  const t = useT();
  const b9 = t.banners;
  const setTrial = (key: string, r: 'ok' | 'bad') => saveTrialResult(plan.reintro, key, r);

  return (
    <div>
      {banners.map((b) => {
        switch (b.kind) {
          case 'triage':
            return (
              <Box key="triage" cls="alert" em="🩺" icon="alert">
                <b>{b9.triageTitle}</b>
                <ul>{b.signals.map((s) => <li key={s}>{t.triage[s]}</li>)}</ul>
                {plan.resetVerdict === 'same' && (
                  <div className="acts">
                    <button className="pill no" onClick={() => saveVerdict('better')}>{b9.triageUndo}</button>
                  </div>
                )}
              </Box>
            );
          case 'notStarted':
            return (
              <Box key="ns" cls="phase" em="🗓" icon="calendar">
                <b>{b9.notStartedTitle}</b>
                {b9.notStartedBody(fmtDate(parseYmd(b.start), { day: 'numeric', month: 'long' }))}
              </Box>
            );
          case 'profile':
            return (
              <Box key="profile" cls="phase" em="📝" icon="check">
                <b>{b.status === 'review' ? b9.profileReviewTitle : b9.profileNewTitle}</b>
                {b.status === 'review'
                  ? b9.profileReviewBody
                  : b9.profileNewBody}
                <div className="acts"><button className="pill ok" onClick={onOpenQuiz}>{b.status === 'review' ? b9.profileReviewBtn : b9.profileNewBtn}</button></div>
              </Box>
            );
          case 'pastDay':
            return (
              <Box key="past" cls="past" em="📖" icon="book">
                <b>{b9.pastTitle(fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' }))}</b>
                {b9.pastBody}
              </Box>
            );
          case 'climbDay':
            return (
              <Box key="climb" cls="climb" em="🧗" icon="activity">
                <b>{b9.climbTitle}</b>
                {b9.climbBody}
              </Box>
            );
          case 'firstWeek':
            return (
              <Box key="fw" cls="phase" em="🌱" icon="sprout">
                <b>{b9.firstWeekTitle}</b>
                {b9.firstWeekBody}
              </Box>
            );
          case 'resetDecision': {
            const weeks = findPhase(phases, 'reset').to;
            return (
              <Box key="rd" cls="decide" em="🔍" icon="search">
                <b>{b9.decisionTitle(weeks)}</b>
                {b9.decisionBody}
                <div className="acts">
                  <button className="pill ok" onClick={() => saveVerdict('better')}>{b9.decisionBetter}</button>
                  <button className="pill no" onClick={() => saveVerdict('same')}>{b9.decisionSame}</button>
                </div>
              </Box>
            );
          }
          case 'trialEnd':
            return (
              <Box key={`te-${b.trial}`} cls="phase" em="✅" icon="check">
                <b>{b9.trialEndTitle(nameOf(b.trial))}</b>
                {b9.trialEndBody}
                <div className="acts">
                  <button className="pill ok" onClick={() => setTrial(b.trial, 'ok')}>{b9.trialKeep}</button>
                  <button className="pill no" onClick={() => setTrial(b.trial, 'bad')}>{b9.trialOut}</button>
                </div>
              </Box>
            );
        }
      })}
    </div>
  );
}
