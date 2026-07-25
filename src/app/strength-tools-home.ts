import { Component, output } from '@angular/core';
import { ToolCategorySection } from './tool-category-section';
import { SecondaryStrengthToolId } from './secondary-strength-tool';

export type TrackingStrengthDestination = 'progression' | 'compareSessions';
export type AvailableStrengthTool =
  | 'oneRm'
  | 'rirRpe'
  | 'plates'
  | SecondaryStrengthToolId
  | TrackingStrengthDestination;

@Component({
  selector: 'app-strength-tools-home',
  imports: [ToolCategorySection],
  templateUrl: './strength-tools-home.html',
  styleUrl: './strength-tools-home.css',
})
export class StrengthToolsHome {
  public readonly openTool = output<AvailableStrengthTool>();
}
