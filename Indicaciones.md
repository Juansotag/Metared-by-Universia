# Dashboard para MetaRed de Universia y Banco Santander

## ¿Quién es Universia y MetaRed

- **Fundación Universia:** Trabajamos para impulsar sociedades más justas e inclusivas, potenciando la autonomía, el bienestar económico y la cohesión social de personas con discapacidad y otros colectivos en situación de vulnerabilidad en entornos educativos y laborales.

Los 3 ámbitos de colaboración principales sobre los que se trabaja son: transformación digital (MetaRed TIC), emprendimiento universitario (MetaRed X) y sostenibilidad y responsabilidad social (MetaRed ESG). Este es un proyecto de MetaRed ESG.

- **Banco Santander:** Uno de los mayores bancos de España, lleva más de 30 años destinando más de 2.500 millones de euros en colaboración con más de 1.000 universidades y organizaciones, y hemos ayudado a más de 8,3 millones de personas y empresas.

- **MetaRed Iberoamérica:** MetaRed es un proyecto colaborativo que conforma una red de redes de responsables de Tecnologías de la Información y la Comunicación (TICs) de IES Iberoamericanas, tanto públicas como privadas, con el objetivo de compartir mejores prácticas, casos de éxito y realizar desarrollos tecnológicos colaborativos.

## ¿Qué es MetaRed ESG

Es uno de los tres principales ejes de actuación de MetaRed. Centra su trabajo en establecer una red de redes de apoyo a la Responsabilidad Social Universitaria y cumplimiento de los ODS en países del Espacio Iberoamericano del Conocimiento. El objetivo es crear sinergias en las comunidades universitarias, dotarles de herramientas y compartir mejores prácticas.

## ¿Cuál es el objetivo

MetaRed ESG busca construir un **dashboard interactivo** para la publicación y análisis de los **resultados de la encuesta** "Análisis internacional de implementación de políticas de sostenibilidad en IES", junto con los **resultados de su repositorio de buenas prácticas**.

Para esta encuesta y su material relacionado, se usa el ícono de MetaRed S, no el de MetaRed ESG.

## ¿Qué tenemos que entregar?

- El entregable será una página funcional, desplegada en arquitectura de Railway en un repositorio privado que será compartido para que MetaRed ESG pueda editar el contenido y subirlo en su propia arquitectura.
- Este entregable tiene que tener una apariencia y experiencia de usuario (UX) similar al de la página existente de MetaRed ESG, manteniendo colores, tipo de letra, íconos y estructura igual al de las páginas existentes.

## ¿Qué información tenemos?

- Un Excel con los resultados de la encuesta "Análisis internacional de implementación de políticas de sostenibilidad en IES" (99 columnas × 148 filas).
- Un Excel con los casos de buenas prácticas (36 columnas × 77 filas).
- El HTML completo descargado de la página de Universia ESG como referencia visual.
- Un documento `dashboard_descripcion.md` con la descripción estructural del dashboard previo construido en Looker Studio.

---

## Estructura de los datos

### Excel de encuesta (99 columnas × 148 filas)

Cada fila es una IES respondente. Las columnas se agrupan así:

**Metadatos de la respuesta** (columnas 1–9, no se usan en el dashboard):
`Fecha de inicio`, `Fecha final`, `Tipo de respuesta`, `Dirección IP`, `Progreso`, `Duración`, `Finalizado`, `Fecha registrada`, `ID de respuesta`

**Identificación de la IES** (columnas 10–22):
- `Nombre de la institución` — nombre oficial
- `País` — código de país (AR, BR, CL, CO, EC, ES, MX, PE)
- `Titularidad de la Universidad` — Pública / Privada / Mixta
- `Carácter de la Universidad` — Generalista / Especializada / Otra
- `Año de constitución de la Universidad`
- `Nº de empleados promedio en el año 2024`
- `Nº de estudiantes matriculados en titulaciones presenciales`
- `Nº de estudiantes matriculados en titulaciones virtuales`
- `Nº de estudiantes matriculados en titulaciones híbridas`
- `Porcentaje de estudiantes matriculados procedentes de otros países`
- `Nº aproximado de Edificios`
- `Persona de contacto`, `Correo electrónico de contacto` (no se muestran en el dashboard)

**Indicadores básicos** (columnas 23–28, valores numéricos continuos):
- `Consumo total de energía por año en kWh/año`
- `Huella de carbono institucional (Alcance 1+2) en tCO2e/año`
- `Porcentaje de residuos sólidos reciclados o valorizados respecto al total`
- `Consumo total de agua por año en m3/año`
- `Proporción de áreas verdes por superficie construida en m2 verde / m2 construido`
- `Presupuesto ambiental institucional por año en USD/año`

**Dimensión Gobernanza** (columnas 29–51, valores binarios: `Dispone` / `No dispone`):
23 preguntas de Sí/No sobre políticas institucionales. Ver lista completa en `dashboard_descripcion.md`, sección Página 5.

**Dimensión Ambiental** (columnas 52–61, escala 1–5):
10 preguntas sobre grado de desarrollo de medidas ambientales. Ver lista completa en `dashboard_descripcion.md`, sección Página 3.

**Dimensión Social** (columnas 62–80, escala 1–5):
18 preguntas sobre grado de desarrollo de medidas sociales. Ver lista completa en `dashboard_descripcion.md`, sección Página 4.

**Scores calculados** (columnas 81–90, ya calculados en el Excel):
- `Gobernanza` — puntuación numérica
- `Ambiental` — puntuación numérica (media de las 10 preguntas)
- `Social` — puntuación numérica (media de las 18 preguntas)
- `dimensionGobernanza` — versión normalizada o alternativa
- `dimensionAmbiental` — versión normalizada o alternativa
- `dimensionSocial` — versión normalizada o alternativa
- `Sello Compromiso`, `Sello Liderazgo`, `Sello Transformación`, `Sello final` — clasificación final de cada IES

**Campo libre** (columna 81): `Si tiene algún comentario o sugerencia sobre la encuesta` — no se usa en el dashboard.

---

### Excel de buenas prácticas (36 columnas × 77 filas)

Cada fila es un caso de buena práctica. Las columnas relevantes son:

**Identificación y contenido**:
- `País` — código de país (AR, BR, CL, CO, EC, ES, MX, PE)
- `Título (ES)` / `Título (PT)` / `Título (EN)` — título en tres idiomas
- `Resumen (ES)` / `Resumen (PT)` / `Resumen (EN)` — descripción larga en tres idiomas
- `Fecha Registro` — fecha de publicación
- `Es Destacado` — Sí / No, para filtrar casos destacados
- `Texto Destacado (ES/PT/EN)` — texto corto para mostrar en tarjeta destacada

**Responsable**:
- `Nombre Responsable`, `Cargo Responsable`, `Unidad Responsable`, `Email Responsable`

**Recursos visuales y enlaces**:
- `URL Imagen Destacada` — imagen de portada de la tarjeta
- `URL Origen` — enlace a la fuente original
- `Nombre Origen (ES/PT/EN)` — nombre visible del enlace
- `Latitud` / `Longitud` — coordenadas para mapa opcional

**Clasificación temática** (campos multivalor separados por `;`):
- `Temáticas` — categoría principal: `Ambiental`, `Social`, `Gobernanza`, `Académica`
- `Subtemáticas - Ambiental` — p.ej. `Circularidad y Residuos`
- `Subtemáticas - Gobernanza` — p.ej. `Alianzas`
- `Subtemáticas - Social` — p.ej. `Compromiso Social y Voluntariado`
- `Subtemáticas - Académica` — p.ej. `Innovación Educativa en ODS`

**Recurso adjunto**:
- `Recurso 1 - Tipo` — `doc`, `video`, `link`, etc.
- `Recurso 1 - URL` — enlace directo al documento o recurso
- `Recurso 1 - ES/PT/EN` — etiqueta visible del recurso

---

## Plan de trabajo para Antigravity

### Paso 1 — Análisis visual de la página ejemplo

Abrir los archivos de la carpeta `página ejemplo` (HTML descargado de Universia ESG). Leer el HTML y el CSS asociado y producir un archivo `estilo_referencia.md` que documente:

- **Paleta de colores**: extraer los códigos hex exactos usados en fondo, texto principal, texto secundario, bordes, botones, estados hover y highlights. La paleta esperada incluye rojo institucional, gris, blanco y negro.
- **Tipografía**: identificar la familia de fuente en el CSS (`font-family`). Si es una fuente web externa (Google Fonts), anotar el enlace de importación. Si está embebida como `.woff2`, copiar el archivo a `/assets/fonts/` y anotar la ruta.
- **Íconos**: determinar si usan una librería (Font Awesome, Material Icons, Lucide, etc.) o SVGs propios. Listar los íconos específicos que aparecen en la navegación y en las secciones de contenido. El ícono de MetaRed S (distinto al de MetaRed ESG) debe identificarse y guardarse por separado.
- **Estructura del layout**: documentar el header (logo, navegación, idioma), el footer (columnas, enlaces, logo), y el grid general de contenido. Anotar las clases CSS más relevantes para poder replicarlas.

---

### Paso 2 — Armado del proyecto base

Crear la estructura de carpetas del repositorio:

```
/assets
  /fonts        ← archivos .woff2 si no están en CDN
  /icons        ← SVGs propios de MetaRed S
  /css
    main.css    ← variables de color, tipografía, reset
    dashboard.css
  /js
    filters.js  ← lógica de filtros interactivos
    charts.js   ← inicialización de gráficas
/data
  encuesta.json         ← Excel exportado a JSON
  buenas_practicas.json ← Excel exportado a JSON
/templates
  header.html
  footer.html
app.py          ← servidor Flask para Railway
index.html
requirements.txt
railway.json o Procfile
```

Instalar las dependencias necesarias: **Flask** como servidor, **Pandas** para procesar los Excel, **Plotly** (o Chart.js vía CDN) para las gráficas. Configurar el `Procfile` o `railway.json` para que Railway ejecute `app.py` correctamente.

Exportar ambos Excel a JSON en el momento de arrancar el servidor (o de forma estática si los datos no cambian frecuentemente), para que el frontend los consuma directamente sin depender de Excel en producción.

---

### Paso 3 — Página HTML base

Construir un `index.html` vacío que replique fielmente el header y footer de la página ejemplo, aplicando los estilos extraídos en el Paso 1. El header debe incluir el logo de MetaRed S (no el de MetaRed ESG), la navegación entre secciones del dashboard y el selector de idioma (ES / PT / EN). Verificar que el resultado sea visualmente idéntico a la referencia en desktop antes de continuar. Este archivo será la plantilla base de todas las vistas.

---

### Paso 4 — Preprocesamiento de los datos

Con Pandas, procesar ambos archivos Excel y calcular los agregados que necesita el dashboard. Para la **encuesta**:

- Calcular total de IES, distribución por país, por tipología (Pública/Privada/Mixta) y por carácter (Generalista/Especializada).
- Sumar estudiantes presenciales + virtuales + híbridos por IES y por país; calcular mediana, media, mín. y máx.
- Para cada uno de los 4 indicadores básicos (energía, carbono, residuos, agua): calcular total, media, mediana, mín., máx. y número de muestras válidas, tanto global como por país.
- Para gobernanza: convertir `Dispone`/`No dispone` a 1/0, calcular el porcentaje de respuestas positivas por pregunta (global y por país), y calcular el score global como promedio de las 23 preguntas.
- Para ambiental y social: calcular la media de cada subindicador (global y por país) y la media global de la dimensión.

Para las **buenas prácticas**:
- Separar los campos multivalor de `Temáticas` y `Subtemáticas` (están separados por `;`) para poder filtrar por categoría.
- Preparar una estructura de tarjeta por fila con: título, resumen, país, temáticas, imagen, URL origen, recurso adjunto y si es destacado.

Guardar los resultados procesados como JSON en `/data/` para que el frontend los lea directamente.

---

### Paso 5 — Construcción del dashboard de la encuesta

Replicar las vistas del dashboard previo siguiendo la estructura documentada en `dashboard_descripcion.md`. El orden de construcción sugerido es:

1. **Resumen de la muestra**: tarjetas KPI, gráfico de barras por país, donut de tipología y carácter, barras apiladas al 100% de modalidad, y tabla con estadísticos por país.
2. **Indicadores básicos**: para cada uno de los 4 indicadores, una fila de 6 KPIs y una tabla por país con barra visual proporcional en la columna Media.
3. **Dimensión Ambiental**: gauge/donut global, barras por país con línea de media, y dos gráficos de radar (uno global, uno por países superpuestos).
4. **Dimensión Social**: misma estructura que Ambiental.
5. **Dimensión Gobernanza**: gauge/donut global, barras por país, y luego las 23 preguntas binarias cada una con su donut global y su barra apilada por país.

El filtro por país debe ser un dropdown global que, al cambiar, recalcule y re-renderice todos los elementos de la vista activa. Aplicar en cada elemento la paleta de colores y tipografía de la página ejemplo.

---

### Paso 6 — Gráficas y filtros adicionales

Una vez replicado el dashboard base, añadir:

- Filtros adicionales por **tipología** (Pública / Privada / Mixta) y por **carácter** (Generalista / Especializada), aplicables en combinación con el filtro de país.
- En la vista de Indicadores Básicos, agregar una gráfica de dispersión o boxplot por país para visualizar la distribución de valores (no solo la media).
- En las dimensiones Ambiental y Social, permitir seleccionar subindicadores específicos para comparar países en una barra agrupada.
- Vista de **sellos**: mostrar cuántas IES tienen cada sello (Compromiso / Liderazgo / Transformación) por país.

---

### Paso 7 — Dashboard de buenas prácticas

Construir una sección independiente debajo del dashboard de la encuesta. El diseño es una **grilla de tarjetas** filtrables, donde cada tarjeta muestra:

- Imagen de portada (`URL Imagen Destacada`)
- País
- Título en el idioma activo (ES / PT / EN)
- Resumen corto (primeras líneas del resumen o `Texto Destacado` si `Es Destacado = Sí`)
- Etiquetas de temáticas y subtemáticas
- Enlace al recurso adjunto y/o a la fuente original

Los filtros de esta sección son: **país**, **temática principal** (Ambiental / Social / Gobernanza / Académica) y **subtemática**. Opcionalmente, incluir un mapa con los puntos de latitud/longitud de cada práctica.

---

### Paso 8 — Chat LLM con Claude

Integrar un widget de chat al pie de la página usando la API de Claude (`claude-sonnet-4-20250514`). El sistema debe:

- Recibir como contexto en el system prompt: los datos procesados de la encuesta (JSON resumido por país y dimensión), los datos de buenas prácticas (JSON completo), y los textos de los PDFs de buenas prácticas si están disponibles.
- Poder responder preguntas en lenguaje natural sobre los datos: comparar países, explicar qué significa un indicador, listar buenas prácticas por temática, o describir el desempeño de una dimensión.
- Responder en el mismo idioma en que se le pregunta (ES / PT / EN).
- Tener un diseño visual coherente con el resto del dashboard (colores, tipografía, bordes).