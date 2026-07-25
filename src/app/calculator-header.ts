import { Component, input } from '@angular/core';
import { TechnicalTooltip } from './technical-tooltip';

@Component({
  selector: 'app-calculator-header',
  imports: [TechnicalTooltip],
  template: `
    <header class="calculator-header">
      <div>
        <p>{{ category() }}</p>
        <div class="title-row">
          <h2>{{ title() }}</h2>
          @if (technicalTerm() && technicalDescription()) {
            <app-technical-tooltip
              [term]="technicalTerm()"
              [description]="technicalDescription()"
              [iconOnly]="true"
            />
          }
        </div>
        <span>{{ description() }}</span>
      </div>
      <small aria-live="polite" [class]="statusTone()">{{ status() }}</small>
    </header>
  `,
  styles: `
    :host { display: block; }
    .calculator-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
    }
    p, h2 { margin: 0; }
    p {
      color: #75d5ef;
      font-size: .7rem;
      font-weight: 850;
      letter-spacing: .11em;
      text-transform: uppercase;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    h2 { font-size: clamp(1.25rem, 3vw, 1.7rem); }
    header > div > span {
      display: block;
      max-width: 650px;
      margin-top: 7px;
      color: var(--text-secondary);
      font-size: .9rem;
      line-height: 1.45;
    }
    small {
      flex: 0 0 auto;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 6px 9px;
      color: var(--text-secondary);
      background: var(--surface-muted);
      font-size: .7rem;
      font-weight: 800;
    }
    small.success {
      border-color: color-mix(in srgb, var(--success) 52%, var(--border));
      color: var(--success);
      background: color-mix(in srgb, var(--success) 9%, transparent);
    }
    small.warning {
      border-color: color-mix(in srgb, var(--warning) 52%, var(--border));
      color: var(--warning);
      background: color-mix(in srgb, var(--warning) 9%, transparent);
    }
    small.error {
      border-color: color-mix(in srgb, var(--danger) 52%, var(--border));
      color: var(--danger);
      background: color-mix(in srgb, var(--danger) 9%, transparent);
    }
    @media (max-width: 560px) {
      .calculator-header { flex-direction: column; gap: 10px; }
    }
  `,
})
export class CalculatorHeader {
  public readonly category = input.required<string>();
  public readonly title = input.required<string>();
  public readonly description = input.required<string>();
  public readonly status = input('Sin calcular');
  public readonly statusTone = input<'neutral' | 'success' | 'warning' | 'error'>('neutral');
  public readonly technicalTerm = input('');
  public readonly technicalDescription = input('');
}
