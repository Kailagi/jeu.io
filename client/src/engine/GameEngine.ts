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

    private arenaX: number = window.innerWidth / 2;
    private arenaY: number = window.innerHeight / 2;
    private arenaRadius: number = 380;

    private playerX: number = window.innerWidth / 2;
    private playerY: number = window.innerHeight / 2;
    private playerRadius: number = 25;
    private playerPseudo: string = "Joueur";
    private score: number = 0;
    private baseRadius: number = 25;

    private isOutOfBounds: boolean = false;
    private outOfBoundsStartTime: number | null = null;
    private readonly gracePeriodDuration: number = 300;
    private dangerRatio: number = 0;

    private abilityEnergy: number = 0;
    private readonly abilityCost: number = 100;

    private mouseX: number = window.innerWidth / 2;
    private mouseY: number = window.innerHeight / 2;
    private speedX: number = 0;
    private speedY: number = 0;

    private bonuses: Bonus[] = [];
    private activeClouds: DustCloud[] = [];

    constructor(canvas: HTMLCanvasElement, pseudo: string, scoreHUD?: ScoreHUD, leaderboard?: Leaderboard) {
        this.renderer = new GameRenderer(canvas);
        this.playerPseudo = pseudo;
        if (scoreHUD) this.scoreHUD = scoreHUD;
        if (leaderboard) this.leaderboard = leaderboard;

        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.deployDustCloud();
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
                    case 'GAME_STATE':
                        // Le serveur est le roi : on prend ses valeurs de positions et de scores !
                        const myData = data.players.find((p: any) => p.id === this.myNetworkId);
                        if (myData) {
                            this.playerX = myData.x;
                            this.playerY = myData.y;
                            this.score = myData.score; // Score mis à jour par les nuages du serveur
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
            this.bonuses.push({
                x: this.arenaX + (Math.random() - 0.5) * 500,
                y: this.arenaY + (Math.random() - 0.5) * 500,
                radius: 6
            });
        }
    }

    private deployDustCloud(): void {
        if (this.abilityEnergy < this.abilityCost) return;
        this.abilityEnergy = 0;

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'DEPLOY_CLOUD', x: this.playerX, y: this.playerY, radius: this.playerRadius
            }));
        }
    }

    public start(): void { this.isRunning = true; this.gameLoop(); }
    public stop(): void { this.isRunning = false; this.ws?.close(); }

    private gameLoop = (): void => {
        if (!this.isRunning) return;
        const currentTime = performance.now();

        this.playerRadius = this.baseRadius + Math.floor(this.score / 10);

        // --- CALCULE DE L'INTENTION DE VITESSE LOCALE VIA LA SOURIS ---
        const pdx = this.mouseX - this.playerX;
        const pdy = this.mouseY - this.playerY;
        this.speedX *= 0.82; this.speedY *= 0.82;
        this.speedX += pdx * 0.02; this.speedY += pdy * 0.02;

        // --- LIMITES DU TERRAIN LOCALES ---
        const dist = Math.sqrt((this.playerX - this.arenaX) ** 2 + (this.playerY - this.arenaY) ** 2);
        if (dist >= this.arenaRadius - this.playerRadius) {
            if (!this.isOutOfBounds) { this.isOutOfBounds = true; this.outOfBoundsStartTime = currentTime; }
            this.dangerRatio = Math.min(1, (currentTime - (this.outOfBoundsStartTime || 0)) / this.gracePeriodDuration);
            if (currentTime - (this.outOfBoundsStartTime || 0) >= this.gracePeriodDuration) { this.triggerEjection(); return; }
        } else { this.isOutOfBounds = false; this.dangerRatio = Math.max(0, this.dangerRatio - 0.05); }

        // --- PERLES LOCALES (MANGÉES UNIQUEMENT PAR MOI POUR LA FLUIDITÉ) ---
        for (let i = this.bonuses.length - 1; i >= 0; i--) {
            const b = this.bonuses[i];
            if (Math.sqrt((this.playerX - b.x) ** 2 + (this.playerY - b.y) ** 2) < this.playerRadius + b.radius) {
                this.bonuses.splice(i, 1);
                this.score += 10;
                this.abilityEnergy = Math.min(100, this.abilityEnergy + 20);
                this.spawnBonuses(1);
            }
        }

        // --- ENVOI DE NOTRE INTENTION DE VITESSE AU SERVEUR ---
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.myNetworkId) {
            this.ws.send(JSON.stringify({
                type: 'PLAYER_UPDATE', speedX: this.speedX, speedY: this.speedY, score: this.score
            }));
        }

        // SYNC INTERFACES
        if (this.scoreHUD) this.scoreHUD.update(this.score, this.playerRadius);
        if (this.leaderboard) {
            const leaderboardData = [
                { id: 'self', pseudo: this.playerPseudo, score: this.score },
                ...this.remotePlayers.map(p => ({ id: p.id, pseudo: p.pseudo, score: p.score }))
            ];
            this.leaderboard.update(leaderboardData.sort((a, b) => b.score - a.score).slice(0, 3), 'self');
        }

        // RENDU GRAPHIQUE
        this.renderer.clear();
        this.renderer.drawArena(this.arenaX, this.arenaY, this.arenaRadius);
        this.drawDustClouds();
        this.bonuses.forEach(b => this.renderer.drawPlayer(b.x, b.y, b.radius, '#FFD700', ''));
        this.remotePlayers.forEach(p => this.renderer.drawPlayer(p.x, p.y, p.radius, p.color, p.pseudo));

        let renderX = this.playerX, renderY = this.playerY;
        if (this.dangerRatio > 0) {
            const shake = this.dangerRatio * 5; renderX += (Math.random() - 0.5) * shake; renderY += (Math.random() - 0.5) * shake;
        }
        this.renderer.drawPlayer(renderX, renderY, this.playerRadius, this.interpolateColor(this.playerColor, '#FF6B6B', this.dangerRatio), this.playerPseudo);
        this.drawUIBar();

        requestAnimationFrame(this.gameLoop);
    };

    private triggerEjection(): void {
        this.stop();
        alert(`💥 ÉJECTÉ(E) !\nScore final : ${this.score}`);
        window.location.reload();
    }

    private interpolateColor(c1: string, c2: string, f: number): string {
        const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
        const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
        return `#${((1 << 24) + (Math.round(r1 + f * (r2 - r1)) << 16) + (Math.round(g1 + f * (g2 - g1)) << 8) + Math.round(b1 + f * (b2 - b1))).toString(16).slice(1)}`;
    }

    private drawDustClouds(): void {
        this.activeClouds.forEach(cloud => {
            const ctx = this.renderer.ctx;
            ctx.save(); ctx.beginPath(); ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(cloud.x, cloud.y, cloud.radius * 0.2, cloud.x, cloud.y, cloud.radius);
            gradient.addColorStop(0, cloud.ownerId === this.myNetworkId ? 'rgba(243, 179, 179, 0.5)' : 'rgba(226, 210, 151, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient; ctx.fill(); ctx.restore();
        });
    }

    private drawUIBar(): void {
        const ctx = this.renderer.ctx;
        const x = this.playerX - 25, y = this.playerY + this.playerRadius + 12;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; ctx.fillRect(x, y, 50, 6);
        ctx.fillStyle = this.abilityEnergy >= this.abilityCost ? '#FF87A0' : '#CBB4FF';
        ctx.fillRect(x, y, (this.abilityEnergy / 100) * 50, 6);
    }
}