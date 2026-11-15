/*
 * bioceanico.js
 * -------------
 * Historia viva del Corredor Bioceánico: junta las dos notas del tema en una
 * sola página navegable, separando siempre lo confirmado de lo que está en
 * discusión.
 *
 * La actualidad (qué cambió) y la historia (por qué se construye) son dos JSON
 * distintos; acá se muestran como una sola historia que sigue abierta.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita;
  var doc = global.document;
  var R = null;

  var actualidad = null;
  var historia = null;

  /* ------------------------------------------------------------ cabecera */

  function paintHeader() {
    var nav = doc.getElementById('secciones');
    if (nav) nav.innerHTML = R.seccionesNav('bioceanico');
    R.bindConversarConDiario(doc.getElementById('secciones'));

    var cajaPersonas = doc.getElementById('personas');
    if (cajaPersonas && R.personaBar) {
      cajaPersonas.innerHTML = R.personaBar();
      R.bindPersonaBar(cajaPersonas);
    }

    var versionEl = doc.getElementById('version-label');
    if (versionEl && typeof Canillita.versionLabel === 'function') {
      versionEl.textContent = Canillita.versionLabel();
    }

    doc.getElementById('bajada').textContent = actualidad.subtitle;
    doc.getElementById('meta').textContent =
      'Última actualización: ' + R.longDate(actualidad.lastUpdated) +
      ' · ' + historia.readingTime + ' min de lectura';
    doc.getElementById('acciones').innerHTML =
      R.followButton('bioceanico') +
      '<a class="btn btn--ghost" href="edicion.html">Ver mi edición ›</a>';
    doc.getElementById('actualizada').textContent =
      'Página actualizada el ' + R.longDate(actualidad.lastUpdated) + '.';
  }

  /* ---------------------------------------------------------- actualidad */

  function paintActualidad() {
    doc.getElementById('actualidad').innerHTML =
      R.figure(actualidad, 'principal') +
      '<p class="destacado">' + R.esc(actualidad.shortSummary) + '</p>' +
      R.firma(actualidad) +
      R.procedencia(actualidad) +
      R.credencialesHilo(actualidad) +
      '<div class="article">' + R.articleBody(actualidad.articleBody) + '</div>' +
      '<div class="importa"><h3>Por qué importa acá</h3><p>' +
        R.esc(actualidad.whyItMatters) + '</p></div>' +
      R.answerPlayer('bioceanico-actualidad', 'Escuchar el resumen');
  }

  /* -------------------------------------------------------------- tramos */

  /*
   * Las obras del corredor se muestran con detalle pero sin clip propio: son
   * una tabla de estado, no una pieza para escuchar. El audio del tema está en
   * los dos bloques de arriba.
   */
  function paintTramos() {
    doc.getElementById('tramos-lista').innerHTML =
      R.sections(historia.sections, true, false);
  }

  /* ------------------------------------------------------------ historia */

  function paintHistoria() {
    doc.getElementById('cuerpo').innerHTML =
      R.answerPlayer('bioceanico-historia', 'Escuchar de qué se trata el corredor') +
      R.articleBody(historia.articleBody);
  }

  /* ---------------------------------------------------------- cronología */

  /** Une los hitos de las dos notas en una sola línea de tiempo ordenada. */
  function paintCronologia() {
    var merged = {
      timeline: historia.timeline.concat(actualidad.timeline).sort(function (a, b) {
        return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
      }),
      sources: historia.sources.concat(actualidad.sources)
    };
    doc.getElementById('cronologia-lista').innerHTML = R.timeline(merged);
  }

  /* --------------------------------------------------- qué sabemos / falta */

  function paintSaber() {
    doc.getElementById('saber-cols').innerHTML =
      '<div class="saber__col">' +
        '<h3>Qué sabemos</h3>' + R.confirmedFacts(actualidad) +
      '</div>' +
      '<div class="saber__col">' +
        '<h3>Qué todavía falta definir</h3>' + R.pendingQuestions(actualidad) +
      '</div>';
  }

  /* -------------------------------------------------------------- fuentes */


  /* ---------------------------------------------------------- sugerencias */

  function paintSugeridas() {
    var questions = historia.suggestedQuestions.concat(actualidad.suggestedQuestions);
    var vistas = {};
    doc.getElementById('sugeridas').innerHTML = questions.filter(function (question) {
      if (vistas[question]) return false;
      vistas[question] = true;
      return true;
    }).slice(0, 6).map(function (question) {
      return '<a class="sugerida" href="' + R.esc(Canillita.router.chatUrl(question)) + '">' +
        R.esc(question) + '</a>';
    }).join('');
  }

  /* ----------------------------------------------------------------- init */

  function start() {
    R = Canillita.render;
    if (Canillita.tema) Canillita.tema.init();
    Promise.all([
      Canillita.content.load(),
      Canillita.radio.loadAnswers()
    ]).then(function () {
      actualidad = Canillita.content.get('bioceanico_actualidad');
      historia = Canillita.content.get('bioceanico_historia');

      paintHeader();
      paintActualidad();
      paintTramos();
      paintHistoria();
      paintCronologia();
      paintSaber();
      paintSugeridas();

      R.bindFollowButtons(doc);
      R.bindAnswerPlayers(doc);
      R.bindAskForm('ask-form', 'ask-input');

      // Si se llegó con un ancla (#seccion3), recién ahora existe el destino.
      if (global.location.hash) {
        var target = doc.getElementById(global.location.hash.slice(1));
        if (target) target.scrollIntoView();
      }
    }).catch(function (error) {
      doc.getElementById('actualidad').innerHTML =
        '<p class="error">No pude cargar la historia. ' +
        Canillita.render.esc(error.message) + '</p>';
    });
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
