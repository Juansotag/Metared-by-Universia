/**
 * AI Assistant Logic for MetaRed Dashboard
 * Supports Gemini, OpenAI (ChatGPT) and Anthropic (Claude)
 */
document.addEventListener("DOMContentLoaded", function () {
    // --- Elements ---
    const fab = document.getElementById("ai-fab");
    const chatWindow = document.getElementById("ai-chat-window");
    const closeBtn = document.getElementById("ai-close-btn");
    const settingsToggle = document.getElementById("ai-settings-toggle");
    const settingsView = document.getElementById("ai-settings-view");
    const saveSettingsBtn = document.getElementById("ai-save-settings");
    const providerSelect = document.getElementById("ai-provider");
    const apiKeyInput = document.getElementById("ai-apikey");
    const corsWarning = document.getElementById("ai-cors-warning");
    const chatBody = document.getElementById("ai-chat-body");
    const inputArea = document.getElementById("ai-input");
    const sendBtn = document.getElementById("ai-send-btn");
    const micBtn = document.getElementById("ai-mic-btn");
    const ttsBtn = document.getElementById("ai-tts-btn");

    // --- State ---
    let apiKey = localStorage.getItem("metared_ai_key") || "";
    let provider = localStorage.getItem("metared_ai_provider") || "gemini";
    let chatHistory = [];
    let isTTSActive = false;
    let isRecording = false;

    // --- Initialize ---
    if (apiKey) {
        settingsView.classList.remove("active");
        apiKeyInput.value = apiKey;
        providerSelect.value = provider;
    }

    providerSelect.addEventListener("change", (e) => {
        if (e.target.value === "anthropic") {
            corsWarning.style.display = "block";
        } else {
            corsWarning.style.display = "none";
        }
    });
    // Trigger change to set initial warning state
    providerSelect.dispatchEvent(new Event("change"));

    // --- UI Toggles ---
    fab.addEventListener("click", () => {
        chatWindow.classList.add("open");
        fab.style.display = "none";
    });

    closeBtn.addEventListener("click", () => {
        chatWindow.classList.remove("open");
        fab.style.display = "flex";
    });

    settingsToggle.addEventListener("click", () => {
        settingsView.classList.toggle("active");
    });

    saveSettingsBtn.addEventListener("click", () => {
        apiKey = apiKeyInput.value.trim();
        provider = providerSelect.value;
        if (apiKey) {
            localStorage.setItem("metared_ai_key", apiKey);
            localStorage.setItem("metared_ai_provider", provider);
            settingsView.classList.remove("active");
        } else {
            alert("Por favor, introduce una API Key válida.");
        }
    });

    // --- Text to Speech (TTS) ---
    ttsBtn.addEventListener("click", () => {
        isTTSActive = !isTTSActive;
        if (isTTSActive) {
            ttsBtn.style.color = "#e42424"; // Highlight when active
        } else {
            ttsBtn.style.color = "white";
            window.speechSynthesis.cancel(); // Stop speaking if turned off
        }
    });

    function speakText(text) {
        if (!isTTSActive || !window.speechSynthesis) return;
        
        // Remove markdown or HTML tags for speech
        const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/(\*\*|\*|#|`)/g, '');
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        // Try to guess language based on some basic heuristic or just use browser default
        utterance.lang = 'es-ES'; // Default to Spanish for this dashboard
        window.speechSynthesis.speak(utterance);
    }

    // --- Speech to Text (STT) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        // recognition.lang = 'es-ES'; // You can let it auto-detect or force ES

        recognition.onstart = function() {
            isRecording = true;
            micBtn.classList.add("recording");
            inputArea.placeholder = "Escuchando...";
        };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            inputArea.value += (inputArea.value ? ' ' : '') + transcript;
        };

        recognition.onerror = function(event) {
            console.error("Speech recognition error", event.error);
            isRecording = false;
            micBtn.classList.remove("recording");
            inputArea.placeholder = "Pregunta algo sobre los datos...";
        };

        recognition.onend = function() {
            isRecording = false;
            micBtn.classList.remove("recording");
            inputArea.placeholder = "Pregunta algo sobre los datos...";
        };
    } else {
        micBtn.style.display = "none"; // Hide if not supported
    }

    micBtn.addEventListener("click", () => {
        if (!recognition) return;
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    // --- Chat Logic ---
    function appendMessage(role, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `ai-msg ${role}`;
        
        // Basic markdown to HTML (bold, lists)
        let htmlText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
            
        msgDiv.innerHTML = htmlText;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function showTyping() {
        const typingDiv = document.createElement("div");
        typingDiv.className = "ai-typing-indicator";
        typingDiv.id = "ai-typing";
        typingDiv.innerHTML = '<div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div>';
        chatBody.appendChild(typingDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function removeTyping() {
        const typingDiv = document.getElementById("ai-typing");
        if (typingDiv) typingDiv.remove();
    }

    function buildSystemPrompt() {
        // Build a summary of the data to give context without blowing up the token limit
        let contextData = "No hay datos cargados aún.";
        
        if (window.surveyData && window.practicesData) {
            const totalIES = window.surveyData.length;
            const totalPractices = window.practicesData.length;
            
            // Just a lightweight sample of the structure
            const sampleIES = window.surveyData.slice(0, 3).map(u => `${u.name} (${u.country_code})`);
            
            contextData = `
El dashboard "MetaRed ESG" muestra datos de sostenibilidad en Instituciones de Educación Superior (IES) iberoamericanas.
- Total de IES encuestadas: ${totalIES}
- Total de Buenas Prácticas registradas: ${totalPractices}
- Ejemplos de IES: ${sampleIES.join(", ")}
- Los filtros actuales en la UI permiten filtrar por País, Titularidad, Tamaño y Sello Concedido.
`;
        }

        return `Eres el Asistente Inteligente de MetaRed S. Tu objetivo es ayudar a los usuarios del dashboard a entender la información sobre sostenibilidad, responsabilidad social y ambiental en IES (Instituciones de Educación Superior).
        
Contexto actual del Dashboard:
${contextData}

Reglas:
1. Responde siempre en el mismo idioma en el que el usuario te pregunte (ej. si pregunta en portugués, responde en portugués. Si en inglés, en inglés. Por defecto, español).
2. Sé conciso y directo, ya que tus respuestas se mostrarán en una ventana de chat pequeña.
3. Puedes usar viñetas y formato Markdown básico (**negrita**) para estructurar tus respuestas.
4. Si te preguntan sobre datos específicos que no tienes en este pequeño contexto, explica que eres una IA de asistencia sobre la interfaz y pídeles que usen los filtros y gráficas del Dashboard para ver el detalle completo.`;
    }

    async function sendMessageToAPI(userText) {
        if (!apiKey) {
            settingsView.classList.add("active");
            return "Por favor, configura tu API Key primero.";
        }

        chatHistory.push({ role: "user", content: userText });
        
        try {
            let reply = "";
            const systemPrompt = buildSystemPrompt();

            if (provider === "gemini") {
                reply = await callGeminiAPI(systemPrompt, userText);
            } else if (provider === "openai") {
                reply = await callOpenAIAPI(systemPrompt, userText);
            } else if (provider === "anthropic") {
                reply = await callAnthropicAPI(systemPrompt, userText);
            }

            chatHistory.push({ role: "assistant", content: reply });
            return reply;

        } catch (error) {
            console.error("API Error:", error);
            return `Error al conectar con la API (${provider}). Asegúrate de que tu API Key sea correcta o verifica si hay problemas de conexión. Detalle: ${error.message}`;
        }
    }

    // --- API Calls ---
    async function callGeminiAPI(systemPrompt, userText) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;
        
        // Convert history for Gemini
        const contents = [];
        contents.push({ role: "user", parts: [{ text: systemPrompt }] });
        contents.push({ role: "model", parts: [{ text: "Entendido, soy el asistente de MetaRed." }] });
        
        chatHistory.forEach(msg => {
            contents.push({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }]
            });
        });

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: contents })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        return data.candidates[0].content.parts[0].text;
    }

    async function callOpenAIAPI(systemPrompt, userText) {
        const url = "https://api.openai.com/v1/chat/completions";
        
        const messages = [{ role: "system", content: systemPrompt }, ...chatHistory];

        const response = await fetch(url, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // fallback o gpt-3.5-turbo
                messages: messages
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        return data.choices[0].message.content;
    }

    async function callAnthropicAPI(systemPrompt, userText) {
        const url = "https://api.anthropic.com/v1/messages";
        
        // Format history (Anthropic requires strictly alternating user/assistant)
        let formattedHistory = [...chatHistory];
        
        const response = await fetch(url, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true" // Required for browser calls
            },
            body: JSON.stringify({
                model: "claude-3-haiku-20240307",
                max_tokens: 1024,
                system: systemPrompt,
                messages: formattedHistory
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        return data.content[0].text;
    }

    // --- Input Handling ---
    async function handleSend() {
        const text = inputArea.value.trim();
        if (!text) return;

        inputArea.value = "";
        appendMessage("user", text);
        showTyping();

        const reply = await sendMessageToAPI(text);
        
        removeTyping();
        appendMessage("bot", reply);
        speakText(reply);
    }

    sendBtn.addEventListener("click", handleSend);
    inputArea.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

});
