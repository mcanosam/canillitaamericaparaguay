/*
 * personas.js
 * -----------
 * Lectores de ejemplo para mostrar la demo.
 *
 * No son cuentas ni usuarios: son configuraciones de preferencias con nombre.
 * Elegir una es exactamente lo mismo que si esa persona hubiera cargado sus
 * datos a mano. Por eso el efecto es real y no una simulación: cambia el
 * mismo `localStorage` que usa cualquier lector.
 *
 * Existen para responder en veinte segundos la pregunta más difícil de la
 * demo: "¿en qué se diferencia de un diario común?".
 *
 * Criterio para armar la lista: cada lector tiene que diferenciarse del
 * anterior en algo que se vea apenas cambia la pantalla. No alcanza con que
 * tengan temas distintos, porque Ueno le interesa hoy a todo el país y
 * entonces varias portadas salen parecidas. Por eso cada uno varía además en
 * el formato, en cuánto tiempo tiene y en qué hilo sigue:
 *
 *   José Luis  economía y energía     texto y audio   3 min
 *   Daniel     la región productiva   solo audio      3 min
 *   Marco      la ciudad y el día     texto y audio   1 min
 *   Héctor     la edición completa    todos           5 min
 *   Yo         configuración vacía    texto y audio   1 min
 *
 * Y cada uno sigue al menos un hilo distinto, así el cartel de "esto cambió
 * desde tu última visita" aparece en un lugar diferente según quién entre.
 *
 * Los perfiles describen qué lee cada uno y nada más. No llevan biografía ni
 * datos personales: son configuraciones de lectura con nombre, y conviene que
 * se lean así cuando la persona del nombre está sentada en la sala. La
 * localidad es una preferencia de la app, no una afirmación sobre nadie.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};

  var PERSONAS = [
    {
      id: 'joseluis',
      nombre: 'José Luis',
      rol: 'Economía y energía',
      descripcion: 'El caso Ueno y sus consecuencias, y la energía de la región.',
      prefs: {
        name: 'José Luis',
        locality: 'Asunción',
        topics: ['finanzas', 'vacamuerta'],
        following: ['ueno'],
        format: 'texto_audio',
        audioSeconds: 180,
        speechRate: 1
      }
    },
    {
      id: 'daniel',
      nombre: 'Daniel',
      rol: 'La región productiva',
      descripcion: 'La obra que abre el camino al Pacífico, la soja y el río por donde sale todo.',
      prefs: {
        name: 'Daniel',
        locality: 'Ciudad del Este',
        topics: ['bioceanico', 'agro', 'clima'],
        following: ['bioceanico', 'rio'],
        format: 'audio',
        audioSeconds: 180,
        speechRate: 1
      }
    },
    {
      id: 'marco',
      nombre: 'Marco',
      rol: 'La ciudad y el día',
      descripcion: 'Lo que pasa en Asunción, el tiempo y el deporte. Poco tiempo, al grano.',
      prefs: {
        name: 'Marco',
        locality: 'Asunción',
        topics: ['municipio', 'clima', 'deportes'],
        following: ['asuncion', 'messi'],
        format: 'texto_audio',
        audioSeconds: 60,
        speechRate: 1.15
      }
    },
    {
      id: 'hector',
      nombre: 'Héctor',
      rol: 'Quiere ver todo',
      descripcion: 'La edición completa, sin filtrar, en todos los formatos.',
      prefs: {
        name: 'Héctor',
        locality: 'Asunción',
        topics: ['finanzas', 'bioceanico', 'vacamuerta', 'municipio', 'agro', 'clima', 'deportes'],
        following: ['ueno', 'bioceanico', 'messi'],
        format: 'todos',
        audioSeconds: 300,
        speechRate: 1
      }
    },
    {
      id: 'yo',
      nombre: 'Yo',
      rol: 'Mi configuración',
      descripcion: 'Economía, lo que pasa en la ciudad y el estado del río.',
      prefs: {
        name: '',
        locality: '',
        topics: ['finanzas', 'municipio', 'clima'],
        following: [],
        format: 'texto_audio',
        audioSeconds: 60,
        speechRate: 1
      }
    }
  ];

  function todas() {
    return PERSONAS.slice();
  }

  function get(id) {
    var encontrada = PERSONAS.filter(function (p) { return p.id === id; });
    return encontrada.length ? encontrada[0] : null;
  }

  /** Cuál está activa, o null si el lector configuró lo suyo. */
  function activa() {
    return Canillita.preferences.get().persona || null;
  }

  /**
   * Aplica una persona: escribe sus preferencias como si las hubiera cargado
   * el propio lector. Devuelve la persona aplicada.
   */
  function aplicar(id) {
    var persona = get(id);
    if (!persona) return null;
    /*
     * lastVisit vuelve a cero: cada lector tiene su propia historia de
     * visitas. Sin esto, al cambiar de persona se arrastraba la visita del
     * anterior y las novedades quedaban vacías.
     */
    Canillita.preferences.set(Object.assign(
      { persona: id, lastVisit: null }, persona.prefs
    ));
    return persona;
  }

  /** Vuelve a una configuración propia, sin persona de ejemplo. */
  function limpiar() {
    Canillita.preferences.set({ persona: null });
  }

  Canillita.personas = {
    todas: todas,
    get: get,
    activa: activa,
    aplicar: aplicar,
    limpiar: limpiar
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.personas;
  }
})(typeof window !== 'undefined' ? window : globalThis);
