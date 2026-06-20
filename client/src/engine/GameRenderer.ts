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

    public drawPlayer(x: number, y: number, radius: number, color: string, pseudo: string): void {
        this.ctx.save();

        // Ombre sous le joueur
        this.ctx.beginPath();
        this.ctx.arc(x, y + 4, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(92, 74, 74, 0.1)';
        this.ctx.fill();

        // Corps du Pouf
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Pseudo
        if (pseudo) {
            this.ctx.fillStyle = '#5C4A4A';
            this.ctx.font = 'bold 14px Recursive, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(pseudo, x, y - radius - 10);
        }

        this.ctx.restore();
    }
}