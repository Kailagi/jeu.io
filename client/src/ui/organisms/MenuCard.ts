import { createLoginForm } from '../molecules/LoginForm';

/**
 * Organisme : Boîte de dialogue du Menu Principal (Titre + Formulaire)
 */
export interface MenuCardOptions {
  onStartGame: (pseudo: string) => void;
}

export function createMenuCard(options: MenuCardOptions): HTMLDivElement {
  const card = document.createElement('div');

  // Style de la Card (Design Tokens)
  card.style.backgroundColor = 'var(--color-cream)';
  card.style.border = '3px solid var(--color-secondary)'; // Bordure Lilas doux
  card.style.borderRadius = 'var(--radius-card)';
  card.style.padding = 'var(--spacing-lg)';
  card.style.boxShadow = '0 12px 32px rgba(227, 215, 255, 0.25)';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.alignItems = 'center';
  card.style.gap = 'var(--spacing-lg)';
  card.style.width = '100%';
  card.style.maxWidth = '400px';
  card.style.textAlign = 'center';
  card.style.boxSizing = 'border-box';

  // 1. Titre du Jeu
  const title = document.createElement('h1');
  title.innerText = '🌸 PastelPuff.io 🌸';
  title.style.color = 'var(--color-text-dark)';
  title.style.margin = '0';
  title.style.fontSize = '32px';
  title.style.fontFamily = "'Recursive', 'Segoe UI', sans-serif";

  // 2. Sous-titre / Règles du jeu rapides
  const subtitle = document.createElement('p');
  subtitle.innerText =
    'Deviens le petit pouf de coton le plus fluffy ! Propulse tes adversaires hors de la table de salon de thé. 🧁';
  subtitle.style.color = 'var(--color-text-dark)';
  subtitle.style.fontSize = '14px';
  subtitle.style.margin = '0';
  subtitle.style.lineHeight = '1.5';
  subtitle.style.opacity = '0.8';

  // 3. Inclusion de la Molécule LoginForm
  const loginForm = createLoginForm({
    onPlay: (pseudo) => {
      options.onStartGame(pseudo);
    },
  });

  // Assemblage dans l'organisme
  card.appendChild(title);
  card.appendChild(subtitle);
  card.appendChild(loginForm);

  return card;
}
