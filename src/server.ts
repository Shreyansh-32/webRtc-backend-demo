import { WebSocket, WebSocketServer } from 'ws';

// Create a new WebSocket server instance.
// It will listen on port 8080 by default.
const wss = new WebSocketServer({ port: 8080 });

// A Set to store all connected WebSocket clients.
// Using a Set ensures that each client is unique.
const clients = new Set<WebSocket>();

console.log('Signaling server started on ws://localhost:8080');

// Event listener for new connections.
wss.on('connection', (ws: WebSocket) => {
  // Add the new client to our set of clients.
  clients.add(ws);
  console.log('Client connected. Total clients:', clients.size);

  // Event listener for messages from this specific client.
  ws.on('message', (message: string) => {
    console.log('Received message => %s', message);
    
    // When a message is received, broadcast it to all other clients.
    // This is the core of the signaling logic: forwarding messages
    // between the two peers.
    for (const client of clients) {
      // Check if the client is not the sender and is ready to receive messages.
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    }
  });

  // Event listener for when a client closes the connection.
  ws.on('close', () => {
    // Remove the client from the set.
    clients.delete(ws);
    console.log('Client disconnected. Total clients:', clients.size);
  });

  // Event listener for any errors that occur with this client's connection.
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    // It's also a good practice to remove the client on error.
    clients.delete(ws);
  });
});

// Event listener for server-wide errors.
wss.on('error', (error) => {
    console.error('WebSocket Server error:', error);
});
