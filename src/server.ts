import { WebSocket, WebSocketServer, RawData } from "ws";

// Define an interface for the structure of a peer object.
interface Peer {
    id: number;
    ws: WebSocket;
}

// Define an interface for the structure of our signaling messages.
interface SignalingMessage {
    type: 'ready' | 'offer' | 'answer' | 'candidate' | 'initiate-call' | 'error';
    sdp?: string;
    candidate?: any; // This can be made more specific (e.g., RTCIceCandidateInit) if needed.
    message?: string;
}

const wss = new WebSocketServer({ port: 8080 }, () => {
    console.log("Signaling server listening on port 8080");
});

// A typed array to hold the two connected peers.
let peers: Peer[] = [];

/**
 * Broadcasts a message to all connected clients except the sender.
 * @param {string} message - The message to send.
 * @param {WebSocket} sender - The WebSocket instance of the sender.
 */
function broadcast(message: string, sender: WebSocket) {
    peers.forEach(peer => {
        // Check if the peer is not the sender and the connection is open.
        if (peer.ws !== sender && peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(message);
        }
    });
}

// This event fires when a new client connects to the server.
wss.on("connection", (ws: WebSocket) => {
    // Simple check to only allow two peers for this demo.
    if (peers.length >= 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        ws.close();
        return;
    }

    const peerId = peers.length + 1;
    console.log(`Peer ${peerId} connected.`);
    peers.push({ id: peerId, ws: ws });

    // This event fires when the server receives a message from a client.
    ws.on("message", (rawMessage: RawData) => {
        const messageString = rawMessage.toString();
        const data: SignalingMessage = JSON.parse(messageString);

        // When a client is ready (camera started), they notify the server.
        if (data.type === 'ready' && peers.length > 1) {
            // Find the other peer in the room.
            const otherPeer = peers.find(p => p.ws !== ws);
            if (otherPeer) {
                // Instruct the newly ready client to start the call.
                console.log(`Peer ${peerId} is ready. Instructing to initiate call.`);
                ws.send(JSON.stringify({ type: 'initiate-call' }));
            }
        } else {
            // For 'offer', 'answer', and 'candidate' messages,
            // simply forward the original message to the other peer.
            console.log(`Broadcasting message of type: ${data.type}`);
            broadcast(messageString, ws);
        }
    });

    // This event fires when a client disconnects.
    ws.on('close', () => {
        console.log(`Peer ${peerId} disconnected.`);
        // Remove the disconnected peer from the array.
        peers = peers.filter(p => p.ws !== ws);
    });

    // Handle any errors that occur on the connection.
    ws.on('error', (error: Error) => {
        console.error(`Error for Peer ${peerId}:`, error);
    });
});
