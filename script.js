document.addEventListener('DOMContentLoaded', function() {
    
    let kostromaObjects = [];
    const objectSelect = document.getElementById('objectName');
    
    fetch('/api/objects')
        .then(res => res.json())
        .then(data => {
            kostromaObjects = data;
            fillObjectList();
        })
        .catch(() => console.error('Ошибка загрузки базы объектов'));

    function fillObjectList() {
        if (!objectSelect) return;
        objectSelect.innerHTML = '<option value="">Выберите объект...</option>';
        kostromaObjects.forEach(obj => {
            const opt = document.createElement('option');
            opt.value = obj.egrkn;
            opt.textContent = `${obj.name} (${obj.egrkn})`;
            objectSelect.appendChild(opt);
        });
    }

    if (objectSelect) {
        objectSelect.addEventListener('change', function() {
            const sel = kostromaObjects.find(o => o.egrkn === this.value);
            if (!sel) return;
            
            const fieldsToFill = {
                'egrknNumber': sel.egrkn,
                'location': sel.address,
                'plateText': sel.fullName,
                'historyInfo': sel.history
            };

            for (const [id, val] of Object.entries(fieldsToFill)) {
                const el = document.getElementById(id);
                if (el) {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }

            updatePlatePreview();
            updatePlateDrawing();
            calculateLoads();
        });
    }

    document.querySelectorAll('textarea[maxlength]').forEach(ta => {
        const cnt = document.getElementById('counter-' + ta.id);
        const max = parseInt(ta.getAttribute('maxlength'));
        const update = () => {
            if (cnt) cnt.textContent = ta.value.length;
            if (ta.value.length >= max) {
                ta.style.borderColor = '#d9534f';
                if(cnt) cnt.parentElement.classList.add('limit-exceeded');
            } else {
                ta.style.borderColor = '#ccc';
                if(cnt) cnt.parentElement.classList.remove('limit-exceeded');
            }
        };
        ta.addEventListener('input', update);
        update();
    });

    const devDate = document.getElementById('devDate');
    if (devDate) devDate.value = new Date().toISOString().split('T')[0];

    const objType = document.getElementById('objectType');
    const ensSec = document.getElementById('ensembleSection');
    if (objType && ensSec) {
        objType.addEventListener('change', function() {
            if (this.value === 'ensemble') {
                ensSec.style.display = 'block';
                document.getElementById('ensembleMonuments').setAttribute('required', 'required');
            } else {
                ensSec.style.display = 'none';
                document.getElementById('ensembleMonuments').removeAttribute('required');
            }
        });
    }

    const previewFields = { objectName: 'previewObjectName', historyInfo: 'previewHistory', egrknNumber: 'previewNumber' };
    Object.keys(previewFields).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updatePlatePreview);
            el.addEventListener('input', updatePlateDrawing);
        }
    });
    document.getElementById('category')?.addEventListener('change', updatePlatePreview);
    document.getElementById('category')?.addEventListener('change', updatePlateDrawing);

    function updatePlatePreview() {
        const name = document.getElementById('objectName')?.value || '';
        let displayName = name;
        const found = kostromaObjects.find(o => o.egrkn === name);
        if (found) displayName = found.name;
        document.getElementById('previewObjectName').textContent = displayName || '[Наименование объекта]';
        document.getElementById('previewHistory').textContent = document.getElementById('historyInfo')?.value || '[Сведения]';
        document.getElementById('previewNumber').textContent = '№ ' + (document.getElementById('egrknNumber')?.value || '[Номер]');
        
        const cat = document.getElementById('category')?.value;
        const herb = document.getElementById('previewCoatOfArms');
        if (herb) {
            if (cat === 'federal') { herb.src = 'assets/coat_of_arms_russia.png'; herb.style.display = 'block'; }
            else if (cat === 'regional' || cat === 'local') { herb.src = 'assets/coat_of_arms_kostroma.png'; herb.style.display = 'block'; }
            else { herb.style.display = 'none'; }
        }
    }

    let fontSize = 14;
    document.getElementById('increaseFont')?.addEventListener('click', () => { if (fontSize < 20) { fontSize++; applyFS(); } });
    document.getElementById('decreaseFont')?.addEventListener('click', () => { if (fontSize > 10) { fontSize--; applyFS(); } });
    function applyFS() { document.querySelectorAll('.plate-content *').forEach(e => e.style.fontSize = fontSize + 'px'); }

    const plateData = {
        'horizontal_small': { w: 50, h: 30 }, 'horizontal_medium': { w: 60, h: 40 }, 'horizontal_large': { w: 70, h: 50 },
        'vertical_small': { w: 30, h: 50 }, 'vertical_medium': { w: 40, h: 60 }, 'vertical_large': { w: 50, h: 70 }
    };
    const C = { W0: 0.3, K: 1.0, Ca: 1.2, gf: 1.4, k: 0.15, v: 0.8, g: 0.00980665 };

    function calculateLoads() {
        const sz = document.getElementById('plateSize')?.value;
        if (!sz || !plateData[sz]) return;
        const p = plateData[sz];
        const area = (p.w / 100) * (p.h / 100);
        const mass = area * 9.8;
        const wind = C.W0 * C.K * C.Ca * (1 + C.k * C.v) * C.gf * area;
        const grav = mass * C.g;

        document.getElementById('plateWeight').value = mass.toFixed(2) + ' кг';
        document.getElementById('windLoadValue').textContent = wind.toFixed(4);
        document.getElementById('gravityLoadValue').textContent = grav.toFixed(4);
        
        document.getElementById('calcMass').value = mass.toFixed(2);
        document.getElementById('calcWindLoad').value = wind.toFixed(4);
        document.getElementById('calcGravityLoad').value = grav.toFixed(4);
        document.getElementById('plateWidth').value = p.w;
        document.getElementById('plateHeight').value = p.h;
    }

    function updatePlateDrawing() {
        const sz = document.getElementById('plateSize')?.value;
        if (!sz) return;
        const p = plateData[sz];
        const cat = document.getElementById('category')?.value;
        const name = document.getElementById('objectName')?.value || '[НАИМЕНОВАНИЕ]';
        const hist = document.getElementById('historyInfo')?.value || '[СВЕДЕНИЯ]';
        const num = document.getElementById('egrknNumber')?.value || '[НОМЕР]';

        const wMM = p.w * 10, hMM = p.h * 10;
        const m = 50, sw = wMM + m * 2, sh = hMM + m * 2;
        const catMap = { federal: 'ФЕДЕРАЛЬНОГО ЗНАЧЕНИЯ', regional: 'РЕГИОНАЛЬНОГО ЗНАЧЕНИЯ', local: 'МЕСТНОГО ЗНАЧЕНИЯ' };
        const herb = (cat === 'federal' || cat === 'regional' || cat === 'local') ? `<rect x="${m + wMM/2 - 30}" y="${m + 10}" width="60" height="50" fill="${cat === 'federal' ? '#c00' : '#0056b3'}" stroke="#fff" stroke-width="1"/><text x="${m + wMM/2}" y="${m + 40}" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">ГЕРБ</text>` : '';

        document.getElementById('plateDrawingContainer').innerHTML = `
            <svg id="plateDrawing" width="${sw}" height="${sh}" viewBox="0 0 ${sw} ${sh}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${sw}" height="${sh}" fill="#f5f5f5"/>
                <line x1="${m}" y1="${m-20}" x2="${m+wMM}" y2="${m-20}" stroke="#0066cc" stroke-width="1"/>
                <line x1="${m}" y1="${m-25}" x2="${m}" y2="${m-15}" stroke="#0066cc" stroke-width="1"/>
                <line x1="${m+wMM}" y1="${m-25}" x2="${m+wMM}" y2="${m-15}" stroke="#0066cc" stroke-width="1"/>
                <text x="${m+wMM/2}" y="${m-25}" text-anchor="middle" fill="#0066cc" font-size="10">${wMM} мм (масштаб 1:5)</text>
                <line x1="${m-20}" y1="${m}" x2="${m-20}" y2="${m+hMM}" stroke="#0066cc" stroke-width="1"/>
                <line x1="${m-25}" y1="${m}" x2="${m-15}" y2="${m}" stroke="#0066cc" stroke-width="1"/>
                <line x1="${m-25}" y1="${m+hMM}" x2="${m-15}" y2="${m+hMM}" stroke="#0066cc" stroke-width="1"/>
                <text x="${m-30}" y="${m+hMM/2}" text-anchor="middle" fill="#0066cc" font-size="10" transform="rotate(-90, ${m-30}, ${m+hMM/2})">${hMM} мм</text>
                <rect x="${m}" y="${m}" width="${wMM}" height="${hMM}" fill="#4a4a4a" stroke="#333" stroke-width="3"/>
                <rect x="${m+10}" y="${m+10}" width="${wMM-20}" height="${hMM-20}" fill="none" stroke="#fff" stroke-width="2"/>
                <circle cx="${m+15}" cy="${m+15}" r="5" fill="#fff" stroke="#333" stroke-width="1"/>
                <circle cx="${m+wMM-15}" cy="${m+15}" r="5" fill="#fff" stroke="#333" stroke-width="1"/>
                <circle cx="${m+15}" cy="${m+hMM-15}" r="5" fill="#fff" stroke="#333" stroke-width="1"/>
                <circle cx="${m+wMM-15}" cy="${m+hMM-15}" r="5" fill="#fff" stroke="#333" stroke-width="1"/>
                ${herb}
                <text x="${m+wMM/2}" y="${m+80}" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">ОБЪЕКТ КУЛЬТУРНОГО НАСЛЕДИЯ</text>
                <text x="${m+wMM/2}" y="${m+95}" text-anchor="middle" fill="#fff" font-size="10">${catMap[cat] || '[КАТЕГОРИЯ]'}</text>
                <text x="${m+wMM/2}" y="${m+120}" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">${name.toUpperCase()}</text>
                <text x="${m+wMM/2}" y="${m+140}" text-anchor="middle" fill="#fff" font-size="12">${hist.toUpperCase()}</text>
                <text x="${m+wMM/2}" y="${m+170}" text-anchor="middle" fill="#fff" font-size="10">РЕГИСТРАЦИОННЫЙ № ${num}</text>
                <text x="${m+wMM/2}" y="${m+hMM-20}" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">ОХРАНЯЕТСЯ ГОСУДАРСТВОМ</text>
                <text x="${sw/2}" y="${sh-10}" text-anchor="middle" fill="#666" font-size="11">Чертеж информационной пластины (масштаб 1:5)</text>
            </svg>`;
    }

    window.downloadDrawing = function() {
        const svg = document.getElementById('plateDrawing');
        if (!svg) return;
        const c = document.createElement('canvas');
        c.width = parseInt(svg.getAttribute('width'));
        c.height = parseInt(svg.getAttribute('height'));
        const ctx = c.getContext('2d');
        const data = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = function() {
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url);
            const a = document.createElement('a');
            a.href = c.toDataURL('image/png'); a.download = 'чертеж.png';
            document.body.appendChild(a); a.click(); a.remove();
        };
        img.src = url;
    };

    window.downloadDrawingSVG = function() {
        const svg = document.getElementById('plateDrawing');
        if (!svg) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
        a.download = 'чертеж.svg'; document.body.appendChild(a); a.click(); a.remove();
    };

    document.getElementById('generateQR')?.addEventListener('change', function() {
        const sec = document.getElementById('qrCodeSection');
        if (this.checked) {
            sec.style.display = 'block';
            const num = document.getElementById('egrknNumber')?.value;
            if (num) {
                const link = `https://opendata.mkrf.ru/opendata/7705851331-egrkn/object/${num}`;
                document.getElementById('egrknLink').value = link;
                const img = document.createElement('img');
                img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
                img.style.maxWidth = '200px'; img.style.border = '1px solid #ddd'; img.style.borderRadius = '4px';
                document.getElementById('qrCodeContainer').innerHTML = '';
                document.getElementById('qrCodeContainer').appendChild(img);
            }
        } else { sec.style.display = 'none'; }
    });

    window.canvasInstances = {};
    window.initCanvas = function(input, canvasId) {
        if (!input.files || !input.files[0]) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const cvs = document.getElementById(canvasId);
                const ed = document.getElementById('editor-' + canvasId.replace('canvas-', ''));
                cvs.width = img.width; cvs.height = img.height;
                const ctx = cvs.getContext('2d');
                ctx.drawImage(img, 0, 0);
                ed.style.display = 'block';
                const key = canvasId.replace('canvas-', '');
                window.canvasInstances[key] = { cvs, ctx, img, tool: 'rect', drawing: false, sx: 0, sy: 0 };
                
                cvs.onmousedown = function(ev) {
                    window.canvasInstances[key].drawing = true;
                    const r = cvs.getBoundingClientRect();
                    window.canvasInstances[key].sx = (ev.clientX - r.left) * (cvs.width / r.width);
                    window.canvasInstances[key].sy = (ev.clientY - r.top) * (cvs.height / r.height);
                };
                cvs.onmousemove = function(ev) {
                    const d = window.canvasInstances[key];
                    if (!d.drawing) return;
                    const r = cvs.getBoundingClientRect();
                    const x = (ev.clientX - r.left) * (cvs.width / r.width);
                    const y = (ev.clientY - r.top) * (cvs.height / r.height);
                    d.ctx.clearRect(0, 0, cvs.width, cvs.height);
                    d.ctx.drawImage(d.img, 0, 0, cvs.width, cvs.height);
                    d.ctx.beginPath(); d.ctx.strokeStyle = 'red'; d.ctx.lineWidth = 3;
                    if (d.tool === 'rect') d.ctx.rect(d.sx, d.sy, x - d.sx, y - d.sy);
                    else { d.ctx.moveTo(d.sx, d.sy); d.ctx.lineTo(x, y); }
                    d.ctx.stroke();
                };
                cvs.onmouseup = function() { window.canvasInstances[key].drawing = false; };
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    };

    window.setTool = function(tool, id) { if (window.canvasInstances[id]) window.canvasInstances[id].tool = tool; };
    window.clearCanvas = function(id) {
        const d = window.canvasInstances[id];
        if (d) { d.ctx.clearRect(0, 0, d.cvs.width, d.cvs.height); d.ctx.drawImage(d.img, 0, 0, d.cvs.width, d.cvs.height); }
    };

    document.getElementById('pinForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const promises = Object.keys(window.canvasInstances).map(key => {
            return new Promise(resolve => {
                window.canvasInstances[key].cvs.toBlob(blob => {
                    fd.set(key, blob, key + '.png');
                    resolve();
                }, 'image/png');
            });
        });
        await Promise.all(promises);
        
        const btn = this.querySelector('button[type="submit"]');
        btn.textContent = 'ГЕНЕРАЦИЯ...'; btn.disabled = true;
        
        try {
            const res = await fetch('/generate', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Ошибка сервера');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'Project_PIN.zip';
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Ошибка: ' + err.message);
        } finally {
            btn.textContent = 'СФОРМИРОВАТЬ ПРОЕКТ (ZIP: PDF + DOCX)';
            btn.disabled = false;
        }
    });

    window.addEventListener('load', function() {
        updatePlateDrawing();
        if (document.getElementById('plateSize')?.value) calculateLoads();
    });
    document.getElementById('plateSize')?.addEventListener('change', function() {
        calculateLoads();
        updatePlateDrawing();
    });
    ['objectName', 'historyInfo', 'egrknNumber', 'category'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updatePlateDrawing);
    });
});