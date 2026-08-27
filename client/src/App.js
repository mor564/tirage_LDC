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
    <div className="min-h-screen bg-gradient-to-b from-uefa-blue to-blue-950 text-center text-white">
      <header className="bg-uefa-blue/80 px-6 py-8 shadow-lg backdrop-blur">
        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-uefa-gold sm:text-5xl"
        >
          UEFA Champions League
        </motion.h1>
        <motion.p
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-2 text-lg text-white/80 sm:text-2xl"
        >
          Tirage au sort de la phase de ligue · 2026/27
        </motion.p>
        <p className="mt-3 text-xs text-white/50">
          36 équipes · 8 adversaires chacune · 144 matchs sur 8 journées
        </p>
      </header>

      <main className="container mx-auto px-4 py-10">
        {error && (
          <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-10 flex flex-wrap items-center justify-center gap-4">
          <motion.button
            whileHover={{ scale: isDrawing ? 1 : 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={performDraw}
            disabled={isDrawing}
            className="rounded-full bg-uefa-gold px-8 py-3.5 text-xl font-bold text-uefa-blue shadow-lg transition hover:bg-yellow-400 disabled:opacity-50"
          >
            {isDrawing ? 'Tirage en cours…' : draw ? 'Relancer le tirage' : 'Effectuer le tirage'}
          </motion.button>
          {draw && (
            <p className="text-xs text-white/50">
              Tirage n°{draw.id} · graine {draw.seed}
              {draw.storage === 'memory' && ' · stockage en mémoire'}
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!draw ? (
            <motion.div
              key="pots"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
            >
              <TeamList pots={pots} />
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl bg-white/5 p-6 shadow-xl"
            >
              <nav className="mb-8 flex flex-wrap justify-center gap-2">
                {VIEWS.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setView(item.key)}
                    className={`rounded-full px-5 py-2 text-sm transition ${
                      view === item.key
                        ? 'bg-uefa-gold font-semibold text-uefa-blue'
                        : 'border border-white/20 text-white/70 hover:border-uefa-gold/60'
                    }`}
                  >
                    {item.label}
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

      <AnimatePresence>
        {isDrawing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/60"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="h-16 w-16 rounded-full border-4 border-white/10 border-t-uefa-gold"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
