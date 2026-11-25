import { Componente } from "./componente";
import { Nutricion } from "./types";

/**
 * PATRÓN DECORATOR
 * Un decorador ES un Componente y TIENE un Componente: lo envuelve y le agrega
 * características (etiquetas o cambios nutricionales) sin modificar su clase.
 */
export abstract class AlimentoDecorator extends Componente {
  constructor(protected readonly envuelto: Componente) {
    super(envuelto.getId(), envuelto.getNombre());
  }
  nutricion(): Nutricion { return this.envuelto.nutricion(); }
  etiquetas(): string[] { return this.envuelto.etiquetas(); }
}

export class Vegano extends AlimentoDecorator {
  etiquetas(): string[] { return [...super.etiquetas(), "vegano"]; }
}

export class SinGluten extends AlimentoDecorator {
  etiquetas(): string[] { return [...super.etiquetas(), "sin gluten"]; }
}

/** Además de la etiqueta, puede modificar la nutrición (ej. fortificado con fibra/proteína). */
export class Fortificado extends AlimentoDecorator {
  constructor(envuelto: Componente, private readonly extraFibra = 0, private readonly extraProt = 0) {
    super(envuelto);
  }
  nutricion(): Nutricion {
    const n = super.nutricion();
    return { ...n, fibra: n.fibra + this.extraFibra, proteinas: n.proteinas + this.extraProt };
  }
  etiquetas(): string[] { return [...super.etiquetas(), "fortificado"]; }
}

/** Para cualquier etiqueta personalizada que cree el administrador. */
export class EtiquetaPersonalizada extends AlimentoDecorator {
  constructor(envuelto: Componente, private readonly nombreEtiqueta: string) { super(envuelto); }
  etiquetas(): string[] { return [...super.etiquetas(), this.nombreEtiqueta]; }
}

/** Relaciona el texto de la tabla `etiquetas` con su clase decoradora. */
export const decoradorPorEtiqueta: Record<string, new (c: Componente) => AlimentoDecorator> = {
  "vegano": Vegano,
  "sin gluten": SinGluten,
  "fortificado": Fortificado,
};

/** Envuelve un componente con un decorador por cada etiqueta que tenga. */
export function aplicarEtiquetas(base: Componente, etiquetas: string[]): Componente {
  return etiquetas.reduce<Componente>((comp, etiqueta) => {
    const Clase = decoradorPorEtiqueta[etiqueta];
    return Clase ? new Clase(comp) : new EtiquetaPersonalizada(comp, etiqueta);
  }, base);
}
