import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        const text = url.includes('training-plan')
          ? `semana,dia,enfoque,fase_semana,bloque,ejercicio,series,reps_o_tiempo,,carga_sugerida,rpe_rir,tempo,descanso,objetivo,regla_tendon_24h,progresion,notas
1,D1 Push,Pecho,Base,Principal,Incline bench press,4,8,,62.5,RIR 3,3-1-2,2 min,Hipertrofia,Regla 24h,Sube carga,No fallo
1,D1 Push,Pecho,Base,Accesorio,Peck deck,3,12,,55,RIR 3,2-1-2,90 s,Hipertrofia,Regla 24h,Sube reps,Control`
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
    expect(compiled.querySelector('.brand')?.textContent).toContain('Gym Progress');
    expect(compiled.textContent).toContain('Semana 1');
  });

  it('offers a routine-specific sharing preview from the plan', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    await app.loadTrainingPlan();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const shareButton = Array.from(compiled.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Compartir rutina'),
    );

    expect(shareButton).toBeTruthy();
    shareButton?.click();
    fixture.detectChanges();

    const dialog = compiled.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain('D1 Push');
    expect(dialog?.textContent).toContain('Incline bench press');
    expect(dialog?.textContent).toContain('Descargar PNG');
    expect(dialog?.textContent).toContain('Copiar como texto');
  });

  it('calculates training loads and plates', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.rmWeight.set(100);
    app.rmReps.set(5);
    app.targetBarWeight.set(100);
    app.emptyBarWeight.set(20);

    expect(app.estimatedOneRepMax()).toBe(116.7);
    expect(app.trainingLoads().find((load) => load.percentage === 80)?.load).toBe(92.5);
    expect(app.plateLoad().plates.reduce((sum, plate) => sum + plate.weight * plate.count, 0)).toBe(
      40,
    );
    expect(app.plateLoad().loaded).toBe(100);
  });

  it('opens calculators as internal pages without the quick-tools modal', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.setStrengthTab('calculate');
    expect(app.strengthCalculatorPage()).toBe('home');

    app.openStrengthCalculator('oneRm');
    expect(app.strengthCalculatorPage()).toBe('oneRm');
    expect(app.oneRmCalculated()).toBe(false);

    app.openStrengthCalculator('plates');
    expect(app.strengthCalculatorPage()).toBe('plates');
    expect(app.platesCalculated()).toBe(false);
  });

  it('keeps manual calculator results empty until an explicit calculation', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.rmWeight()).toBe(0);
    expect(app.rmReps()).toBe(0);

    app.calculateOneRm();
    expect(app.oneRmCalculated()).toBe(false);
    expect(app.calculatorValidation()).toBe('Introduce un peso mayor que cero.');

    app.rmWeight.set(80);
    app.rmReps.set(5);
    app.calculateOneRm();

    expect(app.oneRmCalculated()).toBe(true);
    expect(app.oneRepMaxResult().direct).toBe(93.3);
  });

  it('requires valid manual plate inputs before showing a result', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.calculatePlates();
    expect(app.platesCalculated()).toBe(false);
    expect(app.plateValidation()).toBe('Introduce un peso objetivo mayor que cero.');

    app.targetBarWeight.set(100);
    app.emptyBarWeight.set(20);
    app.calculatePlates();

    expect(app.platesCalculated()).toBe(true);
    expect(app.plateCombination().exact?.total).toBe(100);
  });

  it('persists strength settings only after the user opts in', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(localStorage.getItem('gym-progress-strength-settings')).toBeNull();
    app.emptyBarWeight.set(20);
    app.updateRememberStrengthSettings({
      target: { checked: true },
    } as unknown as Event);

    expect(JSON.parse(localStorage.getItem('gym-progress-strength-settings') ?? '{}')).toMatchObject({
      remember: true,
      emptyBarWeight: 20,
    });

    app.updateRememberStrengthSettings({
      target: { checked: false },
    } as unknown as Event);
    expect(localStorage.getItem('gym-progress-strength-settings')).toBeNull();
  });

  it('starts, tracks and finishes a workout session', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    await app.loadTrainingPlan();

    app.startTraining();
    expect(app.trainingInProgress()).toBe(true);
    expect(app.planMode()).toBe('workout');
    expect(app.workoutActionLabel()).toBe('Ir al siguiente ejercicio');

    app.setActiveView('plan');
    expect(app.planMode()).toBe('overview');
    expect(app.trainingInProgress()).toBe(true);
    expect(app.mobileTrainLabel()).toBe('Continuar');

    app.startTraining();
    expect(app.planMode()).toBe('workout');

    const rows = app.currentWorkoutDay()?.rows ?? [];
    rows.forEach((row) => app.setExerciseCompleted(row.sourceRow, true));

    expect(app.currentWorkoutProgress().allCompleted).toBe(true);
    expect(app.workoutActionLabel()).toBe('Finalizar entrenamiento');

    app.startTraining();
    expect(app.trainingInProgress()).toBe(false);
    expect(app.trainingCompleted()).toBe(true);
  });

  it('starts a prescription-aware rest timer after completing an exercise', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    await app.loadTrainingPlan();

    app.startTraining();
    const firstRow = app.currentWorkoutDay()?.rows[0];
    expect(firstRow).toBeTruthy();

    app.setExerciseCompleted(firstRow!.sourceRow, true);

    expect(app.restTimerDuration()).toBe(120);
    expect(app.restTimerRemaining()).toBeGreaterThanOrEqual(119);
    expect(app.nextWorkoutExercise()).toBe('Peck deck');

    const stored = JSON.parse(
      localStorage.getItem('gym-progress-workout-session') ?? '{}',
    );
    expect(stored).toMatchObject({
      inProgress: true,
      completedRows: [firstRow!.sourceRow],
      restTimerDuration: 120,
    });
  });

  it('restores an active workout and its timer after a refresh', async () => {
    const firstFixture = TestBed.createComponent(App);
    const firstApp = firstFixture.componentInstance;
    await firstApp.loadTrainingPlan();
    firstApp.startTraining();
    const firstRow = firstApp.currentWorkoutDay()!.rows[0];
    firstApp.setExerciseCompleted(firstRow.sourceRow, true);
    firstFixture.destroy();

    const restoredFixture = TestBed.createComponent(App);
    const restoredApp = restoredFixture.componentInstance;
    await restoredApp.loadTrainingPlan();

    expect(restoredApp.trainingInProgress()).toBe(true);
    expect(restoredApp.planMode()).toBe('workout');
    expect(restoredApp.completedExerciseRows().has(firstRow.sourceRow)).toBe(true);
    expect(restoredApp.restTimerDuration()).toBe(120);
    expect(restoredApp.restTimerRemaining()).toBeGreaterThan(0);
  });
});
