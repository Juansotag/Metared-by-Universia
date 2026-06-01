// --- FILTERS AND SCROLL NAVIGATION LOGIC ---

document.addEventListener("DOMContentLoaded", function () {
    // Redefine tab switching as smooth scrolling to sections
    function scrollToSection(sectionId) {
        const target = document.getElementById(`section-${sectionId}`);
        if (target) {
            // Subtract offset for the sticky header
            const headerOffset = 140; // Approx height of sticky header + filters
            const elementPosition = target.getBoundingClientRect().top + window.scrollY;
            const offsetPosition = elementPosition - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
            
            // Special trigger for Leaflet map display issues
            if (sectionId === 'bbpp' && window.bbppMap) {
                setTimeout(() => {
                    window.bbppMap.invalidateSize();
                }, 200);
            }
        }
    }

    // Support home page "Ver detalles" links
    document.querySelectorAll(".gauge-link").forEach(link => {
        link.addEventListener("click", function () {
            const targetSection = this.getAttribute("data-target");
            scrollToSection(targetSection);
        });
    });

    // 2. GLOBAL FILTERS CHANGE EVENT
    const countryFilter = document.getElementById("filter-country");
    const ownershipFilter = document.getElementById("filter-ownership");
    const characterFilter = document.getElementById("filter-character");
    const sealFilter = document.getElementById("filter-seal");
    const sizeFilter = document.getElementById("filter-size");

    function onFilterChange() {
        const country = countryFilter.value;
        const ownership = ownershipFilter.value;
        const character = characterFilter.value;
        const seal = sealFilter.value;
        const size = sizeFilter.value;

        // Trigger redrawing charts & tables with active filters (now including seal and size)
        if (window.updateDashboardData) {
            window.updateDashboardData(country, ownership, character, seal, size);
        }
    }

    countryFilter.addEventListener("change", onFilterChange);
    ownershipFilter.addEventListener("change", onFilterChange);
    characterFilter.addEventListener("change", onFilterChange);
    sealFilter.addEventListener("change", onFilterChange);
    sizeFilter.addEventListener("change", onFilterChange);

    // Save scroll function globally for backward compatibility
    window.switchDashboardTab = scrollToSection;
});
