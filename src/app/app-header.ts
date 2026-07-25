import { Component, HostListener, input, output, signal } from '@angular/core';
import type { ActiveView } from './app';
import { ThemePreference, ThemeToggle } from './theme-toggle';

@Component({
  selector: 'app-header',
  imports: [ThemeToggle],
  template: `
    <header class="app-header">
      <a class="brand" href="#main-content" aria-label="Gym Progress, ir al contenido">
        <span aria-hidden="true">GP</span>
        <strong>Gym Progress</strong>
      </a>

      <nav class="desktop-nav" aria-label="Navegación principal">
        @for (item of navigation; track item.view) {
          <button
            type="button"
            [class.active]="activeView() === item.view"
            [attr.aria-current]="activeView() === item.view ? 'page' : null"
            (click)="viewChange.emit(item.view)"
          >
            {{ item.label }}
          </button>
        }
      </nav>

      <app-theme-toggle
        [preference]="themePreference()"
        (themeChange)="themeChange.emit($event)"
      />
    </header>

    <nav class="mobile-nav" aria-label="Navegación móvil">
      <button
        type="button"
        [class.active]="activeView() === 'plan' && !trainingMode()"
        [attr.aria-current]="activeView() === 'plan' && !trainingMode() ? 'page' : null"
        (click)="selectPrimaryView('plan')"
      >
        <span aria-hidden="true">▤</span>
        Plan
      </button>
      <button
        type="button"
        class="train-action"
        [class.active]="activeView() === 'plan' && trainingMode()"
        [attr.aria-current]="activeView() === 'plan' && trainingMode() ? 'page' : null"
        (click)="selectTraining()"
      >
        <span aria-hidden="true">▶</span>
        {{ trainLabel() }}
      </button>
      <button
        type="button"
        [class.active]="activeView() === 'progress'"
        [attr.aria-current]="activeView() === 'progress' ? 'page' : null"
        (click)="selectPrimaryView('progress')"
      >
        <span aria-hidden="true">↗</span>
        Progreso
      </button>
      <button
        type="button"
        [class.active]="activeView() === 'routineSummary' || activeView() === 'calculator'"
        [attr.aria-expanded]="moreOpen()"
        aria-controls="mobile-more-menu"
        (click)="moreOpen.set(!moreOpen())"
      >
        <span aria-hidden="true">•••</span>
        Más
      </button>
    </nav>

    @if (moreOpen()) {
      <section id="mobile-more-menu" class="mobile-more-menu" aria-label="Más secciones">
        <button type="button" (click)="selectMoreView('routineSummary')">Resumen</button>
        <button type="button" (click)="selectMoreView('calculator')">Fuerza</button>
      </section>
    }
  `,
  styleUrl: './app-header.css',
})
export class AppHeader {
  public readonly activeView = input.required<ActiveView>();
  public readonly themePreference = input.required<ThemePreference>();
  public readonly trainingMode = input(false);
  public readonly trainLabel = input('Entrenar');
  public readonly viewChange = output<ActiveView>();
  public readonly themeChange = output<ThemePreference>();
  public readonly train = output<void>();
  protected readonly moreOpen = signal(false);

  protected readonly navigation: Array<{ view: ActiveView; label: string }> = [
    { view: 'plan', label: 'Plan' },
    { view: 'routineSummary', label: 'Resumen' },
    { view: 'progress', label: 'Progreso' },
    { view: 'calculator', label: 'Fuerza' },
  ];

  protected selectMoreView(view: ActiveView): void {
    this.moreOpen.set(false);
    this.viewChange.emit(view);
  }

  protected selectPrimaryView(view: ActiveView): void {
    this.moreOpen.set(false);
    this.viewChange.emit(view);
  }

  protected selectTraining(): void {
    this.moreOpen.set(false);
    this.train.emit();
  }

  @HostListener('document:keydown.escape')
  protected closeMoreMenu(): void {
    this.moreOpen.set(false);
  }
}
