import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const POT_LABEL = ['', 'Chapeau 1', 'Chapeau 2', 'Chapeau 3', 'Chapeau 4'];

/**
 * Déroulé du tirage tel qu'il est révélé en direct : les boules du chapeau 1
 * sortent une à une, puis celles des chapeaux suivants. Pour chaque équipe, les
 * 8 adversaires sont affichés chapeau par chapeau, avec le lieu de la
 * rencontre ; les affiches déjà révélées lors d'un tour précédent sont signalées.
 */
const DrawComponent = ({ revealOrder }) => {
  const [shown, setShown] = useState(0);
  const finished = shown >= revealOrder.length;

  useEffect(() => {
    if (finished) return undefined;
    const timer = setTimeout(() => setShown(current => current + 1), 900);
    return () => clearTimeout(timer);
  }, [shown, finished]);

  const visible = revealOrder.slice(0, shown).reverse();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-white/70">
          Boule {Math.min(shown, revealOrder.length)} sur {revealOrder.length}
        </p>
        {!finished && (
          <button
            type="button"
            onClick={() => setShown(revealOrder.length)}
            className="rounded-full border border-uefa-gold/60 px-4 py-1.5 text-sm text-uefa-gold transition hover:bg-uefa-gold hover:text-uefa-blue"
          >
            Tout révéler
          </button>
        )}
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full bg-uefa-gold"
          animate={{ width: `${(shown / revealOrder.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="scroll-slim mt-6 max-h-[36rem] space-y-4 overflow-y-auto pr-2">
        <AnimatePresence initial={false}>
          {visible.map(step => (
            <motion.article
              key={step.order}
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-left"
            >
              <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="rounded bg-uefa-gold px-2 py-0.5 text-xs font-bold text-uefa-blue">
                  {POT_LABEL[step.pot]}
                </span>
                <h3 className="text-lg font-bold text-white">{step.team.name}</h3>
                <span className="text-xs text-white/50">{step.team.country}</span>
              </header>

              <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {step.fixtures.map(fixture => (
                  <li
                    key={fixture.id}
                    className={`flex items-baseline gap-2 text-sm ${fixture.alreadyKnown ? 'text-white/40' : 'text-white'}`}
                  >
                    <span className="w-9 shrink-0 text-[11px] uppercase tracking-wide text-white/40">
                      Ch.{fixture.pot}
                    </span>
                    <span
                      className={`w-6 shrink-0 rounded text-center text-[11px] font-bold ${
                        fixture.venue === 'H' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'
                      }`}
                      title={fixture.venue === 'H' ? 'À domicile' : 'À l’extérieur'}
                    >
                      {fixture.venue === 'H' ? 'D' : 'E'}
                    </span>
                    <span className="flex-1">{fixture.name}</span>
                    {fixture.alreadyKnown && <span className="text-[11px] italic">déjà tiré</span>}
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DrawComponent;
