// Configuración básica
const API_KEY = "9e2d2514a392a374be14b36878fac089";
const STRAPI_TOKEN =
  "8c457faa9e1976eda8492d0c470848626d5e7255008b189a8774819632c1e1c675acd69a6eaca57d7771e1c03e2b93b457f250d8007e6dcda81493b7199c7f76de93730cf2496417a057999bf78d10ddc89b11ecaa0e8787dc3abe97c79f69fde29cd958c93e7eb928419506215d60338d45ed8a9b71704b6c09a2050a64f86f";
const URL_TMDB = `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=es-ES&sort_by=popularity.desc&page=1`;
const URL_TMDB_GENEROS = `https://api.themoviedb.org/3/genre/tv/list?api_key=${API_KEY}&language=es-ES`;
const URL_STRAPI =
  "https://gestionweb.frlp.utn.edu.ar/api/g11-populares-series";

// Variable global para almacenar el mapa de géneros y evitar peticiones repetidas.
const mapaGeneros = {};

// ========================================================================
// 2. ASIGNACIÓN DE EVENTOS A LOS BOTONES
// ========================================================================

document.getElementById("btnCargar").addEventListener("click", cargarDatos);
document
  .getElementById("btnVisualizar")
  .addEventListener("click", visualizarDatos);

// ========================================================================
// 3. FUNCIONES DE UTILIDAD Y AYUDA
// ========================================================================

/**
 * Extrae el objeto 'attributes' de una respuesta de Strapi.
 * Las respuestas de Strapi envuelven los datos en un objeto 'attributes'.
 * @param {object} item - El objeto de la API de Strapi.
 * @returns {object} - El objeto de datos sin la envoltura 'attributes'.
 */
function obtenerAtributos(item) {
  return item.attributes ? item.attributes : item;
}

/**
 * Genera los encabezados estándar para las peticiones a la API de Strapi.
 * Incluye el tipo de contenido y el token de autorización.
 * @returns {object} - Un objeto con los encabezados HTTP.
 */
function strapiHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${STRAPI_TOKEN}`,
  };
}

/**
 * Obtiene y cachea el mapa de géneros desde TMDB.
 * Si los géneros ya fueron cargados, los devuelve desde la caché.
 */
async function cargarMapaGeneros() {
  if (Object.keys(mapaGeneros).length) {
    return mapaGeneros;
  }

  const respuesta = await fetch(URL_TMDB_GENEROS);
  if (!respuesta.ok) {
    throw new Error(`No se pudieron obtener los géneros (${respuesta.status})`);
  }

  const data = await respuesta.json();
  (data.genres || []).forEach((genre) => {
    mapaGeneros[genre.id] = genre.name;
  });

  return mapaGeneros;
}

/**
 * Convierte un array de IDs de género en una cadena de texto con los nombres.
 * @param {number[]} genreIds - Array de IDs de géneros (ej: [28, 12]).
 * @returns {string} - Una cadena con los nombres de los géneros separados por comas.
 */
function traducirGeneros(genreIds) {
  if (!Array.isArray(genreIds) || !genreIds.length) {
    return "N/A";
  }

  return (
    genreIds
      .map((id) => mapaGeneros[id])
      .filter(Boolean)
      .join(", ") || "N/A"
  );
}

/**
 * Obtiene el país de origen de una serie, buscando en varios campos posibles.
 * @param {object} serie - El objeto de la serie.
 * @returns {string} - El país de origen o "N/A" si no se encuentra.
 */
function obtenerPaisOrigen(serie) {
  if (Array.isArray(serie.origin_country) && serie.origin_country.length) {
    return serie.origin_country.join(", ");
  }

  return serie.paisOrigen || serie.pais_de_origen || serie.country || "N/A";
}

/**
 * Obtiene un valor numérico de popularidad de un item, buscando en diferentes
 * campos posibles para asegurar la compatibilidad entre TMDB y Strapi.
 * @param {object} item - El objeto de la serie.
 * @returns {number} - El valor de popularidad.
 */
function valorPopularidad(item) {
  const valor =
    item.votos ??
    0;
  return Number(valor) || 0;
}

/**
 * Ordena una lista de series por popularidad en orden descendente.
 * @param {object[]} items - La lista de series a ordenar.
 * @returns {object[]} - Una nueva lista de series ordenada.
 */
function ordenarPorPopularidadDesc(items) {
  return [...items].sort((a, b) => valorPopularidad(b) - valorPopularidad(a));
}

// ========================================================================
// 4. FUNCIONES DE RENDERIZADO Y MANEJO DEL DOM
// ========================================================================

/**
 * Renderiza una lista de series en el contenedor principal de la página.
 * @param {string} titulo - El título que se mostrará sobre la lista.
 * @param {object[]} series - La lista de series a mostrar.
 */
function renderizarSeries(titulo, series) {
  const contenedor = document.getElementById("contenido");
  contenedor.innerHTML = `<h2>${titulo}</h2>`;

  if (!series.length) {
    contenedor.innerHTML += "<p>No se encontraron resultados.</p>";
    return;
  }

  series.forEach((serie) => {
    contenedor.innerHTML += `
            <div class="card">
                <h3>${serie.titulo || "Sin título"}</h3>
                <p><strong>Sinopsis:</strong> ${serie.sinopsis ||"Sin descripción"}</p>
                <p><strong>Fecha de estreno:</strong> ${serie.fechaEstreno || "N/A"}</p>
                <p><strong>País de origen:</strong> ${serie.paisOrigen || "N/A"}</p>
                <p><strong>Votos:</strong> ${serie.votos ?? "N/A"}</p>
                <p><strong>Promedio de votos:</strong> ${serie.promedioVotos ?? "N/A"}</p>
                <p><strong>Géneros:</strong> ${serie.generos || "N/A"}</p>
            </div>
        `;
  });
}

/**
 * Muestra un mensaje de estado (carga, error, etc.) en el contenedor principal.
 * @param {string} titulo - El título del mensaje.
 * @param {string} mensaje - El cuerpo del mensaje.
 */
function mostrarEstadoCarga(titulo, mensaje) {
  const contenedor = document.getElementById("contenido");
  contenedor.innerHTML = `
        <h2>${titulo}</h2>
        <p>${mensaje}</p>
    `;
}

/**
 * Genera un mensaje de error descriptivo basado en el objeto de error.
 * @param {Error} error - El objeto de error capturado en un bloque catch.
 * @returns {string} - Un mensaje de error para el usuario.
 */
function mensajeErrorStrapi(error) {
  const texto = String(error && error.message ? error.message : error || "");

  if (texto.includes("401")) {
    return "Strapi rechazó el token. Revisá que el token sea válido para esta colección.";
  }

  if (texto.includes("403")) {
    return "Strapi no permite acceder a esta colección con los permisos actuales.";
  }

  return "No se pudieron cargar los datos desde TMDB o guardar en Strapi.";
}

// ========================================================================
// 5. LÓGICA DE NEGOCIO Y LLAMADAS A API
// ========================================================================

/**
 * Convierte un objeto de serie de la API de TMDB al formato que espera
 * nuestra colección de Strapi.
 * @param {object} serie - El objeto de serie de TMDB.
 * @returns {object} - Un objeto listo para ser enviado a Strapi.
 */
function toStrapiPayload(serie) {
  return {
    titulo: serie.name,
    sinopsis: serie.overview || "Sin descripción",
    fechaEstreno: serie.first_air_date || "N/A",
    paisOrigen: obtenerPaisOrigen(serie),
    votos: serie.vote_count ?? 0,
    promedioVotos: serie.vote_average ?? 0,
    generos: traducirGeneros(serie.genre_ids),
  };
}

/**
 * Obtiene las 10 series más populares de TMDB, las transforma al formato
 * de Strapi y las devuelve ordenadas.
 */
async function obtenerSeriesTMDB() {
  await cargarMapaGeneros();

  const respuesta = await fetch(URL_TMDB);
  if (!respuesta.ok) {
    throw new Error(`TMDB respondió con HTTP ${respuesta.status}`);
  }

  const data = await respuesta.json();
  return ordenarPorPopularidadDesc(
    (data.results || []).map(toStrapiPayload),
  ).slice(0, 10);
}

/**
 * Elimina todas las series de la colección en Strapi.
 */
async function limpiarStrapi() {
  // Primero obtenemos todas las series existentes
  const respuesta = await fetch(`${URL_STRAPI}?pagination[pageSize]=100`, {
    headers: strapiHeaders(),
  });
  
  if (!respuesta.ok) throw new Error("No se pudieron listar las series para borrar.");
  
  const data = await respuesta.json();
  const series = data.data || [];

  // Borramos cada una por su ID
  for (const serie of series) {
    await fetch(`${URL_STRAPI}/${serie.documentId}`, {
      method: "DELETE",
      headers: strapiHeaders(),
    });
  }
  return series.length;
}

/**
 * Guarda una lista de series en Strapi.
 * Envía una petición POST por cada serie de forma paralela.
 * @param {object[]} series - La lista de series a guardar.
 */
async function guardarSeriesEnStrapi(series) {
  let guardadas = 0;

  for (const serie of series) {
    const respuesta = await fetch(URL_STRAPI, {
      method: "POST",
      headers: strapiHeaders(),
      body: JSON.stringify({ data: serie }),
    });

    if (respuesta.ok) guardadas++;
  }
  
  return guardadas;
}

/**
 * Orquesta el proceso de carga: obtiene las series de TMDB y las guarda en Strapi.
 * Es la función que se ejecuta al presionar el botón "Cargar".
 */
async function cargarDatos() {
  try {
    mostrarEstadoCarga("Procesando...", "Limpiando base de datos y cargando nuevas series...");
    
    // 1. Limpiamos Strapi primero
    const eliminadas = await limpiarStrapi();
    
    // 2. Obtenemos las nuevas de TMDB
    const series = await obtenerSeriesTMDB();
    
    // 3. Guardamos las nuevas
    const guardadas = await guardarSeriesEnStrapi(series);

    mostrarEstadoCarga(
      "Carga completada",
      `Se cargaron las ${guardadas} series más populares.`
    );
  } catch (error) {
    console.error("Error al cargar los datos:", error);
    mostrarEstadoCarga("Error", mensajeErrorStrapi(error));
  }
}

/**
 * Obtiene las series guardadas en Strapi y las muestra en la página.
 * Es la función que se ejecuta al presionar el botón "Visualizar".
 */
async function visualizarDatos() {
  try {
    const respuesta = await fetch(
      `${URL_STRAPI}?pagination[pageSize]=100&sort=votos:desc`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
      },
    );

    if (!respuesta.ok) {
      throw new Error(`Strapi respondió con HTTP ${respuesta.status}`);
    }

    const data = await respuesta.json();
    const series = (data.data || []).map(obtenerAtributos);

    if (!series.length) {
      mostrarEstadoCarga(
        "Sin datos",
        "No hay series guardadas en Strapi todavía.",
      );
      return;
    }

    renderizarSeries("Series almacenadas en Strapi", series.slice(0, 10));
  } catch (error) {
    console.error("Error al visualizar los datos:", error);
    document.getElementById("contenido").innerHTML =
      `<h2>Error</h2><p>${mensajeErrorStrapi(error)}</p>`;
  }
}

// 1. Crear función de búsqueda
async function buscarSeriePorTitulo(titulo) {
  const url = `${URL_STRAPI}?filters[titulo][$eq]=${encodeURIComponent(titulo)}`;

  const respuesta = await fetch(url, {
    method: "GET",
    headers: strapiHeaders(),
  });

  if (!respuesta.ok) return null;

  const data = await respuesta.json();

  // Si Strapi devuelve datos en el array, la serie ya existe
  if (data.data && data.data.length > 0) {
    return data.data[0];
  }

  return null;
}
