// usuarios.js — Trabajadores registrados, alta individual e importación masiva
const rolesDisponibles = [
  { valor: "trabajador", etiqueta: "Trabajador" },
  { valor: "instructor", etiqueta: "Instructor" },
  ...(sesion.rol() === "superadmin" ? [{ valor: "admin", etiqueta: "Administrador" }, { valor: "superadmin", etiqueta: "Súper administrador" }] : []),
];

document.getElementById("nu-rol").innerHTML = opcionesRol("trabajador");

function opcionesRol(valorActual) {
  return rolesDisponibles.map((rol) => `<option value="${rol.valor}"${rol.valor === valorActual ? " selected" : ""}>${rol.etiqueta}</option>`).join("");
}

function pintarUsuarios() {
  const consulta = document.getElementById("buscar-usuarios")?.value.trim().toLowerCase() || "";
  const visibles = listaUsuarios.filter((u) => !consulta || [u.nombre,u.correo,u.rol,u.area].some(v => String(v||"").toLowerCase().includes(consulta)));
  const cuerpo = document.getElementById("tabla-usuarios");
  const estado = estadoDashboard.usuarios;
  estado.pagina = Math.min(estado.pagina, Math.max(1, Math.ceil(visibles.length / estado.porPagina)));
  const inicio = (estado.pagina - 1) * estado.porPagina;
  cuerpo.innerHTML = visibles.slice(inicio, inicio + estado.porPagina).map((u) => `
    <tr>
      <td><strong>${escaparHtml(u.nombre)}</strong><br><small>${escaparHtml(u.correo)}</small></td>
      <td>${escaparHtml(u.area || "Sin asignar")}</td>
      <td><select ${!permisos.gestionarUsuario(u) || u.id === sesion.usuario()?.id ? "disabled" : ""} class="select-rol-usuario" data-rol-usuario="${u.id}" aria-label="Rol de ${escaparHtml(u.nombre)}">${rolesDisponibles.some(r => r.valor === u.rol) ? opcionesRol(u.rol) : "<option>" + permisos.etiqueta(u.rol) + "</option>"}</select></td>
      <td>${u.activo ? '<span class="badge badge-exito">Activo</span>' : '<span class="badge badge-inactivo">Inactivo</span>'}</td>
      <td><button class="btn btn-secundario btn-sm" type="button" data-ver-avance="${u.id}">Ver perfil</button></td>
      <td><button ${!permisos.gestionarUsuario(u) || u.id === sesion.usuario()?.id ? "disabled" : ""} data-id="${u.id}" data-activo="${u.activo}" class="btn-toggle-usuario"><span class="punto-estado ${u.activo ? "verde" : "rojo"}"></span>${u.activo ? "Desactivar" : "Activar"}</button></td>
    </tr>`).join("") || '<tr><td colspan="6" class="muted" style="text-align:center;padding:20px">No hay trabajadores registrados.</td></tr>';
  pintarPaginacion("paginacion-usuarios", visibles.length, estado, pintarUsuarios);
}

document.getElementById("tabla-usuarios").addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button"); if (!boton) return;
  await ejecutarAccionAdmin(boton, async () => {
    if (boton.matches(".btn-toggle-usuario")) { await usuarios.cambiarEstado(Number(boton.dataset.id), boton.dataset.activo !== "true"); mostrarToastAdmin("Estado del usuario actualizado.","exito"); await cargarTodo(); }
    else if (boton.matches("[data-ver-avance]")) await abrirPerfilTrabajador(boton.dataset.verAvance, boton);
  });
});

document.getElementById("tabla-usuarios").addEventListener("change", async (evento) => {
  const selector = evento.target.closest("[data-rol-usuario]"); if (!selector) return;
  const previo = listaUsuarios.find(u => Number(u.id) === Number(selector.dataset.rolUsuario))?.rol;
  await ejecutarAccionAdmin(selector, async () => {
    try {
      await usuarios.cambiarRol(Number(selector.dataset.rolUsuario), selector.value);
      mostrarToastAdmin("Rol actualizado correctamente.", "exito");
      await cargarTodo();
    } catch (error) {
      selector.value = previo || "trabajador";
      throw error;
    }
  });
});

document.getElementById("buscar-usuarios")?.addEventListener("input", () => { estadoDashboard.usuarios.pagina=1; pintarUsuarios(); });

document.getElementById("form-usuario").addEventListener("submit", async (e) => {
  e.preventDefault(); const boton=e.target.querySelector('[type="submit"]'); if(boton.disabled)return; boton.disabled=true;
  const nombre=document.getElementById("nu-nombre").value.trim(), area=document.getElementById("nu-area").value.trim(), password=document.getElementById("nu-password").value.trim(), rol=document.getElementById("nu-rol").value;
  const correo=nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(" ").filter(Boolean).slice(0,2).join(".")+"@cicsa.mx";
  try { await usuarios.crear({nombre,area,password,correo,rol}); e.target.reset(); document.getElementById("nu-rol").value="trabajador"; mostrarToastAdmin("Usuario creado correctamente.","exito"); await cargarTodo(); }
  catch(error){ mostrarToastAdmin(error.message||"No se pudo crear el trabajador.","error"); } finally { boton.disabled=false; }
});

function normalizarEncabezado(valor){ return String(valor||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,""); }
function leerRegistrosExcel(array){
  if(!array.length) return [];
  const encabezados=Object.keys(array[0]);
  const mapa={}; encabezados.forEach(k=>mapa[normalizarEncabezado(k)]=k);
  const buscar=(fila,nombres)=>{ for(const n of nombres){ if(mapa[normalizarEncabezado(n)]!==undefined) return fila[mapa[normalizarEncabezado(n)]]; } return ""; };
  return array.map(fila=>({ nombre:buscar(fila,["Nombre","Nombre completo","Trabajador","Empleado"]), area:buscar(fila,["Area","Área","Área de trabajo","Departamento"]), correo:buscar(fila,["Correo","Email","E-mail"]), password:buscar(fila,["Contraseña","Password"]) })).filter(r=>String(r.nombre||"").trim());
}

document.getElementById("btn-importar-trabajadores")?.addEventListener("click",()=>document.getElementById("archivo-trabajadores-excel")?.click());
document.getElementById("archivo-trabajadores-excel")?.addEventListener("change", async (e)=>{
  const archivo=e.target.files?.[0]; if(!archivo)return;
  try {
    if(typeof XLSX === "undefined") throw new Error("No se pudo cargar el lector de Excel. Revisa tu conexión a internet.");
    const buffer=await archivo.arrayBuffer(); const libro=XLSX.read(buffer,{type:"array"}); const hoja=libro.Sheets[libro.SheetNames[0]];
    const datos=XLSX.utils.sheet_to_json(hoja,{defval:""}); const registros=leerRegistrosExcel(datos);
    if(!registros.length) throw new Error("No encontré trabajadores. Usa las columnas Nombre y Área.");
    if(registros.length>500) throw new Error("El archivo supera el límite de 500 trabajadores por importación.");
    const resultado=await usuarios.importar(registros);
    mostrarToastAdmin(`Importación terminada: ${resultado.creados.length} creados, ${resultado.omitidos.length} omitidos.`, resultado.omitidos.length ? "info" : "exito");
    if(resultado.omitidos.length) console.table(resultado.omitidos);
    await cargarTodo();
  } catch(error){ mostrarToastAdmin(error.message||"No se pudo importar el Excel.","error"); } finally { e.target.value=""; }
});

document.getElementById("btn-plantilla-trabajadores")?.addEventListener("click",()=>{
  if(typeof XLSX === "undefined"){ mostrarToastAdmin("No se pudo cargar el generador de Excel.","error"); return; }
  const filas=[{Nombre:"Juan Pérez López",Área:"Operaciones",Correo:"juan.perez@cicsa.mx",Contraseña:"Cicsa2026"},{Nombre:"María López",Área:"Seguridad",Correo:"",Contraseña:""}];
  const hoja=XLSX.utils.json_to_sheet(filas); const libro=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(libro,hoja,"Trabajadores"); XLSX.writeFile(libro,"plantilla_trabajadores_cicsa.xlsx");
});
