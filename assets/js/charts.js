// --- DASHBOARD ANALYTICS AND INTERACTIVE CHARTS LOGIC ---

document.addEventListener("DOMContentLoaded", function () {
    let surveyData = null;
    let practicesData = null;
    let activeFilters = { country: "ALL", ownership: "ALL", character: "ALL", seal: "ALL", size: "ALL" };
    let activeCharts = {};

    // Country map codes to full names (Spanish)
    const countryCodesMap = {
        'ES': 'España', 'BR': 'Brasil', 'MX': 'México', 'CL': 'Chile',
        'CO': 'Colombia', 'AR': 'Argentina', 'PE': 'Perú', 'EC': 'Ecuador'
    };
    const countryNamesMap = Object.fromEntries(Object.entries(countryCodesMap).map(([k, v]) => [v, k]));

    // Reusable percentage formatter for Pie/Doughnut tooltips
    const pctTooltip = {
        callbacks: {
            label: function(context) {
                let label = context.label || '';
                if (label) label += ': ';
                let val = context.raw;
                let total = context.dataset.data.reduce((a, b) => a + b, 0);
                let pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                label += val.toLocaleString() + ' (' + pct + '%)';
                return label;
            }
        }
    };

    // Initialize Leaflet Map
    function initMap() {
        if (window.bbppMap) return;
        
        // Center around Latin America/Spain
        window.bbppMap = L.map('practices-map').setView([-10, -60], 3);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(window.bbppMap);
        
        window.bbppMarkersGroup = L.layerGroup().addTo(window.bbppMap);
    }

    // Fetch raw datasets on page load
    Promise.all([
        fetch('/api/encuesta').then(r => r.json()),
        fetch('/api/buenas-practicas').then(r => r.json())
    ]).then(([survey, practices]) => {
        surveyData = survey;
        practicesData = practices;

        // Hide loader
        document.getElementById("loading-overlay").style.opacity = 0;
        setTimeout(() => {
            document.getElementById("loading-overlay").style.display = "none";
        }, 300);

        // Populate country dropdowns dynamically
        populateCountryDropdowns();
        
        // Initialize Map
        initMap();

        // Attach change listeners to local histogram group selects
        ['energia', 'carbono', 'residuos', 'agua'].forEach(ind => {
            const select = document.getElementById(`group-${ind}`);
            if (select) {
                select.addEventListener('change', function() {
                    const filteredUnis = filterUniversities(surveyData.universities, activeFilters);
                    renderHistogram(`chart-histogram-${ind}`, filteredUnis, ind, this.value);
                });
            }
        });

        // Initial render
        window.updateDashboardData("ALL", "ALL", "ALL", "ALL", "ALL");
    }).catch(err => {
        console.error("Error loading data:", err);
        document.getElementById("loading-overlay").innerHTML = `
            <div style="color: #e42424; font-size: 24px; font-weight:700;">Error al cargar datos</div>
            <p style="color: #666;">Por favor, asegúrate de que el servidor Flask esté corriendo y los datos de Excel estén procesados.</p>
        `;
    });

    // Populate country lists
    function populateCountryDropdowns() {
        const countrySelect = document.getElementById("filter-country");
        const bbppCountrySelect = document.getElementById("filter-bbpp-country");

        const countries = Object.keys(surveyData.by_country).sort();
        countries.forEach(c => {
            const countryName = countryCodesMap[c] || c;
            
            const opt1 = document.createElement("option");
            opt1.value = c;
            opt1.textContent = countryName;
            countrySelect.appendChild(opt1);

            const opt2 = document.createElement("option");
            opt2.value = c;
            opt2.textContent = countryName;
            bbppCountrySelect.appendChild(opt2);
        });

        // Attach listener specifically for BBPP Country Filter
        bbppCountrySelect.addEventListener("change", function() {
            renderBBPPList();
        });
        document.getElementById("filter-bbpp-theme").addEventListener("change", function() {
            renderBBPPList();
        });
        document.getElementById("bbpp-search").addEventListener("input", function() {
            renderBBPPList();
        });
    }

    // Main Filter function called by filters.js
    window.updateDashboardData = function (country, ownership, character, seal, size) {
        if (!surveyData) return;
        activeFilters = { country, ownership, character, seal, size: size || "ALL" };
        
        // Sync the BBPP country dropdown with the global filters
        if (country !== "ALL") {
            document.getElementById("filter-bbpp-country").value = country;
        }

        // Apply filters to survey university records
        const filteredUnis = filterUniversities(surveyData.universities, activeFilters);

        // 1. UPDATE HOME GAUGES
        updateHomeGauges(filteredUnis);

        // 2. UPDATE MUESTRA PAGE
        updateMuestraPage(filteredUnis);

        // 3. UPDATE INDICADORES BÁSICOS PAGE
        updateIndicadoresPage(filteredUnis);

        // 4. UPDATE DIMENSIÓN AMBIENTAL
        updateAmbientalPage(filteredUnis);

        // 5. UPDATE DIMENSIÓN SOCIAL
        updateSocialPage(filteredUnis);

        // 6. UPDATE DIMENSIÓN GOBERNANZA
        updateGobernanzaPage(filteredUnis);

        // 7. UPDATE SELLOS
        updateSellosPage(filteredUnis);

        // 8. UPDATE BUENAS PRÁCTICAS
        renderBBPPList();
    };

    // Filter helper
    function filterUniversities(unis, filters) {
        return unis.filter(u => {
            const countryMatch = filters.country === "ALL" || u.country_code === filters.country;
            const ownershipMatch = filters.ownership === "ALL" || u.ownership === filters.ownership;
            const characterMatch = filters.character === "ALL" || u.character === filters.character;
            const sealMatch = filters.seal === "ALL" || u.seal === filters.seal;
            
            // Size filter mapping
            let sizeMatch = true;
            if (filters.size !== "ALL") {
                const students = u.students;
                if (students === null || students === undefined) {
                    sizeMatch = false;
                } else if (filters.size === "Pequeña") {
                    sizeMatch = students <= 5000;
                } else if (filters.size === "Mediana") {
                    sizeMatch = students > 5000 && students <= 20000;
                } else if (filters.size === "Grande") {
                    sizeMatch = students > 20000;
                }
            }
            
            return countryMatch && ownershipMatch && characterMatch && sealMatch && sizeMatch;
        });
    }

    // Destroy existing chart helper to avoid canvas re-rendering bugs
    function safeRenderChart(canvasId, config) {
        if (activeCharts[canvasId]) {
            activeCharts[canvasId].destroy();
        }
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            activeCharts[canvasId] = new Chart(ctx, config);
        }
    }

    // Dynamic stats calculator helper
    function calculateStatsForIndicator(unis, key) {
        const vals = unis.map(u => u[key]).filter(v => v !== null && v !== undefined);
        if (vals.length === 0) {
            return { total: 0, mean: 0, median: 0, min: 0, max: 0, samples: 0 };
        }
        vals.sort((a, b) => a - b);
        const total = vals.reduce((sum, v) => sum + v, 0);
        const mean = total / vals.length;
        const min = vals[0];
        const max = vals[vals.length - 1];
        let median = 0;
        const mid = Math.floor(vals.length / 2);
        if (vals.length % 2 !== 0) {
            median = vals[mid];
        } else {
            median = (vals[mid - 1] + vals[mid]) / 2;
        }
        return { total, mean, median, min, max, samples: vals.length };
    }

    // Dynamic histogram drawing helper
    function renderHistogram(canvasId, unis, key, groupByKey) {
        const validUnis = unis.filter(u => u[key] !== null && u[key] !== undefined);
        
        if (activeCharts[canvasId]) {
            activeCharts[canvasId].destroy();
        }
        
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if (validUnis.length === 0) {
            activeCharts[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Sin datos de distribución válidos', font: { size: 13, weight: 'bold' } }
                    }
                }
            });
            return;
        }
        
        const vals = validUnis.map(u => u[key]).sort((a, b) => a - b);
        const min = vals[0];
        const max = vals[vals.length - 1];
        
        const numBins = 6;
        let binSize = (max - min) / numBins;
        if (binSize === 0) binSize = 1;
        
        const bins = [];
        for (let i = 0; i < numBins; i++) {
            const bMin = min + i * binSize;
            const bMax = min + (i + 1) * binSize;
            bins.push({
                min: bMin,
                max: bMax,
                label: formatBinLabel(bMin, bMax, key),
                unis: []
            });
        }
        
        validUnis.forEach(u => {
            const val = u[key];
            let assigned = false;
            for (let i = 0; i < numBins; i++) {
                if (val >= bins[i].min && val <= bins[i].max) {
                    bins[i].unis.push(u);
                    assigned = true;
                    break;
                }
            }
            if (!assigned) {
                bins[numBins - 1].unis.push(u);
            }
        });
        
        const groups = new Set();
        validUnis.forEach(u => {
            let groupVal = u[groupByKey];
            if (groupByKey === 'country_code') {
                groupVal = countryCodesMap[u.country_code] || u.country_code;
            } else if (groupByKey === 'size') {
                const students = u.students;
                if (students === null || students === undefined) groupVal = 'Desconocido';
                else if (students <= 5000) groupVal = 'Pequeña (≤ 5k)';
                else if (students <= 20000) groupVal = 'Mediana (5k - 20k)';
                else groupVal = 'Grande (> 20k)';
            }
            groups.add(groupVal || 'No responde');
        });
        const groupsList = Array.from(groups).sort();
        
        const datasets = [];
        const stackColors = {
            'country_code': ['#e42424', '#68b631', '#4092df', '#f5b14b', '#8a3ffc', '#009688', '#ff5722', '#795548'],
            'ownership': ['#e42424', '#4092df', '#f5b14b', '#999'],
            'character': ['#68b631', '#f5b14b', '#999'],
            'seal': ['#3c5ecc', '#f5b14b', '#68b631', '#999'],
            'size': ['#8a3ffc', '#4092df', '#68b631', '#999']
        };
        const palette = stackColors[groupByKey] || ['#e42424', '#68b631', '#4092df', '#f5b14b'];
        
        groupsList.forEach((groupName, gIdx) => {
            const data = bins.map(bin => {
                return bin.unis.filter(u => {
                    let uGroupVal = u[groupByKey];
                    if (groupByKey === 'country_code') {
                        uGroupVal = countryCodesMap[u.country_code] || u.country_code;
                    } else if (groupByKey === 'size') {
                        const students = u.students;
                        if (students === null || students === undefined) uGroupVal = 'Desconocido';
                        else if (students <= 5000) uGroupVal = 'Pequeña (≤ 5k)';
                        else if (students <= 20000) uGroupVal = 'Mediana (5k - 20k)';
                        else uGroupVal = 'Grande (> 20k)';
                    }
                    return (uGroupVal || 'No responde') === groupName;
                }).length;
            });
            
            datasets.push({
                label: groupName,
                data: data,
                backgroundColor: palette[gIdx % palette.length],
                borderWidth: 0
            });
        });
        
        activeCharts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: bins.map(b => b.label),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 10, font: { size: 10 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                label += context.raw + ' IES';
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function formatBinLabel(bMin, bMax, key) {
        const suffix = key === 'energia' ? ' kWh' : key === 'carbono' ? ' t' : key === 'residuos' ? '%' : ' m³';
        return formatNumberShort(bMin) + ' - ' + formatNumberShort(bMax) + suffix;
    }
    
    function formatNumberShort(num) {
        if (num >= 1e6) {
            return (num / 1e6).toFixed(1) + 'M';
        } else if (num >= 1e3) {
            return (num / 1e3).toFixed(1) + 'k';
        } else {
            return Math.round(num).toString();
        }
    }

    // --- 1. HOME GAUGES ---
    function updateHomeGauges(unis) {
        if (unis.length === 0) {
            document.getElementById("home-val-ambiental").innerText = "0.0";
            document.getElementById("home-val-social").innerText = "0.0";
            document.getElementById("home-val-gobernanza").innerText = "0%";
            return;
        }

        const avgAmbiental = unis.reduce((sum, u) => sum + u.score_ambiental, 0) / unis.length;
        const avgSocial = unis.reduce((sum, u) => sum + u.score_social, 0) / unis.length;
        const avgGobernanza = unis.reduce((sum, u) => sum + u.score_gobernanza, 0) / unis.length;

        document.getElementById("home-val-ambiental").innerText = avgAmbiental.toFixed(2);
        document.getElementById("home-val-social").innerText = avgSocial.toFixed(2);
        document.getElementById("home-val-gobernanza").innerText = (avgGobernanza * 100).toFixed(0) + "%";

        const doughnutConfig = (val, max, color) => ({
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [val, max - val],
                    backgroundColor: [color, '#e6e6e6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });

        safeRenderChart("home-gauge-ambiental", doughnutConfig(avgAmbiental - 1, 4, "#68b631"));
        safeRenderChart("home-gauge-social", doughnutConfig(avgSocial - 1, 4, "#4092df"));
        safeRenderChart("home-gauge-gobernanza", doughnutConfig(avgGobernanza, 1, "#f5b14b"));
    }

    // --- 2. MUESTRA PAGE ---
    function updateMuestraPage(unis) {
        document.getElementById("kpi-total-ies").innerText = unis.length;

        const validStudents = unis.filter(u => u.students !== null);
        const totalStudents = validStudents.reduce((sum, u) => sum + u.students, 0);
        document.getElementById("kpi-total-students").innerText = totalStudents.toLocaleString();

        const validEmployees = unis.filter(u => u.employees !== null);
        const totalEmployees = validEmployees.reduce((sum, u) => sum + u.employees, 0);
        document.getElementById("kpi-total-employees").innerText = totalEmployees.toLocaleString();

        // Country Distribution — Density chart (% within filtered group)
        const countryCounts = {};
        unis.forEach(u => countryCounts[u.country_code] = (countryCounts[u.country_code] || 0) + 1);
        const sortedCountries = Object.keys(countryCounts).sort((a, b) => countryCounts[b] - countryCounts[a]);
        const totalUnis = unis.length || 1;
        const countryPcts = sortedCountries.map(c => parseFloat(((countryCounts[c] / totalUnis) * 100).toFixed(1)));

        safeRenderChart("chart-muestra-paises", {
            type: 'bar',
            data: {
                labels: sortedCountries.map(c => countryCodesMap[c] || c),
                datasets: [{
                    label: '% de IES',
                    data: countryPcts,
                    backgroundColor: sortedCountries.map((_, i) =>
                        ['#e42424','#68b631','#4092df','#f5b14b','#8a3ffc','#009688','#ff5722','#795548'][i % 8]
                    ),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const pct = context.raw;
                                const abs = countryCounts[sortedCountries[context.dataIndex]];
                                return `${pct}% del total filtrado (${abs} IES)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: v => v + '%'
                        },
                        title: {
                            display: true,
                            text: '% dentro del grupo filtrado',
                            font: { size: 11 }
                        }
                    },
                    x: { grid: { display: false } }
                }
            }
        });

        // Tipology Donut
        const tipologyCounts = {};
        unis.forEach(u => {
            const val = u.ownership;
            tipologyCounts[val] = (tipologyCounts[val] || 0) + 1;
        });
        safeRenderChart("chart-muestra-tipologia", {
            type: 'doughnut',
            data: {
                labels: Object.keys(tipologyCounts),
                datasets: [{
                    data: Object.values(tipologyCounts),
                    backgroundColor: ['#e42424', '#4092df', '#f5b14b', '#999']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: pctTooltip
                }
            }
        });

        // Caracter Donut
        const caracterCounts = {};
        unis.forEach(u => {
            const val = u.character;
            caracterCounts[val] = (caracterCounts[val] || 0) + 1;
        });
        safeRenderChart("chart-muestra-caracter", {
            type: 'doughnut',
            data: {
                labels: Object.keys(caracterCounts),
                datasets: [{
                    data: Object.values(caracterCounts),
                    backgroundColor: ['#68b631', '#f5b14b', '#999']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: pctTooltip
                }
            }
        });

        // Student totals per country
        const studentsPerCountry = {};
        sortedCountries.forEach(c => {
            studentsPerCountry[c] = unis.filter(u => u.country_code === c).reduce((sum, u) => sum + (u.students || 0), 0);
        });

        safeRenderChart("chart-muestra-estudiantes-pie", {
            type: 'pie',
            data: {
                labels: sortedCountries.map(c => countryCodesMap[c] || c),
                datasets: [{
                    data: sortedCountries.map(c => studentsPerCountry[c]),
                    backgroundColor: ['#e42424', '#68b631', '#4092df', '#f5b14b', '#8a3ffc', '#009688', '#ff5722', '#795548']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { position: 'right', labels: { boxWidth: 12 } },
                    tooltip: pctTooltip
                }
            }
        });

        // Draw Modality Stacked Bar Chart dynamically
        const presencialesData = [];
        const hibridasData = [];
        const virtualesData = [];
        
        sortedCountries.forEach(c => {
            const countryUnis = unis.filter(u => u.country_code === c && u.students !== null);
            const pres = countryUnis.reduce((sum, u) => sum + u.students_presenciales, 0);
            const hib = countryUnis.reduce((sum, u) => sum + u.students_hibridos, 0);
            const virt = countryUnis.reduce((sum, u) => sum + u.students_virtuales, 0);
            const total = pres + hib + virt;
            
            if (total > 0) {
                presencialesData.push((pres / total) * 100);
                hibridasData.push((hib / total) * 100);
                virtualesData.push((virt / total) * 100);
            } else {
                presencialesData.push(0);
                hibridasData.push(0);
                virtualesData.push(0);
            }
        });

        safeRenderChart("chart-muestra-modalidad", {
            type: 'bar',
            data: {
                labels: sortedCountries.map(c => countryCodesMap[c] || c),
                datasets: [
                    { label: 'Presencial', data: presencialesData, backgroundColor: '#e42424' },
                    { label: 'Híbrida', data: hibridasData, backgroundColor: '#4092df' },
                    { label: 'Virtual', data: virtualesData, backgroundColor: '#68b631' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true, max: 100 } },
                plugins: { legend: { position: 'bottom' } }
            }
        });

        // Populate Table
        const tbody = document.querySelector("#table-muestra-paises tbody");
        tbody.innerHTML = "";
        
        sortedCountries.forEach(c => {
            const countryUnis = unis.filter(u => u.country_code === c);
            const studentCounts = countryUnis.map(u => u.students).filter(v => v !== null && v !== undefined).sort((a, b) => a - b);
            
            const total = studentCounts.reduce((s, v) => s + v, 0);
            const min = studentCounts[0] || 0;
            const max = studentCounts[studentCounts.length - 1] || 0;
            const mean = total / (studentCounts.length || 1);
            
            let median = 0;
            if (studentCounts.length > 0) {
                const mid = Math.floor(studentCounts.length / 2);
                median = studentCounts.length % 2 !== 0 ? studentCounts[mid] : (studentCounts[mid - 1] + studentCounts[mid]) / 2;
            }

            const tr = document.createElement("tr");
            if (c === activeFilters.country) tr.className = "highlighted-country";
            
            tr.innerHTML = `
                <td>${countryCodesMap[c] || c}</td>
                <td>${countryUnis.length}</td>
                <td>${studentCounts.length > 0 ? total.toLocaleString() : '-'}</td>
                <td>${studentCounts.length > 0 ? min.toLocaleString() : '-'}</td>
                <td>${studentCounts.length > 0 ? max.toLocaleString() : '-'}</td>
                <td>${studentCounts.length > 0 ? median.toLocaleString() : '-'}</td>
                <td>
                    <div class="bar-cell">
                        <div class="bar-outer">
                            <div class="bar-inner" style="width: ${studentCounts.length > 0 ? (mean / 40000 * 100).toFixed(0) : 0}%"></div>
                        </div>
                        <span class="bar-val">${studentCounts.length > 0 ? Math.round(mean).toLocaleString() : '-'}</span>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- 3. INDICADORES BÁSICOS PAGE ---
    function updateIndicadoresPage(unis) {
        const indicators = ['energia', 'carbono', 'residuos', 'agua'];
        const labelColors = { energia: 'primary', carbono: 'green', residuos: 'orange', agua: 'blue' };

        indicators.forEach(ind => {
            const kpiRow = document.getElementById(`kpis-${ind}`);
            if (!kpiRow) return;

            // Compute statistics dynamically from client filtered unis list
            const currentStats = calculateStatsForIndicator(unis, ind);
            const suffix = ind === 'energia' ? ' kWh' : ind === 'carbono' ? ' t' : ind === 'residuos' ? '%' : ' m³';
            const colorClass = labelColors[ind];

            kpiRow.innerHTML = `
                <div class="kpi-card">
                    <div class="kpi-content">
                        <span class="kpi-value">${currentStats.samples > 0 ? currentStats.mean.toLocaleString(undefined, {maximumFractionDigits: 1}) + suffix : '-'}</span>
                        <span class="kpi-label">Media</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-content">
                        <span class="kpi-value">${currentStats.samples > 0 ? currentStats.min.toLocaleString(undefined, {maximumFractionDigits: 1}) + suffix : '-'}</span>
                        <span class="kpi-label">Mínimo</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-content">
                        <span class="kpi-value">${currentStats.samples > 0 ? currentStats.max.toLocaleString(undefined, {maximumFractionDigits: 1}) + suffix : '-'}</span>
                        <span class="kpi-label">Máximo</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-content">
                        <span class="kpi-value">${currentStats.samples > 0 ? (ind === 'residuos' ? currentStats.mean.toLocaleString(undefined, {maximumFractionDigits: 1}) + suffix : currentStats.total.toLocaleString(undefined, {maximumFractionDigits: 0}) + suffix) : '-'}</span>
                        <span class="kpi-label">${ind === 'residuos' ? 'Promedio Global' : 'Total'}</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-content">
                        <span class="kpi-value">${currentStats.samples > 0 ? currentStats.median.toLocaleString(undefined, {maximumFractionDigits: 1}) + suffix : '-'}</span>
                        <span class="kpi-label">Mediana</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-content">
                        <span class="kpi-value">${currentStats.samples}</span>
                        <span class="kpi-label">Muestras</span>
                    </div>
                </div>
            `;

            // Draw Country Stats Table dynamically
            const tbody = document.querySelector(`#table-indicadores-${ind} tbody`);
            tbody.innerHTML = "";

            const countriesList = Object.keys(surveyData.by_country).sort();
            const countryStats = {};
            countriesList.forEach(c => {
                const countryUnis = unis.filter(u => u.country_code === c);
                countryStats[c] = calculateStatsForIndicator(countryUnis, ind);
            });

            const maxMean = Math.max(...Object.values(countryStats).map(s => s.mean), 1.0);

            Object.entries(countryStats).sort().forEach(([c, s]) => {
                const tr = document.createElement("tr");
                if (c === activeFilters.country) tr.className = "highlighted-country";

                const displayTotal = ind === 'residuos' ? s.mean.toLocaleString(undefined, {maximumFractionDigits: 1}) + suffix : s.total.toLocaleString(undefined, {maximumFractionDigits: 0}) + suffix;

                tr.innerHTML = `
                    <td>${countryCodesMap[c] || c}</td>
                    <td>${s.samples}</td>
                    <td>${s.samples > 0 ? displayTotal : '-'}</td>
                    <td>${s.samples > 0 ? s.min.toLocaleString(undefined, {maximumFractionDigits: 1}) + suffix : '-'}</td>
                    <td>${s.samples > 0 ? s.max.toLocaleString(undefined, {maximumFractionDigits: 1}) + suffix : '-'}</td>
                    <td>${s.samples > 0 ? s.median.toLocaleString(undefined, {maximumFractionDigits: 1}) + suffix : '-'}</td>
                    <td>
                        <div class="bar-cell">
                            <div class="bar-outer">
                                <div class="bar-inner ${colorClass}" style="width: ${s.samples > 0 ? (s.mean / maxMean * 100).toFixed(0) : 0}%"></div>
                            </div>
                            <span class="bar-val">${s.samples > 0 ? s.mean.toLocaleString(undefined, {maximumFractionDigits: 1}) + suffix : '-'}</span>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Render/Update Stacked Histogram on the right
            const groupSelect = document.getElementById(`group-${ind}`);
            const currentGroupByKey = groupSelect ? groupSelect.value : 'country_code';
            renderHistogram(`chart-histogram-${ind}`, unis, ind, currentGroupByKey);
        });
    }

    // --- 4. DIMENSIÓN AMBIENTAL ---
    function updateAmbientalPage(unis) {
        if (unis.length === 0) {
            document.getElementById("val-ambiental-gauge").innerText = "0.0";
            return;
        }

        const avgScore = unis.reduce((sum, u) => sum + u.score_ambiental, 0) / unis.length;
        document.getElementById("val-ambiental-gauge").innerText = avgScore.toFixed(2);

        // Circular Gauge
        safeRenderChart("chart-ambiental-gauge", {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [avgScore - 1, 4 - (avgScore - 1)],
                    backgroundColor: ['#68b631', '#e6e6e6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });

        // Bar Chart per country
        const countryScores = {};
        const countriesList = Object.keys(surveyData.by_country).sort();
        countriesList.forEach(c => {
            const countryUnis = unis.filter(u => u.country_code === c);
            countryScores[c] = countryUnis.reduce((sum, u) => sum + u.score_ambiental, 0) / (countryUnis.length || 1);
        });

        safeRenderChart("chart-ambiental-paises", {
            type: 'bar',
            data: {
                labels: countriesList.map(c => countryCodesMap[c] || c),
                datasets: [{
                    label: 'Puntuación Media',
                    data: countriesList.map(c => countryScores[c]),
                    backgroundColor: '#68b631'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { min: 1, max: 5 } }
            }
        });

        // Radar chart (Global avg calculated dynamically from filtered active list)
        const subQuestions = surveyData.ambiental_sub_questions;
        if (!subQuestions || subQuestions.length === 0) {
            // Hide radar cards gracefully
            const radarCards = document.querySelectorAll('#chart-ambiental-radar-global, #chart-ambiental-radar-paises');
            radarCards.forEach(c => { if (c && c.parentElement && c.parentElement.parentElement) c.parentElement.parentElement.style.display = 'none'; });
        } else {
            const dynamicGlobalRadarData = subQuestions.map(q => {
                return unis.reduce((sum, u) => sum + (u[q.id] || 0), 0) / (unis.length || 1);
            });

            safeRenderChart("chart-ambiental-radar-global", {
                type: 'radar',
                data: {
                    labels: subQuestions.map(q => q.full_text),
                    datasets: [{
                        label: 'Promedio Filtro Activo',
                        data: dynamicGlobalRadarData,
                        borderColor: '#68b631',
                        backgroundColor: 'rgba(104, 182, 49, 0.2)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { r: { min: 1, max: 5 } }
                }
            });

            // Radar chart (Selected countries comparison calculated dynamically)
            const radarDatasets = [];
            const colors = ['#e42424', '#68b631', '#4092df', '#f5b14b', '#8a3ffc', '#009688', '#ff5722', '#795548'];
            const activeCountries = Array.from(new Set(unis.map(u => u.country_code))).sort();

            activeCountries.slice(0, 5).forEach((c, idx) => {
                const countryUnis = unis.filter(u => u.country_code === c);
                const data = subQuestions.map(q => {
                    const sum = countryUnis.reduce((s, u) => s + (u[q.id] || 0), 0);
                    return countryUnis.length > 0 ? sum / countryUnis.length : 1;
                });

                radarDatasets.push({
                    label: countryCodesMap[c] || c,
                    data: data,
                    borderColor: colors[idx % colors.length],
                    backgroundColor: 'transparent',
                    borderWidth: 2
                });
            });

            safeRenderChart("chart-ambiental-radar-paises", {
                type: 'radar',
                data: {
                    labels: subQuestions.map(q => q.full_text),
                    datasets: radarDatasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { r: { min: 1, max: 5 } }
                }
            });
        }
    }

    // --- 5. DIMENSIÓN SOCIAL ---
    function updateSocialPage(unis) {
        if (unis.length === 0) {
            document.getElementById("val-social-gauge").innerText = "0.0";
            return;
        }

        const avgScore = unis.reduce((sum, u) => sum + u.score_social, 0) / unis.length;
        document.getElementById("val-social-gauge").innerText = avgScore.toFixed(2);

        // Circular Gauge
        safeRenderChart("chart-social-gauge", {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [avgScore - 1, 4 - (avgScore - 1)],
                    backgroundColor: ['#4092df', '#e6e6e6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });

        // Bar Chart per country
        const countryScores = {};
        const countriesList = Object.keys(surveyData.by_country).sort();
        countriesList.forEach(c => {
            const countryUnis = unis.filter(u => u.country_code === c);
            countryScores[c] = countryUnis.reduce((sum, u) => sum + u.score_social, 0) / (countryUnis.length || 1);
        });

        safeRenderChart("chart-social-paises", {
            type: 'bar',
            data: {
                labels: countriesList.map(c => countryCodesMap[c] || c),
                datasets: [{
                    label: 'Puntuación Media',
                    data: countriesList.map(c => countryScores[c]),
                    backgroundColor: '#4092df'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { min: 1, max: 5 } }
            }
        });

        // Radar chart (Global avg calculated dynamically from filtered active list)
        const subQuestions = surveyData.social_sub_questions;
        if (!subQuestions || subQuestions.length === 0) {
            const radarCards = document.querySelectorAll('#chart-social-radar-global, #chart-social-radar-paises');
            radarCards.forEach(c => { if (c && c.parentElement && c.parentElement.parentElement) c.parentElement.parentElement.style.display = 'none'; });
        } else {
            const dynamicGlobalRadarData = subQuestions.map(q => {
                return unis.reduce((sum, u) => sum + (u[q.id] || 0), 0) / (unis.length || 1);
            });

            safeRenderChart("chart-social-radar-global", {
                type: 'radar',
                data: {
                    labels: subQuestions.map(q => q.full_text),
                    datasets: [{
                        label: 'Promedio Filtro Activo',
                        data: dynamicGlobalRadarData,
                        borderColor: '#4092df',
                        backgroundColor: 'rgba(64, 146, 223, 0.2)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { r: { min: 1, max: 5 } }
                }
            });

            const radarDatasets = [];
            const colors = ['#e42424', '#68b631', '#4092df', '#f5b14b', '#8a3ffc', '#009688', '#ff5722', '#795548'];
            const activeCountries = Array.from(new Set(unis.map(u => u.country_code))).sort();

            activeCountries.slice(0, 5).forEach((c, idx) => {
                const countryUnis = unis.filter(u => u.country_code === c);
                const data = subQuestions.map(q => {
                    const sum = countryUnis.reduce((s, u) => s + (u[q.id] || 0), 0);
                    return countryUnis.length > 0 ? sum / countryUnis.length : 1;
                });

                radarDatasets.push({
                    label: countryCodesMap[c] || c,
                    data: data,
                    borderColor: colors[idx % colors.length],
                    backgroundColor: 'transparent',
                    borderWidth: 2
                });
            });

            safeRenderChart("chart-social-radar-paises", {
                type: 'radar',
                data: {
                    labels: subQuestions.map(q => q.full_text),
                    datasets: radarDatasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { r: { min: 1, max: 5 } }
                }
            });
        }
    }

    // --- 6. DIMENSIÓN GOBERNANZA ---
    function updateGobernanzaPage(unis) {
        if (unis.length === 0) {
            document.getElementById("val-gobernanza-gauge").innerText = "0%";
            document.getElementById("gobernanza-questions-container").innerHTML = "";
            return;
        }

        const avgScore = unis.reduce((sum, u) => sum + u.score_gobernanza, 0) / unis.length;
        document.getElementById("val-gobernanza-gauge").innerText = (avgScore * 100).toFixed(0) + "%";

        // Circular Gauge
        safeRenderChart("chart-gobernanza-gauge", {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [avgScore, 1 - avgScore],
                    backgroundColor: ['#f5b14b', '#e6e6e6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });

        // Bar Chart per country
        const countryScores = {};
        const countriesList = Object.keys(surveyData.by_country).sort();
        countriesList.forEach(c => {
            const countryUnis = unis.filter(u => u.country_code === c);
            countryScores[c] = countryUnis.reduce((sum, u) => sum + u.score_gobernanza, 0) / (countryUnis.length || 1);
        });

        safeRenderChart("chart-gobernanza-paises", {
            type: 'bar',
            data: {
                labels: countriesList.map(c => countryCodesMap[c] || c),
                datasets: [{
                    label: 'Porcentaje Dispuesto',
                    data: countriesList.map(c => countryScores[c] * 100),
                    backgroundColor: '#f5b14b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { min: 0, max: 100 } }
            }
        });

        // Render 22 binary questions detailed cards dynamically using active filtered unis
        const container = document.getElementById("gobernanza-questions-container");
        container.innerHTML = "";

        const gobQuestions = surveyData.gobernanza_questions;
        const activeCountries = Array.from(new Set(unis.map(u => u.country_code))).sort();

        gobQuestions.forEach((q, idx) => {
            const card = document.createElement("div");
            card.className = "question-card";

            // Calculate dynamic global percentage under current filters
            const disponeCount = unis.filter(u => u[q.id] === 1).length;
            const globDispone = disponeCount / (unis.length || 1);
            const globNoDispone = 1 - globDispone;

            const qCanvasId = `chart-gob-q-${idx+1}`;

            // Create progress bars list for countries dynamically
            let progressListHTML = "";
            activeCountries.forEach(c => {
                const countryUnis = unis.filter(u => u.country_code === c);
                const countryDisponeCount = countryUnis.filter(u => u[q.id] === 1).length;
                const pct = countryUnis.length > 0 ? countryDisponeCount / countryUnis.length : 0.0;
                
                progressListHTML += `
                    <div style="display:flex; justify-content:space-between; font-size:11px; align-items:center; gap:8px;">
                        <span style="font-weight:600; width:25px;">${c}</span>
                        <div class="bar-outer" style="height:6px;">
                            <div class="bar-inner orange" style="width: ${(pct * 100).toFixed(0)}%"></div>
                        </div>
                        <span style="font-weight:600; width:30px; text-align:right;">${(pct * 100).toFixed(0)}%</span>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="question-text">${idx+1}. ${q.full_text}</div>
                <div class="question-chart-row">
                    <div class="question-donut-wrapper" style="position:relative; height:100px;">
                        <canvas id="${qCanvasId}" style="height:100px; width:100px;"></canvas>
                        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:16px; font-weight:800; color:#f5b14b; pointer-events:none;">
                            ${(globDispone * 100).toFixed(0)}%
                        </div>
                    </div>
                    <div class="question-bars-wrapper">
                        ${progressListHTML}
                    </div>
                </div>
            `;
            container.appendChild(card);

            // Draw donut chart for this question
            setTimeout(() => {
                const canvas = document.getElementById(qCanvasId);
                if (canvas) {
                    new Chart(canvas.getContext('2d'), {
                        type: 'doughnut',
                        data: {
                            datasets: [{
                                data: [globDispone, globNoDispone],
                                backgroundColor: ['#f5b14b', '#e6e6e6'],
                                borderWidth: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '70%',
                            plugins: { 
                                legend: { display: false },
                                tooltip: pctTooltip
                            }
                        }
                    });
                }
            }, 100);
        });
    }

    // --- 7. SELLOS PAGE ---
    function updateSellosPage(unis) {
        // Seals distribution
        const sealCounts = { 'Compromiso': 0, 'Liderazgo': 0, 'Transformación': 0, 'Sin Sello': 0 };
        unis.forEach(u => sealCounts[u.seal] = (sealCounts[u.seal] || 0) + 1);

        safeRenderChart("chart-sellos-global", {
            type: 'pie',
            data: {
                labels: Object.keys(sealCounts),
                datasets: [{
                    data: Object.values(sealCounts),
                    backgroundColor: ['#3c5ecc', '#f5b14b', '#68b631', '#999']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { position: 'bottom' },
                    tooltip: pctTooltip
                }
            }
        });

        // Distribution per country
        const countriesList = Object.keys(surveyData.by_country).sort();
        const compromises = [];
        const leaderships = [];
        const transformations = [];

        countriesList.forEach(c => {
            const countryUnis = unis.filter(u => u.country_code === c);
            compromises.push(countryUnis.filter(u => u.seal === 'Compromiso').length);
            leaderships.push(countryUnis.filter(u => u.seal === 'Liderazgo').length);
            transformations.push(countryUnis.filter(u => u.seal === 'Transformación').length);
        });

        safeRenderChart("chart-sellos-paises", {
            type: 'bar',
            data: {
                labels: countriesList.map(c => countryCodesMap[c] || c),
                datasets: [
                    { label: 'Compromiso', data: compromises, backgroundColor: '#3c5ecc' },
                    { label: 'Liderazgo', data: leaderships, backgroundColor: '#f5b14b' },
                    { label: 'Transformación', data: transformations, backgroundColor: '#68b631' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true } }
            }
        });
    }

    // --- 8. BUENAS PRÁCTICAS REPOSITORY ---
    function renderBBPPList() {
        if (!practicesData) return;

        const searchText = document.getElementById("bbpp-search").value.toLowerCase();
        const countryVal = document.getElementById("filter-bbpp-country").value;
        const themeVal = document.getElementById("filter-bbpp-theme").value;

        // Filter good practices
        const filteredPractices = practicesData.filter(p => {
            const matchSearch = p.titulo_es.toLowerCase().includes(searchText) || 
                                p.resumen_es.toLowerCase().includes(searchText) || 
                                p.ies.toLowerCase().includes(searchText);
            const matchCountry = countryVal === "ALL" || p.pais === countryVal;
            const matchTheme = themeVal === "ALL" || p.tematicas.includes(themeVal);

            return matchSearch && matchCountry && matchTheme;
        });

        // Draw Cards
        const grid = document.getElementById("bbpp-grid-container");
        grid.innerHTML = "";

        filteredPractices.forEach(p => {
            const card = document.createElement("div");
            card.className = "bbpp-card";

            const summary = p.es_destacado && p.texto_destacado_es ? p.texto_destacado_es : p.resumen_es.substring(0, 160) + "...";
            
            // Build tags list
            let tagsHTML = "";
            p.tematicas.forEach(t => {
                tagsHTML += `<span class="bbpp-tag ${t.toLowerCase()}">${t}</span>`;
            });

            card.innerHTML = `
                <img class="bbpp-card-img" src="${p.imagen_fallback}" alt="${p.titulo_es}">
                <div class="bbpp-card-content">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="bbpp-country-badge">${countryCodesMap[p.pais] || p.pais}</span>
                        ${p.es_destacado ? '<span class="bbpp-featured-badge">Destacado</span>' : ''}
                    </div>
                    <div class="bbpp-card-title">${p.titulo_es}</div>
                    <div class="bbpp-card-ies">${p.ies}</div>
                    <p class="bbpp-card-summary">${summary}</p>
                    <div class="bbpp-tags">${tagsHTML}</div>
                    <div class="bbpp-card-links">
                        <a href="${p.url_origen}" class="bbpp-link" target="_blank">Ver origen</a>
                        ${p.recurso_url ? `<a href="${p.recurso_url}" class="bbpp-link" target="_blank">Ver recurso</a>` : ''}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // Update Map Markers
        if (window.bbppMarkersGroup) {
            window.bbppMarkersGroup.clearLayers();
            
            filteredPractices.forEach(p => {
                if (p.lat && p.lon) {
                    const offsetLat = p.lat + (Math.random() - 0.5) * 0.15;
                    const offsetLon = p.lon + (Math.random() - 0.5) * 0.15;

                    const marker = L.circleMarker([offsetLat, offsetLon], {
                        radius: 8,
                        fillColor: p.es_destacado ? "#e42424" : "#4092df",
                        color: "#fff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    marker.bindPopup(`
                        <div style="font-family:'HKGrotesk-Bold',sans-serif; font-size:13px; font-weight:700; margin-bottom:5px;">
                            ${p.titulo_es}
                        </div>
                        <div style="font-size:11px; color:#555; margin-bottom:5px;">${p.ies} (${countryCodesMap[p.pais] || p.pais})</div>
                        <a href="${p.url_origen}" target="_blank" style="color:#e42424; font-size:12px; font-weight:600;">Ver enlace origen</a>
                    `);
                    window.bbppMarkersGroup.addLayer(marker);
                }
            });
        }
    }
});
