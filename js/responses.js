/*
 * responses.js
 * ------------
 * Traduce una intención detectada en una respuesta concreta, usando SOLO el
 * contenido de los archivos JSON. Si el dato no está en el JSON, no se responde.
 *
 * Formato de respuesta:
 *   {
 *     messages: [ { text, sources, dataDate, kind } ],
 *     quickReplies: [ 'texto del botón', ... ]
 *   }
 * Cada botón envía su propio texto al chat, así que siempre pasa por el mismo
 * motor de intenciones que la escritura manual.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};
  var content = Canillita.content;
  var prefs = Canillita.preferences;

  /* ------------------------------------------------------------- utilidades */

  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /** '2026-08-02' -> '2 de agosto de 2026' */
  function longDate(isoDate) {
    if (!isoDate) return '';
    var parts = String(isoDate).slice(0, 10).split('-');
    if (parts.length !== 3) return isoDate;
    return Number(parts[2]) + ' de ' + MONTHS[Number(parts[1]) - 1] + ' de ' + parts[0];
  }

  function todayLabel() {
    var now = new Date();
    var days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return days[now.getDay()] + ' ' + now.getDate() + ' de ' + MONTHS[now.getMonth()];
  }

  function clockLabel() {
    var now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }

  /** Saludo acorde a la hora. La definición vive en render.js, una sola vez. */
  function timeGreeting() {
    return Canillita.render.timeGreeting();
  }

  function message(text, options) {
    return Object.assign({ text: text, kind: 'text' }, options || {});
  }

  /*
   * audioId enlaza la respuesta con su clip pregrabado por Piper, si existe.
   * Los ids son los mismos que enumera tools/build-respuestas.js.
   */
  function reply(messages, quickReplies, audioId) {
    return {
      messages: Array.isArray(messages) ? messages : [messages],
      quickReplies: quickReplies || [],
      audioId: audioId || null
    };
  }

  /* Botones que aparecen casi siempre al final de una respuesta. */
  var BASE_REPLIES = ['Mi resumen de hoy', 'Ver deportes', 'Menú'];

  /* ------------------------------------------------------------- respuestas */

  /*
   * Qué escribir para llegar a cada historia. Se usa para armar los accesos
   * directos del menú a partir de las historias que el lector eligió seguir.
   */
  var ACCESO_DIRECTO = {
    ueno: { label: 'Ueno', pregunta: 'Contame el hilo de Ueno' },
    bioceanico: { label: 'Bioceánica', pregunta: '¿Cómo viene la Bioceánica?' },
    vacamuerta: { label: 'Vaca Muerta', pregunta: 'Contame lo de Vaca Muerta' },
    messi: { label: 'El hilo de Messi', pregunta: 'Contame el hilo de Messi' },
    asuncion: { label: 'Asunción', pregunta: '¿Qué pasa en Asunción?' },
    agro: { label: 'Soja', pregunta: '¿Cómo viene la campaña de soja?' },
    rio: { label: 'El río', pregunta: '¿Cómo está el río?' },
    deportes_py: { label: 'Clausura', pregunta: 'Ver deportes' }
  };

  /** Accesos directos a las historias que el lector sigue. */
  function seguidas() {
    return prefs.get().following
      .map(function (id) { return ACCESO_DIRECTO[id]; })
      .filter(Boolean);
  }

  function menuText() {
    var lineas = [
      '¿Qué querés recibir?',
      '',
      '1️⃣ Mi resumen de hoy',
      '2️⃣ Escuchar las noticias',
      '3️⃣ El hilo de Ueno',
      '4️⃣ La Bioceánica',
      '5️⃣ El hilo de Messi',
      '6️⃣ Deportes',
      '7️⃣ Configurar mis preferencias'
    ];

    /* Lo que el lector eligió seguir va primero que el resto de las opciones */
    var mias = seguidas();
    if (mias.length) {
      lineas.push('');
      lineas.push('⭐ *Seguís estas historias:*');
      mias.forEach(function (item) {
        lineas.push('· ' + item.label);
      });
    }

    lineas.push('');
    lineas.push('Podés tocar un botón, escribir el número o preguntarme directamente.');
    return lineas.join('\n');
  }

  /* Los botones repiten el menú, con las historias seguidas adelante */
  function menuReplies() {
    var base = [
      'Mi resumen de hoy',
      'Escuchar las noticias',
      'Contame el hilo de Ueno',
      '¿Cómo viene la Bioceánica?',
      'Contame el hilo de Messi',
      'Ver deportes',
      'Configurar mis preferencias'
    ];
    var mias = seguidas().map(function (item) { return item.pregunta; });
    return mias.concat(base.filter(function (opcion) {
      return mias.indexOf(opcion) === -1;
    }));
  }

  function greeting() {
    var name = prefs.isConfigured() ? ', ' + prefs.get().name : '';
    return reply([
      message('¡' + timeGreeting() + name + '! Soy Tu Canillita.\n\nPuedo contarte las noticias locales de manera breve, leértelas como un programa de radio o prepararte una edición visual.'),
      message(menuText())
    ], menuReplies());
  }

  function help() {
    return reply(message(menuText()), menuReplies());
  }

  function dailySummary() {
    var stories = content.forDailySummary(prefs.get().topics);
    if (!stories.length) {
      return reply(message('Todavía no tenés temas elegidos. Escribí “configurar” y lo resolvemos en un minuto.'), menuReplies());
    }

    var header = '📰 *TU RESUMEN DE HOY*\n' + todayLabel() + ' · ' + clockLabel() +
      (prefs.get().locality ? ' · ' + prefs.get().locality : '');

    var body = stories.map(function (story) {
      return story.whatsappSummary;
    }).join('\n\n───\n\n');

    return reply([
      message(header + '\n\n' + body),
      message('Podés elegir:\n\n🎧 Escuchar resumen\n🌐 Ver edición completa\n💬 Preguntar sobre una noticia', {
        links: [{ label: 'Abrir mi edición', href: Canillita.router.editionUrl() }]
      })
    ], ['Escuchar resumen', 'Ver edición completa', '¿Qué pasó con Ueno?']);
  }

  function listenSummary() {
    var settings = prefs.get();   // 'prefs' es el módulo; 'settings', los datos
    var stories = content.forDailySummary(settings.topics);
    var script = Canillita.radio.buildScript(stories, {
      name: settings.name,
      targetSeconds: settings.audioSeconds
    });

    /*
     * Si existe el boletín grabado del día, es ESE el que se reproduce.
     * Entonces el guion que se muestra tiene que ser el suyo, no el que
     * armamos recién con la duración elegida: si no, la voz sigue hablando
     * después de que se terminó el texto en pantalla.
     */
    var grabado = Canillita.radio.recorded();
    var intro;

    if (grabado && grabado.segments && grabado.segments.length) {
      script = {
        segments: grabado.segments,
        seconds: Math.round(grabado.duration),
        trimmed: false
      };
      intro = '🎧 Boletín del día, con voz ' + grabado.voice + ': ' +
        script.seconds + ' segundos.';
    } else {
      intro = '🎧 Boletín listo: ' + script.seconds + ' segundos de lectura.';
      if (script.trimmed) {
        intro += '\nLo ajusté a los ' + prefs.audioLabel() +
          ' que elegiste, así que va la versión corta.';
      }
    }

    return reply([
      message(intro),
      message(Canillita.radio.scriptText(script), {
        kind: 'audio',
        script: script,
        links: [{ label: 'Escucharlo en mi edición', href: Canillita.router.editionUrl() }]
      })
    ], ['Ver edición completa', 'Mi resumen de hoy', 'Menú']);
  }

  function openHtml() {
    var prefs = Canillita.preferences.get();
    var saludo = prefs.name
      ? 'Tu edición está lista, ' + prefs.name + '.'
      : 'Tu edición está lista.';
    return reply(message(
      '🌐 ' + saludo + '\n\n' +
      'Ahí vas a encontrar tu edición con el resumen y el texto completo de cada nota, el guion del boletín y los hilos que seguís, con su cronología.',
      {
        links: [
          { label: 'Abrir mi edición', href: Canillita.router.editionUrl() },
          { label: 'Ver el hilo de Ueno', href: Canillita.render.hiloUrl('ueno') }
        ]
      }
    ), ['Mi resumen de hoy', 'Configurar mis preferencias', 'Menú']);
  }

  /* ------------------------------------------------------------------ Ueno */

  /*
   * El hilo que ordena el año. Se responde en tres piezas porque son tres
   * preguntas distintas: qué pasó con el banco, qué pasó con el Presidente y
   * qué pasa con la plata de la gente. Mezclarlas deja las tres a medias.
   */
  function ueno() {
    var story = content.get('ueno_hilo');
    return reply([
      message('🏦 *' + story.title + '*\n_' + story.subtitle + '_\n\n' + story.shortSummary),
      message('*Lo último del hilo*\n' + ultimosHitos(story, 4), {
        dataDate: story.eventDate,
        links: [{ label: 'Ver el hilo completo', href: Canillita.render.hiloUrl('ueno') }]
      })
    ], ['¿Por qué renunció Peña?', '¿Los ahorristas cobraron?', 'Menú'], 'ueno');
  }

  function uenoBanco() {
    return reply([
      message(
        '✔️ El *3 de noviembre* el Banco Central resolvió Ueno Bank: su índice de solvencia había ' +
        'caído por debajo del *50% del mínimo exigido*.\n\n' +
        '✔️ Ese día las aplicaciones y las tarjetas dejaron de funcionar para *casi tres millones ' +
        'de clientes*.\n\n' +
        '✔️ Renunció el presidente del Banco Central, Carlos Carvallo, y la Fiscalía ordenó la ' +
        'detención de *ocho directivos* del banco.',
        { dataDate: '2026-11-05' }
      ),
      message(
        '*Cómo se llegó.* Entre septiembre de 2025 y febrero de 2026 el banco otorgó préstamos y ' +
        'sobregiros por más de 120 millones de dólares a tres empresas luego vinculadas al mismo ' +
        'grupo económico. Desde junio el regulador dejó observaciones por escrito en al menos seis ' +
        'instancias.\n\n' +
        '❓ La investigación judicial sigue abierta: los ocho directivos están detenidos e ' +
        'imputados, no condenados.',
        { dataDate: '2026-11-06',
          links: [{ label: 'Ver el hilo completo', href: Canillita.render.hiloUrl('ueno') }] }
      )
    ], ['¿Por qué renunció Peña?', '¿Los ahorristas cobraron?', 'Menú'], 'ueno-banco');
  }

  function uenoPena() {
    return reply([
      message(
        'Por el caso Ueno, y en nueve días.\n\n' +
        '✔️ *4 de noviembre:* 35 diputados presentan el pedido de juicio político contra Peña y el ' +
        'vicepresidente Alliana. El cargo contra Peña: *conflicto de intereses* por su vinculación ' +
        'accionaria con Ueno Holding, de la que fue accionista hasta 2025.\n\n' +
        '✔️ *5 de noviembre:* Horacio Cartes, presidente de la ANR, anuncia que apoya el juicio. ' +
        'Por la tarde Peña graba un video y renuncia: _"Ninguna persona está por encima del ' +
        'Paraguay"_.\n\n' +
        '✔️ El Congreso *no acepta la renuncia* para poder avanzar igual con el juicio político. ' +
        'Peña es destituido y detenido. Asume *Pedro Alliana*.',
        { dataDate: '2026-11-05',
          links: [{ label: 'Ver el hilo completo', href: Canillita.render.hiloUrl('ueno') }] }
      )
    ], ['¿Qué pasó con Ueno Bank?', '¿Los ahorristas cobraron?', 'Menú'], 'ueno-pena');
  }

  function uenoAhorristas() {
    return reply([
      message(
        '✔️ Al *14 de noviembre*, el presidente Alliana informó que cobró *poco más del 95%* de ' +
        'los ahorristas: unas *1.740.000 personas*, a través del Fondo de Garantía de Depósitos, ' +
        'acelerado por una ley especial acordada con el Congreso.\n\n' +
        '✔️ El Fondo cubre hasta *75 salarios mínimos* por persona y entidad: 228,3 millones de ' +
        'guaraníes.\n\n' +
        '✔️ El Gobierno estima que se pueden rescatar unos *600 millones de dólares* en activos ' +
        'del banco.',
        { dataDate: '2026-11-14' }
      ),
      message(
        '❓ *Lo que sigue abierto:* el 5% que todavía no cobró, y la reposición de los fondos ' +
        'previsionales. El Instituto de Previsión Social tenía invertidos unos 355 millones de ' +
        'dólares en el banco. Alliana dijo que esa reposición "tiene prioridad".',
        { dataDate: '2026-11-14',
          links: [{ label: 'Ver el hilo completo', href: Canillita.render.hiloUrl('ueno') }] }
      )
    ], ['¿Qué pasó con Ueno Bank?', '¿Por qué renunció Peña?', 'Menú'], 'ueno-ahorristas');
  }

  /* ----------------------------------------------------------- Bioceánica */

  function bioceanico() {
    return storyReply('bioceanico_actualidad', 'bioceanico',
      ['¿Cuándo se habilita el puente?', '¿Qué es el Corredor Bioceánico?', 'Menú']);
  }

  function bioceanicoPuente() {
    return reply([
      message(
        'El puente está prácticamente; los accesos, no.\n\n' +
        '✔️ En *junio* se ejecutaron los últimos trabajos para la unión de márgenes entre Carmelo ' +
        'Peralta y Porto Murtinho: unos *1.300 metros*, financiados por Itaipú Binacional.\n\n' +
        '✔️ Pero a fines de *septiembre* las obras de acceso del lado paraguayo marcaban un *23% ' +
        'de avance*.\n\n' +
        '✔️ Y el lote 3 de la PY15, en el Chaco, va por el *47,5%*, reprogramado por lluvias.\n\n' +
        '❓ La habilitación estaba prevista para 2026.',
        { dataDate: '2026-09-29',
          links: [{ label: 'Ver el hilo completo', href: Canillita.render.hiloUrl('bioceanico') }] }
      )
    ], ['¿Qué es el Corredor Bioceánico?', '¿Cómo viene la Bioceánica?', 'Menú'], 'bioceanico-puente');
  }

  function bioceanicoHistoria() {
    return storyReply('bioceanico_historia', 'bioceanico-historia',
      ['¿Cómo viene la Bioceánica?', '¿Cuándo se habilita el puente?', 'Menú']);
  }

  /* ------------------------------------------------------------- Deportes */

  function sports() {
    return storyReply('deportes_clausura', 'deportes',
      ['Contame el hilo de Messi', '¿Quién lidera el Clausura?', 'Menú']);
  }

  function sportsNext() {
    var story = content.get('deportes_clausura');
    return reply([
      message(
        'Olimpia ganó el clásico de la fecha 17 por *2 a 0* y se reafirmó como líder del Torneo ' +
        'Clausura.\n\n' +
        '❓ Lo que queda por ver es si sostiene la punta en las fechas que restan.',
        { dataDate: story.eventDate }
      )
    ], ['Ver deportes', 'Contame el hilo de Messi', 'Menú'], 'deportes-proximo');
  }

  /*
   * Plantilla para historias que no necesitan tratamiento especial: resumen,
   * los hechos confirmados con su fecha, y lo que falta definir. Sumar un hilo
   * nuevo pasa a ser una línea en la tabla de abajo, no una función más.
   */
  function storyReply(storyId, audioId, botones) {
    var story = content.get(storyId);
    if (!story) return unknown();

    var hechos = (story.confirmedFacts || []).slice(0, 4).map(function (item) {
      return '✔️ ' + item.fact;
    }).join('\n');
    var pendientes = (story.pendingQuestions || []).slice(0, 3).map(function (item) {
      return '❓ ' + item;
    }).join('\n');

    var mensajes = [
      message('*' + story.title + '*\n_' + story.subtitle + '_\n\n' + story.shortSummary)
    ];
    if (hechos || pendientes) {
      mensajes.push(message(
        (hechos ? '*Qué sabemos*\n' + hechos : '') +
        (hechos && pendientes ? '\n\n' : '') +
        (pendientes ? '*Qué falta definir*\n' + pendientes : ''),
        {
          dataDate: story.eventDate,
          links: [{
            label: 'Ver la historia completa',
            href: Canillita.render.hiloUrl(Canillita.content.hiloDe(storyId))
          }]
        }
      ));
    }
    return reply(mensajes, botones, audioId);
  }

  function vacamuerta() {
    return storyReply('vacamuerta_hilo', 'vacamuerta',
      ['¿Qué es el VMOS?', '¿Cómo viene la Bioceánica?', 'Menú']);
  }

  function vmos() {
    var story = content.get('vacamuerta_hilo');
    return reply([
      message(
        '🛢️ *VMOS · Vaca Muerta Oil Sur*\n\n' +
        'Un oleoducto de 437 kilómetros que va de la cuenca neuquina a la Terminal de Punta Colorada, ' +
        'sobre el Atlántico argentino. Inversión estimada: 3.000 millones de dólares.\n\n' +
        'Lo hacen siete petroleras juntas: YPF, Vista, PAE, Pampa, Chevron, Pluspetrol y Shell.\n\n' +
        '✔️ *La obra del caño terminó en agosto:* las contratistas obtuvieron el "apto para ' +
        'funcionar" tras quince meses y un pico de 2.500 trabajadores.\n' +
        '✔️ *5 de octubre:* llegaron a San Antonio Este las dos *monoboyas*, la última pieza ' +
        'del sistema. Se anclan a siete kilómetros de la costa, con seis anclas cada una.\n' +
        '✔️ En Punta Colorada ya está terminado el *tanque 404*, el primero: 120.000 metros ' +
        'cúbicos, 82 metros de diámetro.\n' +
        '✔️ El 23 de septiembre colocó un bono por *233,65 millones de dólares* al 6,25% a ' +
        'cuatro años. Salía a buscar 100.\n' +
        '✔️ Arranca con 180.000 barriles por día y escala a 550.000 hacia el tercer trimestre ' +
        'de 2027, un año antes de lo proyectado.\n\n' +
        '⏳ Lo que falta: la terminal. La conexión de la estación de Allen está prevista para el ' +
        '15 de diciembre y las primeras exportaciones, para el primer cuatrimestre de 2027.\n\n' +
        '🇵🇾 *Por qué se mira desde acá:* Paraguay importa todo el combustible que consume ' +
        '—entre 3.000 y 3.300 millones de litros por año— y su principal proveedor es la ' +
        'Argentina. El crudo de Punta Colorada no es combustible de surtidor, así que más oferta ' +
        'no baja el precio por sí sola; lo que cambia es la posición del país que nos abastece.',
        {
          dataDate: '2026-10-16',
          links: [{
            label: 'Ver el hilo completo',
            href: Canillita.render.hiloUrl('vacamuerta')
          }]
        }
      )
    ], ['Contame lo de Vaca Muerta', 'Contame el hilo de Ueno', 'Menú'], 'vmos');
  }

  function asuncion() {
    return storyReply('asuncion_basura', 'asuncion',
      ['¿Cómo está el río?', '¿Cómo viene la campaña de soja?', 'Menú']);
  }

  function soja() {
    return storyReply('soja_campana', 'soja',
      ['¿Cómo está el río?', '¿Cómo viene la Bioceánica?', 'Menú']);
  }

  function rio() {
    return storyReply('rio_bajante', 'rio',
      ['¿Cómo viene la campaña de soja?', '¿Cómo viene la Bioceánica?', 'Menú']);
  }

  /* ------------------------------------------------------------- Messi */

  /* Nombre completo y no abreviatura: este mismo texto lo lee Piper en voz
     alta, y "31 ago" se pronuncia tal cual está escrito. */
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /*
   * Rótulo de un hito en el chat. Cuando varios hitos caen en el mismo año
   * —que es lo normal cuando el hilo se mueve— mostrar solo "2026" cuatro
   * veces no dice nada: ahí conviene el día y el mes.
   *
   * Y si el hito todavía no pasó, se dice. Un hilo vivo tiene agenda, y
   * confundir agenda con hecho consumado es el error que no se perdona.
   */
  function rotuloHito(item, mismoAnio) {
    var partes = item.date.split('-');
    var cuando = mismoAnio
      ? Number(partes[2]) + ' de ' + MESES[Number(partes[1]) - 1]
      : partes[0];
    return '• *' + cuando + '* · ' + item.title +
      (item.upcoming ? ' _(todavía no pasó)_' : '');
  }

  function ultimosHitos(story, cuantos) {
    var ultimos = story.timeline.slice(-cuantos);
    var anios = ultimos.map(function (item) { return item.date.slice(0, 4); });
    var mismoAnio = anios.every(function (a) { return a === anios[0]; });
    return ultimos.map(function (item) {
      return rotuloHito(item, mismoAnio);
    }).join('\n');
  }

  function messi() {
    var story = content.get('messi_hilo');

    return reply([
      message('⚽ *' + story.title + '*\n_' + story.subtitle + '_\n\n' + story.shortSummary),
      message('*Lo último del hilo*\n' + ultimosHitos(story, 4), {
        dataDate: story.eventDate,
        links: [{ label: 'Ver el hilo completo', href: Canillita.router.editionUrl() }]
      })
    ], ['¿Messi se retira de la Selección?', '¿Cuándo es la despedida de Messi?', 'Ver deportes'], 'messi');
  }

  function messiFinal() {
    var story = content.get('messi_hilo');
    return reply([
      message(
        '🏆 *España 1 - Argentina 0*\nFinal del Mundial 2026 · 19 de julio · MetLife Stadium, Nueva Jersey\n\n' +
        'Terminó 0 a 0 los noventa minutos. A los 93, Enzo Fernández se fue expulsado por doble amarilla. ' +
        'A los 106, ya en el segundo tiempo suplementario, Ferran Torres marcó el único gol.\n\n' +
        'Emiliano Martínez fue la figura del equipo argentino. Messi terminó el torneo con ocho goles y cuatro asistencias, ' +
        'pero sin premios individuales: el mejor jugador fue Rodri y la Bota de Oro quedó para Mbappé.',
        {
          dataDate: '2026-07-19'
        }
      )
    ], ['¿Messi se retira de la Selección?', 'Contame el hilo de Messi', 'Menú'], 'messi-final');
  }

  function messiRetiro() {
    return reply([
      message(
        'Sí. Lo anunció el 31 de agosto.\n\n' +
        '✔️ *Confirmado:* publicó en Instagram un mensaje escrito a mano y un video. "Fue una ' +
        'decisión que dolió y duele en el alma, pero entiendo que es el momento". En el video ' +
        'quedó la frase que se repitió toda la semana: "Me vacié, ya no tengo más para dar".\n\n' +
        '✔️ *Confirmado:* el texto estaba fechado el 21 de julio, dos días después de la final. ' +
        'Lo guardó cuarenta y tres días antes de publicarlo. En el medio murió su padre, Jorge, ' +
        'el 8 de agosto.\n\n' +
        '✔️ *Confirmado:* cierra su ciclo con 207 partidos, 125 goles y seis títulos. Jugar ' +
        'sigue jugando: tiene contrato con Inter Miami hasta fines de 2028.',
        { dataDate: '2026-08-31' }
      ),
      message(
        '⏳ *Lo que sigue abierto:* la continuidad de Scaloni. Su contrato vence en diciembre de ' +
        '2026 y la renovación no está definida. El capitán, eso sí, ya tiene nombre: el 24 de ' +
        'septiembre Scaloni confirmó que la cinta pasa a Cuti Romero.',
        { dataDate: '2026-09-24' }
      )
    ], ['¿Cuándo es la despedida de Messi?', 'Contame el hilo de Messi', 'Menú'], 'messi-retiro');
  }

  /*
   * La despedida ya pasó. Cuando un hilo tiene un capítulo con fecha, el día
   * siguiente hay que venir a escribirlo en pasado: una demo que sigue
   * anunciando en futuro algo que ya ocurrió se cae sola.
   */
  function messiDespedida() {
    return reply([
      message(
        '🏟️ *Argentina 3 - Benín 0*\nMartes 6 de octubre · Monumental lleno\n\n' +
        'Fue el partido 208 de Messi con la Selección, y el último. Terminó con un gol suyo y ' +
        'dos asistencias.\n\n' +
        'El primer tiempo fue 0 a 0. A los 47 Otamendi empujó un centro de él; a los 61 Nico ' +
        'Paz definió tras otro pase suyo; y cerca de los 70 Messi convirtió de penal el gol ' +
        '*126* de su ciclo.',
        { dataDate: '2026-10-06' }
      ),
      message(
        'Entró con sus hijos y su mamá estuvo en el estadio. Hubo drones, fuegos artificiales y ' +
        'la Sole cantando. Esa misma tarde había recibido el Doctorado Honoris Causa de la UBA.' +
        '\n\nEn el campo habló de un día muy triste y prometió acompañar a los que vienen. La ' +
        'palabra que más se escuchó esa noche fue gracias.',
        { dataDate: '2026-10-06' }
      )
    ], ['¿Messi se retira de la Selección?', 'Contame el hilo de Messi', 'Menú'], 'messi-despedida');
  }

  function messiPremios() {
    var story = content.get('messi_hilo');
    return reply([
      message(
        '🏅 *Ocho Balones de Oro*, más que ningún otro futbolista en la historia.\n\n' +
        '2009, 2010, 2011, 2012, 2015, 2019, 2021 y 2023.\n\n' +
        'Cristiano Ronaldo, su contemporáneo, tiene cinco. Desde 2024 Messi no figura entre los nominados: ese año ganó Rodri y en 2025, Dembélé.',
        {
          dataDate: '2025-09-22'
        }
      )
    ], ['Contame el hilo de Messi', '¿Messi se retira de la Selección?', 'Menú']);
  }

  function thanks() {
    return reply(message('De nada. Acá estoy cuando quieras seguir alguna historia.'), BASE_REPLIES);
  }

  function unknown() {
    return reply([
      message('No tengo información validada sobre ese tema dentro de esta demostración. Por ahora puedo responder sobre el caso Ueno, la Bioceánica, Asunción, la soja, el río, Vaca Muerta, Messi y el Clausura.'),
      message('Probá con alguna de estas:')
    ], ['¿Por qué cayó Ueno?', '¿Cómo viene la Bioceánica?', 'Ver deportes', 'Menú'], 'fuera-de-alcance');
  }

  /* ------------------------------------------------- configuración guiada */

  /*
   * Flujo de preferencias: una pregunta por vez. El chat consulta si hay un
   * paso pendiente antes de pasar el mensaje al motor de intenciones.
   */
  var flowStep = null;

  var FLOW = {
    name: {
      question: '¿Cómo querés que te llame?',
      quickReplies: [],
      save: function (text) { prefs.set({ name: text.trim().slice(0, 40) }); },
      next: 'locality'
    },
    locality: {
      question: '¿En qué localidad vivís?',
      quickReplies: ['Asunción', 'Ciudad del Este', 'Encarnación', 'Luque'],
      save: function (text) { prefs.set({ locality: text.trim().slice(0, 40) }); },
      next: 'topics'
    },
    topics: {
      question: '¿Qué temas te interesan?',
      quickReplies: ['Economía y deportes', 'Solo economía', 'Solo deportes', 'Todo'],
      save: function (text) {
        var normalized = Canillita.intents.normalize(text);
        var topics = ['finanzas', 'deportes'];
        if (normalized.indexOf('solo economia') !== -1) topics = ['finanzas'];
        else if (normalized.indexOf('solo deporte') !== -1) topics = ['deportes'];
        else if (normalized.indexOf('todo') !== -1) {
          topics = ['finanzas', 'bioceanico', 'vacamuerta', 'municipio',
                    'agro', 'clima', 'deportes'];
        }
        prefs.set({ topics: topics });
      },
      next: 'format'
    },
    format: {
      question: '¿Cómo preferís recibir el resumen?',
      quickReplies: ['Texto', 'Audio', 'Texto y audio', 'Los tres formatos'],
      save: function (text) {
        var normalized = Canillita.intents.normalize(text);
        var format = 'texto';
        if (normalized.indexOf('tres') !== -1) format = 'todos';
        else if (normalized.indexOf('texto y audio') !== -1) format = 'texto_audio';
        else if (normalized.indexOf('audio') !== -1) format = 'audio';
        else if (normalized.indexOf('visual') !== -1) format = 'html';
        prefs.set({ format: format });
      },
      next: 'duration'
    },
    duration: {
      question: '¿Cuánto querés que dure el boletín de audio?',
      quickReplies: ['30 segundos', '1 minuto', '3 minutos', '5 minutos'],
      save: function (text) {
        var normalized = Canillita.intents.normalize(text);
        var seconds = 60;
        if (normalized.indexOf('30') !== -1) seconds = 30;
        else if (normalized.indexOf('3 min') !== -1) seconds = 180;
        else if (normalized.indexOf('5 min') !== -1) seconds = 300;
        prefs.set({ audioSeconds: seconds });
      },
      next: 'hour'
    },
    hour: {
      question: '¿A qué hora te gustaría recibirlo?',
      quickReplies: ['07:00', '08:00', '13:00', '20:00'],
      save: function (text) {
        var match = String(text).match(/(\d{1,2})[:.]?(\d{2})?/);
        if (match) {
          var hours = String(Math.min(23, Number(match[1]))).padStart(2, '0');
          var minutes = match[2] ? match[2] : '00';
          prefs.set({ hour: hours + ':' + minutes });
        }
      },
      next: null
    }
  };

  function startPreferences() {
    flowStep = 'name';
    return reply([
      message('Vamos a configurar tu edición. Son seis preguntas cortas y se guardan solo en este navegador.'),
      message(FLOW.name.question)
    ], FLOW.name.quickReplies);
  }

  function isAwaitingPreference() {
    return flowStep !== null;
  }

  function continuePreferences(text) {
    var step = FLOW[flowStep];
    var normalized = Canillita.intents.normalize(text);

    // Escape del flujo en cualquier momento.
    if (normalized === 'cancelar' || normalized === 'salir') {
      flowStep = null;
      return reply(message('Listo, dejamos la configuración como estaba.'), menuReplies());
    }

    step.save(text);
    flowStep = step.next;

    if (flowStep) {
      return reply(message(FLOW[flowStep].question), FLOW[flowStep].quickReplies);
    }

    return reply([
      message('✅ Guardado. Así quedó tu configuración:\n\n' + prefs.summaryText()),
      message('El horario todavía no dispara envíos automáticos: en esta demo se usa para personalizar el saludo y la edición.')
    ], ['Mi resumen de hoy', 'Escuchar las noticias', 'Menú']);
  }

  /* --------------------------------------------------------------- router */

  var HANDLERS = {
    greeting: greeting,
    help: help,
    daily_summary: dailySummary,
    listen_summary: listenSummary,
    open_html: openHtml,
    ueno: ueno,
    ueno_banco: uenoBanco,
    ueno_pena: uenoPena,
    ueno_ahorristas: uenoAhorristas,
    bioceanico: bioceanico,
    bioceanico_puente: bioceanicoPuente,
    bioceanico_historia: bioceanicoHistoria,
    sports: sports,
    sports_next: sportsNext,
    vacamuerta: vacamuerta,
    vmos: vmos,
    asuncion: asuncion,
    soja: soja,
    rio: rio,
    messi: messi,
    messi_final: messiFinal,
    messi_retiro: messiRetiro,
    messi_despedida: messiDespedida,
    messi_premios: messiPremios,
    preferences: startPreferences,
    thanks: thanks,
    unknown: unknown
  };

  /**
   * Punto de entrada: recibe el texto del usuario y devuelve la respuesta.
   */
  function respondTo(text) {
    if (isAwaitingPreference()) {
      return continuePreferences(text);
    }
    var detection = Canillita.intents.detect(text);
    var handler = HANDLERS[detection.intent] || unknown;
    return handler();
  }

  Canillita.responses = {
    respondTo: respondTo,
    greeting: greeting,
    longDate: longDate,
    todayLabel: todayLabel,
    clockLabel: clockLabel
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.responses;
  }
})(typeof window !== 'undefined' ? window : globalThis);
