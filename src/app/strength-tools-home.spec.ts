import { TestBed } from '@angular/core/testing';
import { StrengthToolsHome } from './strength-tools-home';

describe('StrengthToolsHome', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrengthToolsHome],
    }).compileComponents();
  });

  it('shows the complete tool catalog by default', () => {
    const fixture = TestBed.createComponent(StrengthToolsHome);
    fixture.detectChanges();

    const tools = fixture.nativeElement.querySelectorAll('.tool-card');
    expect(tools).toHaveLength(11);
    expect(fixture.nativeElement.textContent).toContain('¿Qué necesitas resolver?');
  });

  it('filters tools by the user goal', () => {
    const fixture = TestBed.createComponent(StrengthToolsHome);
    fixture.detectChanges();

    const buttons = [
      ...fixture.nativeElement.querySelectorAll('.goal-picker button'),
    ] as HTMLButtonElement[];
    const preparation = buttons.find((button) =>
      button.textContent?.includes('Preparar sesión'),
    );
    preparation?.click();
    fixture.detectChanges();

    const tools = fixture.nativeElement.querySelectorAll('.tool-card');
    expect(tools).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('Montar la barra');
    expect(fixture.nativeElement.textContent).toContain('Crear calentamiento');
    expect(fixture.nativeElement.textContent).toContain('Controlar descansos');
  });

  it('searches tools and emits the selected destination', () => {
    const fixture = TestBed.createComponent(StrengthToolsHome);
    const component = fixture.componentInstance;
    const opened: string[] = [];
    component.openTool.subscribe((tool) => opened.push(tool));
    fixture.detectChanges();

    const search = fixture.nativeElement.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;
    search.value = 'discos';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const tools = fixture.nativeElement.querySelectorAll('.tool-card');
    expect(tools).toHaveLength(1);
    (tools[0] as HTMLButtonElement).click();

    expect(opened).toEqual(['plates']);
  });
});
