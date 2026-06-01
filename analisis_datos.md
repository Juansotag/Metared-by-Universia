# Análisis del Contenido y Estructura de Datos (Paso 4)

Este documento detalla el análisis estructural, de contenido y la distribución de los dos archivos de datos Excel provistos para la construcción de la herramienta de MetaRed S: `encuesta.xlsx` y `buenas_practicas.xlsx`.

---

## 1. Encuesta de Sostenibilidad (`encuesta.xlsx`)

### Resumen General
- **Dimensiones de la matriz:** 152 filas × 100 columnas.
- **Registros válidos:** Existen **131 registros con respuestas completas**. Hay 21 filas al final de la matriz que contienen el nombre de la institución pero tienen valores nulos (`NaN`) en la gran mayoría de los metadatos y respuestas del cuestionario (constitución de la universidad, número de edificios, consumo de energía, etc.). 
  * *Recomendación de limpieza:* Estas 21 filas vacías/incompletas deben ser filtradas en la carga inicial (`pandas.dropna` o filtro por columna clave) para evitar sesgos en los KPI del dashboard.

### Desglose y Distribución de la Muestra (Sobre 131 IES Válidas)

#### Distribución por País:
Las 131 instituciones se distribuyen en 8 países de Iberoamérica:
1. **España (ES):** 48 IES (36.6%)
2. **Brasil (BR):** 26 IES (19.8%)
3. **México (MX):** 22 IES (16.8%)
4. **Chile (CL):** 17 IES (13.0%)
5. **Colombia (CO):** 14 IES (10.7%)
6. **Argentina (AR):** 11 IES (8.4%)
7. **Perú (PE):** 10 IES (7.6%)
8. **Ecuador (EC):** 4 IES (3.1%)

#### Distribución por Titularidad (Propiedad):
- **Pública:** 66 IES (50.4%)
- **Privada:** 61 IES (46.6%)
- **Mixta:** 5 IES (3.8%)

#### Distribución por Carácter:
- **Generalista:** 101 IES (77.1%)
- **Especializada:** 31 IES (23.9%)

---

### Análisis de Indicadores Básicos y Continuos

El Excel contiene 6 indicadores numéricos clave sobre el impacto ambiental institucional:

1. **Consumo total de energía por año (kWh/año):** 
   - Rango muy amplio debido a la diferencia de escala de las IES.
   - Datos válidos en 131 filas.
2. **Huella de carbono institucional - Alcance 1+2 (tCO2e/año):**
   - 95 valores únicos. Muestra un número significativo de universidades que aún no calculan o no reportan su huella (registros con 0 o nulos parciales).
3. **Porcentaje de residuos sólidos reciclados o valorizados (%):**
   - 54 valores únicos. Rango entre 0% y 100%.
4. **Consumo total de agua por año (m³/año):**
   - 112 valores únicos.
5. **Proporción de áreas verdes por superficie construida (m² verde / m² construido):**
   - 67 valores únicos.
6. **Presupuesto ambiental institucional por año (USD/año):**
   - 90 valores únicos.

---

### Análisis de Dimensiones y Scores Calculados

El Excel ya incluye la normalización y cálculo de scores para las tres dimensiones del dashboard Looker previo, así como la clasificación de Sellos:

1. **Gobernanza:**
   - Evaluado mediante **22 preguntas binarias (Dispone / No dispone)** (columnas 39 a 60).
   - Score calculado en columna `Gobernanza` (rango 1 a 22, media de 17.5).
   - Versión normalizada en `dimensionGobernanza` (escala 0.0 a 1.0, media de 0.79 / 79.5%).
2. **Ambiental:**
   - Evaluado mediante **10 preguntas con escala del 1 al 5** (columnas 61 a 70).
   - Score calculado en columna `Ambiental` (rango 10 a 50, media de 34.1).
   - Versión normalizada en `dimensionAmbiental` (escala 1.0 a 5.0, media de 3.41).
3. **Social:**
   - Evaluado mediante **18 preguntas con escala del 1 al 5** (columnas 71 a 88).
   - Score calculado en columna `Social` (rango 18 a 90, media de 73.2).
   - Versión normalizada en `dimensionSocial` (escala 1.0 a 5.0, media de 4.07).

#### Distribución del Sello Final (Clasificación Sostenibilidad):
- **Compromiso:** 64 IES (48.8%)
- **Sin sello:** 41 IES (31.3%)
- **Liderazgo:** 30 IES (22.9%)
- **Transformación:** 17 IES (13.0%)

---

## 2. Repositorio de Buenas Prácticas (`buenas_practicas.xlsx`)

### Resumen General
- **Dimensiones de la matriz:** 76 filas × 36 columnas.
- **Registros válidos:** 76 casos prácticos completos de IES.

### Distribución Geográfica de Casos (76 Totales)
- **Chile (CL):** 22 casos (28.9%)
- **Argentina (AR):** 15 casos (19.7%)
- **Colombia (CO):** 13 casos (17.1%)
- **Perú (PE):** 12 casos (15.8%)
- **España (ES):** 6 casos (7.9%)
- **México (MX):** 6 casos (7.9%)
- **Brasil (BR):** 2 casos (2.6%)

### Distribución de Temáticas (Multivalor)
La columna `Temáticas` contiene valores múltiples separados por punto y coma (`;`). Las categorías principales que aparecen con mayor frecuencia en combinación son:
- **Ambiental** (ej. Gestión de Residuos, Eficiencia Energética)
- **Social** (ej. Voluntariado, Conciliación)
- **Académica** (ej. Innovación en contenidos ODS)
- **Gobernanza** (ej. Plan Estratégico)

> [!IMPORTANT]
> **Campos Vacíos / Nulos Críticos detectados en `buenas_practicas.xlsx`:**
> 1. **Datos de Responsables:** Las columnas `Nombre Responsable`, `Cargo Responsable`, `Unidad Responsable` y `Email Responsable` se encuentran **100% nulas (vacías)**. No hay información del autor del caso.
> 2. **Imagen Destacada:** La columna `URL Imagen Destacada` está **100% nula**. No se dispone de URLs de portada para las tarjetas de buenas prácticas.
>    * *Solución propuesta:* Se deberá mapear una imagen de fallback por defecto según la temática principal del caso (ej. imagen de naturaleza para Ambiental, personas para Social, libros para Académica, etc.) para que las tarjetas del dashboard luzcan premium.
> 3. **Coordenadas Geográficas:** Las columnas `Latitud` y `Longitud` están **100% nulas**. Esto descarta la posibilidad de renderizar un mapa interactivo de geolocalización de casos sin antes hacer un proceso de geocodificación por nombre de IES o país.
> 4. **Recursos Adjuntos:** Todos los registros tienen la columna `Recurso 1 - Tipo` como `"doc"` y contienen una URL única en `Recurso 1 - URL`, pero las etiquetas descriptivas (`Recurso 1 - ES`, `PT`, `EN`) están vacías.

---

## 3. Estrategia de Procesamiento para el Dashboard (Paso 4.2)

Basado en este análisis, el script de preprocesamiento en Python con Pandas automatizará:

1. **Limpieza Inicial:** Filtrar las filas nulas de `encuesta.xlsx` basándose en el campo `Fecha de inicio` o `Titularidad de la Universidad` no nulos.
2. **Generación de Agregados del Dashboard:**
   - Creación de un JSON unificado para la muestra con porcentajes por país, tipología, modalidad de estudio y carácter.
   - Cálculo de estadísticas agregadas por país para los 4 indicadores básicos (Energía, Carbono, Agua, Residuos).
   - Mapeo y promediado de las 23 preguntas binarias de Gobernanza (pasando a 1 y 0) global y por país.
   - Promedio global y desglosado por país para las dimensiones Ambiental y Social (escalas 1-5).
3. **Normalización de Buenas Prácticas:**
   - Separación de temáticas múltiples en elementos individuales para permitir el filtrado combinado en el frontend.
   - Truncado automático de resúmenes extensos para generar la descripción corta de la tarjeta.
   - Asignación de imagen de cobertura representativa de fallback basada en la temática.
