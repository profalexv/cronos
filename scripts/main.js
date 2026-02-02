// --- CORE DO SISTEMA ---

function construirCronograma() {
    cronograma = [];
    const wrappers = document.querySelectorAll('.fase-wrapper');
    if (wrappers.length === 0) return;

    wrappers.forEach((wrapper, idx) => {
        const row = wrapper.querySelector('.fase-row');
        const min = parseFloat(row.querySelector('.inp-tempo').value) || 0;
        const seg = Math.floor(min * 60);
        
        const customAudios = [];
        wrapper.querySelectorAll('.audio-slot').forEach(slot => {
            const m = parseInt(slot.querySelector('.aud-min').value) || 0;
            const s = parseInt(slot.querySelector('.aud-sec').value) || 0;
            const triggerTime = (m * 60) + s; 
            
            const fName = slot.dataset.filename || (slot.querySelector('.aud-file').files[0] ? slot.querySelector('.aud-file').files[0].name : "");

            if (fName) {
                customAudios.push({
                    trigger: triggerTime, 
                    fileName: fName,
                    loop: slot.querySelector('.aud-loop').checked,
                    stopAtZero: slot.querySelector('.aud-stopzero').checked
                });
            }
        });

        cronograma.push({
            titulo: row.querySelector('.inp-titulo').value,
            segundosFinais: seg,
            minutosOrig: min,
            flexivel: row.querySelector('.inp-flexivel').checked,
            bg: row.querySelector('.inp-bg').value,
            txt: row.querySelector('.inp-txt').value,
            aviso: parseInt(row.querySelector('.inp-aviso').value) || 30,
            permitirEstouro: row.querySelector('.inp-estouro-fase').checked,
            imgName: row.dataset.imgname || null,
            customAudios: customAudios,
            temIntervalo: document.getElementById('chk-intervalos').checked,
            intTempo: parseFloat(row.querySelector('.inp-int-tempo').value) * 60 || 0,
            intManual: row.querySelector('.inp-int-manual').checked
        });
    });
}

function rodarFase(idx) {
    if (intervaloTimer) clearInterval(intervaloTimer);
    
    if (idx >= cronograma.length) {
        document.getElementById('lbl-fim').classList.add('ativo');
        document.getElementById('timer-principal').innerHTML = "FIM";
        document.getElementById('box-principal').style.backgroundColor = "#000";
        document.getElementById('titulo-fase').innerText = "Encerrado";
        tocarBip(880, 0.5, 'triangle'); 
        return;
    }

    indexAtual = idx;
    const fase = cronograma[idx];
    tempoRestante = fase.segundosFinais;
    estado = "RODANDO";
    emIntervalo = false;

    document.getElementById('titulo-fase').innerText = fase.titulo;
    document.getElementById('titulo-fase').style.color = fase.txt;
    
    const display = document.getElementById('display-screen');
    if (fase.imgName && mediaCache[fase.imgName]) {
        const url = URL.createObjectURL(mediaCache[fase.imgName]);
        display.style.backgroundImage = `url('${url}')`;
    } else {
        display.style.backgroundImage = 'none';
        display.style.backgroundColor = fase.bg;
    }

    document.getElementById('box-principal').style.color = fase.txt;
    
    tick(); 
    intervaloTimer = setInterval(tick, 1000);
    atualizarBotoes(true);
}

function gerenciarIntervalo() {
    const faseAnterior = cronograma[indexAtual];
    if (!faseAnterior.temIntervalo || indexAtual >= cronograma.length - 1) {
        rodarFase(indexAtual + 1);
        return;
    }

    emIntervalo = true;
    estado = "INTERVALO";
    
    document.getElementById('titulo-fase').innerText = "INTERVALO";
    document.getElementById('box-principal').style.backgroundColor = "#222";
    document.getElementById('display-screen').style.backgroundImage = "none";
    document.getElementById('display-screen').style.backgroundColor = "#000";

    if (faseAnterior.intManual) {
        document.getElementById('timer-principal').innerText = "PAUSA";
        document.getElementById('btn-intervalo-manual').classList.remove('hidden');
        clearInterval(intervaloTimer);
    } else {
        tempoRestante = faseAnterior.intTempo;
        intervaloTimer = setInterval(tick, 1000);
    }
}

function sairIntervaloManual() {
    document.getElementById('btn-intervalo-manual').classList.add('hidden');
    rodarFase(indexAtual + 1);
}

function atualizarBotoes(rodando) {
    if(rodando) {
        document.getElementById('btn-pausar').classList.remove('hidden');
        document.getElementById('btn-continuar').classList.add('hidden');
    } else {
        document.getElementById('btn-pausar').classList.add('hidden');
        document.getElementById('btn-continuar').classList.remove('hidden');
    }
}

function acaoPausar() {
    if (intervaloTimer) clearInterval(intervaloTimer);
    estado = "PAUSADO";
    atualizarBotoes(false);
    if (activeAudio) {
            document.getElementById('modal-audio-pause').style.display = 'flex';
    }
}

function acaoContinuar() {
    if (estado === "PAUSADO") {
        estado = emIntervalo ? "INTERVALO" : "RODANDO";
        intervaloTimer = setInterval(tick, 1000);
        atualizarBotoes(true);
        if (audioResumeAction === 'pause' && activeAudio) activeAudio.audio.play();
        document.getElementById('modal-audio-pause').style.display = 'none';
    }
}

function acaoAvançar() { rodarFase(indexAtual + 1); }
function acaoAdicionarTempo() { tempoRestante += 60; tick(); }
function acaoReiniciarFase() { rodarFase(indexAtual); }
function encerrar() {
    if (intervaloTimer) clearInterval(intervaloTimer);
    liberarWakeLock();
    if (activeAudio) { activeAudio.audio.pause(); activeAudio = null; }
    document.getElementById('display-screen').style.display = 'none';
    document.getElementById('config-screen').style.display = 'block';
    if (document.exitFullscreen) document.exitFullscreen();
}

function atualizarPrevisaoEntrega() {
    let segundosFuturos = (tempoRestante > 0 ? tempoRestante : 0);
    for(let i = indexAtual + 1; i < cronograma.length; i++) {
        segundosFuturos += cronograma[i].segundosFinais;
        if(cronograma[i].temIntervalo && !cronograma[i].intManual) {
                segundosFuturos += cronograma[i].intTempo;
        }
    }
    const now = new Date();
    const prev = new Date(now.getTime() + (segundosFuturos * 1000));
    
    const elPrev = document.getElementById('lbl-fim-previsto');
    elPrev.innerText = formatTime(prev);

    if (dataFimGlobal && prev > dataFimGlobal) elPrev.style.color = "#ff4444";
    else elPrev.style.color = "#28a745";
    
    const elProx = document.getElementById('txt-proximo');
    if (indexAtual + 1 < cronograma.length) elProx.innerText = "Próximo: " + cronograma[indexAtual + 1].titulo;
    else elProx.innerText = "Próximo: Fim";
}

function tick() {
    if (estado !== "RODANDO" && estado !== "INTERVALO") return;
    atualizarPrevisaoEntrega();
    
    // Audio check
    if (estado === "RODANDO" && !emIntervalo && document.getElementById('chk-audio-global').checked) {
        const fase = cronograma[indexAtual];
        if (fase.customAudios) { 
            fase.customAudios.forEach(aud => { 
                if (aud.trigger === tempoRestante) playSmartAudio(aud); 
            }); 
        }
    }
    if (tempoRestante === 0 && activeAudio && activeAudio.el.customFlags && activeAudio.el.customFlags.stopAtZero) { fadeAndStop(activeAudio, 2); }
    
    tempoRestante--;
    
    const abs = Math.abs(tempoRestante); const m = Math.floor(abs / 60); const s = abs % 60; 
    const sinal = tempoRestante < 0 ? "-" : "";
    const el = document.getElementById('timer-principal'); el.innerText = `${sinal}${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const bg = document.getElementById('display-screen');
    el.classList.remove('piscando-cor', 'piscando-vermelho', 'piscando-alerta-maximo'); bg.classList.remove('bg-panic');

    if (!emIntervalo) {
        if (tempoRestante > 0 && tempoRestante <= cronograma[indexAtual].aviso) el.classList.add('piscando-cor');
        else if (tempoRestante <= 0) {
            if (tempoRestante > -180) el.classList.add('piscando-vermelho'); else el.classList.add('piscando-alerta-maximo');
            if (tempoRestante <= -30) bg.classList.add('bg-panic');
        }
    }

    if (tempoRestante < 0) {
        if (cronograma[indexAtual].permitirEstouro || indexAtual === cronograma.length - 1) {
            if (intervaloTimer) clearInterval(intervaloTimer); 
            if (tempoRestante === -1) tocarBip();
            if (dataFimGlobal && !emIntervalo) {
                const now = new Date();
                if (now > dataFimGlobal) {
                    if (document.getElementById('modal-runtime-adjust').style.display !== 'flex') {
                        document.getElementById('modal-runtime-adjust').style.display = 'flex';
                    }
                }
            }
            intervaloTimer = setInterval(tickNegativo, 1000);
        } else { 
            clearInterval(intervaloTimer); 
            tocarBip(); 
            if (emIntervalo) rodarFase(indexAtual + 1); 
            else gerenciarIntervalo(); 
        }
    }
}

function tickNegativo() {
    if (estado !== "RODANDO") return;
    atualizarPrevisaoEntrega();
    tempoRestante--;
    const abs = Math.abs(tempoRestante); const m = Math.floor(abs / 60); const s = abs % 60;
    document.getElementById('timer-principal').innerText = `-${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (Math.abs(tempoRestante) % 30 === 0) tocarBip();
    if (dataFimGlobal && new Date() > dataFimGlobal && document.getElementById('modal-runtime-adjust').style.display !== 'flex') {
            document.getElementById('modal-runtime-adjust').style.display = 'flex';
    }
}

function rodarSistema(now, forceStart = false) {
    document.getElementById('config-screen').style.display='none'; 
    document.getElementById('display-screen').style.display='flex';
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{});
    const elTit = document.getElementById('display-global-titulo');
    if (document.getElementById('chk-exibir-titulo').checked) {
        elTit.innerText = document.getElementById('global-titulo').value; elTit.style.color = document.getElementById('global-cor-titulo').value; elTit.classList.remove('hidden');
    } else elTit.classList.add('hidden');
    const hF = document.getElementById('hora-fim').value;
    const ignorarF = document.getElementById('chk-ignorar-fim').checked;
    
    if (ignorarF) {
        document.getElementById('lbl-fim-absoluto').innerText = "LIVRE";
        document.getElementById('lbl-fim-previsto').parentElement.style.display = 'flex'; 
    } else {
        document.getElementById('lbl-fim-absoluto').innerText = hF;
        document.getElementById('lbl-fim-previsto').parentElement.style.display = 'flex';
    }
    document.querySelector('.controles-play').classList.remove('hidden');
    atualizarBotoes(false); indexAtual = 0; rodarFase(0);
}

function iniciarApresentacao() {
    const hI = document.getElementById('hora-inicio').value;
    const hF = document.getElementById('hora-fim').value;
    const ignorarI = document.getElementById('chk-ignorar-inicio').checked;
    const ignorarF = document.getElementById('chk-ignorar-fim').checked;

    if (!ignorarI && !hI) return alert("Defina o Início.");
    if (!ignorarF && !hF) return alert("Defina o Fim.");

    const now = new Date(); 
    let dIni;
    if (ignorarI) dIni = now; else dIni = montarData(hI, now);

    if (!ignorarF) {
        dataFimGlobal = montarData(hF, now); 
        if (dataFimGlobal < dIni) dataFimGlobal.setDate(dataFimGlobal.getDate()+1);
    } else { dataFimGlobal = null; }

    // 1. VERIFICAR ATRASO EM RELAÇÃO AO FIM
    if (!ignorarF) {
        const durTotalMin = obterDuracaoTotalMinutos();
        const tempoDispMin = (dataFimGlobal - now) / 60000;
        const diferenca = tempoDispMin - durTotalMin; 

        // SE ATRASADO (diferenca negativa maior que 1 min)
        if (diferenca < -1) { 
            deficitSeconds = Math.abs(diferenca * 60);
            construirCronograma(); 
            if (cronograma.length === 0) return alert("Adicione etapas!");
            
            const firstPhaseMin = cronograma[0].segundosFinais / 60;
            const totalDurMin = cronograma.reduce((acc,f) => acc + f.segundosFinais, 0) / 60;
            const delayMin = Math.abs(diferenca);

            if (delayMin > firstPhaseMin || delayMin > (totalDurMin * 0.25)) {
                document.getElementById('modal-severe-delay').style.display = 'flex';
                return;
            } 
            else {
                document.getElementById('lbl-mod-1').innerText = `(${cronograma[0].titulo})`;
                document.getElementById('lbl-mod-4').innerText = `(${cronograma[cronograma.length-1].titulo})`;
                document.getElementById('modal-moderate-delay').style.display = 'flex';
                return;
            }
        }
    }

    // 2. VERIFICAR INICIO ANTECIPADO (Start Check)
    if (!ignorarI && now < dIni) {
        pendingDataInicio = dIni;
        document.getElementById('modal-early-start').style.display = 'flex';
        return;
    }

    // 3. VERIFICAR SOBRA DE TEMPO (Surplus Check)
    if (!ignorarF) {
        const durTotalMin = obterDuracaoTotalMinutos();
        const tempoDispMin = (dataFimGlobal - now) / 60000;
        const diferenca = tempoDispMin - durTotalMin; 
        
        if (diferenca > 2) { // Mais de 2 minutos de folga
            surplusMinutes = Math.floor(diferenca);
            document.getElementById('surplus-display-val').innerText = surplusMinutes;
            document.getElementById('modal-surplus-check').style.display = 'flex';
            return;
        }
    }

    ativarWakeLock();
    construirCronograma();
    rodarSistema(now);
}

function handleEarlyStart(decision) {
    document.getElementById('modal-early-start').style.display = 'none';
    if (decision === 'wait') {
        construirCronograma();
        modoEspera(pendingDataInicio);
    } else {
        construirCronograma();
        rodarSistema(new Date(), true); 
    }
}

function modoEspera(targetDate) {
    document.getElementById('config-screen').style.display='none';
    document.getElementById('display-screen').style.display='flex';
    document.querySelector('.controles-play').classList.add('hidden'); 
    
    document.getElementById('titulo-fase').innerText = "AGUARDANDO INÍCIO";
    document.getElementById('titulo-fase').style.color = "#00d2ff";
    document.getElementById('txt-status').innerText = "Em Espera";

    if(intervaloTimer) clearInterval(intervaloTimer);
    
    intervaloTimer = setInterval(() => {
        const now = new Date();
        const diff = Math.ceil((targetDate - now)/1000);
        
        if(diff <= 0) {
            clearInterval(intervaloTimer);
            document.querySelector('.controles-play').classList.remove('hidden'); 
            tocarBip(600, 0.5);
            rodarSistema(new Date(), true); 
        } else {
            const m = Math.floor(diff/60);
            const s = diff % 60;
            document.getElementById('timer-principal').innerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            document.getElementById('timer-principal').classList.add('timer-waiting');
        }
    }, 1000);
}

function handleSurplusDecision(decision) {
    document.getElementById('modal-surplus-check').style.display = 'none';
    const now = new Date();

    if (decision === 'start') {
        ativarWakeLock();
        construirCronograma();
        rodarSistema(now, true);
    }
    else if (decision === 'wait') {
        const waitTime = new Date(now.getTime() + (surplusMinutes * 60000));
        construirCronograma();
        modoEspera(waitTime);
    }
    else if (decision === 'distribute') {
        document.getElementById('modal-surplus-dist').style.display = 'flex';
    }
}

function handleSurplusDistribution(type) {
    document.getElementById('modal-surplus-dist').style.display = 'none';
    ativarWakeLock();
    construirCronograma();
    const now = new Date();
    const secondsToAdd = surplusMinutes * 60;

    if (type === 'all') {
        const perPhase = Math.floor(secondsToAdd / cronograma.length);
        cronograma.forEach(f => f.segundosFinais += perPhase);
    }
    else if (type === 'first') {
        cronograma[0].segundosFinais += secondsToAdd;
    }
    else if (type === 'last') {
        cronograma[cronograma.length - 1].segundosFinais += secondsToAdd;
    }
    else if (type === 'flex') {
        const flexPhases = cronograma.filter(f => f.flexivel);
        if (flexPhases.length > 0) {
            const perPhase = Math.floor(secondsToAdd / flexPhases.length);
            cronograma.forEach(f => { if(f.flexivel) f.segundosFinais += perPhase; });
        } else {
            alert("Nenhuma fase flexível encontrada. Adicionado à última.");
            cronograma[cronograma.length - 1].segundosFinais += secondsToAdd;
        }
    }
    rodarSistema(now, true);
}

function handleSevereAction(action) {
    document.getElementById('modal-severe-delay').style.display = 'none';
    if (action === 'cancel') return;
    if (action === 'ignore') {
        document.getElementById('chk-ignorar-fim').checked = true; toggleIgnorarFim();
        iniciarApresentacao();
    }
}

function handleModerateAction(opt) {
    document.getElementById('modal-moderate-delay').style.display = 'none';
    ativarWakeLock();
    
    construirCronograma(); 
    const now = new Date();
    
    if (opt === 1) {
        cronograma[0].segundosFinais = Math.max(0, cronograma[0].segundosFinais - deficitSeconds);
    }
    else if (opt === 2) {
        const timeToAdd = cronograma[0].segundosFinais / (cronograma.length - 1);
        cronograma.shift(); 
        cronograma.forEach(f => f.segundosFinais += timeToAdd);
    }
    else if (opt === 3) {
        const timePool = cronograma[0].segundosFinais;
        cronograma.shift(); 
        let flexCount = cronograma.filter(f => f.flexivel).length;
        if (flexCount > 0) {
            cronograma.forEach(f => { if(f.flexivel) f.segundosFinais += (timePool/flexCount); });
        }
    }
    else if (opt === 4) {
        const last = cronograma.length - 1;
        cronograma[last].segundosFinais = Math.max(0, cronograma[last].segundosFinais - deficitSeconds);
    }
    else if (opt === 5) { return; }
    else if (opt === 6) {
        const durTotal = cronograma.reduce((acc,f)=>acc+f.segundosFinais,0);
        dataFimGlobal = new Date(now.getTime() + (durTotal*1000));
        document.getElementById('hora-fim').value = formatTime(dataFimGlobal);
    }
    else if (opt === 7) {
        dataFimGlobal = null;
        document.getElementById('chk-ignorar-fim').checked = true; toggleIgnorarFim();
    }

    rodarSistema(now, true);
}

function handleRuntimeAction(action) {
    document.getElementById('modal-runtime-adjust').style.display = 'none';
    
    if (action === 'auto') {
        const now = new Date();
        const timeAvailable = (dataFimGlobal - now) / 1000;
        let futureDurationFixed = 0;
        let futureDurationFlex = 0;
        let flexIndices = [];

        for (let i = indexAtual + 1; i < cronograma.length; i++) {
            if (cronograma[i].flexivel) {
                futureDurationFlex += cronograma[i].segundosFinais;
                flexIndices.push(i);
            } else {
                futureDurationFixed += cronograma[i].segundosFinais;
            }
        }

        const timeForFlex = timeAvailable - futureDurationFixed;
        if (timeForFlex <= 0 || flexIndices.length === 0) {
            alert("Impossível ajustar automaticamente (sem fases flexíveis ou tempo esgotado).");
            return; 
        }

        const factor = timeForFlex / futureDurationFlex;
        flexIndices.forEach(idx => {
            cronograma[idx].segundosFinais = Math.floor(cronograma[idx].segundosFinais * factor);
        });
        if (tempoRestante < 0) rodarFase(indexAtual + 1);
    }
    else if (action === 'ignore') {
        dataFimGlobal = null;
        document.getElementById('chk-ignorar-fim').checked = true; toggleIgnorarFim();
        document.getElementById('lbl-fim-absoluto').innerText = "LIVRE";
        document.getElementById('lbl-fim-previsto').parentElement.style.display = 'flex';
    }
    else if (action === 'reprogram') {
        openReprogramModal();
    }
}

function openReprogramModal() {
    const container = document.getElementById('reprogram-list');
    container.innerHTML = '';
    for (let i = indexAtual + 1; i < cronograma.length; i++) {
        const div = document.createElement('div');
        div.className = 'reprogram-row';
        div.innerHTML = `
            <label>${cronograma[i].titulo}</label>
            <input type="number" class="inp-reprog" data-idx="${i}" value="${Math.round(cronograma[i].segundosFinais/60)}">
        `;
        container.appendChild(div);
    }
    if (dataFimGlobal) {
        document.getElementById('new-end-time-input').value = formatTime(dataFimGlobal);
    } else {
        const now = new Date();
        document.getElementById('new-end-time-input').value = formatTime(new Date(now.getTime() + 3600000));
    }
    document.getElementById('modal-reprogram-manual').style.display = 'flex';
}

function applyReprogramming() {
    document.querySelectorAll('.inp-reprog').forEach(inp => {
        const idx = parseInt(inp.dataset.idx);
        const val = parseInt(inp.value);
        if (val > 0) cronograma[idx].segundosFinais = val * 60;
    });
    const newTimeStr = document.getElementById('new-end-time-input').value;
    if (newTimeStr) {
        dataFimGlobal = montarData(newTimeStr, new Date());
        if (dataFimGlobal < new Date()) dataFimGlobal.setDate(dataFimGlobal.getDate() + 1);
        document.getElementById('hora-fim').value = newTimeStr;
        document.getElementById('chk-ignorar-fim').checked = false; toggleIgnorarFim();
    }
    document.getElementById('modal-reprogram-manual').style.display = 'none';
    if (tempoRestante < 0) rodarFase(indexAtual + 1);
}

function resolverConflitoCalc(opt) { document.getElementById('modal-conflito-calc').style.display = 'none'; }

window.onload = function() {
    try {
        document.getElementById('global-cor-titulo').addEventListener('input', e => document.getElementById('global-titulo').style.color = e.target.value);
        const now = new Date();
        const stdStart = new Date(now); stdStart.setHours(9, 20, 0, 0);
        let sVal = "09:20", eVal = "10:15";
        if (now > stdStart) {
            const h = String(now.getHours()).padStart(2, '0'), m = String(now.getMinutes()).padStart(2, '0');
            sVal = `${h}:${m}`;
            const endD = new Date(now.getTime() + 55 * 60000);
            eVal = `${String(endD.getHours()).padStart(2,'0')}:${String(endD.getMinutes()).padStart(2,'0')}`;
        }
        document.getElementById('hora-inicio').value = sVal;
        document.getElementById('hora-fim').value = eVal;
        
        adicionarFase("Confraternização", 10, true, "#ffcc00", "#ffffff");
        adicionarFase("Missão", 15, true, "#288a2a", "#ffffff");
        adicionarFase("Palestra Principal", 30, false, "#007bff", "#ffffff");
        
        setInterval(() => { document.getElementById('relogio-real').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }, 1000);
    } catch (err) { alert("Erro de Inicialização JS: " + err.message); console.error(err); }
};