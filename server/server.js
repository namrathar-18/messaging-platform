require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/utils/db');
const initSocket = require('./src/socket');
const { seedBot } = require('./src/utils/seedBot');

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // Seed bot user after DB is connected
  await seedBot();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
