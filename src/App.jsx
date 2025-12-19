import React, { useState, useEffect } from 'react';
import { 
  Car, MapPin, Settings, PlayCircle, StopCircle, 
  FileSpreadsheet, History, Trash2, 
  Clock, Calendar, CheckCircle, ShieldCheck,
  AlertTriangle, XCircle, AlertOctagon
} from 'lucide-react';

export default function App() {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Configuración Persistente
  const [config, setConfig] = useState({
    conductor: '',
    vehiculo: '',
    kmPorLitro: 10,
    precioPorLitro: 25.00
  });

  // Estado de la Jornada
  const [jornada, setJornada] = useState({
    estado: 'cerrado', // 'cerrado', 'abierto'
    fechaInicio: null,
    kmInicialDia: 0,
    fechaCierre: null
  });

  // Estado del Viaje Actual
  const [viajeActual, setViajeActual] = useState(null);
  // Historial de Viajes
  const [viajes, setViajes] = useState([]);

  // Formularios temporales
  const [formInicioDia, setFormInicioDia] = useState({ km: '' });
  const [formInicioViaje, setFormInicioViaje] = useState({ destino: '', diligencias: '', kmInicial: '' });
  const [formFinViaje, setFormFinViaje] = useState({ kmFinal: '', comentarios: '' });
  
  // Filtros
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0]);

  // --- EFECTOS ---
  useEffect(() => {
    try {
      const configLocal = JSON.parse(localStorage.getItem('bv_config'));
      const jornadaLocal = JSON.parse(localStorage.getItem('bv_jornada'));
      const viajeActualLocal = JSON.parse(localStorage.getItem('bv_viaje_actual'));
      const viajesLocal = JSON.parse(localStorage.getItem('bv_viajes'));

      if (configLocal) setConfig(configLocal);
      if (jornadaLocal) setJornada(jornadaLocal);
      
      if (viajeActualLocal && viajeActualLocal.id && viajeActualLocal.estado === 'en_curso') {
          setViajeActual(viajeActualLocal);
      } else {
          setViajeActual(null); 
      }

      if (viajesLocal) setViajes(viajesLocal);
      if (!configLocal?.conductor) setActiveTab('config');

    } catch (e) { 
        console.error("Error cargando datos", e);
        setViajeActual(null);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('bv_config', JSON.stringify(config));
    localStorage.setItem('bv_jornada', JSON.stringify(jornada));
    localStorage.setItem('bv_viaje_actual', JSON.stringify(viajeActual));
    localStorage.setItem('bv_viajes', JSON.stringify(viajes));
  }, [config, jornada, viajeActual, viajes]);

  // --- VALIDACIÓN DE JORNADA PASADA ---
  const esJornadaPasadaAbierta = () => {
      if (jornada.estado !== 'abierto') return false;
      if (!jornada.fechaInicio) return false;
      
      const fechaJornada = new Date(jornada.fechaInicio).toDateString();
      const fechaHoy = new Date().toDateString();
      
      return fechaJornada !== fechaHoy;
  };

  // --- LÓGICA DE NEGOCIO ---

  const iniciarDia = (e) => {
    e.preventDefault();
    const km = parseFloat(formInicioDia.km);
    if (!km || km < 0) return alert("Ingrese un kilometraje válido");

    setJornada({
      estado: 'abierto',
      fechaInicio: new Date().toISOString(),
      kmInicialDia: km,
      fechaCierre: null
    });
    setFormInicioDia({ km: '' });
    setFormInicioViaje(prev => ({ ...prev, kmInicial: km }));
  };

  const iniciarRecorrido = (e) => {
    e.preventDefault();
    const kmI = parseFloat(formInicioViaje.kmInicial);
    
    // Validar gaps
    const ultimoViaje = viajes.length > 0 ? viajes[0] : null;
    let kmSugerido = ultimoViaje ? ultimoViaje.kmFinal : jornada.kmInicialDia;
    
    if (kmI < kmSugerido) {
      if(!confirm(`⚠️ ¿KILOMETRAJE MENOR?\n\nIngresado: ${kmI}\nAnterior: ${kmSugerido}\n\n¿Es correcto?`)) return;
    }

    const nuevoViaje = {
      id: Date.now(),
      diaId: new Date(jornada.fechaInicio).toDateString(), 
      inicio: new Date().toISOString(),
      fin: null,
      kmInicial: kmI,
      kmFinal: null,
      destinos: formInicioViaje.destino,
      diligencias: formInicioViaje.diligencias,
      estado: 'en_curso'
    };

    setViajeActual(nuevoViaje);
    setFormInicioViaje({ destino: '', diligencias: '', kmInicial: '' }); 
  };

  const finalizarRecorrido = (e) => {
    e.preventDefault();
    if (!viajeActual) return;

    const kmF = parseFloat(formFinViaje.kmFinal);
    const kmI = viajeActual.kmInicial;
    const fechaFin = new Date();

    if (kmF <= kmI) return alert("El kilometraje final debe ser mayor al inicial.");
    
    const kmRecorridos = kmF - kmI;
    const litrosUsados = kmRecorridos / (config.kmPorLitro || 1);
    const costoTotal = litrosUsados * config.precioPorLitro;

    const viajeCerrado = {
      ...viajeActual,
      fin: fechaFin.toISOString(),
      kmFinal: kmF,
      kmRecorridos: kmRecorridos.toFixed(2),
      litrosUsados: litrosUsados.toFixed(2),
      costoTotal: costoTotal.toFixed(2),
      comentarios: formFinViaje.comentarios || 'Sin novedades',
      estado: 'completado'
    };

    setViajes([viajeCerrado, ...viajes]); 
    setViajeActual(null);
    setFormFinViaje({ kmFinal: '', comentarios: '' });
  };

  const cancelarViajeActual = () => {
      if(confirm("¿Se canceló la orden?\n\nAl confirmar, se borrará este registro de inicio y podrás ingresar uno nuevo.")) {
          setViajeActual(null);
      }
  };

  // 4. CIERRE DE JORNADA (SIMPLIFICADO Y ROBUSTO)
  const cerrarDia = () => {
    // 1. Verificar si hay viaje trabado
    if (viajeActual && viajeActual.id) {
        if(confirm(`⚠️ Tienes un viaje ABIERTO.\n\n¿Quieres CANCELARLO y cerrar el día?`)) {
            setViajeActual(null);
            // Continuamos al cierre...
        } else {
            return; // Canceló la acción
        }
    }
    
    // 2. Confirmación simple
    if(!confirm("¿CONFIRMAR: Finalizar jornada?")) return;

    // 3. Ejecución directa del cierre
    const fechaCierre = new Date().toISOString();
    const fechaParaReporte = jornada.fechaInicio || new Date().toISOString();

    // Actualizamos estado radicalmente
    setJornada({
        estado: 'cerrado',
        fechaInicio: null, // Limpiamos para evitar conflictos futuros
        kmInicialDia: 0,
        fechaCierre: fechaCierre
    });

    // 4. Intento de reporte (en segundo plano para no bloquear UI)
    setTimeout(() => {
        try {
            exportarExcel('jornada_especifica', true, fechaParaReporte);
        } catch(e) { console.error(e); }
        alert("✅ Jornada finalizada correctamente.");
    }, 500);
  };

  const reabrirDia = () => {
      if(confirm("¿Reabrir la última jornada para agregar correcciones?")) {
          setJornada(prev => ({ ...prev, estado: 'abierto', fechaCierre: null }));
      }
  };

  // --- UTILS EXPORTACIÓN ---
  const exportarExcel = (modo = 'todo', silencioso = false, fechaEspecifica = null) => {
    try {
        let datosExportar = viajes;

        if (modo === 'jornada_especifica' && fechaEspecifica) {
            const diaJornada = new Date(fechaEspecifica).toDateString();
            datosExportar = viajes.filter(v => new Date(v.inicio).toDateString() === diaJornada);
        } else if (modo === 'fecha') {
            datosExportar = viajes.filter(v => v.inicio.startsWith(filtroFecha));
        }

        if (datosExportar.length === 0) {
            if (!silencioso) alert("No se encontraron registros para generar el reporte.");
            return;
        }

        let csv = "data:text/csv;charset=utf-8,";
        csv += "ID,Fecha,Conductor,Vehiculo,Inicio,Fin,Destino,Diligencia,Km Ini,Km Fin,Recorrido(Km),Litros,Costo(C$),Comentarios\n";

        datosExportar.forEach(v => {
          const clean = (t) => t ? `"${t.toString().replace(/"/g, '""')}"` : '""';
          csv += `${v.id},${new Date(v.inicio).toLocaleDateString()},${clean(config.conductor)},${clean(config.vehiculo)},` +
                 `${new Date(v.inicio).toLocaleTimeString()},${v.fin ? new Date(v.fin).toLocaleTimeString() : 'CANCELADO'},` +
                 `${clean(v.destinos)},${clean(v.diligencias)},${v.kmInicial},${v.kmFinal || 0},${v.kmRecorridos || 0},` +
                 `${v.litrosUsados || 0},${v.costoTotal || 0},${clean(v.comentarios)}\n`;
        });

        const link = document.createElement("a");
        link.href = encodeURI(csv);
        link.download = `Reporte_${modo}_${new Date().getTime()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Error exportando excel:", error);
        if(!silencioso) alert("Error al generar el archivo Excel.");
    }
  };

  const obtenerUltimoKm = () => {
      if (viajes.length > 0) return viajes[0].kmFinal;
      return jornada.kmInicialDia || 0;
  };

  const limpiarViajeFantasma = () => {
      if(confirm("¿Forzar la detención de viajes atascados?")) {
          setViajeActual(null);
          localStorage.removeItem('bv_viaje_actual');
          alert("Listo.");
      }
  };

  // --- RENDERIZADO ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24">
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-20">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-full"><Car size={20} /></div>
            <div>
                <h1 className="font-bold text-lg leading-tight">Control de Ruta</h1>
                <p className="text-xs text-slate-400">{config.conductor || 'Sin Conductor'}</p>
            </div>
          </div>
          <div className="text-right">
             <span className={`text-xs px-2 py-1 rounded-full font-bold ${jornada.estado === 'abierto' ? 'bg-green-500 text-green-900' : 'bg-red-500 text-white'}`}>
                 {jornada.estado === 'abierto' ? 'Activa' : 'Cerrada'}
             </span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        
        {/* === TAB: DASHBOARD (Principal) === */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">

            {/* ALERTA: JORNADA PASADA ABIERTA */}
            {esJornadaPasadaAbierta() && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-md mb-4">
                    <div className="flex items-start">
                        <AlertOctagon className="text-red-500 mr-2" size={24} />
                        <div>
                            <h3 className="font-bold text-red-700">¡Cierre Pendiente!</h3>
                            <p className="text-sm text-red-600 mt-1">
                                Tienes abierta la jornada del <strong>{new Date(jornada.fechaInicio).toLocaleDateString()}</strong>.
                            </p>
                            <button 
                                onClick={cerrarDia}
                                className="mt-3 bg-red-600 text-white text-sm font-bold py-2 px-4 rounded w-full"
                            >
                                Cerrar Jornada Pendiente Ahora
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. ESTADO DE JORNADA CERRADA */}
            {jornada.estado === 'cerrado' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <Clock size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Iniciar Jornada</h2>
                    <p className="text-sm text-slate-500">Registra tu kilometraje actual para comenzar a operar el día de hoy.</p>
                    
                    <form onSubmit={iniciarDia} className="mt-4">
                        <label className="block text-left text-xs font-bold text-slate-600 mb-1 ml-1">Kilometraje Inicial del Día</label>
                        <input 
                            type="number" step="0.1" required
                            placeholder="Ej. 120500"
                            className="w-full text-2xl font-bold text-center p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none mb-4"
                            value={formInicioDia.km}
                            onChange={e => setFormInicioDia({km: e.target.value})}
                        />
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center items-center gap-2">
                            <PlayCircle /> Iniciar Día
                        </button>
                    </form>
                    
                    {jornada.fechaCierre && (
                        <button onClick={reabrirDia} className="text-xs text-blue-500 underline mt-2">
                            Reabrir última jornada cerrada
                        </button>
                    )}
                </div>
            )}

            {/* 2. JORNADA ABIERTA */}
            {jornada.estado === 'abierto' && !esJornadaPasadaAbierta() && (
                <>
                    {/* Info Jornada */}
                    <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                        <div>
                            <span className="text-blue-800 font-bold block">Inicio: {jornada.fechaInicio ? new Date(jornada.fechaInicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                            <span className="text-blue-600 text-xs">Km Inicial: {jornada.kmInicialDia}</span>
                        </div>
                        
                        <button 
                            onClick={cerrarDia} 
                            className={`px-3 py-1 rounded-md text-xs font-bold shadow-sm border transition-colors ${
                                viajeActual 
                                ? 'bg-slate-100 border-slate-300 text-slate-500' 
                                : 'bg-white border-red-200 text-red-600'
                            }`}
                        >
                            {viajeActual ? '⚠ Viaje en curso' : 'Finalizar Día'}
                        </button>
                    </div>

                    {/* 2A. FORMULARIO INICIO VIAJE */}
                    {!viajeActual && (
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <MapPin className="text-green-600" /> Nuevo Recorrido
                            </h2>
                            <form onSubmit={iniciarRecorrido} className="space-y-4">
                                <div>
                                    <label className="label-input">Destino Principal</label>
                                    <input 
                                        type="text" required
                                        placeholder="Ej. Oficinas Centrales"
                                        className="input-field"
                                        value={formInicioViaje.destino}
                                        onChange={e => setFormInicioViaje({...formInicioViaje, destino: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="label-input">Diligencias / Actividad</label>
                                    <textarea 
                                        rows="2" required
                                        placeholder="Entrega de documentos..."
                                        className="input-field resize-none"
                                        value={formInicioViaje.diligencias}
                                        onChange={e => setFormInicioViaje({...formInicioViaje, diligencias: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="label-input flex justify-between">
                                        <span>Km Salida</span>
                                        <span className="text-blue-500 font-normal cursor-pointer" onClick={() => setFormInicioViaje(p => ({...p, kmInicial: obtenerUltimoKm()}))}>
                                            Sugerido: {obtenerUltimoKm()}
                                        </span>
                                    </label>
                                    <input 
                                        type="number" step="0.1" required
                                        className="input-field font-bold text-lg"
                                        value={formInicioViaje.kmInicial}
                                        onFocus={(e) => !e.target.value && setFormInicioViaje({...formInicioViaje, kmInicial: obtenerUltimoKm()})}
                                        onChange={e => setFormInicioViaje({...formInicioViaje, kmInicial: e.target.value})}
                                    />
                                </div>
                                <button className="btn-primary bg-green-600 hover:bg-green-700">
                                    <PlayCircle size={20} /> Comenzar Viaje
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 2B. FORMULARIO FIN VIAJE */}
                    {viajeActual && (
                        <div className="bg-white p-1 rounded-2xl shadow-lg border-2 border-blue-500 overflow-hidden">
                            <div className="bg-blue-50 p-4 border-b border-blue-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">En Curso</span>
                                        <h3 className="text-xl font-bold text-slate-800">{viajeActual.destinos}</h3>
                                    </div>
                                    <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-mono">
                                        {new Date(viajeActual.inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{viajeActual.diligencias}</p>
                                <p className="text-xs text-slate-500 mt-2">Salida: <strong>{viajeActual.kmInicial} km</strong></p>
                            </div>

                            <div className="p-5">
                                <form onSubmit={finalizarRecorrido} className="space-y-4">
                                    <div>
                                        <label className="label-input">Kilometraje de Llegada</label>
                                        <input 
                                            type="number" step="0.1" required
                                            autoFocus
                                            placeholder={viajeActual.kmInicial + 5}
                                            className="input-field text-2xl font-bold text-center border-blue-200 focus:border-blue-600"
                                            value={formFinViaje.kmFinal}
                                            onChange={e => setFormFinViaje({...formFinViaje, kmFinal: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="label-input">Comentarios / Incidencias</label>
                                        <textarea 
                                            rows="2"
                                            placeholder="Sin novedades..."
                                            className="input-field"
                                            value={formFinViaje.comentarios}
                                            onChange={e => setFormFinViaje({...formFinViaje, comentarios: e.target.value})}
                                        />
                                    </div>
                                    <button className="btn-primary bg-red-600 hover:bg-red-700">
                                        <StopCircle size={20} /> Finalizar Viaje
                                    </button>
                                    
                                    <button 
                                        type="button"
                                        onClick={cancelarViajeActual}
                                        className="w-full text-slate-400 text-xs py-2 flex items-center justify-center gap-1 hover:text-red-500"
                                    >
                                        <XCircle size={14} /> Cancelar viaje (Orden cambiada)
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
            
            {/* RESUMEN RÁPIDO */}
            <div className="mt-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Historial Reciente</h3>
                {viajes.slice(0,3).map(v => (
                    <div key={v.id} className="bg-white p-3 rounded-lg border border-slate-100 mb-2 flex justify-between items-center opacity-75">
                        <div>
                            <p className="font-bold text-sm">{v.destinos}</p>
                            <p className="text-xs text-slate-500">{new Date(v.inicio).toLocaleDateString()}</p>
                        </div>
                        <span className="text-xs font-bold text-green-600">C$ {v.costoTotal || 0}</span>
                    </div>
                ))}
            </div>

          </div>
        )}

        {/* === TAB: HISTORIAL === */}
        {activeTab === 'historial' && (
          <div className="space-y-4 animate-fade-in">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-16 z-10">
                <h2 className="text-lg font-bold text-slate-700 mb-3">Reportes</h2>
                <div className="flex gap-2 mb-3">
                    <input 
                        type="date" 
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                        className="border p-2 rounded-lg text-sm flex-1"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => exportarExcel('fecha')} className="btn-secondary text-xs">
                        <FileSpreadsheet size={16} /> Exportar Día Seleccionado
                    </button>
                    <button onClick={() => exportarExcel('todo')} className="btn-secondary text-xs">
                        <FileSpreadsheet size={16} /> Exportar Todo
                    </button>
                </div>
             </div>

             <div className="space-y-3">
                {viajes.length === 0 ? <p className="text-center text-slate-400 py-10">Sin historial</p> : 
                 viajes.map((v) => (
                    <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-slate-800">{v.destinos}</h3>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <Calendar size={12} /> {new Date(v.inicio).toLocaleDateString()}
                                    <Clock size={12} /> {new Date(v.inicio).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {v.fin ? new Date(v.fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '...'}
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    if(confirm("¿Eliminar este registro del historial?")) {
                                        setViajes(viajes.filter(x => x.id !== v.id));
                                    }
                                }}
                                className="text-slate-300 hover:text-red-500"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        
                        {v.comentarios && (
                            <div className="bg-yellow-50 text-yellow-800 text-xs p-2 rounded mb-3 border border-yellow-100">
                                💬 {v.comentarios}
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-lg text-center text-xs">
                            <div>
                                <span className="block text-slate-400">Distancia</span>
                                <span className="font-bold text-blue-600">{v.kmRecorridos} km</span>
                            </div>
                            <div>
                                <span className="block text-slate-400">Gasolina</span>
                                <span className="font-bold text-orange-600">{v.litrosUsados} L</span>
                            </div>
                            <div>
                                <span className="block text-slate-400">Costo</span>
                                <span className="font-bold text-green-600">C$ {v.costoTotal}</span>
                            </div>
                        </div>
                    </div>
                 ))
                }
             </div>
          </div>
        )}

        {/* === TAB: CONFIGURACIÓN === */}
        {activeTab === 'config' && (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Settings className="text-slate-400" /> Ajustes
             </h2>

             <div className="space-y-4">
                <div className="flex justify-center gap-6 mb-6">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-dashed border-slate-300 text-slate-400">
                            <Car size={32} />
                        </div>
                        <p className="text-xs font-bold text-slate-500">Foto Vehículo</p>
                    </div>
                </div>

                <div>
                    <label className="label-input">Conductor</label>
                    <input type="text" className="input-field" value={config.conductor} onChange={e => setConfig({...config, conductor: e.target.value})} />
                </div>
                <div>
                    <label className="label-input">Vehículo</label>
                    <input type="text" className="input-field" value={config.vehiculo} onChange={e => setConfig({...config, vehiculo: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-input">Rendimiento (Km/L)</label>
                        <input type="number" className="input-field text-center font-bold" value={config.kmPorLitro} onChange={e => setConfig({...config, kmPorLitro: e.target.value})} />
                    </div>
                    <div>
                        <label className="label-input">Precio (C$/L)</label>
                        <input type="number" className="input-field text-center font-bold" value={config.precioPorLitro} onChange={e => setConfig({...config, precioPorLitro: e.target.value})} />
                    </div>
                </div>
             </div>
             
             <div className="mt-8 pt-8 border-t border-slate-100 space-y-3">
                <button 
                    onClick={limpiarViajeFantasma}
                    className="w-full bg-blue-50 text-blue-600 text-sm font-bold py-3 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-2"
                >
                    <ShieldCheck size={16} /> Corregir error 'Viaje en curso'
                </button>

                <button 
                    onClick={() => {
                        if(confirm("⚠️ ¿ESTÁS SEGURO? Se borrarán todos los datos y el historial permanentemente.")) {
                            localStorage.clear();
                            window.location.reload();
                        }
                    }}
                    className="w-full text-red-500 text-sm font-bold py-3 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"
                >
                    <AlertTriangle size={16} /> Reiniciar Fábrica
                </button>
             </div>
          </div>
        )}

      </main>

      {/* NAVBAR */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 shadow-2xl z-20 pb-safe">
        <div className="max-w-md mx-auto grid grid-cols-3 h-16">
          <button onClick={() => setActiveTab('dashboard')} className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}>
            <CheckCircle size={24} /> <span className="text-[10px] mt-1">Jornada</span>
          </button>
          <button onClick={() => setActiveTab('historial')} className={`nav-btn ${activeTab === 'historial' ? 'active' : ''}`}>
            <History size={24} /> <span className="text-[10px] mt-1">Historial</span>
          </button>
          <button onClick={() => setActiveTab('config')} className={`nav-btn ${activeTab === 'config' ? 'active' : ''}`}>
            <Settings size={24} /> <span className="text-[10px] mt-1">Ajustes</span>
          </button>
        </div>
      </nav>

      <style>{`
        .input-field { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; outline: none; transition: all 0.2s; }
        .input-field:focus { border-color: #3b82f6; ring: 2px; }
        .label-input { display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
        .btn-primary { width: 100%; color: white; font-weight: bold; padding: 12px; border-radius: 12px; display: flex; justify-content: center; align-items: center; gap: 8px; shadow: lg; transition: transform 0.1s; }
        .btn-primary:active { transform: scale(0.98); }
        .btn-secondary { background: white; border: 1px solid #e2e8f0; color: #475569; padding: 8px; border-radius: 8px; display: flex; justify-content: center; align-items: center; gap: 6px; font-weight: 500; }
        .nav-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; }
        .nav-btn.active { color: #2563eb; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </div>
  );
}