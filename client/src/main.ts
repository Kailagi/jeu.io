import { createHomeTemplate } from './ui/templates/HomeTemplate';
import { GameEngine } from './engine/GameEngine';
import { Leaderboard } from './ui/organisms/Leaderboard';
import { ScoreHUD } from './ui/atoms/ScoreHUD';

window.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app');

    if (!appContainer) {
        console.error("Le conteneur principal #app est introuvable !");
        return;
    }

    // 1. Initialisation et affichage de l'Écran d'Accueil
    const homeScreen = createHomeTemplate({
        onPlaySubmit: (pseudo: string) => {
            homeScreen.style.opacity = '0';

            setTimeout(() => {
                homeScreen.remove();
                setupGame(appContainer, pseudo);
            }, 500);
        }
    });

    appContainer.appendChild(homeScreen);
});

function setupGame(container: HTMLElement, pseudo: string): void {
    // 1. Création dynamique du Canvas HTML5
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.display = 'block';
    canvas.style.zIndex = '1';
    container.appendChild(canvas);

    // 2. Création et injection du Leaderboard
    const leaderboard = new Leaderboard();
    container.appendChild(leaderboard.getElement());

    leaderboard.update([
        { id: '1', pseudo: 'FraisePuff 🍓', score: 450 },
        { id: '2', pseudo: 'ChocoMint 🌿', score: 320 },
        { id: 'self', pseudo: pseudo, score: 0 },
        { id: '4', pseudo: 'Marshmallow ☁️', score: 15 }
    ], 'self');

    // 3. Création et injection du Compteur de Masse (Score HUD)
    const scoreHUD = new ScoreHUD();
    container.appendChild(scoreHUD.getElement());

    // 4. Démarrage du moteur de jeu local avec sa jauge
    const engine = new GameEngine(canvas, pseudo);
    engine.start();

    console.log(`🚀 Fusion réussie ! Tout est synchronisé sur la branche globale.`);
}