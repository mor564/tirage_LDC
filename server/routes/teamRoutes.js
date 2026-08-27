const express = require('express');
const router = express.Router();
const { getAllTeams, getTeamById, getTeamsByPot } = require('../services/teamService');

router.get('/', async (req, res) => {
  try {
    res.json(await getAllTeams());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pots', async (req, res) => {
  try {
    res.json(await getTeamsByPot());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const team = await getTeamById(Number(req.params.id));
    if (!team) return res.status(404).json({ message: 'Equipe non trouvee' });
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
