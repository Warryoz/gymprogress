import { Component, input, output } from '@angular/core';

export type ThemePreference = 'dark' | 'light' | 'system';

@Component({
  selector: 'app-theme-toggle',
  template: `
    <label class="theme-control">
      <span>Tema</span>
      <select
        aria-label="Tema de la aplicación"
        [value]="preference()"
        (change)="changeTheme($event)"
      >
        <option value="dark">Oscuro</option>
        <option value="light">Claro</option>
        <option value="system">Sistema</option>
      </select>
    </label>
  `,
  styles: `
    :host { display: block; }
    .theme-control { display: flex; align-items: center; gap: var(--space-2); }
    .theme-control > span { color: var(--text-secondary); font-size: .82rem; }
    select {
      min-height: 44px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0 var(--space-3);
      color: var(--text-primary);
      background: var(--surface-elevated);
      font: inherit;
      font-weight: 700;
    }
    select:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--accent) 32%, transparent);
      outline-offset: 2px;
    }
    @media (max-width: 639px) {
      .theme-control > span { position: absolute; width: 1px; height: 1px; overflow: hidden; }
      select { max-width: 112px; }
    }
  `,
})
export class ThemeToggle {
  public readonly preference = input.required<ThemePreference>();
  public readonly themeChange = output<ThemePreference>();

  protected changeTheme(event: Event): void {
    this.themeChange.emit((event.target as HTMLSelectElement).value as ThemePreference);
  }
}
