# Soldador del Pueblo

Juego 3D de soldadura para el navegador, con siete casos de aplicación con contexto técnico real. Empiezas con la bici de un niño y terminas con el rotor de un motor de avión soldado con **haz de electrones (EBW)**.

**Hecho por J. Gabriel Franco e Ing. J. Fernando Sarmiento.**

**Jugar:** https://ing-franco-tech.github.io/soldador-del-pueblo/

## Cómo se juega

En cada caso se evalúa todo el proceso, como en un taller real:

| Etapa | Qué haces | Peso |
|---|---|---|
| Diagnóstico | Identificas el metal con el imán, la prueba de chispa, el peso, el aspecto y la documentación. Cada prueba se ve en 3D sobre la pieza | 8 % |
| Análisis técnico | Respondes preguntas tipo parcial: carbono equivalente, aporte térmico, designación AWS, LIE, prueba hidrostática… | 12 % |
| Proceso | Eliges entre SMAW, MIG/MAG, FCAW, TIG AC/DC, oxiacetilénica, arco sumergido, láser o EBW | 15 % |
| Consumibles | Electrodo, varilla, alambre, gas, tungsteno, cupón testigo | 10 % |
| Junta y posición | Eliges bisel, ángulo, talón y separación, y la posición (1G rodado, 2G, 3G, 4G, 5G ascendente/descendente, 6G, 2F…). La pieza 3D cambia según lo que elijas | 10 % |
| Preparación | Pulir, cepillar, desengrasar, hornear electrodos, precalentar con soplete, purgar, desmagnetizar, inertizar, medir LEL… Cada acción se ve en 3D y el orden importa | 15 % |
| Máquina | Ajustas corriente, polaridad, voltaje, gas o kV/mA/foco/vacío, y ves cómo giran las perillas y cambia el display de la máquina | 8 % |
| Ejecución e incidentes | Sueldas controlando la velocidad y la distancia, y resuelves problemas: soplo magnético, electrodo húmedo, tungsteno contaminado, tubo magnetizado, purga incompleta, alarma del explosímetro… | 12 % |
| Inspección | Eliges los ensayos (VT, PT, MT, UT, RT, macro, hidrostática) y decides si aprobar o reparar | 10 % |

## Casos

1. **La bici de Mateo**: aluminio 6061-T6 de 1,6 mm. TIG en alterna.
2. **La marquesina del mercado**: columna A36 en obra con viento. E7018 húmedos y soplo magnético.
3. **La pasarela del río**: S355 de 25 mm. Carbono equivalente, precalentamiento, bisel y tres pasadas.
4. **La línea de gas de la vereda**: API 5L X52, API 1104, 5G descendente con E6010/E8010 y tubo magnetizado.
5. **El tanque de la lechería**: inox 316L sanitario con purga interior.
6. **El tanque de gas propano**: recipiente ASME que contuvo GLP. Desgasificar, inertizar, medir LEL, permiso de trabajo en caliente, reparar la grieta y hacer la prueba hidrostática.
7. **El motor del avión**: Ti-6Al-4V de 12 mm con **EBW** en cámara de vacío.

## 🔥 Corta el tubo: inglés de soldadura

Minijuego para aprender 100 términos técnicos en inglés (procesos, equipos, juntas, partes del cordón, defectos, variables, inspección y posiciones):

- Los términos bajan dentro de tubos de acero. Mueve el soplete con el ratón y **haz clic sobre el tubo correcto** (o usa las teclas **1-4**) antes de que llegue abajo.
- Si cortas el tubo que no es, se quema, pierdes una vida y te muestra qué significaba ese término.
- Hay combos, niveles que aceleran la caída, récord y una lista de repaso al final, con pronunciación en inglés.
- Dos modos: **Español → Inglés** e **Inglés → Español 🔊** (oyes la palabra y buscas la traducción). También puedes filtrar por tema.
- **Glosario**: tarjetas que se voltean, con búsqueda, filtro por tema y botón para oír la pronunciación.

## Controles al soldar

- La antorcha sigue la junta sola.
- **A / D** (o la rueda): velocidad de avance.
- **W / S**: distancia o longitud de arco (el electrodo se gasta: hay que irlo bajando).
- **Espacio**: aportar varilla (TIG).
- **F**: rellenar el cráter al final.
- **R**: electrodo nuevo.
- **EBW**: ratón ↕ o A/D para seguir la junta, y **E** para la rampa de salida.
- **H**: careta. **P / Esc**: pausa.

Los personajes hablan con voz sintetizada; se puede apagar con el botón 🗣️.

## Tecnología

- HTML y JavaScript (módulos ES), sin paso de compilación, con [three.js](https://threejs.org) para el render PBR, las sombras y el postprocesado.
- Texturas, sonido (síntesis WebAudio) y ensayos no destructivos generados de forma procedural.
- Simulación metalúrgica simplificada: aporte térmico, penetración, ventanas de proceso, defectos y su detectabilidad según el ensayo.

Para ejecutarlo en local:

```
python -m http.server 8000
```

Los valores técnicos son orientativos (AWS D1.1, D1.2, D1.5, D17.1, D18.1, API 1104, ASME VIII, NBIC/PCC-2, EN 1011) y están simplificados para el juego. No reemplazan un procedimiento calificado (WPS/PQR).
