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
const Groq = require('groq-sdk');

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

// ═══════════════════════════════════════════════════════════════════════════════
// Groq API Keepalive — ping mỗi 12 giờ để tránh bị Revoked do không sử dụng
// ═══════════════════════════════════════════════════════════════════════════════
const KEEPALIVE_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 giờ

async function groqKeepalive() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log('⏭️  GROQ_API_KEY not set — skipping keepalive ping');
    return;
  }
  try {
    const groq = new Groq({ apiKey });
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 5,
    });
    console.log(`✅ Groq keepalive OK at ${new Date().toISOString()} — reply: "${response.choices[0].message.content.trim()}"`);
  } catch (err) {
    console.error(`❌ Groq keepalive FAILED at ${new Date().toISOString()}:`, err.message);
  }
}

app.listen(port, () => {
  console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Backend API available at http://localhost:${port}/api`);
  console.log(`Swagger Docs available at http://localhost:${port}/api-docs`);

  // Chạy keepalive lần đầu sau 30 giây (đợi server khởi động xong)
  setTimeout(() => {
    groqKeepalive();
    // Sau đó lặp lại mỗi 12 giờ
    setInterval(groqKeepalive, KEEPALIVE_INTERVAL_MS);
    console.log('🔄 Groq keepalive scheduled: every 12 hours');
  }, 30_000);
});
