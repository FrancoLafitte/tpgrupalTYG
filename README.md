# Trabajo Práctico Grupal - Grupo 11

> **UTN FRLP - Tecnología y Gestión Web S32 - Grupo 11**
> 
> Temática: Series Populares, TMDB, Strapi

## Integrantes del grupo

| Nombre y Apellido |
|---|
| Franco Lafitte |
| Lautaro Eleno |
| Santiago Meccico |

## Problema asignado

Obtener las **10 series más populares** desde la API de TMDB y almacenar de cada una:

- Título
- Sinopsis
- Fecha de estreno
- Cantidad de votos
- Promedio de votos
- Género/s
- País de origen

## Definición del proyecto y arquitectura

El proyecto es una aplicación web simple (HTML + CSS + JavaScript vanilla, sin frameworks ni build tools) que actúa como intermediaria entre dos APIs externas:

- **TMDB (The Movie Database)**: fuente de los datos de series de TV, consumida vía `fetch` desde el navegador con una API Key.
- **Strapi**: backend headless utilizado como base de datos persistente, donde se guardan las series obtenidas de TMDB, consumido vía `fetch` con un token Bearer.

### Arquitectura general

```
┌─────────────┐      GET (discover/tv, genre/tv/list)      ┌──────────────┐
│  Navegador  │ ──────────────────────────────────────────▶│     TMDB     │
│  (cliente)  │◀────────────────────────────────────────── │      API     │
│             │              JSON series/géneros            └──────────────┘
│  index.html │
│  style.css  │      GET / POST / PUT (colección series)    ┌──────────────┐
│  script.js  │ ──────────────────────────────────────────▶│    Strapi    │
│             │◀────────────────────────────────────────── │   (backend)  │
└─────────────┘              JSON series guardadas          └──────────────┘
```

No hay servidor propio: todo corre client-side. El navegador hace las peticiones directamente tanto a TMDB como a Strapi, y el DOM se actualiza dinámicamente según la respuesta.

### Flujo de la aplicación

1. El usuario hace clic en **"Cargar Datos de API"** → se disparan las peticiones a TMDB, se transforman los datos y se guardan/actualizan en Strapi.
2. El usuario hace clic en **"Visualizar Datos"** → se consulta la colección en Strapi y se renderizan las series como tarjetas (`cards`) en pantalla.

## Descripción de las tareas realizadas

| Tarea | Descripción | Integrante Responsable |
|---|---|---|
| Investigación del sitio developer.themoviedb.org | Exploración de la documentación oficial de TMDB, identificación de los endpoints necesarios (`discover/tv`, `genre/tv/list`) y sus parámetros | Lautaro Eleno, Santiago Meccico |
| Creación de cuenta y autenticación en TMDB | Registro en TMDB, generación de la API Key para autenticar las peticiones | Franco Lafitte, Santiago Meccico |
| Relevamiento de las APIs necesarias | Análisis y selección de los endpoints de TMDB y diseño de la colección de Strapi para cubrir el problema asignado | Franco Lafitte, Santiago Meccico |
| Bosquejo del frontend | Diseño de la estructura HTML (header, aside con navegación, main de contenido, footer) y hoja de estilos | Franco Lafitte, Lautaro Eleno |
| Desarrollo de la lógica de consumo de TMDB | Función `obtenerSeriesTMDB`, mapeo de géneros (`cargarMapaGeneros`, `traducirGeneros`), transformación de datos (`toStrapiPayload`) | Lautaro Eleno, Franco Lafitte |
| Desarrollo de la integración con Strapi | Funciones de guardado/actualización (`guardarSeriesEnStrapi`), búsqueda por título (`buscarSeriePorTitulo`), lectura de datos (`visualizarDatos`) | Franco Lafitte, Lautaro Eleno, Santiago Meccico |
| Renderizado y manejo del DOM | Funciones `renderizarPeliculas`, `mostrarEstadoCarga`, manejo de errores (`mensajeErrorStrapi`) | Franco Lafitte, Lautaro Eleno |
| Estilado (CSS) | Maquetado con Flexbox, estilos de tarjetas, botones y encabezados | Franco Lafitte, Santiago Meccico |
| Documentación del proyecto | Redacción de este documento | Lautaro Eleno, Santiago Meccico, Franco Lafitte |

## Relevamiento de las APIs utilizadas

### TMDB (The Movie Database)

| Endpoint | Método | Uso en el proyecto |
|---|---|---|
| `/3/discover/tv` | GET | Obtiene el listado de series de TV, filtradas por fecha de estreno (`first_air_date.gte=2020-01-01`), en español (`language=es-ES`) y ordenadas por popularidad descendente (`sort_by=popularity.desc`) |
| `/3/genre/tv/list` | GET | Obtiene el catálogo completo de géneros de series (id + nombre) en español, para poder traducir los `genre_ids` numéricos a nombres legibles |

**Autenticación:** mediante `api_key` como query param en la URL.

**Parámetros clave utilizados:**
- `language=es-ES`: contenido en español
- `sort_by=popularity.desc`: orden por popularidad
- `page=1`: primera página de resultados

De la respuesta se extraen y transforman los primeros 10 resultados (ordenados localmente por popularidad, ver `ordenarPorPopularidadDesc`) hacia el formato que espera Strapi.

### Strapi (backend propio del curso)

Colección utilizada: `g11-populares-series`, expuesta en:
`https://gestionweb.frlp.utn.edu.ar/api/g11-populares-series`

| Endpoint | Método | Uso en el proyecto |
|---|---|---|
| `/api/g11-populares-series?filters[titulo][$eq]={titulo}` | GET | Busca si una serie ya existe por título, para decidir si crear o actualizar (`buscarSeriePorTitulo`) |
| `/api/g11-populares-series` | POST | Crea una nueva serie si no existía previamente |
| `/api/g11-populares-series/{id}` | PUT | Actualiza una serie ya existente |
| `/api/g11-populares-series?pagination[pageSize]=100&sort=votos:desc` | GET | Trae hasta 100 series guardadas, ordenadas por cantidad de votos descendente, para visualizarlas |

**Autenticación:** mediante header `Authorization: Bearer {token}` en todas las peticiones.

> **Nota importante sobre seguridad:** actualmente la API Key de TMDB y el token de Strapi están escritos directamente ("hardcodeados") en `script.js`, un archivo que se descarga y es visible en el navegador de cualquier usuario. Para un entorno real de producción esto debería evitarse (por ejemplo, usando variables de entorno y un backend intermedio que oculte las credenciales), pero se documenta así porque es la forma en que está resuelto en este TP académico.

## Estructura de datos en Strapi

Campos definidos en la colección `g11-populares-series`:

| Campo | Tipo | Descripción |
|---|---|---|
| `titulo` | Texto | Título de la serie (proviene de `serie.name` en TMDB) |
| `sinopsis` | Texto largo | Descripción/resumen de la serie (`overview`) |
| `fechaEstreno` | Texto/Fecha | Fecha de primera emisión (`first_air_date`) |
| `paisOrigen` | Texto | País(es) de origen (`origin_country`) |
| `votos` | Número | Cantidad de votos recibidos (`vote_count`) |
| `promedioVotos` | Número (decimal) | Promedio de las calificaciones (`vote_average`) |
| `generos` | Texto | Nombres de los géneros, separados por comas, ya traducidos desde los `genre_ids` |

Esta estructura es generada por la función `toStrapiPayload(serie)` en `script.js`, que mapea cada serie cruda de TMDB al formato esperado por la colección de Strapi.

## Bosquejo del frontend

La interfaz se divide en cuatro bloques principales:

```
┌───────────────────────────────────────────────────┐
│  HEADER: logo + título "Trabajo Práctico: ..."     │
├───────────┬─────────────────────────────────────────┤
│           │                                         │
│  ASIDE    │              MAIN (#contenido)          │
│  (nav)    │                                         │
│ - Cargar  │   Mensaje inicial / listado de series   │
│   Datos   │   renderizado como tarjetas (cards):    │
│ - Visua-  │   título, sinopsis, fecha, país,        │
│   lizar   │   votos, promedio, géneros              │
│           │                                         │
├───────────┴─────────────────────────────────────────┤
│  FOOTER: "TygWeb 2026"                              │
└───────────────────────────────────────────────────┘
```

- **Header**: logo (SVG inline) y título del trabajo.
- **Aside**: menú de navegación con dos botones (`btnCargar`, `btnVisualizar`) que disparan las funciones principales de la app.
- **Main (`#contenido`)**: zona dinámica donde se muestran mensajes de estado (carga, error) y las tarjetas de resultados.
- **Footer**: pie de página fijo.

El layout se resuelve con **Flexbox**: el `body` es una columna (header/contenido/footer) y `.contenedor-central` es una fila que reparte 20% para el aside y 80% para el main.

## Reglas de negocio aplicadas

1. **Top 10 por popularidad**: de todos los resultados que devuelve TMDB, solo se conservan las 10 series más populares (`ordenarPorPopularidadDesc(...).slice(0, 10)`).
2. **Filtro por antigüedad**: solo se consideran series estrenadas a partir del 1° de enero de 2020 (`first_air_date.gte=2020-01-01`).
3. **No duplicar registros**: antes de guardar una serie se busca por título exacto en Strapi (`buscarSeriePorTitulo`); si existe, se actualiza (`PUT`) en lugar de crear un registro nuevo (`POST`).
4. **Traducción de géneros**: los géneros de TMDB llegan como IDs numéricos; se traducen a nombres legibles en español consultando y cacheando el catálogo de géneros (`mapaGeneros`) para no repetir peticiones innecesarias.
5. **Compatibilidad de campos entre orígenes**: las funciones de utilidad (`valorPopularidad`, `obtenerPaisOrigen`, `obtenerAtributos`) contemplan que los datos puedan venir tanto de TMDB (inglés, `snake_case`) como de Strapi (español), evitando errores al renderizar.
6. **Manejo de errores diferenciado**: se distinguen errores 401 (token inválido) y 403 (sin permisos) de Strapi, mostrando un mensaje específico al usuario en cada caso (`mensajeErrorStrapi`).

## Tecnologías utilizadas

- **HTML5**: estructura semántica de la página (`header`, `aside`, `main`, `footer`, `nav`).
- **CSS3**: maquetado con Flexbox, efectos de sombra de texto, tarjetas con `box-shadow`, transiciones en botones.
- **JavaScript (ES6+, vanilla)**: `fetch` API, `async/await`, manipulación del DOM, template literals.
- **TMDB API**: fuente de datos de series de TV.
- **Strapi**: CMS headless utilizado como backend/base de datos.

## Funcionamiento de la solución

1. Al abrir `index.html`, se muestra un mensaje de bienvenida y dos botones en el menú lateral.
2. **Botón "Cargar Datos de API"** (`cargarDatos`):
   - Descarga el catálogo de géneros de TMDB (una sola vez, cacheado).
   - Descarga las series más populares desde `discover/tv`.
   - Transforma cada serie al formato de Strapi (`toStrapiPayload`).
   - Ordena localmente por popularidad y toma las 10 primeras.
   - Por cada serie, busca si ya existe en Strapi por título: si existe la actualiza (`PUT`), si no la crea (`POST`).
   - Muestra un resumen con la cantidad de series creadas y actualizadas.
3. **Botón "Visualizar Datos"** (`visualizarDatos`):
   - Consulta la colección completa en Strapi, ordenada por votos descendente.
   - Renderiza cada serie como una tarjeta con título, sinopsis, fecha de estreno, país de origen, votos, promedio de votos y géneros.
   - Si no hay datos guardados, informa al usuario.
4. Ante cualquier error de red o de la API (por ejemplo, token inválido), se muestra un mensaje descriptivo en pantalla en lugar de dejar la interfaz en blanco.

## Cómo ejecutar el programa

1. Clonar o descargar el proyecto, asegurándose de mantener la estructura de carpetas:
   ```
   /
   ├── index.html
   ├── css/
   │   └── style.css
   └── js/
       └── script.js
   ```
2. No requiere instalación de dependencias ni build (es HTML/CSS/JS puro).
3. Abrir `index.html` directamente en el navegador, o servirlo con un servidor local simple (recomendado para evitar restricciones de CORS/`file://`), por ejemplo:
   ```bash
   npx serve .
   # o
   python3 -m http.server 8080
   ```
4. Verificar que la API Key de TMDB y el token de Strapi configurados en `script.js` sean válidos.
5. Usar el botón **"Cargar Datos de API"** para poblar Strapi con las series más populares, y **"Visualizar Datos"** para consultarlas.

## Conclusiones

> Creemos que se trata de un firme proyecto grupal que nos sirvió tanto para aprender nuevas tecnologías, como para solidificar los conceptos que ya veníamos trayendo de materias anteriores de lógica y manejo de estructuras. Si bien gran parte de la lógica no tuvimos grandes dificultades para llevarla a cabo, nos tuvimos que tomar un tiempo para entender de forma correcta STRAPI y el manejo de algunas APIs. Este proyecto nos da una base sólida para poder preparar mejores trabajos.
