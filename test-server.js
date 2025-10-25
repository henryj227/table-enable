// Simple HTTP server to serve room API endpoint
// Run with: node test-server.js

const http = require('http');
const url = require('url');

const roomData = {
  room_id: "test-room",
  name: "Test Room",
  size: { w: 800, h: 500 },
  tables: [
    {
      id: "table-1",
      polygon: [
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 200]
      ]
    },
    {
      id: "table-2", 
      polygon: [
        [500, 150],
        [600, 150],
        [600, 250],
        [500, 250]
      ]
    }
  ],
  seats: [
    {
      id: "t1",
      polygon: [
        [80, 80],
        [90, 80],
        [90, 90],
        [80, 90]
      ]
    },
    {
      id: "t2",
      polygon: [
        [210, 80],
        [220, 80],
        [220, 90],
        [210, 90]
      ]
    },
    {
      id: "t3",
      polygon: [
        [80, 210],
        [90, 210],
        [90, 220],
        [80, 220]
      ]
    },
    {
      id: "t4",
      polygon: [
        [210, 210],
        [220, 210],
        [220, 220],
        [210, 220]
      ]
    },
    {
      id: "t5",
      polygon: [
        [480, 130],
        [490, 130],
        [490, 140],
        [480, 140]
      ]
    },
    {
      id: "t6",
      polygon: [
        [610, 130],
        [620, 130],
        [620, 140],
        [610, 140]
      ]
    },
    {
      id: "t7",
      polygon: [
        [480, 260],
        [490, 260],
        [490, 270],
        [480, 270]
      ]
    },
    {
      id: "t8",
      polygon: [
        [610, 260],
        [620, 260],
        [620, 270],
        [610, 270]
      ]
    }
  ]
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (parsedUrl.pathname === '/api/room') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(roomData));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Test HTTP server running on http://localhost:${PORT}`);
  console.log(`Room API available at http://localhost:${PORT}/api/room`);
});
