import React, { useState } from 'react';
import { motion } from 'framer-motion';

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
      <div className="mb-6 flex flex-wrap gap-2">
        {matchdays.map(entry => (
          <button
            key={entry.matchday}
            type="button"
            onClick={() => setSelected(entry.matchday)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              selected === entry.matchday
                ? 'bg-uefa-gold font-semibold text-uefa-blue'
                : 'border border-white/20 text-white/70 hover:border-uefa-gold/60'
            }`}
          >
            Journée {entry.matchday}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-white/60">{current.total} matchs</p>

      <div className="space-y-6">
        {current.dates.map(day => (
          <motion.section
            key={day.date}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="mb-3 text-left text-sm font-semibold uppercase tracking-wide text-uefa-gold">
              {formatDate(day.date)}
            </h3>
            <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/5">
              {day.matches.map(match => (
                <li key={match.id} className="grid grid-cols-[3.5rem_1fr_auto_1fr] items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="text-left text-xs text-white/50">{match.kickoff}</span>
                  <span className="text-right font-medium">{match.home.name}</span>
                  <span className="text-xs text-white/40">–</span>
                  <span className="text-left font-medium">{match.away.name}</span>
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
