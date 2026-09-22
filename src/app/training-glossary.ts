export const TRAINING_TERMS = [
  { term: '@', name: 'Arroba: carga o esfuerzo', description: 'Se lee «a». 4×4 @ 60 kg significa 4 series de 4 repeticiones con 60 kg. Si aparece @ RPE 8, indica el esfuerzo de la serie, no el peso.' },
  { term: '×', name: 'Series por repeticiones', description: 'El signo × (o la letra x) separa series y repeticiones. 4×4 significa 4 series de 4 repeticiones cada una: 16 en total, con descanso entre series. 3×30 s indica 3 series de 30 segundos.' },
  { term: 'Rest-pause', name: 'Pausa breve dentro de una serie', description: 'Una serie dividida en pequeños grupos de repeticiones con pausas breves entre ellos. Por ejemplo, 8 + 3 + 2 con 20 segundos entre grupos. La pausa y las repeticiones las marca el plan.' },
  { term: 'Serie', name: 'Grupo de repeticiones', description: 'Un conjunto de repeticiones realizadas antes de descansar. En 3×10, haces tres series de diez repeticiones.' },
  { term: 'Repetición', name: 'Una ejecución del movimiento', description: 'Un ciclo completo del ejercicio. Reps es la abreviatura de repeticiones.' },
  { term: 'Superserie', name: 'Dos ejercicios seguidos', description: 'Dos ejercicios realizados uno después de otro, con poco o ningún descanso entre ellos. Después se descansa lo indicado en el plan.' },
  { term: 'AMRAP', name: 'Tantas repeticiones como sea posible', description: 'Hacer tantas repeticiones como permita la técnica y el límite de esfuerzo del plan. Si indica RIR 2, se detiene la serie dejando unas dos repeticiones en reserva.' },

  { term: 'BW', name: 'Peso corporal', description: 'El peso de tu propio cuerpo. BW + 10 kg significa tu peso corporal más 10 kg de lastre.' },
  { term: 'RIR', name: 'Repeticiones en reserva', description: 'Las repeticiones que estimas que podrías hacer al terminar una serie. RIR 2 significa que te quedarían unas 2 repeticiones.' },
  { term: 'RPE', name: 'Esfuerzo percibido', description: 'Escala de esfuerzo. En fuerza se suele usar de 1 a 10: 10 es el esfuerzo máximo y 8 equivale aproximadamente a 2 repeticiones en reserva.' },
  { term: '1RM', name: 'Máximo de una repetición', description: 'La mayor carga que puedes mover una vez con buena técnica. Un 1RM estimado se calcula a partir de una serie y es una aproximación.' },
  { term: 'Tempo', name: 'Ritmo del movimiento', description: 'Los números indican segundos por fase. 3-1-2 significa bajar en 3 segundos, pausar 1 y subir en 2.' },
  { term: 'Deload', name: 'Semana de descarga', description: 'Periodo con menos carga o volumen para reducir la fatiga acumulada.' },
  { term: 'Lastre', name: 'Peso añadido', description: 'Carga extra al peso corporal, por ejemplo en dominadas o fondos.' },
  { term: 'Volumen', name: 'Cantidad de trabajo', description: 'Puede expresarse en series y repeticiones. En el cálculo de volumen de carga se multiplican series, repeticiones y peso.' },
  { term: 'Fallo', name: 'Límite de la serie', description: 'Punto en el que no puedes completar otra repetición con la técnica prevista.' },
  { term: 'Isométrico', name: 'Contracción sin movimiento', description: 'Mantener una posición bajo tensión durante un tiempo, como una plancha.' },
];
export function technicalDescription(value: string): string {
  return TRAINING_TERMS.filter(item => new RegExp('\\b' + item.term + '\\b', 'i').test(value)).map(item => item.description).join(' ');
}
