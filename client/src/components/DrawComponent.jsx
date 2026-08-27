import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TeamCrest from './TeamCrest';
import { potStyle } from './potStyles';

const STEP_MS = 2600;      // durée d'une boule à vitesse normale
const SPEEDS = [1, 2, 4];

/**
 * Déroulé du tirage tel qu'il est révélé en direct : la boule sortie du bol
 * s'ouvre sur le nom de l'équipe, puis ses 8 adversaires apparaissent chapeau
 * par chapeau, avec le lieu de la rencontre. Les affiches déjà révélées lors
 * d'un tour précédent sont signalées comme telles.
 */
const DrawComponent = ({ revealOrder }) => {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  const total = revealOrder.length;
  const done = index >= total;
  const current = done ? null : revealOrder[index];

  useEffect(() => {
    if (done || !playing) return undefined;
    const timer = setTimeout(() => setIndex(value => value + 1), STEP_MS / speed);
    return () => clearTimeout(timer);
  }, [index, playing, speed, done]);

  const revealAll = useCallback(() => {
    setPlaying(false);
    setIndex(total);
  }, [total]);

  const restart = useCallback(() => {
    setIndex(0);
    setPlaying(true);
  }, []);

  return (
    <div>
      {/* Barre de contrôle et progression */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="tabular-nums text-sm text-white/70">
            Boule <span className="font-bold text-uefa-gold">{Math.min(index + (done ? 0 : 1), total)}</span> / {total}
          </span>
          {!done && (
            <button
              type="button"
              onClick={() => setPlaying(value => !value)}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 transition hover:border-uefa-gold/60 hover:text-white"
            >
              {playing ? '❚❚ Pause' : '▶ Reprendre'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!done && SPEEDS.map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setSpeed(value)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                speed === value
                  ? 'bg-uefa-gold font-semibold text-uefa-blue'
                  : 'border border-white/20 text-white/60 hover:border-uefa-gold/60'
              }`}
            >
              ×{value}
            </button>
          ))}
          <button
            type="button"
            onClick={done ? restart : revealAll}
            className="rounded-full border border-uefa-gold/60 px-4 py-1 text-xs text-uefa-gold transition hover:bg-uefa-gold hover:text-uefa-blue"
          >
            {done ? '↻ Rejouer' : 'Tout révéler'}
          </button>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-uefa-gold"
          animate={{ width: `${(index / total) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Boule en cours */}
      <div className="mt-8 min-h-[22rem]">
        <AnimatePresence mode="wait">
          {current ? (
            <BallStage key={current.order} step={current} speed={speed} />
          ) : (
            <motion.div
              key="fini"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-full flex-col items-center justify-center rounded-2xl border border-uefa-gold/30 bg-uefa-gold/5 p-12"
            >
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                className="text-5xl"
              >
                🏆
              </motion.span>
              <h3 className="mt-4 text-2xl font-bold text-uefa-gold">Tirage terminé</h3>
              <p className="mt-1 text-sm text-white/60">
                Les 36 équipes ont leurs 8 adversaires — 144 matchs à disputer.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Équipes déjà tirées */}
      {index > 0 && (
        <section className="mt-10">
          <h3 className="mb-4 text-left text-xs font-semibold uppercase tracking-widest text-white/40">
            Déjà tirées ({index})
          </h3>
          <motion.div layout className="flex flex-wrap gap-2">
            <AnimatePresence initial={false}>
              {revealOrder.slice(0, index).map(step => (
                <motion.div
                  key={step.order}
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 ring-1 ${potStyle(step.pot).ring}`}
                  title={`${step.team.name} — ${potStyle(step.pot).label}`}
                >
                  <TeamCrest team={step.team} size="sm" />
                  <span className="text-xs text-white/80">{step.team.shortName}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>
      )}
    </div>
  );
};

/**
 * La boule qui s'ouvre, puis les 8 adversaires qui apparaissent l'un après
 * l'autre. Toutes les temporisations sont divisées par la vitesse de lecture :
 * sans cela, en ×4 la boule suivante sortirait avant que les adversaires de la
 * précédente aient eu le temps d'apparaître.
 */
const BallStage = ({ step, speed = 1 }) => {
  const style = potStyle(step.pot);
  const t = value => value / speed;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24, scale: 0.97 }}
      transition={{ duration: t(0.35) }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] shadow-2xl"
    >
      <header className="flex flex-col items-center gap-4 border-b border-white/10 px-6 py-8 sm:flex-row sm:gap-6 sm:px-10">
        {/* La boule : elle grossit, tourne, puis laisse place à l'écusson. */}
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <motion.span
            initial={{ scale: 1, opacity: 1, rotate: 0 }}
            animate={{ scale: 1.6, opacity: 0, rotate: 180 }}
            transition={{ duration: t(0.55), ease: 'easeOut' }}
            className={`absolute inset-0 rounded-full ${style.dot} shadow-2xl`}
          />
          <motion.div
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: t(0.35), type: 'spring', stiffness: 220, damping: 16 }}
          >
            <TeamCrest team={step.team} size="xl" />
          </motion.div>
        </div>

        <div className="text-center sm:text-left">
          <motion.span
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: t(0.45) }}
            className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${style.chip}`}
          >
            {style.label}
          </motion.span>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: t(0.5) }}
            className="mt-2 text-2xl font-bold text-white sm:text-3xl"
          >
            {step.team.name}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: t(0.6) }}
            className="mt-1 text-sm text-white/50"
          >
            {step.team.country} · tête de série n°{step.team.seeding}
          </motion.p>
        </div>
      </header>

      <motion.ul
        className="grid gap-x-8 gap-y-1 px-6 py-6 sm:grid-cols-2 sm:px-10"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { delayChildren: t(0.6), staggerChildren: t(0.08) } },
        }}
      >
        {step.fixtures.map(fixture => (
          <motion.li
            key={fixture.id}
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
            }}
            className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
              fixture.alreadyKnown ? 'opacity-45' : 'bg-white/[0.03]'
            }`}
          >
            <span className={`w-2 shrink-0 rounded-full ${potStyle(fixture.pot).dot} h-2`} title={potStyle(fixture.pot).label} />
            <TeamCrest team={fixture} size="sm" />
            <span className="flex-1 truncate text-left text-sm">{fixture.name}</span>
            <VenueTag venue={fixture.venue} />
          </motion.li>
        ))}
      </motion.ul>
    </motion.article>
  );
};

/** Pastille « domicile » ou « extérieur ». */
export const VenueTag = ({ venue, className = '' }) => (
  <span
    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
      venue === 'H' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'
    } ${className}`}
    title={venue === 'H' ? 'Reçoit' : 'Se déplace'}
  >
    {venue === 'H' ? 'Dom.' : 'Ext.'}
  </span>
);

export default DrawComponent;
