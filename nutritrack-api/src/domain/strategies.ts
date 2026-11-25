import { ConsumoPorDia, Objetivo } from "./types";

/**
 * PATRÓN STRATEGY
 * Cada indicador nutricional es una estrategia intercambiable con la misma interfaz.
 */
export interface IndicadorStrategy<T = unknown> {
  calcular(consumo: ConsumoPorDia, objetivo: Objetivo): T;
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** % de la meta calórica alcanzado cada día. */
export class CumplimientoCalorico implements IndicadorStrategy<Record<string, number>> {
  calcular(consumo: ConsumoPorDia, obj: Objetivo): Record<string, number> {
    return Object.fromEntries(
      Object.keys(consumo).sort().map(dia => [dia, r1((consumo[dia].calorias / obj.calorias) * 100)])
    );
  }
}

/** Reparto porcentual de proteínas, carbohidratos y grasas en el periodo. */
export class DistribucionMacros implements IndicadorStrategy<Record<string, number>> {
  calcular(consumo: ConsumoPorDia, _objetivo?: Objetivo): Record<string, number> {
    const t = { proteinas: 0, carbohidratos: 0, grasas: 0 };
    Object.values(consumo).forEach(n => {
      t.proteinas += n.proteinas;
      t.carbohidratos += n.carbohidratos;
      t.grasas += n.grasas;
    });
    const suma = t.proteinas + t.carbohidratos + t.grasas || 1;
    return {
      proteinas: r1((t.proteinas / suma) * 100),
      carbohidratos: r1((t.carbohidratos / suma) * 100),
      grasas: r1((t.grasas / suma) * 100),
    };
  }
}

export interface Tendencia { promedio: number; meta: number; desviacion: number; serie: number[]; }

/** Promedio de calorías vs. la meta, y la serie diaria para graficar. */
export class TendenciaSemanal implements IndicadorStrategy<Tendencia> {
  calcular(consumo: ConsumoPorDia, obj: Objetivo): Tendencia {
    const serie = Object.keys(consumo).sort().map(d => r1(consumo[d].calorias));
    const promedio = serie.length ? serie.reduce((a, b) => a + b, 0) / serie.length : 0;
    return { promedio: r1(promedio), meta: obj.calorias, desviacion: r1(promedio - obj.calorias), serie };
  }
}

/** Contexto: usa la estrategia que se le entregue y se puede cambiar en tiempo de ejecución. */
export class CalculadorIndicadores<T = unknown> {
  constructor(private strategy: IndicadorStrategy<T>) {}
  setStrategy(s: IndicadorStrategy<T>): void { this.strategy = s; }
  ejecutar(consumo: ConsumoPorDia, objetivo: Objetivo): T {
    return this.strategy.calcular(consumo, objetivo);
  }
}
