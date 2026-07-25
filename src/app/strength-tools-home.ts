import { Component, computed, output, signal } from '@angular/core';
import { SecondaryStrengthToolId } from './secondary-strength-tool';

export type TrackingStrengthDestination = 'progression' | 'compareSessions';
export type AvailableStrengthTool =
  | 'oneRm'
  | 'rirRpe'
  | 'plates'
  | SecondaryStrengthToolId
  | TrackingStrengthDestination;

type StrengthGoal = 'all' | 'estimate' | 'prepare' | 'understand' | 'track';

interface StrengthToolCard {
  id: AvailableStrengthTool;
  title: string;
  description: string;
  category: string;
  icon: string;
  goal: Exclude<StrengthGoal, 'all'>;
  recommended?: boolean;
}

@Component({
  selector: 'app-strength-tools-home',
  templateUrl: './strength-tools-home.html',
  styleUrl: './strength-tools-home.css',
})
export class StrengthToolsHome {
  public readonly openTool = output<AvailableStrengthTool>();

  protected readonly searchQuery = signal('');
  protected readonly selectedGoal = signal<StrengthGoal>('all');

  protected readonly goals: Array<{
    id: StrengthGoal;
    label: string;
    description: string;
    icon: string;
  }> = [
    { id: 'all', label: 'Ver todas', description: 'Explora el catálogo', icon: '⌘' },
    { id: 'estimate', label: 'Estimar fuerza', description: '1RM y cargas', icon: '↗' },
    { id: 'prepare', label: 'Preparar sesión', description: 'Barra y calentamiento', icon: '◎' },
    { id: 'understand', label: 'Entender esfuerzo', description: 'RIR, RPE y notación', icon: 'R' },
    { id: 'track', label: 'Analizar progreso', description: 'Volumen y sesiones', icon: '▥' },
  ];

  protected readonly tools: StrengthToolCard[] = [
    {
      id: 'oneRm',
      title: 'Estimar mi 1RM',
      description: 'Calcula tu fuerza máxima aproximada desde una serie exigente.',
      category: 'Fuerza',
      icon: '1',
      goal: 'estimate',
      recommended: true,
    },
    {
      id: 'percentages',
      title: 'Elegir una carga',
      description: 'Convierte tu 1RM en un peso utilizable para entrenar.',
      category: 'Fuerza',
      icon: '%',
      goal: 'estimate',
      recommended: true,
    },
    {
      id: 'equivalences',
      title: 'Cambiar repeticiones',
      description: 'Ajusta el peso manteniendo un esfuerzo equivalente.',
      category: 'Fuerza',
      icon: '⇄',
      goal: 'estimate',
    },
    {
      id: 'plates',
      title: 'Montar la barra',
      description: 'Descubre qué discos colocar a cada lado.',
      category: 'Preparación',
      icon: '◎',
      goal: 'prepare',
      recommended: true,
    },
    {
      id: 'warmup',
      title: 'Crear calentamiento',
      description: 'Genera series de aproximación hasta tu peso de trabajo.',
      category: 'Preparación',
      icon: '↟',
      goal: 'prepare',
    },
    {
      id: 'timer',
      title: 'Controlar descansos',
      description: 'Usa un temporizador rápido entre series.',
      category: 'Preparación',
      icon: '◷',
      goal: 'prepare',
    },
    {
      id: 'rirRpe',
      title: 'Interpretar RIR y RPE',
      description: 'Entiende qué tan cerca estuviste del fallo.',
      category: 'Esfuerzo',
      icon: 'R',
      goal: 'understand',
    },
    {
      id: 'notation',
      title: 'Leer una prescripción',
      description: 'Traduce notaciones como 4×8 @ 70 kg RIR 2.',
      category: 'Esfuerzo',
      icon: '@',
      goal: 'understand',
    },
    {
      id: 'volume',
      title: 'Calcular volumen',
      description: 'Suma el trabajo realizado en todas tus series.',
      category: 'Seguimiento',
      icon: 'Σ',
      goal: 'track',
    },
    {
      id: 'compareSessions',
      title: 'Comparar sesiones',
      description: 'Mide qué cambió entre dos entrenamientos.',
      category: 'Seguimiento',
      icon: '⇆',
      goal: 'track',
    },
    {
      id: 'progression',
      title: 'Decidir la próxima carga',
      description: 'Revisa tu progresión y la sugerencia para la siguiente sesión.',
      category: 'Seguimiento',
      icon: '↑',
      goal: 'track',
    },
  ];

  protected readonly filteredTools = computed(() => {
    const goal = this.selectedGoal();
    const query = this.normalize(this.searchQuery());

    return this.tools.filter((tool) => {
      const matchesGoal = goal === 'all' || tool.goal === goal;
      const haystack = this.normalize(`${tool.title} ${tool.description} ${tool.category}`);
      return matchesGoal && (!query || haystack.includes(query));
    });
  });

  protected selectGoal(goal: StrengthGoal): void {
    this.selectedGoal.set(goal);
  }

  protected updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.selectedGoal.set('all');
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .trim();
  }
}
