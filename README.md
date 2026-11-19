# Soldador del Pueblo

Juego 3D de soldadura para el navegador. Eres el soldador de un pueblo y vas resolviendo encargos cada vez más exigentes, desde la bici de un niño hasta el rotor de un motor de avión soldado con **haz de electrones (EBW)**.

**Jugar:** https://ing-franco-tech.github.io/soldador-del-pueblo/

## Cómo se juega

Cada encargo evalúa el proceso completo, como en un taller real:

| Etapa | Qué decides | Peso |
|---|---|---|
| Diagnóstico | Identificar el metal con pruebas de imán, chispa, peso, aspecto y documentación | 10 % |
| Proceso | SMAW, MIG/MAG, FCAW, TIG AC/DC, oxiacetilénica, arco sumergido, láser o EBW | 20 % |
| Consumibles | Electrodo, varilla, alambre, gas, tungsteno, cupón testigo | 15 % |
| Preparación | Limpieza, biselado, precalentamiento, purga, desmagnetizado, ajuste… (algunas acciones dañan la pieza) | 20 % |
| Parámetros | Corriente, voltaje, alambre, gas, balance AC; en EBW: kV, mA, foco, velocidad y vacío | 10 % |
| Ejecución | Sueldas tú: velocidad de avance, distancia, centrado sobre la junta, aporte de varilla, rampa de salida del haz | 15 % |
| Inspección | Eliges los ensayos (VT, PT, MT, UT, RT, macro, hidrostática) y decides si aprobar o reparar | 10 % |

Si entregas una pieza con un defecto rechazable, el cliente sufre las consecuencias.

### Encargos

1. **La bici de Mateo**: aluminio 6061-T6 de 1,6 mm (TIG en alterna).
2. **La marquesina del mercado**: columna de acero A36 al aire libre y con viento (electrodo E7018).
3. **La pasarela del río**: chapa S355 de 25 mm, bisel en V, tres pasadas y precalentamiento.
4. **El tanque de la lechería**: tubería sanitaria de inox 316L con purga interior.
5. **El motor del avión**: tambor de compresor de Ti-6Al-4V de 12 mm soldado con **EBW** en cámara de vacío.

### Controles al soldar

- **Clic izquierdo mantenido**: arco encendido. **Ratón →**: avanzar. **Ratón ↕**: centrarse en la junta.
- **W/S o la rueda**: distancia o longitud de arco. **Espacio**: aportar varilla (TIG). **R**: cambiar electrodo.
- **E**: rampa de salida del haz (EBW). **H**: careta. **Esc**: pausa. **M**: silenciar.

## Tecnología

- HTML + JavaScript (módulos ES), sin paso de compilación.
- [three.js](https://threejs.org) para el render PBR, la iluminación global de entorno, las sombras, el bloom y el postprocesado.
- Texturas, sonido y ensayos no destructivos generados de forma procedural (canvas y WebAudio), sin archivos externos.
- Simulación metalúrgica simplificada: aporte térmico, penetración, ventanas de proceso, defectos y detectabilidad según el ensayo.

Para ejecutarlo en local, sirve la carpeta con cualquier servidor estático:

```
python -m http.server 8000
```

Los valores técnicos son orientativos (basados en AWS D1.1, D1.2, D17.1, D18.1, EN 1011 e ISO 3834) y están simplificados para el juego. No sustituyen un procedimiento de soldadura cualificado (WPS).
