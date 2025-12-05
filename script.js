// --- Configuration & State ---
const state = {
    mode: 'SSS', // SSS, SAS, ASA
    values: { a: 3, b: 4, c: 5, angleA: 0, angleB: 0, angleC: 0 },
    unit: 'm',
    darkMode: false
};

const DOM = {
    inputsContainer: document.getElementById('inputs-container'),
    unitSelector: document.getElementById('unit-selector'),
    unitBadge: document.getElementById('unit-badge'),
    errorBox: document.getElementById('error-box'),
    errorText: document.getElementById('error-text'),
    canvas: document.getElementById('triangleCanvas'),
    mathSteps: document.getElementById('math-steps'),
    realWorld: document.getElementById('real-world-comp')
};

const ctx = DOM.canvas.getContext('2d');

// --- Initialization ---

function init() {
    renderInputs();
    checkSystemTheme();
    solve();

    DOM.unitSelector.addEventListener('change', (e) => {
        state.unit = e.target.value;
        document.querySelectorAll('.unit-label').forEach(el => el.innerText = state.unit === 'ft' || state.unit === 'in' ? state.unit : state.unit === 'cm' ? 'cm' : 'm' + (el.parentElement.id === 'area-val' ? '²' : ''));
        DOM.unitBadge.innerText = e.target.options[e.target.selectedIndex].text;
        solve(); 
    });

    // Re-solve on resize to keep canvas sharp
    window.addEventListener('resize', () => requestAnimationFrame(solve));
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    state.darkMode = document.documentElement.classList.contains('dark');
    document.getElementById('sun-icon').classList.toggle('hidden');
    document.getElementById('moon-icon').classList.toggle('hidden');
    solve(); 
}

function checkSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        toggleDarkMode();
    }
}

function setMode(mode) {
    state.mode = mode;
    // Update Tab Styles
    ['SSS', 'SAS', 'ASA'].forEach(m => {
        const btn = document.getElementById(`tab-${m}`);
        if (m === mode) {
            btn.className = "flex-1 py-2 rounded-lg shadow bg-white dark:bg-[#2c2c2e] text-blue-600 dark:text-blue-400 transition-all font-bold";
        } else {
            btn.className = "flex-1 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all";
        }
    });
    
    // Set Default Valid Values
    if (mode === 'SSS') { state.values = { a: 3, b: 4, c: 5 }; }
    if (mode === 'SAS') { state.values = { a: 5, b: 7, angleC: 45 }; }
    if (mode === 'ASA') { state.values = { angleA: 45, c: 10, angleB: 45 }; }

    renderInputs();
    solve();
}

function renderInputs() {
    const configs = {
        SSS: [
            { id: 'a', label: 'Side a', placeholder: 'Length' },
            { id: 'b', label: 'Side b', placeholder: 'Length' },
            { id: 'c', label: 'Side c', placeholder: 'Length' }
        ],
        SAS: [
            { id: 'a', label: 'Side a', placeholder: 'Length' },
            { id: 'angleC', label: 'Angle γ (C)', placeholder: 'Degrees', max: 179 },
            { id: 'b', label: 'Side b', placeholder: 'Length' }
        ],
        ASA: [
            { id: 'angleA', label: 'Angle α (A)', placeholder: 'Degrees', max: 179 },
            { id: 'c', label: 'Side c', placeholder: 'Length' },
            { id: 'angleB', label: 'Angle β (B)', placeholder: 'Degrees', max: 179 }
        ]
    };

    let html = '';
    configs[state.mode].forEach(input => {
        html += `
        <div class="group">
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 ml-1">${input.label}</label>
            <input type="number" id="input-${input.id}" value="${state.values[input.id]}" 
                min="0.1" step="0.1" ${input.max ? `max="${input.max}"` : ''}
                oninput="updateValue('${input.id}', this.value)"
                class="apple-input w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-lg rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-4" placeholder="${input.placeholder}">
        </div>`;
    });
    DOM.inputsContainer.innerHTML = html;
    document.getElementById('input-title').innerText = 
        state.mode === 'SSS' ? 'Enter 3 Sides' : 
        state.mode === 'SAS' ? 'Side-Angle-Side' : 'Angle-Side-Angle';
}

function updateValue(key, val) {
    state.values[key] = parseFloat(val);
    solve();
}

function toggleWork() {
    const el = DOM.mathSteps;
    const chevron = document.getElementById('work-chevron');
    el.classList.toggle('hidden');
    chevron.classList.toggle('rotate-180');
}

// --- Math & Solver Engine ---

function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }

function solve() {
    let a, b, c, A, B, C, area;
    const vals = state.values;
    let stepsHTML = "";
    let error = null;

    try {
        if (state.mode === 'SSS') {
            a = vals.a; b = vals.b; c = vals.c;
            if (a + b <= c || a + c <= b || b + c <= a) throw "Impossible Triangle (Triangle Inequality)";
            
            A = Math.acos((b*b + c*c - a*a) / (2*b*c));
            B = Math.acos((a*a + c*c - b*b) / (2*a*c));
            C = Math.PI - A - B;

            const s = (a+b+c)/2;
            area = Math.sqrt(s*(s-a)*(s-b)*(s-c));
            
            stepsHTML = `<p><strong>1. Find Semi-perimeter:</strong> s = (${a}+${b}+${c})/2 = ${s}</p>
                <p><strong>2. Heron's Formula:</strong> Area = √[${s}(${s}-${a})...] = ${area.toFixed(2)}</p>`;

        } else if (state.mode === 'SAS') {
            a = vals.a; b = vals.b; C = toRad(vals.angleC);
            if (vals.angleC >= 180 || vals.angleC <= 0) throw "Angle must be between 0 and 180";
            
            c = Math.sqrt(a*a + b*b - 2*a*b*Math.cos(C));
            A = Math.acos((b*b + c*c - a*a) / (2*b*c));
            B = Math.PI - A - C;
            area = 0.5 * a * b * Math.sin(C);

            stepsHTML = `<p><strong>1. Law of Cosines:</strong> c = √(${a}² + ${b}²...) = ${c.toFixed(2)}</p>
                <p><strong>2. SAS Area:</strong> 0.5 × ${a} × ${b} × sin(${toDeg(C)}°) = ${area.toFixed(2)}</p>`;

        } else if (state.mode === 'ASA') {
            A = toRad(vals.angleA); B = toRad(vals.angleB); c = vals.c;
            if (toDeg(A) + toDeg(B) >= 180) throw "Sum of angles A and B must be < 180";

            C = Math.PI - A - B;
            a = c * Math.sin(A) / Math.sin(C);
            b = c * Math.sin(B) / Math.sin(C);
            area = 0.5 * b * c * Math.sin(A);

            stepsHTML = `<p><strong>1. Find Angle C:</strong> 180° - ${toDeg(A)}° - ${toDeg(B)}° = ${toDeg(C).toFixed(1)}°</p>
                <p><strong>2. Law of Sines:</strong> a/sin(A) = c/sin(C) → a = ${a.toFixed(2)}</p>`;
        }

    } catch (e) {
        error = e;
    }

    if (error || isNaN(area) || area <= 0) {
        DOM.errorBox.classList.remove('hidden');
        DOM.errorText.innerText = error || "Invalid Dimensions";
        clearStats();
        DOM.canvas.style.opacity = '0.3';
        return;
    } else {
        DOM.errorBox.classList.add('hidden');
        DOM.canvas.style.opacity = '1';
    }

    const perimeter = a + b + c;
    const s = perimeter / 2;
    const h_c = (2 * area) / c;
    const r = area / s; 
    const R = (a * b * c) / (4 * area); 

    updateStats({ area, perimeter, h_c, s, r, R, A, B, C, a, b, c });
    DOM.mathSteps.innerHTML = stepsHTML;
    draw(a, b, c, A, B, C, h_c);
}

function updateStats(data) {
    document.getElementById('area-val').innerText = fmt(data.area);
    document.getElementById('perim-val').innerText = fmt(data.perimeter);
    document.getElementById('height-val').innerText = fmt(data.h_c);
    document.getElementById('s-val').innerText = fmt(data.s);
    document.getElementById('inradius-val').innerText = fmt(data.r);
    document.getElementById('circumradius-val').innerText = fmt(data.R);

    const degs = [toDeg(data.A), toDeg(data.B), toDeg(data.C)];
    const maxAng = Math.max(...degs);
    const sideType = (Math.abs(data.a - data.b) < 0.01 && Math.abs(data.b - data.c) < 0.01) ? "Equilateral" :
                        (Math.abs(data.a - data.b) < 0.01 || Math.abs(data.b - data.c) < 0.01 || Math.abs(data.a - data.c) < 0.01) ? "Isosceles" : "Scalene";
    const angType = Math.abs(maxAng - 90) < 0.1 ? "Right" : maxAng > 90 ? "Obtuse" : "Acute";

    document.getElementById('type-badge').innerText = sideType;
    document.getElementById('angle-type-badge').innerText = angType;

    const area = data.area;
    let comp = "";
    if(state.unit === 'm') {
        if(area < 1) comp = "Coffee Table";
        else if(area < 4) comp = "King Size Bed";
        else if(area < 15) comp = "Small Bedroom";
        else if(area < 30) comp = "Living Room";
        else if(area < 200) comp = "Tennis Court";
        else comp = "Small Field";
    } else {
        comp = "Geometric Shape";
    }
    DOM.realWorld.innerText = comp;
}

function fmt(num) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function clearStats() {
    ['area-val', 'perim-val', 'height-val', 'inradius-val'].forEach(id => document.getElementById(id).innerText = "--");
}

// --- Canvas Drawing ---

function draw(a, b, c, A, B, C, h_c) {
    const dpr = window.devicePixelRatio || 1;
    const rect = DOM.canvas.getBoundingClientRect();
    DOM.canvas.width = rect.width * dpr;
    DOM.canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const theme = state.darkMode ? {
        line: '#409cff', fill: 'rgba(64, 156, 255, 0.15)', text: '#fff', 
        pill: 'rgba(0,0,0,0.6)', pillText: '#fff'
    } : {
        line: '#0071e3', fill: 'rgba(0, 113, 227, 0.08)', text: '#1d1d1f', 
        pill: 'rgba(255,255,255,0.8)', pillText: '#4b5563'
    };

    const p1 = { x: 0, y: 0 };
    const p2 = { x: c, y: 0 };
    const p3 = { x: b * Math.cos(A), y: b * Math.sin(A) };

    const allX = [p1.x, p2.x, p3.x];
    const allY = [p1.y, p2.y, p3.y];
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    
    const padding = 60;
    const scale = Math.min((w - padding*2)/(maxX-minX), (h - padding*2)/(maxY-minY));
    const cx = (w - (maxX - minX)*scale)/2 - minX*scale;
    const cy = (h - (maxY - minY)*scale)/2 - minY*scale;
    const tr = (p) => ({ x: p.x * scale + cx, y: h - (p.y * scale + cy) });

    const s1 = tr(p1);
    const s2 = tr(p2);
    const s3 = tr(p3);

    ctx.clearRect(0,0,w,h);

    // 1. Fill
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.lineTo(s3.x, s3.y);
    ctx.closePath();
    ctx.fillStyle = theme.fill;
    ctx.fill();

    // 2. Extra Layers
    if (document.getElementById('toggle-altitude').checked) {
        const foot = tr({ x: p3.x, y: 0 });
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(s3.x, s3.y);
        ctx.lineTo(foot.x, foot.y);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
    }
    if (document.getElementById('toggle-centroid').checked) {
        const centerMath = { x: (p1.x+p2.x+p3.x)/3, y: (p1.y+p2.y+p3.y)/3 };
        const center = tr(centerMath);
        ctx.fillStyle = '#f97316';
        ctx.beginPath(); ctx.arc(center.x, center.y, 5, 0, Math.PI*2); ctx.fill();
    }
    if (document.getElementById('toggle-incircle').checked) {
        const r_math = parseFloat(document.getElementById('inradius-val').innerText.replace(/,/g,'')); 
        if(!isNaN(r_math)){
            // Recalc center
            const s_ = (a+b+c)/2;
            const area_ = Math.sqrt(s_*(s_-a)*(s_-b)*(s_-c));
            const rad = (area_/s_) * scale;
            const ix = (a*p1.x + b*p2.x + c*p3.x) / (a+b+c);
            const iy = (a*p1.y + b*p2.y + c*p3.y) / (a+b+c);
            const icenter = tr({x: ix, y: iy});
            ctx.beginPath(); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
            ctx.arc(icenter.x, icenter.y, rad, 0, Math.PI*2); ctx.stroke();
        }
    }
    if (document.getElementById('toggle-circumcircle').checked) {
        const D = 2 * (p1.x*(p2.y-p3.y) + p2.x*(p3.y-p1.y) + p3.x*(p1.y-p2.y));
        if(Math.abs(D) > 0.00001) {
            const Ux = (1/D) * ((p1.x**2 + p1.y**2)*(p2.y-p3.y) + (p2.x**2 + p2.y**2)*(p3.y-p1.y) + (p3.x**2 + p3.y**2)*(p1.y-p2.y));
            const Uy = (1/D) * ((p1.x**2 + p1.y**2)*(p3.x-p2.x) + (p2.x**2 + p2.y**2)*(p1.x-p3.x) + (p3.x**2 + p3.y**2)*(p2.x-p1.x));
            const center = tr({x: Ux, y: Uy});
            const R_math = (a*b*c) / (4 * (0.5*c*p3.y));
            ctx.beginPath(); ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2;
            ctx.arc(center.x, center.y, R_math * scale, 0, Math.PI*2); ctx.stroke();
        }
    }

    // 3. Outline
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.lineTo(s3.x, s3.y);
    ctx.closePath();
    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 4. Side Measurement Labels
    const drawSideLabel = (pStart, pEnd, val) => {
        const midX = (pStart.x + pEnd.x) / 2;
        const midY = (pStart.y + pEnd.y) / 2;
        const text = val.toLocaleString('en-US', {maximumFractionDigits:2});
        
        ctx.font = "bold 12px -apple-system";
        const metrics = ctx.measureText(text);
        const w = metrics.width + 12;
        const h = 20;

        ctx.fillStyle = theme.pill;
        // Round Rect Pill
        ctx.beginPath();
        ctx.roundRect(midX - w/2, midY - h/2, w, h, 6);
        ctx.fill();

        ctx.fillStyle = theme.pillText;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, midX, midY);
    };

    // Side c (A-B)
    drawSideLabel(s1, s2, c);
    // Side b (A-C)
    drawSideLabel(s1, s3, b);
    // Side a (B-C)
    drawSideLabel(s2, s3, a);

    // 5. Corner Labels
    ctx.fillStyle = theme.text;
    ctx.font = "bold 14px sans-serif";
    const offset = 24;
    const drawLabel = (p, t) => {
        const cx_ = (s1.x+s2.x+s3.x)/3;
        const cy_ = (s1.y+s2.y+s3.y)/3;
        const dx = p.x - cx_;
        const dy = p.y - cy_;
        const len = Math.sqrt(dx*dx + dy*dy);
        ctx.fillText(t, p.x + (dx/len)*offset, p.y + (dy/len)*offset);
    };
    drawLabel(s1, "A");
    drawLabel(s2, "B");
    drawLabel(s3, "C");
}

function exportImage() {
    const link = document.createElement('a');
    link.download = 'triangle-pro-diagram.png';
    link.href = DOM.canvas.toDataURL();
    link.click();
}

init();
