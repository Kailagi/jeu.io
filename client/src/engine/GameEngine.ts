import { GameRenderer } from './GameRenderer';
import { ScoreHUD } from '../ui/atoms/ScoreHUD';
import { Leaderboard } from '../ui/organisms/Leaderboard';

interface Bonus {
    x: number;
    y: number;
    radius: number;
}

interface DustCloud {
    id: string;
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    opacity: number;
}

interface Bot {
    id: string;
    x: number;
    y: number;
    speedX: number;
    speedY: number;
    radius: number;
    pseudo: string;
    color: string;
    baseColor: string;
    score: number;
    abilityEnergy: number;
    isOutOfBounds: boolean;
    outOfBoundsStartTime: number | null;
    dangerRatio: number;
    behaviorType: 'aggressive' | 'random';
    nextDecisionTime: number;
    targetX: number;
    targetY: number;
    hasBeenHitByCloud: boolean;
    isEjected: boolean;
}

export class GameEngine {
    private renderer: GameRenderer;
    private scoreHUD: ScoreHUD | null = null;
    private leaderboard: Leaderboard | null = null;
    private isRunning: boolean = false;

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
    // MODIFIÉ : Le sursis passe à 0.30s (300ms) pour une éjection quasi-instantanée
    private readonly gracePeriodDuration: number = 300;
    private dangerRatio: number = 0;
    private hasBeenHitByCloud: boolean = false;

    private abilityEnergy: number = 0;
    private readonly abilityCost: number = 100;

    private mouseX: number = window.innerWidth / 2;
    private mouseY: number = window.innerHeight / 2;
    private speedX: number = 0;
    private speedY: number = 0;

    private bonuses: Bonus[] = [];
    private activeClouds: DustCloud[] = [];
    private bots: Bot[] = [];

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
                this.deployDustCloud('player', this.playerX, this.playerY, this.playerRadius);
            }
        });

        this.spawnBonuses(3);
        this.spawnBots();
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

    private spawnBots(): void {
        const botNames = ['FraisePuff 🍓', 'ChocoMint 🌿'];
        const botColors = ['#E29797', '#97E2C2'];

        for (let i = 0; i < 2; i++) {
            const angle = (Math.PI * 2 / 2) * i;
            this.bots.push({
                id: `bot_${i}`,
                x: this.arenaX + Math.cos(angle) * 160,
                y: this.arenaY + Math.sin(angle) * 160,
                speedX: 0,
                speedY: 0,
                radius: 25,
                pseudo: botNames[i],
                color: botColors[i],
                baseColor: botColors[i],
                score: 40,
                abilityEnergy: 0,
                isOutOfBounds: false,
                outOfBoundsStartTime: null,
                dangerRatio: 0,
                behaviorType: i === 0 ? 'aggressive' : 'random',
                nextDecisionTime: 0,
                targetX: this.arenaX,
                targetY: this.arenaY,
                hasBeenHitByCloud: false,
                isEjected: false
            });
        }
    }

    private deployDustCloud(ownerId: string, x: number, y: number, radius: number): void {
        if (ownerId === 'player' && this.abilityEnergy < this.abilityCost) return;

        if (ownerId === 'player') {
            this.abilityEnergy = 0;
        }

        this.activeClouds.push({
            id: ownerId,
            x: x,
            y: y,
            radius: radius,
            maxRadius: radius + 150,
            opacity: 0.6
        });
    }

    public start(): void {
        this.isRunning = true;
        this.gameLoop();
    }

    public stop(): void {
        this.isRunning = false;
    }

    private gameLoop = (): void => {
        if (!this.isRunning) return;

        const currentTime = performance.now();

        // --- 1. TAILLES DYNAMIQUES ---
        this.playerRadius = this.baseRadius + Math.floor(this.score / 10);
        this.bots.forEach(bot => {
            bot.radius = this.baseRadius + Math.floor(bot.score / 10);
        });

        // --- 2. NUAGES ENNEMIS SUR LE JOUEUR ---
        let playerSpeedMultiplier = 1;
        let isCurrentlyInCloud = false;

        this.activeClouds.forEach(cloud => {
            if (cloud.id !== 'player') {
                const dx = this.playerX - cloud.x;
                const dy = this.playerY - cloud.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < cloud.radius) {
                    playerSpeedMultiplier = 0.45;
                    isCurrentlyInCloud = true;
                    if (!this.hasBeenHitByCloud) {
                        this.score = Math.max(0, this.score - 50);
                        this.hasBeenHitByCloud = true;
                    }
                }
            }
        });
        if (!isCurrentlyInCloud) this.hasBeenHitByCloud = false;

        // --- 3. PHYSIQUE DU JOUEUR PRINCIPAL ---
        const pdx = this.mouseX - this.playerX;
        const pdy = this.mouseY - this.playerY;
        this.speedX *= 0.82;
        this.speedY *= 0.82;
        const attraction = 0.02 * playerSpeedMultiplier;
        this.speedX += pdx * attraction;
        this.speedY += pdy * attraction;
        this.playerX += this.speedX;
        this.playerY += this.speedY;

        // --- 4. IA ET PHYSIQUE DES ROBOTS ---
        for (let i = this.bots.length - 1; i >= 0; i--) {
            const bot = this.bots[i];
            if (bot.isEjected) continue;

            let botSpeedMultiplier = 1;
            let botInCloud = false;

            this.activeClouds.forEach(cloud => {
                if (cloud.id !== bot.id) {
                    const bdx = bot.x - cloud.x;
                    const bdy = bot.y - cloud.y;
                    const bdist = Math.sqrt(bdx * bdx + bdy * bdy);

                    if (bdist < cloud.radius) {
                        botSpeedMultiplier = 0.45;
                        botInCloud = true;
                        if (!bot.hasBeenHitByCloud) {
                            bot.score = Math.max(0, bot.score - 50);
                            bot.hasBeenHitByCloud = true;
                        }
                    }
                }
            });
            if (!botInCloud) bot.hasBeenHitByCloud = false;

            if (currentTime > bot.nextDecisionTime) {
                const decisionRate = bot.behaviorType === 'aggressive' ? 200 : 900;
                bot.nextDecisionTime = currentTime + decisionRate + Math.random() * 300;

                if (bot.behaviorType === 'aggressive') {
                    bot.targetX = this.playerX;
                    bot.targetY = this.playerY;
                } else {
                    if (this.bonuses.length > 0 && Math.random() < 0.6) {
                        bot.targetX = this.bonuses[Math.floor(Math.random() * this.bonuses.length)].x;
                        bot.targetY = this.bonuses[Math.floor(Math.random() * this.bonuses.length)].y;
                    } else {
                        const randomAngle = Math.random() * Math.PI * 2;
                        const randomDist = Math.random() * (this.arenaRadius - 80);
                        bot.targetX = this.arenaX + Math.cos(randomAngle) * randomDist;
                        bot.targetY = this.arenaY + Math.sin(randomAngle) * randomDist;
                    }
                }
            }

            const bdx = bot.targetX - bot.x;
            const bdy = bot.targetY - bot.y;
            const bdist = Math.sqrt(bdx * bdx + bdy * bdy);

            bot.speedX *= 0.82;
            bot.speedY *= 0.82;

            if (bdist > 0) {
                const basePower = bot.behaviorType === 'aggressive' ? 0.85 : 0.23;
                const botAttraction = basePower * botSpeedMultiplier;
                bot.speedX += (bdx / bdist) * botAttraction;
                bot.speedY += (bdy / bdist) * botAttraction;
            }

            bot.x += bot.speedX;
            bot.y += bot.speedY;

            bot.abilityEnergy += bot.behaviorType === 'aggressive' ? 0.6 : 0.2;
            if (bot.abilityEnergy >= 100 && bdist < 90) {
                this.deployDustCloud(bot.id, bot.x, bot.y, bot.radius);
                bot.abilityEnergy = 0;
            }

            this.bonuses.forEach((bonus, bIndex) => {
                const bx = bot.x - bonus.x;
                const by = bonus.y - bot.y;
                if (Math.sqrt(bx * bx + by * by) < bot.radius + bonus.radius) {
                    this.bonuses.splice(bIndex, 1);
                    bot.score += 10;
                    this.spawnBonuses(1);
                }
            });

            const bDistFromCenter = Math.sqrt((bot.x - this.arenaX) ** 2 + (bot.y - this.arenaY) ** 2);
            const bMaxDist = this.arenaRadius - bot.radius;

            if (bDistFromCenter >= bMaxDist) {
                const bAngle = Math.atan2(bot.y - this.arenaY, bot.x - this.arenaX);
                bot.x = this.arenaX + Math.cos(bAngle) * bMaxDist;
                bot.y = this.arenaY + Math.sin(bAngle) * bMaxDist;

                if (!bot.isOutOfBounds) {
                    bot.isOutOfBounds = true;
                    bot.outOfBoundsStartTime = currentTime;
                }

                const bElapsed = currentTime - (bot.outOfBoundsStartTime || 0);
                bot.dangerRatio = Math.min(1, bElapsed / this.gracePeriodDuration);

                if (bElapsed >= this.gracePeriodDuration) {
                    this.triggerBotEjection(bot, bAngle);
                    continue;
                }
            } else {
                bot.isOutOfBounds = false;
                bot.outOfBoundsStartTime = null;
                bot.dangerRatio = Math.max(0, bot.dangerRatio - 0.05);
            }

            bot.color = this.interpolateColor(bot.baseColor, '#FF6B6B', bot.dangerRatio);
        }

        // --- 5. ENTRE-CHOC PHYSIQUE ---
        this.bots.forEach(bot => {
            if (bot.isEjected) return;
            const collisionDx = bot.x - this.playerX;
            const collisionDy = bot.y - this.playerY;
            const distanceBetween = Math.sqrt(collisionDx * collisionDx + collisionDy * collisionDy);
            const minDistanceNeeded = this.playerRadius + bot.radius;

            if (distanceBetween < minDistanceNeeded) {
                const angle = Math.atan2(collisionDy, collisionDx);
                const pushForce = 15;

                this.speedX -= Math.cos(angle) * pushForce;
                this.speedY -= Math.sin(angle) * pushForce;
                bot.speedX += Math.cos(angle) * pushForce;
                bot.speedY += Math.sin(angle) * pushForce;

                const overlap = minDistanceNeeded - distanceBetween;
                this.playerX -= Math.cos(angle) * (overlap / 2);
                this.playerY -= Math.sin(angle) * (overlap / 2);
                bot.x += Math.cos(angle) * (overlap / 2);
                bot.y += Math.sin(angle) * (overlap / 2);
            }
        });

        // --- 6. HORS-PISTE JOUEUR ---
        const distFromCenterX = this.playerX - this.arenaX;
        const distFromCenterY = this.playerY - this.arenaY;
        const distanceFromCenter = Math.sqrt(distFromCenterX * distFromCenterX + distFromCenterY * distFromCenterY);
        const maxAllowedDistance = this.arenaRadius - this.playerRadius;

        if (distanceFromCenter >= maxAllowedDistance) {
            const angle = Math.atan2(distFromCenterY, distFromCenterX);
            this.playerX = this.arenaX + Math.cos(angle) * maxAllowedDistance;
            this.playerY = this.arenaY + Math.sin(angle) * maxAllowedDistance;

            if (!this.isOutOfBounds) {
                this.isOutOfBounds = true;
                this.outOfBoundsStartTime = currentTime;
            }

            const elapsed = currentTime - (this.outOfBoundsStartTime || 0);
            this.dangerRatio = Math.min(1, elapsed / this.gracePeriodDuration);

            if (elapsed >= this.gracePeriodDuration) {
                this.triggerEjection(angle);
                return;
            }
        } else {
            this.isOutOfBounds = false;
            this.outOfBoundsStartTime = null;
            this.dangerRatio = Math.max(0, this.dangerRatio - 0.05);
        }

        // --- 7. COLLISIONS JOUEUR / PERLES ---
        for (let i = this.bonuses.length - 1; i >= 0; i--) {
            const bonus = this.bonuses[i];
            const bx = this.playerX - bonus.x;
            const by = this.playerY - bonus.y;
            const dist = Math.sqrt(bx * bx + by * by);

            if (dist < this.playerRadius + bonus.radius) {
                this.bonuses.splice(i, 1);
                this.score += 10;
                this.abilityEnergy = Math.min(100, this.abilityEnergy + 20);
                this.spawnBonuses(1);
            }
        }

        // --- 8. SYNC UI & LEADERBOARD (TOP 3) ---
        if (this.scoreHUD) {
            this.scoreHUD.update(this.score, this.playerRadius);
        }

        if (this.leaderboard) {
            const leaderboardData = [
                { id: 'self', pseudo: this.playerPseudo, score: this.score },
                ...this.bots.map(bot => ({ id: bot.id, pseudo: bot.pseudo, score: bot.score }))
            ];
            const top3Data = leaderboardData.sort((a, b) => b.score - a.score).slice(0, 3);
            this.leaderboard.update(top3Data, 'self');
        }

        // --- 9. ANIMATION DES NUAGES ---
        for (let i = this.activeClouds.length - 1; i >= 0; i--) {
            const cloud = this.activeClouds[i];
            cloud.radius += (cloud.maxRadius - cloud.radius) * 0.1;
            cloud.opacity -= 0.012;

            if (cloud.opacity <= 0) {
                this.activeClouds.splice(i, 1);
            }
        }

        // --- 10. RENDU VISUEL ---
        this.renderer.clear();
        this.renderer.drawArena(this.arenaX, this.arenaY, this.arenaRadius);
        this.drawDustClouds();

        this.bonuses.forEach(b => this.renderer.drawPlayer(b.x, b.y, b.radius, '#FFD700', ''));

        this.bots.forEach(bot => {
            let bx = bot.x;
            let by = bot.y;
            if (bot.dangerRatio > 0) {
                const bShake = bot.dangerRatio * 5;
                bx += (Math.random() - 0.5) * bShake;
                by += (Math.random() - 0.5) * bShake;
            }
            this.renderer.drawPlayer(bx, by, bot.radius, bot.color, bot.pseudo);
        });

        let renderX = this.playerX;
        let renderY = this.playerY;
        if (this.dangerRatio > 0) {
            const shakeIntensity = this.dangerRatio * 5;
            renderX += (Math.random() - 0.5) * shakeIntensity;
            renderY += (Math.random() - 0.5) * shakeIntensity;
        }
        const playerColor = this.interpolateColor('#F3B3B3', '#FF6B6B', this.dangerRatio);
        this.renderer.drawPlayer(renderX, renderY, this.playerRadius, playerColor, this.playerPseudo);

        this.drawUIBar();

        requestAnimationFrame(this.gameLoop);
    };

    private triggerBotEjection(bot: Bot, angle: number): void {
        bot.isEjected = true;
        const eForce = 35;
        const bSpeedX = Math.cos(angle) * eForce;
        const bSpeedY = Math.sin(angle) * eForce;

        let step = 0;
        const animateBot = () => {
            if (step < 15) {
                bot.x += bSpeedX;
                bot.y += bSpeedY;
                step++;
                requestAnimationFrame(animateBot);
            } else {
                this.bots = this.bots.filter(b => b.id !== bot.id);
            }
        };
        animateBot();
    }

    private triggerEjection(angle: number): void {
        this.isOutOfBounds = false;
        const ejectionForce = 35;
        this.speedX = Math.cos(angle) * ejectionForce;
        this.speedY = Math.sin(angle) * ejectionForce;

        const steps = 15;
        let currentStep = 0;

        const ejectionAnimate = () => {
            if (currentStep < steps) {
                this.playerX += this.speedX;
                this.playerY += this.speedY;
                this.renderer.clear();
                this.renderer.drawArena(this.arenaX, this.arenaY, this.arenaRadius);
                this.renderer.drawPlayer(this.playerX, this.playerY, this.playerRadius, '#FF6B6B', this.playerPseudo);
                currentStep++;
                requestAnimationFrame(ejectionAnimate);
            } else {
                this.stop();
                alert(`💥 ÉJECTÉ(E) !\n\n🌸 Score final : ${this.score} points !`);
                window.location.reload();
            }
        };
        ejectionAnimate();
    }

    private interpolateColor(color1: string, color2: string, factor: number): string {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    private drawDustClouds(): void {
        const ctx = this.renderer.ctx;
        this.activeClouds.forEach(cloud => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(cloud.x, cloud.y, cloud.radius * 0.2, cloud.x, cloud.y, cloud.radius);

            if (cloud.id === 'player') {
                gradient.addColorStop(0, `rgba(243, 179, 179, ${cloud.opacity})`);
                gradient.addColorStop(0.6, `rgba(227, 215, 255, ${cloud.opacity * 0.5})`);
            } else {
                gradient.addColorStop(0, `rgba(226, 210, 151, ${cloud.opacity})`);
                gradient.addColorStop(0.6, `rgba(243, 150, 150, ${cloud.opacity * 0.4})`);
            }
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();
        });
    }

    private drawUIBar(): void {
        const ctx = this.renderer.ctx;
        const width = 50;
        const height = 6;
        const x = this.playerX - width / 2;
        const y = this.playerY + this.playerRadius + 12;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = this.abilityEnergy >= this.abilityCost ? '#FF87A0' : '#CBB4FF';
        const progress = (this.abilityEnergy / 100) * width;
        ctx.fillRect(x, y, progress, height);
    }
}