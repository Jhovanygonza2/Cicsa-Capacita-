// examenes.js — Editor del banco de preguntas del Examen final

function normalizarEvaluacionAdmin(valor) {
  return valor && Array.isArray(valor.preguntas)
    ? { minimaAprobatoria: Number(valor.minimaAprobatoria ?? 70), preguntas: valor.preguntas }
    : { minimaAprobatoria: 70, preguntas: [] };
}

async function administrarExamen(idCurso, opciones = {}) {
  permisos.exigir(idCurso ? "editarCursos" : "crearCursos");
  if (guardandoCursoAdmin) return;
  const volverAContenido = modalContenidoCurso && !modalContenidoCurso.hidden;
  const origen = document.activeElement;
  cerrarContenidoCurso();
  const curso = listaCursos.find((c) => String(c.id) === String(idCurso));
  const tipo = opciones.tipo === "evaluacion" ? "evaluacion" : "examen";
  const maxPreguntas = tipo === "examen" ? 25 : 5;
  const minPreguntas = tipo === "examen" ? 5 : 1;
  let actual = normalizarEvaluacionAdmin(opciones.evaluacion);
  if (idCurso && !opciones.evaluacion) {
    actual = normalizarEvaluacionAdmin(await evaluaciones.obtenerPorCursoTipo(idCurso, tipo));
  }

  const etiqueta = tipo === "evaluacion" ? "Evaluación del curso" : "Examen final";
  const descripcion = tipo === "evaluacion"
    ? "La evaluación del curso se genera automáticamente desde el banco del examen final."
    : "Crea un banco de entre 5 y 25 preguntas. Para los trabajadores, las preguntas se mostrarán en orden aleatorio.";

  const modal = document.createElement("div");
  modal.className = "admin-examen-backdrop";
  modal.style.zIndex = "2147483647";
  modal.innerHTML = `
    <section class="admin-examen-card" role="dialog" aria-modal="true" aria-labelledby="titulo-editor-examen">
      <header class="admin-examen-cabecera">
        <div><span class="admin-bloque-kicker">${etiqueta}</span><h3 id="titulo-editor-examen">${escaparHtml(curso?.nombre || opciones.nombre || "Nuevo curso")}</h3><p class="muted">${descripcion}</p></div>
        <button type="button" class="admin-examen-cerrar" aria-label="Cerrar">×</button>
      </header>
      <form id="form-editor-examen">
        <div class="admin-examen-resumen">
          <label>Calificación mínima aprobatoria
            <input type="number" name="minima" min="0" max="100" value="${actual.minimaAprobatoria}" required>
          </label>
          <span><strong id="contador-preguntas">${actual.preguntas.length}</strong> / ${maxPreguntas} preguntas configuradas</span>
        </div>
        <div class="admin-examen-preguntas" id="editor-preguntas"></div>
        <button type="button" class="btn btn-secundario btn-sm" id="btn-nueva-pregunta">+ Agregar pregunta</button>
        ${tipo === "examen" ? '<p class="muted">El examen final admite un máximo de 25 preguntas. La Evaluación del curso tomará 5 de este mismo banco.</p>' : ''}
        <footer class="admin-examen-acciones">
          <button type="button" class="btn btn-secundario" data-cerrar-examen>Cancelar</button>
          <button type="submit" class="btn btn-primario">Guardar ${tipo}</button>
        </footer>
      </form>
    </section>`;

  const preguntas = modal.querySelector("#editor-preguntas");
  let indice = 0;
  const agregarPregunta = (pregunta = {}) => {
    const opcionesPregunta = pregunta.opciones || [];
    const id = pregunta.id || Date.now() + indice;
    const bloque = document.createElement("div");
    bloque.className = "admin-examen-pregunta";
    bloque.dataset.id = String(id);
    bloque.innerHTML = `
      <div class="admin-examen-pregunta-titulo"><strong>Pregunta ${indice + 1}</strong><button type="button" class="admin-examen-quitar">Quitar</button></div>
      <input class="examen-enunciado" type="text" placeholder="Escribe el enunciado de la pregunta" value="${escaparHtml(pregunta.enunciado || "")}" required>
      <div class="admin-examen-opciones">
        ${["a", "b", "c", "d"].map((letra, i) => `<label>Opción ${letra.toUpperCase()}<input class="examen-opcion" data-opcion="${letra}" type="text" value="${escaparHtml(opcionesPregunta[i]?.texto || "")}" ${i < 3 ? "required" : ""}></label>`).join("")}
      </div>
      <label class="examen-correcta">Respuesta correcta
        <select class="examen-correcta-select">
          ${["a", "b", "c", "d"].map((letra, i) => `<option value="${letra}" ${!opcionesPregunta[i]?.texto && letra === "d" ? "disabled" : ""}>Opción ${letra.toUpperCase()}</option>`).join("")}
        </select>
      </label>`;
    const correcta = bloque.querySelector(".examen-correcta-select");
    correcta.value = pregunta.correcta || "a";
    bloque.querySelector('[data-opcion="d"]').addEventListener("input", (evento) => {
      const vacia = !evento.target.value.trim();
      correcta.querySelector('option[value="d"]').disabled = vacia;
      if (vacia && correcta.value === "d") correcta.value = "a";
    });
    bloque.querySelector(".admin-examen-quitar").addEventListener("click", () => { bloque.remove(); actualizarContador(); renumerarPreguntas(); });
    preguntas.appendChild(bloque);
    indice += 1;
  };
  const actualizarContador = () => {
    const total = preguntas.children.length;
    modal.querySelector("#contador-preguntas").textContent = total;
    const botonNueva = modal.querySelector("#btn-nueva-pregunta");
    if (botonNueva) {
      botonNueva.disabled = total >= maxPreguntas;
      botonNueva.title = total >= maxPreguntas ? `Máximo ${maxPreguntas} preguntas` : "Agregar pregunta";
    }
  };
  const renumerarPreguntas = () => [...preguntas.children].forEach((b, i) => b.querySelector("strong").textContent = `Pregunta ${i + 1}`);
  actual.preguntas.slice(0, maxPreguntas).forEach(agregarPregunta);
  actualizarContador();
  modal.querySelector("#btn-nueva-pregunta").addEventListener("click", () => {
    if (preguntas.children.length >= maxPreguntas) {
      mostrarToastAdmin(`El ${tipo === "examen" ? "Examen final" : "editor"} admite máximo ${maxPreguntas} preguntas.`, "error");
      return;
    }
    agregarPregunta();
    actualizarContador();
  });
  let guardando = false;
  const teclado = (evento) => {
    if (evento.key === "Escape") { evento.preventDefault(); cerrar(); }
  };
  const cerrar = () => {
    if (guardando) return;
    document.removeEventListener("keydown", teclado);
    modal.remove();
    if (volverAContenido) abrirContenidoCurso();
    else document.body.classList.remove("admin-modal-abierto");
    if (origen?.isConnected) origen.focus();
  };
  document.addEventListener("keydown", teclado);
  modal.querySelectorAll("[data-cerrar-examen], .admin-examen-cerrar").forEach((btn) => btn.addEventListener("click", cerrar));
  modal.querySelector("#form-editor-examen").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const minimaAprobatoria = Number(new FormData(evento.target).get("minima"));
    const nuevasPreguntas = [...preguntas.children].map((bloque, i) => ({
      id: Number(bloque.dataset.id) || i + 1,
      enunciado: bloque.querySelector(".examen-enunciado").value.trim(),
      opciones: ["a", "b", "c", "d"].map((letra) => ({ id: letra, texto: bloque.querySelector(`[data-opcion="${letra}"]`).value.trim() })).filter((o) => o.texto),
      correcta: bloque.querySelector(".examen-correcta-select").value,
    }));
    if (nuevasPreguntas.length < minPreguntas) {
      mostrarToastAdmin(tipo === "examen" ? "El Examen final debe tener al menos 5 preguntas." : "Agrega al menos una pregunta.", "error");
      return;
    }
    if (nuevasPreguntas.length > maxPreguntas) {
      mostrarToastAdmin(`El Examen final admite máximo ${maxPreguntas} preguntas.`, "error");
      return;
    }
    const datos = { minimaAprobatoria, preguntas: nuevasPreguntas };
    if (nuevasPreguntas.some(p => !p.enunciado || !p.opciones.some(o => o.id === p.correcta))) {
      mostrarToastAdmin("Completa cada pregunta y selecciona una respuesta correcta con texto.", "error"); return;
    }
    const botonGuardar = evento.target.querySelector('[type="submit"]');
    await ejecutarAccionAdmin(botonGuardar, async () => {
    guardando = true;
    try {
    if (idCurso) await evaluaciones.actualizarTipo(idCurso, tipo, datos);
    if (tipo === "evaluacion") {
      evaluacionPendiente = datos;
    } else {
      examenPendiente = datos;
    }
    const botonEditor = document.getElementById(tipo === "evaluacion" ? "btn-agregar-evaluacion-estructura" : "btn-agregar-examen-estructura");
    if (botonEditor) botonEditor.textContent = tipo === "examen" ? "Editar examen final" : `Editar ${tipo}`;
    guardando = false;
    cerrar();
    mostrarToastAdmin(`${etiqueta} configurada con ${nuevasPreguntas.length} pregunta(s).`, "exito");
    } finally { guardando = false; }
    });
  });
  document.body.classList.add("admin-modal-abierto");
  document.body.appendChild(modal);
  modal.querySelector(".admin-examen-cerrar").focus();
}

// Se conserva este nombre para que el arranque del panel siga siendo compatible.
async function pintarExamenes() { return true; }
