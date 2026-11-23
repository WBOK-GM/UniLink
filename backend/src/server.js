require('dotenv').config();
const app = require('./app');
const { initDatabase } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Servidor UniLink Backend activo en puerto: ${PORT}`);
    console.log(`📡 URL API: http://localhost:${PORT}/api/v1`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`====================================================`);
  });
}

startServer();
