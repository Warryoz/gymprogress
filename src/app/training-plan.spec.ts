import { describe, expect, it } from 'vitest';
import { formatSuggestedLoad, parseTrainingPlanCsv } from './training-plan';

const SAMPLE = `semana,dia,enfoque,fase_semana,bloque,ejercicio,series,reps_o_tiempo,,carga_sugerida,rpe_rir,tempo,descanso,objetivo,regla_tendon_24h,progresion,notas
1,D1 Push,Pecho,Base,Tendon/activacion,Isometrico empuje,3-5,30-45 s,,40-60%,dolor <=3/10,isometrico,60-90 s,Analgesia,Regla 24h,"Sube reps, luego carga",Sin dolor
1,D1 Push,Pecho,Base,Principal,Incline bench press,4,8,,62.5,RIR 3,3-1-2,2-3 min,Hipertrofia,Regla 24h,Sube 2.5 kg,No fallo
1,D2 Pull,Espalda,Base,Principal,Dominada supina,4,8,,BW,RIR 3,3-1-2,2-3 min,Fuerza,Regla 24h,Sube reps,Pecho alto
2,D1 Push,Pecho,Volumen,Principal,Incline bench press,4,9,,65,RIR 3,3-1-2,2-3 min,Hipertrofia,Regla 24h,Sube 2.5 kg,Barra rapida`;

describe('parseTrainingPlanCsv', () => {
  it('groups the plan into ordered weeks and days', () => {
    const parsed = parseTrainingPlanCsv(SAMPLE);

    expect(parsed.weeks).toHaveLength(2);
    expect(parsed.weeks[0].days.map((day) => day.name)).toEqual(['D1 Push', 'D2 Pull']);
    expect(parsed.weeks[0].sets).toBe(11);
    expect(parsed.weeks[0].tendonRows).toBe(1);
  });

  it('adds kg only to numeric loads', () => {
    expect(formatSuggestedLoad('62.5')).toBe('62.5 kg');
    expect(formatSuggestedLoad('BW')).toBe('BW');
    expect(formatSuggestedLoad('40-60%')).toBe('40-60%');
    expect(formatSuggestedLoad('')).toBe('-');
  });
});
