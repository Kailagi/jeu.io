import { GameRenderer } from './GameRenderer';
import { ScoreHUD } from '../ui/atoms/ScoreHUD';
import { Leaderboard } from '../ui/organisms/Leaderboard';

interface Bonus { x: number; y: number; radius: number; }
interface DustCloud { id: string; ownerId: string; x: number; y: number; radius: number; opacity: number; }
interface RemotePlayer { id: string; pseudo: string; x: number; y: number; radius: number; score: number; color: string; }

export class GameEngine {
    private renderer: GameRenderer;
    private scoreHUD: ScoreHUD | null = null;
    private leaderboard: Leaderboard | null = null;
    private isRunning: boolean = false;

    private ws: WebSocket | null = null;
    private myNetworkId: string | null = null;
    private remotePlayers: RemotePlayer[] = [];
    private playerColor: string = '#F3B3B3';

    // Coordonnées forcées et synchronisées par le serveur
    private arenaX: number = 500;
    private arenaY: number = 500;
    private arenaRadius: number = 380;

    private playerX: number = 500;
    private playerY: number = 500;
    private playerRadius: number = 25;
    private playerPseudo: string = "Joueur";
    private score: number = 0;

    private mouseX: number = 500;
    private mouseY: number = 500;

    private bonuses: Bonus[] = [];
    private activeClouds: DustCloud[] = [];

    // Variables pour l'éjection locale
    private isOutOfBounds: boolean = false;
    private outOfBoundsStartTime: number | null = null;

    constructor(canvas: HTMLCanvasElement, pseudo: string, scoreHUD?: ScoreHUD, leaderboard?: Leaderboard) {
        this.renderer = new GameRenderer(canvas);
        this.playerPseudo = pseudo;
        if (scoreHUD) this.scoreHUD = scoreHUD;
        if (leaderboard) this.leaderboard = leaderboard;

        window.addEventListener('mousemove', (e) => {
            // On calcule la position de la souris par rapport au centre de l'écran pour correspondre à l'arène 500,500
            const canvasRect = canvas.getBoundingClientRect();
            this.mouseX = e.clientX - canvasRect.left;
            this.mouseY = e.clientY - canvasRect.top;
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        type: 'DEPLOY_CLOUD', x: this.playerX, y: this.playerY, radius: this.playerRadius
                    }));
                }
            }
        });

        this.spawnBonuses(3);
        this.initNetwork();
    }

    private initNetwork(): void {
        this.ws = new WebSocket('ws://localhost:3000');
        this.ws.onopen = () => {
            this.ws?.send(JSON.stringify({ type: 'JOIN', pseudo: this.playerPseudo }));
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case 'WELCOME':
                        this.myNetworkId = data.id;
                        this.playerColor = data.color;
                        break;
                    case 'SCORE_SYNC':
                        // Le serveur nous dit qu'on a été touché par un nuage, on met à jour notre score
                        this.score = data.score;
                        break;
                    case 'GAME_STATE':
                        // On extrait notre position validée par le serveur
                        const me = data.players.find((p: any) => p.id === this.myNetworkId);
                        if (me) {
                            this.playerX = me.x;
                            this.playerY = me.y;
                            this.playerRadius = me.radius;
                            this.score = me.score;
                        }
                        this.remotePlayers = data.players.filter((p: RemotePlayer) => p.id !== this.myNetworkId);
                        this.activeClouds = data.clouds || [];
                        break;
                    case 'PLAYER_LEFT':
                        this.remotePlayers = this.remotePlayers.filter(p => p.id !== data.id);
                        break;
                }
            } catch (err) { console.error(err); }
        };
    }

    private spawnBonuses(count: number): void {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * (this.arenaRadius - 40);
            this.bonuses.push({
                x: this.arenaX + Math.cos(angle) * distance,
                y: this.arenaY + Math.sin(angle) * distance,
                radius: 6
            });
        }
    }

    public start(): void { this.isRunning = true; this.gameLoop(); }
    public stop(): void { this.isRunning = false; this.ws?.close(); }

    private gameLoop = (): void => {
        if (!this.isRunning) return;

        // 1. Collecte locale des perles
        for (let i = this.bonuses.length - 1; i >= 0; i--) {
            const bonus = this.bonuses[i];
            const bx = this.playerX - bonus.x;
            const by = this.playerY - bonus.y;
            const dist = Math.sqrt(bx * bx + by * by);

            if (dist < this.playerRadius + bonus.radius) {
                this.bonuses.splice(i, 1);
                this.score += 10;
                this.spawnBonuses(1);
            }
        }

        // 2. Détection d'éjection (si on touche le bord absolu)
        const dx = this.playerX - this.arenaX;
        const dy = this.playerY - this.arenaY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= this.arenaRadius - this.playerRadius - 2) {
            if (!this.isOutOfBounds) {
                this.isOutOfBounds = true;
                this.outOfBoundsStartTime = performance.now();
            }
            if (performance.now() - (this.outOfBoundsStartTime || 0) >= 300) {
                this.triggerEjection();
                return;
            }
        } else {
            this.isOutOfBounds = false;
        }

        // 3. Envoi de notre visée de souris au serveur
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'PLAYER_UPDATE',
                mouseX: this.mouseX,
                mouseY: this.mouseY,
                score: this.score
            }));
        }

        // Mises à jour des interfaces
        if (this.scoreHUD) this.scoreHUD.update(this.score, this.playerRadius);
        if (this.leaderboard) {
            const lData = [
                { id: 'self', pseudo: this.playerPseudo, score: this.score },
                ...this.remotePlayers.map(p => ({ id: p.id, pseudo: p.pseudo, score: p.score }))
            ];
            this.leaderboard.update(lData.sort((a, b) => b.score - a.score).slice(0, 3), 'self');
        }

        // Rendu graphique
        this.renderer.clear();
        this.renderer.drawArena(this.arenaX, this.arenaY, this.arenaRadius);
        this.drawDustClouds();
        this.bonuses.forEach(b => this.renderer.drawPlayer(b.x, b.y, b.radius, '#FFD700', ''));
        this.remotePlayers.forEach(p => this.renderer.drawPlayer(p.x, p.y, p.radius, p.color, p.pseudo));
        this.renderer.drawPlayer(this.playerX, this.playerY, this.playerRadius, this.playerColor, this.playerPseudo);

        requestAnimationFrame(this.gameLoop);
    };

    private triggerEjection(): void {
        this.isRunning = false;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'EJECTED' }));
        }
        this.ws?.close();
        alert(`💥 ÉJECTÉ(E) !\n\n🌸 Score final : ${this.score} points !`);
        window.location.reload();
    }

    private drawDustClouds(): void {
        const ctx = this.renderer.ctx;
        this.activeClouds.forEach(cloud => {
            ctx.save(); ctx.beginPath(); ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(cloud.x, cloud.y, cloud.radius * 0.2, cloud.x, cloud.y, cloud.radius);
            gradient.addColorStop(0, cloud.ownerId === this.myNetworkId ? 'rgba(243, 179, 179, 0.4)' : 'rgba(226, 210, 151, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient; ctx.fill(); ctx.restore();
        });
    }
}