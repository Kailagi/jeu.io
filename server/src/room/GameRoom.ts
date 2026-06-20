import { WebSocket } from 'ws';

interface NetworkPlayer {
    id: string;
    pseudo: string;
    x: number;
    y: number;
    radius: number;
    score: number;
    color: string;
    speedX: number;
    speedY: number;
}

interface ServerCloud {
    id: string;
    ownerId: string;
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    opacity: number;
}

export class GameRoom {
    private players: Map<string, NetworkPlayer> = new Map();
    private connections: Map<string, WebSocket> = new Map();
    private clouds: ServerCloud[] = [];

    constructor() {
        console.log('⚔️ Moteur physique centralisé activé sur le serveur.');
        this.startServerPhysicsLoop();
    }

    public join(id: string, ws: WebSocket, pseudo: string): void {
        this.connections.set(id, ws);
        const colors = ['#F3B3B3', '#CBB4FF', '#97E2C2', '#E29797'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newPlayer: NetworkPlayer = {
            id, pseudo, x: 400, y: 400, radius: 25, score: 0, color: randomColor, speedX: 0, speedY: 0
        };

        this.players.set(id, newPlayer);
        ws.send(JSON.stringify({ type: 'WELCOME', id, color: randomColor }));
    }

    public leave(id: string): void {
        this.players.delete(id);
        this.connections.delete(id);
        this.clouds = this.clouds.filter(c => c.ownerId !== id);
        this.broadcast({ type: 'PLAYER_LEFT', id });
    }

    // Le client envoie ses INPUTS (la vitesse voulue par sa souris) au lieu d'imposer sa position !
    public updatePlayerInput(id: string, data: any): void {
        const player = this.players.get(id);
        if (player) {
            player.speedX = data.speedX;
            player.speedY = data.speedY;
            player.score = data.score; // On garde la synchro du score des perles locales
        }
    }

    public addCloud(ownerId: string, x: number, y: number, radius: number): void {
        this.clouds.push({
            id: `cloud_${Math.random().toString(36).substr(2, 9)}`,
            ownerId, x, y, radius, maxRadius: radius + 150, opacity: 0.6
        });
    }

    /**
     * 🛰️ BOUCLE PHYSIQUE DU SERVEUR (60 FPS)
     * C'est le serveur qui gère les collisions et les nuages pour TOUT LE MONDE d'un coup !
     */
    private startServerPhysicsLoop(): void {
        setInterval(() => {
            const playerArray = Array.from(this.players.values());

            // 1. Mise à jour des positions de base des joueurs
            playerArray.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                p.radius = 25 + Math.floor(p.score / 10);
            });

            // 2. Gestion des Nuages de Poudre (Dégâts & Ralentissements)
            for (let i = this.clouds.length - 1; i >= 0; i--) {
                const c = this.clouds[i];
                c.radius += (c.maxRadius - c.radius) * 0.05;
                c.opacity -= 0.008;

                // Est-ce qu'un joueur touche ce nuage ?
                playerArray.forEach(p => {
                    if (p.id !== c.ownerId) {
                        const dist = Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2);
                        if (dist < c.radius) {
                            // LE SERVEUR ENLÈVE LES POINTS DIRECTEMENT !
                            p.score = Math.max(0, p.score - 1); // -1 point par frame dans le nuage
                        }
                    }
                });

                if (c.opacity <= 0) this.clouds.splice(i, 1);
            }

            // 3. Gestion des Entre-chocs entre Joueurs (Bousculade)
            for (let i = 0; i < playerArray.length; i++) {
                for (let j = i + 1; j < playerArray.length; j++) {
                    const p1 = playerArray[i];
                    const p2 = playerArray[j];

                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = p1.radius + p2.radius;

                    if (dist < minDist) {
                        const angle = Math.atan2(dy, dx);
                        const forceRepulsion = 8; // Doux et gérable comme tu préférais !

                        // Le serveur repousse les deux joueurs de force
                        p1.x -= Math.cos(angle) * (minDist - dist + forceRepulsion);
                        p1.y -= Math.sin(angle) * (minDist - dist + forceRepulsion);
                        p2.x += Math.cos(angle) * (minDist - dist + forceRepulsion);
                        p2.y += Math.sin(angle) * (minDist - dist + forceRepulsion);
                    }
                }
            }
        }, 1000 / 60);
    }

    public broadcastState(): void {
        const statePayload = JSON.stringify({
            type: 'GAME_STATE',
            players: Array.from(this.players.values()),
            clouds: this.clouds
        });
        this.broadcast(statePayload);
    }

    private broadcast(message: string | object): void {
        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        this.connections.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        });
    }
}