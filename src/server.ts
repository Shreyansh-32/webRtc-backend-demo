import {WebSocket, WebSocketServer} from "ws";

const wss = new WebSocketServer({port : 8080} , () => {
    console.log("Socket listening on port 8080");
});

function handleOffer(data : {type : string , sdp : string} , ws : WebSocket){
    wss.clients.forEach((client) => {
        if(client !== ws && client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify({
                type : "offer",
                sdp : data.sdp
            }));
        }
    })
}

function handleAnswer(data : {type : string , sdp : string} , ws : WebSocket){
    wss.clients.forEach((client) => {
        if(client !== ws && client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify({
                type : "answer",
                sdp : data.sdp
            }));
        }
    })
}

function handleCandidate(data : {type : string , candidate : string} , ws : WebSocket){
    wss.clients.forEach((client) => {
        if(client !== ws && client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify({
                type : "candidate",
                candidate : data.candidate,
            }));
        }
    })
}

wss.on("connection" , (ws) => {
    
   ws.on("message" , (message : string) => {
    const data = JSON.parse(message);

    if(data.type === "offer"){
        handleOffer(data , ws);
        return;
    }
    if(data.type === "answer"){
        handleAnswer(data,ws);
        return;
    }
    if(data.type === "candidate"){
        handleCandidate(data,ws);
        return;
    }

    return;
   })
})