import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        const text = url.includes('training-plan')
          ? `semana,dia,enfoque,fase_semana,bloque,ejercicio,series,reps_o_tiempo,,carga_sugerida,rpe_rir,tempo,descanso,objetivo,regla_tendon_24h,progresion,notas
1,D1 Push,Pecho,Base,Principal,Incline bench press,4,8,,62.5,RIR 3,3-1-2,2 min,Hipertrofia,Regla 24h,Sube carga,No fallo`
          : 'legs\tsquat\t\t7x100kg\n\tisquio\t\t10x50kg';

        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(text),
        });
      }),
    );

    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the dashboard shell', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    await app.loadSampleCsv();
    const compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    expect(compiled.querySelector('h1')?.textContent).toContain('Plan simple');
    expect(compiled.textContent).toContain('Plan 8 semanas');
  });
});
