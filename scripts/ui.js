// --- FUNÇÕES DE INTERFACE (UI) ---
function recalcularOpcoesAudio(wrapper) {
    if (!wrapper) return;
    const slots = Array.from(wrapper.querySelectorAll('.audio-slot'));
    if (slots.length === 0) return;
    let minTime = Infinity; 
    let lastSlot = null; 
    
    slots.forEach(slot => {
        const m = parseInt(slot.querySelector('.aud-min').value) || 0;
        const s = parseInt(slot.querySelector('.aud-sec').value) || 0;
        const totalSec = (m * 60) + s;
        if (totalSec < minTime) { minTime = totalSec; lastSlot = slot; }
    });
    slots.forEach(slot => {
        const grpPlay = slot.querySelector('.grp-playthrough');
        const chkPlay = slot.querySelector('.aud-playthrough');
        const grpCont = slot.querySelector('.grp-continue');
        const chkCont = slot.querySelector('.aud-continue');
        const grpStop = slot.querySelector('.grp-stopzero');
        const chkStop = slot.querySelector('.aud-stopzero');
        if (slot === lastSlot) {
            chkPlay.disabled = false; grpPlay.classList.remove('disabled');
            chkCont.disabled = false; grpCont.classList.remove('disabled');
            const m = parseInt(slot.querySelector('.aud-min').value) || 0;
            const s = parseInt(slot.querySelector('.aud-sec').value) || 0;
            if (m === 0 && s === 0) { chkStop.checked = false; chkStop.disabled = true; grpStop.classList.add('disabled'); }
            else { chkStop.disabled = false; grpStop.classList.remove('disabled'); }
        } else {
            chkPlay.checked = false; chkPlay.disabled = true; grpPlay.classList.add('disabled');
            chkCont.checked = false; chkCont.disabled = true; grpCont.classList.add('disabled');
            chkStop.checked = false; chkStop.disabled = true; grpStop.classList.add('disabled');
        }
    });
}

function ensureExclusive(checkbox) {
    if (!checkbox.checked) return;
    const slot = checkbox.closest('.audio-slot');
    const chkPlay = slot.querySelector('.aud-playthrough');
    const chkStop = slot.querySelector('.aud-stopzero');
    const chkCont = slot.querySelector('.aud-continue');
    if (checkbox === chkPlay) { chkStop.checked = false; chkCont.checked = false; }
    if (checkbox === chkStop) { chkPlay.checked = false; chkCont.checked = false; }
    if (checkbox === chkCont) { chkPlay.checked = false; chkStop.checked = false; }
}

function uiAtualizarFase(row) {
    const chkEstouro = row.querySelector('.inp-estouro-fase');
    const colIntervalo = row.querySelector('.col-intervalo');
    const chkManual = row.querySelector('.inp-int-manual');
    const boxTempoInt = row.querySelector('.inp-int-tempo').parentElement;
    const globalIntervalos = document.getElementById('chk-intervalos').checked;
    if (chkEstouro.checked) colIntervalo.classList.add('hidden');
    else { 
        if (globalIntervalos) colIntervalo.classList.remove('hidden'); 
        else colIntervalo.classList.add('hidden'); 
    }
    if (chkManual.checked) boxTempoInt.classList.add('hidden'); 
    else boxTempoInt.classList.remove('hidden');
}

function verificarStatusMidia(slot) {
    const isImageSlot = slot.classList.contains('fase-row');
    const label = slot.querySelector('.file-status');
    const fname = isImageSlot ? slot.dataset.imgname : slot.dataset.filename;
    if (label) label.remove();
    if (!fname) return;
    let statusHtml = '';
    if (mediaCache[fname]) statusHtml = `<span class="file-status status-ok">✅ ${fname}</span>`;
    else statusHtml = `<span class="file-status status-missing">❌ ${fname}</span>`;
    if (isImageSlot) {
        const imgInput = slot.querySelector('.inp-img');
        if (imgInput) imgInput.insertAdjacentHTML('afterend', statusHtml);
    } else {
        const fileInput = slot.querySelector('.aud-file');
        if (fileInput) fileInput.insertAdjacentHTML('afterend', statusHtml);
    }
}

function resolveMissingMedia() {
    document.getElementById('modal-missing-media').style.display = 'none';
    document.getElementById('folder-input').click();
}

function processarPastaTrabalho(input) {
    let count = 0;
    if (input.files) {
        for (let file of input.files) { mediaCache[file.name] = file; count++; }
    }
    if(count > 0) {
        document.getElementById('btn-midia').innerText = `📂 Pasta Mídia (${count} arq)`;
        document.getElementById('btn-midia').classList.add('loaded');
        alert(`${count} arquivos mapeados!`);
    }
    document.querySelectorAll('.audio-slot').forEach(slot => verificarStatusMidia(slot));
    document.querySelectorAll('.fase-row').forEach(row => verificarStatusMidia(row));
}

function adicionarSlotAudio(panel, min=0, sec=0, dur=0, loop=false, fin=5, fout=5, fname="", playThrough=false, stopZero=false, continueNext=false) {
    let list = panel;
    if (!panel.classList.contains('audio-list')) {
        list = panel.querySelector('.audio-list');
        if (!list) list = panel;
    }
    const div = document.createElement('div');
    div.className = 'audio-slot';
    if (fname) div.dataset.filename = fname;
    div.innerHTML = `
        <div class="grp"><label>Disparo</label><div><input type="number" class="aud-min" value="${min}" placeholder="Min" oninput="recalcularOpcoesAudio(this.closest('.fase-wrapper'))">:<input type="number" class="aud-sec" value="${sec}" placeholder="Seg" oninput="recalcularOpcoesAudio(this.closest('.fase-wrapper'))"></div></div>
        <div class="grp"><label>Arquivo</label><input type="file" class="aud-file" accept="audio/*" onchange="this.closest('.audio-slot').dataset.filename = this.files[0].name; verificarStatusMidia(this.closest('.audio-slot'))"></div>
        <div class="grp"><label>Duração(s)</label><input type="number" class="aud-dur" value="${dur}" placeholder="0=Tudo"></div>
        <div class="grp"><label>Loop</label><input type="checkbox" class="aud-loop" ${loop?'checked':''} style="width:20px;height:20px;"></div>
        <div class="grp"><label>Fade In/Out</label><div><input type="number" class="aud-fin" value="${fin}" style="width:30px">/<input type="number" class="aud-fout" value="${fout}" style="width:30px"></div></div>
        <div class="grp grp-playthrough"><label data-tooltip="Tocar até o fim (entra no estouro)">Até Fim?</label><input type="checkbox" class="aud-playthrough" ${playThrough?'checked':''} style="width:20px;height:20px;" onchange="ensureExclusive(this)"></div>
        <div class="grp grp-stopzero"><label data-tooltip="Cortar em 00:00">Parar 0s?</label><input type="checkbox" class="aud-stopzero" ${stopZero?'checked':''} style="width:20px;height:20px;" onchange="ensureExclusive(this)"></div>
        <div class="grp grp-continue"><label data-tooltip="Continuar na próxima fase (fundo)">Cont. Próx?</label><input type="checkbox" class="aud-continue" ${continueNext?'checked':''} style="width:20px;height:20px;" onchange="ensureExclusive(this)"></div>
        <button class="btn-x" style="width:20px; height:20px;" onclick="let w=this.closest('.fase-wrapper'); this.parentElement.remove(); recalcularOpcoesAudio(w);">X</button>
    `;
    list.appendChild(div);
    verificarStatusMidia(div);
    if (div.closest('.fase-wrapper')) recalcularOpcoesAudio(div.closest('.fase-wrapper'));
}

function adicionarFase(tit="", min=10, flex=true, bg="#000000", txt="#ffffff", imgName="") {
    const c = document.getElementById('lista-fases');
    const hideInt = document.getElementById('chk-intervalos').checked ? '' : 'hidden';
    const hideEst = document.getElementById('chk-estouro-global').checked ? '' : 'hidden';
    const hideAud = document.getElementById('chk-audio-global').checked ? '' : 'hidden';
    const wrapper = document.createElement('div');
    wrapper.className = 'fase-wrapper';
    const div = document.createElement('div');
    div.className = 'fase-row';
    if(imgName) div.dataset.imgname = imgName;

    div.innerHTML = `
        <button class="btn-x" onclick="this.closest('.fase-wrapper').remove()">X</button>
        <div class="campo" style="flex:2; min-width:150px;"><label>Título</label><input type="text" class="inp-titulo" value="${tit}"></div>
        <div class="campo" style="width:70px;"><label>Min</label><input type="number" class="inp-tempo" value="${min}" min="1"></div>
        <div class="campo" style="align-items:center;"><label>Flex?</label><input type="checkbox" class="inp-flexivel" ${flex?'checked':''} style="width:20px; height:20px;"></div>
        <div class="col-estouro ${hideEst}"><div class="campo" style="align-items:center;"><label>Estouro?</label><input type="checkbox" class="inp-estouro-fase" style="width:20px; height:20px;" onchange="uiAtualizarFase(this.closest('.fase-row'))"></div></div>
        <div class="col-audio ${hideAud}"><div class="campo" style="align-items:center;"><label>Beep?</label><input type="checkbox" class="inp-beep-fase" checked style="width:20px; height:20px;"></div></div>
        <div class="col-intervalo ${hideInt}"><div class="campo" style="width:60px;"><label>Pausa</label><input type="number" class="inp-int-tempo" value="30"></div><div class="campo" style="align-items:center;"><label>Clique?</label><input type="checkbox" class="inp-int-manual" style="width:20px; height:20px;" onchange="uiAtualizarFase(this.closest('.fase-row'))"></div></div>
        <div class="campo" style="width:60px;"><label>Aviso</label><input type="number" class="inp-aviso" value="30"></div>
        <div class="campo" data-tooltip="Cor Fundo"><label>Bg</label><input type="color" class="inp-bg" value="${bg}"></div>
        <div class="campo" data-tooltip="Cor Texto"><label>Txt</label><input type="color" class="inp-txt" value="${txt}"></div>
        <div class="campo" style="flex:1;"><label>Img</label><input type="file" class="inp-img" accept="image/*" onchange="this.closest('.fase-row').dataset.imgname = this.files[0].name; verificarStatusMidia(this.closest('.fase-row'))"></div>
        <button class="btn-icon btn-show-audio ${hideAud}" onclick="this.closest('.fase-wrapper').querySelector('.audio-panel').classList.toggle('open')">🎵</button>
    `;
    const audioPanel = document.createElement('div');
    audioPanel.className = 'audio-panel';
    audioPanel.innerHTML = `<div style="font-size:0.8rem; color:#aaa; margin-bottom:5px;">Configuração de Áudio Avançada</div><div class="audio-list"></div><button class="btn-add" style="padding:5px 10px; font-size:0.8rem;" onclick="adicionarSlotAudio(this.parentElement)">+ Novo Áudio</button>`;
    wrapper.appendChild(div); wrapper.appendChild(audioPanel); c.appendChild(wrapper); uiAtualizarFase(div);
    
    verificarStatusMidia(div);
    return wrapper;
}

// --- CONTROLES UI ---
function toggleIgnorarInicio() {
    const chk = document.getElementById('chk-ignorar-inicio');
    document.getElementById('hora-inicio').disabled = chk.checked;
    document.querySelectorAll('#group-inicio button').forEach(b => b.disabled = chk.checked);
}
function toggleIgnorarFim() {
    const chk = document.getElementById('chk-ignorar-fim');
    document.getElementById('hora-fim').disabled = chk.checked;
    document.querySelectorAll('#group-fim button').forEach(b => b.disabled = chk.checked);
}
function toggleIntervalosGlobais(){ const c = document.getElementById('chk-intervalos').checked; document.querySelectorAll('.fase-row').forEach(row => uiAtualizarFase(row)); }
function toggleEstouroGlobal(){ const c = document.getElementById('chk-estouro-global').checked; document.querySelectorAll('.col-estouro').forEach(e => c ? e.classList.remove('hidden') : e.classList.add('hidden')); }
function toggleAudioGlobal(){
    const c = document.getElementById('chk-audio-global').checked;
    document.querySelectorAll('.col-audio').forEach(e => c ? e.classList.remove('hidden') : e.classList.add('hidden'));
    document.querySelectorAll('.btn-show-audio').forEach(btn => c ? btn.classList.remove('hidden') : btn.classList.add('hidden'));
}
function calcSetInicioAgora() { document.getElementById('hora-inicio').value = formatTime(new Date()); }
function calcFimPeloInicio() {
    const hI = document.getElementById('hora-inicio').value;
    if(!hI) return alert("Defina o início primeiro.");
    const dur = obterDuracaoTotalMinutos();
    const d = montarData(hI, new Date());
    d.setMinutes(d.getMinutes() + Math.ceil(dur));
    document.getElementById('hora-fim').value = formatTime(d);
}
function calcInicioPeloFim() {
    const hF = document.getElementById('hora-fim').value;
    if(!hF) return alert("Defina o fim primeiro.");
    const dur = obterDuracaoTotalMinutos();
    const dFim = montarData(hF, new Date());
    const dIni = new Date(dFim.getTime() - (dur * 60000));
    document.getElementById('hora-inicio').value = formatTime(dIni);
}

// --- SALVAR / ABRIR ---
function acaoAbrir() { document.getElementById('file-input').click(); }
function acaoSalvar() {
    const titulo = document.getElementById('global-titulo').value || "Cronograma";
    const nomeArquivo = titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".json";
    const dados = gerarObjetoDados();
    const conteudoTexto = JSON.stringify(dados, null, 2);
    if ('showSaveFilePicker' in window) {
        window.showSaveFilePicker({ suggestedName: nomeArquivo, types: [{ description: 'Arquivo JSON', accept: { 'application/json': ['.json'] }, }], })
        .then(h => h.createWritable().then(w => w.write(conteudoTexto).then(() => w.close()))).catch(e => console.log(e));
        return;
    }
    const blob = new Blob([conteudoTexto], { type: "application/json" });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomeArquivo;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function gerarObjetoDados() {
        const dados = { 
        tituloGlobal: document.getElementById('global-titulo').value, corGlobal: document.getElementById('global-cor-titulo').value,
        exibirTitulo: document.getElementById('chk-exibir-titulo').checked, inicio: document.getElementById('hora-inicio').value, fim: document.getElementById('hora-fim').value, 
        ignorarInicio: document.getElementById('chk-ignorar-inicio').checked, ignorarFim: document.getElementById('chk-ignorar-fim').checked,
        intervalosAtivos: document.getElementById('chk-intervalos').checked, estouroGlobal: document.getElementById('chk-estouro-global').checked, audioGlobal: document.getElementById('chk-audio-global').checked,
        fases: [] 
    };
    document.querySelectorAll('.fase-wrapper').forEach(wrap => {
        const row = wrap.querySelector('.fase-row');
        const customAudios = [];
        wrap.querySelectorAll('.audio-slot').forEach(slot => {
            const fileIn = slot.querySelector('.aud-file');
            let fName = slot.dataset.filename || ""; 
            if (fileIn.files.length > 0) fName = fileIn.files[0].name;
            customAudios.push({
                min: slot.querySelector('.aud-min').value, sec: slot.querySelector('.aud-sec').value, dur: slot.querySelector('.aud-dur').value, loop: slot.querySelector('.aud-loop').checked,
                fin: slot.querySelector('.aud-fin').value, fout: slot.querySelector('.aud-fout').value, playThrough: slot.querySelector('.aud-playthrough').checked,
                stopAtZero: slot.querySelector('.aud-stopzero').checked, continueNext: slot.querySelector('.aud-continue').checked, fileName: fName
            });
        });
        let imgName = row.dataset.imgname || "";
        const imgInput = row.querySelector('.inp-img');
        if(imgInput && imgInput.files.length > 0) imgName = imgInput.files[0].name;
        dados.fases.push({
            titulo: row.querySelector('.inp-titulo').value, minutos: row.querySelector('.inp-tempo').value, flexivel: row.querySelector('.inp-flexivel').checked,
            intTempo: row.querySelector('.inp-int-tempo').value, intManual: row.querySelector('.inp-int-manual').checked, estouroFase: row.querySelector('.inp-estouro-fase').checked, beepFase: row.querySelector('.inp-beep-fase').checked,
            aviso: row.querySelector('.inp-aviso').value, bg: row.querySelector('.inp-bg').value, txt: row.querySelector('.inp-txt').value, customAudioTimes: customAudios, imgName: imgName
        });
    });
    return dados;
}
function carregarArquivo(input) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => { try { aplicarConfiguracao(JSON.parse(e.target.result)); } catch(err){ alert("Erro ao ler: " + err.message); }};
    r.readAsText(f); input.value = "";
}
function aplicarConfiguracao(d) {
    document.getElementById('global-titulo').value = d.tituloGlobal || "Evento"; document.getElementById('global-cor-titulo').value = d.corGlobal || "#00d2ff"; document.getElementById('global-titulo').style.color = d.corGlobal || "#00d2ff"; 
    document.getElementById('chk-exibir-titulo').checked = d.exibirTitulo || false; document.getElementById('hora-inicio').value = d.inicio || ""; document.getElementById('hora-fim').value = d.fim || "";
    document.getElementById('chk-ignorar-inicio').checked = d.ignorarInicio || false; toggleIgnorarInicio(); document.getElementById('chk-ignorar-fim').checked = d.ignorarFim || false; toggleIgnorarFim();
    document.getElementById('chk-intervalos').checked = d.intervalosAtivos; toggleIntervalosGlobais(); document.getElementById('chk-estouro-global').checked = d.estouroGlobal || false; toggleEstouroGlobal(); document.getElementById('chk-audio-global').checked = d.audioGlobal || false; toggleAudioGlobal();
    document.getElementById('lista-fases').innerHTML = ""; let usesMedia = false; 
    if (d.fases && d.fases.length > 0) {
        d.fases.forEach(f => {
            const isFlex = (f.flexivel !== undefined) ? f.flexivel : (f.redutivel || false);
            if (f.imgName) usesMedia = true;
            const divWrapper = adicionarFase(f.titulo, f.minutos, isFlex, f.bg, f.txt, f.imgName || "");
            const row = divWrapper.querySelector('.fase-row');
            row.querySelector('.inp-int-tempo').value = f.intTempo || 0; row.querySelector('.inp-int-manual').checked = f.intManual || false; 
            row.querySelector('.inp-estouro-fase').checked = f.estouroFase || false; row.querySelector('.inp-beep-fase').checked = (f.beepFase !== undefined) ? f.beepFase : true;
            row.querySelector('.inp-aviso').value = f.aviso || 30; 
            if (f.customAudioTimes && f.customAudioTimes.length > 0) {
                usesMedia = true; const painel = divWrapper.querySelector('.audio-panel'); painel.classList.add('open');
                f.customAudioTimes.forEach(t => { adicionarSlotAudio(painel, t.min, t.sec, t.dur, t.loop, t.fin, t.fout, t.fileName, t.playThrough, t.stopAtZero, t.continueNext); });
            }
            uiAtualizarFase(row); 
        });
        if (usesMedia && Object.keys(mediaCache).length === 0) document.getElementById('modal-missing-media').style.display = 'flex';
        else if (Object.keys(mediaCache).length > 0) processarPastaTrabalho({files:[]});
    }
}