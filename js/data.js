// =====================================================================
//  Soldador del Pueblo — materiales, procesos y casos de aplicación
//  Valores orientativos (AWS D1.1, D1.2, D17.1, D18.1, API 1104,
//  ASME VIII / PCC-2, EN 1011). Simplificados para el juego.
// =====================================================================

export const CREDITS = 'Hecho por J. Gabriel Franco e Ing. J. Fernando Sarmiento';

export const MATERIALS = {
  al6061: { id: 'al6061', name: 'Aluminio 6061-T6', short: 'Al 6061', ferromagnetic: false, color: '#c9ccd1', density: 2.70,
    spark: { none: true },
    tests: {
      iman: 'El imán no se pega. No es ferroso.',
      chispa: 'No saca chispa. El disco se empasta con viruta blanda y plateada.',
      peso: 'Pesa muy poco: unos 2,7 g/cm³.',
      aspecto: 'Gris plata mate, con una capa fina de óxido blancuzco. Las soldaduras de fábrica son finitas, tipo "monedas apiladas".',
      documento: 'Calcomanía en el cuadro: "6061 T6 - heat treated".',
    } },
  a36: { id: 'a36', name: 'Acero al carbono A36', short: 'A36', ferromagnetic: true, color: '#55585c', density: 7.85,
    spark: { color: [1, 0.75, 0.35], len: 1, forks: 0.15 },
    tests: {
      iman: 'El imán se pega duro. Es ferroso.',
      chispa: 'Chispas largas, amarillo-naranja, casi rectas y con pocas ramitas: acero de bajo carbono.',
      peso: 'Pesado: 7,85 g/cm³.',
      aspecto: 'Gris oscuro, con cascarilla azulosa, pintura vieja y óxido.',
      documento: 'Plano de 1987 de la alcaldía: "columnas HEB 160, acero A36".',
    } },
  s355: { id: 's355', name: 'Acero estructural S355J2 (A572 Gr.50)', short: 'S355', ferromagnetic: true, color: '#4e5257', density: 7.85,
    spark: { color: [1, 0.8, 0.4], len: 0.9, forks: 0.4 },
    tests: {
      iman: 'Se pega duro. Ferroso.',
      chispa: 'Chispas amarillas con varias estrellitas al final: tiene algo más de carbono y manganeso que un acero dulce.',
      peso: 'Pesado: 7,85 g/cm³.',
      aspecto: 'Lámina de 25 mm con cascarilla de laminación gris-azulada.',
      documento: 'Certificado de colada 3.1: S355J2+N. C 0,18 · Mn 1,40 · Cr 0,05 · Mo 0,02 · V 0,01 · Ni 0,05 · Cu 0,10.',
    } },
  x52: { id: 'x52', name: 'Acero API 5L X52 (tubería)', short: 'API 5L X52', ferromagnetic: true, color: '#3f4246', density: 7.85,
    spark: { color: [1, 0.78, 0.38], len: 0.95, forks: 0.3 },
    tests: {
      iman: 'Se pega duro… y en el bisel el imán casi se queda solo: el tubo está magnetizado.',
      chispa: 'Chispas amarillas largas con algunas ramificaciones: acero al carbono microaleado.',
      peso: 'Pesado: 7,85 g/cm³.',
      aspecto: 'Tubo de 8" con recubrimiento negro tricapa y biseles de fábrica.',
      documento: 'Estampado en el tubo: "API 5L X52 PSL2 - 8 5/8" x 0.322" WT".',
    } },
  ss316l: { id: 'ss316l', name: 'Acero inoxidable AISI 316L', short: 'Inox 316L', ferromagnetic: false, color: '#b9bec4', density: 8.0,
    spark: { color: [1, 0.55, 0.25], len: 0.45, forks: 0 },
    tests: {
      iman: 'No se pega (es austenítico). Apenas jala un poquito en los codos doblados en frío.',
      chispa: 'Pocas chispas, cortas, rojizas y sin ramitas.',
      peso: 'Pesado: 8,0 g/cm³.',
      aspecto: 'Brillante, pulido sanitario por dentro y por fuera.',
      documento: 'Placa: "AISI 316L - grado alimenticio".',
    } },
  sa516: { id: 'sa516', name: 'Acero para recipientes SA-516 Gr.70', short: 'SA-516-70', ferromagnetic: true, color: '#5a5d61', density: 7.85,
    spark: { color: [1, 0.78, 0.36], len: 0.95, forks: 0.35 },
    tests: {
      iman: 'Se pega duro. Ferroso.',
      chispa: 'Chispas amarillas largas con estrellitas moderadas: acero al carbono-manganeso.',
      peso: 'Pesado: 7,85 g/cm³.',
      aspecto: 'Casco pintado de blanco, con la placa del fabricante y una costura circunferencial con una grieta corta.',
      documento: 'Placa ASME: "SA-516-70 · MAWP 250 psi · Servicio: GLP · Espesor 10 mm".',
    } },
  ti64: { id: 'ti64', name: 'Titanio Ti-6Al-4V (grado 5)', short: 'Ti-6Al-4V', ferromagnetic: false, color: '#9da1a4', density: 4.43,
    spark: { color: [1, 1, 0.95], len: 0.7, forks: 0.6, white: true },
    tests: {
      iman: 'No se pega.',
      chispa: 'Chispas blanco intenso, brillantísimas, que revientan al final.',
      peso: 'Liviano para lo duro que es: unos 4,4 g/cm³.',
      aspecto: 'Gris claro mate, mecanizado de precisión.',
      documento: 'Plano del motor: "AMS 4928 - Ti-6Al-4V".',
    } },
  fundicion: { id: 'fundicion', name: 'Fundición gris', short: 'Fundición', ferromagnetic: true, color: '#4a4a4a', density: 7.2 },
  cobre: { id: 'cobre', name: 'Cobre C110', short: 'Cobre', ferromagnetic: false, color: '#b87333', density: 8.9 },
};

export const MATERIAL_TESTS = [
  { id: 'iman', name: 'Acercar el imán', icon: '🧲' },
  { id: 'chispa', name: 'Prueba de chispa (pulidora)', icon: '✨' },
  { id: 'peso', name: 'Pesar y medir', icon: '⚖️' },
  { id: 'aspecto', name: 'Mirar de cerca', icon: '🔍' },
  { id: 'documento', name: 'Revisar placa / certificado', icon: '📄' },
];

// ---------------------------------------------------------------------
export const PROCESSES = {
  SMAW:    { id: 'SMAW',    family: 'SMAW', name: 'SMAW — Electrodo revestido', desc: 'Electrodo con revestimiento. Portátil, aguanta viento, deja escoria.', tool: 'stinger', exec: 'manual' },
  GMAW:    { id: 'GMAW',    family: 'MIG',  name: 'GMAW / MAG — MIG', desc: 'Alambre continuo con gas. Rápido; el viento se lleva el gas.', tool: 'mig', exec: 'manual' },
  FCAW:    { id: 'FCAW',    family: 'MIG',  name: 'FCAW — Alambre tubular', desc: 'Alambre con fundente adentro. Mucho depósito, deja escoria.', tool: 'mig', exec: 'manual' },
  GTAW_DC: { id: 'GTAW_DC', family: 'TIG',  name: 'GTAW (TIG) — Corriente continua', desc: 'Tungsteno y argón, DCEN. Máxima limpieza en aceros e inoxidables.', tool: 'tig', exec: 'manual' },
  GTAW_AC: { id: 'GTAW_AC', family: 'TIG',  name: 'GTAW (TIG) — Corriente alterna', desc: 'TIG en alterna: el semiciclo positivo rompe la capa de óxido. Para aluminio.', tool: 'tig', exec: 'manual' },
  OAW:     { id: 'OAW',     family: 'OAW',  name: 'OAW — Oxiacetilénica', desc: 'Llama oxígeno-acetileno. Calor muy repartido; casi solo para reparaciones menores.', tool: 'oaw', exec: 'manual' },
  SAW:     { id: 'SAW',     family: 'AUTO', name: 'SAW — Arco sumergido', desc: 'Arco bajo fundente granulado, con carro. Enorme depósito en plano.', tool: 'saw', exec: 'auto' },
  LBW:     { id: 'LBW',     family: 'AUTO', name: 'LBW — Láser', desc: 'Haz láser concentrado. Cordones estrechos y profundos, exige ajuste perfecto.', tool: 'laser', exec: 'auto' },
  EBW:     { id: 'EBW',     family: 'EBW',  name: 'EBW — Haz de electrones', desc: 'Electrones acelerados en vacío. Penetración profunda tipo keyhole y ZAT mínima.', tool: 'ebw', exec: 'auto' },
};

export const PARAM_DEFS = {
  TIG: [
    { id: 'I', label: 'Corriente', unit: 'A', min: 5, max: 300, step: 1, def: 120, heat: 1, knob: 0 },
    { id: 'gas', label: 'Caudal de argón', unit: 'L/min', min: 2, max: 25, step: 0.5, def: 12, heat: 0, knob: 1,
      issues: { low: { type: 'porosidad', label: 'Protección insuficiente', location: 'interna' }, high: { type: 'porosidad', label: 'Turbulencia: chupa aire', location: 'interna' } } },
    { id: 'bal', label: 'Balance AC (% EN)', unit: '%', min: 50, max: 90, step: 1, def: 70, heat: 0, onlyFor: ['GTAW_AC'], knob: 2,
      issues: { low: { type: 'inclusion_tungsteno', label: 'Tungsteno recalentado', location: 'interna' }, high: { type: 'inclusion', label: 'Óxido sin romper', location: 'interna' } } },
  ],
  MIG: [
    { id: 'V', label: 'Voltaje', unit: 'V', min: 14, max: 34, step: 0.5, def: 22, heat: 0.6, knob: 0,
      issues: { low: { type: 'irregular', label: 'Arco corto, cordón abombado', location: 'superficial' }, high: { type: 'socavado', label: 'Arco largo', location: 'superficial' } } },
    { id: 'wfs', label: 'Velocidad de alambre', unit: 'm/min', min: 2, max: 16, step: 0.1, def: 7, heat: 0.8, knob: 1 },
    { id: 'gas', label: 'Caudal de gas', unit: 'L/min', min: 0, max: 30, step: 0.5, def: 15, heat: 0, knob: 2,
      issues: { low: { type: 'porosidad', label: 'Protección insuficiente', location: 'interna' }, high: { type: 'porosidad', label: 'Turbulencia', location: 'interna' } } },
  ],
  SMAW: [
    { id: 'I', label: 'Corriente', unit: 'A', min: 40, max: 250, step: 1, def: 110, heat: 1, knob: 0,
      issues: { low: { type: 'inclusion', label: 'Escoria atrapada (arco frío)', location: 'interna' }, high: { type: 'salpicaduras', label: 'Electrodo al rojo', location: 'superficial' } } },
    { id: 'pol', label: 'Polaridad', unit: '', options: ['DCEP (DC+)', 'DCEN (DC−)', 'AC'], def: 'DCEN (DC−)', heat: 0, knob: 1 },
  ],
  OAW: [
    { id: 'llama', label: 'Tipo de llama', unit: '', options: ['Carburante', 'Neutra', 'Oxidante'], def: 'Neutra', heat: 0, knob: 0 },
    { id: 'boq', label: 'Número de boquilla', unit: '', min: 1, max: 8, step: 1, def: 3, heat: 1, knob: 1 },
  ],
  AUTO: [
    { id: 'P', label: 'Potencia', unit: 'kW', min: 0.5, max: 30, step: 0.1, def: 3, heat: 1, knob: 0 },
    { id: 'v', label: 'Velocidad de avance', unit: 'mm/s', min: 2, max: 60, step: 0.5, def: 15, heat: -1, isSpeed: true, knob: 1 },
  ],
  EBW: [
    { id: 'kV', label: 'Tensión de aceleración', unit: 'kV', min: 30, max: 150, step: 1, def: 90, heat: 1, knob: 0,
      issues: { high: { type: 'spiking', label: 'Haz demasiado energético', location: 'raiz' } } },
    { id: 'mA', label: 'Corriente del haz', unit: 'mA', min: 5, max: 150, step: 1, def: 30, heat: 1, knob: 1 },
    { id: 'foc', label: 'Posición del foco', unit: 'mm', min: -12, max: 4, step: 0.5, def: 0, heat: 0, knob: 2,
      issues: { low: { type: 'spiking', label: 'Foco muy profundo', location: 'raiz' }, high: { type: 'falta_penetracion', label: 'Foco sobre la superficie: cordón ancho y bajito', location: 'raiz' } } },
    { id: 'v', label: 'Velocidad de avance', unit: 'mm/s', min: 2, max: 30, step: 0.5, def: 15, heat: -1, isSpeed: true, knob: 3 },
    { id: 'vac', label: 'Vacío de la cámara', unit: 'mbar', options: ['1×10⁻¹', '1×10⁻²', '1×10⁻³', '1×10⁻⁴', '5×10⁻⁵'], def: '1×10⁻²', heat: 0, knob: 4 },
  ],
};

export const STANDOFF = {
  TIG: { ideal: 2.5, label: 'Longitud de arco' },
  MIG: { ideal: 15, label: 'Distancia boquilla-pieza' },
  SMAW: { ideal: 3.2, label: 'Longitud de arco' },
  OAW: { ideal: 3, label: 'Distancia del dardo' },
  AUTO: { ideal: 0, label: '' }, EBW: { ideal: 0, label: '' },
};

export const DEFECT_NAMES = {
  porosidad: 'Porosidad', falta_fusion: 'Falta de fusión', falta_penetracion: 'Falta de penetración', perforacion: 'Perforación',
  socavado: 'Socavado (mordedura)', grieta: 'Grieta', inclusion: 'Inclusión', oxidacion: 'Oxidación / coloración', sobreespesor: 'Sobreespesor excesivo',
  concavidad: 'Concavidad / falta de relleno', deformacion: 'Deformación', crater: 'Cráter final', salpicaduras: 'Salpicaduras', sin_soldar: 'Tramo sin soldar',
  desalineacion_haz: 'Desalineación del haz', spiking: 'Spiking (picos de raíz)', inclusion_tungsteno: 'Inclusión de tungsteno', irregular: 'Cordón irregular',
};

export const STAGES = [
  { id: 'diag', name: 'Diagnóstico', weight: 8 },
  { id: 'calc', name: 'Análisis técnico', weight: 12 },
  { id: 'proc', name: 'Proceso', weight: 15 },
  { id: 'cons', name: 'Consumibles', weight: 10 },
  { id: 'design', name: 'Junta y posición', weight: 10 },
  { id: 'prep', name: 'Preparación', weight: 15 },
  { id: 'param', name: 'Parámetros', weight: 8 },
  { id: 'exec', name: 'Ejecución e incidentes', weight: 12 },
  { id: 'insp', name: 'Inspección', weight: 10 },
];

const P = (scores) => Object.keys(PROCESSES).map(id => ({ id, ...(scores[id] || { score: 0, why: 'No es adecuado para este trabajo.' }) }));

// Posiciones de soldadura (orient = cómo se coloca la pieza en 3D)
const POS = {
  rodado: (score, why) => ({ id: '1G-R', name: '1G rodado: girar la pieza y soldar siempre arriba', orient: 'roll', score, why, diff: 0.7 }),
  p1G: (score, why) => ({ id: '1G', name: '1G — Plana', orient: 'flat', score, why, diff: 0.7 }),
  p2G: (score, why) => ({ id: '2G', name: '2G — Horizontal', orient: 'horizontal', score, why, diff: 1.1, speedMul: 0.95 }),
  p3Gup: (score, why) => ({ id: '3G-A', name: '3G — Vertical ascendente', orient: 'vertical', score, why, diff: 1.3, speedMul: 0.7 }),
  p3Gdn: (score, why) => ({ id: '3G-D', name: '3G — Vertical descendente', orient: 'vertical', score, why, diff: 1.2, speedMul: 1.3 }),
  p4G: (score, why) => ({ id: '4G', name: '4G — Sobrecabeza', orient: 'overhead', score, why, diff: 1.5, speedMul: 0.85 }),
  p5Gdn: (score, why) => ({ id: '5G-D', name: '5G descendente (de 12 a 6, tubo fijo)', orient: 'fixed', score, why, diff: 1.1, speedMul: 1.25 }),
  p5Gup: (score, why) => ({ id: '5G-A', name: '5G ascendente (de 6 a 12, tubo fijo)', orient: 'fixed', score, why, diff: 1.2, speedMul: 0.75 }),
  p6G: (score, why) => ({ id: '6G', name: '6G — Tubo a 45° fijo', orient: 'tilt45', score, why, diff: 1.4, speedMul: 0.85 }),
  p1F: (score, why) => ({ id: '1F', name: '1F — Filete plano (girar la columna 45°)', orient: 'flat', score, why, diff: 0.8 }),
  p2F: (score, why) => ({ id: '2F', name: '2F — Filete horizontal (en sitio)', orient: 'asis', score, why, diff: 1 }),
  p3F: (score, why) => ({ id: '3F', name: '3F — Filete vertical', orient: 'asis', score, why, diff: 1.3, speedMul: 0.7 }),
  p4F: (score, why) => ({ id: '4F', name: '4F — Filete sobrecabeza', orient: 'asis', score, why, diff: 1.5 }),
};

export const MISSIONS = [
  // ===================================================================
  {
    id: 'bici', n: 1, title: 'La bici de Mateo', place: 'Calle del Molino',
    client: { name: 'Mateo', role: '8 años, corredor de BMX', avatar: '🧒', voice: 'nino' },
    intro: [
      { who: 'client', text: '¡Don soldador! Mire… salté la rampa grande del parque y ¡crac! Se me partió el tubo de abajo.' },
      { who: 'client', text: 'Mi papá dice que es de aluminio del bueno. La carrera es el sábado… Tengo doce monedas, ¿me alcanza?' },
      { who: 'mentor', text: 'Tranquilo, mijo, eso tiene arreglo. Pero ojo: el aluminio no cambia de color antes de fundirse, y la capa de óxido funde a más de dos mil grados. Hay que saber romperla.' },
    ],
    mentor: 'Aluminio: la alúmina (Al₂O₃) funde a 2 050 °C y el metal a 660 °C. Hay que romper esa capa y elegir un aporte que no se agriete.',
    ficha: [['Material', 'Al 6061-T6 (Al-Mg-Si, tratado térmicamente)'], ['Tubo', 'Ø 38 mm × 1,6 mm de pared'], ['Unión', 'A tope circunferencial con camisa interior'], ['Servicio', 'Recreativo, cargas de impacto'], ['Criterio', 'AWS D1.2 inspección visual']],
    questions: [
      { q: '¿Por qué el TIG para aluminio se hace en corriente alterna?', options: ['Porque da más penetración que la continua', 'Porque en el semiciclo EP el arco rompe la capa de alúmina (limpieza catódica)', 'Porque el tungsteno dura más', 'Porque el aluminio no conduce en continua'], answer: 1, explain: 'En el semiciclo electrodo positivo los iones golpean la superficie y rompen la alúmina (acción de limpieza). En el semiciclo EN está la penetración. Por eso se ajusta el balance.' },
      { q: 'El 6061 tiene Mg y Si. ¿Qué aporte reduce mejor el riesgo de fisuración en caliente?', options: ['ER4043 (Al-5Si)', 'ER70S-6', 'Soldar sin aporte (autógena)', 'ER308L'], answer: 0, explain: 'El silicio del 4043 aumenta la fluidez y desplaza la composición del charco fuera del rango sensible a la fisuración en caliente. Autógeno, el 6061 se agrieta.' },
      { q: 'Si se precalienta el tubo a 250 °C con soplete, ¿qué le pasa al 6061-T6?', options: ['Nada, mejora la soldadura', 'Se sobreenvejece y pierde resistencia (pierde el T6)', 'Se vuelve magnético', 'Se endurece más'], answer: 1, explain: 'El T6 es un envejecido artificial (~175 °C). Calentar más se sobreenvejece: el tubo queda blando. En aluminio delgado no se precalienta.' },
    ],
    material: 'al6061', thicknessMm: 1.6, joint: 'circunferencial', env: 'taller', ambient: 'taller',
    piece: 'bike', lengthMm: 60, passes: 1, timeScale: 1.4,
    acceptance: 'AWS D1.2 visual: sin grietas, sin perforaciones, sin falta de fusión. Se admite un poro aislado pequeño.',
    critical: ['grieta', 'perforacion', 'sin_soldar', 'falta_fusion', 'falta_penetracion', 'inclusion_tungsteno'],
    processes: P({
      GTAW_AC: { score: 100, why: 'Perfecto: la alterna limpia el óxido y el control fino del calor evita perforar 1,6 mm.' },
      GMAW: { score: 55, why: 'Posible con MIG pulsado y alambre de aluminio, pero en 1,6 mm perforas fácil y queda tosco.' },
      GTAW_DC: { score: 15, why: 'En DCEN no hay limpieza catódica: el óxido queda atrapado y el charco no moja.' },
      LBW: { score: 35, why: 'Posible, pero no hay láser en el pueblo y el aluminio refleja el haz.' },
      SMAW: { score: 5, why: 'El electrodo de aluminio da muy mala calidad y en 1,6 mm perforas de una.', forced: [{ type: 'perforacion', label: 'Perforación por exceso de calor', location: 'superficial', sev: 0.9 }] },
      OAW: { score: 10, why: 'La llama calienta demasiado: destemplas el 6061-T6 y tuerces el cuadro.', forced: [{ type: 'deformacion', label: 'Cuadro torcido y destemplado', location: 'superficial', sev: 0.7 }] },
      EBW: { score: 25, why: 'Quedaría divina… pero meter una bici en una cámara de vacío por doce monedas no tiene sentido.' },
    }),
    consumables: {
      TIG: [
        { id: 'aporte', label: 'Varilla de aporte', options: [
          { id: 'ER4043', name: 'ER4043 (Al-5Si)', score: 100, why: 'El silicio da fluidez y reduce la fisuración en caliente del 6061.' },
          { id: 'ER5356', name: 'ER5356 (Al-5Mg)', score: 80, why: 'Válida y más resistente, pero algo más sensible a fisurar en 6061.' },
          { id: 'none', name: 'Sin aporte (autógena)', score: 10, why: 'El 6061 sin aporte se agrieta en caliente.', defect: { type: 'grieta', label: 'Fisura de solidificación', location: 'superficial', sev: 0.8 } },
          { id: 'ER70S6', name: 'ER70S-6 (acero)', score: 0, why: 'Es acero: con aluminio forma intermetálicos frágiles.', defect: { type: 'grieta', label: 'Intermetálicos Fe-Al frágiles', location: 'superficial', sev: 1 } },
        ] },
        { id: 'gas', label: 'Gas de protección', options: [
          { id: 'Ar', name: 'Argón 100 %', score: 100, why: 'Estándar para TIG en aluminio.' },
          { id: 'ArHe', name: 'Argón 75 % / Helio 25 %', score: 85, why: 'Más calor; útil en espesores mayores.' },
          { id: 'ArCO2', name: 'Argón 82 % / CO₂ 18 %', score: 0, why: 'El CO₂ oxida el aluminio y quema el tungsteno.', defect: { type: 'porosidad', label: 'Gas oxidante', location: 'interna', sev: 0.9 } },
        ] },
        { id: 'tungsteno', label: 'Tungsteno', options: [
          { id: 'WL15', name: 'Lantanado 1,5 % (dorado) Ø 1,6 mm', score: 100, why: 'Excelente en AC y DC.' },
          { id: 'WP', name: 'Puro (verde) Ø 2,4 mm', score: 80, why: 'El clásico para AC, hace bola estable.' },
          { id: 'WT2', name: 'Toriado 2 % (rojo) Ø 1,6 mm', score: 50, why: 'Pensado para DC; en AC se despunta y además es radiactivo al afilarlo.' },
        ] },
      ],
      MIG: [
        { id: 'aporte', label: 'Alambre', options: [
          { id: 'ER4043', name: 'ER4043 Ø 0,9 mm + pistola spool', score: 90, why: 'Correcto para aluminio con pistola de carrete.' },
          { id: 'ER70S6', name: 'ER70S-6 Ø 0,8 mm (acero)', score: 0, why: 'Alambre de acero en aluminio: imposible.', defect: { type: 'grieta', label: 'Intermetálicos Fe-Al', location: 'superficial', sev: 1 } },
        ] },
      ],
    },
    design: {
      note: 'El tubo va en una plantilla con mandril. Se puede girar el cuadro para soldar siempre arriba.',
      positions: [POS.rodado(100, 'Girar el cuadro en la plantilla te deja soldar siempre en plano: charco estable y cordón parejo.'), POS.p5Gup(70, 'Se puede, pero en 1,6 mm de aluminio fuera de posición es mucho más fácil perforar.'), POS.p4G(20, 'Sobrecabeza en aluminio delgado sin necesidad: pura dificultad.')],
      bevels: [
        { id: 'I', name: 'A tope recto, sin separación, con camisa interior', score: 100, why: 'En 1,6 mm no se bisela; la camisa alinea y refuerza.' },
        { id: 'V', name: 'Bisel en V a 60°', score: 30, why: 'Biselar 1,6 mm deja un filo que se funde y perfora.' },
      ],
    },
    prep: [
      { id: 'parar', label: 'Taladrar Ø 3 mm en las puntas de la grieta', detail: 'Para que no siga corriendo.', kind: 'good', why: 'Un agujero de parada frena la grieta.', anim: 'drill', minutes: 3 },
      { id: 'acetona', label: 'Desengrasar con acetona y trapo limpio', kind: 'required', why: 'La grasa se descompone en hidrógeno: porosidad garantizada en aluminio.', missing: { type: 'porosidad', label: 'Porosidad por grasa', location: 'interna', sev: 0.6 }, anim: 'rag', minutes: 2 },
      { id: 'cepilloInox', label: 'Cepillar con cepillo de inox exclusivo para aluminio', kind: 'required', why: 'Hay que quitar la alúmina justo antes de soldar.', missing: { type: 'inclusion', label: 'Inclusión de óxido', location: 'interna', sev: 0.6 }, anim: 'brush', cleans: true, minutes: 2 },
      { id: 'cepilloAcero', label: 'Cepillar con el cepillo de acero de la mesa', detail: 'El que se usa para todo.', kind: 'harmful', why: 'Incrusta hierro en el aluminio.', defect: { type: 'inclusion', label: 'Contaminación con hierro', location: 'interna', sev: 0.5 }, anim: 'brush', minutes: 2 },
      { id: 'precalentar', label: 'Precalentar a 250 °C con soplete', kind: 'harmful', why: 'El 6061-T6 se sobreenvejece y pierde resistencia.', defect: { type: 'deformacion', label: 'Pérdida del temple T6', location: 'superficial', sev: 0.5 }, anim: 'torch', readout: '🌡️ 250 °C', minutes: 5 },
      { id: 'plantilla', label: 'Alinear el cuadro en la plantilla y apretar', kind: 'required', why: 'Sin fijar, el calor tuerce el cuadro.', missing: { type: 'deformacion', label: 'Cuadro desalineado', location: 'superficial', sev: 0.5 }, anim: 'clamp', minutes: 3 },
      { id: 'punteo', label: 'Dar 2 puntos de soldadura', kind: 'good', why: 'Los puntos sostienen la alineación.', anim: 'tack', minutes: 1 },
    ],
    params: {
      TIG: { I: { ideal: [55, 75], ok: [45, 90] }, gas: { ideal: [8, 12], ok: [6, 16] }, bal: { ideal: [65, 75], ok: [60, 80] } },
      MIG: { V: { ideal: [16, 18], ok: [15, 20] }, wfs: { ideal: [5, 6.5], ok: [4, 7.5] }, gas: { ideal: [12, 18], ok: [9, 22] } },
    },
    exec: { speed: { TIG: [1.6, 2.6], MIG: [5, 8] }, lateralTol: 0.9, dabEveryMm: 3.2 },
    incidents: [
      { id: 'tungsteno', at: 0.45, when: c => c.fam === 'TIG', fx: 'tungsten', title: '¡La varilla tocó el tungsteno!', text: 'El arco se puso verdoso y errático, y la punta del tungsteno quedó con una bola de aluminio pegada.',
        options: [
          { t: 'Parar, reafilar (o cambiar) el tungsteno y amolar la zona contaminada', ok: true, why: 'Correcto: un tungsteno contaminado deja inclusiones y un arco inestable.' },
          { t: 'Seguir soldando, eso se limpia solo con el calor', ok: false, why: 'No se limpia: queda tungsteno y aluminio contaminado en el cordón.' },
          { t: 'Subir el amperaje para quemar la contaminación', ok: false, why: 'Más amperaje con la punta contaminada empeora el arco y puede perforar.' },
        ], defect: { type: 'inclusion_tungsteno', label: 'Inclusión de tungsteno', location: 'interna', sev: 0.7 } },
    ],
    ndt: { best: ['VT', 'PT'], ok: ['RT'], waste: ['UT', 'MT', 'HIDRO', 'MACRO'], notes: 'En pared fina de aluminio: visual y líquidos penetrantes. UT no es fiable en 1,6 mm y MT no funciona en aluminio.' },
    reward: 12,
    successStory: 'Mateo ganó la carrera del pueblo. Ahora todos los niños del barrio quieren su bici "soldada por el taller".',
    failStory: 'En la primera rampa de la carrera el tubo se volvió a partir por la soldadura. Mateo no se aporreó, pero lloró el doble…',
  },

  // ===================================================================
  {
    id: 'mercado', n: 2, title: 'La marquesina del mercado', place: 'Plaza del Mercado',
    client: { name: 'Doña Elena', role: 'Presidenta de la asociación del mercado', avatar: '👩‍🦳', voice: 'senora' },
    intro: [
      { who: 'client', text: 'Ay, mijo, qué susto. El camión de las verduras se echó en reversa y le pegó a la columna. La platina de abajo quedó despegada.' },
      { who: 'client', text: 'El sábado es día de mercado y esa marquesina no se puede caer encima de la gente. Hay que soldarla aquí mismo, y hoy está haciendo un viento…' },
      { who: 'mentor', text: 'Obra, viento y estructura. Piense qué proceso no le tumba el viento. Y los electrodos esos llevan toda la noche en la caja abierta en el camión, ¿ya los revisó?' },
    ],
    mentor: 'Al aire libre con viento: un proceso que genere su propia protección. Estructura: electrodo de bajo hidrógeno, bien seco.',
    ficha: [['Material', 'Acero A36 (bajo carbono)'], ['Unión', 'Filete, columna HEB 160 a platina base de 15 mm'], ['Garganta requerida', '7 mm'], ['Condición', 'En obra, viento ~25 km/h, humedad 85 %'], ['Electrodos', 'E7018 en caja abierta desde ayer']],
    questions: [
      { q: 'En la designación E7018, ¿qué significan "70", "1" y "8"?', options: ['70 A de corriente, 1 mm, 8 pasadas', '70 ksi de resistencia a la tracción, toda posición, revestimiento básico bajo hidrógeno con polvo de hierro (CA o CC+)', '70 % de hierro, 1 capa, 8 % de carbono', '70 °C de secado, 1 hora, 8 horas de vida'], answer: 1, explain: 'AWS A5.1: E = electrodo; 70 = 70 ksi mínimo; 1 = todas las posiciones; 8 = revestimiento básico de potasio, bajo hidrógeno, con polvo de hierro, CA o CC electrodo positivo.' },
      { q: 'Los E7018 pasaron la noche expuestos a 85 % de humedad. ¿Qué se hace?', options: ['Usarlos igual, la humedad se evapora con el arco', 'Resecarlos (≈ 350–400 °C, 1 h) y luego mantenerlos en horno a ≥ 120 °C', 'Mojarlos para que no salpiquen', 'Secarlos al sol 10 minutos'], answer: 1, explain: 'El revestimiento básico absorbe agua. Eso es hidrógeno difusible en el cordón, que da poros y fisuras en frío. Se resecan según el fabricante y se mantienen en el horno de mantenimiento.' },
      { q: 'Soldando con DC aparece soplo magnético cerca del final de la junta. ¿Qué lo corrige?', options: ['Subir el amperaje', 'Cambiar a CA, mover la pinza de masa o inclinar el electrodo contra el soplo con arco corto', 'Soldar más rápido con arco largo', 'Usar un electrodo más grueso'], answer: 1, explain: 'El soplo lo causa la asimetría del campo magnético de la corriente continua (bordes y masa). La CA lo reduce mucho, y reubicar la masa o soldar hacia puntos ya punteados también ayuda.' },
    ],
    material: 'a36', thicknessMm: 10, joint: 'filete', env: 'exterior', ambient: 'exterior',
    piece: 'column', lengthMm: 110, passes: 1, timeScale: 1.5,
    acceptance: 'AWS D1.1 visual: garganta ≥ 7 mm, sin grietas ni falta de fusión, socavado ≤ 1 mm, porosidad mínima.',
    critical: ['grieta', 'falta_fusion', 'sin_soldar', 'perforacion', 'falta_penetracion', 'socavado'],
    processes: P({
      SMAW: { score: 100, why: 'Ideal en obra: el revestimiento genera su gas y su escoria, el viento no lo afecta y el equipo es portátil.' },
      FCAW: { score: 85, why: 'El alambre tubular autoprotegido (FCAW-S) también aguanta viento. Muy buena opción.' },
      GMAW: { score: 35, why: 'Con viento el gas se va y quedan poros, salvo que se armen cortavientos.', forced: [{ type: 'porosidad', label: 'Gas barrido por el viento', location: 'interna', sev: 0.75 }] },
      GTAW_DC: { score: 20, why: 'Lentísimo en 10 mm y el viento se lleva el argón.', forced: [{ type: 'porosidad', label: 'Argón barrido', location: 'interna', sev: 0.6 }] },
      GTAW_AC: { score: 5, why: 'Alterna en acero no aporta nada y el viento barre el argón.', forced: [{ type: 'porosidad', label: 'Argón barrido', location: 'interna', sev: 0.6 }] },
      OAW: { score: 10, why: 'Demasiado lento y calor disperso para un filete estructural.', forced: [{ type: 'falta_fusion', label: 'Calor insuficiente', location: 'interna', sev: 0.7 }] },
      SAW: { score: 10, why: 'Necesita carro y posición plana: no sirve en una columna en plena plaza.' },
    }),
    consumables: {
      SMAW: [
        { id: 'electrodo', label: 'Electrodo (AWS A5.1)', options: [
          { id: 'E7018', name: 'E7018 — básico, bajo hidrógeno', score: 100, why: 'El estándar estructural: bajo hidrógeno y buena tenacidad. Debe estar seco.' },
          { id: 'E6013', name: 'E6013 — rutílico, uso general', score: 55, why: 'Bonito y fácil, pero de poca penetración y no es de bajo hidrógeno.', defect: { type: 'falta_fusion', label: 'Penetración baja del E6013', location: 'interna', sev: 0.35 } },
          { id: 'E6010', name: 'E6010 — celulósico', score: 60, why: 'Penetra mucho; está pensado para raíces de tubería. En filete deja un cordón tosco y con más hidrógeno.' },
          { id: 'E308L', name: 'E308L-16 — inoxidable', score: 5, why: 'Electrodo de inoxidable para acero al carbono: caro e inadecuado.' },
        ] },
        { id: 'diametro', label: 'Diámetro', options: [
          { id: '3.2', name: '3,2 mm (1/8")', score: 100, why: 'Adecuado para filete de 7 mm en 10 mm.' },
          { id: '2.5', name: '2,5 mm (3/32")', score: 70, why: 'Funciona, pero requiere más pasadas.' },
          { id: '5.0', name: '5,0 mm (3/16")', score: 50, why: 'Muy grueso para 2F: se chorrea.' },
        ] },
      ],
      MIG: [
        { id: 'aporte', label: 'Alambre', options: [
          { id: 'E71T11', name: 'E71T-11 autoprotegido Ø 0,9 mm', score: 100, why: 'Autoprotegido: perfecto con viento.' },
          { id: 'ER70S6', name: 'ER70S-6 sólido Ø 1,0 mm', score: 55, why: 'Necesita gas: el viento lo barre.' },
        ] },
        { id: 'gas', label: 'Gas', options: [
          { id: 'none', name: 'Sin gas (alambre autoprotegido)', score: 100, why: 'Correcto con alambre autoprotegido.' },
          { id: 'ArCO2', name: 'Argón 82 % / CO₂ 18 %', score: 55, why: 'Bien en taller, aquí hay viento.' },
        ] },
      ],
    },
    design: {
      note: 'La columna está instalada y sostiene la marquesina: no se puede girar.',
      positions: [POS.p2F(100, 'Es la única realista: la columna está parada en su sitio. Filete horizontal con el electrodo a ~45° y 10–15° de arrastre.'), POS.p1F(10, 'Para soldar en plano habría que desmontar y acostar la columna con la marquesina encima. Imposible aquí.'), POS.p4F(0, 'No hay ningún filete sobrecabeza en esta unión.')],
      bevels: null,
    },
    prep: [
      { id: 'amolar', label: 'Pulir pintura, óxido y cascarilla hasta ver metal brillante', detail: '25 mm a cada lado.', kind: 'required', why: 'Pintura, óxido y cascarilla dan poros y falta de fusión.', missing: { type: 'porosidad', label: 'Porosidad por óxido y pintura', location: 'interna', sev: 0.55 }, anim: 'grind', cleans: true, minutes: 6 },
      { id: 'horno', label: 'Resecar los E7018 en el horno (350 °C · 1 h) y pasarlos al termo a 120 °C', detail: 'Estuvieron toda la noche en la caja abierta.', kind: 'required', requiredIf: c => c.cons.electrodo === 'E7018', why: 'El E7018 húmedo mete hidrógeno: poros y fisuras en frío.', missing: { type: 'grieta', label: 'Fisura por hidrógeno (electrodo húmedo)', location: 'interna', sev: 0.6 }, anim: 'oven', readout: '🔥 350 °C → 120 °C', minutes: 60 },
      { id: 'masa', label: 'Poner la pinza de masa sobre metal limpio, cerca de la unión', kind: 'required', why: 'Una masa mala da arco inestable y empeora el soplo magnético.', missing: { type: 'irregular', label: 'Arco inestable por mala masa', location: 'superficial', sev: 0.5 }, anim: 'clamp', minutes: 1 },
      { id: 'aplomar', label: 'Aplomar la columna y asegurarla con gato y cuñas', kind: 'required', why: 'Una columna fuera de plomo carga mal la estructura.', missing: { type: 'deformacion', label: 'Columna fuera de plomo', location: 'superficial', sev: 0.5 }, anim: 'gauge', readout: '📐 Plomo: 0,5 mm/m ✔', minutes: 4 },
      { id: 'punteo', label: 'Puntear las cuatro esquinas', kind: 'good', why: 'Fija la geometría y reparte la contracción.', anim: 'tack', minutes: 2 },
      { id: 'mojar', label: 'Echarle agua a la platina antes de soldar', detail: 'Para que no se caliente tanto.', kind: 'harmful', why: 'El agua es hidrógeno sobre la unión, y enfriar brusco endurece la ZAT.', defect: { type: 'grieta', label: 'Fisura por hidrógeno y temple', location: 'interna', sev: 0.6 }, anim: 'water', minutes: 1 },
    ],
    params: {
      SMAW: { I: { ideal: [110, 135], ok: [95, 150] }, pol: { ideal: ['DCEP (DC+)', 'AC'], ok: [], bad: { 'DCEN (DC−)': { type: 'falta_fusion', label: 'E7018 en DCEN: penetración pobre', location: 'interna', sev: 0.45 } } } },
      MIG: { V: { ideal: [19, 21], ok: [17.5, 22.5] }, wfs: { ideal: [5, 6.5], ok: [4, 7.5] }, gas: { ideal: [0, 18], ok: [0, 22] } },
    },
    paramHints: { SMAW: c => c.cons.diametro === '2.5' ? { I: { ideal: [75, 95], ok: [65, 105] } } : c.cons.diametro === '5.0' ? { I: { ideal: [180, 220], ok: [160, 240] } } : null },
    exec: { speed: { SMAW: [2.8, 4.2], MIG: [4, 6.5], TIG: [1.2, 2] }, lateralTol: 1.6 },
    incidents: [
      { id: 'humedad', at: 0.12, when: c => c.fam === 'SMAW' && c.cons.electrodo === 'E7018' && !c.prepDone.has('horno'), fx: 'wet', title: 'El arco escupe y salen poros', text: 'El electrodo chisporrotea raro, echa mucho humo y en el cordón aparecen poritos. Esos E7018 durmieron en la caja abierta con 85 % de humedad.',
        options: [
          { t: 'Parar, meter los electrodos al horno (350 °C, 1 h) y seguir con electrodos secos', ok: true, fixPrep: 'horno', anim: 'oven', why: 'Correcto: se pierde una hora, pero el hidrógeno es el enemigo número uno de la estructura.' },
          { t: 'Seguir, ya casi termino', ok: false, why: 'Todo el cordón queda con hidrógeno: poros y riesgo de fisura en frío.' },
          { t: 'Alargar el arco para "secar" el electrodo', ok: false, why: 'El arco largo mete aire y empeora la porosidad.' },
        ], defect: { type: 'porosidad', label: 'Porosidad por electrodo húmedo', location: 'interna', sev: 0.7 } },
      { id: 'soplo', at: 0.7, when: c => c.fam === 'SMAW' && String(c.params.pol).startsWith('DC'), fx: 'arcblow', title: '¡Soplo magnético!', text: 'Llegando al borde de la platina, el arco se desvía hacia atrás, la escoria se adelanta al charco y el cordón se va de lado. Estás en corriente continua y la masa quedó en el otro extremo.',
        options: [
          { t: 'Mover la pinza de masa al final de la junta (o enrollar el cable)', ok: true, anim: 'clamp', why: 'Correcto: cambiar el retorno de la corriente equilibra el campo magnético.' },
          { t: 'Cambiar la máquina a corriente alterna (CA)', ok: true, why: 'Correcto: en CA el campo se invierte 120 veces por segundo y el soplo casi desaparece. El E7018 funciona en CA.' },
          { t: 'Inclinar el electrodo en contra del soplo y acortar el arco', ok: true, partial: true, why: 'Ayuda, aunque no elimina la causa.' },
          { t: 'Subirle 40 A para que el arco tenga más fuerza', ok: false, why: 'Más corriente da más campo magnético: el soplo empeora.' },
        ], defect: { type: 'falta_fusion', label: 'Falta de fusión por soplo de arco', location: 'interna', sev: 0.7 }, blowSide: 1 },
    ],
    ndt: { best: ['VT', 'MT'], ok: ['PT', 'UT'], waste: ['RT', 'HIDRO', 'MACRO'], notes: 'Filetes estructurales en acero: visual al 100 % y partículas magnéticas. La radiografía no es eficaz en filetes.' },
    reward: 180,
    successStory: 'El sábado hubo mercado. Doña Elena colgó un letrero: "Marquesina reparada por el soldador del pueblo".',
    failStory: 'Con la primera ventolera la columna crujió y tocó cerrar el mercado. El inspector de la alcaldía señaló la soldadura.',
  },

  // ===================================================================
  {
    id: 'puente', n: 3, title: 'La pasarela del río', place: 'Ribera del río Claro',
    client: { name: 'Ing. Lucía Andrade', role: 'Ingeniera de la alcaldía', avatar: '👷‍♀️', voice: 'ingeniera' },
    intro: [
      { who: 'client', text: 'Buenas. Vamos a cambiar la pasarela peatonal del río y necesito los empalmes de las aletas de la viga principal.' },
      { who: 'client', text: 'Lámina de 25 mm en S355, junta a tope de penetración completa. Le dejo el certificado del acero. Un inspector externo le va a pasar ultrasonido a todo.' },
      { who: 'mentor', text: 'Veinticinco milímetros ya es otra liga. Calcule el carbono equivalente antes de prender nada. Y piense bien el bisel: si lo deja muy cerrado, no le entra el arco a las paredes.' },
    ],
    mentor: 'Lámina gruesa: carbono equivalente → precalentamiento. Bisel con ángulo suficiente para fundir las paredes. Raíz, relleno y presentación, controlando la temperatura entre pasadas.',
    ficha: [['Material', 'S355J2+N'], ['Composición', 'C 0,18 · Mn 1,40 · Cr 0,05 · Mo 0,02 · V 0,01 · Ni 0,05 · Cu 0,10'], ['Espesor', '25 mm'], ['Unión', 'A tope, penetración completa (CJP)'], ['Norma', 'AWS D1.5 / EN 1090 EXC3'], ['Ensayo', 'UT 100 %']],
    questions: [
      { q: 'Con la composición del certificado, ¿cuánto da el carbono equivalente IIW? CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15', options: ['0,30', '0,44', '0,62', '0,18'], answer: 1, explain: 'CE = 0,18 + 1,40/6 + (0,05+0,02+0,01)/5 + (0,05+0,10)/15 = 0,18 + 0,233 + 0,016 + 0,010 ≈ 0,44.' },
      { q: 'Con CE ≈ 0,44 y 25 mm de espesor, ¿qué se hace?', options: ['No precalentar nunca', 'Precalentar (≈ 100 °C) y usar consumible de bajo hidrógeno', 'Enfriar con agua entre pasadas', 'Soldar en una sola pasada gigante'], answer: 1, explain: 'Por encima de CE ≈ 0,40, y con espesor grueso que enfría rápido, aumenta el riesgo de martensita y fisura en frío. El precalentamiento baja la velocidad de enfriamiento y deja salir el hidrógeno.' },
      { q: 'En la pasada de relleno: 28 V, 260 A, 5 mm/s y η = 0,8. ¿Aporte térmico (kJ/mm)? HI = η·V·I / (v·1000)', options: ['0,58 kJ/mm', '1,16 kJ/mm', '2,91 kJ/mm', '11,6 kJ/mm'], answer: 1, explain: 'HI = 0,8 × 28 × 260 / (5 × 1000) = 1,16 kJ/mm. Hay que mantenerlo dentro de lo calificado en el WPS para no perder tenacidad.' },
    ],
    material: 's355', thicknessMm: 25, joint: 'tope', env: 'taller', ambient: 'taller',
    piece: 'bridge', lengthMm: 80, passes: 3, timeScale: 1.6,
    acceptance: 'AWS D1.5 / EN 1090 EXC3: penetración completa, sin falta de fusión, sin grietas, sin inclusiones, porosidad ≤ 1 poro/100 mm. UT obligatorio.',
    critical: ['grieta', 'falta_fusion', 'falta_penetracion', 'sin_soldar', 'perforacion', 'inclusion', 'socavado'],
    processes: P({
      FCAW: { score: 100, why: 'FCAW con gas (E71T-1): gran depósito y la escoria protege; excelente fusión lateral en lámina gruesa.' },
      GMAW: { score: 95, why: 'MAG en taller, transferencia spray: productivo y de buena calidad.' },
      SAW: { score: 90, why: 'Excelente en lámina gruesa en plano; para un tramo corto también sirve.' },
      SMAW: { score: 70, why: 'Válido con E7018, pero lento para 25 mm y con más riesgo de inclusiones.' },
      GTAW_DC: { score: 25, why: 'Calidad excelente, pero eterno para 25 mm. Solo para la raíz.' },
      GTAW_AC: { score: 0, why: 'AC no tiene sentido en acero estructural.', forced: [{ type: 'falta_fusion', label: 'Proceso inadecuado', location: 'interna', sev: 0.7 }] },
      OAW: { score: 0, why: 'Imposible fundir 25 mm con calidad usando llama.', forced: [{ type: 'falta_fusion', label: 'Calor insuficiente', location: 'interna', sev: 1 }] },
      EBW: { score: 15, why: 'Lo haría en una pasada… si hubiera una cámara de vacío del tamaño de la viga.' },
    }),
    consumables: {
      MIG: [
        { id: 'aporte', label: 'Alambre', options: [
          { id: 'E71T1', name: 'E71T-1C tubular con gas Ø 1,2 mm', score: 100, why: 'Tubular rutílico: excelente en plano, alto depósito.' },
          { id: 'ER70S6', name: 'ER70S-6 sólido Ø 1,2 mm', score: 95, why: 'Alambre sólido estándar para S355.' },
          { id: 'ER308L', name: 'ER308L (inoxidable)', score: 0, why: 'Inoxidable en acero estructural: dilución y riesgo de fisuras.', defect: { type: 'grieta', label: 'Aporte incompatible', location: 'interna', sev: 0.8 } },
        ] },
        { id: 'gas', label: 'Gas', options: [
          { id: 'ArCO2', name: 'Argón 82 % / CO₂ 18 % (M21)', score: 100, why: 'Mezcla estándar: arco estable.' },
          { id: 'CO2', name: 'CO₂ 100 % (C1)', score: 85, why: 'Penetra bien y es barato; más salpicadura.' },
          { id: 'Ar', name: 'Argón 100 %', score: 10, why: 'En acero da arco errático y mala mojabilidad.', defect: { type: 'falta_fusion', label: 'Mala mojabilidad', location: 'interna', sev: 0.5 } },
        ] },
      ],
      SMAW: [
        { id: 'electrodo', label: 'Electrodo', options: [
          { id: 'E7018', name: 'E7018 bajo hidrógeno', score: 100, why: 'Obligatorio en puentes.' },
          { id: 'E6013', name: 'E6013 rutílico', score: 10, why: 'No permitido: hidrógeno y penetración insuficientes.', defect: { type: 'falta_fusion', label: 'Penetración insuficiente', location: 'interna', sev: 0.6 } },
        ] },
      ],
    },
    design: {
      note: 'Las láminas están sueltas en el taller: se pueden poner como uno quiera.',
      positions: [POS.p1G(100, 'Es taller y las láminas se pueden acostar: plano es lo más productivo y de mejor calidad.'), POS.p3Gup(60, 'Válido y calificable, pero más lento y difícil sin necesidad.'), POS.p4G(15, 'Sobrecabeza teniendo la opción de plano: mucho riesgo de inclusiones y de chorreo.')],
      bevels: [
        { id: 'V60', name: 'V simple a 60°, talón 2 mm, separación 2–3 mm + respaldo cerámico', score: 100, why: 'El estándar para CJP desde un solo lado con respaldo.', geom: { type: 'V', angle: 60, land: 2, gap: 2.5 } },
        { id: 'X60', name: 'Doble V (X) a 60°, talón 2 mm', score: 85, why: 'Menos metal de aporte y menos distorsión, pero hay que voltear la pieza y resanar la raíz por detrás.', geom: { type: 'X', angle: 60, land: 2, gap: 2 } },
        { id: 'V30', name: 'V cerrado a 30°', score: 35, why: 'Muy cerrado: el arco no alcanza las paredes y queda falta de fusión lateral.', geom: { type: 'V', angle: 30, land: 2, gap: 2.5 }, defect: { type: 'falta_fusion', label: 'Falta de fusión en las paredes del bisel', location: 'interna', sev: 0.6 } },
        { id: 'I', name: 'Recto, sin bisel', score: 0, why: 'Imposible penetrar 25 mm sin bisel.', geom: { type: 'I', gap: 2 }, defect: { type: 'falta_penetracion', label: 'Sin bisel: raíz sin fundir', location: 'raiz', sev: 1 } },
      ],
    },
    prep: [
      { id: 'bisel', label: 'Cortar el bisel con oxicorte y repasar con pulidora', kind: 'required', why: 'El bisel definido en el diseño hay que hacerlo y dejarlo limpio de escoria de corte.', missing: { type: 'falta_penetracion', label: 'Bisel sin preparar', location: 'raiz', sev: 0.8 }, anim: 'cut', minutes: 15 },
      { id: 'separacion', label: 'Ajustar separación de raíz y poner el respaldo cerámico', kind: 'required', why: 'La separación deja fundir la raíz; el respaldo sostiene el charco.', missing: { type: 'falta_penetracion', label: 'Raíz cerrada sin fundir', location: 'raiz', sev: 0.7 }, anim: 'gauge', readout: '📏 Separación 2,5 mm ✔', minutes: 4 },
      { id: 'limpiar', label: 'Pulir cascarilla y residuos de oxicorte', kind: 'required', why: 'Cascarilla y óxidos del corte dan inclusiones y poros.', missing: { type: 'inclusion', label: 'Inclusión de óxidos', location: 'interna', sev: 0.5 }, anim: 'grind', cleans: true, minutes: 6 },
      { id: 'precalentar', label: 'Precalentar a 100 °C con soplete y verificar con tiza térmica', detail: '75 mm a cada lado.', kind: 'required', why: 'CE 0,44 y 25 mm: sin precalentar aparece martensita + hidrógeno = fisura en frío.', missing: { type: 'grieta', label: 'Fisura en frío en la ZAT', location: 'interna', sev: 0.75 }, anim: 'torch', readout: '🌡️ 105 °C ✔', minutes: 10 },
      { id: 'interpass', label: 'Controlar temperatura entre pasadas (máx. 250 °C)', kind: 'required', why: 'El calor acumulado baja la tenacidad del S355.', missing: { type: 'irregular', label: 'Tenacidad reducida por sobrecalentamiento', location: 'interna', sev: 0.3 }, anim: 'thermo', readout: '🌡️ Pirómetro listo', minutes: 1 },
      { id: 'escoria', label: 'Quitar escoria y pulir arranques entre pasadas', kind: 'required', why: 'La escoria atrapada entre pasadas es una inclusión que el UT rechaza.', missing: { type: 'inclusion', label: 'Escoria entre pasadas', location: 'interna', sev: 0.6 }, anim: 'hammer', minutes: 3 },
      { id: 'martillar', label: 'Martillar la raíz al rojo para "compactarla"', kind: 'harmful', why: 'Martillar la raíz en caliente puede fisurarla.', defect: { type: 'grieta', label: 'Fisura en la raíz', location: 'raiz', sev: 0.5 }, anim: 'hammer', minutes: 2 },
    ],
    params: {
      MIG: { V: { ideal: [27, 30], ok: [25, 32] }, wfs: { ideal: [9, 11], ok: [8, 12.5] }, gas: { ideal: [16, 20], ok: [13, 24] } },
      SMAW: { I: { ideal: [130, 155], ok: [115, 170] }, pol: { ideal: ['DCEP (DC+)'], ok: ['AC'] } },
      AUTO: { P: { ideal: [16, 22], ok: [12, 26] }, v: { ideal: [7, 9], ok: [5, 11] } },
    },
    exec: { speed: { MIG: [4.5, 7], SMAW: [2.5, 3.8], TIG: [1, 1.8] }, lateralTol: 1.8 },
    incidents: [
      { id: 'interpaso', at: 0.5, pass: 1, when: c => !c.prepDone.has('interpass'), fx: 'heat', title: 'La lámina está muy caliente', text: 'Arrancando el relleno ves que la zona del bisel brilla y el charco se pone muy fluido. Sin control de temperatura no sabes a cuánto está… el pirómetro marca 340 °C.',
        options: [
          { t: 'Parar y esperar a que baje de 250 °C antes de seguir', ok: true, why: 'Correcto: con la temperatura entre pasadas controlada se conserva la tenacidad.' },
          { t: 'Seguir rápido para no perder tiempo', ok: false, why: 'A más de 250 °C la ZAT engrosa el grano y baja la tenacidad (y el charco se chorrea).' },
          { t: 'Enfriar con agua', ok: false, why: 'Enfriar con agua es un temple: martensita e hidrógeno.' },
        ], defect: { type: 'socavado', label: 'Socavado y pérdida de tenacidad por sobrecalentamiento', location: 'superficial', sev: 0.65 } },
    ],
    ndt: { best: ['VT', 'UT'], ok: ['RT', 'MT'], waste: ['PT', 'HIDRO', 'MACRO'], notes: 'Junta CJP en 25 mm: ultrasonido (encuentra faltas de fusión planas) más inspección visual.' },
    reward: 900,
    successStory: 'La pasarela se inauguró con banda municipal. El inspector de ultrasonido firmó el informe sin una sola indicación.',
    failStory: 'El inspector externo encontró indicaciones en el ultrasonido. Tocó cortar el empalme y la inauguración se corrió un mes.',
  },

  // ===================================================================
  {
    id: 'gasoducto', n: 4, title: 'La línea de gas de la vereda', place: 'Vereda El Encanto — derecho de vía',
    client: { name: 'Don Ramiro', role: 'Supervisor de la contratista de gas', avatar: '👨‍🔧', voice: 'operario' },
    intro: [
      { who: 'client', text: '¿Usted es el soldador que recomendó la ingeniera? Bien. Estamos llevando gas natural a la vereda y nos faltan juntas de línea.' },
      { who: 'client', text: 'Tubo de ocho pulgadas, X52, ya está sobre los polines en la zanja. No se puede rodar. Aquí se suelda como en todo el mundo: celulósico, de bajada, y rapidito la pasada caliente.' },
      { who: 'mentor', text: 'Ojo con los extremos de tubo: muchas veces vienen magnetizados de la inspección. Si el arco se le va de lado en el bisel, ya sabe qué es.' },
    ],
    mentor: 'Tubería en campo: tubo fijo (5G), E6010 de bajada en la raíz, pasada caliente inmediata. El tubo puede venir magnetizado.',
    ficha: [['Material', 'API 5L X52 PSL2'], ['Tubo', '8 5/8" (219 mm) × 8,2 mm'], ['Norma', 'API 1104'], ['Bisel de fábrica', '30° ± 5° por lado, talón 1,6 mm'], ['Condición', 'Campo abierto, viento, tubo fijo sobre polines'], ['Servicio', 'Gas natural, 600 psi']],
    questions: [
      { q: '¿Por qué en tubería de línea la raíz se hace con E6010 en progresión descendente?', options: ['Porque es el electrodo más barato', 'Porque el revestimiento celulósico da un arco muy penetrante y "excavador" que funde bien la raíz a alta velocidad bajando', 'Porque es de bajo hidrógeno', 'Porque funciona en CA'], answer: 1, explain: 'El celulósico genera un arco muy enérgico y una escoria poca y rápida; de bajada permite avanzar rápido con penetración completa. Por eso es el estándar de API 1104 en raíz.' },
      { q: '¿Para qué se hace la "pasada caliente" pocos minutos después de la raíz?', options: ['Para dar color', 'Para fundir las "huellas de vagón" (escoria atrapada a los lados de la raíz) y darle cuerpo antes de que se fisure', 'Para enfriar la raíz', 'No hace falta'], answer: 1, explain: 'La raíz celulósica es delgada y tiene hidrógeno. La pasada caliente refunde la escoria de los lados, revenido y da sección resistente antes de mover la tubería.' },
      { q: 'El arco se desvía fuerte en el bisel y el tubo "pega" el imán. ¿Causa y solución?', options: ['Viento; poner carpa', 'Magnetismo residual del tubo (soplo magnético); desmagnetizar con bobina o enrollar el cable para crear un campo contrario', 'Electrodo húmedo; secarlo', 'Mucha corriente; bajarla'], answer: 1, explain: 'Los tubos inspeccionados con MFL o rasqueteados quedan magnetizados. Se mide con gaussímetro y se compensa con una bobina (o vueltas del cable de masa) que genere un campo opuesto.' },
    ],
    material: 'x52', thicknessMm: 8.2, joint: 'circunferencial', env: 'campo', ambient: 'campo',
    piece: 'gasline', lengthMm: 340, passes: 2, timeScale: 4,
    acceptance: 'API 1104: penetración completa, sin falta de fusión, sin grietas, sin quemones (perforación), inclusiones dentro de límites. RT o UT al 100 % en línea de gas.',
    critical: ['grieta', 'falta_fusion', 'falta_penetracion', 'sin_soldar', 'perforacion', 'inclusion'],
    processes: P({
      SMAW: { score: 100, why: 'El estándar de línea: E6010 en raíz y E8010 en caliente/relleno. Portátil con motosoldador y aguanta viento.' },
      FCAW: { score: 75, why: 'Autoprotegido (FCAW-S) sirve muy bien para relleno y presentación; la raíz se hace igual con celulósico.' },
      GMAW: { score: 45, why: 'Raíces mecanizadas (STT/RMD) existen, pero en campo con viento el gas se va sin carpa.', forced: [{ type: 'porosidad', label: 'Gas barrido por el viento', location: 'interna', sev: 0.6 }] },
      GTAW_DC: { score: 30, why: 'Raíz TIG de excelente calidad, pero lentísima y el viento se lleva el argón.', forced: [{ type: 'porosidad', label: 'Argón barrido', location: 'interna', sev: 0.5 }] },
      OAW: { score: 0, why: 'Prohibido en línea de gas de esta presión.', forced: [{ type: 'falta_fusion', label: 'Proceso no calificado', location: 'interna', sev: 1 }] },
      SAW: { score: 5, why: 'El SAW es para fabricar el tubo en la planta, no para la junta en zanja.' },
    }),
    consumables: {
      SMAW: [
        { id: 'raiz', label: 'Electrodo de raíz', options: [
          { id: 'E6010', name: 'E6010 Ø 4,0 mm (5/32") — celulósico', score: 100, why: 'El rey de la raíz de tubería de bajada.' },
          { id: 'E7018', name: 'E7018 Ø 3,2 mm — básico', score: 45, why: 'Es de subida y lento; en raíz abierta de bajada no funciona bien.', defect: { type: 'falta_penetracion', label: 'Raíz con E7018 descendente', location: 'raiz', sev: 0.6 } },
          { id: 'E6013', name: 'E6013 — rutílico', score: 0, why: 'No penetra la raíz ni está calificado para línea.', defect: { type: 'falta_penetracion', label: 'Raíz sin penetrar', location: 'raiz', sev: 0.9 } },
        ] },
        { id: 'relleno', label: 'Electrodo de caliente y relleno', options: [
          { id: 'E8010', name: 'E8010-P1 Ø 4,0 mm — celulósico de mayor resistencia', score: 100, why: 'Iguala la resistencia del X52 y corre de bajada.' },
          { id: 'E6010', name: 'E6010 Ø 4,0 mm', score: 75, why: 'Funciona, aunque para X52 lo usual es E7010/E8010.' },
          { id: 'E6013', name: 'E6013', score: 10, why: 'No calificado para línea de gas.', defect: { type: 'inclusion', label: 'Escoria del rutílico', location: 'interna', sev: 0.5 } },
        ] },
      ],
      MIG: [
        { id: 'aporte', label: 'Alambre', options: [ { id: 'E71T8', name: 'E71T8-Ni1 autoprotegido', score: 90, why: 'Muy usado para relleno de línea.' }, { id: 'ER70S6', name: 'ER70S-6 con gas', score: 50, why: 'El viento se lleva el gas.' } ] },
      ],
    },
    design: {
      note: 'La tubería ya está tendida sobre polines en la zanja: no se puede girar.',
      positions: [POS.p5Gdn(100, 'API 1104 de línea: tubo fijo y progresión descendente con celulósico. Rápido y con penetración completa.'), POS.p5Gup(60, 'Válido con E7018, pero más lento; con E6010 de subida la raíz queda con exceso de penetración.'), POS.rodado(0, 'La línea ya está tendida en la zanja: no se puede rodar.'), POS.p6G(10, 'El tubo está horizontal, no a 45°.')],
      bevels: [
        { id: 'API', name: 'Bisel de fábrica 30° por lado, talón 1,6 mm, separación 1,6 mm', score: 100, why: 'El bisel API estándar: deja pasar el arco celulósico y funde bien.', geom: { type: 'V', angle: 60, land: 1.6, gap: 1.6 } },
        { id: 'cerrado', name: 'Sin separación (tubos tocándose)', score: 25, why: 'Sin separación la raíz no penetra.', geom: { type: 'V', angle: 60, land: 1.6, gap: 0 }, defect: { type: 'falta_penetracion', label: 'Raíz sin separación', location: 'raiz', sev: 0.8 } },
        { id: 'abierto', name: 'Separación de 5 mm', score: 30, why: 'Demasiado abierto: quemones y raíz colgada.', geom: { type: 'V', angle: 60, land: 1.6, gap: 5 }, defect: { type: 'perforacion', label: 'Quemón en la raíz', location: 'raiz', sev: 0.7 } },
      ],
    },
    prep: [
      { id: 'limpiarBisel', label: 'Pulir el bisel y 25 mm del recubrimiento', kind: 'required', why: 'El recubrimiento y el óxido del bisel contaminan la soldadura.', missing: { type: 'porosidad', label: 'Porosidad por recubrimiento', location: 'interna', sev: 0.55 }, anim: 'grind', cleans: true, minutes: 6 },
      { id: 'grapa', label: 'Alinear con grapa externa (desalineación < 1,6 mm)', kind: 'required', why: 'Desalineación = raíz con escalón y falta de fusión.', missing: { type: 'falta_fusion', label: 'Desalineación (hi-lo)', location: 'raiz', sev: 0.55 }, anim: 'clamp', minutes: 5 },
      { id: 'gauss', label: 'Medir magnetismo del bisel con gaussímetro y desmagnetizar', kind: 'good', why: 'Evita el soplo magnético antes de que aparezca.', anim: 'demag', readout: '🧲 38 G → 4 G', minutes: 6 },
      { id: 'carpa', label: 'Poner carpa cortavientos', kind: 'good', why: 'Protege el charco y al soldador del viento.', anim: 'gauge', readout: '⛺ Carpa instalada', minutes: 5 },
      { id: 'precalentar', label: 'Precalentar a 50–100 °C (secar humedad)', kind: 'good', why: 'Quita la humedad del rocío y ayuda con el hidrógeno del celulósico.', anim: 'torch', readout: '🌡️ 80 °C', minutes: 5 },
      { id: 'hornoCel', label: 'Meter los E6010 al horno a 120 °C', kind: 'harmful', why: '¡Error! Los celulósicos necesitan su humedad para funcionar; secarlos los daña.', defect: { type: 'porosidad', label: 'Celulósico resecado: arco inestable', location: 'interna', sev: 0.5 }, anim: 'oven', readout: '🔥 120 °C', minutes: 30 },
    ],
    params: {
      SMAW: { I: { ideal: [105, 135], ok: [90, 150] }, pol: { ideal: ['DCEP (DC+)'], ok: [], bad: { 'AC': { type: 'falta_fusion', label: 'E6010 no corre en CA', location: 'interna', sev: 0.8 }, 'DCEN (DC−)': { type: 'falta_penetracion', label: 'E6010 en DCEN: arco débil', location: 'raiz', sev: 0.6 } } } },
      MIG: { V: { ideal: [18, 20], ok: [17, 22] }, wfs: { ideal: [4, 5.5], ok: [3.5, 6.5] }, gas: { ideal: [0, 18], ok: [0, 22] } },
    },
    exec: { speed: { SMAW: [3.5, 5.5], MIG: [4, 6] }, lateralTol: 1.4 },
    incidents: [
      { id: 'soplo', at: 0.08, when: c => c.fam === 'SMAW' && !c.prepDone.has('gauss'), fx: 'arcblow', title: '¡El arco se va de lado en el bisel!', text: 'Apenas arrancas, el arco se dispara hacia un lado del bisel, la escoria se mete adelante y la raíz no moja. El imán casi se queda pegado solo en el extremo del tubo.',
        options: [
          { t: 'Parar, medir con gaussímetro y desmagnetizar con bobina (o enrollar el cable para compensar)', ok: true, anim: 'demag', why: 'Correcto: el tubo venía magnetizado. Con un campo opuesto el arco vuelve a su sitio.' },
          { t: 'Cambiar a corriente alterna', ok: false, why: 'El E6010 no funciona en CA (para eso existe el E6011). Arco inestable.' },
          { t: 'Subir el amperaje y apretar el arco', ok: false, why: 'Más corriente, más campo: no corrige la causa.' },
        ], defect: { type: 'falta_fusion', label: 'Falta de fusión por soplo magnético', location: 'raiz', sev: 0.75 } },
      { id: 'pegado', at: 0.55, pass: 0, when: c => c.fam === 'SMAW', fx: 'stick', title: 'Se pegó el electrodo', text: 'Bajando por las 4 en punto acercaste demasiado y el electrodo se pegó a la raíz.',
        options: [
          { t: 'Soltarlo con un giro de muñeca, picar, pulir el arranque y reanudar sobre el cordón', ok: true, why: 'Correcto: los arranques se pulen para no dejar escoria ni falta de fusión.' },
          { t: 'Arrancarlo y seguir encima sin pulir', ok: false, why: 'Queda escoria y un arranque frío en la raíz.' },
        ], defect: { type: 'inclusion', label: 'Escoria en el reinicio', location: 'raiz', sev: 0.6 } },
    ],
    ndt: { best: ['VT', 'RT'], ok: ['UT'], waste: ['PT', 'MT', 'MACRO', 'HIDRO'], notes: 'En línea de gas API 1104: visual y radiografía (o AUT) al 100 %. La prueba hidrostática se hace después a todo el tramo, no junta por junta.' },
    reward: 2500,
    successStory: 'Las placas de rayos X salieron limpias. La vereda prendió su primera estufa a gas y Don Ramiro le ofreció trabajo fijo en la cuadrilla.',
    failStory: 'Las placas mostraron defectos en la raíz. Tocó cortar la junta, rebiselar y repetir: la cuadrilla perdió un día entero.',
  },

  // ===================================================================
  {
    id: 'lecheria', n: 5, title: 'El tanque de la lechería', place: 'Lechería La Esperanza',
    client: { name: 'Don Aurelio', role: 'Quesero de tercera generación', avatar: '🧑‍🌾', voice: 'aurelio' },
    intro: [
      { who: 'client', text: 'Se me está saliendo la leche por una unión de la tubería que va del tanque frío a la pasteurizadora.' },
      { who: 'client', text: 'Es inoxidable sanitario. Si queda una rugosidad o una manchita por dentro, ahí se pegan las bacterias y el INVIMA me cierra.' },
      { who: 'mentor', text: 'Aquí lo que importa es lo de adentro. El inoxidable caliente con aire se oxida; si no protege la raíz con gas, por dentro queda como azúcar quemada.' },
    ],
    mentor: 'Tubería sanitaria: el interior importa tanto como el exterior. Raíz protegida con purga de argón y color máximo paja.',
    ficha: [['Material', 'AISI 316L (≤ 0,03 % C, 2–3 % Mo)'], ['Tubo', 'Ø 38,1 mm × 2 mm, pulido sanitario'], ['Norma', 'AWS D18.1 / ASME BPE'], ['Servicio', 'Leche y limpieza CIP con soda y ácido'], ['Ubicación', 'Instalada, entre el tanque y la pasteurizadora']],
    questions: [
      { q: '¿Por qué se usa 316L ("L") y no 316 normal?', options: ['Porque es más barato', 'Por el bajo carbono (≤ 0,03 %), que evita la precipitación de carburos de cromo en la ZAT (sensibilización)', 'Porque es magnético', 'Porque funde más fácil'], answer: 1, explain: 'Entre ~450 y 850 °C el carbono forma carburos de cromo en los bordes de grano y deja zonas empobrecidas en Cr que se corroen. Con poco carbono no hay carburos.' },
      { q: '¿Qué nivel de oxígeno se busca en la purga interior antes de soldar?', options: ['Menos de 21 %', 'Menos de ~50 ppm', 'Menos de 5 %', 'No importa'], answer: 1, explain: 'Para una raíz sanitaria sin coloración se purga con argón hasta muy pocas ppm de O₂ (típicamente < 50 ppm), medido con analizador.' },
    ],
    material: 'ss316l', thicknessMm: 2, joint: 'circunferencial', env: 'industrial', ambient: 'industrial',
    piece: 'pipe', lengthMm: 120, passes: 1, timeScale: 2,
    acceptance: 'AWS D18.1 / ASME BPE: penetración completa, raíz lisa, coloración máxima nivel 3 (paja), sin poros, sin grietas, sin falta de fusión.',
    critical: ['grieta', 'falta_fusion', 'falta_penetracion', 'sin_soldar', 'perforacion', 'oxidacion', 'porosidad'],
    processes: P({
      GTAW_DC: { score: 100, why: 'TIG en DCEN es el proceso sanitario por excelencia: limpio, sin escoria, raíz controlada.' },
      LBW: { score: 70, why: 'El láser hace uniones sanitarias excelentes, pero necesita equipo orbital que no hay.' },
      GTAW_AC: { score: 30, why: 'AC en inoxidable da arco menos estable y gasta el tungsteno.', forced: [{ type: 'irregular', label: 'Arco inestable en AC', location: 'superficial', sev: 0.4 }] },
      GMAW: { score: 20, why: 'MIG en 2 mm: perfora fácil, salpica y deja la raíz irregular.', forced: [{ type: 'salpicaduras', label: 'Salpicaduras en zona sanitaria', location: 'superficial', sev: 0.5 }] },
      SMAW: { score: 5, why: 'La escoria quedaría por dentro de la tubería de leche.', forced: [{ type: 'inclusion', label: 'Escoria en la raíz sanitaria', location: 'raiz', sev: 0.9 }] },
      FCAW: { score: 0, why: 'Escoria y 2 mm: inaceptable.', forced: [{ type: 'inclusion', label: 'Escoria', location: 'raiz', sev: 0.9 }] },
      OAW: { score: 0, why: 'La llama carbura el inoxidable y le quita su resistencia a la corrosión.', forced: [{ type: 'oxidacion', label: 'Inoxidable carburado', location: 'superficial', sev: 1 }] },
      EBW: { score: 30, why: 'Calidad perfecta, pero la instalación no cabe en una cámara de vacío.' },
    }),
    consumables: {
      TIG: [
        { id: 'aporte', label: 'Varilla de aporte', options: [
          { id: 'ER316L', name: 'ER316L', score: 100, why: 'Igual al metal base: conserva el molibdeno que aguanta la leche y los químicos de limpieza.' },
          { id: 'ER308L', name: 'ER308L', score: 50, why: 'Le falta molibdeno: la soldadura queda como punto débil frente a cloruros.', defect: { type: 'oxidacion', label: 'Menor resistencia a corrosión', location: 'superficial', sev: 0.3 } },
          { id: 'ER70S6', name: 'ER70S-6 (acero al carbono)', score: 0, why: 'Se oxida en semanas y contamina la leche.', defect: { type: 'oxidacion', label: 'Herrumbre en unión sanitaria', location: 'superficial', sev: 1 } },
        ] },
        { id: 'gas', label: 'Gas (antorcha y purga)', options: [
          { id: 'Ar', name: 'Argón 100 % en antorcha y en purga', score: 100, why: 'El estándar sanitario.' },
          { id: 'ArCO2', name: 'Argón 82 % / CO₂ 18 %', score: 0, why: 'Oxida el tungsteno y el charco.', defect: { type: 'oxidacion', label: 'Gas oxidante', location: 'superficial', sev: 0.9 } },
        ] },
      ],
    },
    design: {
      note: 'El tramo está instalado, pero tiene uniones bridadas: se puede desmontar y llevar al banco.',
      positions: [POS.p5Gup(100, 'En sitio, tubo fijo: es como se hace normalmente una reparación sanitaria.'), POS.rodado(90, 'Desmontar el tramo y rodarlo en el banco da una soldadura muy pareja, a cambio de más tiempo de desmontaje.'), POS.p6G(40, 'No hay razón para soldarlo inclinado.')],
      bevels: [
        { id: 'I', name: 'A tope recto, sin separación (escuadrado y refrentado)', score: 100, why: 'En 2 mm sanitario se suelda a tope recto, extremos perfectamente escuadrados.' },
        { id: 'V', name: 'Bisel en V', score: 20, why: 'En 2 mm no se bisela: necesitarías mucho aporte y el interior quedaría irregular.' },
      ],
    },
    prep: [
      { id: 'escuadrar', label: 'Cortar con cortatubos y refrentar los extremos', kind: 'required', why: 'Extremos irregulares dejan huecos: penetración desigual.', missing: { type: 'falta_penetracion', label: 'Penetración desigual', location: 'raiz', sev: 0.5 }, anim: 'grind', minutes: 5 },
      { id: 'acetona', label: 'Limpiar con acetona y cepillo de inox exclusivo', kind: 'required', why: 'La grasa da poros; un cepillo usado en acero contamina con hierro.', missing: { type: 'porosidad', label: 'Porosidad por contaminación', location: 'interna', sev: 0.5 }, anim: 'rag', cleans: true, minutes: 2 },
      { id: 'purga', label: 'Tapones, cinta y purga interior con argón hasta < 50 ppm O₂', kind: 'required', why: 'Sin gas por dentro la raíz se oxida (azucarado).', missing: { type: 'oxidacion', label: 'Raíz azucarada (sin purga)', location: 'raiz', sev: 1 }, anim: 'purge', readout: 'O₂: 20 900 → 35 ppm ✔', minutes: 6 },
      { id: 'alinear', label: 'Alinear con abrazadera (desalineación < 10 % del espesor)', kind: 'required', why: 'Un escalón interior es una trampa de bacterias.', missing: { type: 'irregular', label: 'Escalón interior', location: 'raiz', sev: 0.5 }, anim: 'clamp', minutes: 3 },
      { id: 'disco', label: 'Pulir con el disco que se usó en hierro', kind: 'harmful', why: 'Contamina con hierro: aparecen puntos de óxido.', defect: { type: 'oxidacion', label: 'Contaminación ferrosa', location: 'superficial', sev: 0.5 }, anim: 'grind', minutes: 2 },
      { id: 'precalentar', label: 'Precalentar a 150 °C', kind: 'harmful', why: 'Los austeníticos no se precalientan: más tiempo en 450–850 °C favorece la sensibilización.', defect: { type: 'oxidacion', label: 'Exceso de coloración', location: 'superficial', sev: 0.4 }, anim: 'torch', readout: '🌡️ 150 °C', minutes: 6 },
      { id: 'punteo', label: 'Puntear 4 puntos pequeños con la purga activa', kind: 'good', why: 'Mantiene la alineación sin oxidar la raíz.', anim: 'tack', minutes: 2 },
    ],
    params: {
      TIG: { I: { ideal: [55, 75], ok: [45, 90] }, gas: { ideal: [8, 12], ok: [6, 15] }, bal: { ideal: [65, 75], ok: [60, 80] } },
      MIG: { V: { ideal: [16, 18], ok: [15, 19] }, wfs: { ideal: [4, 5], ok: [3, 6] }, gas: { ideal: [12, 16], ok: [10, 20] } },
    },
    exec: { speed: { TIG: [1.4, 2.4], MIG: [5, 8] }, lateralTol: 0.7, dabEveryMm: 3 },
    incidents: [
      { id: 'o2', at: 0.02, when: c => c.prepDone.has('purga') && c.fam === 'TIG', fx: 'o2', title: 'El analizador todavía marca 180 ppm', text: 'Vas a arrancar, pero el analizador de oxígeno de la purga apenas va en 180 ppm. Hace calor y el quesero está afanado.',
        options: [
          { t: 'Esperar a que baje de 50 ppm antes de prender el arco', ok: true, why: 'Correcto: dos minutos más de purga valen una raíz limpia.' },
          { t: 'Arrancar ya, total ya casi', ok: false, why: 'Con 180 ppm la raíz sale azul-gris: rechazable en sanitario.' },
          { t: 'Subir el caudal de purga al máximo', ok: false, why: 'Caudal excesivo presuriza el tubo, hunde la raíz y crea turbulencia que mete aire.' },
        ], defect: { type: 'oxidacion', label: 'Raíz coloreada (purga insuficiente)', location: 'raiz', sev: 0.6 } },
    ],
    ndt: { best: ['VT', 'HIDRO'], ok: ['PT', 'RT'], waste: ['UT', 'MT', 'MACRO'], notes: 'Sanitario: visual por fuera y de la raíz (boroscopio) y prueba de fuga. RT sirve para penetración. MT no funciona en austenítico y UT no es fiable en 2 mm.' },
    reward: 1500,
    successStory: 'El de sanidad metió el boroscopio: raíz lisa, color paja. Don Aurelio le regaló un queso madurado entero.',
    failStory: 'La raíz oxidada empezó a acumular residuos. En el control sanitario apareció contaminación y la lechería paró dos semanas.',
  },

  // ===================================================================
  {
    id: 'glp', n: 6, title: 'El tanque de gas propano', place: 'Distribuidora El Fogón',
    client: { name: 'Ing. Andrés Peña', role: 'Inspector de recipientes a presión', avatar: '🦺', voice: 'inspector' },
    intro: [
      { who: 'client', text: 'Le traemos un tanque estacionario de GLP de dos mil litros. En la prueba periódica apareció una grieta corta en la costura circunferencial.' },
      { who: 'client', text: 'Es SA-516 grado 70, diez milímetros. La reparación va con procedimiento calificado y después le hacemos prueba hidrostática. Ah, y lo vaciamos esta mañana… ojo con eso.' },
      { who: 'mentor', text: 'Mijo, este es el caso más peligroso de todos. Un tanque que tuvo gas nunca está vacío hasta que el explosímetro diga cero. Aquí no se prende un arco sin permiso de trabajo en caliente.' },
    ],
    mentor: 'Recipiente que contuvo combustible: primero desgasificar, inertizar o llenar de agua y medir LEL. Luego ranurar la grieta hasta sano, soldar con bajo hidrógeno y probar hidrostáticamente.',
    ficha: [['Recipiente', 'Tanque horizontal Ø 1,0 m × 2,8 m, 2 000 L'], ['Código', 'ASME VIII Div. 1 · reparación según NBIC / ASME PCC-2'], ['Material', 'SA-516 Gr.70 · 10 mm'], ['MAWP', '250 psi (1,72 MPa)'], ['Servicio anterior', 'GLP (propano-butano), LIE propano ≈ 2,1 % vol'], ['Defecto', 'Grieta de 40 mm en costura circunferencial']],
    questions: [
      { q: 'Antes de soldar un tanque que tuvo propano, ¿qué lectura del explosímetro permite trabajo en caliente?', options: ['Menos de 50 % del LIE', '0 % LIE (o al menos < 10 % LIE según el procedimiento) y oxígeno normal, medido dentro del tanque', 'No hace falta medir si ya se vació', 'Menos de 2,1 %'], answer: 1, explain: 'El LIE del propano es ~2,1 % en volumen. La práctica segura exige 0 % LIE (máx. 10 % LIE según norma/permiso), con el recipiente desgasificado, inertizado con N₂ o lleno de agua, y medición continua.' },
      { q: '¿Cómo se prepara la grieta antes de soldar?', options: ['Se suelda encima para taparla', 'Se ranura (arco-aire o disco) hasta metal sano, se verifica con PT/MT que no quede grieta y se perfila el canal', 'Se rellena con masilla epóxica', 'Se calienta al rojo'], answer: 1, explain: 'Soldar sobre una grieta la deja atrapada y crece en servicio. Se elimina por completo, se comprueba con ensayo superficial y se suelda el canal con un procedimiento calificado.' },
      { q: 'ASME VIII Div. 1 (UG-99): ¿con qué presión se hace la prueba hidrostática si MAWP = 250 psi (sin corrección por temperatura)?', options: ['250 psi', '325 psi (1,3 × MAWP)', '500 psi', '187 psi'], answer: 1, explain: 'Desde 1999 la prueba hidrostática estándar es 1,3 × MAWP × relación de esfuerzos (1 si no hay corrección por temperatura): 1,3 × 250 = 325 psi.' },
    ],
    material: 'sa516', thicknessMm: 10, joint: 'circunferencial', env: 'taller', ambient: 'taller',
    piece: 'tank', lengthMm: 120, passes: 2, timeScale: 1.6,
    acceptance: 'ASME VIII Div. 1 / NBIC: sin grietas, sin falta de fusión, penetración completa, porosidad dentro de UW-51/Apéndice 4. Prueba hidrostática 1,3 × MAWP sin fugas.',
    critical: ['grieta', 'falta_fusion', 'falta_penetracion', 'sin_soldar', 'perforacion', 'inclusion', 'porosidad'],
    processes: P({
      SMAW: { score: 100, why: 'E7018 calificado: bajo hidrógeno y muy versátil para reparaciones de recipientes.' },
      GTAW_DC: { score: 80, why: 'Excelente para la raíz; para todo el canal es lento, pero válido.' },
      FCAW: { score: 75, why: 'Productivo; requiere procedimiento calificado y control de la escoria.' },
      GMAW: { score: 60, why: 'En cortocircuito tiene riesgo de falta de fusión en recipientes a presión.', forced: [{ type: 'falta_fusion', label: 'Falta de fusión por cortocircuito frío', location: 'interna', sev: 0.4 }] },
      OAW: { score: 0, why: 'No calificado para recipiente a presión.', forced: [{ type: 'falta_fusion', label: 'Proceso no calificado', location: 'interna', sev: 1 }] },
      SAW: { score: 40, why: 'Ideal para fabricar costuras, no para reparar un tramo de 120 mm.' },
    }),
    consumables: {
      SMAW: [
        { id: 'electrodo', label: 'Electrodo', options: [
          { id: 'E7018', name: 'E7018 Ø 3,2 mm, del horno', score: 100, why: 'Bajo hidrógeno y resistencia acorde con SA-516-70.' },
          { id: 'E6010', name: 'E6010', score: 40, why: 'Mucho hidrógeno para un recipiente a presión.', defect: { type: 'grieta', label: 'Fisura por hidrógeno', location: 'interna', sev: 0.4 } },
          { id: 'E6013', name: 'E6013', score: 10, why: 'No calificado para recipientes a presión.', defect: { type: 'inclusion', label: 'Escoria del rutílico', location: 'interna', sev: 0.5 } },
        ] },
      ],
      TIG: [ { id: 'aporte', label: 'Varilla', options: [ { id: 'ER70S2', name: 'ER70S-2', score: 100, why: 'Muy usada en raíces de recipientes.' }, { id: 'ER308L', name: 'ER308L', score: 0, why: 'Incompatible.', defect: { type: 'grieta', label: 'Aporte incompatible', location: 'interna', sev: 0.8 } } ] } ],
      MIG: [ { id: 'aporte', label: 'Alambre', options: [ { id: 'E71T1', name: 'E71T-1C', score: 100, why: 'Correcto.' }, { id: 'ER70S6', name: 'ER70S-6', score: 90, why: 'Correcto.' } ] } ],
    },
    design: {
      note: 'El tanque está en el taller y se puede montar sobre rodillos giratorios.',
      positions: [POS.rodado(100, 'Si se puede girar, se gira: en rodillos el canal queda siempre arriba y se suelda en plano.'), POS.p2G(60, 'Soldar el canal donde quedó (costado del tanque) es posible, pero más difícil y lento.'), POS.p4G(20, 'Sobrecabeza teniendo rodillos disponibles: sin sentido.')],
      bevels: [
        { id: 'U', name: 'Ranurar con arco-aire hasta metal sano y perfilar en U con disco', score: 100, why: 'Elimina la grieta completa y deja un canal con radio que funde bien.', geom: { type: 'V', angle: 70, land: 1, gap: 2 } },
        { id: 'V', name: 'Canal en V con disco', score: 80, why: 'Válido si se elimina toda la grieta; en V se gasta más aporte.', geom: { type: 'V', angle: 60, land: 1.5, gap: 2 } },
        { id: 'tapar', name: 'Soldar encima de la grieta sin ranurar', score: 0, why: 'La grieta queda adentro y crece con la presión.', geom: { type: 'I', gap: 0 }, defect: { type: 'grieta', label: 'Grieta original atrapada', location: 'interna', sev: 1 } },
      ],
    },
    prep: [
      { id: 'ventear', label: 'Vaciar el remanente de GLP, ventear y lavar con agua', kind: 'required', why: 'El GLP es más pesado que el aire y se queda en el fondo.', missing: null, anim: 'water', minutes: 30 },
      { id: 'inertizar', label: 'Inertizar con nitrógeno (o llenar de agua hasta la zona a soldar)', kind: 'required', why: 'Desplaza el oxígeno y los vapores combustibles.', missing: null, anim: 'purge', readout: 'N₂ fluyendo… O₂ 3 %', minutes: 20 },
      { id: 'lel', label: 'Medir con explosímetro dentro del tanque (LEL)', kind: 'required', why: 'Sin medición no hay permiso de trabajo en caliente.', missing: null, anim: 'detector', readout: '📟 LEL 0 % ✔', minutes: 5 },
      { id: 'permiso', label: 'Permiso de trabajo en caliente, extintor y vigía de fuego', kind: 'required', why: 'Requisito de seguridad obligatorio.', missing: { type: 'irregular', label: 'Trabajo sin permiso (falta grave de seguridad)', location: 'superficial', sev: 0.3 }, anim: 'gauge', readout: '📝 Permiso firmado', minutes: 5 },
      { id: 'ranurar', label: 'Ranurar la grieta con arco-aire y verificar con partículas magnéticas', kind: 'required', why: 'Hay que confirmar que no quedó grieta antes de soldar.', missing: { type: 'grieta', label: 'Resto de grieta sin eliminar', location: 'interna', sev: 0.8 }, anim: 'cut', minutes: 15 },
      { id: 'horno', label: 'Sacar los E7018 del horno de mantenimiento', kind: 'required', requiredIf: c => c.cons.electrodo === 'E7018', why: 'Bajo hidrógeno de verdad: el electrodo debe estar seco.', missing: { type: 'porosidad', label: 'Porosidad por electrodo húmedo', location: 'interna', sev: 0.5 }, anim: 'oven', readout: '🔥 120 °C', minutes: 2 },
      { id: 'precalentar', label: 'Precalentar a 95 °C', kind: 'good', why: 'No es obligatorio en 10 mm de P-No.1, pero seca la humedad y reduce tensiones en una reparación con restricción.', anim: 'torch', readout: '🌡️ 95 °C', minutes: 6 },
      { id: 'cerrado', label: 'Soldar con las válvulas cerradas para que no entre aire', kind: 'harmful', why: '¡Peligro! Calentar un recipiente cerrado sube la presión interna, y si queda gas es una bomba.', defect: { type: 'grieta', label: 'Sobrepresión interna', location: 'interna', sev: 0.5 }, anim: 'gauge', minutes: 1 },
    ],
    params: {
      SMAW: { I: { ideal: [105, 130], ok: [95, 145] }, pol: { ideal: ['DCEP (DC+)'], ok: ['AC'] } },
      TIG: { I: { ideal: [110, 140], ok: [95, 160] }, gas: { ideal: [10, 14], ok: [8, 18] } },
      MIG: { V: { ideal: [22, 25], ok: [20, 27] }, wfs: { ideal: [6, 8], ok: [5, 9] }, gas: { ideal: [15, 20], ok: [12, 24] } },
    },
    exec: { speed: { SMAW: [2.5, 3.8], TIG: [1.2, 2], MIG: [4, 6] }, lateralTol: 1.4, dabEveryMm: 3 },
    incidents: [
      { id: 'explosimetro', at: 0.0, when: c => !(c.prepDone.has('ventear') && c.prepDone.has('inertizar') && c.prepDone.has('lel')), fx: 'lel', title: '¡ALARMA DEL EXPLOSÍMETRO!', text: 'El vigía acerca el detector a la boca de inspección y suena la alarma: 38 % del LIE. Hay vapores de propano adentro y tú tienes la pinza en la mano.',
        options: [
          { t: 'No prender el arco. Salir, ventilar, lavar, inertizar con N₂ y volver a medir hasta 0 % LIE', ok: true, fixPrep: 'lel', why: 'Correcto. Ningún trabajo vale una explosión. Se reinicia el procedimiento de desgasificación.' },
          { t: 'Soldar rápido, total es solo un ratico', ok: false, fatal: true, why: 'Con vapor de propano dentro, el calor del arco lo inflama. Así ocurren los accidentes más graves en talleres.' },
        ], defect: null },
    ],
    ndt: { best: ['VT', 'MT', 'RT', 'HIDRO'], ok: ['UT', 'PT'], waste: ['MACRO'], notes: 'Reparación de recipiente: MT del canal antes y después, RT de la reparación según el código y prueba hidrostática a 1,3 × MAWP.' },
    reward: 4000,
    successStory: 'La radiografía salió limpia y el tanque aguantó la hidrostática a 325 psi sin perder ni una libra. El inspector estampó el sello de reparación.',
    failStory: 'En la prueba hidrostática el manómetro empezó a bajar: fuga por la reparación. El tanque quedó fuera de servicio y la distribuidora perdió la confianza.',
    catastropheStory: 'Se prendió el arco y hubo una deflagración dentro del tanque. Por fortuna el vigía te había obligado a ponerte de lado y nadie salió herido de gravedad, pero el tanque quedó destruido y el taller fue sellado. Esto le ha pasado a soldadores reales: nunca se suelda un recipiente que tuvo combustible sin medir.',
  },

  // ===================================================================
  {
    id: 'avion', n: 7, title: 'El motor del avión', place: 'Aeródromo de Valle Alto — AeroValle MRO',
    client: { name: 'Capitana Sofía Reyes', role: 'Directora técnica de AeroValle', avatar: '👩‍✈️', voice: 'capitana' },
    intro: [
      { who: 'client', text: 'Me hablaron muy bien de usted. Tenemos una máquina de haz de electrones y un trabajo delicado: unir las dos etapas del tambor del compresor de alta de un turbofán.' },
      { who: 'client', text: 'Titanio 6-4, doce milímetros, unión circunferencial de penetración completa en una sola pasada. AWS D17.1 clase A. Esa pieza vale más que todo el pueblo.' },
      { who: 'mentor', text: 'El haz es corriente eléctrica: cualquier magnetismo lo desvía. Y el titanio caliente se traga el oxígeno. Limpieza de quirófano, ajuste perfecto, buen vacío… y no se le olvide la rampa de salida.' },
    ],
    mentor: 'EBW: el haz se desvía con cualquier campo magnético. El titanio caliente absorbe O, N, H. Ajuste sin holgura, vacío alto y rampa de salida al cerrar la vuelta.',
    ficha: [['Material', 'Ti-6Al-4V (AMS 4928)'], ['Espesor', '12 mm, unión a tope circunferencial'], ['Norma', 'AWS D17.1 Clase A'], ['Máquina', 'EBW 60 kV / 100 mA, cámara 4 m³'], ['Requisito', 'Penetración completa en una pasada, cordón plateado']],
    questions: [
      { q: '¿Por qué EBW logra 12 mm en una sola pasada y TIG no?', options: ['Porque usa más amperaje', 'Por la densidad de potencia (~10⁷ W/cm² frente a ~10⁴ del arco): vaporiza un "keyhole" que atraviesa el espesor', 'Porque el titanio funde más fácil en vacío', 'Porque usa aporte especial'], answer: 1, explain: 'Con densidades de potencia tan altas se forma un agujero de vapor (keyhole) que el haz recorre en todo el espesor, con relaciones profundidad/ancho de 10:1 o más.' },
      { q: 'Con 60 kV y 70 mA, ¿qué potencia tiene el haz?', options: ['4,2 kW', '420 W', '42 kW', '0,86 kW'], answer: 0, explain: 'P = V × I = 60 000 V × 0,070 A = 4 200 W = 4,2 kW.' },
      { q: 'El cordón de titanio sale azul. ¿Qué indica?', options: ['Que quedó perfecto', 'Contaminación por oxígeno/nitrógeno (vacío o protección insuficiente): fragilización, rechazo en clase A', 'Que le faltó corriente', 'Nada, es estético'], answer: 1, explain: 'En titanio el color indica contaminación: plateado/paja claro es aceptable; azul, violeta, gris o blanco indican fragilización por intersticiales.' },
    ],
    material: 'ti64', thicknessMm: 12, joint: 'circunferencial', env: 'camara', ambient: 'camara_vacio',
    piece: 'drum', lengthMm: 300, passes: 1, timeScale: 1.8, overlap: 0.12,
    acceptance: 'AWS D17.1 Clase A: penetración completa, sin grietas, sin falta de fusión, porosidad ≤ 0,3 mm aislada, cordón plateado, sin desalineación del haz. RT 100 %.',
    critical: ['grieta', 'falta_fusion', 'falta_penetracion', 'sin_soldar', 'perforacion', 'oxidacion', 'desalineacion_haz', 'spiking', 'crater', 'porosidad'],
    processes: P({
      EBW: { score: 100, why: 'Penetración completa en una pasada, ZAT mínima, casi sin distorsión, y el vacío protege al titanio.' },
      LBW: { score: 65, why: 'Podría, con protección integral de gas, pero 12 mm en una pasada es su límite.' },
      GTAW_DC: { score: 30, why: 'TIG con arrastre sirve en titanio, pero 12 mm piden muchas pasadas: distorsión en un rotor balanceado.', forced: [{ type: 'deformacion', label: 'Distorsión por múltiples pasadas', location: 'superficial', sev: 0.6 }, { type: 'oxidacion', label: 'Coloración entre pasadas', location: 'superficial', sev: 0.4 }] },
      GTAW_AC: { score: 5, why: 'AC no se usa en titanio.', forced: [{ type: 'oxidacion', label: 'Contaminación', location: 'superficial', sev: 0.8 }] },
      GMAW: { score: 0, why: 'MIG en un rotor aeronáutico: inaceptable.', forced: [{ type: 'oxidacion', label: 'Titanio fragilizado', location: 'superficial', sev: 1 }] },
      SMAW: { score: 0, why: 'Jamás. Titanio con escoria y aire es titanio frágil.', forced: [{ type: 'oxidacion', label: 'Titanio fragilizado', location: 'superficial', sev: 1 }, { type: 'grieta', label: 'Fisuras por fragilización', location: 'interna', sev: 1 }] },
      FCAW: { score: 0, why: 'Inaceptable en titanio.', forced: [{ type: 'oxidacion', label: 'Titanio fragilizado', location: 'superficial', sev: 1 }] },
      OAW: { score: 0, why: 'La llama contamina el titanio por completo.', forced: [{ type: 'oxidacion', label: 'Titanio fragilizado', location: 'superficial', sev: 1 }] },
      SAW: { score: 0, why: 'No aplica a titanio aeronáutico.', forced: [{ type: 'oxidacion', label: 'Titanio fragilizado', location: 'superficial', sev: 1 }] },
    }),
    consumables: {
      EBW: [
        { id: 'aporte', label: 'Material de aporte', options: [
          { id: 'none', name: 'Sin aporte (autógena, junta ajustada)', score: 100, why: 'EBW normalmente no lleva aporte si el ajuste es perfecto.' },
          { id: 'cuna', name: 'Lámina de Ti-6Al-4V ELI en la junta', score: 70, why: 'Útil para compensar pérdida de material; aquí el ajuste es perfecto.' },
          { id: 'ER70S6', name: 'Varilla ER70S-6', score: 0, why: 'Acero en titanio: intermetálicos frágiles.', defect: { type: 'grieta', label: 'Intermetálicos Fe-Ti', location: 'interna', sev: 1 } },
        ] },
        { id: 'cupon', label: 'Cupón testigo', options: [
          { id: 'si', name: 'Soldar antes un cupón testigo del mismo lote', score: 100, why: 'Obligatorio en D17.1: se corta y se analiza la macro sin arriesgar la pieza.' },
          { id: 'no', name: 'No, directo a la pieza', score: 30, why: 'Sin cupón no hay cómo verificar penetración sin destruir el rotor.' },
        ] },
      ],
    },
    design: {
      note: 'La pieza va montada en el mandril del posicionador giratorio dentro de la cámara.',
      positions: [POS.rodado(100, 'El posicionador gira el tambor bajo el haz vertical: la soldadura siempre queda en plano.'), POS.p2G(40, 'Con haz horizontal habría que reubicar el cañón; más riesgo de caída del charco en 12 mm.')],
      bevels: [
        { id: 'I', name: 'A tope recto con ajuste a presión (separación < 0,1 mm)', score: 100, why: 'EBW sin aporte: la junta recta y ajustada es lo correcto.' },
        { id: 'V', name: 'Bisel en V', score: 0, why: 'EBW no necesita bisel; un bisel sin aporte deja la junta hundida.', defect: { type: 'concavidad', label: 'Cordón hundido por bisel sin aporte', location: 'superficial', sev: 0.8 } },
      ],
    },
    prep: [
      { id: 'desmagnetizar', label: 'Desmagnetizar pieza y utillaje (< 0,5 G)', kind: 'required', why: 'El magnetismo residual desvía el haz fuera de la junta.', anim: 'demag', readout: '🧲 2,1 G → 0,3 G ✔', minutes: 5, effect: 'demag' },
      { id: 'decapado', label: 'Decapado químico (HF-HNO₃), enjuague y secado', kind: 'required', why: 'Óxidos y capa alfa dan porosidad en titanio.', missing: { type: 'porosidad', label: 'Porosidad por óxidos', location: 'interna', sev: 0.6 }, anim: 'rag', cleans: true, minutes: 15 },
      { id: 'guantes', label: 'Manipular solo con guantes de nitrilo y limpiar con acetona', kind: 'required', why: 'La grasa de los dedos es hidrógeno y carbono.', missing: { type: 'porosidad', label: 'Porosidad por huellas', location: 'interna', sev: 0.4 }, anim: 'rag', minutes: 2 },
      { id: 'ajuste', label: 'Ajuste a presión: separación < 0,1 mm, desalineación < 0,25 mm', kind: 'required', why: 'Sin aporte no se toleran holguras.', missing: { type: 'concavidad', label: 'Socavado por separación', location: 'superficial', sev: 0.7 }, anim: 'gauge', readout: '📏 0,05 mm ✔', minutes: 6 },
      { id: 'puntos', label: 'Puntear con el haz a baja potencia (4 puntos a 90°)', kind: 'good', why: 'Evita que la junta se abra.', anim: 'tack', minutes: 2 },
      { id: 'alinearHaz', label: 'Alinear el haz con la junta (cámara óptica, 1 mA)', kind: 'required', why: 'Un haz de 1 mm debe caer sobre la junta con precisión de décimas.', anim: 'gauge', readout: '🎯 Haz alineado', minutes: 3, effect: 'align' },
      { id: 'lija', label: 'Lijar la junta con lija de óxido de aluminio', kind: 'harmful', why: 'Incrusta partículas abrasivas en el titanio.', defect: { type: 'inclusion', label: 'Partículas abrasivas incrustadas', location: 'interna', sev: 0.5 }, anim: 'brush', minutes: 3 },
    ],
    params: {
      EBW: { kV: { ideal: [55, 65], ok: [45, 80] }, mA: { ideal: [62, 78], ok: [52, 90] }, foc: { ideal: [-5, -3], ok: [-7, -1] }, v: { ideal: [8, 11], ok: [6.5, 13] }, vac: { ideal: ['1×10⁻⁴', '5×10⁻⁵'], ok: ['1×10⁻³'] } },
      AUTO: { P: { ideal: [5, 6.5], ok: [4, 7.5] }, v: { ideal: [12, 16], ok: [9, 20] } },
      TIG: { I: { ideal: [150, 180], ok: [130, 200] }, gas: { ideal: [14, 18], ok: [11, 22] } },
    },
    exec: { speed: { TIG: [1, 1.8] }, lateralTol: 0.35, dabEveryMm: 3 },
    incidents: [],
    ndt: { best: ['VT', 'RT', 'MACRO'], ok: ['UT', 'PT'], waste: ['MT', 'HIDRO'], notes: 'D17.1 Clase A: visual (color plateado), radiografía al 100 % y macro del cupón testigo.' },
    reward: 12000,
    successStory: 'El motor pasó las pruebas en banco a 14 000 rpm. AeroValle le ofreció ser su soldador certificado de EBW y el pueblo entero salió en el periódico.',
    failStory: 'En la prueba en banco la vibración delató la soldadura. El rotor se desechó y AeroValle canceló el contrato.',
  },
];
