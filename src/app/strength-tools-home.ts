import { Component, output } from '@angular/core';
import { ToolCategorySection } from './tool-category-section';

export type AvailableStrengthTool = 'oneRm' | 'rirRpe' | 'plates';

@Component({
  selector: 'app-strength-tools-home',
  imports: [ToolCategorySection],
  templateUrl: './strength-tools-home.html',
  styleUrl: './strength-tools-home.css',
})
export class StrengthToolsHome {
  public readonly openTool = output<AvailableStrengthTool>();
}
