import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Simple Orders API is running',
    timestamp: new Date().toISOString()
  });
});

// DB health check
app.get('/health', async (req: Request, res: Response) => {
  const dbConnected = await testConnection();
  res.json({
    status: dbConnected ? 'healthy' : 'unhealthy',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', routes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();