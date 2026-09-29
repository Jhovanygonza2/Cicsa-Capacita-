// Perfil de la cuenta y detalle académico del trabajador.
let solicitudPerfil = 0;
let origenPerfil = null;

function pintarIdentidadPerfil(usuario) {
  const nombre = usuario.nombre || 'Perfil de usuario';
  document.getElementById('perfil-trabajador-titulo').textContent = nombre;
  document.getElementById('perfil-trabajador-correo').textContent = usuario.correo || '';
  document.getElementById('perfil-trabajador-area').textContent = `Área: ${usuario.area || 'Sin asignar'}`;
  document.getElementById('perfil-trabajador-iniciales').textContent = nombre.trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase();
}

async function abrirPerfilTrabajador(id, origen) {
  const modal = document.getElementById('modal-perfil-trabajador');
  if (!modal) return;
  const solicitud = ++solicitudPerfil;
  if (modal.hidden) origenPerfil = origen || document.activeElement;
  const usuario = listaUsuarios.find(u => Number(u.id) === Number(id));
  pintarIdentidadPerfil(usuario || {});
  const estado = document.getElementById('perfil-trabajador-estado');
  const reintentar = document.getElementById('perfil-trabajador-reintentar');
  const bloques = modal.querySelectorAll('.perfil-trabajador-metricas, .perfil-trabajador-seccion');
  bloques.forEach(bloque => bloque.hidden = true);
  estado.textContent = 'Cargando perfil…';
  reintentar.hidden = true;
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  modal.setAttribute('aria-busy', 'true');
  document.body.classList.add('admin-modal-abierto');
  modal.querySelector('.perfil-trabajador-cerrar').focus();

  // El informe académico corresponde a trabajadores; las cuentas administrativas
  // conservan su perfil de identidad sin solicitar un informe que no les aplica.
  if (usuario?.rol !== 'trabajador') {
    document.getElementById('perfil-trabajador-etiqueta').textContent = 'Cuenta administrativa';
    estado.textContent = `Administrador · ${usuario.activo ? 'Cuenta activa' : 'Cuenta desactivada'}. El seguimiento académico corresponde a las cuentas de trabajador.`;
    modal.setAttribute('aria-busy', 'false');
    return;
  }
  document.getElementById('perfil-trabajador-etiqueta').textContent = 'Perfil de capacitación';
  try {
    const data = await reportes.perfilTrabajador(Number(id));
    if (solicitud !== solicitudPerfil || modal.hidden) return;
    pintarIdentidadPerfil(data.usuario || usuario || {});
    document.getElementById('perfil-trabajador-avance').textContent = `${data.avanceGeneral || 0}%`;
    document.getElementById('perfil-trabajador-horas').textContent = `${data.horasHechas || 0} h`;
    document.getElementById('perfil-trabajador-cursos').textContent = `${data.cursosCompletados || 0}/${data.cursosTotal || 0}`;
    document.getElementById('perfil-trabajador-promedio').textContent = data.promedio == null ? '—' : `${data.promedio}%`;
    document.getElementById('perfil-trabajador-insignias').innerHTML = (data.insignias || []).map(x => `<span class="badge badge-exito">🏅 ${escaparHtml(x)}</span>`).join('') || '<span class="muted">Aún no tiene insignias.</span>';
    document.getElementById('perfil-trabajador-cursos-lista').innerHTML = (data.cursos || []).map(c => `<div class="perfil-curso-fila"><div><strong>${escaparHtml(c.nombre)}</strong><small>${c.completado ? 'Completado' : 'En progreso'}</small><small>Fecha de inicio del curso: ${escaparHtml(formatearFechaInicioCurso(c.fechaInicio))}</small>${c.reapertura ? "<small>Nuevo acceso hasta: " + escaparHtml(formatoFecha(c.reapertura.fin)) + "</small>" : ""}
${permisos.tiene("asignarCursos") ? '<button type="button" class="btn btn-secundario btn-sm" data-reabrir-curso="' + c.id + '">Autorizar repetir curso</button>' : ""}</div><div><strong>${c.porcentaje || 0}%</strong>${c.calificacion != null ? `<small>Examen: ${c.calificacion}%</small>` : ''}</div></div>`).join('') || '<p class="muted">No hay cursos asignados.</p>';
    document.querySelectorAll("[data-reabrir-curso]").forEach(boton => boton.addEventListener("click", () => ejecutarAccionAdmin(boton, async () => {
      if (!await confirmarAdmin("¿Autorizar una nueva oportunidad para este trabajador? Comenzará desde la evaluación del curso y tendrá las horas del curso desde este momento. Se conservará el historial anterior.")) return;
      await progreso.reabrir(Number(boton.dataset.reabrirCurso), Number(id));
      mostrarToastAdmin("Nueva oportunidad autorizada para este trabajador.", "exito");
      await abrirPerfilTrabajador(id);
      await cargarTodo();
    })));
    bloques.forEach(bloque => bloque.hidden = false);
    estado.textContent = '';
  } catch (error) {
    if (solicitud !== solicitudPerfil || modal.hidden) return;
    estado.textContent = error.message || 'No se pudo cargar el perfil. Inténtalo de nuevo.';
    reintentar.hidden = false;
    reintentar.onclick = () => abrirPerfilTrabajador(id);
  } finally {
    if (solicitud === solicitudPerfil) modal.setAttribute('aria-busy', 'false');
  }
}

function cerrarPerfilTrabajador() {
  const modal = document.getElementById('modal-perfil-trabajador');
  if (!modal || modal.hidden) return;
  ++solicitudPerfil;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('aria-busy', 'false');
  document.body.classList.remove('admin-modal-abierto');
  if (origenPerfil?.isConnected) origenPerfil.focus({ preventScroll: true });
  origenPerfil = null;
}
document.querySelectorAll('[data-cerrar-perfil-trabajador]').forEach(boton => boton.addEventListener('click', cerrarPerfilTrabajador));
document.addEventListener('keydown', event => {
  const modal = document.getElementById('modal-perfil-trabajador');
  if (!modal || modal.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); cerrarPerfilTrabajador(); }
  if (event.key !== 'Tab') return;
  const controles = [...modal.querySelectorAll('button, a[href], input, select')].filter(el => !el.disabled && el.getClientRects().length);
  const primero = controles[0], ultimo = controles[controles.length - 1];
  if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo.focus(); }
  else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero.focus(); }
});
