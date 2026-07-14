// Configuración básica
const API_KEY = '9e2d2514a392a374be14b36878fac089';
const STRAPI_TOKEN = '8c457faa9e1976eda8492d0c470848626d5e7255008b189a8774819632c1e1c675acd69a6eaca57d7771e1c03e2b93b457f250d8007e6dcda81493b7199c7f76de93730cf2496417a057999bf78d10ddc89b11ecaa0e8787dc3abe97c79f69fde29cd958c93e7eb928419506215d60338d45ed8a9b71704b6c09a2050a64f86f';
const URL_TMDB = `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&first_air_date.gte=2020-01-01&language=es-ES&sort_by=popularity.desc&page=1`;
const URL_TMDB_GENEROS = `https://api.themoviedb.org/3/genre/tv/list?api_key=${API_KEY}&language=es-ES`;
const URL_STRAPI = 'https://gestionweb.frlp.utn.edu.ar/api/g11-populares-series';

// Eventos de botones
document.getElementById('btnCargar').addEventListener('click', cargarDatos);
document.getElementById('btnVisualizar').addEventListener('click', visualizarDatos);

function obtenerAtributos(item) {
    return item.attributes ? item.attributes : item;
}

function strapiHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${STRAPI_TOKEN}`
    };
}

const mapaGeneros = {};

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

function traducirGeneros(genreIds) {
    if (!Array.isArray(genreIds) || !genreIds.length) {
        return 'N/A';
    }

    return genreIds
        .map((id) => mapaGeneros[id])
        .filter(Boolean)
        .join(', ') || 'N/A';
}

function obtenerPaisOrigen(serie) {
    if (Array.isArray(serie.origin_country) && serie.origin_country.length) {
        return serie.origin_country.join(', ');
    }

    return serie.paisOrigen || serie.pais_de_origen || serie.country || 'N/A';
}

function valorPopularidad(item) {
    const valor = item.popularidad ?? item.popularity ?? item.votos ?? item.vote_count ?? item.promedioVotos ?? item.vote_average ?? 0;
    return Number(valor) || 0;
}

function ordenarPorPopularidadDesc(items) {
    return [...items].sort((a, b) => valorPopularidad(b) - valorPopularidad(a));
}

function renderizarPeliculas(titulo, peliculas) {
    const contenedor = document.getElementById('contenido');
    contenedor.innerHTML = `<h2>${titulo}</h2>`;

    if (!peliculas.length) {
        contenedor.innerHTML += '<p>No se encontraron resultados.</p>';
        return;
    }

    peliculas.forEach((pelicula) => {
        contenedor.innerHTML += `
            <div class="card">
                <h3>${pelicula.titulo || pelicula.name || pelicula.title || 'Sin título'}</h3>
                <p><strong>Sinopsis:</strong> ${pelicula.sinopsis || pelicula.overview || pelicula.descripcion || 'Sin descripción'}</p>
                <p><strong>Fecha de estreno:</strong> ${pelicula.fechaEstreno || pelicula.first_air_date || pelicula.release_date || 'N/A'}</p>
                <p><strong>País de origen:</strong> ${pelicula.paisOrigen || pelicula.origin_country || 'N/A'}</p>
                <p><strong>Votos:</strong> ${pelicula.votos ?? pelicula.vote_count ?? pelicula.cantidadVotos ?? pelicula.catidad_de_votos ?? 'N/A'}</p>
                <p><strong>Promedio de votos:</strong> ${pelicula.promedioVotos ?? pelicula.vote_average ?? pelicula.promedio_votos ?? 'N/A'}</p>
                <p><strong>Géneros:</strong> ${pelicula.generos || 'N/A'}</p>
            </div>
        `;
    });
}

function mostrarEstadoCarga(titulo, mensaje) {
    const contenedor = document.getElementById('contenido');
    contenedor.innerHTML = `
        <h2>${titulo}</h2>
        <p>${mensaje}</p>
    `;
}

function mensajeErrorStrapi(error) {
    const texto = String(error && error.message ? error.message : error || '');

    if (texto.includes('401')) {
        return 'Strapi rechazó el token. Revisá que el token sea válido para esta colección.';
    }

    if (texto.includes('403')) {
        return 'Strapi no permite acceder a esta colección con los permisos actuales.';
    }

    return 'No se pudieron cargar los datos desde TMDB o guardar en Strapi.';
}

function toStrapiPayload(serie) {
    return {
        titulo: serie.name,
        sinopsis: serie.overview || 'Sin descripción',
        fechaEstreno: serie.first_air_date || 'N/A',
        paisOrigen: obtenerPaisOrigen(serie),
        votos: serie.vote_count ?? 0,
        promedioVotos: serie.vote_average ?? 0,
        popularidad: serie.popularity ?? 0,
        generos: traducirGeneros(serie.genre_ids)
    };
}

async function obtenerSeriesTMDB() {
    await cargarMapaGeneros();

    const respuesta = await fetch(URL_TMDB);
    if (!respuesta.ok) {
        throw new Error(`TMDB respondió con HTTP ${respuesta.status}`);
    }

    const data = await respuesta.json();
    return ordenarPorPopularidadDesc((data.results || []).map(toStrapiPayload)).slice(0, 10);
}

async function guardarSeriesEnStrapi(series) {
    let guardadas = 0;

    for (const serie of series) {
        const respuesta = await fetch(URL_STRAPI, {
            method: 'POST',
            headers: strapiHeaders(),
            body: JSON.stringify({ data: serie })
        });

        if (!respuesta.ok) {
            throw new Error(`Strapi respondió con HTTP ${respuesta.status}`);
        }

        guardadas += 1;
    }

    return guardadas;
}

// 1. Cargar datos desde TMDB y guardarlos en Strapi
async function cargarDatos() {
    try {
        const series = await obtenerSeriesTMDB();
        const guardadas = await guardarSeriesEnStrapi(series);

        mostrarEstadoCarga('Carga completada', `Se guardaron correctamente ${guardadas} series en Strapi.`);
    } catch (error) {
        console.error('Error al cargar los datos:', error);
        mostrarEstadoCarga('Error', mensajeErrorStrapi(error));
    }
}

// 2. Visualizar las series almacenadas en Strapi
async function visualizarDatos() {
    try {
        const respuesta = await fetch(`${URL_STRAPI}?pagination[pageSize]=100&sort=popularidad:desc`, {
            headers: {
                Authorization: `Bearer ${STRAPI_TOKEN}`
            }
        });

        if (!respuesta.ok) {
            throw new Error(`Strapi respondió con HTTP ${respuesta.status}`);
        }

        const data = await respuesta.json();
        const series = (data.data || []).map(obtenerAtributos);

        if (!series.length) {
            mostrarEstadoCarga('Sin datos', 'No hay series guardadas en Strapi todavía.');
            return;
        }

        renderizarPeliculas('Series almacenadas en Strapi', series.slice(0, 10));
    } catch (error) {
        console.error('Error al visualizar los datos:', error);
        document.getElementById('contenido').innerHTML = `<h2>Error</h2><p>${mensajeErrorStrapi(error)}</p>`;
    }
}