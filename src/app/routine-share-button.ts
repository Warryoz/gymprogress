import { Component, signal, input } from '@angular/core';
import { RoutineShareModal } from './routine-share-modal';
import { RoutineShareData } from './routine-share-text.util';

@Component({
  selector: 'app-routine-share-button',
  imports: [RoutineShareModal],
  template: `
    <button
      type="button"
      class="share-button"
      aria-haspopup="dialog"
      [attr.aria-expanded]="open()"
      aria-label="Compartir"
      title="Compartir"
      (click)="openModal($event)"
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 16V3m-4 4 4-4 4 4M5 13v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
      </svg>
    </button>

    @if (open()) {
      <app-routine-share-modal [routine]="routine()" (closed)="closeModal()" />
    }
  `,
  styleUrl: './routine-share-button.css',
})
export class RoutineShareButton {
  public readonly routine = input.required<RoutineShareData>();
  protected readonly open = signal(false);
  private trigger: HTMLButtonElement | null = null;

  protected openModal(event: MouseEvent): void {
    this.trigger = event.currentTarget as HTMLButtonElement;
    this.open.set(true);
  }

  protected closeModal(): void {
    this.open.set(false);
    window.setTimeout(() => this.trigger?.focus());
  }
}
