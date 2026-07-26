import { Injectable } from '@angular/core';

export interface RoutineShareImage {
  blob: Blob;
  file: File;
  filename: string;
}

const EXPORT_WIDTH = 1080;
const MAX_PAGE_HEIGHT = 7000;

@Injectable({ providedIn: 'root' })
export class RoutineShareService {
  public async generatePngs(
    element: HTMLElement,
    routineTitle: string,
  ): Promise<RoutineShareImage[]> {
    await this.waitForFonts();
    const captureSource = element.cloneNode(true) as HTMLElement;
    this.prepareClone(captureSource);
    document.body.appendChild(captureSource);

    try {
      if (captureSource.scrollHeight <= MAX_PAGE_HEIGHT) {
        return [await this.renderElement(captureSource, this.filename(routineTitle))];
      }

      return this.renderPaged(captureSource, routineTitle);
    } finally {
      captureSource.remove();
    }
  }

  public async copyImage(images: readonly RoutineShareImage[]): Promise<void> {
    if (images.length !== 1) {
      throw new Error(
        'La rutina ocupa varias imágenes. Descárgalas o compártelas juntas desde el dispositivo.',
      );
    }

    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      throw new Error('Este navegador no permite copiar imágenes. Puedes descargar el PNG.');
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': images[0].blob,
      }),
    ]);
  }

  public async copyText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-10000px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      if (!document.execCommand('copy')) {
        throw new Error('No fue posible copiar la rutina.');
      }
    } finally {
      textarea.remove();
    }
  }

  public download(images: readonly RoutineShareImage[]): void {
    images.forEach((image, index) => {
      const url = URL.createObjectURL(image.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = image.filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), index * 100);
    });
  }

  public async share(
    images: readonly RoutineShareImage[],
    title: string,
    text: string,
  ): Promise<void> {
    if (!navigator.share) {
      throw new Error('El menú para compartir no está disponible en este navegador.');
    }

    const files = images.map((image) => image.file);
    const fileData: ShareData = { title, text, files };

    if (!navigator.canShare || navigator.canShare(fileData)) {
      await navigator.share(fileData);
      return;
    }

    await navigator.share({ title, text });
  }

  private async renderPaged(
    element: HTMLElement,
    routineTitle: string,
  ): Promise<RoutineShareImage[]> {
    const exerciseNodes = Array.from(
      element.querySelectorAll<HTMLElement>('[data-share-exercise]'),
    );

    if (!exerciseNodes.length) {
      return [await this.renderElement(element, this.filename(routineTitle))];
    }

    const groups: number[][] = [];
    let current: number[] = [];
    let currentHeight = 0;
    const availableHeight = MAX_PAGE_HEIGHT - 850;

    exerciseNodes.forEach((exercise, index) => {
      const height = Math.max(exercise.offsetHeight, 1) + 24;

      if (current.length && currentHeight + height > availableHeight) {
        groups.push(current);
        current = [];
        currentHeight = 0;
      }

      current.push(index);
      currentHeight += height;
    });

    if (current.length) {
      groups.push(current);
    }

    const images: RoutineShareImage[] = [];

    for (let pageIndex = 0; pageIndex < groups.length; pageIndex += 1) {
      const clone = element.cloneNode(true) as HTMLElement;
      const included = new Set(groups[pageIndex]);
      const clonedExercises = Array.from(
        clone.querySelectorAll<HTMLElement>('[data-share-exercise]'),
      );

      clonedExercises.forEach((exercise, index) => {
        if (!included.has(index)) {
          exercise.remove();
        }
      });

      const pageLabel = clone.querySelector<HTMLElement>('[data-share-page-label]');
      if (pageLabel) {
        pageLabel.textContent = `${routineTitle} — ${pageIndex + 1} de ${groups.length}`;
        pageLabel.style.display = 'block';
      }

      this.prepareClone(clone);
      document.body.appendChild(clone);

      try {
        images.push(
          await this.renderElement(
            clone,
            this.filename(routineTitle, pageIndex + 1, groups.length),
          ),
        );
      } finally {
        clone.remove();
      }
    }

    return images;
  }

  private async renderElement(element: HTMLElement, filename: string): Promise<RoutineShareImage> {
    const { toBlob } = await import('html-to-image');
    const height = Math.ceil(element.scrollHeight);
    const blob = await toBlob(element, {
      backgroundColor: '#0f1115',
      cacheBust: true,
      height,
      pixelRatio: 2,
      skipAutoScale: false,
      width: EXPORT_WIDTH,
    });

    if (!blob) {
      throw new Error('No fue posible generar la imagen de la rutina.');
    }

    return {
      blob,
      filename,
      file: new File([blob], filename, { type: 'image/png' }),
    };
  }

  private prepareClone(clone: HTMLElement): void {
    Object.assign(clone.style, {
      height: 'auto',
      left: '0',
      maxHeight: 'none',
      overflow: 'visible',
      pointerEvents: 'none',
      position: 'fixed',
      top: '0',
      width: `${EXPORT_WIDTH}px`,
      zIndex: '-2147483647',
    });
  }

  private filename(title: string, page?: number, total?: number): string {
    const safeTitle =
      title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLocaleLowerCase() || 'rutina';
    const suffix = page && total ? `-${page}-de-${total}` : '';
    return `${safeTitle}${suffix}-gym-progress.png`;
  }

  private async waitForFonts(): Promise<void> {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
  }
}
