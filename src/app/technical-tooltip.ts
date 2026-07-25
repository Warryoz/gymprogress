import { Component, HostListener, input, signal } from '@angular/core';

let tooltipSequence = 0;

@Component({
  selector: 'app-technical-tooltip',
  template: `
    <span
      class="tooltip-host"
      [class.subtle]="variant() === 'subtle'"
      (pointerenter)="open.set(true)"
      (pointerleave)="open.set(false)"
    >
      @if (!iconOnly()) {
        <span>{{ term() }}</span>
      }
      <button
        type="button"
        class="info-button"
        [attr.aria-label]="'Más información: ' + term()"
        [attr.aria-describedby]="tooltipId"
        [attr.aria-expanded]="open()"
        (focus)="open.set(true)"
        (blur)="open.set(false)"
        (click)="open.set(true)"
      >
        i
      </button>
      <span
        class="tooltip"
        role="tooltip"
        [id]="tooltipId"
        [class.visible]="open()"
        [attr.aria-hidden]="!open()"
      >
        {{ description() }}
      </span>
    </span>
  `,
  styles: `
    :host { display: inline; }
    .tooltip-host { position: relative; display: inline-flex; align-items: center; gap: 4px; }
    .info-button {
      display: inline-grid;
      width: 20px;
      height: 20px;
      place-items: center;
      border: 0;
      border-radius: 50%;
      padding: 0;
      cursor: help;
      color: var(--text-secondary);
      background: var(--surface-muted);
      font: inherit;
      font-size: .68rem;
      font-weight: 900;
      transition: color 160ms ease, background-color 160ms ease;
    }
    .info-button:hover,
    .info-button[aria-expanded='true'] {
      color: var(--accent-contrast);
      background: var(--accent);
    }
    .subtle .info-button {
      width: 18px;
      height: 18px;
      color: var(--text-secondary);
      background: color-mix(in srgb, var(--text-secondary) 12%, transparent);
      font-size: .62rem;
    }
    .subtle .info-button:hover,
    .subtle .info-button[aria-expanded='true'] {
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 16%, transparent);
    }
    .subtle .tooltip {
      top: calc(100% + 8px);
      bottom: auto;
    }
    .subtle .tooltip::after {
      top: -5px;
      bottom: auto;
      border: 0;
      border-top: 1px solid var(--border);
      border-left: 1px solid var(--border);
    }
    .info-button:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--accent) 32%, transparent);
      outline-offset: 2px;
    }
    .tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0;
      z-index: 30;
      width: max-content;
      max-width: min(280px, calc(100vw - 32px));
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      pointer-events: none;
      display: none;
      opacity: 0;
      color: var(--text-primary);
      background: color-mix(in srgb, var(--surface-elevated) 94%, var(--accent));
      box-shadow: 0 8px 24px rgb(0 0 0 / .22);
      font-size: .82rem;
      font-weight: 500;
      line-height: 1.4;
      transform: translateY(4px);
      transition: opacity 180ms ease, transform 180ms ease;
    }
    .tooltip::after {
      position: absolute;
      bottom: -5px;
      left: 12px;
      width: 8px;
      height: 8px;
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      content: '';
      background: inherit;
      transform: rotate(45deg);
    }
    .tooltip.visible { display: block; opacity: 1; transform: translateY(0); }
    @media (max-width: 639px) {
      .info-button,
      .subtle .info-button {
        width: 44px;
        height: 44px;
      }
      .tooltip {
        position: fixed;
        top: auto;
        right: 16px;
        bottom: 84px;
        left: 16px;
        width: auto;
        max-width: none;
      }
      .tooltip::after { display: none; }
    }
  `,
})
export class TechnicalTooltip {
  public readonly term = input.required<string>();
  public readonly description = input.required<string>();
  public readonly iconOnly = input(false);
  public readonly variant = input<'default' | 'subtle'>('default');
  protected readonly open = signal(false);
  protected readonly tooltipId = `technical-tooltip-${tooltipSequence += 1}`;

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.open.set(false);
  }
}
