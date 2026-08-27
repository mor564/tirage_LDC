import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./api', () => ({
  fetchPots: () => Promise.resolve([]),
  fetchLatestDraw: () => Promise.reject(new Error('aucun tirage')),
  runDraw: () => Promise.resolve(null),
}));

test('affiche le titre et le bouton de tirage', async () => {
  render(<App />);
  expect(screen.getByText(/UEFA Champions League/i)).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /effectuer le tirage/i })).toBeInTheDocument();
});
