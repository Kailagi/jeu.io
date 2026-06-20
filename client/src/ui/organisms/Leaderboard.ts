import { createLeaderboardRow } from '../atoms/LeaderboardRow';

export interface LeaderboardPlayerData {
  id: string;
  pseudo: string;
  score: number;
}

/**
 * Organisme : Le Tableau des Scores complet (Leaderboard)
 */
export class Leaderboard {
  private element: HTMLDivElement;

  constructor() {
    this.element = document.createElement('div');
    this.initStyle();
  }

  private initStyle(): void {
    this.element.style.position = 'fixed';
    this.element.style.top = 'var(--spacing-md)';
    this.element.style.right = 'var(--spacing-md)';
    this.element.style.width = '240px';
    this.element.style.backgroundColor = 'rgba(255, 253, 243, 0.85)'; // Crème semi-transparent
    this.element.style.backdropFilter = 'blur(8px)';
    this.element.style.border = '2px solid var(--color-secondary)'; // Bordure lilas
    this.element.style.borderRadius = 'var(--radius-card)';
    this.element.style.padding = 'var(--spacing-md)';
    this.element.style.boxShadow = 'var(--shadow-soft)';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.gap = 'var(--spacing-xs)';
    this.element.style.zIndex = '10'; // Pour passer au-dessus du Canvas
    this.element.style.fontFamily = "'Recursive', 'Segoe UI', sans-serif";
  }

  /**
   * Met à jour dynamiquement les scores affichés
   */
  public update(players: LeaderboardPlayerData[], selfId: string): void {
    this.element.innerHTML = ''; // On vide l'ancien affichage pour rafraîchir

    // 1. Titre du Leaderboard
    const title = document.createElement('div');
    title.innerText = '✨ Top Moelleux ✨';
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    title.style.color = 'var(--color-text-dark)';
    title.style.marginBottom = 'var(--spacing-sm)';
    title.style.borderBottom = '1px solid var(--color-secondary)';
    title.style.paddingBottom = 'var(--spacing-xs)';
    this.element.appendChild(title);

    // 2. Tri des joueurs par score décroissant (les 5 meilleurs)
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score).slice(0, 5);

    // 3. Génération et insertion des lignes (Atomes)
    sortedPlayers.forEach((player, index) => {
      const row = createLeaderboardRow({
        rank: index + 1,
        pseudo: player.pseudo,
        score: player.score,
        isSelf: player.id === selfId,
      });
      this.element.appendChild(row);
    });
  }

  public getElement(): HTMLDivElement {
    return this.element;
  }
}
