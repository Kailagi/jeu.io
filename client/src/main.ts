import { createHomeTemplate } from './ui/templates/HomeTemplate';
import { GameEngine } from './engine/GameEngine';

window.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app');

    if (!appContainer) {
        console.error("Le conteneur principal #app est introuvable !");
        return;
    }

    // 1. Initialisation et affichage de l'Écran d'Accueil
    const homeScreen = createHomeTemplate({
        onPlaySubmit: (pseudo: string) => {
            // Effet visuel girly : transition de disparition en douceur du menu
            homeScreen.style.opacity = '0';

            setTimeout(() => {
                // On supprime proprement le menu du DOM
                homeScreen.remove();

                // On lance la phase d'initialisation du jeu
                setupGame(appContainer, pseudo);
            }, 500); // Durée calée sur la transition CSS du template (0.5s)
        }
    });

    appContainer.appendChild(homeScreen);
});

/**
 * Configure le Canvas et démarre le moteur de jeu local
 */
function setupGame(container: HTMLElement, pseudo: string): void {
    // 1. Création dynamique de l'élément HTML5 Canvas
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.display = 'block';
    canvas.style.zIndex = '1';

    // On glisse le canvas dans la page
    container.appendChild(canvas);

    // 2. Instanciation et démarrage du moteur graphique et physique local
    const engine = new GameEngine(canvas, pseudo);
    engine.start();

    console.log(`🎮 Moteur lancé avec succès pour le joueur : ${pseudo}`);
}