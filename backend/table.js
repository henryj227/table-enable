const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Table Detection API',
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/detect-tables', (req, res) => {
  const { roomId } = req.body;
  
  // Placeholder for table detection logic
  res.json({
    success: true,
    message: 'Table availability successfully checked',
    room_id: 'lib_1',
    tables: [
      {id: '1', occupied: false, conf: 0.43},
      {id: '2', occupied: true, conf: 0.87}
    ],
    updated_at: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see the API`);
});

module.exports = app;

