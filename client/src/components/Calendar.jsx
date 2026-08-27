import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TeamCrest from './TeamCrest';

const formatDate = iso =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * Calendrier de la phase de ligue : 8 journées de 18 matchs, répartis sur les
 * dates officielles avec des coups d'envoi à 18h45 ou 21h00 CET.
 */
const Calendar = ({ matchdays }) => {
  const [selected, setSelected] = useState(1);
  const current = matchdays.find(entry => entry.matchday === selected);

  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {matchdays.map(entry => (
          <button
            key={entry.matchday}
            type="button"
            onClick={() => setSelected(entry.matchday)}
            className={`relative rounded-full px-4 py-1.5 text-sm transition ${
              selected === entry.matchday ? 'text-uefa-blue' : 'border border-white/20 text-white/70 hover:border-uefa-gold/60'
            }`}
          >
            {selected === entry.matchday && (
              <motion.span
                layoutId="journee-active"
                className="absolute inset-0 rounded-full bg-uefa-gold"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative font-semibold">J{entry.matchday}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          <p className="mb-5 text-sm text-white/50">
            Journée {current.matchday} · {current.total} matchs
          </p>

          <div className="space-y-6">
            {current.dates.map(day => (
              <section key={day.date}>
                <h3 className="mb-3 flex items-center gap-3 text-left text-xs font-semibold uppercase tracking-widest text-uefa-gold">
                  {formatDate(day.date)}
                  <span className="h-px flex-1 bg-gradient-to-r from-uefa-gold/40 to-transparent" />
                </h3>

                <motion.ul
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.03 } } }}
                >
                  {day.matches.map(match => (
                    <motion.li
                      key={match.id}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      className="grid grid-cols-[3rem_1fr_auto_1fr] items-center gap-2 border-b border-white/5 px-3 py-2.5 text-sm transition last:border-0 hover:bg-white/5 sm:gap-4 sm:px-5"
                    >
                      <span className="text-left text-xs tabular-nums text-white/45">{match.kickoff}</span>

                      <span className="flex min-w-0 items-center justify-end gap-2">
                        <span className="truncate text-right font-medium">{match.home.shortName}</span>
                        <TeamCrest team={match.home} size="sm" />
                      </span>

                      <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/40">VS</span>

                      <span className="flex min-w-0 items-center gap-2">
                        <TeamCrest team={match.away} size="sm" />
                        <span className="truncate text-left font-medium">{match.away.shortName}</span>
                      </span>
                    </motion.li>
                  ))}
                </motion.ul>
              </section>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Calendar;
