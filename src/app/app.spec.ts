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
    expect(compiled.querySelector('.brand')?.textContent).toContain('gerogym');
    expect(compiled.querySelector('.week-tile')?.getAttribute('aria-label')).toContain('Semana 1');
  });

  it('offers a routine-specific sharing preview from the plan', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    await app.loadTrainingPlan();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.week-tile') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelector('#current-workout')).toBeNull();
    expect(compiled.querySelector('app-exercise-card')).toBeNull();
    expect(compiled.querySelector('.routine-choice.active')).toBeNull();
    (compiled.querySelector('.routine-choice-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const shareButton = Array.from(compiled.querySelectorAll('button')).find((button) =>
      button.getAttribute('aria-label') === 'Compartir',
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

  it('switches to the complete eight-week strength block with the same plan tools', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    await app.loadTrainingPlan();

    app.selectTrainingBlock('block2');
    fixture.detectChanges();

    expect(app.planWeeks()).toHaveLength(8);
    expect(app.planDayOptions().map((day) => day.name)).toEqual([
      'D1 Upper fuerza',
      'D2 Lower fuerza',
      'D3 Upper volumen',
      'D4 Lower volumen',
    ]);
    expect(app.currentWorkoutDay()?.rows[0]?.exercise).toBe('Press banca o press inclinado');
    expect(app.currentWorkoutDay()?.rows[0]?.suggestedLoad).toBe('75 kg (inclinado)');
    expect(
      app.currentWorkoutDay()?.rows.find((row) => row.exercise === 'Fondos lastrados'),
    ).toMatchObject({ sets: '2', repsOrTime: '10', suggestedLoad: 'BW + 20 kg' });
    expect(
      app.currentWorkoutDay()?.rows.find((row) => row.exercise === 'Dominada lastrada')
        ?.suggestedLoad,
    ).toBe('BW + 10 kg');
    expect(
      app
        .currentWorkoutDay()
        ?.rows.find((row) => row.exercise === 'Extensión de tríceps sobre la cabeza')
        ?.suggestedLoad,
    ).toBe('14 kg');
    expect(
      app
        .trainingPlan()
        ?.rows.filter((row) => !row.block.includes('Rehabilitación'))
        .every((row) => row.suggestedLoad !== 'Según RIR'),
    ).toBe(true);

    app.selectPlanWeek(8);
    const mainLift = app.currentWorkoutDay()?.rows[0];
    expect(mainLift?.repsOrTime).toContain('top set');
    expect(mainLift?.suggestedLoad).toBe('Top: 90 kg · back-off: 80 o 85 kg');
    expect(
      app.currentWorkoutDay()?.rows.find((row) => row.exercise === 'Dominada lastrada')
        ?.suggestedLoad,
    ).toBe('BW + 15 kg');
    expect(localStorage.getItem('gym-progress-active-training-block')).toBe('block2');
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
  it('restores the next routine after finishing and keeps blocks independent', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    await app.loadTrainingPlan();
    app.selectTrainingBlock('block2');
    const days = app.trainingPlan()!.weeks[0].days;
    app.startTraining();
    for (const row of days[0].rows) app.setExerciseCompleted(row.sourceRow, true);
    app.startTraining();
    expect(app.trainingCompleted()).toBe(true);
    app.selectTrainingBlock('block1');
    app.selectTrainingBlock('block2');
    expect(app.selectedPlanDay()).toBe(days[1].name);
    const restored = TestBed.createComponent(App).componentInstance;
    await restored.loadTrainingPlan();
    expect(restored.selectedPlanDay()).toBe(days[1].name);
    expect(JSON.parse(localStorage.getItem('gym-progress-block-history-block2')!)).toHaveLength(1);
  });

  it('resumes a running session after switching blocks', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    await app.loadTrainingPlan();
    app.startTraining();
    app.setExerciseCompleted(app.currentWorkoutDay()!.rows[0].sourceRow, true);
    app.selectTrainingBlock('block2');
    app.selectTrainingBlock('block1');
    expect(app.trainingInProgress()).toBe(true);
    expect(app.completedExerciseRows().size).toBe(1);
  });

  it('advances to the next week and retains the last routine at the end', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    await app.loadTrainingPlan();
    app.selectTrainingBlock('block2');
    const weeks = app.trainingPlan()!.weeks;
    const finish = (week: number, day: string) => {
      app.selectPlanWeek(week);
      app.selectPlanDay(day);
      app.startTraining();
      for (const row of app.currentWorkoutDay()!.rows) app.setExerciseCompleted(row.sourceRow, true);
      app.startTraining();
      app.setActiveView('progress');
      app.setActiveView('plan');
    };
    finish(weeks[0].week, weeks[0].days.at(-1)!.name);
    expect(app.selectedPlanWeek()).toBe(weeks[1].week);
    expect(app.selectedPlanDay()).toBe(weeks[1].days[0].name);
    const last = weeks.at(-1)!;
    finish(last.week, last.days.at(-1)!.name);
    expect(app.selectedPlanWeek()).toBe(last.week);
    expect(app.trainingCompleted()).toBe(true);
  });

});
