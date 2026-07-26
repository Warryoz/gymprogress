import { Component, input } from '@angular/core';
import {
  RoutineShareData,
  routinePrescription,
  totalRoutineSets,
} from './routine-share-text.util';

@Component({
  selector: 'app-routine-share-card',
  template: `
    <article
      class="share-card"
      data-routine-share-export
      [class.export-card]="exportMode()"
    >
      <header>
        <div class="brand">
          <span aria-hidden="true">GP</span>
          <strong>Gym Progress</strong>
        </div>
        <p>RUTINA DE ENTRENAMIENTO</p>
        <h2>{{ routine().title }}</h2>
        <div class="context">
          <span>Semana {{ routine().week }} de {{ routine().totalWeeks }}</span>
          <i aria-hidden="true"></i>
          <span>{{ routine().phase }}</span>
        </div>
        @if (routine().focus && routine().focus !== routine().phase) {
          <p class="focus">{{ routine().focus }}</p>
        }
      </header>

      <section class="summary" aria-label="Resumen de la rutina">
        <div>
          <strong>{{ routine().rows.length }}</strong>
          <span>Ejercicios</span>
        </div>
        <div>
          <strong>{{ totalSets(routine().rows) }}</strong>
          <span>Series</span>
        </div>
        <div>
          <strong>{{ routine().estimatedDuration }}</strong>
          <span>Duración estimada</span>
        </div>
      </section>

      <section class="exercise-list" aria-label="Ejercicios">
        @for (row of routine().rows; track row.sourceRow; let index = $index) {
          <article class="exercise" data-share-exercise>
            <span class="order">{{ index + 1 }}</span>
            <div class="exercise-copy">
              <span class="block">{{ row.block || 'Ejercicio' }}</span>
              <h3>{{ row.exercise }}</h3>
              <p class="prescription">{{ prescription(row) }}</p>
            </div>
          </article>
        }
      </section>

      <p class="page-label" data-share-page-label></p>

      <footer>
        <span>Generado con <strong>Gym Progress</strong></span>
        @if (routine().generatedAt; as generatedAt) {
          <time [attr.datetime]="generatedAt.toISOString()">
            {{ generatedAt.toLocaleDateString('es-CO') }}
          </time>
        }
      </footer>
    </article>
  `,
  styleUrl: './routine-share-card.css',
})
export class RoutineShareCard {
  public readonly routine = input.required<RoutineShareData>();
  public readonly exportMode = input(false);
  protected readonly prescription = routinePrescription;
  protected readonly totalSets = totalRoutineSets;
}
