// solicitudes.js — Solicitudes y cambio de contraseña para administradores

function pintarSolicitudes() {
  const cuerpo = document.getElementById("tabla-solicitudes");
  if (!cuerpo) return;
  const consulta = document.getElementById("buscar-solicitudes")?.value.trim().toLowerCase() || "";
  const trabajadores = listaUsuarios
    .filter(() => permisos.tiene("password"))
    .filter((usuario) => !consulta || [usuario.nombre, usuario.correo].some((valor) => String(valor || "").toLowerCase().includes(consulta)))
    .sort((a, b) => {
      const solicitudA = listaSolicitudes.find((item) => item.usuarioId === a.id && item.estado === "pendiente");
      const solicitudB = listaSolicitudes.find((item) => item.usuarioId === b.id && item.estado === "pendiente");
      if (Boolean(solicitudA) !== Boolean(solicitudB)) return solicitudA ? -1 : 1;
      if (solicitudA && solicitudB) return new Date(solicitudB.fecha || 0) - new Date(solicitudA.fecha || 0);
      return a.nombre.localeCompare(b.nombre, "es");
    });

  cuerpo.innerHTML = trabajadores.map((usuario) => {
    const solicitud = listaSolicitudes.find((item) => item.usuarioId === usuario.id && item.estado === "pendiente");
    return `<tr class="${solicitud ? "fila-solicitud-prioritaria" : ""}" data-fila-solicitud="${usuario.id}">
      <td><strong>${escaparHtml(usuario.nombre)}</strong><br><small>${escaparHtml(usuario.correo)}</small></td>
      <td>${solicitud ? `<span class="badge badge-proceso">Pendiente · ${formatoFecha(solicitud.fecha)}</span>` : '<span class="muted">Sin solicitud</span>'}</td>
      <td>
        <div class="password-display">
          <span class="password-display-icon" aria-hidden="true">•••</span>
          <code data-password-actual="${usuario.id}">••••••••</code>
          <button type="button" class="password-toggle" data-ver-password="${usuario.id}" data-password="${escaparHtml(usuario.password || "")}" aria-label="Mostrar contraseña actual de ${escaparHtml(usuario.nombre)}" aria-pressed="false">Mostrar</button>
        </div>
      </td>
      <td>
        <label class="password-editor">
          <span class="password-editor-icon" aria-hidden="true">⌁</span>
          <input type="password" class="password-admin-input" data-nueva-password="${usuario.id}" placeholder="Nueva contraseña" autocomplete="new-password" aria-label="Nueva contraseña para ${escaparHtml(usuario.nombre)}">
        </label>
      </td>
      <td><button class="btn btn-primario btn-sm password-save" data-cambiar-password="${usuario.id}" data-solicitud="${solicitud?.id || ""}">${solicitud ? "Resolver y guardar" : "Actualizar"}</button></td>
    </tr>`;
  }).join("") || '<tr><td colspan="5" class="muted" style="text-align:center; padding:20px;">No se encontraron trabajadores.</td></tr>';

  cuerpo.querySelectorAll("[data-ver-password]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const idUsuario = boton.dataset.verPassword;
      const campo = cuerpo.querySelector(`[data-password-actual="${idUsuario}"]`);
      const visible = boton.getAttribute("aria-pressed") === "true";
      campo.textContent = visible ? "••••••••" : boton.dataset.password || "—";
      boton.textContent = visible ? "Mostrar" : "Ocultar";
      boton.setAttribute("aria-pressed", String(!visible));
    });
  });
  cuerpo.querySelectorAll("[data-cambiar-password]").forEach((boton) => {
    boton.addEventListener("click", async () => {
      const idUsuario = Number(boton.dataset.cambiarPassword);
      const input = cuerpo.querySelector(`[data-nueva-password="${idUsuario}"]`);
      const nueva = input.value.trim();
      if (!nueva) { input.focus(); return; }
      boton.disabled = true;
      try {
        if (boton.dataset.solicitud) await solicitudesReset.resolver(Number(boton.dataset.solicitud), nueva);
        else await usuarios.cambiarPassword(idUsuario, nueva);
        mostrarToastAdmin(boton.dataset.solicitud ? "Solicitud atendida y contraseña actualizada." : "Contraseña actualizada correctamente.", "exito");
        await cargarTodo();
      } catch (error) {
        mostrarToastAdmin(error.message || "No se pudo actualizar la contraseña.", "error");
        boton.disabled = false;
      }
    });
  });
}

document.getElementById("buscar-solicitudes")?.addEventListener("input", pintarSolicitudes);
