// =====================================================================
//  Soldador del Pueblo — datos técnicos: materiales, procesos y misiones
//  Valores orientativos basados en práctica de taller (AWS D1.1, D1.2,
//  D17.1, ISO 3834, EN 1011). Simplificados para el juego.
// =====================================================================

export const MATERIALS = {
  al6061: {
    id: 'al6061', name: 'Aluminio 6061-T6', short: 'Al 6061', ferromagnetic: false, color: '#c9ccd1', density: 2.70,
    tests: {
      iman: 'El imán no se pega. Material no ferromagnético.',
      chispa: 'Sin chispas: el disco se embota y deja virutas blandas y plateadas.',
      peso: 'Muy ligero: densidad estimada ≈ 2,7 g/cm³.',
      aspecto: 'Gris plata mate con una fina capa de óxido blanquecina. Las soldaduras de fábrica son finas y escamadas.',
      documento: 'Calcomanía en el cuadro: «6061 T6 – heat treated».',
    },
  },
  a36: {
    id: 'a36', name: 'Acero al carbono A36 / S275', short: 'A36', ferromagnetic: true, color: '#55585c', density: 7.85,
    tests: {
      iman: 'El imán se pega con fuerza. Ferromagnético.',
      chispa: 'Chispas largas amarillo-anaranjadas, rectas y con pocas ramificaciones: acero de bajo carbono.',
      peso: 'Pesado: densidad estimada ≈ 7,85 g/cm³.',
      aspecto: 'Gris oscuro con cascarilla de laminación azulada, pintura vieja y óxido.',
      documento: 'Plano municipal de 1987: «perfil HEB 160 – acero dulce A36».',
    },
  },
  s355: {
    id: 's355', name: 'Acero estructural S355J2 (A572 Gr.50)', short: 'S355', ferromagnetic: true, color: '#4e5257', density: 7.85,
    tests: {
      iman: 'El imán se pega con fuerza. Ferromagnético.',
      chispa: 'Chispas amarillas con algunas estrellitas y ramificaciones: algo más de carbono y manganeso que un acero dulce.',
      peso: 'Pesado: densidad estimada ≈ 7,85 g/cm³.',
      aspecto: 'Chapa gruesa de 25 mm con cascarilla de laminación gris-azulada.',
      documento: 'Certificado de colada EN 10204 3.1: «S355J2+N — CE = 0,45».',
    },
  },
  ss316l: {
    id: 'ss316l', name: 'Acero inoxidable AISI 316L', short: 'Inox 316L', ferromagnetic: false, color: '#b9bec4', density: 8.0,
    tests: {
      iman: 'El imán no se pega (austenítico). Apenas un leve tirón en zonas dobladas en frío.',
      chispa: 'Pocas chispas, cortas, rojo-anaranjadas y sin ramificar.',
      peso: 'Pesado: densidad estimada ≈ 8,0 g/cm³.',
      aspecto: 'Plateado brillante con acabado pulido sanitario.',
      documento: 'Placa del fabricante: «AISI 316L — apto contacto alimentario».',
    },
  },
  ti64: {
    id: 'ti64', name: 'Titanio Ti-6Al-4V (grado 5)', short: 'Ti-6Al-4V', ferromagnetic: false, color: '#9da1a4', density: 4.43,
    tests: {
      iman: 'El imán no se pega. No ferromagnético.',
      chispa: 'Chispas blanco brillante, muy intensas, con destellos al final.',
      peso: 'Ligero para ser tan duro: densidad estimada ≈ 4,4 g/cm³.',
      aspecto: 'Gris mate claro, mecanizado de precisión aeronáutica.',
      documento: 'Plano del motor: «AMS 4928 — Ti-6Al-4V».',
    },
  },
  fundicion: { id: 'fundicion', name: 'Fundición gris', short: 'Fundición', ferromagnetic: true, color: '#4a4a4a', density: 7.2 },
  cobre: { id: 'cobre', name: 'Cobre C110', short: 'Cobre', ferromagnetic: false, color: '#b87333', density: 8.9 },
};

export const MATERIAL_TESTS = [
  { id: 'iman', name: 'Prueba del imán', icon: '🧲', sfx: 'magnet_click' },
  { id: 'chispa', name: 'Prueba de chispa', icon: '✨', sfx: 'grinder' },
  { id: 'peso', name: 'Pesar y medir', icon: '⚖️', sfx: 'clamp' },
  { id: 'aspecto', name: 'Examinar aspecto', icon: '🔍', sfx: 'page' },
  { id: 'documento', name: 'Revisar documentación', icon: '📄', sfx: 'page' },
];

// ---------------------------------------------------------------------
// Procesos
// ---------------------------------------------------------------------
export const PROCESSES = {
  SMAW:    { id: 'SMAW',    family: 'SMAW', name: 'SMAW — Electrodo revestido', desc: 'Arco con electrodo recubierto. Robusto, portátil y tolera viento; deja escoria.', tool: 'stinger', exec: 'manual' },
  GMAW:    { id: 'GMAW',    family: 'MIG',  name: 'GMAW / MAG — MIG', desc: 'Alambre continuo con gas de protección. Rápido y productivo; el viento sopla el gas.', tool: 'mig', exec: 'manual' },
  FCAW:    { id: 'FCAW',    family: 'MIG',  name: 'FCAW — Alambre tubular', desc: 'Alambre con fundente en el núcleo. Alta tasa de depósito; deja escoria.', tool: 'mig', exec: 'manual' },
  GTAW_DC: { id: 'GTAW_DC', family: 'TIG',  name: 'GTAW (TIG) — Corriente continua', desc: 'Electrodo de tungsteno y argón, DCEN. Precisión máxima en aceros e inoxidables.', tool: 'tig', exec: 'manual' },
  GTAW_AC: { id: 'GTAW_AC', family: 'TIG',  name: 'GTAW (TIG) — Corriente alterna', desc: 'TIG en alterna: la fase EP rompe la capa de óxido. Imprescindible en aluminio.', tool: 'tig', exec: 'manual' },
  OAW:     { id: 'OAW',     family: 'OAW',  name: 'OAW — Oxiacetilénica', desc: 'Llama de oxígeno y acetileno. Calor muy disperso; hoy casi solo para reparaciones menores.', tool: 'oaw', exec: 'manual' },
  SAW:     { id: 'SAW',     family: 'AUTO', name: 'SAW — Arco sumergido', desc: 'Arco bajo una capa de fundente granulado, mecanizado. Enorme depósito en posición plana.', tool: 'saw', exec: 'auto' },
  LBW:     { id: 'LBW',     family: 'AUTO', name: 'LBW — Soldadura láser', desc: 'Haz láser de alta densidad. Cordones estrechos y profundos, requiere ajuste preciso.', tool: 'laser', exec: 'auto' },
  EBW:     { id: 'EBW',     family: 'EBW',  name: 'EBW — Haz de electrones', desc: 'Haz de electrones acelerados en vacío. Penetración profunda tipo «keyhole», mínima ZAT y cero contaminación.', tool: 'ebw', exec: 'auto' },
};

// Parámetros por familia. heat = exponente de influencia sobre el aporte térmico.
export const PARAM_DEFS = {
  TIG: [
    { id: 'I', label: 'Corriente', unit: 'A', min: 5, max: 300, step: 1, def: 120, heat: 1 },
    { id: 'gas', label: 'Caudal de argón', unit: 'L/min', min: 2, max: 25, step: 0.5, def: 12, heat: 0,
      issues: { low: { type: 'porosidad', label: 'Protección insuficiente', location: 'interna' }, high: { type: 'porosidad', label: 'Turbulencia: aspira aire', location: 'interna' } } },
    { id: 'bal', label: 'Balance AC (% EN)', unit: '%', min: 50, max: 90, step: 1, def: 70, heat: 0, onlyFor: ['GTAW_AC'],
      issues: { low: { type: 'inclusion_tungsteno', label: 'Tungsteno sobrecalentado', location: 'interna' }, high: { type: 'inclusion', label: 'Óxido sin romper', location: 'interna' } } },
  ],
  MIG: [
    { id: 'V', label: 'Voltaje', unit: 'V', min: 14, max: 34, step: 0.5, def: 22, heat: 0.6,
      issues: { low: { type: 'irregular', label: 'Arco corto, cordón abultado', location: 'superficial' }, high: { type: 'socavado', label: 'Arco largo', location: 'superficial' } } },
    { id: 'wfs', label: 'Velocidad de alambre', unit: 'm/min', min: 2, max: 16, step: 0.1, def: 7, heat: 0.8 },
    { id: 'gas', label: 'Caudal de gas', unit: 'L/min', min: 5, max: 30, step: 0.5, def: 15, heat: 0,
      issues: { low: { type: 'porosidad', label: 'Protección insuficiente', location: 'interna' }, high: { type: 'porosidad', label: 'Turbulencia', location: 'interna' } } },
  ],
  SMAW: [
    { id: 'I', label: 'Corriente', unit: 'A', min: 40, max: 250, step: 1, def: 110, heat: 1,
      issues: { low: { type: 'inclusion', label: 'Escoria atrapada (arco frío)', location: 'interna' }, high: { type: 'salpicaduras', label: 'Electrodo al rojo', location: 'superficial' } } },
  ],
  OAW: [
    { id: 'llama', label: 'Tipo de llama', unit: '', options: ['Carburante', 'Neutra', 'Oxidante'], def: 'Neutra', heat: 0 },
    { id: 'boq', label: 'Número de boquilla', unit: '', min: 1, max: 8, step: 1, def: 3, heat: 1 },
  ],
  AUTO: [
    { id: 'P', label: 'Potencia', unit: 'kW', min: 0.5, max: 12, step: 0.1, def: 3, heat: 1 },
    { id: 'v', label: 'Velocidad de avance', unit: 'mm/s', min: 2, max: 60, step: 0.5, def: 15, heat: -1, isSpeed: true },
  ],
  EBW: [
    { id: 'kV', label: 'Tensión de aceleración', unit: 'kV', min: 30, max: 150, step: 1, def: 90, heat: 1,
      issues: { high: { type: 'spiking', label: 'Haz demasiado energético', location: 'raiz' } } },
    { id: 'mA', label: 'Corriente del haz', unit: 'mA', min: 5, max: 150, step: 1, def: 30, heat: 1 },
    { id: 'foc', label: 'Posición del foco', unit: 'mm', min: -12, max: 4, step: 0.5, def: 0, heat: 0,
      issues: { low: { type: 'spiking', label: 'Foco demasiado profundo', location: 'raiz' }, high: { type: 'falta_penetracion', label: 'Foco sobre la superficie: cordón ancho y somero', location: 'raiz' } } },
    { id: 'v', label: 'Velocidad de avance', unit: 'mm/s', min: 2, max: 30, step: 0.5, def: 15, heat: -1, isSpeed: true },
    { id: 'vac', label: 'Vacío de la cámara', unit: 'mbar', options: ['1×10⁻¹', '1×10⁻²', '1×10⁻³', '1×10⁻⁴', '5×10⁻⁵'], def: '1×10⁻²', heat: 0 },
  ],
};

// Distancia ideal de trabajo por familia (mm) y nombre que ve el jugador
export const STANDOFF = {
  TIG: { ideal: 2.5, label: 'Longitud de arco' },
  MIG: { ideal: 15, label: 'Distancia boquilla-pieza' },
  SMAW: { ideal: 3.2, label: 'Longitud de arco' },
  OAW: { ideal: 3, label: 'Distancia del dardo' },
  AUTO: { ideal: 0, label: '' }, EBW: { ideal: 0, label: '' },
};

// ---------------------------------------------------------------------
// Ensayos aceptables por misión se definen en cada misión (ndt)
// ---------------------------------------------------------------------

const allProcesses = (scores) => Object.keys(PROCESSES).map(id => ({ id, ...(scores[id] || { score: 0, why: 'No es adecuado para este trabajo.' }) }));

export const MISSIONS = [
  // ===================================================================
  {
    id: 'bici', n: 1, title: 'La bici de Mateo', place: 'Calle del Molino',
    client: { name: 'Mateo', role: '8 años, futuro campeón de BMX', avatar: '🧒' },
    intro: [
      '¡Snif… snif! Salté la rampa del parque y… ¡crac! Se partió el tubo de mi bici.',
      'Mañana es la carrera del pueblo. Mi papá dice que la bici es de aluminio del bueno… ¿la puedes arreglar? Tengo 12 monedas.',
    ],
    mentor: 'El aluminio es traicionero: no cambia de color antes de fundirse y su capa de óxido funde a 2 050 °C, mientras el metal lo hace a 660 °C. Hay que romper ese óxido.',
    material: 'al6061', thicknessMm: 1.6, joint: 'circunferencial', env: 'taller', ambient: 'taller',
    piece: 'bike', lengthMm: 60, passes: 1, timeScale: 1.4,
    acceptance: 'Uso recreativo — criterio visual tipo AWS D1.2: sin grietas, sin perforaciones, sin falta de fusión. Se admite poro aislado pequeño.',
    critical: ['grieta', 'perforacion', 'sin_soldar', 'falta_fusion', 'falta_penetracion'],
    processes: allProcesses({
      GTAW_AC: { score: 100, why: 'Perfecto: la fase de electrodo positivo de la corriente alterna «limpia» el óxido, y el control fino del calor evita perforar una pared de 1,6 mm.' },
      GMAW: { score: 55, why: 'Posible con MIG pulsado y alambre de aluminio, pero en pared de 1,6 mm el riesgo de perforar es alto y el cordón queda tosco.' },
      GTAW_DC: { score: 15, why: 'En corriente continua (DCEN) no hay acción de limpieza: el óxido queda atrapado y el charco no moja.' },
      LBW: { score: 35, why: 'Técnicamente posible, pero no tenemos láser en el pueblo y el aluminio refleja el haz. Excesivo para una bici.' },
      SMAW: { score: 5, why: 'Los electrodos de aluminio dan muy mala calidad y en 1,6 mm perforarías el tubo de inmediato.' },
      OAW: { score: 10, why: 'La llama calienta una zona enorme: destemplas el 6061-T6 y deformas el cuadro.' },
      FCAW: { score: 0, why: 'No existe alambre tubular práctico para aluminio.' },
      SAW: { score: 0, why: 'Arco sumergido es para chapas gruesas en posición plana, no para un tubo de bici.' },
      EBW: { score: 25, why: 'Daría una soldadura bellísima… pero meter una bici en una cámara de vacío de millones de euros por 12 monedas no tiene sentido.' },
    }),
    consumables: {
      TIG: [
        { id: 'aporte', label: 'Varilla de aporte', options: [
          { id: 'ER4043', name: 'ER4043 (Al-5Si)', score: 100, why: 'El silicio aumenta la fluidez y reduce el agrietamiento en caliente del 6061.' },
          { id: 'ER5356', name: 'ER5356 (Al-5Mg)', score: 80, why: 'Válida y más resistente, pero algo más propensa a fisurar en 6061 sin buen diseño.' },
          { id: 'none', name: 'Sin aporte (autógena)', score: 10, why: 'El 6061 sin aporte es muy sensible a la fisuración en caliente.', defect: { type: 'grieta', label: 'Fisura de solidificación', location: 'superficial', sev: 0.8 } },
          { id: 'ER70S6', name: 'ER70S-6 (acero)', score: 0, why: 'Es acero: no se mezcla con aluminio, forma compuestos intermetálicos frágiles.', defect: { type: 'grieta', label: 'Intermetálicos Fe-Al frágiles', location: 'superficial', sev: 1 } },
          { id: 'ER308L', name: 'ER308L (inoxidable)', score: 0, why: 'Inoxidable sobre aluminio: incompatible.', defect: { type: 'grieta', label: 'Metal de aporte incompatible', location: 'superficial', sev: 1 } },
        ] },
        { id: 'gas', label: 'Gas de protección', options: [
          { id: 'Ar', name: 'Argón 100 %', score: 100, why: 'Estándar para TIG en aluminio.' },
          { id: 'ArHe', name: 'Argón 75 % / Helio 25 %', score: 85, why: 'Más calor y penetración; útil en espesores mayores. Correcto pero innecesario aquí.' },
          { id: 'ArCO2', name: 'Argón 82 % / CO₂ 18 %', score: 0, why: 'El CO₂ oxida el aluminio y destruye el tungsteno.', defect: { type: 'porosidad', label: 'Gas oxidante', location: 'interna', sev: 0.9 } },
          { id: 'CO2', name: 'CO₂ 100 %', score: 0, why: 'Totalmente oxidante: no sirve para TIG ni para aluminio.', defect: { type: 'porosidad', label: 'Gas oxidante', location: 'interna', sev: 1 } },
        ] },
        { id: 'tungsteno', label: 'Electrodo de tungsteno', options: [
          { id: 'WL15', name: 'Lantanado 1,5 % (dorado) Ø 1,6 mm', score: 100, why: 'Excelente en AC y DC, arranque estable.' },
          { id: 'WP', name: 'Puro (verde) Ø 2,4 mm', score: 80, why: 'El clásico para AC, forma bola estable. Correcto.' },
          { id: 'WC20', name: 'Ceriado 2 % (gris) Ø 1,6 mm', score: 90, why: 'Buen arranque a bajo amperaje. Correcto.' },
        ] },
      ],
      MIG: [
        { id: 'aporte', label: 'Alambre', options: [
          { id: 'ER4043', name: 'ER4043 Ø 0,9 mm + pistola spool', score: 90, why: 'Correcto para aluminio con pistola de carrete.' },
          { id: 'ER70S6', name: 'ER70S-6 Ø 0,8 mm (acero)', score: 0, why: 'Alambre de acero en aluminio: imposible.', defect: { type: 'grieta', label: 'Intermetálicos Fe-Al', location: 'superficial', sev: 1 } },
        ] },
        { id: 'gas', label: 'Gas', options: [
          { id: 'Ar', name: 'Argón 100 %', score: 100, why: 'Correcto para MIG en aluminio.' },
          { id: 'ArCO2', name: 'Argón 82 % / CO₂ 18 %', score: 0, why: 'Oxidante para aluminio.', defect: { type: 'porosidad', label: 'Gas oxidante', location: 'interna', sev: 0.9 } },
        ] },
      ],
    },
    prep: [
      { id: 'parar', label: 'Taladrar Ø 3 mm en los extremos de la grieta', detail: 'Detiene la propagación de la fisura.', kind: 'good', why: 'Un agujero de parada evita que la grieta siga creciendo bajo el cordón.', sfx: 'grinder', minutes: 3 },
      { id: 'acetona', label: 'Desengrasar con acetona y paño limpio', detail: 'Quita grasa de cadena y suciedad.', kind: 'required', why: 'La grasa se descompone en hidrógeno: porosidad garantizada en aluminio.', missing: { type: 'porosidad', label: 'Porosidad por grasa', location: 'interna', sev: 0.6 }, sfx: 'wire_brush', minutes: 2, cleans: true },
      { id: 'cepilloInox', label: 'Cepillar con cepillo de inox exclusivo para aluminio', detail: 'Retira la capa de óxido justo antes de soldar.', kind: 'required', why: 'El óxido de aluminio funde a 2 050 °C y queda atrapado como inclusión.', missing: { type: 'inclusion', label: 'Inclusión de óxido', location: 'interna', sev: 0.6 }, sfx: 'wire_brush', minutes: 2, cleans: true },
      { id: 'cepilloAcero', label: 'Cepillar con cepillo de acero al carbono', detail: 'El de la mesa, el que se usa para todo.', kind: 'harmful', why: 'Incrusta partículas de hierro en el aluminio: contaminación y corrosión.', defect: { type: 'inclusion', label: 'Contaminación con hierro', location: 'interna', sev: 0.5 }, sfx: 'wire_brush', minutes: 2 },
      { id: 'precalentar', label: 'Precalentar el tubo a 250 °C con soplete', detail: '', kind: 'harmful', why: 'El 6061-T6 pierde su tratamiento térmico: el tubo queda blando (sobreenvejecido).', defect: { type: 'deformacion', label: 'Pérdida del temple T6 / ablandamiento', location: 'superficial', sev: 0.5 }, sfx: 'vent_hiss', minutes: 5 },
      { id: 'plantilla', label: 'Alinear el cuadro en la plantilla y fijar', detail: 'Mantiene la geometría de la bici.', kind: 'required', why: 'Sin fijación, el calor tuerce el cuadro y la rueda no queda alineada.', missing: { type: 'deformacion', label: 'Cuadro desalineado', location: 'superficial', sev: 0.5 }, sfx: 'clamp', minutes: 3 },
      { id: 'punteo', label: 'Dar 2 puntos de soldadura (punteado)', detail: '', kind: 'good', why: 'Los puntos mantienen la separación durante la soldadura.', sfx: 'tack', minutes: 1 },
    ],
    params: {
      TIG: { I: { ideal: [55, 75], ok: [45, 90] }, gas: { ideal: [8, 12], ok: [6, 16] }, bal: { ideal: [65, 75], ok: [60, 80] } },
      MIG: { V: { ideal: [16, 18], ok: [15, 20] }, wfs: { ideal: [5, 6.5], ok: [4, 7.5] }, gas: { ideal: [12, 18], ok: [9, 22] } },
    },
    exec: { speed: { TIG: [1.6, 2.6], MIG: [5, 8] }, lateralTol: 0.9, dabEveryMm: 3.2 },
    ndt: { best: ['VT', 'PT'], ok: ['RT'], waste: ['UT', 'MT', 'HIDRO', 'MACRO'], notes: 'En pared fina de aluminio basta con inspección visual y líquidos penetrantes. El ultrasonido no es fiable en 1,6 mm y las partículas magnéticas no funcionan en aluminio.' },
    reward: 12,
    successStory: 'Mateo ganó la carrera del pueblo. Ahora todos los niños quieren pegatinas de «Soldado por el taller».',
    failStory: 'En la primera rampa de la carrera el tubo se partió de nuevo por la soldadura. Mateo no se hizo daño, pero lloró el doble…',
  },

  // ===================================================================
  {
    id: 'mercado', n: 2, title: 'La marquesina del mercado', place: 'Plaza del Mercado',
    client: { name: 'Doña Elena', role: 'Presidenta de la asociación del mercado', avatar: '👩‍🦳' },
    intro: [
      'Un camión de reparto golpeó la columna de la marquesina y la placa base quedó arrancada. ¡El sábado es día de mercado!',
      'Hay que soldar de nuevo la columna a su placa base aquí mismo, en la plaza. Hoy sopla bastante viento.',
    ],
    mentor: 'Trabajo de campo, al aire libre y con viento: elige un proceso cuya protección no se lleve el aire. Y elige bien el electrodo, que es una estructura.',
    material: 'a36', thicknessMm: 10, joint: 'filete', env: 'exterior', ambient: 'exterior',
    piece: 'column', lengthMm: 110, passes: 1, timeScale: 1.5,
    acceptance: 'Estructura estática — AWS D1.1 inspección visual: garganta mínima 7 mm, sin grietas, sin falta de fusión, socavado ≤ 1 mm.',
    critical: ['grieta', 'falta_fusion', 'sin_soldar', 'perforacion', 'falta_penetracion', 'socavado'],
    processes: allProcesses({
      SMAW: { score: 100, why: 'Ideal en campo: el revestimiento genera su propio gas y escoria, el viento no lo afecta y el equipo es portátil.' },
      FCAW: { score: 85, why: 'El alambre tubular autoprotegido (FCAW-S) también aguanta el viento. Muy buena opción si se dispone de él.' },
      GMAW: { score: 35, why: 'Con viento el gas de protección se dispersa: porosidad casi segura sin pantallas cortavientos.', forced: [{ type: 'porosidad', label: 'Gas barrido por el viento', location: 'interna', sev: 0.75 }] },
      GTAW_DC: { score: 20, why: 'Lentísimo para 10 mm y el argón no aguanta el viento.', forced: [{ type: 'porosidad', label: 'Argón barrido por el viento', location: 'interna', sev: 0.6 }] },
      GTAW_AC: { score: 5, why: 'Corriente alterna en acero no aporta nada y el viento barre el argón.', forced: [{ type: 'porosidad', label: 'Argón barrido por el viento', location: 'interna', sev: 0.6 }] },
      OAW: { score: 10, why: 'Demasiado lento y con calor disperso para una unión estructural de 10 mm.', forced: [{ type: 'falta_fusion', label: 'Calor insuficiente en 10 mm', location: 'interna', sev: 0.7 }] },
      SAW: { score: 15, why: 'Requiere posición plana y un carro; no es práctico en una columna en plena plaza.' },
      LBW: { score: 0, why: 'No hay láser portátil para obra en el pueblo.' },
      EBW: { score: 0, why: 'No puedes meter la plaza del mercado en una cámara de vacío.' },
    }),
    consumables: {
      SMAW: [
        { id: 'electrodo', label: 'Electrodo (AWS A5.1)', options: [
          { id: 'E7018', name: 'E7018 — bajo hidrógeno', score: 100, why: 'El estándar para estructuras: bajo hidrógeno, buena tenacidad. Necesita estar seco.' },
          { id: 'E6013', name: 'E6013 — rutílico, uso general', score: 55, why: 'Fácil de usar y bonito, pero de penetración baja y no es de bajo hidrógeno: no recomendado para estructural.', defect: { type: 'falta_fusion', label: 'Penetración superficial del E6013', location: 'interna', sev: 0.35 } },
          { id: 'E6010', name: 'E6010 — celulósico', score: 65, why: 'Gran penetración, ideal para pasadas de raíz en tubería; en filete deja un cordón tosco y con más hidrógeno.' },
          { id: 'E308L', name: 'E308L-16 — inoxidable', score: 5, why: 'Electrodo de inoxidable para acero al carbono: caro e inadecuado.' },
        ] },
        { id: 'diametro', label: 'Diámetro', options: [
          { id: '3.2', name: '3,2 mm (1/8")', score: 100, why: 'Adecuado para filete de 7 mm en 10 mm de espesor.' },
          { id: '2.5', name: '2,5 mm (3/32")', score: 70, why: 'Funciona, pero necesitarías más pasadas.' },
          { id: '5.0', name: '5,0 mm (3/16")', score: 50, why: 'Demasiado grueso: exceso de calor y difícil de controlar.' },
        ] },
      ],
      MIG: [
        { id: 'aporte', label: 'Alambre', options: [
          { id: 'E71T11', name: 'E71T-11 autoprotegido Ø 0,9 mm', score: 100, why: 'Alambre tubular autoprotegido: perfecto con viento.' },
          { id: 'E71T1', name: 'E71T-1 (requiere gas) Ø 1,2 mm', score: 50, why: 'Necesita gas de protección: el viento lo barrerá.', defect: { type: 'porosidad', label: 'Gas barrido', location: 'interna', sev: 0.5 } },
          { id: 'ER70S6', name: 'ER70S-6 sólido Ø 1,0 mm', score: 60, why: 'Correcto en taller; con viento, depende del gas.' },
        ] },
        { id: 'gas', label: 'Gas', options: [
          { id: 'none', name: 'Sin gas (alambre autoprotegido)', score: 100, why: 'Correcto con alambre autoprotegido.' },
          { id: 'ArCO2', name: 'Argón 82 % / CO₂ 18 %', score: 60, why: 'Correcto en taller, pero aquí hay viento.' },
          { id: 'Ar', name: 'Argón 100 %', score: 10, why: 'Argón puro en acero da arco inestable y mala penetración.' },
        ] },
      ],
      TIG: [
        { id: 'aporte', label: 'Varilla', options: [
          { id: 'ER70S6', name: 'ER70S-6', score: 100, why: 'Correcto para acero al carbono.' },
          { id: 'ER4043', name: 'ER4043 (aluminio)', score: 0, why: 'Aluminio en acero: incompatible.', defect: { type: 'grieta', label: 'Aporte incompatible', location: 'superficial', sev: 1 } },
        ] },
      ],
    },
    prep: [
      { id: 'amolar', label: 'Amolar pintura, óxido y cascarilla hasta metal brillante', detail: '25 mm a cada lado de la unión.', kind: 'required', why: 'Óxido, pintura y cascarilla generan porosidad y falta de fusión.', missing: { type: 'porosidad', label: 'Porosidad por óxido y pintura', location: 'interna', sev: 0.55 }, sfx: 'grinder', minutes: 6, cleans: true },
      { id: 'horno', label: 'Sacar los electrodos del horno de mantenimiento (120 °C)', detail: 'En vez de la caja abierta que estaba en el camión.', kind: 'required', requiredIf: c => c.cons.electrodo === 'E7018', why: 'El E7018 absorbe humedad: el hidrógeno provoca poros y fisuras en frío.', missing: { type: 'grieta', label: 'Fisura por hidrógeno (electrodo húmedo)', location: 'interna', sev: 0.6 }, sfx: 'door', minutes: 2 },
      { id: 'masa', label: 'Colocar la pinza de masa sobre metal limpio, cerca de la unión', detail: '', kind: 'required', why: 'Una mala conexión de masa hace el arco inestable y puede soplar el arco.', missing: { type: 'irregular', label: 'Arco inestable por mala masa', location: 'superficial', sev: 0.5 }, sfx: 'clamp', minutes: 1 },
      { id: 'aplomar', label: 'Aplomar la columna y fijarla con sargentos y cuñas', detail: '', kind: 'required', why: 'Una columna fuera de plomo carga mal la estructura.', missing: { type: 'deformacion', label: 'Columna fuera de plomo', location: 'superficial', sev: 0.5 }, sfx: 'clamp', minutes: 4 },
      { id: 'punteo', label: 'Puntear las cuatro esquinas', detail: '', kind: 'good', why: 'Fija la geometría y reparte la contracción.', sfx: 'tack', minutes: 2 },
      { id: 'mojar', label: 'Enfriar la placa con agua antes de soldar', detail: 'Para que no se caliente tanto.', kind: 'harmful', why: 'El agua es hidrógeno puro sobre la unión y el enfriamiento brusco endurece la ZAT.', defect: { type: 'grieta', label: 'Fisura por hidrógeno y temple', location: 'interna', sev: 0.6 }, sfx: 'vent_hiss', minutes: 1 },
      { id: 'precalentar', label: 'Precalentar a 150 °C', detail: '', kind: 'neutral', why: 'Para 10 mm de acero dulce A36 no hace falta precalentar (salvo en clima muy frío). No hace daño, pero cuesta tiempo.', sfx: 'vent_hiss', minutes: 6 },
    ],
    params: {
      SMAW: { I: { ideal: [110, 135], ok: [95, 150] } },
      MIG: { V: { ideal: [19, 21], ok: [17.5, 22.5] }, wfs: { ideal: [5, 6.5], ok: [4, 7.5] }, gas: { ideal: [14, 18], ok: [10, 22] } },
      TIG: { I: { ideal: [140, 170], ok: [120, 190] }, gas: { ideal: [12, 15], ok: [9, 18] } },
    },
    paramHints: { SMAW: c => c.cons.diametro === '2.5' ? { I: { ideal: [75, 95], ok: [65, 105] } } : c.cons.diametro === '5.0' ? { I: { ideal: [180, 220], ok: [160, 240] } } : null },
    exec: { speed: { SMAW: [2.8, 4.2], MIG: [4, 6.5], TIG: [1.2, 2] }, lateralTol: 1.6, electrodeMm: 120 },
    ndt: { best: ['VT', 'MT'], ok: ['PT', 'UT'], waste: ['RT', 'HIDRO', 'MACRO'], notes: 'Para filetes estructurales en acero: inspección visual al 100 % y partículas magnéticas. La radiografía no es eficaz en filetes.' },
    reward: 180,
    successStory: 'El sábado hubo mercado. Doña Elena colgó tu nombre en el cartel: «Marquesina reparada por el soldador del pueblo».',
    failStory: 'Con la primera ráfaga fuerte la columna crujió y hubo que cerrar el mercado. El inspector municipal señaló tu soldadura.',
  },

  // ===================================================================
  {
    id: 'puente', n: 3, title: 'La pasarela del río', place: 'Ribera del río Claro',
    client: { name: 'Ing. Lucía Andrade', role: 'Ingeniera municipal', avatar: '👷‍♀️' },
    intro: [
      'Vamos a sustituir la vieja pasarela peatonal sobre el río. Necesito el empalme de las alas de la viga principal.',
      'Chapa de 25 mm de S355, unión a tope con penetración completa. Lo haremos en tu taller, en posición plana. Habrá ultrasonido de un inspector externo.',
    ],
    mentor: 'Chapa gruesa: piensa en el bisel, en el precalentamiento por el espesor y en el control de temperatura entre pasadas. Raíz, relleno y presentación.',
    material: 's355', thicknessMm: 25, joint: 'tope', env: 'taller', ambient: 'taller',
    piece: 'bridge', lengthMm: 80, passes: 3, timeScale: 1.6,
    acceptance: 'Puente — AWS D1.5 / EN 1090 EXC3: penetración completa, sin falta de fusión, sin grietas, porosidad ≤ 1 poro/100 mm. UT obligatorio.',
    critical: ['grieta', 'falta_fusion', 'falta_penetracion', 'sin_soldar', 'perforacion', 'inclusion', 'socavado'],
    processes: allProcesses({
      GMAW: { score: 95, why: 'MAG en taller, posición plana: alta productividad y buena calidad con transferencia por spray.' },
      FCAW: { score: 100, why: 'FCAW con gas (E71T-1): gran depósito, escoria que protege y excelente fusión lateral en chapa gruesa.' },
      SAW: { score: 90, why: 'Excelente para chapa gruesa en plano; ideal en series largas. Aquí el tramo es corto, pero es válido.' },
      SMAW: { score: 70, why: 'Válido con E7018, pero muy lento para 25 mm: muchas pasadas y más riesgo de inclusiones de escoria.' },
      GTAW_DC: { score: 25, why: 'Calidad excelente pero una eternidad para 25 mm. Sólo justificable en la raíz.' },
      GTAW_AC: { score: 0, why: 'AC no tiene sentido en acero estructural.', forced: [{ type: 'falta_fusion', label: 'Proceso inadecuado', location: 'interna', sev: 0.7 }] },
      OAW: { score: 0, why: 'Imposible fundir 25 mm con calidad estructural usando llama.', forced: [{ type: 'falta_fusion', label: 'Calor insuficiente', location: 'interna', sev: 1 }] },
      LBW: { score: 20, why: 'El láser exige ajustes casi perfectos que no tenemos en chapa oxicortada de 25 mm.' },
      EBW: { score: 15, why: 'EBW podría hacerlo en una pasada… si tuviéramos una cámara de vacío del tamaño de una viga.' },
    }),
    consumables: {
      MIG: [
        { id: 'aporte', label: 'Alambre', options: [
          { id: 'ER70S6', name: 'ER70S-6 sólido Ø 1,2 mm', score: 95, why: 'Alambre sólido estándar para S355 con MAG.' },
          { id: 'E71T1', name: 'E71T-1 tubular con gas Ø 1,2 mm', score: 100, why: 'Tubular rutílico: excelente en plano, alto depósito.' },
          { id: 'ER308L', name: 'ER308L (inoxidable)', score: 0, why: 'Inoxidable en acero estructural: dilución y riesgo de fisuras.', defect: { type: 'grieta', label: 'Aporte incompatible', location: 'interna', sev: 0.8 } },
        ] },
        { id: 'gas', label: 'Gas', options: [
          { id: 'ArCO2', name: 'Argón 82 % / CO₂ 18 % (M21)', score: 100, why: 'Mezcla estándar para acero: arco estable y spray.' },
          { id: 'CO2', name: 'CO₂ 100 % (C1)', score: 80, why: 'Penetra bien y es barato, pero más salpicaduras.' },
          { id: 'Ar', name: 'Argón 100 %', score: 10, why: 'En acero da arco errático y mala mojabilidad.', defect: { type: 'falta_fusion', label: 'Mala mojabilidad', location: 'interna', sev: 0.5 } },
        ] },
      ],
      SMAW: [
        { id: 'electrodo', label: 'Electrodo', options: [
          { id: 'E7018', name: 'E7018 bajo hidrógeno', score: 100, why: 'Obligatorio en estructuras de puente.' },
          { id: 'E6013', name: 'E6013 rutílico', score: 10, why: 'No permitido en puentes: hidrógeno y penetración insuficientes.', defect: { type: 'falta_fusion', label: 'Penetración insuficiente', location: 'interna', sev: 0.6 } },
        ] },
      ],
      AUTO: [
        { id: 'fundente', label: 'Alambre + fundente', options: [
          { id: 'EM12K', name: 'EM12K + fundente F7A2', score: 100, why: 'Combinación estándar para S355.' },
        ] },
      ],
      TIG: [
        { id: 'aporte', label: 'Varilla', options: [ { id: 'ER70S6', name: 'ER70S-6', score: 100, why: 'Correcto para acero.' } ] },
      ],
    },
    prep: [
      { id: 'bisel', label: 'Biselar en V a 60° con talón de 2 mm', detail: 'Con oxicorte y repaso con amoladora.', kind: 'required', why: 'Sin bisel es imposible fundir 25 mm de espesor: falta de penetración garantizada.', missing: { type: 'falta_penetracion', label: 'Sin bisel: raíz sin fundir', location: 'raiz', sev: 1 }, sfx: 'grinder', minutes: 15 },
      { id: 'separacion', label: 'Ajustar separación de raíz de 2–3 mm y colocar respaldo cerámico', detail: '', kind: 'required', why: 'La separación permite fundir la raíz; el respaldo sostiene el baño.', missing: { type: 'falta_penetracion', label: 'Raíz cerrada sin fundir', location: 'raiz', sev: 0.7 }, sfx: 'clamp', minutes: 4 },
      { id: 'limpiar', label: 'Amolar cascarilla y residuos de oxicorte', detail: '', kind: 'required', why: 'La cascarilla y los óxidos del corte provocan inclusiones y poros.', missing: { type: 'inclusion', label: 'Inclusión de óxidos', location: 'interna', sev: 0.5 }, sfx: 'grinder', minutes: 6, cleans: true },
      { id: 'precalentar', label: 'Precalentar a 100 °C (control con tiza térmica)', detail: '75 mm a cada lado.', kind: 'required', why: 'Con 25 mm y CE = 0,45 la chapa enfría muy rápido: martensita + hidrógeno = fisura en frío.', missing: { type: 'grieta', label: 'Fisura en frío en la ZAT', location: 'interna', sev: 0.75 }, sfx: 'vent_hiss', minutes: 10 },
      { id: 'interpass', label: 'Controlar temperatura entre pasadas (máx. 250 °C)', detail: '', kind: 'required', why: 'Demasiado calor acumulado degrada la tenacidad del S355.', missing: { type: 'irregular', label: 'Tenacidad reducida por sobrecalentamiento', location: 'interna', sev: 0.3 }, minutes: 1 },
      { id: 'escoria', label: 'Limpiar escoria y amolar arranques entre pasadas', detail: '', kind: 'required', why: 'La escoria atrapada entre pasadas es una inclusión que el UT rechazará.', missing: { type: 'inclusion', label: 'Escoria entre pasadas', location: 'interna', sev: 0.6 }, sfx: 'slag_chip', minutes: 3 },
      { id: 'martillar', label: 'Martillar la raíz al rojo para «compactarla»', detail: '', kind: 'harmful', why: 'Martillar en caliente la raíz puede fisurarla.', defect: { type: 'grieta', label: 'Fisura en la raíz', location: 'raiz', sev: 0.5 }, sfx: 'hammer', minutes: 2 },
    ],
    params: {
      MIG: { V: { ideal: [27, 30], ok: [25, 32] }, wfs: { ideal: [9, 11], ok: [8, 12.5] }, gas: { ideal: [16, 20], ok: [13, 24] } },
      SMAW: { I: { ideal: [130, 155], ok: [115, 170] } },
      AUTO: { P: { ideal: [16, 22], ok: [12, 26] }, v: { ideal: [7, 9], ok: [5, 11] } },
      TIG: { I: { ideal: [180, 220], ok: [160, 240] }, gas: { ideal: [12, 15], ok: [9, 18] } },
    },
    exec: { speed: { MIG: [4.5, 7], SMAW: [2.5, 3.8], TIG: [1, 1.8] }, lateralTol: 1.8, electrodeMm: 120 },
    ndt: { best: ['VT', 'UT'], ok: ['RT', 'MT'], waste: ['PT', 'HIDRO', 'MACRO'], notes: 'Una unión a tope de penetración completa en 25 mm se verifica con ultrasonido (detecta faltas de fusión planas) más inspección visual.' },
    reward: 900,
    successStory: 'La pasarela se inauguró con banda municipal. El inspector de ultrasonidos firmó tu informe sin una sola indicación.',
    failStory: 'El inspector externo encontró indicaciones en el ultrasonido. Hubo que cortar el empalme y la inauguración se retrasó un mes.',
  },

  // ===================================================================
  {
    id: 'lecheria', n: 4, title: 'El tanque de la lechería', place: 'Lechería La Esperanza',
    client: { name: 'Don Aurelio', role: 'Maestro quesero', avatar: '🧑‍🌾' },
    intro: [
      'La tubería de la leche que va del tanque de enfriamiento a la pasteurizadora tiene una fuga en una unión.',
      'Es acero inoxidable sanitario. Si queda una rugosidad o una mancha por dentro, ahí crecen bacterias y Sanidad me cierra la quesería.',
    ],
    mentor: 'En tubería sanitaria el interior importa tanto como el exterior. El inoxidable caliente reacciona con el aire: si la raíz no está protegida se «azucara».',
    material: 'ss316l', thicknessMm: 2, joint: 'circunferencial', env: 'taller', ambient: 'industrial',
    piece: 'pipe', lengthMm: 120, passes: 1, timeScale: 2,
    acceptance: 'Sanitario — AWS D18.1 / ASME BPE: penetración completa, raíz lisa, coloración máxima nivel 3 (paja), sin poros, sin grietas, sin falta de fusión.',
    critical: ['grieta', 'falta_fusion', 'falta_penetracion', 'sin_soldar', 'perforacion', 'oxidacion', 'porosidad'],
    processes: allProcesses({
      GTAW_DC: { score: 100, why: 'TIG en DCEN es el proceso sanitario por excelencia: limpio, sin escoria, raíz controlada.' },
      LBW: { score: 70, why: 'El láser da uniones sanitarias excelentes, pero requiere equipo orbital que no tenemos.' },
      GTAW_AC: { score: 30, why: 'AC en inoxidable da un arco menos estable y erosiona el tungsteno; DCEN es lo correcto.', forced: [{ type: 'irregular', label: 'Arco inestable en AC', location: 'superficial', sev: 0.4 }] },
      GMAW: { score: 20, why: 'MIG en tubo de 2 mm: perforación fácil, salpicaduras y raíz irregular. No sanitario.', forced: [{ type: 'salpicaduras', label: 'Salpicaduras en zona sanitaria', location: 'superficial', sev: 0.5 }] },
      SMAW: { score: 5, why: 'La escoria quedaría por dentro de la tubería de leche. Inaceptable.', forced: [{ type: 'inclusion', label: 'Escoria en la raíz sanitaria', location: 'raiz', sev: 0.9 }] },
      FCAW: { score: 0, why: 'Escoria y 2 mm de espesor: inaceptable.', forced: [{ type: 'inclusion', label: 'Escoria', location: 'raiz', sev: 0.9 }] },
      OAW: { score: 0, why: 'La llama carburaría el inoxidable y destruiría su resistencia a la corrosión.', forced: [{ type: 'oxidacion', label: 'Inoxidable carburado/oxidado', location: 'superficial', sev: 1 }] },
      SAW: { score: 0, why: 'No aplicable a un tubo de 2 mm.' },
      EBW: { score: 30, why: 'Calidad perfecta, pero no se puede meter la instalación de la lechería en una cámara de vacío.' },
    }),
    consumables: {
      TIG: [
        { id: 'aporte', label: 'Varilla de aporte', options: [
          { id: 'ER316L', name: 'ER316L', score: 100, why: 'Igual al metal base: conserva el molibdeno que resiste la corrosión de la leche y los limpiadores.' },
          { id: 'ER308L', name: 'ER308L', score: 50, why: 'Le falta molibdeno: la soldadura será el punto débil frente a la corrosión por cloruros.', defect: { type: 'oxidacion', label: 'Menor resistencia a corrosión', location: 'superficial', sev: 0.3 } },
          { id: 'ER70S6', name: 'ER70S-6 (acero al carbono)', score: 0, why: 'Acero al carbono en inoxidable: se oxidará en semanas y contaminará la leche.', defect: { type: 'oxidacion', label: 'Herrumbre en unión sanitaria', location: 'superficial', sev: 1 } },
        ] },
        { id: 'gas', label: 'Gas de protección (antorcha)', options: [
          { id: 'Ar', name: 'Argón 100 %', score: 100, why: 'El estándar para inoxidable sanitario.' },
          { id: 'ArCO2', name: 'Argón 82 % / CO₂ 18 %', score: 0, why: 'Oxida el tungsteno y el baño.', defect: { type: 'oxidacion', label: 'Gas oxidante', location: 'superficial', sev: 0.9 } },
        ] },
      ],
    },
    prep: [
      { id: 'escuadrar', label: 'Cortar y escuadrar los extremos con cortatubos y refrentado', detail: '', kind: 'required', why: 'Extremos irregulares dejan huecos: penetración desigual.', missing: { type: 'falta_penetracion', label: 'Penetración desigual', location: 'raiz', sev: 0.5 }, sfx: 'grinder', minutes: 5 },
      { id: 'acetona', label: 'Limpiar con acetona y cepillo de inox exclusivo', detail: '', kind: 'required', why: 'Grasa y suciedad dan poros; un cepillo usado en acero contamina con hierro.', missing: { type: 'porosidad', label: 'Porosidad por contaminación', location: 'interna', sev: 0.5 }, sfx: 'wire_brush', minutes: 2, cleans: true },
      { id: 'purga', label: 'Purga interior con argón y medidor de O₂ (< 50 ppm)', detail: 'Tapones y cinta en los extremos.', kind: 'required', why: 'Sin gas por dentro, la raíz se oxida («azucarado»): rugosa, negra y sin resistencia a la corrosión.', missing: { type: 'oxidacion', label: 'Raíz azucarada (sin purga)', location: 'raiz', sev: 1 }, sfx: 'vent_hiss', minutes: 6 },
      { id: 'alinear', label: 'Alinear con abrazadera (desalineación < 10 % del espesor)', detail: '', kind: 'required', why: 'Un escalón interior es una trampa de bacterias.', missing: { type: 'irregular', label: 'Escalón interior', location: 'raiz', sev: 0.5 }, sfx: 'clamp', minutes: 3 },
      { id: 'disco', label: 'Amolar con disco que se usó en acero al carbono', detail: '', kind: 'harmful', why: 'Contaminación con hierro: aparecerán puntos de óxido en el inoxidable.', defect: { type: 'oxidacion', label: 'Contaminación ferrosa', location: 'superficial', sev: 0.5 }, sfx: 'grinder', minutes: 2 },
      { id: 'precalentar', label: 'Precalentar a 150 °C', detail: '', kind: 'harmful', why: 'Los austeníticos no se precalientan: más tiempo en 450–850 °C favorece la sensibilización (corrosión intergranular).', defect: { type: 'oxidacion', label: 'Sensibilización / exceso de coloración', location: 'superficial', sev: 0.4 }, sfx: 'vent_hiss', minutes: 6 },
      { id: 'punteo', label: 'Puntear 4 puntos pequeños con purga activa', detail: '', kind: 'good', why: 'Mantiene la alineación sin oxidar la raíz.', sfx: 'tack', minutes: 2 },
    ],
    params: {
      TIG: { I: { ideal: [55, 75], ok: [45, 90] }, gas: { ideal: [8, 12], ok: [6, 15] }, bal: { ideal: [65, 75], ok: [60, 80] } },
      MIG: { V: { ideal: [16, 18], ok: [15, 19] }, wfs: { ideal: [4, 5], ok: [3, 6] }, gas: { ideal: [12, 16], ok: [10, 20] } },
    },
    exec: { speed: { TIG: [1.4, 2.4], MIG: [5, 8] }, lateralTol: 0.7, dabEveryMm: 3 },
    ndt: { best: ['VT', 'HIDRO'], ok: ['PT', 'RT'], waste: ['UT', 'MT', 'MACRO'], notes: 'En tubería sanitaria: visual del exterior y de la raíz (boroscopio), y prueba hidrostática/de fuga. La radiografía es válida para penetración. MT no sirve en austenítico y UT no es fiable en 2 mm.' },
    reward: 1500,
    successStory: 'El inspector de Sanidad pasó el boroscopio: raíz lisa y color paja. Don Aurelio te regaló un queso curado entero.',
    failStory: 'La raíz oxidada empezó a acumular residuos. En el control sanitario apareció contaminación y la quesería tuvo que parar dos semanas.',
  },

  // ===================================================================
  {
    id: 'avion', n: 5, title: 'El motor del avión', place: 'Aeródromo de Valle Alto — AeroValle MRO',
    client: { name: 'Capitana Sofía Reyes', role: 'Directora técnica de AeroValle', avatar: '👩‍✈️' },
    intro: [
      'Hemos visto lo que haces. Tenemos una cámara de haz de electrones y un reto: unir las dos etapas del tambor del compresor de alta presión de un turbofán.',
      'Titanio Ti-6Al-4V, 12 mm de espesor, unión circunferencial de penetración completa en una sola pasada. Norma AWS D17.1 Clase A. Aquí no hay segundas oportunidades: la pieza vale más que el pueblo entero.',
    ],
    mentor: 'Haz de electrones: el haz es una corriente eléctrica y se desvía con cualquier campo magnético. El titanio caliente absorbe oxígeno, nitrógeno e hidrógeno con avidez: limpieza quirúrgica, ajuste perfecto, buen vacío. Y no olvides la rampa de salida.',
    material: 'ti64', thicknessMm: 12, joint: 'circunferencial', env: 'camara', ambient: 'camara_vacio',
    piece: 'drum', lengthMm: 300, passes: 1, timeScale: 1.8, overlap: 0.12,
    acceptance: 'Aeroespacial — AWS D17.1 Clase A: penetración completa, sin grietas, sin falta de fusión, porosidad ≤ 0,3 mm aislada, cordón plateado brillante (sin coloración), sin desalineación del haz. RT 100 % obligatorio.',
    critical: ['grieta', 'falta_fusion', 'falta_penetracion', 'sin_soldar', 'perforacion', 'oxidacion', 'desalineacion_haz', 'spiking', 'crater', 'porosidad'],
    processes: allProcesses({
      EBW: { score: 100, why: 'Haz de electrones: penetración completa de 12 mm en una sola pasada, ZAT mínima, distorsión casi nula y el vacío protege perfectamente al titanio.' },
      LBW: { score: 65, why: 'El láser podría lograrlo con protección de gas integral, pero 12 mm en una pasada es su límite y el riesgo de contaminación es mayor.' },
      GTAW_DC: { score: 30, why: 'TIG con cámara de arrastre funciona en titanio, pero 12 mm requiere múltiples pasadas: distorsión y gran ZAT en un rotor equilibrado.', forced: [{ type: 'deformacion', label: 'Distorsión por múltiples pasadas', location: 'superficial', sev: 0.6 }, { type: 'oxidacion', label: 'Coloración entre pasadas', location: 'superficial', sev: 0.4 }] },
      GTAW_AC: { score: 5, why: 'AC no se usa en titanio.', forced: [{ type: 'oxidacion', label: 'Contaminación', location: 'superficial', sev: 0.8 }] },
      GMAW: { score: 0, why: 'MIG en un rotor de motor aeronáutico: inaceptable por calidad y contaminación.', forced: [{ type: 'oxidacion', label: 'Titanio contaminado (fragilizado)', location: 'superficial', sev: 1 }] },
      SMAW: { score: 0, why: 'Jamás. El titanio con escoria y aire es titanio frágil.', forced: [{ type: 'oxidacion', label: 'Titanio fragilizado', location: 'superficial', sev: 1 }, { type: 'grieta', label: 'Fisuras por fragilización', location: 'interna', sev: 1 }] },
      FCAW: { score: 0, why: 'Inaceptable en titanio.', forced: [{ type: 'oxidacion', label: 'Titanio fragilizado', location: 'superficial', sev: 1 }] },
      OAW: { score: 0, why: 'La llama contaminaría el titanio por completo.', forced: [{ type: 'oxidacion', label: 'Titanio fragilizado', location: 'superficial', sev: 1 }] },
      SAW: { score: 0, why: 'No aplicable a titanio aeronáutico.', forced: [{ type: 'oxidacion', label: 'Titanio fragilizado', location: 'superficial', sev: 1 }] },
    }),
    consumables: {
      EBW: [
        { id: 'aporte', label: 'Material de aporte', options: [
          { id: 'none', name: 'Sin aporte (autógena, junta a tope ajustada)', score: 100, why: 'EBW se hace normalmente sin aporte: el ajuste perfecto de la junta lo hace innecesario.' },
          { id: 'cuna', name: 'Cuña/shim de Ti-6Al-4V ELI en la junta', score: 70, why: 'Útil para compensar pérdida de material o ajustar química, pero aquí el ajuste es perfecto.' },
          { id: 'ER70S6', name: 'Varilla ER70S-6', score: 0, why: 'Acero en titanio: intermetálicos frágiles.', defect: { type: 'grieta', label: 'Intermetálicos Fe-Ti', location: 'interna', sev: 1 } },
        ] },
        { id: 'cupon', label: 'Cupón testigo', options: [
          { id: 'si', name: 'Soldar cupón testigo del mismo lote antes de la pieza', score: 100, why: 'Obligatorio en D17.1: se corta y se analiza la macro antes de arriesgar la pieza.' },
          { id: 'no', name: 'No, directo a la pieza', score: 30, why: 'Sin cupón no puedes verificar penetración ni hacer macro sin destruir el rotor.' },
        ] },
      ],
      LBW: [
        { id: 'gas', label: 'Protección', options: [
          { id: 'Ar', name: 'Argón con difusor y respaldo', score: 80, why: 'Protección necesaria para titanio.' },
          { id: 'none', name: 'Sin gas', score: 0, why: 'Titanio sin protección: fragilizado.', defect: { type: 'oxidacion', label: 'Titanio sin protección', location: 'superficial', sev: 1 } },
        ] },
      ],
      TIG: [
        { id: 'aporte', label: 'Varilla', options: [
          { id: 'ERTi5', name: 'ERTi-5 (Ti-6Al-4V)', score: 100, why: 'Igual al metal base.' },
          { id: 'ER70S6', name: 'ER70S-6', score: 0, why: 'Acero en titanio: incompatible.', defect: { type: 'grieta', label: 'Intermetálicos Fe-Ti', location: 'interna', sev: 1 } },
        ] },
      ],
    },
    prep: [
      { id: 'desmagnetizar', label: 'Desmagnetizar pieza y utillaje (< 0,5 gauss)', detail: 'Medir con gaussímetro.', kind: 'required', why: 'El magnetismo residual desvía el haz de electrones fuera de la junta: falta de fusión invisible desde fuera.', sfx: 'magnet_click', minutes: 5, effect: 'demag' },
      { id: 'decapado', label: 'Decapado químico (HF-HNO₃), aclarado y secado', detail: 'Elimina la capa alfa y óxidos.', kind: 'required', why: 'Óxidos y contaminación superficial causan porosidad en titanio.', missing: { type: 'porosidad', label: 'Porosidad por óxidos superficiales', location: 'interna', sev: 0.6 }, minutes: 15, cleans: true, sfx: 'vent_hiss' },
      { id: 'guantes', label: 'Manipular solo con guantes de nitrilo limpios y limpiar con acetona', detail: '', kind: 'required', why: 'La grasa de los dedos es hidrógeno y carbono: porosidad en la raíz.', missing: { type: 'porosidad', label: 'Porosidad por huellas', location: 'interna', sev: 0.4 }, minutes: 2, cleans: true, sfx: 'page' },
      { id: 'ajuste', label: 'Ajuste a presión: separación < 0,1 mm, desalineación < 0,25 mm', detail: 'Verificar con galgas.', kind: 'required', why: 'EBW sin aporte no tolera holguras: el haz atraviesa el hueco y queda una mordedura o falta de fusión.', missing: { type: 'concavidad', label: 'Socavado por separación excesiva', location: 'superficial', sev: 0.7 }, sfx: 'clamp', minutes: 6 },
      { id: 'puntos', label: 'Puntear con el haz a baja potencia (4 puntos a 90°)', detail: '', kind: 'good', why: 'Evita que la junta se abra por la contracción durante la soldadura.', minutes: 2 },
      { id: 'alinearHaz', label: 'Alinear el haz con la junta (cámara óptica, haz a 1 mA)', detail: '', kind: 'required', why: 'Un haz de 1 mm de ancho debe estar sobre la junta con precisión de décimas.', missing: { type: 'desalineacion_haz', label: 'Haz fuera de la junta', location: 'interna', sev: 0.8 }, minutes: 3, effect: 'align' },
      { id: 'lija', label: 'Lijar la junta con lija de óxido de aluminio', detail: 'Para dejarla brillante.', kind: 'harmful', why: 'Incrusta partículas abrasivas en el titanio: inclusiones.', defect: { type: 'inclusion', label: 'Partículas abrasivas incrustadas', location: 'interna', sev: 0.5 }, sfx: 'wire_brush', minutes: 3 },
    ],
    params: {
      EBW: {
        kV: { ideal: [55, 65], ok: [45, 80] },
        mA: { ideal: [62, 78], ok: [52, 90] },
        foc: { ideal: [-5, -3], ok: [-7, -1] },
        v: { ideal: [8, 11], ok: [6.5, 13] },
        vac: { ideal: ['1×10⁻⁴', '5×10⁻⁵'], ok: ['1×10⁻³'] },
      },
      AUTO: { P: { ideal: [5, 6.5], ok: [4, 7.5] }, v: { ideal: [12, 16], ok: [9, 20] } },
      TIG: { I: { ideal: [150, 180], ok: [130, 200] }, gas: { ideal: [14, 18], ok: [11, 22] } },
    },
    exec: { speed: { TIG: [1, 1.8] }, lateralTol: 0.35, dabEveryMm: 3 },
    ndt: { best: ['VT', 'RT', 'MACRO'], ok: ['UT', 'PT'], waste: ['MT', 'HIDRO'], notes: 'D17.1 Clase A: visual (color plateado), radiografía al 100 % y macroataque del cupón testigo para verificar penetración y forma del cordón.' },
    reward: 12000,
    successStory: 'El motor pasó las pruebas en banco a 14 000 rpm. AeroValle te ofrece ser su soldador certificado de EBW. ¡El pueblo entero sale en el periódico!',
    failStory: 'En la prueba en banco, la vibración reveló la soldadura defectuosa. El rotor fue desechado y AeroValle canceló el contrato.',
  },
];

export const STAGES = [
  { id: 'diag', name: 'Diagnóstico', weight: 10 },
  { id: 'proc', name: 'Proceso', weight: 20 },
  { id: 'cons', name: 'Consumibles', weight: 15 },
  { id: 'prep', name: 'Preparación', weight: 20 },
  { id: 'param', name: 'Parámetros', weight: 10 },
  { id: 'exec', name: 'Ejecución', weight: 15 },
  { id: 'insp', name: 'Inspección', weight: 10 },
];

export const DEFECT_NAMES = {
  porosidad: 'Porosidad', falta_fusion: 'Falta de fusión', falta_penetracion: 'Falta de penetración', perforacion: 'Perforación',
  socavado: 'Socavado (mordedura)', grieta: 'Grieta', inclusion: 'Inclusión', oxidacion: 'Oxidación / coloración', sobreespesor: 'Sobreespesor excesivo',
  concavidad: 'Concavidad / falta de relleno', deformacion: 'Deformación', crater: 'Cráter final', salpicaduras: 'Salpicaduras', sin_soldar: 'Tramo sin soldar',
  desalineacion_haz: 'Desalineación del haz', spiking: 'Spiking (picos de raíz)', inclusion_tungsteno: 'Inclusión de tungsteno', irregular: 'Cordón irregular',
};
