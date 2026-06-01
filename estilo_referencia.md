# Estilo de Referencia — MetaRed ESG / S

Este documento recopila el análisis visual y la especificación de diseño basada en la página de ejemplo de **MetaRed ESG** y el diseño esperado para la herramienta de **MetaRed S** (Paso 1 del Plan de Trabajo).

---

## 1. Paleta de Colores

Se han extraído los códigos hexadecimales y formatos de color exactos del CSS de la página de ejemplo:

### Colores Principales (Marca)
- **Rojo Santander (Rojo Institucional):** `#e42424`
  - *Uso:* Color de acento principal, botones primarios, bordes de hover en el menú superior, títulos destacados, enlaces activos.
  - *Variaciones detectadas:* `#ef4242` (rojo hover/alerta), `#ff2323`, `#f23630`.
- **Gris Oscuro (Texto Principal):** `#333333` (ó `#333`)
  - *Uso:* Color del cuerpo del texto, enlaces del submenú, párrafos generales.
  - *Variaciones:* `#1b1b1b` (títulos principales y texto muy oscuro), `#222222` (variante de títulos).
- **Gris Medio (Texto Secundario / Textos del Footer):** `#aaa9aa` (ó `#aaa`)
  - *Uso:* Texto de descripción de informes, pie de página, derechos de autor.
  - *Variaciones:* `#767676` (gris de botones de ajuste de fuente), `#696969` (textos de banner).
- **Gris Claro (Fondo / Separadores):** `#f6f6f6`
  - *Uso:* Fondos alternos de secciones, fondo del dropdown inactivo, fondo de tarjetas de contenido secundario.
  - *Variaciones:* `#f7f7f7`, `#fafafa` (fondos de inputs), `#ddd` (hover en dropdown).
- **Blanco (Fondo Principal):** `#ffffff` (ó `#fff`)
  - *Uso:* Fondo de la página, fondo del header, fondo de las tarjetas del dashboard.
- **Negro (Bordes y Hover):** `#000000` (ó `#000`)
  - *Uso:* Enlaces en estado hover principal, bordes selectivos, sombras intensas.

### Colores Secundarios (Dimensiones y Estados)
- **Verde (Positivo / Éxito / Ambiental):** `#68b631`
  - *Uso:* Indicadores de alta sostenibilidad (rango 4-5 / 75-100%), botones de confirmación, fondo de botones del SDK de cookies.
  - *Variaciones:* `#6dab3c`, `#5f9434` (verde oliva de acentos).
- **Azul (Informativo / Social):** `#4092df`
  - *Uso:* Indicadores de rango medio, enlaces del portal de ayuda.
  - *Variaciones:* `#3c5ecc`, `#4868cf` (azul oscuro institucional).
- **Naranja/Ámbar (Alerta / Gobernanza):** `#f5b14b`
  - *Uso:* Indicadores de rango medio (rango 2-4 / 25-74%), acentos de títulos de indicadores básicos.
  - *Variaciones:* `#f6b859`, `#f57f4b`.

---

## 2. Tipografía

El sitio web utiliza una familia tipográfica premium personalizada, complementada con un font de íconos:

### Familias de Fuentes (`font-family`)
1. **`HKGrotesk` (Fuente Principal):**
   - **`HKGrotesk-Regular`:** Usada para el cuerpo del texto, tablas de datos y textos descriptivos.
   - **`HKGrotesk-SemiBold`:** Usada para subtítulos de nivel 2 y 3, títulos de tarjetas de dashboard.
   - **`HKGrotesk-Bold`:** Usada para títulos principales (H1), botones y elementos destacados.
   - *Fallback:* `sans-serif`.
2. **`Santander_IconFont` (Fuente de Íconos):**
   - Una fuente de íconos vectoriales personalizada que renderiza glifos específicos de marca (redes sociales, flechas, checks, etc.) mediante pseudoelementos `:before` y `:after`.

### Carga de Fuentes
En el CSS original, las fuentes se cargan localmente desde la ruta de recursos de AEM. Para nuestro entregable en Railway:
- Como las fuentes no están en un CDN público estándar, se deben guardar localmente en `/assets/fonts/` o configurar una fuente de reemplazo en el archivo `main.css` (ej. `Inter` o `Roboto` de Google Fonts) como fallback, manteniendo la misma escala tipográfica.
- *Rutas originales en CSS:*
  - `clientlib-site/resources/fonts/HKGrotesk-Regular.woff2`
  - `clientlib-site/resources/fonts/HKGrotesk-Bold.woff2`
  - `clientlib-site/resources/fonts/HKGrotesk-SemiBold.woff2`
  - `clientlib-site/resources/fonts/Santander_IconFont/Santander_IconFont.woff`

---

## 3. Íconos

El sistema visual de la página utiliza dos tipos de íconos:

### Íconos de Fuente (Icon Font)
Se utiliza `Santander_IconFont`. Ejemplos de uso en layout:
- **Menú Hamburguesa (Mobile):** `.icon-a-SYS015b--menu:before` (código unicode `\e956` / `\e95e`)
- **Cerrar (Mobile):** `.icon-c-SYS022b--close_L:before` (código unicode `\e952`)
- **Redes Sociales (Footer):**
  - Twitter/X: `.icon-bRRSS--08_twitter_stroke:before`
  - Facebook: `.icon-bRRSS--07_facebook_stroke:before`
  - LinkedIn: `.icon-bRRSS--09_linkedin_stroke:before`
  - YouTube: `.icon-bRRSS--10_youtube_stroke:before`

### Íconos de Imagen (SVGs/PNGs)
- **Logo del Header:** `MetaRedESG.png` (Será sustituido por el logo de **MetaRed S**).
- **Logo del Footer:** `MetaRedESG-negativo.png` (Versión en negativo, blanco, sobre fondo oscuro).
- **Logo Fundación Universia:** `logotipo-universia-fundaci-n-blanco@3x.png` (Ubicado en el pie de página).
- **Botón de Búsqueda:** `magnifying-glass-light.png`
- **Cerrar Búsqueda:** `xmark-light.png`
- **Eliminar Búsqueda:** `trash-can-light.png`

> [!IMPORTANT]
> **Identificación del logo de MetaRed S:**
> Para la encuesta de sostenibilidad, el entregable debe mostrar la marca **MetaRed S** (que tiene el característico isotipo con una "S" roja estilizada). Este archivo de imagen debe guardarse de manera independiente en `/assets/icons/` o `/assets/images/` para ser utilizado en el header de la aplicación.

---

## 4. Estructura del Layout (Maquetación)

### Header (Cabecera)
El header tiene dos versiones conmutables de forma responsive:
1. **Versión de Escritorio (`header-metared-desktop`):**
   - **Fondo:** `#ffffff` (Blanco puro).
   - **Dimensiones:** Altura de `90px`, padding horizontal de `128px`.
   - **Alineación:** Flexbox horizontal, logo alineado a la izquierda, menú a la derecha.
   - **Menú de Navegación:**
     - Clases principales: `.header-container__menu-desktop-options` y `.link-header`.
     - **Efecto Hover (Pestañas del Menú):**
       ```css
       .link-header:hover span.link-header-span {
           border-top: 4px solid #e42424;
           color: #e42424;
           padding: 12px 16px 16px; /* Desplazamiento de padding de 4px para compensar el borde superior */
       }
       ```
     - **Dropdown Menus:**
       - El contenedor `.dropdown` tiene `position: relative`.
       - El menú desplegable `.dropdown-content` tiene `position: absolute`, `background-color: #f1f1f1`, `border-top: 3px solid #e42424`, y una sombra `box-shadow: 0 8px 16px 0 rgba(0,0,0,.2)`.
       - En hover, `.dropdown:hover .dropdown-content` cambia a `display: block`.
       - Los elementos `li` del dropdown tienen un borde inferior `.dropdown-content li { border-bottom: 1px solid #dcdadb; }` y un hover con fondo `.dropdown-content li:hover { background-color: #ddd; }`.
       - Subenlaces hover: `.link-subheader:hover { border-left: 3px solid #e42424; padding-left: 13px; }` (añade una franja roja a la izquierda).

2. **Versión Móvil (`header-metared-mobile`):**
   - **Fondo:** `#ffffff`.
   - **Dimensiones:** Altura de `64px`, padding horizontal de `16px`.
   - **Menú Hamburguesa:** Despliega un menú lateral o drawer usando JavaScript (conmutando la clase `hidden` de los íconos de abrir/cerrar menú).

### Footer (Pie de Página)
- **Clase Contenedor:** `.footer-metared`
- **Fondo:** `#4a4a4a` (Gris carbón oscuro).
- **Texto:** `#aaa9aa` (Gris claro de bajo contraste).
- **Estructura Interna:**
  - `.footer__logos_container`: Organiza horizontalmente el logo de MetaRed (versión negativa `MetaRedESG-negativo.png`), la red social (flex con iconos en blanco) y el logo de la Fundación Universia.
  - `.footer--separator`: Línea de división horizontal muy sutil (`border-top` o similar).
  - `.footer__text-container`: Contiene los créditos y el copyright (`.footer-text`).
  - `.footer__legal-links-container`: Enlaces horizontales con la clase `.footer__legal-link` (Aviso Legal, Política de Privacidad, Política de Cookies).

### Grid y Área de Contenido
- La maquetación original de la página utiliza el sistema de rejilla responsiva de AEM (`.aem-Grid` de 12 columnas).
- En el desarrollo de nuestro dashboard base, utilizaremos flexbox y CSS Grid moderno para replicar esta cuadrícula de manera limpia y ligera, garantizando adaptabilidad en pantallas desktop y móviles.
