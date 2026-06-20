/**
 * Moteur Graphique : Gestion du Canvas et des dessins (Client-Side Only)
 */
export class GameRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Impossible de récupérer le contexte 2D du Canvas");
        this.ctx = context;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Ajuste la taille du Canvas à celle de la fenêtre du navigateur
     */
    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * Nettoie l'écran entre deux images
     */
    public clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Dessine l'arène (La table de salon de thé circulaire)
     */
    public drawArena(centerX: number, centerY: number, radius: number): void {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

        // Style de la table (Jaune crème avec une bordure lilas doux)
        this.ctx.fillStyle = '#FFFDF3'; // var(--color-cream)
        this.ctx.fill();
        this.ctx.strokeStyle = '#E3D7FF'; // var(--color-secondary)
        this.ctx.lineWidth = 8;
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * Dessine un Pouf (Joueur ou Adversaire)
     */
    public drawPlayer(x: number, y: number, radius: number, color: string, pseudo: string): void {
        this.ctx.save();

        // 1. Dessin de l'ombre douce sous le joueur
        this.ctx.beginPath();
        this.ctx.arc(x, y + 4, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(92, 74, 74, 0.1)'; // var(--color-text-dark) transparent
        this.ctx.fill();

        // 2. Dessin du corps du Pouf (Cercle principal)
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // 3. Dessin du Pseudo au-dessus du joueur
        this.ctx.fillStyle = '#5C4A4A'; // var(--color-text-dark)
        this.ctx.font = 'bold 14px Recursive, Segoe UI, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(pseudo, x, y - radius - 10);

        this.ctx.restore();
    }
}