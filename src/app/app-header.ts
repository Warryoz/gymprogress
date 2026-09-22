import { Component, HostListener, input, output, signal } from '@angular/core';
import type { ActiveView } from './app';

@Component({
  selector: 'app-header',
  template: `
    <header class="app-header">
      <a class="brand" href="#main-content" aria-label="gerogym, ir al contenido">
        <span aria-hidden="true">GG</span>
        <strong>gerogym</strong>
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
        <details class="desktop-more"><summary>Más</summary><div class="more-links"><button type="button" (click)="viewChange.emit('progress'); $any($event.target).closest('details').open = false">Progreso</button><button type="button" (click)="viewChange.emit('dictionary'); $any($event.target).closest('details').open = false">Diccionario</button></div></details>
      </nav>
      <button class="dictionary-shortcut" type="button" [class.active]="activeView() === 'dictionary'" (click)="selectPrimaryView('dictionary')"><span aria-hidden="true">▤</span> Diccionario</button>
    </header>

    <nav class="mobile-nav" aria-label="Navegación móvil">
      <button
        type="button"
        [class.active]="activeView() === 'plan'"
        [attr.aria-current]="activeView() === 'plan' ? 'page' : null"
        (click)="selectPrimaryView('plan')"
      >
        <span aria-hidden="true">▤</span>
        Plan
      </button>

      <button
        type="button"
        [class.active]="activeView() === 'calculator'"
        [attr.aria-current]="activeView() === 'calculator' ? 'page' : null"
        (click)="selectPrimaryView('calculator')"
      >
        <span aria-hidden="true">↗</span>
        Fuerza
      </button>
      <button
        type="button"
        [class.active]="activeView() === 'routineSummary' || activeView() === 'progress' || activeView() === 'dictionary'"
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
        <button type="button" (click)="selectMoreView('progress')">Progreso</button>
        <button type="button" (click)="selectMoreView('dictionary')">Diccionario</button>
      </section>
    }
  `,
  styleUrl: './app-header.css',
})
export class AppHeader {
  public readonly activeView = input.required<ActiveView>();
  public readonly viewChange = output<ActiveView>();
  protected readonly moreOpen = signal(false);

  protected readonly navigation: Array<{ view: ActiveView; label: string }> = [
    { view: 'plan', label: 'Plan' },
    { view: 'routineSummary', label: 'Resumen' },

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



  @HostListener('document:keydown.escape')
  protected closeMoreMenu(): void {
    this.moreOpen.set(false);
  }
}
