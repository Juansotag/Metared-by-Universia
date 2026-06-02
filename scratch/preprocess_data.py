import pandas as pd
import json
import os
import unicodedata

encuesta_path = r"c:\Users\juansoag\Downloads\Github\Universia\encuesta.xlsx"
practicas_path = r"c:\Users\juansoag\Downloads\Github\Universia\buenas_practicas.xlsx"
data_dir = r"c:\Users\juansoag\Downloads\Github\Universia\data"

os.makedirs(data_dir, exist_ok=True)

# Helper function to clean text for matching
def clean_name(name):
    if not isinstance(name, str):
        return ""
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('utf-8')
    return "".join(c for c in name.lower() if c.isalnum())

def clean_str(val, fallback=""):
    if pd.isna(val) or str(val).strip().lower() in ['nan', 'none', 'null', '']:
        return fallback
    return str(val).strip()

def clean_seal(val):
    if pd.isna(val):
        return "Sin Sello"
    s = str(val).strip().lower()
    if 'transform' in s:
        return 'Transformación'
    elif 'lider' in s:
        return 'Liderazgo'
    elif 'comprom' in s:
        return 'Compromiso'
    else:
        return 'Sin Sello'

# 1. PROCESS SURVEY DATA
print("Processing survey data...")
df_enc = pd.read_excel(encuesta_path)

# Drop rows that have no institution name or country (truly empty rows)
df_enc = df_enc.dropna(subset=['institucion', 'País'])
print(f"Valid survey rows: {df_enc.shape[0]}")

# Country code translation dictionary
country_names = {
    'España': 'ES', 'Brasil': 'BR', 'México': 'MX', 'Chile': 'CL',
    'Colombia': 'CO', 'Argentina': 'AR', 'Perú': 'PE', 'Ecuador': 'EC'
}

# Add a clean country code column
df_enc['country_code'] = df_enc['País'].map(country_names).fillna(df_enc['País'])

# Normalize the Sello final column
df_enc['Sello final'] = df_enc['Sello final'].apply(clean_seal)

# Calculate overall sample metrics
total_ies = int(df_enc.shape[0])
by_country = df_enc['country_code'].value_counts().to_dict()
by_ownership = df_enc['Titularidad de la Universidad'].value_counts().to_dict()
by_character = df_enc['Carácter de la Universidad'].value_counts().to_dict()

# Calculate student statistics
df_enc['Estudiantes Presenciales'] = df_enc['Nº de estudiantes matriculados (equivalentes a tiempo completo) en el último curso académico perteneciente a titulaciones presenciales'].fillna(0)
df_enc['Estudiantes Virtuales'] = df_enc['Nº de estudiantes matriculados (equivalentes a tiempo completo) en el último curso académico perteneciente a titulaciones virtuales'].fillna(0)
df_enc['Estudiantes Híbridos'] = df_enc['Nº de estudiantes matriculados (equivalentes a tiempo completo) en el último curso académico perteneciente a titulaciones híbridas'].fillna(0)
df_enc['Estudiantes Totales'] = df_enc['Estudiantes Presenciales'] + df_enc['Estudiantes Virtuales'] + df_enc['Estudiantes Híbridos']

# Filter out invalid student totals (<= 50) for average demographic calculations
df_enc_valid_students = df_enc[df_enc['Estudiantes Totales'] > 50]

students_global_total = int(df_enc_valid_students['Estudiantes Totales'].sum())
employees_global_total = int(df_enc['Nº de empleados promedio en el año 2024 (profesorado, staff, etc.)'].fillna(0).sum())

# Student statistics per country
students_by_country = {}
for country, group in df_enc_valid_students.groupby('country_code'):
    students_by_country[country] = {
        'total': int(group['Estudiantes Totales'].sum()),
        'mean': float(group['Estudiantes Totales'].mean()),
        'median': float(group['Estudiantes Totales'].median()),
        'min': float(group['Estudiantes Totales'].min()),
        'max': float(group['Estudiantes Totales'].max()),
        'count': int(group.shape[0])
    }

# Process basic indicators
basic_indicators = {
    'energia': 'Indicadores Básicos - Consumo total de energía por año en kWh/año - Valor',
    'carbono': 'Indicadores Básicos - Huella de carbono institucional (Alcance 1+2) en tCO2e/año - Valor',
    'residuos': 'Indicadores Básicos - Porcentaje de residuos sólidos reciclados o valorizados respecto al total - Valor',
    'agua': 'Indicadores Básicos - Consumo total de agua por año en m3/año - Valor',
    'areas_verdes': 'Indicadores Básicos - Proporción de áreas verdes por superficie construida en m2 verde / m2 construido - Valor',
    'presupuesto': 'Indicadores Básicos - Presupuesto ambiental institucional por año en USD/año - Valor'
}

def get_clean_indicator_df(df, key, col):
    if key == 'residuos':
        return df[(df[col] >= 0) & (df[col] <= 100)]
    elif key == 'energia':
        return df[df[col] > 1000]
    elif key == 'carbono':
        return df[df[col] > 10]
    elif key == 'agua':
        return df[df[col] > 100]
    elif key == 'areas_verdes':
        return df[df[col] > 0]
    elif key == 'presupuesto':
        return df[df[col] > 100]
    else:
        return df[df[col] > 0]

def clean_ind_val(val, key):
    if pd.isna(val):
        return None
    try:
        val = float(val)
    except (ValueError, TypeError):
        return None
    if key == 'energia' and val <= 1000:
        return None
    if key == 'carbono' and val <= 10:
        return None
    if key == 'residuos' and (val < 0 or val > 100):
        return None
    if key == 'agua' and val <= 100:
        return None
    if key == 'presupuesto' and val <= 100:
        return None
    return val

indicators_stats = {}
for key, col in basic_indicators.items():
    # Calculate global stats
    df_clean = get_clean_indicator_df(df_enc, key, col)
    global_stats = {
        'total': float(df_clean[col].sum()),
        'mean': float(df_clean[col].mean()) if not df_clean.empty else 0.0,
        'median': float(df_clean[col].median()) if not df_clean.empty else 0.0,
        'min': float(df_clean[col].min()) if not df_clean.empty else 0.0,
        'max': float(df_clean[col].max()) if not df_clean.empty else 0.0,
        'samples': int(df_clean.shape[0])
    }
    
    # Calculate stats per country
    country_stats = {}
    for country, group in df_enc.groupby('country_code'):
        gp_clean = get_clean_indicator_df(group, key, col)
        country_stats[country] = {
            'total': float(gp_clean[col].sum()),
            'mean': float(gp_clean[col].mean()) if not gp_clean.empty else 0.0,
            'median': float(gp_clean[col].median()) if not gp_clean.empty else 0.0,
            'min': float(gp_clean[col].min()) if not gp_clean.empty else 0.0,
            'max': float(gp_clean[col].max()) if not gp_clean.empty else 0.0,
            'samples': int(gp_clean.shape[0])
        }
        
    indicators_stats[key] = {
        'global': global_stats,
        'countries': country_stats
    }

# Process Gobernanza Dimension (22 questions)
gobernanza_cols = [c for c in df_enc.columns if c.startswith("Indique si su Universidad dispone de las siguientes actividades")]
gob_questions = []
for idx, col in enumerate(gobernanza_cols):
    short_name = col.split(" - ")[-1]
    
    # Map Dispone to 1, No dispone to 0 (matches actual 'Dispone'/'No dispone' text)
    mapped_col = f"gob_{idx+1}"
    df_enc[mapped_col] = df_enc[col].map({'Dispone': 1, 'No dispone': 0}).fillna(0)
    
    # Calculate percentages
    global_pct = float(df_enc[mapped_col].mean())
    country_pcts = {}
    for country, group in df_enc.groupby('country_code'):
        country_pcts[country] = float(group[mapped_col].mean())
        
    gob_questions.append({
        'id': mapped_col,
        'full_text': short_name,
        'global_percentage': global_pct,
        'countries': country_pcts
    })

# Process scores (normalised and raw values)
df_enc['score_gobernanza_normalized'] = df_enc['dimensionGobernanza']
df_enc['score_ambiental_normalized'] = (df_enc['dimensionAmbiental'] - 1) / 4.0 # Scale 1-5 to 0-1
df_enc['score_social_normalized'] = (df_enc['dimensionSocial'] - 1) / 4.0 # Scale 1-5 to 0-1

dimension_scores = {
    'gobernanza': {
        'global_mean': float(df_enc['score_gobernanza_normalized'].mean()),
        'countries': df_enc.groupby('country_code')['score_gobernanza_normalized'].mean().to_dict()
    },
    'ambiental': {
        'global_mean': float(df_enc['dimensionAmbiental'].mean()),
        'countries': df_enc.groupby('country_code')['dimensionAmbiental'].mean().to_dict()
    },
    'social': {
        'global_mean': float(df_enc['dimensionSocial'].mean()),
        'countries': df_enc.groupby('country_code')['dimensionSocial'].mean().to_dict()
    }
}

# Sello final distribution
seals_by_country = {}
for country, group in df_enc.groupby('country_code'):
    seals_by_country[country] = group['Sello final'].value_counts().to_dict()
seals_global = df_enc['Sello final'].value_counts().to_dict()

# Subindicators (Questions of scale 1-5 for Ambiental and Social)
# For Ambiental: columns starting with "Indique el grado de desarrollo... medioambiental"
amb_sub_cols = [c for c in df_enc.columns if c.startswith("Indique el grado de desarrollo") and "medioambiental" in c]
amb_sub_questions = []
for idx, col in enumerate(amb_sub_cols):
    q_text = col.split(" - ")[-1]
    mapped_col = f"amb_sub_{idx+1}"
    df_enc[mapped_col] = df_enc[col].fillna(1)
    
    amb_sub_questions.append({
        'id': mapped_col,
        'full_text': q_text,
        'global_mean': float(df_enc[mapped_col].mean()),
        'countries': df_enc.groupby('country_code')[mapped_col].mean().to_dict()
    })

# For Social: columns starting with "Indique el grado de desarrollo... social"
soc_sub_cols = [c for c in df_enc.columns if c.startswith("Indique el grado de desarrollo") and "social" in c]
soc_sub_questions = []
for idx, col in enumerate(soc_sub_cols):
    q_text = col.split(" - ")[-1]
    mapped_col = f"soc_sub_{idx+1}"
    df_enc[mapped_col] = df_enc[col].fillna(1)
    
    soc_sub_questions.append({
        'id': mapped_col,
        'full_text': q_text,
        'global_mean': float(df_enc[mapped_col].mean()),
        'countries': df_enc.groupby('country_code')[mapped_col].mean().to_dict()
    })

# Build default coordinate centroids per country based on survey averages
country_defaults = {}
for country_code, group in df_enc.dropna(subset=['Latitud', 'Longitud']).groupby('country_code'):
    country_defaults[country_code] = (float(group['Latitud'].mean()), float(group['Longitud'].mean()))

# Hardcoded centroids to ensure coverage
default_centroids = {
    'AR': (-38.4161, -63.6167),
    'BR': (-14.2350, -51.9253),
    'CL': (-35.6751, -71.5430),
    'CO': (4.5709, -74.2973),
    'EC': (-1.8312, -78.1834),
    'ES': (40.4637, -3.7492),
    'MX': (23.6345, -102.5528),
    'PE': (-9.1900, -75.0152)
}
for cc, coord in default_centroids.items():
    if cc not in country_defaults:
        country_defaults[cc] = coord

# Extract individual university records for mapping & detailed analytics
universities = []
for idx, row in df_enc.iterrows():
    lat = float(row['Latitud']) if pd.notna(row['Latitud']) else None
    lon = float(row['Longitud']) if pd.notna(row['Longitud']) else None
    cc = row['country_code']
    
    # Fallback to country centroid if missing coordinates
    if lat is None or lon is None:
        lat, lon = country_defaults.get(cc, default_centroids.get(cc, (0.0, 0.0)))
        
    students_val = row['Estudiantes Totales']
    students_cleaned = int(students_val) if (pd.notna(students_val) and students_val > 50) else None
    
    employees_val = row['Nº de empleados promedio en el año 2024 (profesorado, staff, etc.)']
    employees_cleaned = int(employees_val) if (pd.notna(employees_val) and employees_val > 0) else None
    
    ownership_cleaned = clean_str(row['Titularidad de la Universidad'], 'No responde')
    character_cleaned = clean_str(row['Carácter de la Universidad'], 'No responde')

    uni_record = {
        'name': str(row['institucion']),
        'country': str(row['País']),
        'country_code': cc,
        'ownership': ownership_cleaned,
        'character': character_cleaned,
        'students': students_cleaned,
        'students_presenciales': int(row['Estudiantes Presenciales']) if (pd.notna(row['Estudiantes Presenciales']) and students_cleaned is not None) else 0,
        'students_virtuales': int(row['Estudiantes Virtuales']) if (pd.notna(row['Estudiantes Virtuales']) and students_cleaned is not None) else 0,
        'students_hibridos': int(row['Estudiantes Híbridos']) if (pd.notna(row['Estudiantes Híbridos']) and students_cleaned is not None) else 0,
        'employees': employees_cleaned,
        'lat': lat,
        'lon': lon,
        'score_gobernanza': float(row['score_gobernanza_normalized']),
        'score_ambiental': float(row['dimensionAmbiental']),
        'score_social': float(row['dimensionSocial']),
        'seal': str(row['Sello final']),
        'energia': clean_ind_val(row[basic_indicators['energia']], 'energia'),
        'carbono': clean_ind_val(row[basic_indicators['carbono']], 'carbono'),
        'residuos': clean_ind_val(row[basic_indicators['residuos']], 'residuos'),
        'agua': clean_ind_val(row[basic_indicators['agua']], 'agua')
    }

    # Add binary governance answers
    for i in range(1, 23):
        uni_record[f"gob_{i}"] = int(row[f"gob_{i}"])

    # Add scale subindicator answers
    for i in range(1, 11):
        uni_record[f"amb_sub_{i}"] = int(row[f"amb_sub_{i}"])
    for i in range(1, 19):
        uni_record[f"soc_sub_{i}"] = int(row[f"soc_sub_{i}"])

    universities.append(uni_record)

# Save clean processed encuesta data
encuesta_output = {
    'total_ies': total_ies,
    'by_country': by_country,
    'by_ownership': by_ownership,
    'by_character': by_character,
    'students_global_total': students_global_total,
    'employees_global_total': employees_global_total,
    'students_by_country': students_by_country,
    'indicators_stats': indicators_stats,
    'gobernanza_questions': gob_questions,
    'ambiental_sub_questions': amb_sub_questions,
    'social_sub_questions': soc_sub_questions,
    'dimension_scores': dimension_scores,
    'seals_global': seals_global,
    'seals_by_country': seals_by_country,
    'universities': universities
}

with open(os.path.join(data_dir, "encuesta.json"), "w", encoding="utf-8") as f:
    json.dump(encuesta_output, f, indent=4, ensure_ascii=False)
print("SUCCESS: Save data/encuesta.json")


# 2. PROCESS GOOD PRACTICES
print("Processing good practices data...")
df_prac = pd.read_excel(practicas_path)

# Map clean institution names from the survey to their coordinates
enc_coord_map = {clean_name(u['name']): (u['lat'], u['lon']) for u in universities}

practicas_cards = []
for idx, row in df_prac.iterrows():
    # Split thematic categories (semicolon separated)
    themes_raw = str(row['Temáticas'])
    themes_list = [t.strip() for t in themes_raw.split(";") if t.strip()]
    
    # Assign fallback image based on the first theme
    primary_theme = themes_list[0] if themes_list else "Ambiental"
    primary_theme_clean = clean_name(primary_theme)
    img_fallback = f"/assets/images/fallback_{primary_theme_clean}.jpg"
    
    ies_clean = clean_name(row['IES'])
    pais_code = str(row['País']).strip().upper()
    
    # Resolve coordinate
    if ies_clean in enc_coord_map:
        lat, lon = enc_coord_map[ies_clean]
    else:
        lat, lon = country_defaults.get(pais_code, default_centroids.get(pais_code, (0.0, 0.0)))
        
    card = {
        'id': str(row['ID']),
        'pais': pais_code,
        'ies': clean_str(row['IES'], "No disponible"),
        'titulo_es': clean_str(row['Título (ES)'], "Sin título"),
        'titulo_pt': clean_str(row['Título (PT)'], "Sem título"),
        'titulo_en': clean_str(row['Título (EN)'], "Untitled"),
        'resumen_es': clean_str(row['Resumen (ES)'], "No responde"),
        'resumen_pt': clean_str(row['Resumen (PT)'], "Não responde"),
        'resumen_en': clean_str(row['Resumen (EN)'], "No response"),
        'fecha_registro': clean_str(row['Fecha Registro'], "No disponible"),
        'es_destacado': True if str(row['Es Destacado']).strip().lower() in ['sí', 'si', 'yes', 'true'] else False,
        'texto_destacado_es': clean_str(row['Texto Destacado (ES)']),
        'texto_destacado_pt': clean_str(row['Texto Destacado (PT)']),
        'texto_destacado_en': clean_str(row['Texto Destacado (EN)']),
        'url_origen': clean_str(row['URL Origen']),
        'nombre_origen_es': clean_str(row['Nombre Origen (ES)'], "Ver origen"),
        'nombre_origen_pt': clean_str(row['Nombre Origen (PT)'], "Ver origem"),
        'nombre_origen_en': clean_str(row['Nombre Origen (EN)'], "View source"),
        'tematicas': themes_list,
        'subtematica_ambiental': clean_str(row['Subtemáticas - Ambiental']),
        'subtematica_gobernanza': clean_str(row['Subtemáticas - Gobernanza']),
        'subtematica_social': clean_str(row['Subtemáticas - Social']),
        'subtematica_academica': clean_str(row['Subtemáticas - Académica']),
        'recurso_tipo': clean_str(row['Recurso 1 - Tipo']),
        'recurso_url': clean_str(row['Recurso 1 - URL']),
        'imagen_fallback': img_fallback,
        'lat': lat,
        'lon': lon
    }
    practicas_cards.append(card)

with open(os.path.join(data_dir, "buenas_practicas.json"), "w", encoding="utf-8") as f:
    json.dump(practicas_cards, f, indent=4, ensure_ascii=False)
print("SUCCESS: Save data/buenas_practicas.json")
print("Preprocessing complete!")
