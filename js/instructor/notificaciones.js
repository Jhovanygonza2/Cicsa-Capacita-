// Centro de notificaciones del Instructor: autorizaciones, rechazos y comentarios.
(() => {
  const lista = document.getElementById("lista-notificaciones-instructor");
  const badge = document.getElementById("badge-notificaciones-instructor");
  if (!lista || !badge) return;
  const escapar = (valor) => String(valor ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  const fecha = (valor) => valor ? new Date(valor).toLocaleString("es-MX", {dateStyle:"medium", timeStyle:"short"}) : "";
  const cargar = async () => {
    try {
      const avisos = await notificacionesAdmin.listar();
      const propios = (Array.isArray(avisos) ? avisos : []).filter(n => ["curso-aprobado", "curso-rechazado", "curso-observado", "curso-autorizado"].includes(n.tipo));
      badge.textContent = String(propios.filter(n => !n.leida).length);
      badge.hidden = !propios.some(n => !n.leida);
      lista.innerHTML = propios.length ? propios.map(n => {
        const titulo = n.tipo === "curso-aprobado" ? "Curso autorizado" : n.tipo === "curso-rechazado" ? "Curso rechazado" : n.tipo === "curso-observado" ? "Curso con observaciones" : "Actualización de curso";
        const curso = n.curso?.nombre || "Curso";
        const comentario = n.comentario ? `<p><strong>Comentario del revisor:</strong> ${escapar(n.comentario)}</p>` : "";
        return `<article class="tarjeta notificacion-admin-nueva"><div class="notificacion-admin-contenido"><strong>${escapar(titulo)}: ${escapar(curso)}</strong><small>${escapar(fecha(n.fecha))}</small><p>${escapar(n.detalle || "Consulta el estado de tu solicitud.")}</p>${comentario}</div><button type="button" class="btn btn-secundario btn-sm" data-quitar-notificacion="${escapar(n.id)}">Quitar</button></article>`;
      }).join("") : '<div class="estado-vacio-admin"><strong>No tienes notificaciones nuevas.</strong><span>Las autorizaciones, rechazos y comentarios aparecerán aquí.</span></div>';
    } catch (error) {
      lista.innerHTML = '<div class="estado-vacio-admin"><strong>No se pudieron cargar las notificaciones.</strong><span>Actualiza la página e intenta nuevamente.</span></div>';
    }
  };
  lista.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-quitar-notificacion]");
    if (!boton) return;
    boton.disabled = true;
    try { await notificacionesAdmin.eliminar(boton.dataset.quitarNotificacion); await cargar(); }
    catch (error) { boton.disabled = false; }
  });
  cargar();
  window.addEventListener("focus", cargar);
})();
