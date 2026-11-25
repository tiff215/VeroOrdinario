-- NutriTrack · esquema PostgreSQL (8 tablas)
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol VARCHAR(10) NOT NULL CHECK (rol IN ('admin','cliente')),
  creado_en TIMESTAMP DEFAULT NOW()
);

-- Alimento simple (ingrediente) o platillo (compuesto). Valores por porción.
CREATE TABLE alimentos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('simple','platillo')),
  porcion_g NUMERIC(8,2) NOT NULL DEFAULT 100 CHECK (porcion_g > 0),
  calorias NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (calorias >= 0),
  proteinas NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (proteinas >= 0),
  carbohidratos NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (carbohidratos >= 0),
  grasas NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (grasas >= 0),
  fibra NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (fibra >= 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_alimentos_nombre ON alimentos (LOWER(nombre));
CREATE UNIQUE INDEX uq_alimentos_nombre_activo ON alimentos (LOWER(nombre)) WHERE activo;

-- Composite: un platillo contiene N componentes (ingredientes u otros platillos)
CREATE TABLE platillo_componentes (
  platillo_id INT NOT NULL REFERENCES alimentos(id) ON DELETE CASCADE,
  componente_id INT NOT NULL REFERENCES alimentos(id),
  cantidad NUMERIC(8,2) NOT NULL CHECK (cantidad > 0),
  PRIMARY KEY (platillo_id, componente_id),
  CHECK (platillo_id <> componente_id)
);

-- Decorator: etiquetas y preferencias (vegano, sin gluten, fortificado...)
CREATE TABLE etiquetas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL
);
CREATE TABLE alimento_etiquetas (
  alimento_id INT NOT NULL REFERENCES alimentos(id) ON DELETE CASCADE,
  etiqueta_id INT NOT NULL REFERENCES etiquetas(id),
  PRIMARY KEY (alimento_id, etiqueta_id)
);

-- Objetivos: se conserva el historial; solo uno vigente por usuario
CREATE TABLE objetivos (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  calorias NUMERIC(8,2) NOT NULL CHECK (calorias > 0),
  proteinas NUMERIC(8,2) NOT NULL CHECK (proteinas > 0),
  carbohidratos NUMERIC(8,2) NOT NULL CHECK (carbohidratos > 0),
  grasas NUMERIC(8,2) NOT NULL CHECK (grasas > 0),
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_objetivo_vigente ON objetivos (usuario_id) WHERE vigente;

CREATE TABLE registros_comida (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  alimento_id INT NOT NULL REFERENCES alimentos(id),
  momento VARCHAR(15) NOT NULL
    CHECK (momento IN ('desayuno','colacion_am','comida','colacion_pm','cena')),
  porciones NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (porciones > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX idx_registros_usuario_fecha ON registros_comida (usuario_id, fecha);

-- Observer: avisos generados por el sistema
CREATE TABLE notificaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  creada_en TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_notificaciones_usuario ON notificaciones (usuario_id, creada_en DESC);
