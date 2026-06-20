import { createHomeTemplate } from './ui/templates/HomeTemplate';

// On attend que le DOM soit complètement chargé
window.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app');

    if (!appContainer) {
        console.error("Le conteneur principal #app est introuvable !");
        return;
    }

    // Initialisation et affichage du Écran d'Accueil (Template)
    const homeScreen = createHomeTemplate({
        onPlaySubmit: (pseudo: string) => {
            console.log(`🌸 Succès ! Le joueur veut lancer la partie avec le pseudo : ${pseudo}`);

            // C'est ici que plus tard, on masquera le menu pour afficher le Canvas du jeu
            alert(`Bienvenue ${pseudo} ! Connexion au serveur PastelPuff en cours...`);
        }
    });

    // Injection de l'interface dans la page HTML
    appContainer.appendChild(homeScreen);
});