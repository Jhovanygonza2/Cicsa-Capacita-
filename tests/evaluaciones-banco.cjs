const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const data=new Map();
const localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i],get length(){return data.size}};
const ctx=vm.createContext({localStorage,console,setTimeout:fn=>{fn();return 0},URLSearchParams,window:{location:{pathname:'/index.html',replace(){}},addEventListener(){}}});
vm.runInContext(fs.readFileSync('js/api.js','utf8')+'\nthis.app={sesion,auth,usuarios,cursos,evaluaciones,DB,dbListaPromise};',ctx);
(async()=>{
  const a=ctx.app; await a.dbListaPromise;
  const login=async(name,pw)=>{const r=await a.auth.login(name,pw);a.sesion.guardar(r.token,r.usuario);return r.usuario;};
  await login('ana','Admin2026');
  const trabajador=await a.usuarios.crear({nombre:'Trabajador examen',correo:'worker.exam@test.mx',password:'Test2026',rol:'trabajador'});
  await login('instructor','Instructor2026');
  const preguntas=Array.from({length:25},(_,i)=>({
    id:i+1,
    enunciado:`Pregunta ${i+1}`,
    opciones:[{id:'a',texto:'Correcta'},{id:'b',texto:'Incorrecta'},{id:'c',texto:'Otra'}],
    correcta:'a'
  }));
  const curso=await a.cursos.crear({nombre:'Banco 25',horas:1,descripcion:'Prueba de banco',modulos:[],evaluacionesIniciales:{evaluacion:null,examen:{minimaAprobatoria:70,preguntas}}});
  await assert.rejects(a.evaluaciones.actualizarTipo(curso.id,'examen',{minimaAprobatoria:70,preguntas:[...preguntas,{id:26,enunciado:'26',opciones:[{id:'a',texto:'A'},{id:'b',texto:'B'},{id:'c',texto:'C'}],correcta:'a'}]}),/máximo de 25/);
  await login('ana','Admin2026');
  await a.cursos.asignar(curso.id,{asignadoAIds:[trabajador.id]});
  await a.cursos.cambiarEstado(curso.id,'publicado','Banco listo.');
  await login('worker.exam@test.mx','Test2026');

  // Fuerza una secuencia determinista de barajado para comprobar que no se entrega el orden original.
  vm.runInContext('Math.random = () => 0;',ctx);
  const evaluacion=await a.evaluaciones.obtenerPorCursoTipo(curso.id,'evaluacion');
  assert.equal(evaluacion.preguntas.length,5,'La Evaluación del curso debe tener exactamente 5 preguntas.');
  assert.ok(evaluacion.preguntas.every(p=>preguntas.some(q=>q.id===p.id)),'Las 5 preguntas deben provenir del banco del Examen final.');
  const respEval=Object.fromEntries(evaluacion.preguntas.map(p=>[p.id,'a']));
  const resEval=await a.evaluaciones.enviarIntento(curso.id,respEval,'evaluacion');
  assert.equal(resEval.total,5);
  assert.equal(resEval.aprobado,true);

  const examen=await a.evaluaciones.obtenerPorCursoTipo(curso.id,'examen');
  assert.equal(examen.preguntas.length,25,'El Examen final debe mostrar como máximo 25 preguntas.');
  assert.notDeepEqual(examen.preguntas.map(p=>p.id),preguntas.map(p=>p.id),'Al trabajador no se le debe entregar el orden fijo del banco.');
  assert.deepEqual([...examen.preguntas.map(p=>p.id)].sort((x,y)=>x-y),preguntas.map(p=>p.id),'El examen aleatorio debe conservar las mismas 25 preguntas del banco.');
  const respExamen=Object.fromEntries(examen.preguntas.map(p=>[p.id,'a']));
  const resExamen=await a.evaluaciones.enviarIntento(curso.id,respExamen,'examen');
  assert.equal(resExamen.total,25);
  assert.equal(resExamen.aprobado,true);
  console.log('PASS: evaluación automática de 5 desde el banco, examen máximo 25 y orden aleatorio para trabajador.');
})().catch(e=>{console.error(e);process.exitCode=1});
