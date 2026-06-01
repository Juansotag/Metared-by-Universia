from flask import Flask, render_template, send_from_directory, jsonify
import os
import pandas as pd
import json

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

def pre_process_data():
    """Placeholder for data pre-processing (Paso 4).
    This function will load the Excel files using Pandas and save them as JSON.
    For now, it runs a basic check and registers the files.
    """
    print("--- Running Data Pre-processing Check ---")
    
    # Check if files exist
    encuesta_exists = os.path.exists(ENCUESTA_EXCEL)
    practicas_exists = os.path.exists(PRACTICAS_EXCEL)
    
    print(f"encuesta.xlsx found: {encuesta_exists}")
    print(f"buenas_practicas.xlsx found: {practicas_exists}")
    
    # We will implement the full pre-processing logic in Paso 4.
    # For now, let's create a minimal JSON structure if Excel files are present
    # to avoid failing if frontend tries to fetch them.
    if encuesta_exists and not os.path.exists(ENCUESTA_JSON):
        try:
            # Create a simple JSON mapping or empty structure
            with open(ENCUESTA_JSON, 'w', encoding='utf-8') as f:
                json.dump({"status": "raw_excel_available", "message": "Run pre-processing (Step 4) to populate"}, f)
            print(f"Created initial placeholder: {ENCUESTA_JSON}")
        except Exception as e:
            print(f"Error creating placeholder for encuesta: {e}")
            
    if practicas_exists and not os.path.exists(PRACTICAS_JSON):
        try:
            with open(PRACTICAS_JSON, 'w', encoding='utf-8') as f:
                json.dump({"status": "raw_excel_available", "message": "Run pre-processing (Step 4) to populate"}, f)
            print(f"Created initial placeholder: {PRACTICAS_JSON}")
        except Exception as e:
            print(f"Error creating placeholder for buenas_practicas: {e}")

# Run pre-processing on startup
pre_process_data()

@app.route('/')
def home():
    """Main route serving index.html."""
    if not os.path.exists('index.html'):
        # If index.html doesn't exist yet, we will render a simple placeholder
        return "<h1>Servidor MetaRed S Inicializado</h1><p>index.html base no creado todavía. Por favor completa el Paso 3.</p>"
    return render_template('index.html')

@app.route('/index_files/<path:filename>')
def send_index_files(filename):
    return send_from_directory('index_files', filename)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'assets/images'),
                               'favicon.png', mimetype='image/png')

# API endpoints to fetch data (will be fully integrated in Paso 5)
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

if __name__ == '__main__':
    # Run locally in debug mode
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
