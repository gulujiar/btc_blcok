import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy for Binance API
  app.get('/api/klines', async (req, res) => {
    const { symbol, interval, limit } = req.query;
    const endpoints = [
      `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      `https://api2.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      `https://api3.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    ];

    for (const url of endpoints) {
      try {
        console.log(`Attempting to fetch from: ${url}`);
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Success fetching from: ${url}`);
          return res.json(data);
        } else {
          const errorBody = await response.text();
          console.warn(`Failed endpoint ${url}: ${response.status} - ${errorBody}`);
        }
      } catch (error: any) {
        console.error(`Error on endpoint ${url}:`, error.message);
      }
    }

    res.status(502).json({ 
      error: 'All Binance API endpoints unavailable or blocked.',
      tip: 'This is often due to IP-based geographical restrictions on Binance global from US cloud servers. Using BTCUSD on api.binance.us may be more stable.'
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
