from flask import Flask, render_template, send_from_directory, jsonify, request, make_response
import os
import pandas as pd
import json
import traceback

app = Flask(__name__, 
            template_folder='.', 
            static_folder='assets', 
            static_url_path='/assets')

# Paths to data files
DATA_DIR = 'data'
ENCUESTA_EXCEL = 'encuesta.xlsx'
PRACTICAS_EXCEL = 'buenas_practicas.xlsx'
ENCUESTA_JSON = os.path.join(DATA_DIR, 'encuesta.json')
PRACTICAS_JSON = os.path.join(DATA_DIR, 'buenas_practicas.json')

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)

# In-memory DataFrames for AI queries
df_enc = None
df_bbpp = None

def load_dataframes():
    """Load JSON data into pandas DataFrames for AI code execution."""
    global df_enc, df_bbpp
    try:
        if os.path.exists(ENCUESTA_JSON):
            data = json.load(open(ENCUESTA_JSON, encoding='utf-8'))
            if isinstance(data, dict) and 'universities' in data:
                df_enc = pd.DataFrame(data['universities'])
                print(f"df_enc loaded: {len(df_enc)} rows, {len(df_enc.columns)} cols")
    except Exception as e:
        print(f"Warning: Could not load df_enc: {e}")

    try:
        if os.path.exists(PRACTICAS_JSON):
            raw = json.load(open(PRACTICAS_JSON, encoding='utf-8'))
            if isinstance(raw, list):
                df_bbpp = pd.DataFrame(raw)
                print(f"df_bbpp loaded: {len(df_bbpp)} rows, {len(df_bbpp.columns)} cols")
    except Exception as e:
        print(f"Warning: Could not load df_bbpp: {e}")

def pre_process_data():
    """Placeholder for data pre-processing."""
    print("--- Running Data Pre-processing Check ---")
    encuesta_exists = os.path.exists(ENCUESTA_EXCEL)
    practicas_exists = os.path.exists(PRACTICAS_EXCEL)
    print(f"encuesta.xlsx found: {encuesta_exists}")
    print(f"buenas_practicas.xlsx found: {practicas_exists}")

    if encuesta_exists and not os.path.exists(ENCUESTA_JSON):
        try:
            with open(ENCUESTA_JSON, 'w', encoding='utf-8') as f:
                json.dump({"status": "raw_excel_available"}, f)
        except Exception as e:
            print(f"Error: {e}")

    if practicas_exists and not os.path.exists(PRACTICAS_JSON):
        try:
            with open(PRACTICAS_JSON, 'w', encoding='utf-8') as f:
                json.dump({"status": "raw_excel_available"}, f)
        except Exception as e:
            print(f"Error: {e}")

# ─ i18n: Translation dictionary directory ────────────────────────────
I18N_LANGS = ['es', 'en', 'pt']
I18N_DIR   = os.path.join('assets', 'i18n')

def load_i18n_all():
    """Read all translation JSON files fresh from disk (never cached)."""
    result = {}
    for lang in I18N_LANGS:
        path = os.path.join(I18N_DIR, f'{lang}.json')
        try:
            with open(path, 'r', encoding='utf-8') as f:
                result[lang] = json.load(f)
        except Exception as e:
            print(f"[i18n] Warning: could not load {lang}.json: {e}")
            result[lang] = {}
    return result

# Run on startup
pre_process_data()
load_dataframes()

@app.route('/')
def home():
    if not os.path.exists('index.html'):
        return "<h1>Servidor MetaRed S Inicializado</h1>"
    lang = request.cookies.get('metared_lang', 'es')
    if lang not in I18N_LANGS:
        lang = 'es'
    i18n_all = load_i18n_all()   # always fresh
    return render_template('index.html', i18n_all=i18n_all, lang=lang)

@app.route('/set-lang/<lang_code>')
def set_lang(lang_code):
    """Set language cookie and redirect to home."""
    if lang_code not in I18N_LANGS:
        lang_code = 'es'
    resp = make_response('', 204)
    resp.set_cookie('metared_lang', lang_code, max_age=60*60*24*365)
    return resp

@app.route('/index_files/<path:filename>')
def send_index_files(filename):
    return send_from_directory('index_files', filename)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'assets/images'),
                               'favicon.png', mimetype='image/png')

@app.route('/api/encuesta')
def get_encuesta():
    if os.path.exists(ENCUESTA_JSON):
        with open(ENCUESTA_JSON, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify({"error": "Data not processed yet"}), 404

@app.route('/api/buenas-practicas')
def get_buenas_practicas():
    if os.path.exists(PRACTICAS_JSON):
        with open(PRACTICAS_JSON, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify({"error": "Data not processed yet"}), 404

# ─── AI CODE EXECUTION ENDPOINT ───────────────────────────────────────────────
FORBIDDEN_TOKENS = ['import', 'exec', '__import__', 'open(', 'os.', 'sys.',
                    'subprocess', '__builtins__', 'compile', 'globals',
                    'locals', 'vars', 'dir(', 'getattr', 'setattr', 'delattr']

@app.route('/api/ai/execute', methods=['POST'])
def ai_execute():
    """
    Receives a pandas snippet from the AI and executes it safely.
    Only df_enc, df_bbpp and pd are available in the execution namespace.
    Returns the result as a plain string (max 3000 chars).
    """
    if df_enc is None and df_bbpp is None:
        return jsonify({"error": "DataFrames not loaded yet. Run pre-processing first."}), 503

    body = request.get_json(silent=True) or {}
    code = body.get('code', '').strip()

    if not code:
        return jsonify({"error": "No code provided"}), 400

    # Security check
    code_lower = code.lower()
    for token in FORBIDDEN_TOKENS:
        if token.lower() in code_lower:
            return jsonify({"error": f"Token no permitido: '{token}'"}), 403

    try:
        safe_namespace = {
            '__builtins__': {},   # block all builtins
            'pd': pd,
            'df_enc': df_enc,
            'df_bbpp': df_bbpp,
            'len': len,
            'round': round,
            'sum': sum,
            'min': min,
            'max': max,
            'sorted': sorted,
            'list': list,
            'dict': dict,
            'str': str,
            'int': int,
            'float': float,
        }
        result = eval(code, safe_namespace)  # nosec (controlled namespace)

        # Serialize result
        if hasattr(result, 'to_string'):
            result_str = result.to_string()
        elif hasattr(result, 'to_dict'):
            result_str = json.dumps(result.to_dict(), ensure_ascii=False)
        else:
            result_str = str(result)

        # Cap output
        result_str = result_str[:3000]
        return jsonify({"result": result_str})

    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ──────────────────────────────────────────────────────────────────────────────

@app.route('/api/ai/schema')
def ai_schema():
    """Returns the schema (column names) of the DataFrames so the AI knows what to query."""
    schema = {}
    if df_enc is not None:
        schema['df_enc'] = {
            'description': 'Datos de IES encuestadas. Una fila por universidad.',
            'rows': len(df_enc),
            'columns': list(df_enc.columns)
        }
    if df_bbpp is not None:
        schema['df_bbpp'] = {
            'description': 'Buenas prácticas registradas. Una fila por práctica.',
            'rows': len(df_bbpp),
            'columns': list(df_bbpp.columns)
        }
    return jsonify(schema)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
