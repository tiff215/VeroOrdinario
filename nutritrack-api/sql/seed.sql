-- Datos de ejemplo (valores aproximados por 100 g; cita tu fuente en el documento)
INSERT INTO alimentos (nombre, tipo, porcion_g, calorias, proteinas, carbohidratos, grasas, fibra) VALUES
 ('Pechuga de pollo cocida','simple',100,165,31,0,3.6,0),
 ('Arroz blanco cocido','simple',100,130,2.7,28,0.3,0.4),
 ('Avena en hojuelas','simple',100,389,16.9,66.3,6.9,10.6),
 ('Manzana','simple',100,52,0.3,14,0.2,2.4),
 ('Frijoles cocidos','simple',100,127,8.7,22.8,0.5,6.4),
 ('Huevo cocido','simple',100,155,13,1.1,11,0),
 ('Tortilla de maíz','simple',100,218,5.7,44.6,2.9,6.3),
 ('Aguacate','simple',100,160,2,8.5,14.7,6.7),
 ('Plátano','simple',100,89,1.1,22.8,0.3,2.6),
 ('Leche semidescremada','simple',100,46,3.4,4.9,1.6,0),
 ('Brócoli cocido','simple',100,35,2.4,7.2,0.4,3.3),
 ('Lentejas cocidas','simple',100,116,9,20,0.4,7.9);

INSERT INTO alimentos (nombre, tipo, porcion_g) VALUES
 ('Bowl de pollo con arroz','platillo',350),
 ('Tacos de frijol con aguacate','platillo',250);

INSERT INTO etiquetas (nombre) VALUES ('vegano'), ('sin gluten'), ('fortificado');

INSERT INTO platillo_componentes (platillo_id, componente_id, cantidad)
SELECT p.id, c.id, v.cant
FROM (VALUES
  ('Bowl de pollo con arroz','Pechuga de pollo cocida',1.5),
  ('Bowl de pollo con arroz','Arroz blanco cocido',1.5),
  ('Bowl de pollo con arroz','Brócoli cocido',0.5),
  ('Tacos de frijol con aguacate','Tortilla de maíz',0.9),
  ('Tacos de frijol con aguacate','Frijoles cocidos',1),
  ('Tacos de frijol con aguacate','Aguacate',0.5)
) AS v(plat, comp, cant)
JOIN alimentos p ON p.nombre = v.plat
JOIN alimentos c ON c.nombre = v.comp;

INSERT INTO alimento_etiquetas (alimento_id, etiqueta_id)
SELECT a.id, e.id
FROM (VALUES
  ('Manzana','vegano'),('Manzana','sin gluten'),
  ('Frijoles cocidos','vegano'),('Frijoles cocidos','sin gluten'),
  ('Aguacate','vegano'),('Aguacate','sin gluten'),
  ('Lentejas cocidas','vegano'),('Lentejas cocidas','sin gluten'),
  ('Plátano','vegano'),('Plátano','sin gluten'),
  ('Pechuga de pollo cocida','sin gluten'),('Arroz blanco cocido','sin gluten'),
  ('Brócoli cocido','vegano'),('Brócoli cocido','sin gluten'),
  ('Leche semidescremada','fortificado'),
  ('Tacos de frijol con aguacate','vegano')
) AS v(alimento, etiqueta)
JOIN alimentos a ON a.nombre = v.alimento
JOIN etiquetas e ON e.nombre = v.etiqueta;
