import { createInput } from '../atoms/Input';
import { createButton } from '../atoms/Button';

/**
 * Molécule : Formulaire de Connexion (Pseudo + Bouton Jouer)
 */
export interface LoginFormOptions {
  onPlay: (pseudo: string) => void;
}

export function createLoginForm(options: LoginFormOptions): HTMLDivElement {
  const container = document.createElement('div');

  // Style du conteneur de la molécule
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = 'var(--spacing-md)';
  container.style.width = '100%';
  container.style.maxWidth = '320px';
  container.style.margin = '0 auto';

  // Importation et création de l'Atome Input
  const pseudoInput = createInput({
    placeholder: 'Entre ton joli pseudo...',
    maxLength: 12,
  });

  // Importation et création de l'Atome Bouton
  const playButton = createButton({
    label: "🌸 Entrer dans l'arène",
    onClick: () => {
      const pseudoValue = pseudoInput.value.trim();
      // On évite les pseudos vides
      if (pseudoValue !== '') {
        options.onPlay(pseudoValue);
      } else {
        pseudoInput.style.borderColor = '#FF8A8A'; // Rouge pastel temporaire en cas d'erreur
        setTimeout(() => (pseudoInput.style.borderColor = 'var(--color-primary)'), 1000);
      }
    },
  });

  // Assemblage des atomes dans notre molécule
  container.appendChild(pseudoInput);
  container.appendChild(playButton);

  return container;
}
