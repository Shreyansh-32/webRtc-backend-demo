import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";

/**
 * Server <-> client message shapes
 * (client uses a stricter SignalMessage type; server sends a few extra control messages)
 */
type SignalMessage =
  | { type: "offer"; sdp: string; from?: string }
  | { type: "answer"; sdp: string; from?: string }
  | { type: "candidate"; candidate: RTCIceCandidateInit; from?: string };

type ControlMessage =
  | { type: "id"; id: string; from: string }
  | { type: "peers"; from: string; peers: string[] }
  | { type: "peer-joined"; from: string }
  | { type: "peer-left"; from: string }
  | { type: "joined-room"; from: string; room: string };

type Incoming = SignalMessage | { type: "join"; room: string } | any;
type Outgoing = SignalMessage | ControlMessage;

const PORT = 8080;
const DEFAULT_ROOM = "main";

const wss = new WebSocketServer({ port: PORT });
console.log(`Signaling server starting on ws://localhost:${PORT}`);

type ClientInfo = { id: string; ws: WebSocket; room: string };
const clients = new Map<string, ClientInfo>(); // keyed by id

// helper: broadcast to all clients in a room, excluding optional excludeId
function broadcastToRoom(room: string, payload: Outgoing, excludeId?: string) {
  const raw = JSON.stringify(payload);
  for (const [id, c] of clients) {
    if (id === excludeId) continue;
    if (c.room !== room) continue;
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(raw);
    }
  }
}

wss.on("connection", (ws: WebSocket) => {
  // create stable id and put client in default room
  const id = randomUUID();
  const client: ClientInfo = { id, ws, room: DEFAULT_ROOM };
  clients.set(id, client);

  // Send back the assigned id to the connecting client
  ws.send(JSON.stringify({ type: "id", id, from: id } as ControlMessage));

  // Send list of current peers (if any) in the room to the newly connected client
  const peers = Array.from(clients.values())
    .filter((c) => c.id !== id && c.room === client.room)
    .map((c) => c.id);

  if (peers.length) {
    ws.send(JSON.stringify({ type: "peers", from: id, peers } as ControlMessage));
  }

  // Notify other peers in the same room that a new peer joined
  broadcastToRoom(client.room, { type: "peer-joined", from: id } as ControlMessage, id);

  ws.on("message", (messageRaw: WebSocket.RawData) => {
    let message: Incoming;
    try {
      message = JSON.parse(messageRaw.toString());
    } catch (err) {
      console.error("Invalid JSON from client", err);
      return;
    }

    // If client asks to join a different room:
    if (message?.type === "join" && typeof message.room === "string") {
      const oldRoom = client.room;
      const newRoom = message.room;
      client.room = newRoom;

      // notify peers in old room that we left
      broadcastToRoom(oldRoom, { type: "peer-left", from: id } as ControlMessage, id);

      // notify peers in new room that we joined
      broadcastToRoom(newRoom, { type: "peer-joined", from: id } as ControlMessage, id);

      // send the list of peers in the new room to this client
      const peersInNewRoom = Array.from(clients.values())
        .filter((c) => c.id !== id && c.room === newRoom)
        .map((c) => c.id);

      ws.send(JSON.stringify({ type: "peers", from: id, peers: peersInNewRoom } as ControlMessage));
      return;
    }

    // For signaling messages: offer / answer / candidate
    if (message && (message.type === "offer" || message.type === "answer" || message.type === "candidate")) {
      // Ensure the `from` field exists and is the correct id
      (message as any).from = id;

      // Relay only to other clients in the same room
      broadcastToRoom(client.room, message as SignalMessage, id);
      return;
    }

    // Unknown message types: log and ignore
    console.warn("Unknown message type from client:", message);
  });

  ws.on("close", () => {
    // capture room before deleting
    const room = client.room;
    clients.delete(id);
    // notify remaining peers in the room
    broadcastToRoom(room, { type: "peer-left", from: id } as ControlMessage, id);
    console.log(`Client ${id} disconnected (room=${room})`);
  });

  ws.on("error", (err) => {
    console.error(`WS error (client ${id}):`, err);
  });
});
