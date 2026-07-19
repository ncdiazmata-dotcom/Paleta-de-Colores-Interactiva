/**
 * Colorfly Studio - Core Engine v4
 * Añade alertas del modo presentación y módulo de compartición avanzada (URL/Nativa).
 */

document.addEventListener('DOMContentLoaded', () => {
    // === ESTADO ===
    const state = {
        currentPalette: [],
        savedPalettes: JSON.parse(localStorage.getItem('cf_saved')) || [],
        historyPalettes: JSON.parse(localStorage.getItem('cf_history')) || [],
        size: 6,
        format: 'hex',
        isPresentationMode: false
    };

    // === ELEMENTOS DEL DOM ===
    const grid = document.getElementById('palette-grid');
    const sizeSelect = document.getElementById('palette-size');
    const formatSelect = document.getElementById('color-format');
    const btnGen = document.getElementById('btn-generate');
    const btnSave = document.getElementById('btn-save');
    const btnPres = document.getElementById('btn-presentation');
    const btnShare = document.getElementById('btn-share-native');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const savedContainer = document.getElementById('saved-container');
    const historyContainer = document.getElementById('history-container');
    const presAlert = document.getElementById('presentation-alert');

    // === MOTOR INTERNO CROMÁTICO ===
    function getRandomHsl() {
        return {
            h: Math.floor(Math.random() * 360),
            s: Math.floor(Math.random() * 25) + 65, 
            l: Math.floor(Math.random() * 20) + 45  
        };
    }

    function hslToHex({ h, s, l }) {
        l /= 100;
        const a = (s * Math.min(l, 1 - l)) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
    }

    function hexToHsl(hex) {
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; } 
        else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    function getContrast(l) { return l > 60 ? '#000000' : '#ffffff'; }

    function format(colorObj, type) {
        if (type === 'hsl') return `hsl(${colorObj.h}, ${colorObj.s}%, ${colorObj.l}%)`;
        return hslToHex(colorObj);
    }

    // === CONTROL DE VISTA DE PRESENTACIÓN ===
    function togglePresentationMode(forceOff = false) {
        if (forceOff) {
            state.isPresentationMode = false;
        } else {
            state.isPresentationMode = !state.isPresentationMode;
        }
        
        document.body.classList.toggle('presentation-mode-active', state.isPresentationMode);
        btnPres.innerHTML = state.isPresentationMode 
            ? '<i class="fa-solid fa-compress"></i> SALIR' 
            : '<i class="fa-solid fa-expand"></i> PRESENTACIÓN';

        // Lanzar recordatorio visual de salida si entra en modo presentación
        if (state.isPresentationMode) {
            presAlert.classList.add('visible');
            setTimeout(() => {
                presAlert.classList.remove('visible');
            }, 3500);
        } else {
            presAlert.classList.remove('visible');
        }
    }

    // === PROCESO DE GENERACIÓN ===
    function generate(pushHistory = true) {
        const next = [];
        const base = getRandomHsl();

        for (let i = 0; i < state.size; i++) {
            if (state.currentPalette[i] && state.currentPalette[i].isLocked) {
                next.push(state.currentPalette[i]);
            } else {
                next.push({
                    h: (base.h + (i * (360 / state.size))) % 360,
                    s: Math.max(40, Math.min(95, base.s + (Math.random() * 12 - 6))),
                    l: Math.max(35, Math.min(80, base.l + (Math.random() * 24 - 12))),
                    isLocked: false
                });
            }
        }
        state.currentPalette = next;
        renderMain();

        if (pushHistory && !state.currentPalette.every(c => c.isLocked)) {
            state.historyPalettes.unshift(JSON.parse(JSON.stringify(next)));
            if (state.historyPalettes.length > 6) state.historyPalettes.pop();
            localStorage.setItem('cf_history', JSON.stringify(state.historyPalettes));
            renderLists();
        }
    }

    // === RENDERIZADO TABLERO PRINCIPAL ===
    function renderMain() {
        grid.innerHTML = '';
        grid.className = `palette-grid cols-${state.size}`;

        state.currentPalette.forEach((color, idx) => {
            const hex = hslToHex(color);
            const text = getContrast(color.l);
            const card = document.createElement('article');
            card.className = `color-card ${color.isLocked ? 'locked' : ''}`;
            card.style.backgroundColor = hex;
            card.style.color = text;

            card.innerHTML = `
                <div class="color-picker-wrapper">
                    <input type="color" class="manual-color-input" value="${hex}">
                    <i class="fa-solid fa-sliders picker-hint"></i>
                </div>
                <div class="color-info">
                    <span class="color-value">${format(color, state.format)}</span>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn btn-lock" title="Bloquear"><i class="fa-solid ${color.isLocked ? 'fa-lock' : 'fa-lock-open'}"></i></button>
                    <button class="card-action-btn btn-copy" title="Copiar"><i class="fa-solid fa-copy"></i></button>
                </div>
            `;

            const input = card.querySelector('.manual-color-input');
            input.addEventListener('input', (e) => {
                const updated = hexToHsl(e.target.value);
                state.currentPalette[idx] = { ...updated, isLocked: state.currentPalette[idx].isLocked };
                
                card.style.backgroundColor = e.target.value;
                const newText = getContrast(updated.l);
                card.style.color = newText;
                card.querySelector('.color-value').textContent = format(state.currentPalette[idx], state.format);
            });

            card.querySelector('.color-value').addEventListener('click', () => copy(format(color, state.format)));
            card.querySelector('.btn-copy').addEventListener('click', () => copy(format(color, state.format)));

            card.querySelector('.btn-lock').addEventListener('click', () => {
                state.currentPalette[idx].isLocked = !state.currentPalette[idx].isLocked;
                renderMain();
            });

            grid.appendChild(card);
        });
    }

    // === RENDERIZADO SECCIONES GESTIÓN ===
    function renderLists() {
        savedContainer.innerHTML = state.savedPalettes.length ? '' : '<p class="empty-state">No hay paletas archivadas.</p>';
        state.savedPalettes.forEach((p, i) => savedContainer.appendChild(buildRow(p, i, 'saved')));

        historyContainer.innerHTML = state.historyPalettes.length ? '' : '<p class="empty-state">El historial está vacío.</p>';
        state.historyPalettes.forEach((p, i) => historyContainer.appendChild(buildRow(p, i, 'history')));
    }

    function buildRow(palette, index, type) {
        const row = document.createElement('div');
        row.className = 'mini-palette-row';

        const prev = document.createElement('div');
        prev.className = 'mini-colors-preview';
        palette.forEach(c => {
            const b = document.createElement('span');
            b.className = 'mini-color-block';
            b.style.backgroundColor = hslToHex(c);
            prev.appendChild(b);
        });

        const acts = document.createElement('div');
        acts.className = 'mini-actions';

        const load = document.createElement('button');
        load.className = 'btn-mini';
        load.innerHTML = '<i class="fa-solid fa-folder-open"></i>';
        load.onclick = () => {
            state.size = palette.length;
            sizeSelect.value = state.size;
            state.currentPalette = palette.map(c => ({ ...c, isLocked: false }));
            renderMain();
        };
        acts.appendChild(load);

        if (type === 'saved') {
            const del = document.createElement('button');
            del.className = 'btn-mini';
            del.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            del.onclick = () => {
                state.savedPalettes.splice(index, 1);
                localStorage.setItem('cf_saved', JSON.stringify(state.savedPalettes));
                renderLists();
            };
            acts.appendChild(del);
        }

        row.appendChild(prev);
        row.appendChild(acts);
        return row;
    }

    // === EMISOR TOAST ===
    function copy(txt) {
        navigator.clipboard.writeText(txt).then(() => {
            const toast = document.createElement('div');
            toast.className = 'colorfly-toast';
            toast.textContent = `NOTIFICACIÓN: ${txt}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 200);
            }, 1500);
        });
    }

    // === VERIFICACIÓN DE URL (Compartición de Paletas entrantes) ===
    function checkSharedPalette() {
        const params = new URLSearchParams(window.location.search);
        const paletteParam = params.get('p');
        if (paletteParam) {
            const hexColors = paletteParam.split('-');
            state.size = hexColors.length;
            sizeSelect.value = state.size;
            state.currentPalette = hexColors.map(hex => ({
                ...hexToHsl('#' + hex),
                isLocked: false
            }));
            return true;
        }
        return false;
    }

    // === EVENTOS GESTORES ===
    btnGen.addEventListener('click', () => generate(true));
    
    btnSave.addEventListener('click', () => {
        state.savedPalettes.unshift(JSON.parse(JSON.stringify(state.currentPalette)));
        localStorage.setItem('cf_saved', JSON.stringify(state.savedPalettes));
        renderLists();
        copy('PALETA ARCHIVADA EXITOSAMENTE');
    });

    sizeSelect.addEventListener('change', (e) => {
        state.size = parseInt(e.target.value, 10);
        generate(true);
    });

    formatSelect.addEventListener('change', (e) => {
        state.format = e.target.value;
        renderMain();
    });

    btnPres.addEventListener('click', () => togglePresentationMode());

    // SISTEMA AVANZADO DE COMPARTICIÓN COMPLETA
    btnShare.addEventListener('click', () => {
        const colorString = state.currentPalette.map(c => hslToHex(c).replace('#', '')).join('-');
        const shareUrl = `${window.location.origin}${window.location.pathname}?p=${colorString}`;

        if (navigator.share) {
            navigator.share({
                title: 'Colorfly Studio Palette',
                text: 'Echa un vistazo a este sistema cromático de branding desarrollado en Colorfly Studio:',
                url: shareUrl,
            })
            .then(() => copy('¡COMPARTIDO CON ÉXITO!'))
            .catch(() => copy('ENLACE COPIADO AL PORTAPAPELES'));
        } else {
            copy(shareUrl);
        }
    });

    btnClearHistory.addEventListener('click', () => {
        state.historyPalettes = [];
        localStorage.removeItem('cf_history');
        renderLists();
        copy('HISTORIAL DE PALETAS ELIMINADO');
    });

    // === CAPTURA DE TECLADO OPTIMIZADA (Espacio y Escape) ===
    window.addEventListener('keydown', (e) => {
        // Control del modo presentación con Escape
        if (e.key === 'Escape' || e.code === 'Escape') {
            if (state.isPresentationMode) {
                togglePresentationMode(true);
            }
        }
        
        // Control estricto de la barra espaciadora
        if (e.key === ' ' || e.code === 'Space') {
            // Si el usuario está editando un texto o un campo de entrada, no hacemos nada
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                return;
            }
            
            // Prevenimos que la página se desplace hacia abajo
            e.preventDefault();
            
            // Quitamos el foco de cualquier botón activo para evitar duplicación de eventos
            document.activeElement.blur();
            
            // Ejecutamos la mutación cromática
            generate(true);
        }
    });

    // Inicialización inteligente (Verifica si hay paletas compartidas en el enlace)
    const activeShared = checkSharedPalette();
    if (activeShared) {
        renderMain();
    } else {
        generate(false);
    }
    renderLists();
});