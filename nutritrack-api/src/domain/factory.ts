import { Componente, Ingrediente, Platillo } from "./componente";
import { Nutricion } from "./types";

export type TipoAlimento = "simple" | "platillo";

export interface DatosAlimento {
  id: number;
  nombre: string;
  tipo: TipoAlimento;
  nutricion?: Nutricion;
  componentes?: { comp: Componente; factor: number }[];
}

/**
 * PATRÓN FACTORY METHOD
 * AlimentoCreator declara el método fábrica crear(); cada subclase decide qué clase concreta instanciar.
 */
export abstract class AlimentoCreator {
  abstract crear(datos: DatosAlimento): Componente;       // factory method
}

export class IngredienteCreator extends AlimentoCreator {
  crear(d: DatosAlimento): Componente {
    if (!d.nutricion) throw new Error("Un ingrediente necesita datos nutricionales");
    return new Ingrediente(d.id, d.nombre, d.nutricion);
  }
}

export class PlatilloCreator extends AlimentoCreator {
  crear(d: DatosAlimento): Componente {
    const platillo = new Platillo(d.id, d.nombre);
    (d.componentes ?? []).forEach(c => platillo.agregar(c.comp, c.factor));
    return platillo;
  }
}

const creators: Record<TipoAlimento, AlimentoCreator> = {
  simple: new IngredienteCreator(),
  platillo: new PlatilloCreator(),
};

/** Elige la fábrica adecuada según el tipo guardado en la tabla alimentos. */
export function obtenerCreator(tipo: string): AlimentoCreator {
  const creator = creators[tipo as TipoAlimento];
  if (!creator) throw new Error(`Tipo de alimento no soportado: ${tipo}`);
  return creator;
}
