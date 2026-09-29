// lector.js — RF-021,024..029 (lector de curso) y RF-030..036 (evaluación)

sesion.requerir(["trabajador"]);
sesion.vigilarInactividad(20);

const idCurso = Number(new URLSearchParams(window.location.search).get("id"));

const tituloCurso = document.getElementById("lector-titulo-curso");
const estructuraModulos = document.getElementById("estructura-modulos");
const contenidoTema = document.getElementById("contenido-tema");
const progresoActual = document.getElementById("progreso-actual");
const progresoTotal = document.getElementById("progreso-total");
const btnAnterior = document.getElementById("btn-anterior");
const btnSiguiente = document.getElementById("btn-siguiente");
const btnVolver = document.getElementById("btn-volver-dashboard");
const tituloTopbar = document.getElementById("lector-topbar-curso");
const leccionTopbar = document.getElementById("lector-topbar-leccion");
const progresoPorcentaje = document.getElementById("lector-progreso-porcentaje");
const progresoRelleno = document.getElementById("lector-progreso-relleno");
const cursoCategoria = document.getElementById("lector-curso-categoria");
const cursoDuracion = document.getElementById("lector-curso-duracion");
const cursoEstado = document.getElementById("lector-curso-estado");
const separadorLector = document.getElementById("lector-separador");
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");

let curso = null;
let progresoCurso = null;
let leccionActualId = null;
let solicitudContenido = 0;
let guardandoLeccion = false;
let cargandoLeccion = false;
let leccionDisponible = false;
let controlConsumo = null;
function detenerConsumo() { controlConsumo?.detener(); controlConsumo=null; }
function puedeCompletarActual() { return !!progresoCurso?.completadas.includes(leccionActualId) || !!controlConsumo?.listo(); }
function puedeAbrirLeccion(id) {
  const todas=obtenerTodasLecciones();
  return progresoCurso?.completadas.includes(id) || todas.find(l=>!progresoCurso?.completadas.includes(l.id))?.id===id;
}
window.addEventListener("pagehide", () => controlConsumo?.detener());
window.addEventListener("pageshow", event => { if (event.persisted && typeof leccionActualId === "number") mostrarLeccion(leccionActualId); });


// Cierre global: apertura + horas; nunca se reinicia al entrar o recargar.
let temporizadorIntervalo = null;
let cursoCerrado = false;
function verificarCierreCurso() {
  if (!curso || estadoTemporalCurso(curso) !== "cerrado") return false;
  if (!cursoCerrado) {
    cursoCerrado = true;
    detenerConsumo();
    solicitudContenido++;
    leccionDisponible = false;
    contenidoTema.innerHTML = '<div class="lector-aviso-examen"><h1>Curso cerrado</h1><p>Terminó el tiempo disponible del curso. Tu avance guardado se conserva.</p><a class="btn btn-primario" href="dashboard.html">Volver a mis cursos</a></div>';
    btnAnterior.disabled = true;
    btnSiguiente.disabled = true;
    estructuraModulos.inert = true;
    if (cursoEstado) cursoEstado.textContent = "Curso cerrado";
    clearInterval(temporizadorIntervalo);
  }
  return true;
}
function iniciarTemporizadorCurso() {
  const elemento = document.getElementById("lector-tiempo-restante");
  if (!curso) return;
  const fin = fechaCierreCurso(curso);
  const pintar = () => {
    const totalSeg = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
    const h = String(Math.floor(totalSeg / 3600)).padStart(2, "0");
    const m = String(Math.floor(totalSeg % 3600 / 60)).padStart(2, "0");
    const sec = String(totalSeg % 60).padStart(2, "0");
    if (elemento) {
      elemento.textContent = fin ? "⏱ " + h + ":" + m + ":" + sec + " restantes" : "⏱ Sin fecha de cierre";
      elemento.classList.toggle("agotado", !!fin && Date.now() >= fin);
    }
    verificarCierreCurso();
  };
  clearInterval(temporizadorIntervalo);
  temporizadorIntervalo = setInterval(pintar, 1000);
  pintar();
}
window.addEventListener("focus", verificarCierreCurso);
document.addEventListener("visibilitychange", verificarCierreCurso);

function normalizarProgreso() {
  if (!progresoCurso) return;
  const ids = [...new Set(obtenerTodasLecciones().map(l => l.id))];
  const completadas = new Set((progresoCurso.completadas || []).map(String));
  progresoCurso.completadas = ids.filter(id => completadas.has(String(id)));
  progresoCurso.porcentaje = ids.length
    ? Math.min(100, Math.round(progresoCurso.completadas.length / ids.length * 100)) : 0;
}

function prepararVista() {
  contenidoTema.scrollTop = 0;
  document.getElementById("lector-aviso-guardado").textContent = "";
  contenidoTema.setAttribute("aria-busy", "false");
  const lector = document.querySelector(".lector-curso");
  if (window.matchMedia("(max-width: 760px)").matches) {
    lector.classList.add("sidebar-oculto");
    actualizarEstadoSidebar();
  }
}

function filtrarEsquema() {
  const consulta = document.querySelector('.lector-buscador input').value.trim().toLocaleLowerCase();
  estructuraModulos.querySelectorAll('.modulo').forEach(modulo => {
    let visibles = 0;
    modulo.querySelectorAll('[data-leccion], [data-evaluacion-tipo]').forEach(item => {
      item.hidden = !item.textContent.toLocaleLowerCase().includes(consulta);
      if (!item.hidden) visibles++;
    });
    modulo.hidden = visibles === 0;
    modulo.querySelectorAll('.tema-grupo').forEach(tema => {
      tema.hidden = !Array.from(tema.querySelectorAll('[data-leccion]')).some(item => !item.hidden);
      if (consulta && !tema.hidden) tema.classList.add('expandido');
    });
    if (consulta && visibles) modulo.classList.add('expandido');
  });
  document.getElementById('lector-busqueda-vacia').hidden =
    Array.from(estructuraModulos.querySelectorAll('.modulo')).some(m => !m.hidden);
}

function escaparHtml(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMediaNivel(imagen, video, etiqueta) {
  const imagenSegura = obtenerUrlMediaSegura(imagen);
  const videoSeguro = obtenerUrlMediaSegura(video);
  if (!imagenSegura && !videoSeguro) return "";
  return `<div class="lector-media-nivel">
    <div class="lector-media-nivel-etiqueta">${escaparHtml(etiqueta)}</div>
    <div class="lector-media-nivel-recursos">
      ${imagenSegura ? `<img src="${imagenSegura}" alt="${escaparHtml(etiqueta)}" loading="lazy" />` : ""}
      ${videoSeguro ? `<video src="${videoSeguro}" controls preload="metadata"></video>` : ""}
    </div>
  </div>`;
}

function obtenerUrlMediaSegura(url) {
  if (!url) return "";
  try {
    const valor = new URL(url, window.location.href);
    return ["http:", "https:", "data:"].includes(valor.protocol) ? escaparHtml(valor.href) : "";
  } catch (error) {
    return "";
  }
}

function configurarAlturaViewport() {
  const alturaViewport = window.innerHeight || document.documentElement.clientHeight || 0;
  if (alturaViewport > 0) {
    document.documentElement.style.setProperty("--app-vh", `${alturaViewport * 0.01}px`);
  }
}

function configurarSeparador() {
  if (!separadorLector) return;
  const lector = document.querySelector(".lector-curso");
  const sidebar = document.querySelector(".lector-sidebar");
  if (!lector || !sidebar) return;

  const ajustar = (ancho) => {
    const anchoCalculado = Math.min(480, Math.max(260, ancho));
    sidebar.style.width = `${anchoCalculado}px`;
    sidebar.style.flexBasis = `${anchoCalculado}px`;
  };

  const limpiarEventos = () => {
    lector.classList.remove("redimensionando");
    separadorLector.removeEventListener("pointermove", mover);
    separadorLector.removeEventListener("pointerup", terminar);
    separadorLector.removeEventListener("pointercancel", terminar);
  };

  let mover = null;
  let terminar = null;
  let inicioX = 0;
  let anchoInicial = 0;

  separadorLector.addEventListener("pointerdown", (evento) => {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    if (lector.classList.contains("sidebar-oculto")) return;
    evento.preventDefault();
    inicioX = evento.clientX;
    anchoInicial = sidebar.getBoundingClientRect().width;
    lector.classList.add("redimensionando");
    // Mantiene el puntero "capturado" en el separador para que el cursor de
    // redimensionado no se pierda (mostrando el cursor blanco por defecto)
    // si el movimiento es rápido y sale del área angosta del divisor.
    try {
      separadorLector.setPointerCapture(evento.pointerId);
    } catch (error) {
      /* Ignorar si el navegador no soporta captura de puntero. */
    }

    mover = (movimiento) => {
      const delta = movimiento.clientX - inicioX;
      ajustar(anchoInicial + delta);
    };

    terminar = (evt) => {
      try {
        separadorLector.releasePointerCapture(evt.pointerId);
      } catch (error) {
        /* Ignorar si ya se liberó o no es compatible. */
      }
      limpiarEventos();
    };

    separadorLector.addEventListener("pointermove", mover);
    separadorLector.addEventListener("pointerup", terminar, { once: true });
    separadorLector.addEventListener("pointercancel", terminar, { once: true });
  });

  separadorLector.addEventListener("keydown", (evento) => {
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
    evento.preventDefault();
    const anchoActual = sidebar.getBoundingClientRect().width || parseFloat(getComputedStyle(sidebar).width) || 380;
    ajustar(anchoActual + (evento.key === "ArrowRight" ? 20 : -20));
  });
}

function obtenerTodasLecciones() {
  return (curso?.modulos || []).flatMap((modulo) =>
    modulo.temas
      ? modulo.temas.flatMap((tema) => tema.subtemas || [])
      : modulo.lecciones || []
  );
}

function actualizarContador() {
  if (cursoCerrado) return;
  normalizarProgreso();
  const todas = obtenerTodasLecciones();
  progresoTotal.textContent = todas.length;
  const porcentaje = progresoCurso?.porcentaje || 0;
  document.getElementById("lector-lecciones-completadas").textContent = `${progresoCurso?.completadas.length || 0} de ${todas.length} subtemas completados`;
  if (progresoPorcentaje) progresoPorcentaje.textContent = `${porcentaje}%`;
  if (progresoRelleno) progresoRelleno.style.width = `${porcentaje}%`;
  if (cursoEstado) cursoEstado.textContent = progresoCurso?.examenAprobado ? "Completado" : cursoListoParaExamen() ? "Listo para examen final" : "En progreso";
  if (leccionActualId === "evaluacion" || leccionActualId === "examen") {
    progresoActual.textContent = todas.length;
    return;
  }

  const indice = todas.findIndex((l) => l.id === leccionActualId);
  progresoActual.textContent = indice >= 0 ? indice + 1 : 1;
}

function actualizarEstadoNavegacion() {
  if (cursoCerrado) { btnAnterior.disabled = true; btnSiguiente.disabled = true; return; }
  const todas = obtenerTodasLecciones();
  const indice = todas.findIndex(l => l.id === leccionActualId);
  const evaluando = leccionActualId === "evaluacion" || leccionActualId === "examen";
  btnAnterior.textContent = evaluando ? "Volver a subtemas" : "Anterior";
  btnAnterior.disabled = cargandoLeccion || guardandoLeccion || (!evaluando && indice <= 0) || !todas.length;
  btnAnterior.setAttribute("aria-label", btnAnterior.textContent);
  const pendientes = todas.filter(l => !progresoCurso?.completadas.includes(l.id));
  const terminaModulos = !!progresoCurso?.evaluacionInicialAprobada
    && (cursoListoParaExamen() || (pendientes.length === 1 && pendientes[0].id === leccionActualId));
  btnSiguiente.textContent = terminaModulos ? "Ir al examen final" : indice === todas.length - 1 ? "Continuar con pendientes" : "Siguiente";
  btnSiguiente.disabled = cargandoLeccion || guardandoLeccion || evaluando || indice < 0 || !leccionDisponible || !puedeCompletarActual();
  btnSiguiente.hidden = evaluando;
  btnSiguiente.setAttribute("aria-label", btnSiguiente.textContent);
  const completa = progresoCurso?.completadas.includes(leccionActualId);
  document.getElementById("lector-estado-leccion").textContent = evaluando
    ? (leccionActualId === "examen" ? "Examen final" : "Evaluación del curso")
    : completa ? "Lección completada" : controlConsumo?.mensaje() || "Espera a que cargue el contenido.";
}

function cursoListoParaExamen() {
  const todas = obtenerTodasLecciones();
  return !!progresoCurso?.evaluacionInicialAprobada && todas.length > 0 && todas.every((leccion) => progresoCurso.completadas.includes(leccion.id));
}

function siguienteLeccion() {
  if (verificarCierreCurso()) return;
  if (cargandoLeccion || guardandoLeccion) return;
  const todas = obtenerTodasLecciones();
  const indice = todas.findIndex(l => l.id === leccionActualId);
  if (indice < 0 || !progresoCurso?.completadas.includes(leccionActualId)) return;
  if (!progresoCurso?.evaluacionInicialAprobada) return mostrarEvaluacion("evaluacion");
  if (cursoListoParaExamen()) return mostrarEvaluacion("examen");
  if (indice < todas.length - 1) return mostrarLeccion(todas[indice + 1].id);
  const pendiente = todas.find(l => !progresoCurso.completadas.includes(l.id));
  if (pendiente) return mostrarLeccion(pendiente.id);
}

function pintarEsquema() {
  if (!curso || !estructuraModulos || !progresoCurso) return;

  normalizarProgreso();
  const modulos = curso.modulos || [];
  estructuraModulos.innerHTML = modulos.map((modulo, indiceModulo) => {
    const temas = modulo.temas?.length
      ? modulo.temas
      : modulo.lecciones?.length
        ? [{ nombre: "Contenido del tema", subtemas: modulo.lecciones }]
        : [];
    const leccionesModulo = temas.flatMap((tema) => tema.subtemas || []);
    const total = leccionesModulo.length;
    const completas = leccionesModulo.filter((l) => progresoCurso.completadas.includes(l.id)).length;
    const contieneLeccionActual = leccionesModulo.some((l) => l.id === leccionActualId);
    const expandido = contieneLeccionActual || completas < total ? "expandido" : "";
    const porcentajeModulo = total ? Math.round((completas / total) * 100) : 0;
    const numeroModulo = `Tema ${indiceModulo + 1}: `;

    return `
      <div class="modulo ${expandido}" data-modulo="${modulo.id}">
        <button class="modulo-titulo" data-toggle-modulo="${modulo.id}">
          <span class="modulo-titulo-texto">
            <strong>${numeroModulo}${escaparHtml(modulo.nombre || "Sin título")}</strong>
            <span class="modulo-chevron" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </span>
          <span class="modulo-barra-fila">
            <span class="modulo-barra"><i style="width:${porcentajeModulo}%"></i></span>
            <span class="modulo-progreso" title="${completas} de ${total} subtemas completados">${porcentajeModulo}%</span>
          </span>
        </button>
        <ul class="modulo-contenido">
          <li class="temas-contenedor">${temas.map((tema, indiceTema) => {
            const subtemas = tema.subtemas || [];
            const temaExpandido = subtemas.length ? "expandido" : "";
            return `
            <div class="tema-grupo ${temaExpandido}">
              <button type="button" class="tema-grupo-titulo" data-toggle-tema="${modulo.id}-${indiceTema}">
                <span class="tema-grupo-nombre"><span class="tema-icono">›</span>Unidad ${indiceTema + 1}: ${escaparHtml(tema.nombre || "Sin título")}</span>
                <span class="tema-grupo-contador">${subtemas.length}</span>
              </button>
              <ul class="subtemas-lista">${subtemas.map((l, indiceLeccion) => {
                return `
                <li class="tema ${l.id === leccionActualId ? "activo" : ""}" data-leccion="${l.id}">
                  <span class="tema-indicador ${progresoCurso.completadas.includes(l.id) ? "completo" : "pendiente"}" aria-label="${progresoCurso.completadas.includes(l.id) ? "Completada" : "Pendiente"}">${progresoCurso.completadas.includes(l.id) ? "✓" : ""}</span>
                  <span class="tema-nombre">Subtema ${indiceLeccion + 1}: ${escaparHtml(l.nombre)}</span>
                </li>
              `;
              }).join("")}</ul>
            </div>
          `;
          }).join("")}</li>
        </ul>
      </div>
    `;
  }).join("") + `
    <div class="modulo ${leccionActualId === "evaluacion" || leccionActualId === "examen" ? "expandido" : ""}">
      <button class="modulo-titulo" data-toggle-modulo="evaluaciones">
        <span class="modulo-titulo-texto">
          <strong>Evaluaciones y examen</strong>
          <span class="modulo-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg></span>
        </span>
        <span class="modulo-barra-fila"><span class="modulo-barra"><i style="width:${progresoCurso.porcentaje}%"></i></span><span class="modulo-progreso">${progresoCurso.porcentaje}%</span></span>
      </button>
      <ul class="modulo-contenido">
        <li class="tema ${leccionActualId === "evaluacion" ? "activo" : ""}" data-evaluacion-tipo="evaluacion"><span class="tema-indicador pendiente"></span><span class="tema-nombre">Presentar evaluación</span></li>
        <li class="tema ${leccionActualId === "examen" ? "activo" : ""}" data-evaluacion-tipo="examen"><span class="tema-indicador pendiente"></span><span class="tema-nombre">Presentar examen final</span></li>
      </ul>
    </div>
  `;

  estructuraModulos.querySelectorAll('[data-leccion], [data-evaluacion-tipo]').forEach(item => {
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    if (item.classList.contains('activo')) item.setAttribute('aria-current', 'step');
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); item.click(); }
    });
  });
  filtrarEsquema();
  estructuraModulos.querySelectorAll("[data-leccion]").forEach((item) => {
    const bloqueada = !puedeAbrirLeccion(Number(item.dataset.leccion));
    item.setAttribute("aria-disabled", String(bloqueada));
    if (bloqueada) { item.title="Completa primero la unidad pendiente"; item.style.opacity="0.55"; }
    item.addEventListener("click", () => mostrarLeccion(Number(item.dataset.leccion)));
  });
  estructuraModulos.querySelectorAll("[data-evaluacion-tipo]").forEach((item) => {
    item.addEventListener("click", () => mostrarEvaluacion(item.dataset.evaluacionTipo));
  });
  estructuraModulos.querySelectorAll("[data-toggle-modulo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".modulo")?.classList.toggle("expandido");
    });
  });
  estructuraModulos.querySelectorAll("[data-toggle-tema]").forEach((btn) => {
    btn.addEventListener("click", () => btn.closest(".tema-grupo")?.classList.toggle("expandido"));
  });
}

async function mostrarLeccion(idLeccion) {
  if (verificarCierreCurso()) return;
  if (!curso || !contenidoTema || guardandoLeccion) return;
  if (!progresoCurso?.evaluacionInicialAprobada) {
    await mostrarEvaluacion("evaluacion");
    return;
  }

  const todasLecciones = obtenerTodasLecciones();
  const indice = todasLecciones.findIndex((leccion) => leccion.id === idLeccion);
  const leccion = todasLecciones[indice];

  if (!leccion) {
    mostrarEvaluacion();
    return;
  }

  if (!puedeAbrirLeccion(idLeccion)) {
    document.getElementById("lector-aviso-guardado").textContent = "Completa primero la unidad pendiente y pulsa Siguiente para guardar tu avance.";
    return;
  }
  detenerConsumo();
  document.getElementById("lector-aviso-guardado").textContent = "";
  leccionActualId = idLeccion;
  const solicitud = ++solicitudContenido;
  cargandoLeccion = true;
  leccionDisponible = false;
  actualizarEstadoNavegacion();
  contenidoTema.setAttribute("aria-busy", "true");
  contenidoTema.innerHTML = '<div class="lector-mensaje" role="status">Cargando subtema…</div>';
  let contenido;
  try {
    contenido = await lecciones.obtener(idLeccion);
  } catch (error) {
    if (solicitud !== solicitudContenido) return;
    cargandoLeccion = false;
    contenidoTema.innerHTML = '<div class="lector-mensaje" role="alert"><h1>No se pudo cargar el subtema</h1><p>Comprueba tu conexión e inténtalo de nuevo.</p><button id="lector-reintentar" class="btn btn-primario">Reintentar</button></div>';
    document.getElementById('lector-reintentar').addEventListener('click', () => mostrarLeccion(idLeccion));
    prepararVista();
    actualizarEstadoNavegacion();
    return;
  }
  if (solicitud !== solicitudContenido) return;
  cargandoLeccion = false;
  const informacion = escaparHtml(leccion.informacion || contenido?.cuerpo || "");
  const nombreLeccion = escaparHtml(leccion.nombre);
  // El recurso debe pertenecer exclusivamente a el subtema seleccionada.
  // No heredamos videos del módulo ni del tema para evitar que aparezcan en
  // todos los subtemas. Se aceptan las estructuras antiguas y nuevas.
  const recursoLeccion = leccion.url || leccion.video || leccion.mediaUrl || contenido?.url || contenido?.video || "";
  const urlMedia = obtenerUrlMediaSegura(recursoLeccion);
  const tipoMedia = reglaConsumoLeccion(leccion, contenido || {}).tipo;
  const temaActual = curso?.modulos?.flatMap((m) => m.temas || []).find((t) => (t.subtemas || []).some((s) => s.id === idLeccion));
  const moduloActual = curso?.modulos?.find((m) => (m.temas || []).some((t) => (t.subtemas || []).some((s) => s.id === idLeccion))) || null;
  // En la vista de un subtema solo se muestra el recurso propio de esa lección.
  // Los videos del módulo o del tema no se repiten en todos los subtemas.
  const portadaCurso = obtenerUrlMediaSegura(curso?.thumbnail);
  const marcoMedia = urlMedia
    ? tipoMedia === "video"
      ? `<video class="lector-media-recurso" src="${urlMedia}" controls preload="metadata" playsinline></video>`
      : tipoMedia === "documento"
        ? `<iframe class="lector-documento" src="${urlMedia}" title="Material de consulta" style="width:100%;min-height:420px"></iframe><button class="btn btn-secundario" type="button" data-descargar-material>Descargar material</button><p data-aviso-descarga role="status"></p>`
      : `<img class="lector-media-recurso" src="${urlMedia}" alt="Imagen de el subtema" loading="lazy" />`
    : "";

  contenidoTema.innerHTML = `
    <div class="lector-slide">
      <div class="lector-leccion-cabecera">
        <span class="lector-leccion-indice">SUBTEMA ${indice + 1} DE ${todasLecciones.length}</span>
        <h1>${nombreLeccion}</h1>
      </div>
      <div class="lector-slide-grid">
        <div class="lector-slide-texto">
          <article class="lector-articulo">
            <p class="lector-informacion-subtema">${informacion || "Este subtema todavía no tiene contenido disponible."}</p>

          </article>
        </div>
        <div class="lector-slide-media">
          ${marcoMedia}
        </div>
      </div>
    </div>
  `;
  leccionDisponible = Boolean(informacion || urlMedia);
  controlConsumo = crearControlConsumo({leccion, contenido: contenido || {}, raiz: contenidoTema,
    clave: claveConsumoLeccion(sesion.usuario().id, curso, leccion, contenido || {}),
    vigente: () => leccionActualId === idLeccion && !cursoCerrado && !cargandoLeccion,
    actualizar: actualizarEstadoNavegacion});
  prepararVista();
  if (leccionTopbar) leccionTopbar.textContent = leccion.nombre;



  actualizarContador();
  actualizarEstadoNavegacion();
  pintarEsquema();
}

async function avanzar() {
  if (verificarCierreCurso()) return;
  if (guardandoLeccion || cargandoLeccion || !leccionDisponible || !puedeCompletarActual()) return;
  const id = leccionActualId;
  if (!obtenerTodasLecciones().some(l => l.id === id)) return;
  guardandoLeccion = true;
  actualizarEstadoNavegacion();
  const aviso = document.getElementById("lector-aviso-guardado");
  aviso.textContent = "";
  try {
    if (!progresoCurso.completadas.includes(id)) {
      await progreso.completarLeccion(id, controlConsumo?.evidencia());
      progresoCurso.completadas.push(id);
    }
    normalizarProgreso();
    guardandoLeccion = false;
    siguienteLeccion();
  } catch (error) {
    aviso.textContent = error.message || "No se guardó tu avance. Inténtalo de nuevo.";
  } finally {
    guardandoLeccion = false;
    actualizarContador();
    actualizarEstadoNavegacion();
  }
}

function retroceder() {
  if (verificarCierreCurso()) return;
  if (guardandoLeccion || cargandoLeccion) return;
  if (leccionActualId === "evaluacion" || leccionActualId === "examen") {
    const todasLecciones = obtenerTodasLecciones();
    if (todasLecciones.length) mostrarLeccion(todasLecciones[todasLecciones.length - 1].id);
    return;
  }
  const todasLecciones = obtenerTodasLecciones();
  const indice = todasLecciones.findIndex((l) => l.id === leccionActualId);
  if (indice > 0) mostrarLeccion(todasLecciones[indice - 1].id);
}

async function mostrarEvaluacion(tipo = "evaluacion") {
  if (verificarCierreCurso()) return;
  if (!curso || !contenidoTema || guardandoLeccion) return;
  detenerConsumo();
  const solicitud = ++solicitudContenido;
  cargandoLeccion = false;
  leccionActualId = tipo === "examen" ? "examen" : "evaluacion";
  if (leccionTopbar) leccionTopbar.textContent = tipo === "examen" ? "Examen final" : "Evaluación";
  actualizarEstadoNavegacion();
  prepararVista();
  pintarEsquema();

  const esExamen = tipo === "examen";
  const todasLecciones = obtenerTodasLecciones();
  if (esExamen && !progresoCurso?.evaluacionInicialAprobada) {
    contenidoTema.innerHTML = `<div class="lector-aviso-examen"><span class="lector-leccion-indice">EVALUACIÓN PREVIA</span><h1>Primero aprueba la evaluación del curso</h1><p>Esta evaluación usa 5 preguntas del banco del Examen final y es necesaria antes de comenzar el contenido del curso.</p><button class="btn btn-primario" id="btn-ir-evaluacion-inicial">Presentar evaluación</button></div>`;
    document.getElementById("btn-ir-evaluacion-inicial")?.addEventListener("click", () => mostrarEvaluacion("evaluacion"));
    return;
  }
  const faltantes = todasLecciones.filter((leccion) => !progresoCurso.completadas.includes(leccion.id));
  if (esExamen && faltantes.length) {
    leccionActualId = "examen";
    btnAnterior.disabled = false;
    btnSiguiente.disabled = true;
    actualizarContador();
    contenidoTema.innerHTML = `
      <div class="lector-aviso-examen">
        <span class="lector-leccion-indice">EXAMEN FINAL</span>
        <h1>Completa el curso antes del examen</h1>
        <p>Aún tienes ${faltantes.length} subtema(s) pendientes. Termina todos los subtemas para habilitar el examen final.</p>
        <button class="btn btn-primario" id="btn-ir-pendiente">Continuar curso</button>
      </div>`;
    document.getElementById("btn-ir-pendiente")?.addEventListener("click", () => mostrarLeccion(faltantes[0].id));
    return;
  }

  leccionActualId = esExamen ? "examen" : "evaluacion";
  btnAnterior.disabled = false;
  btnSiguiente.disabled = true;
  actualizarContador();
  pintarEsquema();

  contenidoTema.innerHTML = '<div class="lector-mensaje" role="status">Cargando evaluación…</div>';
  let evalCurso;
  try {
    evalCurso = await evaluaciones.obtenerPorCursoTipo(idCurso, tipo);
  } catch (error) {
    if (solicitud !== solicitudContenido) return;
    contenidoTema.innerHTML = '<div class="lector-mensaje" role="alert"><h1>No se pudo cargar la evaluación</h1><button class="btn btn-primario" id="lector-reintentar">Reintentar</button></div>';
    document.getElementById('lector-reintentar').addEventListener('click', () => mostrarEvaluacion(tipo));
    return;
  }
  if (solicitud !== solicitudContenido) return;
  const titulo = esExamen ? "Examen final" : "Evaluación del curso";
  const etiqueta = esExamen ? "EXAMEN FINAL" : "EVALUACIÓN DEL CURSO";
  if (!evalCurso || !evalCurso.preguntas?.length) {
    contenidoTema.innerHTML = `
      <div class="lector-aviso-examen">
        <span class="lector-leccion-indice">${etiqueta}</span>
        <h1>${titulo} no disponible</h1>
        <p>Este curso todavía no tiene preguntas configuradas para esta etapa. Consulta al administrador.</p>
      </div>`;
    return;
  }

  const resumenCurso = !esExamen ? `
    <section class="lector-introduccion-curso">
      <span class="lector-leccion-indice">INFORMACIÓN DEL CURSO</span>
      <h2>${escaparHtml(curso.nombre)}</h2>
      <p>${escaparHtml(curso.descripcion || "En este curso aprenderás los fundamentos y procedimientos esenciales de seguridad.")}</p>
      <div class="lector-introduccion-datos">
        <span><strong>Duración:</strong> ${escaparHtml(curso.duracion || `${curso.horas || "—"} h`)}</span>
        <span><strong>Temas:</strong> ${curso.modulos?.length || 0}</span>
        <span><strong>Subtemas:</strong> ${obtenerTodasLecciones().length}</span>
      </div>
      <p class="lector-introduccion-nota">Antes de comenzar los subtemas debes aprobar esta evaluación del curso. Después podrás consultar toda la información de los temas y agregar imágenes o videos desde la administración.</p>
    </section>` : "";

  let indicePregunta = 0;
  const respuestas = {};
  const preguntas = evalCurso.preguntas;

  const renderizarPregunta = () => {
    const pregunta = preguntas[indicePregunta];
    const porcentaje = Math.round(((indicePregunta + 1) / preguntas.length) * 100);
    const marcada = respuestas[pregunta.id] || "";
    contenidoTema.innerHTML = `
      ${resumenCurso}
      <section class="evaluacion-pantalla-cicsa">
        <div class="evaluacion-pantalla-cabecera">
          <div class="evaluacion-pantalla-identidad">
            <span class="evaluacion-numero">${String(indicePregunta + 1).padStart(2, "0")}</span>
            <span class="evaluacion-contador">PREGUNTA ${indicePregunta + 1} DE ${preguntas.length}</span>
          </div>
          <span class="evaluacion-porcentaje">${porcentaje}%</span>
        </div>
        <div class="evaluacion-barra"><span style="width:${porcentaje}%"></span></div>
        <h2 class="evaluacion-pregunta-titulo">${escaparHtml(pregunta.enunciado)}</h2>
        <form id="form-pregunta-cicsa" class="evaluacion-form-pantalla">
          <div class="evaluacion-opciones">
            ${pregunta.opciones.filter(o => o.texto).map((opcion) => `
              <label class="evaluacion-opcion ${marcada === opcion.id ? "seleccionada" : ""}">
                <input type="radio" name="respuesta" value="${escaparHtml(opcion.id)}" ${marcada === opcion.id ? "checked" : ""} required>
                <span class="opcion-letra">${escaparHtml(opcion.id).toUpperCase()}</span>
                <span class="opcion-texto">${escaparHtml(opcion.texto)}</span>
              </label>
            `).join("")}
          </div>
          <p id="evaluacion-error" role="alert"></p>
          <div class="evaluacion-navegacion-cicsa">
            <button type="button" class="btn btn-secundario" id="btn-pregunta-anterior" ${indicePregunta === 0 ? "disabled" : ""}>← Anterior</button>
            <button type="submit" class="btn btn-primario">${indicePregunta === preguntas.length - 1 ? "Finalizar evaluación ✓" : "Siguiente →"}</button>
          </div>
        </form>
      </section>
    `;

    contenidoTema.querySelectorAll('input[name="respuesta"]').forEach((input) => {
      input.addEventListener("change", () => {
        contenidoTema.querySelectorAll(".evaluacion-opcion").forEach((op) => op.classList.remove("seleccionada"));
        input.closest(".evaluacion-opcion")?.classList.add("seleccionada");
      });
    });

    document.getElementById("btn-pregunta-anterior")?.addEventListener("click", () => {
      if (indicePregunta > 0) { indicePregunta--; renderizarPregunta(); }
    });

    document.getElementById("form-pregunta-cicsa")?.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const seleccionada = evento.target.querySelector('input[name="respuesta"]:checked');
      const error = document.getElementById("evaluacion-error");
      if (!seleccionada) { error.textContent = "Selecciona una respuesta para continuar."; return; }
      respuestas[pregunta.id] = seleccionada.value;
      if (indicePregunta < preguntas.length - 1) { indicePregunta++; renderizarPregunta(); return; }
      const boton = evento.target.querySelector('button[type="submit"]');
      boton.disabled = true;
      try {
        if (verificarCierreCurso()) return;
        const resultado = await evaluaciones.enviarIntento(idCurso, respuestas, tipo);
        if (solicitud === solicitudContenido) mostrarResultadoEvaluacion(resultado, evalCurso.minimaAprobatoria, tipo);
      } catch (errorEnvio) {
        error.textContent = "No se pudieron enviar tus respuestas. Inténtalo de nuevo.";
        boton.disabled = false;
      }
    });
  };

  renderizarPregunta();
}

function mostrarResultadoEvaluacion(resultado, minima, tipo = "examen") {
  if (resultado.aprobado && progresoCurso) {
    if (tipo === "evaluacion") progresoCurso.evaluacionInicialAprobada = true;
    else {
      progresoCurso.examenAprobado = true;
      progresoCurso.estado = "completado";
    }
  }
  actualizarContador();
  actualizarEstadoNavegacion();
  pintarEsquema();
  contenidoTema.innerHTML = `
    <section class="resultado-evaluacion-cicsa">
      <div class="resultado-icono">${resultado.aprobado ? "✓" : "!"}</div>
      <span class="evaluacion-etiqueta">${tipo === "examen" ? "RESULTADO DEL EXAMEN FINAL" : "RESULTADO DE LA EVALUACIÓN DEL CURSO"}</span>
      <div class="resultado-nota">${resultado.nota}%</div>
      <p><span class="badge ${resultado.aprobado ? "badge-exito" : "badge-error"}">${resultado.aprobado ? "Aprobado" : "No aprobado"}</span></p>
      <p class="resultado-detalle">Respondiste correctamente ${resultado.correctas} de ${resultado.total} preguntas. Calificación mínima requerida: ${minima}%.</p>
      ${resultado.aprobado && tipo === "examen" ? `<div class="lector-certificado">
        <strong>Certificado obtenido</strong>
        <span>Has aprobado ${escaparHtml(curso.nombre)}. Tu constancia ya está disponible.</span>
        <button class="btn btn-primario lector-descargar-certificado" id="btn-descargar-certificado" type="button">Descargar certificado</button>
      </div>` : ""}
      <div class="resultado-acciones">
        <button class="btn btn-secundario" id="btn-volver-dashboard-2">Volver a mis cursos</button>
        ${tipo === "evaluacion" && resultado.aprobado ? `<button class="btn btn-primario" id="btn-comenzar-curso">Comenzar curso</button>` : ""}
        ${!resultado.aprobado ? `<button class="btn btn-primario" id="btn-reintentar">Reintentar ${tipo === "examen" ? "examen" : "evaluación"}</button>` : ""}
      </div>
    </section>
  `;
  document.getElementById("btn-volver-dashboard-2")?.addEventListener("click", () => (window.location.href = "dashboard.html"));
  document.getElementById("btn-comenzar-curso")?.addEventListener("click", () => {
    const primeraPendiente = obtenerTodasLecciones().find((leccion) => !progresoCurso.completadas.includes(leccion.id));
    if (primeraPendiente) mostrarLeccion(primeraPendiente.id);
    else mostrarEvaluacion("examen");
  });
  document.getElementById("btn-reintentar")?.addEventListener("click", () => mostrarEvaluacion(tipo));
  document.getElementById("btn-descargar-certificado")?.addEventListener("click", () => imprimirCertificado(resultado));
}

function imprimirCertificado(resultado) {
  const usuario = sesion.usuario();
  const nombreUsuario = escaparHtml(usuario?.nombre || "Trabajador");
  const nombreCurso = escaparHtml(curso?.nombre || "Curso de capacitación");
  const fecha = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const ventana = window.open("", "_blank", "width=1000,height=720");
  if (!ventana) {
    window.alert("Permite las ventanas emergentes para descargar tu certificado.");
    return;
  }

  ventana.document.write(`<!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Certificado - ${nombreCurso}</title>
        <style>
          body { margin: 0; padding: 32px; background: #eef1f3; font-family: "Segoe UI", Arial, sans-serif; color: #263238; }
          .certificado { max-width: 860px; margin: 0 auto; padding: 70px 64px; border: 12px solid #263238; background: #fff; text-align: center; box-shadow: 0 12px 30px rgba(38,50,56,.16); }
          .marca { color: #c62828; font-size: 20px; font-weight: 800; letter-spacing: .15em; }
          h1 { margin: 32px 0 8px; color: #263238; font-size: 40px; }
          .subtitulo { color: #68737b; font-size: 16px; }
          .nombre { margin: 36px 0 12px; color: #c62828; font-size: 30px; font-weight: 700; }
          .curso { font-size: 22px; font-weight: 700; }
          .detalle { margin-top: 30px; color: #68737b; line-height: 1.7; }
          .firma { margin-top: 54px; padding-top: 12px; border-top: 1px solid #aeb7bc; color: #68737b; font-size: 13px; }
          @media print { body { padding: 0; background: #fff; } .certificado { box-shadow: none; } }
        </style>
      </head>
      <body>
        <main class="certificado">
          <div class="marca">CICSA CAPACITA</div>
          <h1>Certificado de finalización</h1>
          <div class="subtitulo">Se reconoce que</div>
          <div class="nombre">${nombreUsuario}</div>
          <div class="subtitulo">ha aprobado satisfactoriamente el curso</div>
          <div class="curso">${nombreCurso}</div>
          <div class="detalle">Calificación obtenida: <strong>${resultado.nota}%</strong><br>Fecha de emisión: ${fecha}</div>
          <div class="firma">Plataforma de capacitación CICSA · Ciudad del Carmen, Campeche</div>
        </main>
        <script>window.addEventListener("load", () => { window.print(); });<\/script>
      </body>
    </html>`);
  ventana.document.close();
}

// ---------------------------------------------------------------
// Búsqueda dentro del esquema del curso
// ---------------------------------------------------------------
document.querySelector(".lector-buscador input")?.addEventListener("input", (evento) => {
  const consulta = evento.target.value.trim().toLowerCase();
  document.querySelectorAll("#estructura-modulos .tema").forEach((tema) => {
    tema.hidden = Boolean(consulta) && !tema.textContent.toLowerCase().includes(consulta);
  });
  document.querySelectorAll("#estructura-modulos .tema-grupo").forEach((grupo) => {
    const visibles = [...grupo.querySelectorAll(".tema")].some((tema) => !tema.hidden);
    grupo.hidden = Boolean(consulta) && !visibles;
  });
});

function actualizarEstadoSidebar() {
  const lector = document.querySelector(".lector-curso");
  if (!lector || !btnToggleSidebar) return;

  const oculto = lector.classList.contains("sidebar-oculto");
  const icono = oculto
    ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" /></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" /></svg>';

  btnToggleSidebar.innerHTML = icono;
  btnToggleSidebar.setAttribute("aria-expanded", String(!oculto));
  btnToggleSidebar.setAttribute("aria-label", oculto ? "Mostrar menú del curso" : "Ocultar menú del curso");
  btnToggleSidebar.title = oculto ? "Mostrar menú del curso" : "Ocultar menú del curso";
}

btnAnterior?.addEventListener("click", retroceder);
btnSiguiente?.addEventListener("click", avanzar);
document.querySelector('.lector-buscador input')?.addEventListener('input', filtrarEsquema);
btnVolver?.addEventListener("click", () => (window.location.href = "dashboard.html"));
btnToggleSidebar?.addEventListener("click", () => {
  const lector = document.querySelector(".lector-curso");
  if (!lector) return;
  const oculto = lector.classList.toggle("sidebar-oculto");
  btnToggleSidebar.setAttribute("aria-expanded", String(!oculto));
  btnToggleSidebar.setAttribute("aria-label", oculto ? "Mostrar menú del curso" : "Ocultar menú del curso");
  btnToggleSidebar.title = oculto ? "Mostrar menú del curso" : "Ocultar menú del curso";
  btnToggleSidebar.innerHTML = oculto
    ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" /></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" /></svg>';
});

async function iniciar() {
  if (!contenidoTema) return;

  if (!Number.isFinite(idCurso) || idCurso <= 0) {
    contenidoTema.innerHTML = `<h1>Curso no encontrado</h1><p>No se indicó un curso válido.</p>`;
    return;
  }

  try {
    curso = await cursos.obtener(idCurso);
    if (!curso) {
      contenidoTema.innerHTML = `<h1>Curso no disponible</h1><p>Este curso no está disponible en este momento.</p>`;
      return;
    }

    const misCursos = await progreso.misCursos();
    progresoCurso = (misCursos.find((m) => m.curso.id === idCurso) || {}).progreso || { porcentaje: 0, completadas: [] };

    if (tituloCurso) tituloCurso.textContent = curso.nombre;
    if (tituloTopbar) tituloTopbar.textContent = curso.nombre;
    if (cursoCategoria) cursoCategoria.textContent = curso.categoria || "General";
    if (cursoDuracion) cursoDuracion.textContent = `Duración ${curso.duracion || `${curso.horas || "—"} h`}`;
    iniciarTemporizadorCurso();
    if (cursoEstado) cursoEstado.textContent = progresoCurso.estado === "completado" ? "Completado" : "En progreso";

    const todasLecciones = obtenerTodasLecciones();
    normalizarProgreso();
    if (!progresoCurso.evaluacionInicialAprobada) {
      await mostrarEvaluacion("evaluacion");
      return;
    }
    const siguiente = todasLecciones.find((leccion) => !progresoCurso.completadas.includes(leccion.id));
    if (cursoListoParaExamen()) {
      mostrarEvaluacion("examen");
      return;
    }
    if (todasLecciones.length) {
      await mostrarLeccion((siguiente || todasLecciones[0]).id);
    } else {
      mostrarEvaluacion("examen");
    }
  } catch (error) {
    contenidoTema.innerHTML = `<h1>Error</h1><p>No se pudo cargar el contenido del curso.</p>`;
    console.error(error);
  }
}

configurarAlturaViewport();
window.addEventListener("resize", configurarAlturaViewport);
window.addEventListener("orientationchange", configurarAlturaViewport);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", configurarAlturaViewport);
}

configurarSeparador();
actualizarEstadoSidebar();
iniciar();
