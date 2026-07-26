import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RoutineShareCard } from './routine-share-card';
import { RoutineShareImage, RoutineShareService } from './routine-share.service';
import { RoutineShareData, buildRoutineShareText } from './routine-share-text.util';

type ShareFormat = 'image' | 'text';

@Component({
  selector: 'app-routine-share-modal',
  imports: [RoutineShareCard],
  template: `
    <div class="backdrop" (mousedown)="closeFromBackdrop($event)">
      <section
        #dialog
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-share-title"
        aria-describedby="routine-share-description"
      >
        <header class="modal-header">
          <div>
            <p>Compartir</p>
            <h2 id="routine-share-title">Tu rutina está lista</h2>
            <span id="routine-share-description">
              Elige una imagen limpia o una versión de texto para enviar.
            </span>
          </div>
          <button
            #closeButton
            type="button"
            class="icon-button"
            aria-label="Cerrar vista previa"
            (click)="requestClose()"
          >
            ×
          </button>
        </header>

        <div class="format-switch" role="tablist" aria-label="Formato para compartir">
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="format() === 'image'"
            [class.active]="format() === 'image'"
            (click)="format.set('image')"
          >
            Imagen vertical
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="format() === 'text'"
            [class.active]="format() === 'text'"
            (click)="format.set('text')"
          >
            Texto
          </button>
        </div>

        <div class="preview" [class.text-preview]="format() === 'text'">
          @if (format() === 'image') {
            <app-routine-share-card [routine]="routine()" />
          } @else {
            <pre>{{ shareText }}</pre>
          }
        </div>

        <div class="status" aria-live="polite">
          @if (busy()) {
            <span class="spinner" aria-hidden="true"></span>
            <span>Generando imagen en alta resolución…</span>
          } @else if (feedback()) {
            <span>{{ feedback() }}</span>
          }
        </div>

        <footer class="actions">
          @if (format() === 'image') {
            <button
              type="button"
              [disabled]="busy()"
              aria-label="Copiar la rutina como imagen"
              (click)="copyImage()"
            >
              Copiar imagen
            </button>
            <button
              type="button"
              [disabled]="busy()"
              aria-label="Descargar la rutina como PNG"
              (click)="downloadPng()"
            >
              Descargar PNG
            </button>
            <button
              type="button"
              class="primary"
              [disabled]="busy()"
              aria-label="Compartir la rutina"
              (click)="shareRoutine()"
            >
              Compartir
            </button>
          }
          <button
            type="button"
            [disabled]="busy()"
            aria-label="Copiar la rutina como texto"
            (click)="copyAsText()"
          >
            Copiar como texto
          </button>
          <button type="button" class="close-action" [disabled]="busy()" (click)="requestClose()">
            Cerrar
          </button>
        </footer>
      </section>
    </div>

    <div #exportCard class="export-stage" aria-hidden="true" inert>
      <app-routine-share-card
        [routine]="routine()"
        [exportMode]="true"
      />
    </div>
  `,
  styleUrl: './routine-share-modal.css',
})
export class RoutineShareModal implements AfterViewInit, OnDestroy {
  public readonly routine = input.required<RoutineShareData>();
  public readonly closed = output<void>();
  protected readonly format = signal<ShareFormat>('image');
  protected readonly busy = signal(false);
  protected readonly feedback = signal('');
  private readonly shareService = inject(RoutineShareService);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly exportCard = viewChild<ElementRef<HTMLElement>>('exportCard');
  private generatedImages: Promise<RoutineShareImage[]> | null = null;
  private readonly previousBodyOverflow = document.body.style.overflow;

  protected get shareText(): string {
    return buildRoutineShareText(this.routine());
  }

  public ngAfterViewInit(): void {
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => this.closeButton()?.nativeElement.focus());
  }

  public ngOnDestroy(): void {
    document.body.style.overflow = this.previousBodyOverflow;
  }

  @HostListener('document:keydown', ['$event'])
  public handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !this.busy()) {
      event.preventDefault();
      this.requestClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = Array.from(
      this.dialog()?.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );

    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected requestClose(): void {
    if (!this.busy()) {
      this.closed.emit();
    }
  }

  protected closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  protected async copyImage(): Promise<void> {
    await this.runImageAction(async (images) => {
      await this.shareService.copyImage(images);
      this.feedback.set('Imagen copiada');
    });
  }

  protected async downloadPng(): Promise<void> {
    await this.runImageAction(async (images) => {
      this.shareService.download(images);
      this.feedback.set(
        images.length === 1
          ? 'PNG descargado'
          : `${images.length} imágenes descargadas y numeradas`,
      );
    });
  }

  protected async shareRoutine(): Promise<void> {
    await this.runImageAction(async (images) => {
      await this.shareService.share(images, this.routine().title, this.shareText);
      this.feedback.set('Rutina compartida');
    });
  }

  protected async copyAsText(): Promise<void> {
    this.feedback.set('');

    try {
      await this.shareService.copyText(this.shareText);
      this.feedback.set('Rutina copiada');
    } catch (error) {
      this.feedback.set(this.errorMessage(error));
    }
  }

  private async runImageAction(
    action: (images: readonly RoutineShareImage[]) => Promise<void>,
  ): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    this.feedback.set('');

    try {
      await action(await this.images());
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.feedback.set(this.errorMessage(error));
      }
    } finally {
      this.busy.set(false);
    }
  }

  private images(): Promise<RoutineShareImage[]> {
    if (!this.generatedImages) {
      const element = this.exportCard()?.nativeElement.querySelector<HTMLElement>(
        '[data-routine-share-export]',
      );

      if (!element) {
        return Promise.reject(new Error('La vista previa todavía no está lista.'));
      }

      this.generatedImages = this.shareService
        .generatePngs(element, this.routine().title)
        .catch((error: unknown) => {
          this.generatedImages = null;
          throw error;
        });
    }

    return this.generatedImages;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'No fue posible completar esta acción. Descarga el PNG como alternativa.';
  }
}
