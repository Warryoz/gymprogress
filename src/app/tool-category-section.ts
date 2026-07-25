import { Component, OnInit, input, signal } from '@angular/core';

@Component({
  selector: 'app-tool-category',
  styleUrl: './tool-category-section.css',
  template: `
    <details class="tool-category-section" [open]="open()" (toggle)="syncOpen($event)">
      <summary class="tool-category-heading">
        <div>
          <span>{{ title() }}</span>
          <strong>{{ description() }}</strong>
        </div>
        <span class="category-detail">{{ detail() }}</span>
      </summary>
      <div class="tool-card-grid compact">
        <ng-content />
      </div>
    </details>
  `,
})
export class ToolCategorySection implements OnInit {
  public readonly title = input.required<string>();
  public readonly description = input.required<string>();
  public readonly detail = input.required<string>();
  public readonly expanded = input(false);
  protected readonly open = signal(false);

  public ngOnInit(): void {
    this.open.set(this.expanded());
  }

  protected syncOpen(event: Event): void {
    this.open.set((event.currentTarget as HTMLDetailsElement).open);
  }
}
