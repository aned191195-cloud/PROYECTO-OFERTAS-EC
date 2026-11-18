// Agrupa las ofertas en secciones sencillas.
// Cada tienda usa sus propias categorías (y muchas ofertas vienen sin ninguna),
// así que primero miramos la categoría y, si no encaja, palabras del nombre.
//
// Palabras: se buscan al inicio de una palabra del nombre ("galleta" encuentra
// "galletas"). Si terminan en espacio, tienen que ser la palabra exacta ("pan ").
// El orden importa: gana el primer grupo que coincida.

export function sinTildes(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export const GRUPOS = [
  {
    id: 'mascotas',
    nombre: '🐶 Mascotas',
    categorias: ['mascotas', 'alimentacion e higiene mascotas', 
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Mascotas',
    ],
    palabras: ['perro', 'gato', 'gatito', 'mascota', 'cachorro', 'felino', 'canino', 'arena sanitaria'],
  },
  {
    id: 'bebe',
    nombre: '👶 Bebé',
    categorias: ['alimentacion e higiene bebe', 
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Pañitos Húmedos', 'Pañales', 'Pañales y Pañitos', 'Leches y Fórmulas',
    ],
    palabras: ['panal', 'bebe', 'toallitas humedas', 'formula infantil', 'colado'],
  },
  {
    id: 'lacteos',
    nombre: '🥛 Lácteos y pan',
    categorias: ['lacteos', 'panaderia', 
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Lácteos', 'Leches', 'Leches vegetales', 'Leches condensadas', 'Leches evaporadas', 'Leches en polvo', 'Cremas de leche', 'Panes y Derivados',
    ],
    palabras: ['leche ', 'leches', 'yogur', 'queso', 'mantequilla', 'crema de leche', 'kumis', 'pan ', 'pan de', 'tostadas', 'galletas de sal'],
  },
  {
    id: 'bebidas',
    nombre: '🥤 Bebidas y licores',
    categorias: ['bebidas', 'licores', 
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Vinos', 'Cervezas', 'Rones', 'Whiskies', 'Gins', 'Cócteles y Cremas de licor', 'Tequilas', 'Otros licores', 'Espumantes', 'Vodkas', 'Aguas', 'Gaseosas', 'Hidratantes y energizantes', 'Jugos y Té',
    ],
    palabras: [
      'agua mineral', 'agua sin gas', 'agua con gas', 'jugo', 'gaseosa', 'cola ', 'cerveza', 'vino', 'whisky',
      'ron ', 'vodka', 'tequila', 'aguardiente', 'bebida', 'energizante', 'te helado', 'nectar', 'refresco',
      'crema de licor', 'licor', 'espumante ',
    ],
  },
  {
    id: 'snacks',
    nombre: '🍫 Snacks y dulces',
    categorias: ['snacks', 'confiteria', 
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Confitería y Dulces', 'Galletas', 'Snacks de sal', 'Chocolates',
    ],
    palabras: ['chocolate', 'galleta', 'papas fritas', 'snack', 'caramelo', 'chicle', 'golosina', 'chifle', 'chips', 'nachos', 'gomita', 'bombon', 'wafer'],
  },
  {
    id: 'despensa',
    nombre: '🍚 Despensa',
    categorias: [
      'pastas y fideos', 'aceites mantecas y margarinas', 'granos semillas y cereales',
      'salsas especias y condimentos', 'conservas y alimentos enlatados sal', 'reposteria y conservas dulces', 
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Despensa', 'Arroz, Granos y Pastas', 'Salsas, Condimentos y Sopas', 'Aceites y Vinagres', 'Café, té y chocolate', 'Cereales', 'Flan y gelatinas', 'Harinas y Coladas', 'Mezclas y premezclas', 'Avenas', 'Mermeladas y Mantequillas', 'Azúcar, Miel y Endulzantes', 'Mariscos en conserva', 'Granos en conserva', 'Frutas en conserva', 'Vegetales en conserva', 'Esencias dulces', 'Jarabes, siropes y salsas', 'Margarinas', 'Importados de Europa', 'Importados de USA',
    ],
    palabras: [
      'arroz', 'azucar', 'aceite', 'atun', 'sardina', 'fideo', 'tallarin', 'spaghetti', 'pasta ', 'harina',
      'salsa', 'mayonesa', 'mostaza', 'avena', 'cereal', 'lenteja', 'frejol', 'menestra', 'sal ',
      'enlatad', 'mermelada', 'gelatina', 'margarina', 'manteca', 'condimento', 'especia', 'aliño', 'alino',
      'sopa', 'caldo', 'maicena', 'polvo de hornear', 'miel', 'te ', 'infusion', 'chocolate en polvo',
      'cafe molido', 'cafe soluble', 'cafe instantaneo', 'cafe en grano', 'cafe tostado', 'granola',
      'apanadura', 'endulzante', 'stevia', 'choclito', 'maiz dulce', 'champinon', 'palmito', 'aceituna',
      'pasas', 'arandano', 'frutos secos', 'mix frutos', 'pinones', 'almendras', 'nueces', 'pulpa', 'panettone', 'cafe en capsula',
    ],
  },
  {
    id: 'frescos',
    nombre: '🥩 Frescos y congelados',
    categorias: ['alimentos frescos', 'alimentos frios y congelados', 
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Frescos', 'Carnes',
    ],
    palabras: [
      'carne', 'pollo', 'res ', 'cerdo', 'pescado', 'camaron', 'calamar', 'tilapia', 'fruta', 'verdura', 'jamon',
      'salchicha', 'mortadela', 'tocino', 'chorizo', 'huevo', 'helado', 'congelad', 'nuggets', 'hamburguesa',
      'manzana', 'banano', 'platano', 'tomate', 'papa ', 'cebolla', 'aguacate',
    ],
  },
  {
    id: 'limpieza',
    nombre: '🧽 Limpieza',
    categorias: ['hogar y limpieza', 
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Cuidado del hogar', 'Ambientadores', 'Limpieza de Cocina', 'Papel Higiénico', 'Detergentes', 'Limpieza de pisos y desinfectantes', 'Implementos de limpieza', 'Insecticidas y trampas', 'Limpieza de baño', 'Limpieza de muebles y vidrios', 'Suavizantes', 'Quitamanchas', 'Jabones de lavar', 'Blanqueadores', 'Fragancias y planchado de ropa', 'Desechables',
    ],
    palabras: [
      'detergente', 'suavizante', 'cloro', 'desinfectante', 'lavavajilla', 'limpia', 'papel higienico',
      'servilleta', 'toalla de cocina', 'toallas de cocina', 'fundas de basura', 'funda de basura', 'fundas para basura', 'esponja', 'ambiental', 'insecticida',
      'jabon de ropa', 'jabon en barra para ropa', 'quitamanchas', 'cera ', 'escoba', 'trapeador',
    ],
  },
  {
    id: 'personal',
    nombre: '🧴 Cuidado personal',
    categorias: ['belleza', 'aseo personal', 'farmacia', 
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Cuidado personal', 'Cuidado Facial', 'Tratamientos capilares', 'Vitaminas y Nutrición', 'Shampoo', 'Cuidado íntimo', 'Desodorantes', 'Cremas Corporales', 'Suplemento Nutricional', 'Protector Solar y Bronceadores', 'Higiene Corporal', 'Acondicionador', 'Depiladoras', 'Prevención', 'Tintes y Matizantes', 'Digestivos', 'Fijadores capilares', 'Antigripales y Antialérgicos', 'Primeros Auxilios', 'Cuidado de los pies', 'Antiinflamatorios', 'Cuidado Familiar', 'Cuidado Capilar', 'Medicinas', 'Alcohol y Antibacteriales', 'Colonias y Cremas', 'Cremas', 'Antimicóticos', 'Cuidado Corporal', 'Suero Oral', 'Repelentes', 'Kits Alisadores', 'Cejas', 'Labios',
    ],
    palabras: [
      'shampoo', 'champu', 'acondicionador', 'jabon', 'desodorante', 'antitranspirante', 'crema', 'pasta dental',
      'crema dental', 'cepillo dental', 'enjuague bucal', 'toallas higienicas', 'protector', 'maquillaje',
      'perfume', 'colonia', 'afeitar', 'gel ', 'locion', 'tinte', 'labial', 'esmalte', 'vitamina',
      'mascarilla', 'vendita', 'curita',
    ],
  },
  {
    id: 'casa',
    nombre: '🛋️ Casa y Navidad',
    categorias: ['navidad', 
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Hogar', 'Platos', 'Cubiertos', 'Copas', 'Vasos', 'Contenedores', 'Moldes', 'Accesorios de baño', 'Accesorios de parrillas', 'Utensilios para cortar', 'Muebles de Dormitorio', 'Fundas de Regalo', 'Sets de Regalo', 'Hieleras', 'Tachos y cestos', 'Fósforos y encendedores',
    ],
    palabras: [
      'colchon', 'sofa', 'cama ', 'mueble', 'armario', 'juego de sala', 'juego de comedor', 'silla', 'mesa ',
      'corral', 'maleta', 'soporte de cuerpo', 'guante', 'olla', 'sarten', 'vaso', 'plato', 'taza', 'cuchillo',
      'toalla', 'sabana', 'almohada', 'juguete', 'combo mesa', 'arbol', 'navide', 'adorno', 'decorativ',
      'lazo', 'copo de nieve', 'esfera', 'nacimiento', 'papel de regalo', 'caja para regalo', 'individuales',
    ],
  },
  {
    id: 'electro',
    nombre: '📱 Electro y tecnología',
    categorias: ['electrodomesticos', 
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Cafeteras',
    ],
    palabras: [
      'celular', 'laptop', 'tablet', 'impresora', 'camara', 'cable', 'cargador', 'audifono', 'parlante',
      'televisor', 'smart tv', 'refrigerador', 'lavadora', 'secadora', 'cocina a gas', 'cocina ', 'cocineta',
      'quemador', 'microondas', 'licuadora', 'batidora', 'plancha', 'cafetera', 'freidora', 'air fryer',
      'waflera', 'secador', 'ventilador', 'enfriador', 'aire acondicionado', 'aspiradora', 'luces',
    ],
  },
  {
    id: 'ferreteria',
    nombre: '🛠️ Ferretería y autos',
    categorias: [
      // Mi Comisariato (Frecuento), Santa María, Megamaxi
      'Industrial', 'Llantas',
    ],
    palabras: [
      'llanta', 'para auto', 'de auto', 'automotriz', 'limpiaparabrisas', 'neumatico', 'cubre asiento', 'aceite de motor',
      'taladro', 'sierra', 'esmeriladora', 'amoladora', 'lijadora', 'bomba centrifuga', 'motobomba',
      'motofumigadora', 'herramienta', 'sellador', 'llave de impacto', 'pistola de calor', 'tanque para',
      'tanque elevado', 'pintura', 'manguera', 'foco', 'extension electrica',
    ],
  },
  {
    id: 'ropa',
    nombre: '👟 Ropa y deporte',
    categorias: [],
    palabras: ['zapato', 'zapatilla', 'camiseta', 'pantalon', 'medias', 'chompa', 'caminadora', 'bicicleta', 'mochila', 'gorra', 'diadema', 'sombrero'],
  },
];

export const OTROS = { id: 'otros', nombre: '📦 Otros' };

// Orden en que se comprueban las palabras (distinto del orden en pantalla):
// lo más específico primero, para que "Asiento de bebé para auto" no acabe en
// Despensa ni "Lavavajilla sabor manzana" en Frescos.
const ORDEN_BUSQUEDA = [
  'mascotas', 'bebe', 'ferreteria', 'lacteos', 'bebidas', 'snacks', 'limpieza', 'despensa',
  'frescos', 'personal', 'casa', 'electro', 'ropa',
];

const PREPARADOS = ORDEN_BUSQUEDA.map((id) => GRUPOS.find((g) => g.id === id)).map((g) => ({
  ...g,
  categorias: new Set(g.categorias.map((c) => sinTildes(c).trim())),
  palabras: g.palabras.map((p) => ' ' + sinTildes(p)),
}));

export function grupoDe(oferta) {
  const categoria = sinTildes(oferta.categoria ?? '').trim();
  if (categoria) {
    const porCategoria = PREPARADOS.find((g) => g.categorias.has(categoria));
    if (porCategoria) return porCategoria.id;
  }
  const texto = ' ' + sinTildes(oferta.nombre ?? '').replace(/[^a-z0-9ñ]+/g, ' ').trim() + ' ';
  const porNombre = PREPARADOS.find((g) => g.palabras.some((p) => texto.includes(p)));
  return porNombre ? porNombre.id : OTROS.id;
}
