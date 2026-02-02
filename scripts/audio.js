// --- LÓGICA DE ÁUDIO ---
function getAudioContext() {
    if (!audioCtxGlobal) {
        audioCtxGlobal = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxGlobal.state === 'suspended') {
        audioCtxGlobal.resume();
    }
    return audioCtxGlobal;
}

function tocarBip(freq = 440, dur = 0.1, type = 'sine') {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + dur);
        osc.stop(ctx.currentTime + dur);
    } catch(e) { console.log("Erro de Áudio"); }
}

function playSmartAudio(audObj) {
    if (!mediaCache[audObj.fileName]) return;
    if (activeAudio) { activeAudio.audio.pause(); activeAudio = null; }
    
    const file = mediaCache[audObj.fileName];
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    
    audio.loop = audObj.loop;
    audio.play().catch(e => console.log("Erro play audio", e));
    
    activeAudio = {
        audio: audio,
        el: { customFlags: audObj } 
    };
}

function fadeAndStop(audRef, duration) {
    if(!audRef || !audRef.audio) return;
    const audio = audRef.audio;
    let vol = 1;
    const step = 0.05;
    const interval = 200; 
    const fade = setInterval(() => {
        if (vol > 0) {
            vol -= step;
            audio.volume = Math.max(0, vol);
        } else {
            clearInterval(fade);
            audio.pause();
            if(activeAudio === audRef) activeAudio = null;
        }
    }, interval);
}

function resolverAudioPause(action) {
    audioResumeAction = action;
    if (action === 'stop' && activeAudio) { activeAudio.audio.pause(); activeAudio = null; }
    if (action === 'restart' && activeAudio) { activeAudio.audio.currentTime = 0; activeAudio.audio.play(); }
    if (action === 'pause' && activeAudio) { activeAudio.audio.pause(); }
    document.getElementById('modal-audio-pause').style.display = 'none';
}