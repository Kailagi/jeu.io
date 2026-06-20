/**
 * Moteur Graphique : Gestion du Canvas et des dessins (Client-Side)
 */
export class GameRenderer {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Impossible de récupérer le contexte 2D");
        this.ctx = context;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    public clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public drawArena(centerX: number, centerY: number, radius: number): void {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FFFDF3'; // Fond crème
        this.ctx.fill();
        this.ctx.strokeStyle = '#E3D7FF'; // Bordure lilas
        this.ctx.lineWidth = 8;
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * Dessine un joueur (le nôtre ou un adversaire) de manière fluide et synchronisée
     */
    public drawPlayer(x: number, y: number, radius: number, color: string, pseudo: string): void {
        this.ctx.save();

        // 1. Positionnement global du contexte
        this.ctx.translate(x, y);

        // 2. Dessin du corps du Pouf (le cercle)
        this.ctx.beginPath();
        // CORRECTIF : On dessine bien à (0, 0) car le contexte est déjà translaté
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();

        // Petite ombre douce pour le relief
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.stroke();

        // 3. Dessin du Pseudo (Texte)
        if (pseudo) {
            this.ctx.fillStyle = '#2D3436'; // Gris foncé pro
            this.ctx.font = 'bold 14px "Quicksand", sans-serif'; // Police du design
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            // CORRECTIF : On dessine le texte à (0, -radius - 15) pour qu'il soit
            // centré JUSTE AU-DESSUS du Pouf, quelle que soit sa position réelle sur la table.
            this.ctx.fillText(pseudo, 0, -radius - 15);
        }

        this.ctx.restore();
    }
}