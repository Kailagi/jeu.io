/**
 * Atome : Champ de saisie du pseudo
 */
export interface InputOptions {
    placeholder: string;
    maxLength?: number;
}

export function createInput(options: InputOptions): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = options.placeholder;
    input.maxLength = options.maxLength || 15;

    // Application des styles via les Design Tokens
    input.style.backgroundColor = 'var(--color-cream)';
    input.style.color = 'var(--color-text-dark)';
    input.style.border = '2px solid var(--color-primary)';
    input.style.borderRadius = 'var(--radius-button)';
    input.style.padding = 'var(--spacing-md)';
    input.style.fontSize = '16px';
    input.style.textAlign = 'center';
    input.style.outline = 'none';
    input.style.boxShadow = 'var(--shadow-soft)';
    input.style.transition = 'all 0.2s ease-in-out';
    input.style.fontFamily = "'Recursive', 'Segoe UI', sans-serif";
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';

    // Effets de Focus (Quand on clique dedans)
    input.addEventListener('focus', () => {
        input.style.borderColor = 'var(--color-primary-hover)';
        input.style.boxShadow = '0 0 12px rgba(243, 179, 179, 0.4)';
        input.style.backgroundColor = '#FFFFFF';
    });

    input.addEventListener('blur', () => {
        input.style.borderColor = 'var(--color-primary)';
        input.style.boxShadow = 'var(--shadow-soft)';
        input.style.backgroundColor = 'var(--color-cream)';
    });

    return input;
}