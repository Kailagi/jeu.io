import { WebSocket } from 'ws';

interface NetworkPlayer {
    id: string;
    pseudo: string;
    x: number;
    y: number;
    radius: number;
    score: number;
    color: string;
    mouseX: number;
    mouseY: number;
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

    // Configuration de la table
    private arenaX = 500;
    private arenaY = 500;
    private arenaRadius = 380;

    constructor() {
        console.log('🕹️ Architecture style Agar.io activée.');
        this.startServerPhysicsLoop();
    }

    public join(id: string, ws: WebSocket, pseudo: string): void {
        this.connections.set(id, ws);
        const colors = ['#F3B3B3', '#CBB4FF', '#97E2C2', '#E29797'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newPlayer: NetworkPlayer = {
            id, pseudo, x: 500, y: 500, radius: 25, score: 0, color: randomColor, mouseX: 500, mouseY: 500
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

    // Le client envoie UNIQUEMENT la position de sa souris et son score de perles locales
    public updatePlayerInput(id: string, data: any): void {
        const player = this.players.get(id);
        if (player) {
            player.mouseX = data.mouseX;
            player.mouseY = data.mouseY;
            if (data.score !== undefined) player.score = data.score;
        }
    }

    public addCloud(ownerId: string, x: number, y: number, radius: number): void {
        this.clouds.push({
            id: `cloud_${Math.random().toString(36).substr(2, 9)}`,
            ownerId, x, y, radius, maxRadius: radius + 130, opacity: 0.6
        });
    }

    // BOUCLE PHYSIQUE UNIQUE (Style Agar.io)
    private startServerPhysicsLoop(): void {
        setInterval(() => {
            const playerArray = Array.from(this.players.values());

            // 1. Déplacement vers la souris & Barrière
            playerArray.forEach(p => {
                p.radius = 25 + Math.floor(p.score / 10);

                // Calcul du vecteur vers la souris
                const dx = p.mouseX - p.x;
                const dy = p.mouseY - p.y;

                // Vitesse proportionnelle à la distance (comme une attraction)
                p.x += dx * 0.08;
                p.y += dy * 0.08;

                // Contrainte de la barrière de la table
                const distFromCenter = Math.sqrt((p.x - this.arenaX) ** 2 + (p.y - this.arenaY) ** 2);
                const maxDist = this.arenaRadius - p.radius;
                if (distFromCenter > maxDist) {
                    const angle = Math.atan2(p.y - this.arenaY, p.x - this.arenaX);
                    p.x = this.arenaX + Math.cos(angle) * maxDist;
                    p.y = this.arenaY + Math.sin(angle) * maxDist;
                }
            });

            // 2. Gestion des Nuages (Dégâts instantanés -50)
            for (let i = this.clouds.length - 1; i >= 0; i--) {
                const c = this.clouds[i];
                c.radius += (c.maxRadius - c.radius) * 0.1;
                c.opacity -= 0.012;

                playerArray.forEach(p => {
                    if (p.id !== c.ownerId) {
                        const dist = Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2);
                        if (dist < c.radius) {
                            // Le serveur applique la punition directement sur le score maître
                            const oldScore = p.score;
                            p.score = Math.max(0, p.score - 50);

                            // Si le score a changé, on envoie un signal flash au client pour mettre à jour son HUD local
                            if (oldScore !== p.score) {
                                const ws = this.connections.get(p.id);
                                ws?.send(JSON.stringify({ type: 'SCORE_SYNC', score: p.score }));
                            }
                        }
                    }
                });

                if (c.opacity <= 0) this.clouds.splice(i, 1);
            }

            // 3. Bousculades et Collisions d'impact
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
                        const pushForce = 15; // Puissance de la bousculade

                        // Le serveur éjecte fermement les deux ronds en sens opposé
                        p1.x -= Math.cos(angle) * pushForce;
                        p1.y -= Math.sin(angle) * pushForce;
                        p2.x += Math.cos(angle) * pushForce;
                        p2.y += Math.sin(angle) * pushForce;
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