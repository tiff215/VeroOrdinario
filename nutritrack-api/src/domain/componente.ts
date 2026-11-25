import { Nutricion, NUTRICION_VACIA, escalar, sumar } from "./types";

/**
 * PATRÓN COMPOSITE
 * Componente es la interfaz común: un Ingrediente (hoja) y un Platillo (compuesto)
 * se usan exactamente igual desde fuera.
 */
export abstract class Componente {                       // ABSTRACCIÓN
  constructor(protected readonly id: number, protected readonly nombre: string) {}  // ENCAPSULAMIENTO
  getId(): number { return this.id; }
  getNombre(): string { return this.nombre; }
  abstract nutricion(): Nutricion;                       // POLIMORFISMO
  etiquetas(): string[] { return []; }
}

/** Hoja: un alimento simple con valores propios. */
export class Ingrediente extends Componente {            // HERENCIA
  constructor(id: number, nombre: string, private readonly valores: Nutricion) {
    super(id, nombre);
  }
  nutricion(): Nutricion { return { ...this.valores }; }
}

/** Compuesto: contiene otros componentes (ingredientes u otros platillos). */
export class Platillo extends Componente {
  private readonly hijos: { comp: Componente; factor: number }[] = [];

  agregar(comp: Componente, factor = 1): void {
    if (factor <= 0) throw new Error("La cantidad debe ser mayor a 0");
    this.hijos.push({ comp, factor });
  }

  cantidadComponentes(): number { return this.hijos.length; }

  nutricion(): Nutricion {
    return this.hijos.reduce(
      (total, { comp, factor }) => sumar(total, escalar(comp.nutricion(), factor)),
      NUTRICION_VACIA()
    );
  }
}
