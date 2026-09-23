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
import { RoutineShareImage, RoutineShareService } from './routine-share.service';
import { WorkoutReportCard } from './workout-report-card';
import { WorkoutReportData, buildWorkoutReportText } from './workout-report';

@Component({
  selector: 'app-workout-report-modal',
  imports: [WorkoutReportCard],
  template: `
    <div class="backdrop" (mousedown)="closeFromBackdrop($event)">
      <section #dialog class="modal report-modal" role="dialog" aria-modal="true" aria-labelledby="workout-report-title" aria-describedby="workout-report-description">
        <header class="modal-header">
          <div>
            <p>Tu logro</p>
            <h2 id="workout-report-title">Entrenamiento completado</h2>
            <span id="workout-report-description">Revisa tus resultados y compártelos como imagen.</span>
          </div>
          <button #closeButton type="button" class="icon-button" aria-label="Cerrar reporte" (click)="requestClose()">×</button>
        </header>

        <div class="preview report-preview">
          <app-workout-report-card [report]="report()" />
        </div>

        <div class="status" aria-live="polite">
          @if (busy()) {
            <span class="spinner" aria-hidden="true"></span><span>Preparando tu logro…</span>
          } @else if (feedback()) {
            <span>{{ feedback() }}</span>
          } @else {
            <span>En móvil, “Compartir logro” permite enviarlo a WhatsApp y otras apps.</span>
          }
        </div>

        <footer class="actions">
          <button type="button" [disabled]="busy()" (click)="downloadPng()">Descargar imagen</button>
          <button type="button" [disabled]="busy()" (click)="copyAsText()">Copiar texto</button>
          <button type="button" class="primary" [disabled]="busy()" (click)="shareReport()">Compartir logro</button>
          <button type="button" class="close-action" [disabled]="busy()" (click)="requestClose()">Cerrar</button>
        </footer>
      </section>
    </div>

    <div #exportCard class="export-stage" aria-hidden="true" inert>
      <app-workout-report-card [report]="report()" [exportMode]="true" />
    </div>
  `,
  styleUrls: ['./routine-share-modal.css', './workout-report-modal.css'],
})
export class WorkoutReportModal implements AfterViewInit, OnDestroy {
  public readonly report = input.required<WorkoutReportData>();
  public readonly closed = output<void>();
  protected readonly busy = signal(false);
  protected readonly feedback = signal('');
  private readonly shareService = inject(RoutineShareService);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly exportCard = viewChild<ElementRef<HTMLElement>>('exportCard');
  private generatedImages: Promise<RoutineShareImage[]> | null = null;
  private readonly previousBodyOverflow = document.body.style.overflow;

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
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      this.dialog()?.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [],
    );
    if (!focusable.length) return;
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
    if (!this.busy()) this.closed.emit();
  }

  protected closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.requestClose();
  }

  protected async downloadPng(): Promise<void> {
    await this.runImageAction(async (images) => {
      this.shareService.download(images);
      this.feedback.set('Imagen descargada');
    });
  }

  protected async shareReport(): Promise<void> {
    await this.runImageAction(async (images) => {
      const title = `${this.report().title} completado`;
      await this.shareService.share(images, title, buildWorkoutReportText(this.report()));
      this.feedback.set('Logro compartido');
    });
  }

  protected async copyAsText(): Promise<void> {
    this.feedback.set('');
    try {
      await this.shareService.copyText(buildWorkoutReportText(this.report()));
      this.feedback.set('Resumen copiado');
    } catch (error) {
      this.feedback.set(this.errorMessage(error));
    }
  }

  private async runImageAction(action: (images: readonly RoutineShareImage[]) => Promise<void>): Promise<void> {
    if (this.busy()) return;
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
      const element = this.exportCard()?.nativeElement.querySelector<HTMLElement>('[data-workout-report-export]');
      if (!element) return Promise.reject(new Error('El reporte todavía no está listo.'));
      this.generatedImages = this.shareService
        .generatePngs(element, `${this.report().title}-logro`)
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
      : 'No fue posible completar la acción. Descarga la imagen como alternativa.';
  }
}
