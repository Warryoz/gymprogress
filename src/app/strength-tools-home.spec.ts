import { TestBed } from '@angular/core/testing';
import { StrengthToolsHome } from './strength-tools-home';
describe('StrengthToolsHome', () => {
 it('shows all tools and opens the chosen tool', async () => {
  await TestBed.configureTestingModule({imports: [StrengthToolsHome]}).compileComponents();
  const fixture = TestBed.createComponent(StrengthToolsHome);
  const opened: string[] = [];
  fixture.componentInstance.openTool.subscribe(tool => opened.push(tool));
  fixture.detectChanges();
  const buttons = [...fixture.nativeElement.querySelectorAll('.simple-tool')] as HTMLButtonElement[];
  expect(buttons).toHaveLength(9);
  buttons.find(button => button.textContent?.includes('Montar la barra'))!.click();
  expect(opened).toEqual(['plates']);
  expect(fixture.nativeElement.querySelector('input')).toBeNull();
 });
});
