// --- VARIÁVEIS GLOBAIS ---
let mediaCache = {}; 
let cronograma = []; 
let indexAtual = 0; 
let tempoRestante = 0; 
let estado = "PARADO"; 
let intervaloTimer = null; 
let dataFimGlobal = null; 
let emIntervalo = false;
let activeAudio = null; 
let audioResumeAction = null;
let surplusMinutes = 0;
let deficitSeconds = 0; 
let pendingDataInicio = null;
let wakeLock = null; 
let audioCtxGlobal = null; 

// --- FUNÇÕES AUXILIARES (Compartilhadas) ---
function montarData(s, ref) {
    const [h, m] = s.split(':');
    const d = new Date(ref);
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d;
}

function formatTime(date) {
    return String(date.getHours()).padStart(2,'0') + ":" + String(date.getMinutes()).padStart(2,'0');
}

async function ativarWakeLock() {
    if ('wakeLock' in navigator) {
        try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) { console.warn(`${err.name}, ${err.message}`); }
    }
}

function liberarWakeLock() {
    if (wakeLock !== null) { wakeLock.release().then(() => { wakeLock = null; }); }
}

function obterDuracaoTotalMinutos() {
    let totalMin = 0;
    const rows = document.querySelectorAll('.fase-row');
    const globalInt = document.getElementById('chk-intervalos').checked;
    rows.forEach((r, idx) => {
        const m = parseFloat(r.querySelector('.inp-tempo').value) || 0;
        totalMin += m;
        if (globalInt && idx < rows.length - 1) {
            const intS = parseInt(r.querySelector('.inp-int-tempo').value) || 0;
            totalMin += (intS / 60);
        }
    });
    return totalMin;
}