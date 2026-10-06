// CONFIGURACIÓN OFICIAL DE TU PROYECTO
const SUPABASE_URL = "https://xuqfouybzphlzyyalxrh.supabase.co";
const SUPABASE_KEY = "sb_publishable_zyVID3AdjM_rs-teja9zeQ_zIrWCmmH"; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Enlace con los botones de la pantalla
const btnEscanear = document.getElementById('btn-escanear');
const btnCerrarCamara = document.getElementById('btn-cerrar-camara');
const seccionEscanner = document.getElementById('seccion-escanner');
const listaLeaderboard = document.getElementById('lista-leaderboard');

const codeReader = new ZXing.BrowserBarcodeReader();
let usuarioActualId = null;

// 1. Iniciar la App y cargar los datos
async function inicializarApp() {
  try {
    // Buscamos si ya existe el usuario de prueba que creamos en tu SQL Editor
    const { data: perfiles, error } = await _supabase
      .from('perfiles')
      .select('id')
      .eq('nombre_usuario', 'EcoJugador_Pro')
      .single();

    if (!error && perfil) {
      usuarioActualId = perfil.id;
    } else {
      // Si por alguna razón no existe, usamos el id genérico temporal
      usuarioActualId = "00000000-0000-0000-0000-000000000000";
    }

    await cargarLeaderboard();
  } catch (err) {
    console.error("Error al inicializar:", err.message);
  }
}

// 2. Traer el ranking ordenado desde Supabase
async function cargarLeaderboard() {
  const { data, error } = await _supabase
    .from('perfiles')
    .select('nombre_usuario, puntos')
    .order('puntos', { ascending: false });

  if (error) {
    console.error("Error al obtener ranking:", error);
    return;
  }

  listaLeaderboard.innerHTML = "";
  
  if (data.length === 0) {
    listaLeaderboard.innerHTML = `<p class="text-gray-500 text-center py-4">No hay jugadores registrados todavía.</p>`;
    return;
  }

  data.forEach((user, index) => {
    let medalla = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
    listaLeaderboard.innerHTML += `
      <li class="flex justify-between items-center py-3 ${index === 0 ? 'font-bold text-green-700' : 'text-gray-700'}">
        <span class="flex items-center gap-2">
          <span class="w-6 text-center">${medalla}</span>
          <span>${user.nombre_usuario}</span>
        </span>
        <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
          ${user.puntos} pts
        </span>
      </li>
    `;
  });
}

// 3. Encender la cámara del celular al presionar el botón
btnEscanear.addEventListener('click', async () => {
  seccionEscanner.classList.remove('hidden');
  
  codeReader.decodeFromVideoDevice(null, 'video', async (result, err) => {
    if (result) {
      const codigoEscaneado = result.text;
      
      // Detener cámara inmediatamente tras la lectura
      codeReader.reset();
      seccionEscanner.classList.add('hidden');
      
      // Ejecutar la función para sumarte el punto
      await sumarPunto(codigoEscaneado);
    }
    if (err && !(err instanceof ZXing.NotFoundException)) {
      console.error("Error de cámara:", err);
    }
  });
});

// 4. Registrar el código y sumarte el punto en la base de datos
async function sumarPunto(codigo) {
  alert(`♻️ ¡Código escaneado: ${codigo}!\nSumando 1 punto...`);

  try {
    // Guardar el registro del escaneo en la tabla
    await _supabase
      .from('escaneos')
      .insert([{ usuario_id: usuarioActualId, codigo_barras: codigo }]);

    // Obtener los puntos que tiene actualmente el jugador
    const { data: perfil } = await _supabase
      .from('perfiles')
      .select('puntos')
      .eq('id', usuarioActualId)
      .single();

    const nuevosPuntos = (perfil ? perfil.puntos : 0) + 1;

    // Actualizar tus puntos en la tabla de Supabase
    await _supabase
      .from('perfiles')
      .update({ puntos: nuevosPuntos })
      .eq('id', usuarioActualId);

    // Actualizar la pantalla con las nuevas posiciones
    await cargarLeaderboard();
  } catch (error) {
    console.error("Error al procesar el punto:", error);
  }
}

// Cerrar la cámara si el usuario cancela
btnCerrarCamara.addEventListener('click', () => {
  codeReader.reset();
  seccionEscanner.classList.add('hidden');
});

// Ejecutar al arrancar la aplicación
inicializarApp();
