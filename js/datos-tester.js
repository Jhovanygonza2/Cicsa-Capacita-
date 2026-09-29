/* Datos ficticios opcionales: solo se ejecutan desde tester.html. */
async function cargarDatosTester() {
  if (!MOCK_MODE) throw new Error("Los datos de prueba requieren el modo demo.");
  await dbListaPromise;
  const marca = "cicsa_tester_v1";
  if (localStorage.getItem(marca)) return "Los datos de prueba ya están cargados. Se conservaron tus cambios.";
  const copia = new Map();
  const escribir = (clave, valor) => {
    if (!copia.has(clave)) copia.set(clave, localStorage.getItem(clave));
    localStorage.setItem(clave, JSON.stringify(valor));
  };
  const leer = clave => cargarDatosPersistidos(clave, []);
  const siguiente = items => Math.max(0, ...items.map(x => Number(x.id) || 0)) + 1;
  const ahora = Date.now(), fecha = new Date(ahora).toISOString();
  const cuentas = leer("cicsa_usuarios");
  const perfiles = [
    ["tester.admin", "Administrador TEST", "admin", "Capacitación"],
    ["tester.instructor", "Instructor TEST", "instructor", "Capacitación"],
    ["tester.nuevo", "Trabajador nuevo TEST", "trabajador", "Operaciones"],
    ["tester.avance", "Trabajador en progreso TEST", "trabajador", "Mantenimiento"],
    ["tester.aprobado", "Trabajador aprobado TEST", "trabajador", "Calidad"],
    ["tester.reprobado", "Trabajador por reforzar TEST", "trabajador", "Operaciones"],
    ["tester.inactivo", "Trabajador inactivo TEST", "trabajador", "Almacén"],
    ["tester.superadmin", "Superadministrador TEST", "superadmin", "Capacitación"]
  ];
  if (perfiles.some(([login]) => cuentas.some(u => u.usuarioLogin === login || u.correo === login + "@example.test"))) {
    throw new Error("Ya existe una cuenta con nombre tester. No se modificó; revisa las cuentas antes de cargar.");
  }
  const nuevos = perfiles.map(([usuarioLogin, nombre, rol, area], i) => ({
    id: siguiente(cuentas) + i, usuarioLogin, nombre, rol, area,
    correo: usuarioLogin + "@example.test", password: "Tester2026",
    activo: usuarioLogin !== "tester.inactivo", ultimoAcceso: null
  }));
  const instructor = nuevos[1], trabajadores = nuevos.slice(2, 7);
  const catalogo = leer("cicsa_cursos"), bancos = cargarObjetoPersistido("cicsa_evaluaciones", {});
  const primerId = siguiente(catalogo);
  const baseLeccion = Math.max(0, ...catalogo.flatMap(c => obtenerLeccionesCurso(c).map(l => Number(l.id)||0)), ...Object.keys(DB.contenidoLecciones).map(Number)) + 1;
  const estados = ["publicado", "pendiente", "rechazado", "borrador"];
  const cursosTest = estados.map((estado, i) => {
    const id = primerId + i;
    const preguntas = [
      {id: 1, enunciado: "¿Dónde encuentras tus cursos asignados?", opciones: [{id:"a",texto:"Mi aprendizaje"},{id:"b",texto:"Cerrar sesión"}], correcta:"a"},
      {id: 2, enunciado: "¿Dónde puedes solicitar ayuda?", opciones: [{id:"a",texto:"Soporte"},{id:"b",texto:"Cerrar sesión"}], correcta:"a"},
      {id: 3, enunciado: "¿Dónde consultas tus resultados?", opciones: [{id:"a",texto:"Mi perfil"},{id:"b",texto:"Iniciar sesión"}], correcta:"a"}
    ];
    bancos[id] = {evaluacion: {minimaAprobatoria:70,preguntas:[]}, examen:{minimaAprobatoria:70,preguntas}};
    return {
      id, nombre: "[TEST] Uso de la plataforma - " + estado,
      descripcion: "Contenido ficticio para probar navegación, avance, evaluaciones y revisión de cursos.",
      categoria:"Tecnología", academia:"Academia técnica", tipo:"Obligatorio", horas:24, duracion:"24 h",
      estado, asignadoA: estado === "publicado" ? "Seleccionados" : "",
      asignadoAIds: estado === "publicado" ? trabajadores.map(u => u.id) : [],
      fechaInicio:new Date(ahora - 3600000).toISOString(), fechaFin:new Date(ahora + 30*86400000).toISOString(),
      solicitudCurso:{usuarioId:instructor.id, nombre:instructor.nombre, fecha, comentario:estado === "rechazado" ? "TEST: ampliar los ejemplos y reenviar." : ""},
      modulos:[{id:id*100,nombre:"Primeros pasos",temas:[{nombre:"Navegación",subtemas:[
        {id:baseLeccion+i*3,nombre:"Mi aprendizaje",tipo:"texto",informacion:"Abre Mi aprendizaje, localiza el curso asignado y consulta su horario. Este contenido es una muestra para pruebas.",url:""},
        {id:baseLeccion+i*3+1,nombre:"Perfil y soporte",tipo:"texto",informacion:"Consulta tus resultados en Mi perfil. En Soporte puedes enviar una solicitud y revisar su respuesta.",url:""},
        {id:baseLeccion+i*3+2,nombre:"Recorrido de prueba",tipo:"texto",informacion:"Completa las lecciones y presenta el examen final. Verifica que el resultado se refleje en tu perfil.",url:""}
      ]}]}], evaluacion:bancos[id].examen
    };
  });
  const curso = cursosTest[0];
  const progreso = cargarObjetoPersistido("cicsa_progreso", {});
  const resultados = leer("cicsa_evaluaciones_resultado");
  trabajadores.forEach((u, i) => {
    const cantidad = [0,1,3,3,0][i], aprobado = i === 2;
    progreso[u.id] = {[curso.id]:{porcentaje:Math.round(cantidad/3*100),estado:aprobado?"completado":cantidad===3?"listo_examen":cantidad?"en_proceso":"no_iniciado",
      completadas:obtenerLeccionesCurso(curso).slice(0,cantidad).map(l=>l.id),
      evaluacionInicialAprobada:cantidad>0,examenAprobado:aprobado,...(aprobado?{fechaFin:fecha.slice(0,10)}:{})}};
    if (cantidad) resultados.push({usuarioId:u.id,usuario:u.nombre,curso:curso.nombre,tipo:"evaluacion",nota:100,estado:"aprobado",fecha:fecha.slice(0,10)});
    if (i===2 || i===3) resultados.push({usuarioId:u.id,usuario:u.nombre,curso:curso.nombre,tipo:"examen",nota:i===2?100:33,estado:aprobado?"aprobado":"no aprobado",fecha:fecha.slice(0,10)});
  });
  const tickets = leer("cicsa_soporte");
  ["pendiente","en_atencion","resuelto"].forEach((estado,i) => {
    const u=trabajadores[i];
    tickets.push({id:siguiente(tickets),usuarioId:u.id,nombre:u.nombre,correo:u.correo,tipo:"curso",
      descripcion:"[TEST] Solicitud de ayuda para consultar el material del curso.",cursoId:curso.id,curso:curso.nombre,
      captura:"",estado,respuesta:i?"[TEST] Se revisó el acceso al material.":"",fecha,soloSuperadmin:false});
  });
  const sesiones = leer("cicsa_sesiones_uso");
  trabajadores.slice(1,4).forEach(u => sesiones.push({id:siguiente(sesiones),usuarioId:u.id,nombre:u.nombre,
    entrada:new Date(ahora-3600000).toISOString(),ultimaSenal:fecha,salida:fecha,motivo:"cierre_manual",estimada:false}));
  const avisos = leer("cicsa_notificaciones_admin");
  avisos.push({id:"tester-revision-v1",tipo:"curso-revision",usuarioId:instructor.id,cursoId:cursosTest[1].id,destinatarioRol:"superadmin",fecha,leida:false});
  avisos.push({id:"tester-completado-v1",tipo:"curso-completado",usuarioId:trabajadores[2].id,cursoId:curso.id,nota:100,fecha,leida:false});
  const solicitudes = leer("cicsa_solicitudes_restablecimiento");
  solicitudes.push({id:siguiente(solicitudes),usuarioId:trabajadores[0].id,correo:trabajadores[0].correo,estado:"pendiente",fecha});
  const comunicados=leer("cicsa_comunicados");
  if (comunicados.length<3) comunicados.push({id:"tester-aviso-v1",titulo:"[TEST] Bienvenida a las pruebas",categoria:"Informativo",fecha:fecha.slice(0,10),texto:"Revisa tus cursos, tu perfil y las solicitudes de soporte. Este aviso contiene información ficticia.",imagen:"",creado:fecha});
  const materiales=leer("cicsa_tutoriales");
  materiales.push({id:"tester-guia-v1",titulo:"[TEST] Guía de navegación",tipo:"enlace",url:"../trabajador/tutorial.html",descripcion:"Pasos para consultar cursos y resultados.",fechaPublicacion:fecha});
  try {
    for (const [clave, valor] of Object.entries({
      cicsa_usuarios:[...cuentas,...nuevos],cicsa_cursos:[...catalogo,...cursosTest],cicsa_evaluaciones:bancos,
      cicsa_progreso:progreso,cicsa_evaluaciones_resultado:resultados,cicsa_soporte:tickets,
      cicsa_sesiones_uso:sesiones,cicsa_notificaciones_admin:avisos,cicsa_solicitudes_restablecimiento:solicitudes,
      cicsa_comunicados:comunicados,cicsa_tutoriales:materiales
    })) escribir(clave,valor);
    escribir(marca,true);
  } catch(error) {
    for(const [clave,valor] of copia) {
      if(valor===null) localStorage.removeItem(clave); else localStorage.setItem(clave,valor);
    }
    throw error;
  }
  return "Datos cargados. Ingresa con una cuenta tester y contraseña Tester2026. El curso publicado estará disponible durante 30 días.";
}

if (typeof document !== "undefined") {
  document.getElementById("cargar-tester")?.addEventListener("click", async function() {
    this.disabled=true;
    const estado=document.getElementById("estado-tester");
    try { estado.textContent=await cargarDatosTester(); }
    catch(error) { estado.textContent=error.message; }
    finally { this.disabled=false; }
  });
}
