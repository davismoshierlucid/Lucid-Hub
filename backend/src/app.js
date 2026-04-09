import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import companiesRoutes from './routes/companies.js';
import contactsRoutes from './routes/contacts.js';
import searchRoutes from './routes/search.js';
import adminRoutes from './routes/admin.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', meRoutes);
app.use('/api', companiesRoutes);
app.use('/api', contactsRoutes);
app.use('/api', searchRoutes);
app.use('/api', adminRoutes);

app.use('/api', notFoundHandler);
app.use(errorHandler);

export default app;
