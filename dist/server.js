"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 }, () => {
    console.log("Socket listening on port 8080");
});
function handleOffer(data, ws) {
    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: "offer",
                sdp: data.sdp
            }));
        }
    });
}
function handleAnswer(data, ws) {
    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: "answer",
                sdp: data.sdp
            }));
        }
    });
}
function handleCandidate(data, ws) {
    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: "candidate",
                candidate: data.candidate,
            }));
        }
    });
}
wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        const data = JSON.parse(message);
        if (data.type === "offer") {
            handleOffer(data, ws);
            return;
        }
        if (data.type === "answer") {
            handleAnswer(data, ws);
            return;
        }
        if (data.type === "candidate") {
            handleCandidate(data, ws);
            return;
        }
        return;
    });
});
