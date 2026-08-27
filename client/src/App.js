import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPots, fetchLatestDraw, runDraw } from './api';
import TeamList from './components/TeamList';
import DrawComponent from './components/DrawComponent';
import FixtureTable from './components/FixtureTable';
import Calendar from './components/Calendar';
import './App.css';

const VIEWS = [
  { key: 'reveal', label: 'Déroulé du tirage' },
  { key: 'fixtures', label: 'Affiches par équipe' },
  { key: 'calendar', label: 'Calendrier' },
];

const STATS = [
  { value: '36', label: 'équipes' },
  { value: '8', label: 'adversaires chacune' },
  { value: '144', label: 'matchs' },
  { value: '8', label: 'journées' },
];

function App() {
  const [pots, setPots] = useState([]);
  const [draw, setDraw] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('reveal');

  useEffect(() => {
    fetchPots()
      .then(setPots)
      .catch(() => setError('Impossible de charger les équipes. Le serveur est-il démarré ?'));

    // Un tirage déjà effectué est réaffiché au chargement ; l'absence de tirage
    // renvoie un 404, qui n'est pas une erreur.
    fetchLatestDraw().then(setDraw).catch(() => {});
  }, []);

  const performDraw = useCallback(async () => {
    setIsDrawing(true);
    setError(null);
    try {
      const result = await runDraw();
      setDraw(result);
      setView('reveal');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Le tirage a échoué.');
    } finally {
      setIsDrawing(false);
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-uefa-blue text-center text-white">
      <AuroraBackground />

      <div className="relative z-10">
        <header className="border-b border-white/10 px-6 py-12">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-[11px] font-semibold uppercase tracking-[0.35em] text-uefa-gold/70"
          >
            Saison 2026/27
          </motion.p>

          <motion.h1
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-3 bg-gradient-to-b from-white to-uefa-gold bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-6xl"
          >
            UEFA Champions League
          </motion.h1>

          <motion.p
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-2 text-lg text-white/70 sm:text-xl"
          >
            Tirage au sort de la phase de ligue
          </motion.p>

          <motion.dl
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { delayChildren: 0.35, staggerChildren: 0.08 } } }}
            className="mx-auto mt-8 flex max-w-xl flex-wrap items-start justify-center gap-x-8 gap-y-4"
          >
            {STATS.map(stat => (
              <motion.div
                key={stat.label}
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <dt className="text-2xl font-bold tabular-nums text-uefa-gold">{stat.value}</dt>
                <dd className="text-[11px] uppercase tracking-wider text-white/40">{stat.label}</dd>
              </motion.div>
            ))}
          </motion.dl>
        </header>

        <main className="container mx-auto px-4 py-10">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-auto mb-6 max-w-2xl rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-10 flex flex-col items-center gap-3">
            <motion.button
              whileHover={{ scale: isDrawing ? 1 : 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={performDraw}
              disabled={isDrawing}
              className="group relative overflow-hidden rounded-full bg-uefa-gold px-10 py-4 text-lg font-bold text-uefa-blue shadow-lg shadow-uefa-gold/20 transition disabled:opacity-60 sm:text-xl"
            >
              {/* Reflet qui balaie le bouton au survol */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">
                {isDrawing ? 'Tirage en cours…' : draw ? 'Relancer le tirage' : 'Effectuer le tirage'}
              </span>
            </motion.button>

            {draw && (
              <p className="text-[11px] text-white/35">
                Tirage n°{draw.id} · graine {draw.seed}
                {draw.storage === 'memory' && ' · stockage en mémoire'}
              </p>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!draw ? (
              <motion.div
                key="pots"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.4 }}
              >
                <TeamList pots={pots} />
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-2xl backdrop-blur-sm sm:p-8"
              >
                <nav className="mb-8 flex flex-wrap justify-center gap-2">
                  {VIEWS.map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setView(item.key)}
                      className={`relative rounded-full px-5 py-2 text-sm transition ${
                        view === item.key ? 'text-uefa-blue' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {view === item.key && (
                        <motion.span
                          layoutId="onglet-actif"
                          className="absolute inset-0 rounded-full bg-uefa-gold"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative font-semibold">{item.label}</span>
                    </button>
                  ))}
                </nav>

                {view === 'reveal' && <DrawComponent key={draw.id} revealOrder={draw.revealOrder} />}
                {view === 'fixtures' && <FixtureTable fixtureTable={draw.fixtureTable} />}
                {view === 'calendar' && <Calendar matchdays={draw.matchdays} />}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="border-t border-white/10 px-6 py-6 text-[11px] text-white/30">
          Écussons fournis par TheSportsDB · Simulateur non officiel
        </footer>
      </div>

      {/* Voile pendant le calcul du tirage */}
      <AnimatePresence>
        {isDrawing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-uefa-blue/85 backdrop-blur-sm"
          >
            <div className="relative h-24 w-24">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-4 border-white/10 border-t-uefa-gold"
              />
              <motion.span
                animate={{ rotate: -360 }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-3 rounded-full border-2 border-white/5 border-b-uefa-gold/60"
              />
            </div>
            <p className="text-sm text-white/60">Recherche d'une configuration valide…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Halos colorés en mouvement lent, purement décoratifs. */
const AuroraBackground = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-uefa-blue via-blue-950 to-black" />
    {[
      { className: 'left-[-10%] top-[-10%] h-[32rem] w-[32rem] bg-uefa-gold/20', duration: 18 },
      { className: 'right-[-15%] top-[20%] h-[28rem] w-[28rem] bg-sky-500/20', duration: 24 },
      { className: 'bottom-[-15%] left-[25%] h-[30rem] w-[30rem] bg-violet-600/20', duration: 21 },
    ].map((orb, index) => (
      <motion.div
        key={index}
        className={`absolute rounded-full blur-[110px] ${orb.className}`}
        animate={{ x: [0, 60, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: orb.duration, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}
  </div>
);

export default App;
