/**
 * Atome : Bouton Principal Rose Poudré
 */
export interface ButtonOptions {
  label: string;
  onClick: () => void;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const button = document.createElement('button');
  button.innerText = options.label;

  // Application des styles via les Design Tokens
  button.style.backgroundColor = 'var(--color-primary)';
  button.style.color = 'var(--color-text-dark)';
  button.style.border = 'none';
  button.style.borderRadius = 'var(--radius-button)';
  button.style.padding = 'var(--spacing-md) var(--spacing-lg)';
  button.style.fontSize = '16px';
  button.style.fontWeight = 'bold';
  button.style.cursor = 'pointer';
  button.style.boxShadow = 'var(--shadow-soft)';
  button.style.transition = 'all 0.2s ease-in-out';
  button.style.fontFamily = "'Recursive', 'Segoe UI', sans-serif";

  // Effets de survol (Hover)
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = 'var(--color-primary-hover)';
    button.style.transform = 'scale(1.03)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = 'var(--color-primary)';
    button.style.transform = 'scale(1)';
  });

  // Effet d'enfoncement (Active)
  button.addEventListener('mousedown', () => {
    button.style.transform = 'scale(0.98)';
  });

  button.addEventListener('mouseup', () => {
    button.style.transform = 'scale(1.03)';
  });

  button.addEventListener('click', options.onClick);

  return button;
}
