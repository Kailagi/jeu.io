import { createMenuCard } from '../organisms/MenuCard';

/**
 * Template : Écran d'Accueil Complet
 */
export interface HomeTemplateOptions {
    onPlaySubmit: (pseudo: string) => void;
}

export function createHomeTemplate(options: HomeTemplateOptions): HTMLDivElement {
    const screen = document.createElement('div');

    // Style de l'écran complet (Design Tokens)
    screen.style.position = 'fixed';
    screen.style.top = '0';
    screen.style.left = '0';
    screen.style.width = '100vw';
    screen.style.height = '100vh';
    screen.style.backgroundColor = 'var(--color-bg-light)'; // Fond rose pâle
    screen.style.display = 'flex';
    screen.style.justifyContent = 'center';
    screen.style.alignItems = 'center';
    screen.style.padding = 'var(--spacing-md)';
    screen.style.boxSizing = 'border-box';
    screen.style.overflow = 'hidden';
    screen.style.fontFamily = "'Recursive', 'Segoe UI', sans-serif";

    // Un petit effet de fondu au chargement pour le côté doux (girly)
    screen.style.opacity = '0';
    screen.style.transition = 'opacity 0.5s ease-in-out';
    setTimeout(() => screen.style.opacity = '1', 50);

    // Intégration de l'Organisme MenuCard
    const menuCard = createMenuCard({
        onStartGame: (pseudo) => {
            options.onPlaySubmit(pseudo);
        }
    });

    // On glisse la Card au centre de notre écran
    screen.appendChild(menuCard);

    return screen;
}