import { Component, input } from '@angular/core';

@Component({
  selector: 'app-calculator-instructions',
  template: `
    <details>
      <summary>{{ title() }}</summary>
      <div class="instructions"><ng-content /></div>
    </details>
  `,
  styles: `
    :host { display: block; margin-top: 14px; }
    details {
      border: 1px solid var(--border);
      border-radius: 12px;
      background: color-mix(in srgb, #75d5ef 4%, var(--surface));
    }
    summary {
      min-height: 44px;
      padding: 12px 14px;
      cursor: pointer;
      color: #75d5ef;
      font-size: .82rem;
      font-weight: 800;
    }
    .instructions {
      padding: 0 16px 15px;
      color: var(--text-secondary);
      font-size: .84rem;
      line-height: 1.5;
    }
    :host ::ng-deep ol { margin: 0; padding-left: 20px; }
    :host ::ng-deep p { margin: 10px 0 0; }
  `,
})
export class CalculatorInstructions {
  public readonly title = input('Cómo usarla');
}
