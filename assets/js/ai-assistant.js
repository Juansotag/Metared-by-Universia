/**
 * AI Assistant — MetaRed Dashboard
 * Laboratorio de Gobierno · Universidad de la Sabana
 *
 * Architecture:
 *  1. On open: fetch /api/ai/schema to know available DataFrames and columns.
 *  2. System prompt = institutional context + schema (lightweight, ~1 KB).
 *  3. If the LLM needs data, it responds with a <query>pandas_code</query> tag.
 *  4. JS detects the tag, POSTs to /api/ai/execute (server-side eval in safe namespace).
 *  5. Result is injected back and the LLM produces the final answer.
 *  6. If no <query> tag → answer is shown directly.
 */
document.addEventListener("DOMContentLoaded", function () {

    // ── Elements ──────────────────────────────────────────────────────────────
    const fab             = document.getElementById("ai-fab");
    const chatWindow      = document.getElementById("ai-chat-window");
    const closeBtn        = document.getElementById("ai-close-btn");
    const settingsToggle  = document.getElementById("ai-settings-toggle");
    const settingsView    = document.getElementById("ai-settings-view");
    const saveSettingsBtn = document.getElementById("ai-save-settings");
    const providerSelect  = document.getElementById("ai-provider");
    const apiKeyInput     = document.getElementById("ai-apikey");
    const chatBody        = document.getElementById("ai-chat-body");
    const inputArea       = document.getElementById("ai-input");
    const sendBtn         = document.getElementById("ai-send-btn");
    const micBtn          = document.getElementById("ai-mic-btn");
    const ttsBtn          = document.getElementById("ai-tts-btn");

    // ── State ─────────────────────────────────────────────────────────────────
    let apiKey      = localStorage.getItem("metared_ai_key") || "";
    let provider    = localStorage.getItem("metared_ai_provider") || "gemini";
    let chatHistory = [];
    let isTTSActive = false;
    let isRecording = false;
    let dataSchema  = null; // Loaded once from /api/ai/schema

    // ── Initialize ────────────────────────────────────────────────────────────
    if (apiKey) {
        settingsView.classList.remove("active");
        apiKeyInput.value   = apiKey;
        providerSelect.value = provider;
    }

    // ── UI Toggles ────────────────────────────────────────────────────────────
    fab.addEventListener("click", async () => {
        chatWindow.classList.add("open");
        fab.style.display = "none";
        if (!dataSchema) await loadSchema();
    });

    closeBtn.addEventListener("click", () => {
        chatWindow.classList.remove("open");
        fab.style.display = "flex";
    });

    settingsToggle.addEventListener("click", () => {
        settingsView.classList.toggle("active");
    });

    saveSettingsBtn.addEventListener("click", () => {
        apiKey   = apiKeyInput.value.trim();
        provider = providerSelect.value;
        if (apiKey) {
            localStorage.setItem("metared_ai_key", apiKey);
            localStorage.setItem("metared_ai_provider", provider);
            settingsView.classList.remove("active");
        } else {
            alert("Por favor, introduce una API Key válida.");
        }
    });

    // ── Schema Loader ─────────────────────────────────────────────────────────
    async function loadSchema() {
        try {
            const res = await fetch('/api/ai/schema');
            if (res.ok) {
                dataSchema = await res.json();
                console.log("[AI] Schema loaded:", dataSchema);
            }
        } catch (e) {
            console.warn("[AI] Could not load schema:", e);
        }
    }

    // ── System Prompt ─────────────────────────────────────────────────────────
    function buildSystemPrompt() {
        let schemaBlock = "";

        if (dataSchema) {
            schemaBlock = "\n## Datos disponibles para consulta\n";
            for (const [dfName, info] of Object.entries(dataSchema)) {
                schemaBlock += `\n### ${dfName} (${info.rows} filas)\n`;
                schemaBlock += `${info.description}\n`;
                schemaBlock += `Columnas: ${info.columns.join(", ")}\n`;
            }
            schemaBlock += `
## Cómo realizar consultas de datos
Si la pregunta del usuario requiere cálculos o búsquedas específicas en los datos,
responde con un bloque <query> que contenga código pandas válido. Ejemplos:

<query>df_enc['score_gobernanza'].mean()</query>
<query>df_enc[df_enc['country_code']=='CO'][['name','seal','score_gobernanza']].to_string()</query>
<query>df_enc.groupby('country_code')[['students','score_gobernanza']].median().to_string()</query>
<query>df_bbpp[df_bbpp['tematicas'].apply(lambda x: isinstance(x, list) and 'Ambiental' in x)]['titulo_es'].tolist()</query>
<query>df_bbpp[df_bbpp['resumen_es'].str.contains('agua', case=False, na=False)][['ies','pais','titulo_es','recurso_tipo','recurso_url','url_origen']].to_string()</query>

NOTAS CRITICAS sobre los datos:
- La columna tematicas en df_bbpp contiene listas Python (ej: ['Ambiental', 'Social']). Para filtrar usa .apply(lambda x: isinstance(x, list) and 'Ambiental' in x). NUNCA uses .str.contains() en esa columna.
- Para buscar prácticas sobre un tema, SIEMPRE combina titulo_es y resumen_es con OR e incluye recurso_url. Ejemplo: df_bbpp[df_bbpp['titulo_es'].str.contains('termino', case=False, na=False) | df_bbpp['resumen_es'].str.contains('termino', case=False, na=False)][['ies','pais','titulo_es','resumen_es','recurso_tipo','recurso_url','url_origen']].to_string()
- Cuando muestres prácticas de df_bbpp, SIEMPRE incluye el enlace al recurso: usa el campo recurso_url como enlace principal [Ver recurso](recurso_url). Si recurso_url está vacío o es NaN, usa url_origen como fallback [Ver fuente](url_origen). Incluye el campo recurso_tipo para saber si es PDF, video, etc.
- Si la búsqueda principal no da resultados, amplía con sinónimos o términos relacionados antes de concluir que no hay datos.
- Si una query falla con ERROR, analiza el error, corrige el código y responde con un nuevo bloque <query> corregido. Nunca le pidas al usuario que ejecute código manualmente.

REGLAS para usar <query>:
- Solo uno por respuesta.
- Código de una sola línea (o varias separadas por ;).
- No uses imports, open, os, sys.
- Si la pregunta NO requiere datos (preguntas sobre la herramienta, navegación, MetaRed), responde directamente SIN <query>.
`;
        }

        return `Eres el **Asistente Inteligente del Dashboard MetaRed ESG**, una herramienta interactiva desarrollada por el **Laboratorio de Gobierno de la Universidad de la Sabana** (Colombia).

## Contexto de la herramienta
MetaRed ESG es una plataforma de análisis internacional que visualiza los resultados de la encuesta de sostenibilidad de MetaRed S, una red iberoamericana de universidades vinculadas al Grupo Santander. El dashboard presenta indicadores ESG (ambientales, sociales y de gobernanza) de 152 Instituciones de Educación Superior (IES) de 8 países: España, Brasil, México, Chile, Colombia, Argentina, Perú y Ecuador.

## Objetivo del dashboard
Apoyar la toma de decisiones en política universitaria de sostenibilidad, facilitando la comparación, el benchmarking y la identificación de buenas prácticas entre IES iberoamericanas.

## Dimensiones analizadas
- **Gobernanza**: 22 indicadores sobre políticas, comités, reportes de sostenibilidad, ODS, etc.
- **Ambiental**: Consumo de energía (kWh), emisiones de carbono (tCO₂), residuos reciclados (%), consumo de agua (m³). Más 10 sub-indicadores cualitativos.
- **Social**: 18 sub-indicadores sobre accesibilidad, becas, diversidad, empleabilidad, voluntariado, etc.

## Sellos de sostenibilidad
Las IES reciben un sello según su puntuación compuesta:
- **Compromiso** (nivel 1)
- **Liderazgo** (nivel 2)
- **Transformación** (nivel 3)
- **Sin Sello**
${schemaBlock}
## Instrucciones de comportamiento
1. Responde SIEMPRE en el idioma en que el usuario te escribe. Si el usuario escribe en inglés, responde en inglés. Si escribe en portugués, responde en portugués. Si escribe en español, responde en español. El idioma configurado en la interfaz (${(window.i18n ? window.i18n.getLang() : 'es').toUpperCase()}) es solo una referencia, no una restricción.
2. Sé conciso: la interfaz es un chat pequeño; usa viñetas y **negrita** con moderación.
3. Cuando uses datos reales del resultado de una query, cítalos con precisión (no inventes cifras).
4. Si no puedes responder algo con los datos disponibles, dilo claramente.
5. Para preguntas de navegación o uso del dashboard, orienta al usuario hacia los filtros y pestañas de la interfaz.
6. **Nunca uses emojis** en tus respuestas.
7. Usa formato Markdown para estructurar: encabezados (##, ###), negritas (**texto**), listas (- item), tablas (| col |). El cliente renderiza Markdown correctamente.`;
    }

    // ── TTS ───────────────────────────────────────────────────────────────────
    ttsBtn.addEventListener("click", () => {
        isTTSActive = !isTTSActive;
        ttsBtn.style.color = isTTSActive ? "#ff9" : "white";
        if (!isTTSActive) window.speechSynthesis && window.speechSynthesis.cancel();
    });

    function getLangBcp47() {
        const l = window.i18n ? window.i18n.getLang() : 'es';
        return l === 'pt' ? 'pt-BR' : l === 'en' ? 'en-US' : 'es-ES';
    }

    function speakText(text) {
        if (!isTTSActive || !window.speechSynthesis) return;
        const clean = text.replace(/<[^>]*>/g, '').replace(/(\*\*|\*|#|`|<[^>]+>)/g, '');
        const utt   = new SpeechSynthesisUtterance(clean);
        utt.lang    = getLangBcp47();
        window.speechSynthesis.speak(utt);
    }

    // ── STT ───────────────────────────────────────────────────────────────────
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous     = false;
        recognition.interimResults = false;

        recognition.onstart  = () => {
            isRecording = true;
            micBtn.classList.add('recording');
            recognition.lang = getLangBcp47();
            const t = window.i18n ? window.i18n.t('ai.listening') : 'Escuchando...';
            inputArea.placeholder = t;
        };
        recognition.onend    = () => {
            isRecording = false;
            micBtn.classList.remove('recording');
            const t = window.i18n ? window.i18n.t('ai.placeholder') : 'Pregunta algo sobre los datos...';
            inputArea.placeholder = t;
        };
        recognition.onerror  = (e) => { console.error("STT error:", e.error); recognition.onend(); };
        recognition.onresult = (e) => {
            const t = e.results[0][0].transcript;
            inputArea.value += (inputArea.value ? ' ' : '') + t;
        };
    } else {
        micBtn.style.display = "none";
    }

    micBtn.addEventListener("click", () => {
        if (!recognition) return;
        isRecording ? recognition.stop() : recognition.start();
    });

    // ── Chat UI helpers ───────────────────────────────────────────────────────
    // ── Markdown → HTML ─────────────────────────────────────────────────────
    function markdownToHtml(text) {
        // Strip emojis as a safety net (in case the LLM ignores the instruction)
        text = text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu, '');

        const lines = text.split('\n');
        const output = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            // Horizontal rule (---)
            if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
                output.push('<hr style="border:none;border-top:1px solid var(--color-border);margin:10px 0">');
                i++; continue;
            }

            // Headings
            if (/^### /.test(trimmed)) {
                output.push(`<h4 style="margin:8px 0 4px;font-size:13px;font-weight:700;color:var(--color-title)">${inlineFormat(trimmed.slice(4))}</h4>`);
                i++; continue;
            }
            if (/^## /.test(trimmed)) {
                output.push(`<h3 style="margin:10px 0 5px;font-size:14px;font-weight:700;color:var(--color-title)">${inlineFormat(trimmed.slice(3))}</h3>`);
                i++; continue;
            }
            if (/^# /.test(trimmed)) {
                output.push(`<h2 style="margin:12px 0 6px;font-size:15px;font-weight:700;color:var(--color-title)">${inlineFormat(trimmed.slice(2))}</h2>`);
                i++; continue;
            }

            // Markdown table block (lines starting with |)
            if (trimmed.startsWith('|')) {
                const tableLines = [];
                while (i < lines.length && lines[i].trim().startsWith('|')) {
                    tableLines.push(lines[i].trim());
                    i++;
                }
                output.push(parseMarkdownTable(tableLines));
                continue;
            }

            // Unordered list item (- or *)
            if (/^[-*] /.test(trimmed)) {
                output.push('<li>' + inlineFormat(trimmed.replace(/^[-*] /, '')) + '</li>');
                i++; continue;
            }

            // Ordered list item
            if (/^\d+\.\s/.test(trimmed)) {
                output.push('<li>' + inlineFormat(trimmed.replace(/^\d+\.\s/, '')) + '</li>');
                i++; continue;
            }

            // Empty line → spacing
            if (trimmed === '') {
                output.push('<div style="height:6px"></div>');
                i++; continue;
            }

            output.push('<span>' + inlineFormat(line) + '</span><br>');
            i++;
        }

        // Wrap consecutive <li> into <ul>
        return output.join('')
            .replace(/(<li>.*?<\/li>)+/gs, match => '<ul>' + match + '</ul>');
    }

    function inlineFormat(text) {
        return text
            .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--color-primary);text-decoration:underline">$1</a>')
            .replace(/`([^`]+)`/g,         '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g,    '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g,        '<em>$1</em>')
            .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu, '');
    }

    function parseMarkdownTable(lines) {
        // Filter out separator lines (---|---|---)
        const dataLines = lines.filter(l => !/^[|\s:?-]+$/.test(l));
        if (dataLines.length === 0) return '';

        const parseRow = (line) =>
            line.split('|')
                .map(c => c.trim())
                .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1); // drop empty edge cells

        const headers = parseRow(dataLines[0]);
        const rows    = dataLines.slice(1).map(parseRow);

        const th = headers.map(h => `<th>${inlineFormat(h)}</th>`).join('');
        const trs = rows.map(r =>
            '<tr>' + r.map(c => `<td>${inlineFormat(c)}</td>`).join('') + '</tr>'
        ).join('');

        return `<div class="ai-table-wrapper"><table class="ai-table"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`;
    }

    function appendMessage(role, text) {
        const div = document.createElement("div");
        div.className = `ai-msg ${role}`;
        div.innerHTML = markdownToHtml(text);
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function showTyping() {
        const d   = document.createElement("div");
        d.className = "ai-typing-indicator";
        d.id        = "ai-typing";
        d.innerHTML = '<div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div>';
        chatBody.appendChild(d);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function removeTyping() {
        document.getElementById("ai-typing")?.remove();
    }

    // ── Code execution ────────────────────────────────────────────────────────
    async function executeQuery(code) {
        try {
            const res = await fetch('/api/ai/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            const data = await res.json();
            return data.error ? `ERROR: ${data.error}` : data.result;
        } catch (e) {
            return `ERROR: ${e.message}`;
        }
    }

    // ── API call dispatcher ───────────────────────────────────────────────────
    async function callLLM(systemPrompt, messages) {
        if      (provider === "gemini")           return callGemini(systemPrompt, messages);
        else if (provider === "openai")           return callOpenAI(systemPrompt, messages);
        else if (provider === "anthropic_haiku")  return callAnthropic(systemPrompt, messages, "claude-haiku-4-5");
        else if (provider === "anthropic_sonnet") return callAnthropic(systemPrompt, messages, "claude-sonnet-4-5");
        throw new Error("Proveedor no reconocido");
    }

    // ── Main send handler — multi-turn agentic loop ──────────────────────────
    async function handleSend() {
        const text = inputArea.value.trim();
        if (!text || !apiKey) {
            if (!apiKey) settingsView.classList.add("active");
            return;
        }

        inputArea.value = "";
        appendMessage("user", text);
        showTyping();

        const systemPrompt = buildSystemPrompt();
        // Working copy of history for this turn (not yet committed to chatHistory)
        const workingHistory = [...chatHistory, { role: "user", content: text }];

        try {
            let finalReply = null;
            const MAX_ITERATIONS = 4;

            for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
                const reply = await callLLM(systemPrompt, workingHistory);
                const queryMatch = reply.match(/<query>([\/\s\S]*?)<\/query>/i);

                if (!queryMatch) {
                    // No query tag — this is the final answer
                    finalReply = reply;
                    break;
                }

                // Execute the query
                const code   = queryMatch[1].trim();
                const result = await executeQuery(code);
                const isError = result.startsWith('ERROR:');

                // Push LLM's query turn into working history
                workingHistory.push({ role: "assistant", content: reply });

                if (isError) {
                    // Tell the LLM the error so it can correct and retry
                    workingHistory.push({
                        role: "user",
                        content: `La consulta falló con el siguiente error:\n\`\`\`\n${result}\n\`\`\`\nCorrige el código y envía un nuevo bloque <query> con el código corregido. No le pidas al usuario que ejecute nada.`
                    });
                } else {
                    // Successful result — ask for final answer
                    workingHistory.push({
                        role: "user",
                        content: `Resultado de la consulta pandas:\n\`\`\`\n${result}\n\`\`\`\nUsa este resultado para responder la pregunta original de forma clara y precisa. No incluyas bloques <query> en tu respuesta final.`
                    });
                }

                // If this was the last allowed iteration, force a final answer
                if (iter === MAX_ITERATIONS - 2) {
                    workingHistory.push({ role: "user", content: "Por favor da una respuesta final ahora basándote en los datos obtenidos hasta el momento." });
                }
            }

            if (!finalReply) {
                finalReply = "No pude completar la consulta tras varios intentos. Por favor reformula tu pregunta.";
            }

            // Commit to real chatHistory: user message + final answer only
            chatHistory.push({ role: "user", content: text });
            chatHistory.push({ role: "assistant", content: finalReply });

            removeTyping();
            appendMessage("bot", finalReply);
            speakText(finalReply);

        } catch (err) {
            removeTyping();
            appendMessage("bot", `Error al conectar con la API (**${provider}**). Verifica tu API Key. Detalle: ${err.message}`);
        }
    }

    sendBtn.addEventListener("click", handleSend);
    inputArea.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    // ── LLM Adapters ──────────────────────────────────────────────────────────
    async function callGemini(systemPrompt, messages) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;
        const contents = [
            { role: "user",  parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Entendido, soy el Asistente MetaRed." }] },
            ...messages.map(m => ({
                role:  m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }]
            }))
        ];
        const res  = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    }

    async function callOpenAI(systemPrompt, messages) {
        const res  = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: systemPrompt }, ...messages]
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    }

    async function callAnthropic(systemPrompt, messages, model) {
        // Build strictly alternating user/assistant history
        const formatted = messages.map(m => ({
            role:    m.role === "assistant" ? "assistant" : "user",
            content: m.content
        }));
        const res  = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "x-api-key":     apiKey,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true"
            },
            body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, messages: formatted })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.content[0].text;
    }

});
