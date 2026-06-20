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

    // --- Rétablissement des jauges et des effets ---
    private abilityEnergy: number = 0;
    private readonly abilityCost: number = 100;
    private isOutOfBounds: boolean = false;
    private outOfBoundsStartTime: number | null = null;
    private readonly gracePeriodDuration: number = 300;
    private dangerRatio: number = 0;

    constructor(canvas: HTMLCanvasElement, pseudo: string, scoreHUD?: ScoreHUD, leaderboard?: Leaderboard) {
        this.renderer = new GameRenderer(canvas);
        this.playerPseudo = pseudo;
        if (scoreHUD) this.scoreHUD = scoreHUD;
        if (leaderboard) this.leaderboard = leaderboard;

        window.addEventListener('mousemove', (e) => {
            const canvasRect = canvas.getBoundingClientRect();
            this.mouseX = e.clientX - canvasRect.left;
            this.mouseY = e.clientY - canvasRect.top;
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
                    case 'SCORE_SYNC':
                        this.score = data.score;
                        break;
                    case 'GAME_STATE':
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

    private deployDustCloud(): void {
        if (this.abilityEnergy < this.abilityCost) return;
        this.abilityEnergy = 0; // Consomme l'énergie

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

        // 1. Collecte des perles et alimentation de la jauge
        for (let i = this.bonuses.length - 1; i >= 0; i--) {
            const bonus = this.bonuses[i];
            const bx = this.playerX - bonus.x;
            const by = this.playerY - bonus.y;
            const dist = Math.sqrt(bx * bx + by * by);

            if (dist < this.playerRadius + bonus.radius) {
                this.bonuses.splice(i, 1);
                this.score += 10;
                this.abilityEnergy = Math.min(100, this.abilityEnergy + 20); // Gagne 20% d'énergie
                this.spawnBonuses(1);
            }
        }

        // 2. Barrière de Danger de 0.30s (Friction et Secousses)
        const dx = this.playerX - this.arenaX;
        const dy = this.playerY - this.arenaY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.arenaRadius - this.playerRadius;

        if (dist >= maxDist - 3) {
            if (!this.isOutOfBounds) {
                this.isOutOfBounds = true;
                this.outOfBoundsStartTime = currentTime;
            }
            const elapsed = currentTime - (this.outOfBoundsStartTime || 0);
            this.dangerRatio = Math.min(1, elapsed / this.gracePeriodDuration);

            if (elapsed >= this.gracePeriodDuration) {
                this.triggerEjection(Math.atan2(dy, dx));
                return;
            }
        } else {
            this.isOutOfBounds = false;
            this.outOfBoundsStartTime = null;
            this.dangerRatio = Math.max(0, this.dangerRatio - 0.05);
        }

        // 3. Synchronisation des Inputs
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'PLAYER_UPDATE', mouseX: this.mouseX, mouseY: this.mouseY, score: this.score
            }));
        }

        // Interfaces HUD
        if (this.scoreHUD) this.scoreHUD.update(this.score, this.playerRadius);
        if (this.leaderboard) {
            const lData = [
                { id: 'self', pseudo: this.playerPseudo, score: this.score },
                ...this.remotePlayers.map(p => ({ id: p.id, pseudo: p.pseudo, score: p.score }))
            ];
            this.leaderboard.update(lData.sort((a, b) => b.score - a.score).slice(0, 3), 'self');
        }

        // Rendu Graphique avec Effets (Shake & Rouge)
        this.renderer.clear();
        this.renderer.drawArena(this.arenaX, this.arenaY, this.arenaRadius);
        this.drawDustClouds();
        this.bonuses.forEach(b => this.renderer.drawPlayer(b.x, b.y, b.radius, '#FFD700', ''));
        this.remotePlayers.forEach(p => this.renderer.drawPlayer(p.x, p.y, p.radius, p.color, p.pseudo));

        let renderX = this.playerX, renderY = this.playerY;
        if (this.dangerRatio > 0) {
            const shake = this.dangerRatio * 5;
            renderX += (Math.random() - 0.5) * shake;
            renderY += (Math.random() - 0.5) * shake;
        }

        this.renderer.drawPlayer(
            renderX, renderY, this.playerRadius,
            this.interpolateColor(this.playerColor, '#FF6B6B', this.dangerRatio),
            this.playerPseudo
        );
        this.drawUIBar();

        requestAnimationFrame(this.gameLoop);
    };

    // --- ANIMATION D'ÉJECTION VISUELLE EN DEHORS DE LA TABLE ---
    private triggerEjection(angle: number): void {
        this.isRunning = false;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'EJECTED' }));
        }

        const ejectionForce = 25;
        const spdX = Math.cos(angle) * ejectionForce;
        const spdY = Math.sin(angle) * ejectionForce;
        let step = 0;

        const animate = () => {
            if (step < 15) {
                this.playerX += spdX;
                this.playerY += spdY;

                this.renderer.clear();
                this.renderer.drawArena(this.arenaX, this.arenaY, this.arenaRadius);
                this.drawDustClouds();
                this.remotePlayers.forEach(p => this.renderer.drawPlayer(p.x, p.y, p.radius, p.color, p.pseudo));
                this.renderer.drawPlayer(this.playerX, this.playerY, this.playerRadius, '#FF6B6B', this.playerPseudo);

                step++;
                requestAnimationFrame(animate);
            } else {
                this.ws?.close();
                alert(`💥 ÉJECTÉ(E) !\n\n🌸 Score final : ${this.score} points !`);
                window.location.reload();
            }
        };
        animate();
    }

    private interpolateColor(color1: string, color2: string, factor: number): string {
        const r1 = parseInt(color1.slice(1, 3), 16), g1 = parseInt(color1.slice(3, 5), 16), b1 = parseInt(color1.slice(5, 7), 16);
        const r2 = parseInt(color2.slice(1, 3), 16), g2 = parseInt(color2.slice(3, 5), 16), b2 = parseInt(color2.slice(5, 7), 16);
        return `#${((1 << 24) + (Math.round(r1 + factor * (r2 - r1)) << 16) + (Math.round(g1 + factor * (g2 - g1)) << 8) + Math.round(b1 + factor * (b2 - b1))).toString(16).slice(1)}`;
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

    private drawUIBar(): void {
        const ctx = this.renderer.ctx;
        const x = this.playerX - 25, y = this.playerY + this.playerRadius + 12;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; ctx.fillRect(x, y, 50, 6);
        ctx.fillStyle = this.abilityEnergy >= this.abilityCost ? '#FF87A0' : '#CBB4FF';
        ctx.fillRect(x, y, (this.abilityEnergy / 100) * 50, 6);
    }
}