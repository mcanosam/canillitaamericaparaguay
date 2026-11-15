/*
 * intents.js
 * ----------
 * Motor conversacional por reglas. NO es un modelo de lenguaje: compara el
 * texto del usuario contra listas de frases y elige la coincidencia más larga.
 *
 * Ventajas: funciona sin conexión, sin API paga y es 100% auditable.
 * Límites: no entiende frases que no fueron previstas. Cuando no encuentra
 * nada, devuelve la intención 'unknown' y el agente lo dice explícitamente.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};

  /**
   * Normaliza texto: minúsculas, sin acentos, sin signos, espacios simples.
   * "¿Por qué cayó Ueno Bank?" -> "por que cayo ueno bank"
   */
  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // quita acentos
      .replace(/[^a-z0-9\s]/g, ' ')      // quita signos
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Opciones del menú principal, accesibles por número. */
  var MENU = {
    '1': 'daily_summary',
    '2': 'listen_summary',
    '3': 'ueno',
    '4': 'bioceanico',
    '5': 'messi',
    '6': 'sports',
    '7': 'preferences'
  };

  /*
   * Tabla de intenciones. El orden no importa: gana la frase más larga que
   * aparezca en el mensaje del usuario.
   */
  var INTENTS = {
    greeting: [
      'hola', 'holis', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes',
      'buenas noches', 'que tal', 'como andas', 'como va', 'empezar', 'start'
    ],
    help: [
      'ayuda', 'menu', 'opciones', 'que podes hacer', 'que sabes hacer',
      'que puedo preguntar', 'volver al menu', 'inicio'
    ],
    daily_summary: [
      'mi resumen de hoy', 'resumen de hoy', 'resumen', 'noticias de hoy',
      'que paso hoy', 'novedades', 'ponete al dia', 'contame las noticias',
      'que hay de nuevo'
    ],
    listen_summary: [
      'escuchar', 'escuchar resumen', 'escuchar las noticias', 'audio',
      'boletin', 'radio', 'leemelo', 'lee las noticias', 'quiero escuchar'
    ],
    open_html: [
      'ver edicion', 'ver edicion completa', 'edicion completa', 'edicion visual',
      'abrir la edicion', 'ver en la web', 'ver la pagina', 'version web'
    ],
    /* 'ueno' a secas queda acá como red de contención: si el mensaje no
       coincide con nada más específico, al menos entregamos el hilo. */
    ueno: [
      'ueno', 'hilo de ueno', 'caso ueno', 'ueno bank', 'que paso con ueno',
      'contame el hilo de ueno'
    ],
    ueno_banco: [
      'que paso con ueno bank', 'intervencion del banco', 'resolucion del banco',
      'cayo ueno', 'por que cayo ueno', 'banco central ueno', 'solvencia',
      'quebro ueno', 'detenidos del banco'
    ],
    /* La caída del Presidente es su propia pregunta: mezclarla con la del
       banco deja las dos a medias. */
    ueno_pena: [
      'por que renuncio pena', 'renuncia de pena', 'santiago pena', 'juicio politico',
      'quien es el presidente', 'pedro alliana', 'asumio alliana', 'destitucion'
    ],
    ueno_ahorristas: [
      'los ahorristas cobraron', 'cobraron los ahorristas', 'fondo de garantia',
      'me devuelven la plata', 'depositos', 'ips', 'jubilaciones', 'previsionales',
      'cuanto cubre el fondo'
    ],
    bioceanico: [
      'bioceanica', 'bioceanico', 'corredor bioceanico', 'como viene la bioceanica',
      'ruta 15', 'py15', 'el chaco', 'obras del chaco'
    ],
    bioceanico_puente: [
      'cuando se habilita el puente', 'el puente', 'puente de la bioceanica',
      'carmelo peralta', 'porto murtinho', 'puerto murtinho', 'los accesos'
    ],
    bioceanico_historia: [
      'que es el corredor bioceanico', 'historia de la bioceanica',
      'por que es importante el corredor', 'quien lo financia', 'salida al pacifico'
    ],
    asuncion: [
      'asuncion', 'que pasa en asuncion', 'la basura', 'recoleccion',
      'la municipalidad', 'intendenta', 'soledad nunez', 'los desagues',
      'inundaciones'
    ],
    soja: [
      'soja', 'la campana de soja', 'como viene la campana', 'cosecha',
      'exportacion de soja', 'capeco', 'el agro', 'los precios de la soja'
    ],
    rio: [
      'el rio', 'como esta el rio', 'la bajante', 'bajante del rio',
      'las barcazas', 'la hidrovia', 'navegabilidad', 'por que encarece la bajante'
    ],
    /* Ojo: "Cerro Porteño" y "Olimpia" son clubes; "Asunción" es la ciudad y
       tiene su propio hilo. Los clubes se nombran por su nombre y el clásico
       por "el clasico", para que la pregunta por la ciudad no caiga acá. */
    sports: [
      'ver deportes', 'deportes', 'futbol', 'el clausura', 'clausura',
      'olimpia', 'cerro porteno', 'libertad', 'guarani', 'el clasico',
      'como salio', 'resultado', 'partido', 'la fecha'
    ],
    vacamuerta: [
      'vaca muerta', 'vacamuerta', 'el petroleo', 'petroleo', 'shale',
      'hidrocarburos', 'la energia argentina'
    ],
    vmos: [
      'vmos', 'que es el vmos', 'el oleoducto', 'oleoducto', 'punta colorada',
      'exportar petroleo', 'la terminal'
    ],

    /* Messi va antes que 'deportes' por especificidad: gana la frase más larga */
    messi: [
      'messi', 'la pulga', 'hilo de messi', 'carrera de messi',
      'historia de messi', 'lionel messi'
    ],
    messi_final: [
      'final del mundial', 'como salio la final', 'mundial 2026',
      'perdimos la final', 'argentina espana', 'la final con espana'
    ],
    messi_retiro: [
      'messi se retira', 'se retira messi', 'deja la seleccion',
      'sigue en la seleccion', 'retiro de messi', 'se retiro messi',
      'anuncio el retiro', 'nuevo capitan', 'cuti romero', 'sigue scaloni',
      'continuidad de scaloni'
    ],
    /* La despedida tiene intención propia: primero porque era agenda y no
       podía contestarse en pasado, y ahora porque ya ocurrió y no puede
       contestarse en futuro. Entran las dos formas de preguntar. */
    messi_despedida: [
      'despedida de messi', 'partido despedida', 'como fue la despedida',
      'cuando fue la despedida', 'cuando es la despedida', 'que paso en la despedida',
      'ultimo partido de messi', 'messi contra benin', 'argentina benin',
      'partido en el monumental', 'la despedida', 'cuanto salio el ultimo partido'
    ],
    messi_premios: [
      'balones de oro', 'balon de oro', 'cuantos balones', 'premios de messi'
    ],
    sports_next: [
      'cuando juega', 'cuando juega olimpia', 'cuando juega cerro',
      'proximo partido', 'proxima fecha', 'cuando es el proximo partido',
      'a que hora juega', 'contra quien juega'
    ],
    preferences: [
      'configurar', 'configurar mis preferencias', 'preferencias', 'mis datos',
      'cambiar mi nombre', 'mis intereses', 'ajustes', 'mi perfil'
    ],
    thanks: [
      'gracias', 'muchas gracias', 'joya', 'genial', 'barbaro', 'perfecto'
    ]
  };

  /**
   * Detecta la intención de un mensaje.
   * @returns {{intent: string, matched: string, normalized: string}}
   */
  function detect(rawText) {
    var text = normalize(rawText);

    // Opción del menú escrita como número suelto ("2").
    if (MENU[text]) {
      return { intent: MENU[text], matched: text, normalized: text };
    }

    var best = { intent: 'unknown', matched: '', normalized: text };

    Object.keys(INTENTS).forEach(function (intentId) {
      INTENTS[intentId].forEach(function (phrase) {
        if (text.indexOf(phrase) !== -1 && phrase.length > best.matched.length) {
          best = { intent: intentId, matched: phrase, normalized: text };
        }
      });
    });

    return best;
  }


  Canillita.intents = {
    normalize: normalize,
    detect: detect,
    table: INTENTS,
    menu: MENU
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.intents;
  }
})(typeof window !== 'undefined' ? window : globalThis);
