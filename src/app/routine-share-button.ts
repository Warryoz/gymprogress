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
      aria-label="Compartir rutina"
      (click)="openModal($event)"
    >
      <span aria-hidden="true">↗</span>
      Compartir rutina
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
