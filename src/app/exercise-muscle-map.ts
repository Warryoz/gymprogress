import { Component, input } from '@angular/core';

const MUSCLE_IMAGE_BY_NAME: Readonly<Record<string, string>> = {
  'Pectoral mayor': 'pectoralis-major',
  'Deltoide anterior': 'anterior-deltoid',
  'Deltoide lateral': 'lateral-deltoid',
  'Deltoide posterior': 'posterior-deltoid',
  Tríceps: 'triceps-brachii',
  Bíceps: 'biceps-brachii',
  Braquial: 'brachialis',
  Braquiorradial: 'brachioradialis',
  'Dorsal ancho': 'latissimus-dorsi',
  Romboides: 'rhomboids',
  Trapecio: 'trapezius',
  'Erectores espinales': 'erector-spinae',
  'Glúteo mayor': 'gluteus-maximus',
  'Glúteo medio': 'gluteus-medius',
  Cuádriceps: 'quadriceps',
  Isquiotibiales: 'hamstrings',
  Gemelos: 'gastrocnemius',
  'Flexores del antebrazo': 'forearm-flexors',
};

@Component({
  selector: 'app-exercise-muscle-map',
  template: `
    <div class="muscle-gallery" aria-label="Imágenes de los músculos trabajados">
      @for (muscle of primary(); track muscle) {
        <article class="muscle-image-card primary">
          <img [src]="imageUrl(muscle)" [alt]="'Músculo principal: ' + muscle" loading="lazy" />
          <span>{{ muscle }}</span>
          <small>Principal</small>
        </article>
      }
      @for (muscle of secondary(); track muscle) {
        <article class="muscle-image-card">
          <img [src]="imageUrl(muscle)" [alt]="'Músculo secundario: ' + muscle" loading="lazy" />
          <span>{{ muscle }}</span>
          <small>Secundario</small>
        </article>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .muscle-gallery {
      display: grid;
      grid-auto-columns: minmax(108px, 1fr);
      grid-auto-flow: column;
      gap: 8px;
      overflow-x: auto;
      padding: 2px 2px 8px;
      scroll-snap-type: x proximity;
      scrollbar-width: thin;
    }
    .muscle-image-card {
      position: relative;
      overflow: hidden;
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 8px;
      background: color-mix(in srgb, var(--surface) 76%, transparent);
      scroll-snap-align: start;
    }
    .muscle-image-card.primary {
      border-color: color-mix(in srgb, var(--accent) 52%, var(--border));
      background: color-mix(in srgb, var(--accent) 8%, var(--surface));
    }
    img {
      display: block;
      width: 100%;
      height: 96px;
      object-fit: contain;
      filter: drop-shadow(0 8px 12px rgb(0 0 0 / 20%));
    }
    span, small { display: block; overflow-wrap: anywhere; }
    span { margin-top: 7px; color: var(--text-primary); font-size: .7rem; font-weight: 800; }
    small { margin-top: 2px; color: var(--text-secondary); font-size: .6rem; font-weight: 750; text-transform: uppercase; }
    .primary small { color: color-mix(in srgb, var(--accent) 82%, var(--text-primary)); }
  `,
})
export class ExerciseMuscleMap {
  public readonly primary = input.required<readonly string[]>();
  public readonly secondary = input.required<readonly string[]>();

  protected imageUrl(muscle: string): string {
    const image = MUSCLE_IMAGE_BY_NAME[muscle];
    return image ? `muscles/${image}.webp` : '';
  }
}
