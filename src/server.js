const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const jobRoutes = require('./routes/jobRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const chatRoutes = require('./routes/chatRoutes');
const errorHandler = require('./middlewares/errorHandler');
const db = require('./config/db');

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'JMIP API Documentation'
}));

// Health Check Endpoint (before routers so it's always reachable)
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      status: 'ok',
      timestamp: result.rows[0].now,
      env: {
        DB_HOST: process.env.DB_HOST ? '✅ set' : '❌ missing',
        DB_NAME: process.env.DB_NAME ? '✅ set' : '❌ missing',
        DB_USER: process.env.DB_USER ? '✅ set' : '❌ missing',
        DB_PASSWORD: process.env.DB_PASSWORD ? '✅ set' : '❌ missing',
        NODE_ENV: process.env.NODE_ENV || 'not set'
      }
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed: ' + err.message,
      env: {
        DB_HOST: process.env.DB_HOST ? '✅ set' : '❌ missing',
        DB_NAME: process.env.DB_NAME ? '✅ set' : '❌ missing',
        DB_USER: process.env.DB_USER ? '✅ set' : '❌ missing',
        DB_PASSWORD: process.env.DB_PASSWORD ? '✅ set' : '❌ missing',
        NODE_ENV: process.env.NODE_ENV || 'not set'
      }
    });
  }
});

// Routes
app.use('/api', jobRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);

// Error Handling
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Backend API available at http://localhost:${port}/api`);
  console.log(`Swagger Docs available at http://localhost:${port}/api-docs`);
});
