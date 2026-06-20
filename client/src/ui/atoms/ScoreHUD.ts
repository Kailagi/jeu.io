/**
 * Atome : Compteur de Score et Masse en bas à gauche (HUD)
 */
export class ScoreHUD {
  private element: HTMLDivElement;
  private scoreElement: HTMLSpanElement;
  private massElement: HTMLSpanElement;

  constructor() {
    this.element = document.createElement('div');
    this.scoreElement = document.createElement('span');
    this.massElement = document.createElement('span');
    this.initLayout();
  }

  private initLayout(): void {
    // Style du conteneur fixe en bas à gauche (Design Tokens)
    this.element.style.position = 'fixed';
    this.element.style.bottom = 'var(--spacing-md)';
    this.element.style.left = 'var(--spacing-md)';
    this.element.style.backgroundColor = 'rgba(255, 253, 243, 0.85)'; // Crème semi-transparent
    this.element.style.backdropFilter = 'blur(8px)';
    this.element.style.border = '2px solid var(--color-primary)'; // Bordure rose poudré
    this.element.style.borderRadius = 'var(--radius-button)';
    this.element.style.padding = 'var(--spacing-sm) var(--spacing-md)';
    this.element.style.boxShadow = 'var(--shadow-soft)';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.gap = '2px';
    this.element.style.zIndex = '10'; // Au-dessus du Canvas
    this.element.style.fontFamily = "'Recursive', 'Segoe UI', sans-serif";
    this.element.style.minWidth = '120px';

    // Configuration des textes intérieurs
    this.scoreElement.style.color = 'var(--color-text-dark)';
    this.scoreElement.style.fontSize = '16px';
    this.scoreElement.style.fontWeight = 'bold';

    this.massElement.style.color = 'var(--color-text-dark)';
    this.massElement.style.fontSize = '12px';
    this.massElement.style.opacity = '0.7';

    this.element.appendChild(this.scoreElement);
    this.element.appendChild(this.massElement);

    // Initialisation avec des valeurs par défaut
    this.update(0, 30);
  }

  /**
   * Met à jour les valeurs du HUD en temps réel
   */
  public update(score: number, mass: number): void {
    this.scoreElement.innerText = `🌸 Score : ${score}`;
    this.massElement.innerText = `✨ Taille : ${Math.round(mass)}px`;
  }

  public getElement(): HTMLDivElement {
    return this.element;
  }
}
