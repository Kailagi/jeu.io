/**
 * Atome : Une ligne du tableau des scores
 */
export interface LeaderboardRowOptions {
    rank: number;
    pseudo: string;
    score: number;
    isSelf: boolean;
}

export function createLeaderboardRow(options: LeaderboardRowOptions): HTMLDivElement {
    const row = document.createElement('div');

    // Style de la ligne (Design Tokens)
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = 'var(--spacing-sm) var(--spacing-md)';
    row.style.borderRadius = '12px';
    row.style.fontSize = '14px';
    row.style.fontWeight = options.rank === 1 || options.isSelf ? 'bold' : 'normal';
    row.style.fontFamily = "'Recursive', 'Segoe UI', sans-serif";
    row.style.transition = 'all 0.2s ease';

    // Mettre en valeur notre propre ligne ou le premier
    if (options.isSelf) {
        row.style.backgroundColor = 'rgba(243, 179, 179, 0.2)'; // Fond rose poudré léger
        row.style.border = '1px dashed var(--color-primary)';
    } else if (options.rank === 1) {
        row.style.color = '#B58913'; // Texte doré plus sombre pour la lisibilité
    } else {
        row.style.color = 'var(--color-text-dark)';
    }

    // Contenu gauche (Rang + Pseudo)
    const leftZone = document.createElement('span');
    const crown = options.rank === 1 ? '👑 ' : '';
    leftZone.innerText = `${options.rank}. ${crown}${options.pseudo}`;

    // Contenu droit (Score)
    const rightZone = document.createElement('span');
    rightZone.innerText = `${options.score} pts`;
    rightZone.style.opacity = '0.8';

    row.appendChild(leftZone);
    row.appendChild(rightZone);

    return row;
}