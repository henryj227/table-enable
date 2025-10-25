// Simple WebSocket test server to simulate backend messages
// Run with: node test-websocket.js

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8001 });

console.log('Test WebSocket server running on ws://localhost:8001');

wss.on('connection', function connection(ws) {
  console.log('Client connected');
  
  // Send initial data
  const initialData = {
    people_count: 12,
    fps: 30,
    tables: [
      { id: "table-1", status: "occupied", confidence: 0.92 },
      { id: "table-2", status: "empty", confidence: 0.85 }
    ],
    seats: [
      { id: "t1", status: "occupied", confidence: 0.78 },
      { id: "t2", status: "empty", confidence: 0.95 },
      { id: "t3", status: "unknown", confidence: 0.45 },
      { id: "t4", status: "occupied", confidence: 0.88 },
      { id: "t5", status: "empty", confidence: 0.92 },
      { id: "t6", status: "occupied", confidence: 0.76 },
      { id: "t7", status: "empty", confidence: 0.89 },
      { id: "t8", status: "unknown", confidence: 0.33 }
    ]
  };
  
  ws.send(JSON.stringify(initialData));
  
  // Send updates every 3 seconds
  const interval = setInterval(() => {
    const updateData = {
      people_count: Math.floor(Math.random() * 20) + 5,
      fps: 30,
      tables: [
        { 
          id: "table-1", 
          status: Math.random() > 0.5 ? "occupied" : "empty", 
          confidence: Math.random() * 0.4 + 0.6 
        },
        { 
          id: "table-2", 
          status: Math.random() > 0.3 ? "occupied" : "empty", 
          confidence: Math.random() * 0.3 + 0.7 
        }
      ],
      seats: Array.from({ length: 8 }, (_, i) => ({
        id: `t${i + 1}`,
        status: ['occupied', 'empty', 'unknown'][Math.floor(Math.random() * 3)],
        confidence: Math.random() * 0.5 + 0.5
      }))
    };
    
    ws.send(JSON.stringify(updateData));
  }, 3000);
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearInterval(interval);
  });
});
