(() => {
if (!sesion.requerir(["trabajador", "instructor", "admin", "superadmin"])) return;
sesion.vigilarInactividad(20);
const usuario = sesion.usuario();
const $ = id => document.getElementById(id);
const esc = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const estados = { pendiente:"Pendiente", en_atencion:"En atención", resuelto:"Resuelto" };
const tipos = { acceso:"Acceso", password:"Contraseña", curso:"Contenido del curso", evaluacion:"Evaluación", certificado:"Certificado", repetir:"Repetir curso", otro:"Otro problema" };
let tickets = [];
let cargando = false;
$("soporte-demo").hidden = !MOCK_MODE;
$("soporte-identidad").textContent = usuario.nombre + " · " + (usuario.correo || "");
if (usuario.rol !== "trabajador") {
  $("soporte-volver").href = "../admin/dashboard.html";
  $("soporte-volver-texto").textContent = "Volver al panel";
}
if (["admin", "superadmin"].includes(usuario.rol)) $("soporte-titulo-lista").textContent = "Solicitudes de soporte";
if (usuario.rol === "instructor") {
  $("soporte-volver").href = "inicio.html";
  $("soporte-volver-texto").textContent = "Volver a Inicio";
}
function pintar() {
  $("soporte-total-pendiente").textContent = tickets.filter(t => t.estado === "pendiente").length;
  $("soporte-total-atencion").textContent = tickets.filter(t => t.estado === "en_atencion").length;
  $("soporte-total-resuelto").textContent = tickets.filter(t => t.estado === "resuelto").length;
  const filtro = $("soporte-filtro").value;
  const visibles = tickets.filter(t => !filtro || t.estado === filtro);
  $("soporte-lista").innerHTML = visibles.map(t => {
    const opciones = Object.entries(estados).map(([valor,texto]) => '<option value="' + valor + '"' + (t.estado===valor?' selected':'') + '>' + texto + '</option>').join("");
    return '<article class="soporte-solicitud"><div class="soporte-lista-cabecera"><strong>#' + t.id + ' · ' + esc(tipos[t.tipo] || t.tipo) + '</strong><span class="soporte-estado estado-' + esc(t.estado) + '">' + esc(estados[t.estado] || t.estado) + '</span></div><small>' + esc(t.nombre) + ' · ' + esc(new Date(t.fecha).toLocaleString("es-MX")) + '</small>' + (t.curso?'<p><strong>Curso:</strong> '+esc(t.curso)+'</p>':'') + '<p class="soporte-texto">' + esc(t.descripcion) + '</p>' +
      (t.captura?'<details><summary>Ver captura adjunta</summary><img class="soporte-adjunto" src="' + esc(t.captura) + '" alt="Captura adjunta a la solicitud ' + t.id + '"></details>':'') +
      (t.soloSuperadmin?'<p class="soporte-destino">Atención: súper administrador.</p>':'') +
      (t.respuesta?'<div class="soporte-respuesta"><strong>Respuesta de soporte</strong><p class="soporte-texto">'+esc(t.respuesta)+'</p></div>':'') +
      (t.puedeAtender?'<form data-atender="'+t.id+'"><label for="estado-'+t.id+'">Estado de atención</label><select id="estado-'+t.id+'" name="estado">'+opciones+'</select><label for="respuesta-'+t.id+'">Respuesta al usuario</label><textarea id="respuesta-'+t.id+'" name="respuesta" maxlength="3000" rows="3">'+esc(t.respuesta || "")+'</textarea>' +
      (t.tipo==="repetir"?'<small>Autoriza el nuevo intento desde Usuarios → Ver perfil → Autorizar repetir curso. Marcar como resuelto no reabre el curso.</small>':t.tipo==="password"?'<small>Gestiona el restablecimiento desde Solicitudes y contraseñas. No escribas contraseñas en la respuesta.</small>':'') +
      '<button class="btn btn-secundario btn-sm" type="submit">Guardar atención</button><p role="status"></p></form>':'') + '</article>';
  }).join("") || '<div class="soporte-vacio"><span class="soporte-vacio-icono"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4V4Zm0 10h5l2 3h2l2-3h5M8 8h8M8 11h5"/></svg></span><strong>' + (tickets.length ? "No hay solicitudes con este estado" : "Tu seguimiento comienza aquí") + '</strong><p>' + (tickets.length ? "Selecciona otro estado para consultar tus solicitudes." : "Cuando envíes una solicitud, podrás ver aquí su estado y la respuesta de soporte.") + '</p></div>';
  $("soporte-lista").querySelectorAll("[data-atender]").forEach(form => form.addEventListener("submit", async e => {
    e.preventDefault();
    const boton = form.querySelector("button");
    if (boton.disabled) return;
    boton.disabled = true;
    try {
      await soporte.actualizar(Number(form.dataset.atender), {estado:form.elements.estado.value,respuesta:form.elements.respuesta.value});
      await cargar();
    } catch (error) { form.querySelector('[role="status"]').textContent = error.message; }
    finally { boton.disabled = false; }
  }));
}
async function cargar() {
  if (cargando) return;
  cargando = true;
  $("soporte-lista").setAttribute("aria-busy", "true");
  $("soporte-actualizar").disabled = true;
  try { tickets = await soporte.listar(); pintar(); $("soporte-error").textContent = ""; }
  catch(error) { $("soporte-error").textContent = error.message || "No se pudieron cargar las solicitudes."; }
  finally { cargando=false; $("soporte-actualizar").disabled=false; $("soporte-lista").setAttribute("aria-busy", "false"); }
}
$("form-soporte").addEventListener("submit", async e => {
  e.preventDefault();
  const boton = e.target.querySelector('[type="submit"]');
  if (boton.disabled) return;
  boton.disabled = true;
  $("soporte-envio").textContent = "Guardando solicitud…";
  try {
    const datos = {tipo:$("soporte-tipo").value,cursoId:$("soporte-curso").value || null,descripcion:$("soporte-descripcion").value,captura:""};
    const file = $("soporte-captura").files[0];
    if (file) {
      if (!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size>2*1024*1024) throw new Error("Selecciona una imagen PNG, JPG o WEBP de hasta 2 MB.");
      datos.captura = await new Promise((resolve,reject) => {
        const reader = new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(new Error("No se pudo leer la captura.")); reader.readAsDataURL(file);
      });
    }
    const ticket = await soporte.crear(datos);
    e.target.reset();
    $("soporte-filtro").value = "";
    $("soporte-envio").textContent = "Solicitud #" + ticket.id + " registrada. Consulta su estado y respuesta en esta página.";
    await cargar();
  } catch(error) { $("soporte-envio").textContent = error.message || "No se pudo registrar la solicitud."; }
  finally { boton.disabled=false; }
});
$("soporte-filtro").addEventListener("change", pintar);
$("soporte-actualizar").addEventListener("click", cargar);
window.addEventListener("focus", cargar);
window.addEventListener("storage", e => { if (e.key==="cicsa_soporte" || e.key===null) cargar(); });
async function cargarCursos() {
  try {
    const lista = usuario.rol==="trabajador" ? (await progreso.misCursos()).map(x=>x.curso) : await cursos.listar();
    lista.forEach(c => { const option=document.createElement("option"); option.value=c.id; option.textContent=c.nombre; $("soporte-curso").append(option); });
  } catch { $("soporte-envio").textContent = "No se pudo cargar la lista de cursos. Recarga para asociar un curso."; }
}
cargarCursos();
cargar();
})();
