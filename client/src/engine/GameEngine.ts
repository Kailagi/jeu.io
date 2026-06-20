import { GameRenderer } from './GameRenderer';

interface Bonus {
    x: number;
    y: number;
    radius: number;
}

export class GameEngine {
    private renderer: GameRenderer;
    private isRunning: boolean = false;

    // Configuration de la table de jeu
    private arenaX: number = window.innerWidth / 2;
    private arenaY: number = window.innerHeight / 2;
    private arenaRadius: number = 380;

    // Données du joueur principal
    private playerX: number = window.innerWidth / 2;
    private playerY: number = window.innerHeight / 2;
    private playerRadius: number = 25;
    private playerPseudo: string = "Joueur";

    // Système de Jauge de Dash
    private dashEnergy: number = 0; // De 0 à 100%
    private readonly dashCost: number = 25; // Coût d'un dash (25%)

    // Physique de déplacement
    private mouseX: number = window.innerWidth / 2;
    private mouseY: number = window.innerHeight / 2;
    private speedX: number = 0;
    private speedY: number = 0;
    private dashCooldown: boolean = false;

    // Tableau des bonus
    private bonuses: Bonus[] = [];

    constructor(canvas: HTMLCanvasElement, pseudo: string) {
        this.renderer = new GameRenderer(canvas);
        this.playerPseudo = pseudo;

        // Écoute des inputs souris et clavier
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Empêche l'écran de défiler
                this.triggerDash();
            }
        });

        // Apparition initiale de 25 perles
        this.spawnBonuses(25);
    }

    private spawnBonuses(count: number): void {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * (this.arenaRadius - 20);
            this.bonuses.push({
                x: this.arenaX + Math.cos(angle) * distance,
                y: this.arenaY + Math.sin(angle) * distance,
                radius: 6
            });
        }
    }

    private triggerDash(): void {
        // Bloqué si pas assez d'énergie ou si déjà en cooldown
        if (this.dashCooldown || this.dashEnergy < this.dashCost) return;

        this.dashCooldown = true;
        this.dashEnergy -= this.dashCost; // Consomme l'énergie

        const dx = this.mouseX - this.playerX;
        const dy = this.mouseY - this.playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const dashForce = 20; // Puissance de l'impact
            this.speedX += (dx / distance) * dashForce;
            this.speedY += (dy / distance) * dashForce;
        }

        setTimeout(() => {
            this.dashCooldown = false;
        }, 800);
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

        // Calcul de l'attraction fluide vers le curseur
        const dx = this.mouseX - this.playerX;
        const dy = this.mouseY - this.playerY;

        this.speedX *= 0.88; // Friction
        this.speedY *= 0.88;

        const attraction = 0.04;
        this.speedX += dx * attraction;
        this.speedY += dy * attraction;

        this.playerX += this.speedX;
        this.playerY += this.speedY;

        // Vérification des collisions avec les perles
        for (let i = this.bonuses.length - 1; i >= 0; i--) {
            const bonus = this.bonuses[i];
            const bx = this.playerX - bonus.x;
            const by = this.playerY - bonus.y;
            const dist = Math.sqrt(bx * bx + by * by);

            if (dist < this.playerRadius + bonus.radius) {
                this.bonuses.splice(i, 1);

                // Chaque perle donne +5% de jauge d'énergie
                this.dashEnergy = Math.min(100, this.dashEnergy + 5);

                this.spawnBonuses(1); // Fait réapparaître une perle ailleurs
            }
        }

        // Nettoyage et rendu
        this.renderer.clear();
        this.renderer.drawArena(this.arenaX, this.arenaY, this.arenaRadius);

        // Dessin des perles (Or)
        this.bonuses.forEach(b => {
            this.renderer.drawPlayer(b.x, b.y, b.radius, '#FFD700', '');
        });

        // Dessin du joueur (Rose poudré classique)
        this.renderer.drawPlayer(this.playerX, this.playerY, this.playerRadius, '#F3B3B3', this.playerPseudo);

        // Dessin de la jauge d'énergie sous le joueur
        this.drawUIBar();

        requestAnimationFrame(this.gameLoop);
    };

    private drawUIBar(): void {
        const ctx = this.renderer.ctx;
        const width = 50;
        const height = 6;
        const x = this.playerX - width / 2;
        const y = this.playerY + this.playerRadius + 12;

        // Fond de la jauge
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(x, y, width, height);

        // Remplissage (Rose fuchsia si prêt, sinon lilas pastel)
        ctx.fillStyle = this.dashEnergy >= this.dashCost ? '#FF87A0' : '#CBB4FF';
        const progress = (this.dashEnergy / 100) * width;
        ctx.fillRect(x, y, progress, height);
    }
}