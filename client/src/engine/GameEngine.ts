import { GameRenderer } from './GameRenderer';

/**
 * Moteur de Jeu Client : Orchestration de la boucle d'animation et des inputs
 */
export class GameEngine {
    private renderer: GameRenderer;
    private isRunning: boolean = false;

    // État temporaire local pour le test (Avant liaison serveur)
    private playerX: number = window.innerWidth / 2;
    private playerY: number = window.innerHeight / 2;
    private playerRadius: number = 30;
    private mouseX: number = window.innerWidth / 2;
    private mouseY: number = window.innerHeight / 2;
    private playerPseudo: string = "Joueur";

    constructor(canvas: HTMLCanvasElement, pseudo: string) {
        this.renderer = new GameRenderer(canvas);
        this.playerPseudo = pseudo;

        // Écoute des mouvements de la souris
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
    }

    /**
     * Démarre la boucle de jeu
     */
    public start(): void {
        this.isRunning = true;
        this.gameLoop();
    }

    /**
     * Arrête la boucle de jeu
     */
    public stop(): void {
        this.isRunning = false;
    }

    /**
     * Boucle principale cadencée sur le rafraîchissement de l'écran
     */
    private gameLoop = (): void => {
        if (!this.isRunning) return;

        // Logique de déplacement temporaire : le joueur se rapproche doucement de la souris (Inertie)
        const ease = 0.1;
        this.playerX += (this.mouseX - this.playerX) * ease;
        this.playerY += (this.mouseY - this.playerY) * ease;

        // Rendu graphique (SRP)
        this.renderer.clear();

        // Dessin de l'arène au centre de l'écran
        this.renderer.drawArena(window.innerWidth / 2, window.innerHeight / 2, 400);

        // Dessin de notre propre Pouf (Rose poudré : #F3B3B3)
        this.renderer.drawPlayer(this.playerX, this.playerY, this.playerRadius, '#F3B3B3', this.playerPseudo);

        // Relance de l'image suivante
        requestAnimationFrame(this.gameLoop);
    };
}