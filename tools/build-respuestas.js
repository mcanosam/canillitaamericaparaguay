#!/usr/bin/env node
/*
 * build-respuestas.js
 * -------------------
 * El motor conversacional es de reglas, así que el conjunto de respuestas
 * posibles es FINITO. Este script las enumera todas y arma el plan para que
 * Piper las diga, una por una.
 *
 * Resultado: cada respuesta del chat se puede escuchar, no solo leer.
 *
 * Usa los mismos módulos que el navegador (responses.js, intents.js,
 * content.js). Si mañana se agrega una intención nueva, aparece acá sola.
 *
 * Uso:
 *   node tools/build-respuestas.js [--out build/respuestas.json]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');

function arg(nombre, porDefecto) {
  const i = process.argv.indexOf('--' + nombre);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto;
}

const SALIDA = arg('out', 'build/respuestas.json');

/* ------------------------------------------------ entorno para los módulos */

globalThis.Canillita = {};

require(path.join(RAIZ, 'js', 'version.js'));
require(path.join(RAIZ, 'js', 'router.js'));
require(path.join(RAIZ, 'js', 'content.js'));
require(path.join(RAIZ, 'js', 'preferences.js'));
require(path.join(RAIZ, 'js', 'render.js'));
require(path.join(RAIZ, 'js', 'radio.js'));
require(path.join(RAIZ, 'js', 'intents.js'));
require(path.join(RAIZ, 'js', 'responses.js'));

const Canillita = globalThis.Canillita;

Canillita.content.hydrate([
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'ueno.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'bioceanico-actualidad.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'bioceanico-historia.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'vacamuerta.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'asuncion.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'soja.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'rio.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'messi.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'deportes.json'), 'utf8'))
]);

/* ------------------------------------------------------ qué se va a decir */

/*
 * Cada entrada es una pregunta tal como la escribiría un lector. Se pasa por
 * el mismo detector de intenciones que usa el chat, así que si la frase no
 * matchea, el error salta acá y no en producción.
 *
 * Quedan afuera a propósito: el menú, el saludo, las preferencias y el
 * boletín (que ya tiene su propio audio). Solo se graba lo informativo.
 */
const PREGUNTAS = [
  { id: 'ueno',                pregunta: 'Contame el hilo de Ueno' },
  { id: 'ueno-banco',          pregunta: '¿Por qué cayó Ueno?' },
  { id: 'ueno-pena',           pregunta: '¿Por qué renunció Peña?' },
  { id: 'ueno-ahorristas',     pregunta: '¿Cobraron los ahorristas?' },
  { id: 'bioceanico-actualidad', pregunta: '¿Cómo viene la Bioceánica?' },
  { id: 'bioceanico-historia', pregunta: '¿Qué es el Corredor Bioceánico?' },
  { id: 'bioceanico-puente',   pregunta: '¿Cuándo se habilita el puente?' },
  { id: 'asuncion',            pregunta: '¿Qué pasa en Asunción?' },
  { id: 'soja',                pregunta: '¿Cómo viene la campaña de soja?' },
  { id: 'rio',                 pregunta: '¿Cómo está el río?' },
  { id: 'deportes',            pregunta: 'Ver deportes' },
  { id: 'deportes-proximo',    pregunta: '¿Cuándo juega Olimpia?' },
  { id: 'vacamuerta',          pregunta: 'Contame lo de Vaca Muerta' },
  { id: 'vmos',                pregunta: '¿Qué es el VMOS?' },
  { id: 'messi',               pregunta: 'Contame el hilo de Messi' },
  { id: 'messi-final',         pregunta: '¿Cómo salió la final del Mundial 2026?' },
  { id: 'messi-retiro',        pregunta: '¿Messi se retira de la Selección?' },
  { id: 'messi-despedida',     pregunta: '¿Cómo fue la despedida de Messi?' },
  { id: 'fuera-de-alcance',    pregunta: '¿Qué pasa con el dólar?' }
];

/* ---------------------------------------------------------- limpieza ---- */

/**
 * El texto del chat tiene emojis, asteriscos de negrita y guiones bajos de
 * cursiva. Nada de eso se dice en voz alta.
 */
const ORDINALES = ['', 'Primero.', 'Segundo.', 'Tercero.', 'Cuarto.', 'Quinto.'];

function limpiar(texto) {
  const sinAdornos = String(texto)
    // Los números en círculo (1️⃣) son enumeraciones: se dicen como tales
    .replace(/([1-5])\u{FE0F}?\u{20E3}/gu, (m, n) => ORDINALES[Number(n)])
    /* El rango 2300-23FF entra porque ahí viven ⏳ y ⌛, que se usan para
       marcar lo que está sin definir y no se leen en voz alta. */
    .replace(/[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{FE0F}\u{20E3}]/gu, '')
    .replace(/[*_]/g, '')
    .replace(/^\s*[•·]\s*/gm, '');

  /*
   * En pantalla, el salto de línea hace de separador visual. En voz alta no
   * existe: sin un punto, la frase se encadena con la siguiente y se pierde
   * la estructura. Cada línea termina en punto si no traía puntuación.
   */
  return sinAdornos
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => (/[.!?:;,]$/.test(linea) ? linea : linea + '.'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\.\.+/g, '.')
    .trim();
}

/* ------------------------------------------------------------- el plan -- */

const radio = Canillita.radio;
const respuestas = [];
const problemas = [];

PREGUNTAS.forEach((entrada) => {
  const deteccion = Canillita.intents.detect(entrada.pregunta);
  if (deteccion.intent === 'unknown' && entrada.id !== 'fuera-de-alcance') {
    problemas.push(`"${entrada.pregunta}" no matchea ninguna intención`);
    return;
  }

  const respuesta = Canillita.responses.respondTo(entrada.pregunta);

  // El texto hablado junta todos los mensajes de la respuesta
  const crudo = respuesta.messages.map((m) => m.text).join(' ');
  const texto = limpiar(crudo);

  respuestas.push({
    id: entrada.id,
    question: entrada.pregunta,
    intent: deteccion.intent,
    text: texto,
    // toSpeech resuelve números, decretos y abreviaturas
    speech: radio.toSpeech(texto),
    words: texto.split(/\s+/).length
  });
});

if (problemas.length) {
  console.error('Preguntas sin intención:');
  problemas.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}

const plan = {
  version: Canillita.version,
  generatedAt: new Date().toISOString(),
  count: respuestas.length,
  answers: respuestas
};

const destino = path.join(RAIZ, SALIDA);
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify(plan, null, 2), 'utf8');

const palabras = respuestas.reduce((suma, r) => suma + r.words, 0);
console.log('Plan de respuestas escrito en ' + SALIDA);
console.log('  ' + respuestas.length + ' respuestas, ' + palabras + ' palabras');
console.log('  unos ' + Math.round(palabras / 2.5) + ' segundos de audio en total');
