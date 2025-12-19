import React, { useState, useEffect } from 'react';
import { 
  Car, 
  MapPin, 
  Settings, 
  PlusCircle, 
  FileSpreadsheet, 
  History, 
  Save, 
  Trash2,
  TrendingUp,
  DollarSign,
  ClipboardList,
  AlertTriangle
} from 'lucide-react';

// He renombrado la función principal a 'App' para que coincida con tu archivo src/App.jsx
export default function App() {
  // Estado para la navegación entre pestañas
  const [activeTab, setActiveTab] = useState('registro');

  // Estado para la configuración (Parámetros)
  const [config, setConfig] = useState({
    conductor: '',
    vehiculo: '',
    kmPorLitro: 10,
    precioPorLitro: 25.00
  });

  // Estado para el formulario de nuevo viaje
  const [nuevoViaje, setNuevoViaje] = useState({
    inicio: '',
    fin: '',
    kmInicial: '',
    kmFinal: '',
    destinos: '',
    diligencias: '' 
  });

  // Estado para la lista de viajes (Base de datos local)
  const [viajes, setViajes] = useState([]);

  // Cargar datos guardados al iniciar y verificar si es primera vez
  useEffect(() => {
    try {
      const configGuardada = localStorage.getItem('bv_config');
      const viajesGuardados = localStorage.getItem('bv_viajes');
      
      let configLoaded = null;

      if (configGuardada) {
        configLoaded = JSON.parse(configGuardada);
        setConfig(configLoaded);
      }
      
      if (viajesGuardados) {
        setViajes(JSON.parse(viajesGuardados));
      }

      // Si no hay conductor o vehículo configurado, forzar la vista de Configuración
      if (!configLoaded || !configLoaded.conductor || !configLoaded.vehiculo) {
        setActiveTab('config');
      }
    } catch (error) {
      console.error("Error cargando datos locales:", error);
    }
  }, []);

  // Guardar datos cuando cambian (Persistencia)
  useEffect(() => {
    try {
      localStorage.setItem('bv_config', JSON.stringify(config));
      localStorage.setItem('bv_viajes', JSON.stringify(viajes));
    } catch (error) {
      console.error("Error guardando datos:", error);
    }
  }, [config, viajes]);

  // Manejar cambios en inputs de configuración
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: name.includes('precio') || name.includes('km') ? parseFloat(value) || 0 : value
    }));
  };

  // Manejar cambios en formulario de viaje
  const handleViajeChange = (e) => {
    const { name, value } = e.target;
    setNuevoViaje(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Calcular y Guardar Viaje
  const registrarViaje = (e) => {
    e.preventDefault();

    // Validaciones básicas
    const kmI = parseFloat(nuevoViaje.kmInicial);
    const kmF = parseFloat(nuevoViaje.kmFinal);

    if (kmF <= kmI) {
      alert("Error: El kilometraje final debe ser mayor al inicial.");
      return;
    }
    if (!config.conductor || !config.vehiculo) {
      alert("Por favor configura el conductor y vehículo primero en la pestaña de Ajustes.");
      setActiveTab('config');
      return;
    }

    // Cálculos matemáticos
    const kmRecorridos = kmF - kmI;
    const litrosUsados = kmRecorridos / (config.kmPorLitro || 1); // Evitar división por 0
    const costoTotal = litrosUsados * config.precioPorLitro;

    const viajeProcesado = {
      id: Date.now(),
      fechaRegistro: new Date().toLocaleDateString(),
      conductor: config.conductor,
      vehiculo: config.vehiculo,
      ...nuevoViaje,
      kmRecorridos: kmRecorridos.toFixed(2),
      litrosUsados: litrosUsados.toFixed(2),
      precioPorLitro: config.precioPorLitro,
      costoTotal: costoTotal.toFixed(2)
    };

    setViajes([viajeProcesado, ...viajes]); // Añadir al principio de la lista
    
    // Limpiar formulario y preparar para el siguiente
    setNuevoViaje({
      inicio: '',
      fin: '',
      kmInicial: kmF, // Auto-sugerir el final anterior
      kmFinal: '',
      destinos: '',
      diligencias: ''
    });
    
    alert("Viaje registrado correctamente.");
    setActiveTab('historial');
  };

  // Borrar un viaje individual
  const borrarViaje = (id) => {
    if(window.confirm("¿Estás seguro de borrar este registro?")) {
      setViajes(viajes.filter(v => v.id !== id));
    }
  };

  // REINICIAR TODA LA APP (Factory Reset)
  const reiniciarApp = () => {
    if (window.confirm("⚠️ ¿PELIGRO: Estás seguro de que quieres borrar TODOS los datos?\n\nSe eliminará todo el historial y configuración.\n\nEsta acción NO se puede deshacer.")) {
        if (window.confirm("Confirmación final: Presiona Aceptar para borrar todo.")) {
            localStorage.removeItem('bv_config');
            localStorage.removeItem('bv_viajes');
            setConfig({
                conductor: '',
                vehiculo: '',
                kmPorLitro: 10,
                precioPorLitro: 25.00
            });
            setViajes([]);
            setNuevoViaje({
                inicio: '',
                fin: '',
                kmInicial: '',
                kmFinal: '',
                destinos: '',
                diligencias: ''
            });
            alert("La aplicación se ha reiniciado de fábrica.");
            setActiveTab('config');
        }
    }
  };

  // Función para exportar a Excel (CSV)
  const exportarExcel = () => {
    if (viajes.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Fecha Registro,Conductor,Vehiculo,Inicio Viaje,Fin Viaje,Destinos,Diligencias,Km Inicial,Km Final,Km Recorridos,Litros Consumidos,Costo Total (C$)\n";

    viajes.forEach(row => {
      const cleanText = (text) => text ? `"${text.replace(/"/g, '""').replace(/\n/g, ' ')}"` : '""';

      const rowData = [
        row.id,
        row.fechaRegistro,
        cleanText(row.conductor),
        cleanText(row.vehiculo),
        row.inicio,
        row.fin,
        cleanText(row.destinos),
        cleanText(row.diligencias),
        row.kmInicial,
        row.kmFinal,
        row.kmRecorridos,
        row.litrosUsados,
        row.costoTotal
      ];
      csvContent += rowData.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bitacora_vehicular.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-blue-700 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Car className="h-6 w-6" />
            <h1 className="text-xl font-bold">Control de Ruta</h1>
          </div>
          {config.conductor && <span className="text-xs bg-blue-800 px-2 py-1 rounded truncate max-w-[120px]">{config.conductor}</span>}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4 pb-24">
        
        {/* TAB: REGISTRO */}
        {activeTab === 'registro' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-700">
                <PlusCircle className="h-5 w-5 text-blue-600" /> Nuevo Recorrido
              </h2>
              
              <form onSubmit={registrarViaje} className="space-y-4">
                
                {/* Fechas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Inicio (Hora)</label>
                    <input 
                      required
                      type="datetime-local" 
                      name="inicio"
                      value={nuevoViaje.inicio}
                      onChange={handleViajeChange}
                      className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Fin (Hora)</label>
                    <input 
                      required
                      type="datetime-local" 
                      name="fin"
                      value={nuevoViaje.fin}
                      onChange={handleViajeChange}
                      className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Destinos */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Destino(s)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                      required
                      type="text" 
                      name="destinos"
                      placeholder="Ej. Centro, Almacén, Oficina..."
                      value={nuevoViaje.destinos}
                      onChange={handleViajeChange}
                      className="w-full pl-9 p-2 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Diligencias */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Diligencias Realizadas</label>
                  <div className="relative">
                    <ClipboardList className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <textarea 
                      name="diligencias"
                      placeholder="Descripción de actividades..."
                      value={nuevoViaje.diligencias}
                      onChange={handleViajeChange}
                      rows="2"
                      className="w-full pl-9 p-2 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Kilometraje */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Km Inicial</label>
                    <input 
                      required
                      type="number" 
                      step="0.1"
                      name="kmInicial"
                      placeholder="0000"
                      value={nuevoViaje.kmInicial}
                      onChange={handleViajeChange}
                      className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Km Final</label>
                    <input 
                      required
                      type="number" 
                      step="0.1"
                      name="kmFinal"
                      placeholder="0000"
                      value={nuevoViaje.kmFinal}
                      onChange={handleViajeChange}
                      className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Info de Configuración Actual */}
                <div className="text-xs text-slate-400 text-center flex justify-center gap-4">
                  <span>🚗 {config.vehiculo || 'Sin vehículo'}</span>
                  <span>⛽ C$ {config.precioPorLitro}/L</span>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                  <Save className="h-5 w-5" /> Registrar Viaje
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB: HISTORIAL */}
        {activeTab === 'historial' && (
          <div className="space-y-4 animate-fade-in">
             <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-slate-700">Historial de Viajes</h2>
                <button 
                  onClick={exportarExcel}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-green-700 shadow-sm"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
                </button>
             </div>

             {viajes.length === 0 ? (
               <div className="text-center py-10 text-slate-400">
                 <p>No hay viajes registrados aún.</p>
               </div>
             ) : (
               viajes.map((v) => (
                 <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 mr-2">
                        <h3 className="font-bold text-slate-800 text-lg">{v.destinos}</h3>
                        <p className="text-xs text-slate-500 mb-1">{new Date(v.inicio).toLocaleString()} - {new Date(v.fin).toLocaleTimeString()}</p>
                        {v.diligencias && (
                          <div className="text-sm text-slate-600 italic bg-slate-50 p-2 rounded mt-1 border border-slate-100">
                            "{v.diligencias}"
                          </div>
                        )}
                      </div>
                      <button onClick={() => borrarViaje(v.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mt-3 bg-slate-50 p-2 rounded-lg text-sm">
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Distancia</p>
                        <p className="font-semibold text-blue-700">{v.kmRecorridos} km</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Combustible</p>
                        <p className="font-semibold text-orange-600">{v.litrosUsados} L</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Costo</p>
                        <p className="font-bold text-green-700">C$ {v.costoTotal}</p>
                      </div>
                    </div>
                 </div>
               ))
             )}
          </div>
        )}

        {/* TAB: CONFIGURACION */}
        {activeTab === 'config' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-700">
                <Settings className="h-5 w-5 text-slate-500" /> Parámetros Iniciales
              </h2>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800 mb-4">
                  Configura estos datos una sola vez. Se guardarán automáticamente.
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Nombre del Conductor</label>
                  <input 
                    type="text" 
                    name="conductor"
                    value={config.conductor}
                    onChange={handleConfigChange}
                    className="w-full p-2 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Descripción del Vehículo</label>
                  <input 
                    type="text" 
                    name="vehiculo"
                    placeholder="Ej. Nissan Versa 2020 - Placa ABC-123"
                    value={config.vehiculo}
                    onChange={handleConfigChange}
                    className="w-full p-2 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <label className="block text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Rendimiento (Km/L)
                    </label>
                    <input 
                      type="number" 
                      name="kmPorLitro"
                      value={config.kmPorLitro}
                      onChange={handleConfigChange}
                      className="w-full p-2 border border-blue-200 rounded-md text-center font-bold"
                    />
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <label className="block text-xs font-bold text-green-800 mb-1 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> Precio Gasolina (C$/L)
                    </label>
                    <input 
                      type="number" 
                      name="precioPorLitro"
                      value={config.precioPorLitro}
                      onChange={handleConfigChange}
                      className="w-full p-2 border border-green-200 rounded-md text-center font-bold"
                    />
                  </div>
                </div>

                {config.conductor && config.vehiculo && (
                  <button 
                    onClick={() => setActiveTab('registro')}
                    className="w-full mt-4 bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    Guardar y Continuar
                  </button>
                )}

                <hr className="my-6 border-slate-200" />
                
                {/* ZONA DE PELIGRO */}
                <div className="pt-2">
                   <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-1">
                     <AlertTriangle className="h-4 w-4" /> Zona de Peligro
                   </h3>
                   <button 
                     onClick={reiniciarApp}
                     className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-lg hover:bg-red-100 transition-colors flex justify-center items-center gap-2 font-semibold"
                   >
                     <Trash2 className="h-5 w-5" /> Borrar Todo y Reiniciar
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Navigation Bar (Bottom) */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 shadow-lg z-20">
        <div className="max-w-md mx-auto grid grid-cols-3 h-16">
          <button onClick={() => setActiveTab('registro')} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === 'registro' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}>
            <PlusCircle className="h-6 w-6" /> <span className="text-xs">Registro</span>
          </button>
          <button onClick={() => setActiveTab('historial')} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === 'historial' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}>
            <History className="h-6 w-6" /> <span className="text-xs">Historial</span>
          </button>
          <button onClick={() => setActiveTab('config')} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === 'config' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}>
            <Settings className="h-6 w-6" /> <span className="text-xs">Ajustes</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
