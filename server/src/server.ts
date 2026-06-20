import { WebSocketServer, WebSocket } from 'ws';
import { GameRoom } from './room/GameRoom';

const wss = new WebSocketServer({ port: 3000 });
const room = new GameRoom();

console.log('🌸 Serveur PastelPuff.io en ligne sur le port 3000 !');

wss.on('connection', (ws: WebSocket) => {
    const playerId = `player_${Math.random().toString(36).substr(2, 9)}`;

    ws.on('message', (message: string) => {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'JOIN':
                    room.join(playerId, ws, data.pseudo || 'Anonyme');
                    break;
                case 'PLAYER_UPDATE':
                    // CORRECTIF : On appelle bien la fonction existante dans GameRoom
                    room.updatePlayerInput(playerId, data);
                    break;
                case 'DEPLOY_CLOUD':
                    room.addCloud(playerId, data.x, data.y, data.radius);
                    break;
            }
        } catch (error) {
            console.error('⚠️ Erreur paquet:', error);
        }
    });

    ws.on('close', () => { room.leave(playerId); });
});

setInterval(() => { room.broadcastState(); }, 45);