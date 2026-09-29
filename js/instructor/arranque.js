// Carga únicamente los datos que corresponden al Instructor.
let cargaInstructorEnCurso = null;

async function cargarTodo() {
  if (cargaInstructorEnCurso) return cargaInstructorEnCurso;
  cargaInstructorEnCurso = cursos.listar()
    .then((cursosCargados) => {
      listaCursos = Array.isArray(cursosCargados) ? cursosCargados : [];
      pintarCursos();
      pintarMisSolicitudesCursos();
    })
    .catch((error) => {
      mostrarToastAdmin(error?.message || "No se pudieron cargar tus cursos.", "error");
      const cuerpo = document.getElementById("tabla-cursos-instructor");
      if (cuerpo) cuerpo.innerHTML = '<div class="estado-vacio-admin"><strong>No se pudieron cargar tus cursos.</strong><span>Actualiza la página e intenta nuevamente.</span></div>';
    })
    .finally(() => { cargaInstructorEnCurso = null; });
  return cargaInstructorEnCurso;
}

cargarTodo();
