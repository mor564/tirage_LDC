const express = require('express');
const cors = require('cors');
require('dotenv').config();

const teamRoutes = require('./routes/teamRoutes');
const drawRoutes = require('./routes/drawRoutes');
const { getRepository } = require('./repository');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  const repository = await getRepository();
  res.json({ status: 'ok', storage: repository.name });
});

app.use('/api/teams', teamRoutes);
app.use('/api/draw', drawRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route inconnue' }));

// eslint-disable-next-line no-unused-vars -- Express identifie les gestionnaires d'erreur à leur arité
app.use((error, req, res, next) => {
  console.error('Erreur non interceptée :', error);
  res.status(500).json({ error: 'Erreur serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
