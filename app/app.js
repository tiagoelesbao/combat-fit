/**
 * COMBAT PERFORMANCE - FASE 1 (PESO CORPORAL)
 * Metodologia: Periodização Conjugada Aplicada a Luta (Hariel Corrêa)
 */

// ==========================================
// 1. STATE & STORAGE
// ==========================================

const DEFAULT_STATE = {
  athleteWeight: 60.0,
  currentWeek: 1, // 1 a 9
  soundEnabled: true,
  history: [],  // array de sessões completas (ver estrutura abaixo)
  prs: {}       // { exerciseId: { weight, reps, volume, date } } — Personal Records
  /**
   * Estrutura de cada sessão em history:
   * {
   *   id: <timestamp>,
   *   date: <ISO string>,
   *   dayKey: 'seg'|'ter'|...,
   *   workoutTitle: string,
   *   totalVolume: number,   // kg totais levantados
   *   totalSets: number,
   *   week: number,
   *   athleteWeight: number, // peso do atleta na época
   *   exercises: [           // apenas para tipo gym
   *     {
   *       id: string,
   *       name: string,
   *       sets: [
   *         { setNumber, weight, reps, volume, done }
   *       ],
   *       totalVolume: number,
   *       completedSets: number
   *     }
   *   ],
   *   runningShots: [        // apenas para tipo running
   *     { roundNumber, timeSec, done }
   *   ]
   * }
   */
};

let appState = { ...DEFAULT_STATE };

function loadState() {
  try {
    const saved = localStorage.getItem('combat_app_state');
    if (saved) {
      appState = { ...DEFAULT_STATE, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Erro ao carregar estado local:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem('combat_app_state', JSON.stringify(appState));
  } catch (e) {
    console.error('Erro ao salvar estado:', e);
  }
}

// ==========================================
// 2. AUDIO SYNTHESIZER (ROBUST IOS & DESKTOP)
// ==========================================
let audioCtx = null;
let isAudioUnlocked = false;

// Audio buffer pré-gerado para garantir som mesmo se Web Audio estiver suspenso
let beepAudioPool = [];
const BEEP_WAV_BASE64 = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAQICAgIDAwMEBAQFBQYGBwgICAkJCgoLDAwNDQ4PDxAQEBEREhMUFRYWFxgZGhscHR4fICEiIyQlJicoKSoqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAAAAA==";

function initAudio() {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isAudioUnlocked = true;
  } catch (e) {
    console.warn('Erro ao inicializar AudioContext:', e);
  }
}

// Desbloqueia áudio no primeiro toque do usuário no iPhone
['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
  document.addEventListener(evt, () => {
    initAudio();
  }, { once: false, passive: true });
});

function playBeep(freq = 950, duration = 0.09, type = 'sine', volume = 0.35) {
  if (!appState.soundEnabled) return;
  
  initAudio();

  // Método 1: Web Audio Oscillator com Linear Ramp
  if (audioCtx) {
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.01);
      gain.gain.linearRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
      return;
    } catch (err) {
      console.warn('Web Audio osc falhou, tentando fallback:', err);
    }
  }

  // Método 2: Fallback por HTML5 Audio element
  try {
    const audio = new Audio(BEEP_WAV_BASE64);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch (e) {}
}

function playFinishBeep() {
  playBeep(650, 0.12, 'sine', 0.4);
  setTimeout(() => playBeep(950, 0.14, 'sine', 0.4), 130);
  setTimeout(() => playBeep(1300, 0.28, 'triangle', 0.45), 280);
  if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
}

// ==========================================
// 3. WORKOUT DATA & METHODOLOGY ENGINE
// ==========================================

function getWeekStrengthPercentage(weekNum) {
  // Semana 1 = 60%, Semana 2 = 65% ... Semana 9 = 100%
  const base = 60;
  const pct = base + (weekNum - 1) * 5;
  return Math.min(100, Math.max(60, pct));
}

function getWorkoutsData(weight, week) {
  const strengthPct = getWeekStrengthPercentage(week);
  const strengthLoad = Math.round((weight * (strengthPct / 100)) * 2) / 2; // Arredonda para 0.5kg
  const speedLoad30 = Math.round((weight * 0.3) * 2) / 2;
  const mixedLoad50 = Math.round((weight * 0.5) * 2) / 2;
  const mixedLoad70 = Math.round((weight * 0.7) * 2) / 2;

  return {
    seg: {
      title: "Treino A: Força & Potência Superior/Base",
      badge: "FORÇA MÁXIMA & EXPLOSÃO",
      desc: "Full body focado em empurrada horizontal e cadeia posterior com Levantamento Terra.",
      type: "gym",
      intensityText: `${strengthPct}% BW (${strengthLoad} kg)`,
      exercises: [
        {
          id: "terra_seg",
          name: "Levantamento Terra (Barra)",
          transfer: "Cadeia posterior, pegada e estabilidade de tronco na luta",
          pctText: `${strengthPct}% BW`,
          defaultWeight: strengthLoad,
          defaultReps: 7,
          restSec: 150,
          sets: 3
        },
        {
          id: "supino_forca",
          name: "Supino Reto (Força)",
          transfer: "Potência de empurrada horizontal e força isométrica",
          pctText: `${strengthPct}% BW`,
          defaultWeight: strengthLoad,
          defaultReps: 7,
          restSec: 120,
          sets: 3
        },
        {
          id: "supino_vel",
          name: "Supino Reto (Velocidade)",
          transfer: "Via alática (CP) rápida - 2 reps/s por 8 segundos contínuos",
          pctText: "30% BW",
          defaultWeight: speedLoad30,
          defaultReps: 16, // 16 reps em 8s (2 reps/s)
          restSec: 90,
          sets: 4,
          isSpeed: true
        },
        {
          id: "landmine_punch",
          name: "Landmine Punch (Soco na Barra Angular)",
          transfer: "Transferência direta para o direto/cruzado de Muay Thai",
          pctText: "10-15 kg",
          defaultWeight: 10,
          defaultReps: 6,
          restSec: 60,
          sets: 3
        },
        {
          id: "core_pallof",
          name: "Prancha Lateral / Pallof Press (Core)",
          transfer: "Anti-rotação e blindagem de costelas para receber golpes",
          pctText: "Isometric",
          defaultWeight: 0,
          defaultReps: 30, // segundos
          restSec: 45,
          sets: 3
        }
      ]
    },
    ter: {
      title: "Resistência & Velocidade: Sprints Curtos",
      badge: "VELOCIDADE PURA & ALÁTICA",
      desc: "Desenvolvimento de aceleração inicial e capacidade explosiva alática.",
      type: "running",
      subtype: "sprints_30m",
      roundsTotal: 8,
      distance: "30 metros",
      restSec: 90,
      notes: "Tiros curtos na máxima velocidade com peso corporal. Descanse 1 a 2 min entre tiros."
    },
    qua: {
      title: "Treino B: Força & Potência Inferior/Puxada",
      badge: "FORÇA MÁXIMA & SALTO",
      desc: "Full body focado em membros inferiores (Agachamento) e puxadas para clinch/gola.",
      type: "gym",
      intensityText: `${strengthPct}% BW (${strengthLoad} kg)`,
      exercises: [
        {
          id: "agacho_forca",
          name: "Agachamento Traseiro (Back Squat)",
          transfer: "Base de pernas, chutes pesados e defesa de quedas",
          pctText: `${strengthPct}% BW`,
          defaultWeight: strengthLoad,
          defaultReps: 7,
          restSec: 150,
          sets: 3
        },
        {
          id: "salto_barra",
          name: "Salto Vertical com Carga Leve",
          transfer: "Tripla extensão explosiva (tornozelo, joelho e quadril)",
          pctText: "30% BW",
          defaultWeight: speedLoad30,
          defaultReps: 6,
          restSec: 90,
          sets: 4,
          isSpeed: true
        },
        {
          id: "remada_curvada",
          name: "Remada Curvada com Barra",
          transfer: "Força de puxada para clinch de Muay Thai e gola de Jiu-Jitsu",
          pctText: `${strengthPct}% BW`,
          defaultWeight: strengthLoad,
          defaultReps: 7,
          restSec: 120,
          sets: 3
        },
        {
          id: "barra_fixa",
          name: "Barra Fixa ou Puxada Frontal",
          transfer: "Dorsais fortes para esgrima e controle de guarda",
          pctText: "BW ou 60%",
          defaultWeight: strengthLoad,
          defaultReps: 6,
          restSec: 90,
          sets: 3
        },
        {
          id: "farmers_walk",
          name: "Farmer's Walk (Caminhada do Fazendeiro)",
          transfer: "Pegada de aço e estabilidade de trapézio e ombros",
          pctText: "Halters 16-20kg",
          defaultWeight: 36, // total somando as 2 mãos
          defaultReps: 35, // passos
          restSec: 60,
          sets: 3
        }
      ]
    },
    qui: {
      title: "Resistência Específica: Intervalados 200m",
      badge: "RESISTÊNCIA ANAERÓBIA LÁTICA",
      desc: "Simulação da duração e demanda glicolítica de rounds intensos de luta.",
      type: "running",
      subtype: "intervals_200m",
      roundsTotal: 5,
      distance: "200 metros",
      restSec: 150,
      notes: "Tiros a 85-90% da velocidade máxima. Descanse 2 a 3 minutos entre repetições."
    },
    sex: {
      title: "Treino C: Potência Mista & Transferência",
      badge: "POTÊNCIA MISTA & VELOCIDADE",
      desc: "Combinação alternada de força e alta velocidade para máxima taxa de disparo motor.",
      type: "gym",
      intensityText: `Mista (30% a ${strengthPct}% BW)`,
      exercises: [
        {
          id: "terra_rapido",
          name: "Levantamento Terra Dinâmico",
          transfer: "Extensão rápida de quadril na transição de força",
          pctText: "50-60% BW",
          defaultWeight: mixedLoad50,
          defaultReps: 6,
          restSec: 120,
          sets: 3
        },
        {
          id: "supino_misto",
          name: "Supino Reto Potência Mista",
          transfer: "Séries 1-2 Força (60%) / Séries 3-4 Velocidade máxima (30%)",
          pctText: "60% & 30%",
          defaultWeight: strengthLoad,
          defaultReps: 7,
          restSec: 90,
          sets: 4
        },
        {
          id: "jump_lunges",
          name: "Afundo Alternado com Salto",
          transfer: "Potência unilateral de pernas para passadas e troca de base",
          pctText: "Peso Corporal",
          defaultWeight: 0,
          defaultReps: 10,
          restSec: 60,
          sets: 3
        },
        {
          id: "db_snatch",
          name: "Dumbbell Snatch (Arranco com Halter)",
          transfer: "Potência de corpo inteiro do chão para cima da cabeça",
          pctText: "Halter 10-12kg",
          defaultWeight: 12,
          defaultReps: 5,
          restSec: 60,
          sets: 3
        },
        {
          id: "core_hanging",
          name: "Elevação de Pernas na Barra Fixa",
          transfer: "Flexão de quadril e força do abdômen para joelhadas",
          pctText: "Peso Corporal",
          defaultWeight: 0,
          defaultReps: 10,
          restSec: 45,
          sets: 3
        }
      ]
    },
    sab: {
      title: "Sábado: Recuperação Ativa & Mobilidade",
      badge: "REGENERAÇÃO",
      desc: "Dia focado em soltura miofascial, mobilidade de quadril/ombros e caminhada leve.",
      type: "recovery",
      exercises: []
    },
    dom: {
      title: "Domingo: Descanso Total",
      badge: "RESET DO SNC",
      desc: "Recuperação profunda do sistema nervoso central e recarga de glicogênio para a próxima semana.",
      type: "recovery",
      exercises: []
    }
  };
}

// ==========================================
// 4. WORKOUT UI RENDERING & LOGIC
// ==========================================

let activeDayKey = "seg";
let activeWorkoutState = {}; // Guarda o estado dos inputs e checkboxes da sessão atual

function initActiveDayState(workoutData) {
  activeWorkoutState = {
    dayKey: activeDayKey,
    exercises: {},
    runningShots: []
  };

  if (workoutData.type === "gym") {
    workoutData.exercises.forEach(ex => {
      activeWorkoutState.exercises[ex.id] = [];
      for (let s = 1; s <= ex.sets; s++) {
        activeWorkoutState.exercises[ex.id].push({
          setNumber: s,
          weight: ex.defaultWeight,
          reps: ex.defaultReps,
          done: false
        });
      }
    });
  } else if (workoutData.type === "running") {
    for (let i = 1; i <= workoutData.roundsTotal; i++) {
      activeWorkoutState.runningShots.push({
        roundNumber: i,
        done: false,
        timeSec: ""
      });
    }
  }
}

function renderActiveWorkout() {
  const allWorkouts = getWorkoutsData(appState.athleteWeight, appState.currentWeek);
  const data = allWorkouts[activeDayKey];

  // Update header text
  document.getElementById("workoutTitle").innerText = data.title;
  document.getElementById("workoutFocusBadge").innerText = data.badge;
  document.getElementById("workoutDesc").innerText = data.desc;
  document.getElementById("workoutIntensity").innerText = data.intensityText || "Peso Corporal";

  const exContainer = document.getElementById("exercisesContainer");
  const runningModule = document.getElementById("runningModule");
  const finishBtn = document.getElementById("btnFinishWorkout");

  // Limpa containers
  exContainer.innerHTML = "";
  runningModule.innerHTML = "";

  if (data.type === "gym") {
    exContainer.classList.remove("hidden");
    runningModule.classList.add("hidden");
    finishBtn.classList.remove("hidden");

    // Render exercise cards
    data.exercises.forEach(ex => {
      const card = document.createElement("div");
      card.className = "exercise-card";
      card.id = `card_${ex.id}`;

      let setsHtml = `
        <table class="sets-table">
          <thead>
            <tr>
              <th style="width: 38px;">Série</th>
              <th>Carga (kg)</th>
              <th>${ex.isSpeed ? 'Seg / Reps' : 'Reps'}</th>
              <th>Volume</th>
              <th style="width: 44px;">Feito</th>
            </tr>
          </thead>
          <tbody>
      `;

      const currentSets = activeWorkoutState.exercises[ex.id] || [];
      currentSets.forEach((setObj, idx) => {
        const vol = (setObj.weight * setObj.reps).toFixed(0);
        setsHtml += `
          <tr class="set-row" data-ex-id="${ex.id}" data-set-idx="${idx}">
            <td class="set-number">#${setObj.setNumber}</td>
            <td>
              <input type="number" step="0.5" class="input-set input-weight" value="${setObj.weight}">
            </td>
            <td>
              <input type="number" class="input-set input-reps" value="${setObj.reps}">
            </td>
            <td class="set-volume-calc" id="vol_${ex.id}_${idx}">${vol > 0 ? vol + ' kg' : '-'}</td>
            <td>
              <button class="btn-check-set ${setObj.done ? 'checked' : ''}" data-rest="${ex.restSec}">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            </td>
          </tr>
        `;
      });

      setsHtml += `</tbody></table>`;

      card.innerHTML = `
        <div class="exercise-header">
          <div>
            <h3 class="exercise-name">${ex.name}</h3>
            <p class="exercise-transfer">${ex.transfer}</p>
          </div>
          <div class="exercise-load-badge">
            <span class="load-pct">${ex.pctText}</span>
            <div class="load-target">${ex.defaultWeight > 0 ? ex.defaultWeight + ' kg' : 'BW'}</div>
          </div>
        </div>
        ${setsHtml}
      `;

      exContainer.appendChild(card);
    });

  } else if (data.type === "running") {
    exContainer.classList.add("hidden");
    runningModule.classList.remove("hidden");
    finishBtn.classList.remove("hidden");

    let listHtml = `
      <div class="running-header">
        <span class="running-badge">${data.distance} • ${data.roundsTotal} TIROS</span>
        <p class="text-sm">${data.notes}</p>
      </div>
      <div class="sprint-list">
    `;

    activeWorkoutState.runningShots.forEach((shot, idx) => {
      listHtml += `
        <div class="sprint-item ${shot.done ? 'done' : ''}" data-shot-idx="${idx}">
          <div>
            <span class="day-abbr">Tiro #${shot.roundNumber}</span>
            <span class="text-sm" style="display:block; color:var(--text-muted);">${data.distance} na máxima explosão</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="text" placeholder="Tempo (s)" class="input-set input-sprint-time" value="${shot.timeSec || ''}" style="width:70px;">
            <button class="btn-check-set ${shot.done ? 'checked' : ''}" data-rest="${data.restSec}">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      `;
    });

    listHtml += `</div>`;
    runningModule.innerHTML = listHtml;

  } else {
    // Recovery days
    exContainer.classList.add("hidden");
    runningModule.classList.remove("hidden");
    finishBtn.classList.add("hidden");

    runningModule.innerHTML = `
      <div style="text-align:center; padding: 30px 10px;">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent-gold)" stroke-width="1.5" style="margin-bottom:12px;">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke-linecap="round"/>
        </svg>
        <h3 style="font-family:var(--font-display); font-size:20px; font-weight:800;">${data.title}</h3>
        <p style="font-size:13px; color:var(--text-secondary); margin-top:8px; line-height:1.5;">${data.desc}</p>
      </div>
    `;
  }

  updateLiveStats();
}

function updateLiveStats() {
  let totalVol = 0;
  let totalSets = 0;
  let completedSets = 0;

  if (activeWorkoutState.exercises) {
    Object.keys(activeWorkoutState.exercises).forEach(exId => {
      const sets = activeWorkoutState.exercises[exId];
      let allExDone = true;
      sets.forEach(s => {
        totalSets++;
        if (s.done) {
          completedSets++;
          totalVol += (s.weight * s.reps);
        } else {
          allExDone = false;
        }
      });

      const card = document.getElementById(`card_${exId}`);
      if (card) {
        if (allExDone && sets.length > 0) card.classList.add("completed");
        else card.classList.remove("completed");
      }
    });
  }

  if (activeWorkoutState.runningShots && activeWorkoutState.runningShots.length > 0) {
    totalSets = activeWorkoutState.runningShots.length;
    completedSets = activeWorkoutState.runningShots.filter(s => s.done).length;
  }

  document.getElementById("liveVolumeCounter").innerText = Math.round(totalVol).toLocaleString('pt-BR');
  document.getElementById("completedSetsCounter").innerText = `${completedSets} / ${totalSets}`;
}

// ==========================================
// 5. FLOATING REST TIMER
// ==========================================

let restTimerInterval = null;
let restTimeRemaining = 0;

function startRestTimer(seconds) {
  clearInterval(restTimerInterval);
  restTimeRemaining = seconds;
  const widget = document.getElementById("floatingTimerWidget");
  widget.classList.remove("hidden");
  updateTimerDisplay();

  playBeep(440, 0.08); // Bip inicial

  restTimerInterval = setInterval(() => {
    restTimeRemaining--;
    updateTimerDisplay();

    if (restTimeRemaining <= 3 && restTimeRemaining > 0) {
      playBeep(520, 0.08); // Contagem 3, 2, 1
    }

    if (restTimeRemaining <= 0) {
      clearInterval(restTimerInterval);
      playFinishBeep();
      widget.classList.add("hidden");
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(restTimeRemaining / 60);
  const secs = restTimeRemaining % 60;
  document.getElementById("floatingTimerSeconds").innerText = 
    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ==========================================
// 6. CADENCE & METRONOME (8s / 15s ALATIC SPEED)
// ==========================================

let metronomeInterval = null;
let cadenceTimerInterval = null;

function startCadence(repsPerSec, pulseElemId, timerElemId) {
  stopCadence();
  initAudio();

  const pulseEl = document.getElementById(pulseElemId);
  const timerEl = document.getElementById(timerElemId);
  const stopBtn = document.getElementById("btnStopMetronome");
  stopBtn.classList.remove("hidden");

  let timeLeft = 8.0;
  timerEl.innerText = timeLeft.toFixed(1) + "s";

  const beatIntervalMs = 1000 / repsPerSec;

  // Flash beat e bip nítido
  metronomeInterval = setInterval(() => {
    pulseEl.classList.add("pulse-flash");
    playBeep(1000, 0.06, 'triangle', 0.45);
    setTimeout(() => pulseEl.classList.remove("pulse-flash"), 80);
  }, beatIntervalMs);

  // Countdown timer
  cadenceTimerInterval = setInterval(() => {
    timeLeft -= 0.1;
    if (timeLeft <= 0) {
      timeLeft = 0;
      stopCadence();
      playFinishBeep();
    }
    timerEl.innerText = timeLeft.toFixed(1) + "s";
  }, 100);
}

function stopCadence() {
  clearInterval(metronomeInterval);
  clearInterval(cadenceTimerInterval);
  document.getElementById("btnStopMetronome").classList.add("hidden");
  const pSpeed = document.getElementById("pulseSpeed");
  const pForce = document.getElementById("pulseForce");
  if (pSpeed) pSpeed.classList.remove("pulse-flash");
  if (pForce) pForce.classList.remove("pulse-flash");
}

// ==========================================
// 7. REPORTS & VOLUME ANALYTICS
// ==========================================

/** Atualiza o objeto de Personal Records baseado em uma sessão salva */
function updatePRs(session) {
  if (!session.exercises || !Array.isArray(session.exercises)) return;
  if (!appState.prs) appState.prs = {};

  session.exercises.forEach(ex => {
    if (!ex.sets || !Array.isArray(ex.sets)) return;
    ex.sets.forEach(s => {
      if (!s.done || !s.weight || !s.reps) return;
      const vol = s.weight * s.reps;
      const current = appState.prs[ex.id];
      // PR de Volume por série (peso × reps)
      if (!current || vol > current.volume) {
        appState.prs[ex.id] = {
          exerciseName: ex.name,
          weight: s.weight,
          reps: s.reps,
          volume: vol,
          date: session.date
        };
      }
    });
  });
}

/** Calcula volume acumulado por exercício nos últimos N treinos */
function getExerciseVolumeBreakdown(history) {
  const breakdown = {};
  history.forEach(session => {
    if (!session.exercises) return;
    session.exercises.forEach(ex => {
      if (!breakdown[ex.id]) {
        breakdown[ex.id] = { name: ex.name, totalVolume: 0, sessions: 0, lastDate: session.date };
      }
      breakdown[ex.id].totalVolume += (ex.totalVolume || 0);
      breakdown[ex.id].sessions++;
      if (new Date(session.date) > new Date(breakdown[ex.id].lastDate)) {
        breakdown[ex.id].lastDate = session.date;
      }
    });
  });
  return breakdown;
}

function renderReports() {
  const history = appState.history || [];
  
  // Totais
  let weeklyVol = 0;
  let totalSets = 0;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  history.forEach(item => {
    totalSets += (item.totalSets || 0);
    const itemDate = new Date(item.date);
    if (itemDate >= oneWeekAgo) {
      weeklyVol += (item.totalVolume || 0);
    }
  });

  const avgVol = history.length > 0 ? (history.reduce((a, b) => a + (b.totalVolume || 0), 0) / history.length) : 0;

  document.getElementById("kpiWeeklyVolume").innerText = `${Math.round(weeklyVol).toLocaleString('pt-BR')} kg`;
  document.getElementById("kpiCompletedWorkouts").innerText = history.length;
  document.getElementById("kpiTotalSets").innerText = totalSets;
  document.getElementById("kpiAvgVolume").innerText = `${Math.round(avgVol).toLocaleString('pt-BR')} kg`;

  // Render Chart
  renderVolumeChart(history);

  // Render PRs
  renderPRSection();

  // Render Exercise Breakdown
  renderExerciseBreakdown(history);

  // Render History List
  renderHistoryList(history);
}

function renderPRSection() {
  const prEl = document.getElementById("prSection");
  if (!prEl) return;
  const prs = appState.prs || {};
  const keys = Object.keys(prs);

  if (keys.length === 0) {
    prEl.innerHTML = `<p class="text-sm" style="text-align:center; padding:8px; color:var(--text-muted);">Nenhum PR registrado ainda. Complete séries para acumular recordes.</p>`;
    return;
  }

  prEl.innerHTML = keys.map(id => {
    const pr = prs[id];
    const d = new Date(pr.date).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' });
    return `
      <div class="pr-item">
        <div class="pr-exercise">${pr.exerciseName}</div>
        <div class="pr-details">
          <span class="pr-badge">${pr.weight} kg × ${pr.reps} reps</span>
          <span class="pr-vol">${Math.round(pr.volume)} kg vol.</span>
          <span class="pr-date">${d}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderExerciseBreakdown(history) {
  const breakdownEl = document.getElementById("exerciseBreakdownList");
  if (!breakdownEl) return;
  const breakdown = getExerciseVolumeBreakdown(history);
  const entries = Object.values(breakdown).sort((a, b) => b.totalVolume - a.totalVolume);

  if (entries.length === 0) {
    breakdownEl.innerHTML = `<p class="text-sm" style="color:var(--text-muted); padding:8px 0;">Nenhum dado de exercícios ainda.</p>`;
    return;
  }

  const maxVol = entries[0].totalVolume || 1;

  breakdownEl.innerHTML = entries.map(ex => {
    const barPct = Math.max(5, Math.round((ex.totalVolume / maxVol) * 100));
    return `
      <div class="ex-breakdown-item">
        <div class="ex-breakdown-header">
          <span class="ex-breakdown-name">${ex.name}</span>
          <span class="ex-breakdown-vol">${Math.round(ex.totalVolume).toLocaleString('pt-BR')} kg</span>
        </div>
        <div class="ex-breakdown-bar-bg">
          <div class="ex-breakdown-bar" style="width: ${barPct}%;"></div>
        </div>
        <span class="ex-breakdown-sessions">${ex.sessions} sessão(ões)</span>
      </div>
    `;
  }).join('');
}

function renderHistoryList(history) {
  const listEl = document.getElementById("historyList");
  if (history.length === 0) {
    listEl.innerHTML = `<p class="text-sm" style="text-align:center; padding:16px;">Nenhum treino salvo ainda. Conclua uma sessão para visualizar os relatórios.</p>`;
    return;
  }

  listEl.innerHTML = history.slice().reverse().map(h => {
    const dateStr = new Date(h.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
    const hasExercises = h.exercises && h.exercises.length > 0;
    const hasRunning = h.runningShots && h.runningShots.length > 0;

    let detailsHtml = '';
    if (hasExercises) {
      detailsHtml = h.exercises.map(ex => {
        const setRows = ex.sets.filter(s => s.done).map(s =>
          `<div class="session-set-row"><span>#${s.setNumber}</span><span>${s.weight} kg × ${s.reps} reps</span><span class="session-set-vol">${Math.round(s.volume)} kg</span></div>`
        ).join('');
        return `
          <div class="session-ex-block">
            <div class="session-ex-name">${ex.name} <span class="session-ex-vol-total">${Math.round(ex.totalVolume)} kg total</span></div>
            ${setRows}
          </div>`;
      }).join('');
    } else if (hasRunning) {
      const completedShots = h.runningShots.filter(s => s.done);
      detailsHtml = completedShots.map(s =>
        `<div class="session-set-row"><span>Tiro #${s.roundNumber}</span><span>${s.timeSec ? s.timeSec + 's' : '—'}</span></div>`
      ).join('');
    }

    return `
      <div class="history-item" data-session-id="${h.id}">
        <div class="history-item-header">
          <div>
            <div class="history-title">${h.workoutTitle}</div>
            <div class="history-date">${dateStr} • Sem. ${h.week || '?'}</div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            <div class="history-vol">${Math.round(h.totalVolume).toLocaleString('pt-BR')} kg</div>
            ${detailsHtml ? `<button class="btn-expand-session" onclick="toggleSessionDetail('${h.id}')">▼ Detalhes</button>` : ''}
          </div>
        </div>
        ${detailsHtml ? `<div class="session-detail hidden" id="detail_${h.id}">${detailsHtml}</div>` : ''}
      </div>
    `;
  }).join('');
}

function toggleSessionDetail(sessionId) {
  const el = document.getElementById(`detail_${sessionId}`);
  const btn = el ? el.closest('.history-item').querySelector('.btn-expand-session') : null;
  if (!el) return;
  const isHidden = el.classList.contains('hidden');
  el.classList.toggle('hidden', !isHidden);
  if (btn) btn.textContent = isHidden ? '▲ Fechar' : '▼ Detalhes';
}

function renderVolumeChart(history) {
  const chartEl = document.getElementById("chartContainer");
  const recent = history.slice(-7); // últimos 7 treinos

  if (recent.length === 0) {
    chartEl.innerHTML = `<p class="text-sm" style="margin:auto; color:var(--text-muted);">Realize treinos para ver as barras de tonelagem</p>`;
    return;
  }

  const maxVol = Math.max(...recent.map(r => r.totalVolume || 1), 100);

  chartEl.innerHTML = recent.map(r => {
    const heightPct = Math.max(8, Math.round(((r.totalVolume || 0) / maxVol) * 100));
    const d = new Date(r.date);
    const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'narrow' }).toUpperCase();
    return `
      <div class="chart-bar-col">
        <span class="chart-bar-val">${Math.round(r.totalVolume)}</span>
        <div class="chart-bar" style="height: ${heightPct}%;"></div>
        <span class="chart-bar-label">${dayLabel}</span>
      </div>
    `;
  }).join('');
}

// ==========================================
// 8. SETTINGS & APP SYNC
// ==========================================

function updateHeaderBadges() {
  document.getElementById("headerWeightDisplay").innerText = `${Number(appState.athleteWeight).toFixed(1)} kg`;
  const pct = getWeekStrengthPercentage(appState.currentWeek);
  document.getElementById("headerWeekDisplay").innerText = `Semana ${appState.currentWeek} (${pct}% BW)`;
}

function renderSettingsPreview() {
  const w = Number(appState.athleteWeight);
  const tableEl = document.getElementById("settingsLoadsTable");
  const pcts = [30, 50, 60, 70, 90, 100];

  tableEl.innerHTML = pcts.map(p => {
    const kg = (w * (p / 100)).toFixed(1);
    return `
      <div class="load-box">
        <div class="load-box-pct">${p}% BW</div>
        <div class="load-box-kg">${kg} kg</div>
      </div>
    `;
  }).join('');
}

function showToast(msg) {
  const t = document.getElementById("toastNotification");
  t.innerText = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2800);
}

// ==========================================
// 9. EVENT LISTENERS & SETUP
// ==========================================

function setupEventListeners() {
  // Navigation tabs
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-view").forEach(v => v.classList.remove("active"));

      tab.classList.add("active");
      const targetId = tab.dataset.target;
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.classList.add("active");

      if (targetId === "viewReports") renderReports();
    });
  });

  // Day selector strip
  document.querySelectorAll(".day-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".day-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeDayKey = chip.dataset.day;

      const allWorkouts = getWorkoutsData(appState.athleteWeight, appState.currentWeek);
      initActiveDayState(allWorkouts[activeDayKey]);
      renderActiveWorkout();
    });
  });

  // Table events (delegation)
  document.getElementById("exercisesContainer").addEventListener("change", (e) => {
    if (e.target.classList.contains("input-weight") || e.target.classList.contains("input-reps")) {
      const row = e.target.closest(".set-row");
      const exId = row.dataset.exId;
      const setIdx = parseInt(row.dataset.setIdx);

      const wInput = row.querySelector(".input-weight");
      const rInput = row.querySelector(".input-reps");
      const weight = parseFloat(wInput.value) || 0;
      const reps = parseInt(rInput.value) || 0;

      activeWorkoutState.exercises[exId][setIdx].weight = weight;
      activeWorkoutState.exercises[exId][setIdx].reps = reps;

      const volEl = document.getElementById(`vol_${exId}_${setIdx}`);
      const vol = weight * reps;
      volEl.innerText = vol > 0 ? `${Math.round(vol)} kg` : '-';

      updateLiveStats();
    }
  });

  // Click on Check Set Button
  document.getElementById("exercisesContainer").addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-check-set");
    if (!btn) return;
    initAudio();

    const row = btn.closest(".set-row");
    const exId = row.dataset.exId;
    const setIdx = parseInt(row.dataset.setIdx);
    const restSec = parseInt(btn.dataset.rest) || 90;

    const currentStatus = activeWorkoutState.exercises[exId][setIdx].done;
    activeWorkoutState.exercises[exId][setIdx].done = !currentStatus;

    if (!currentStatus) {
      btn.classList.add("checked");
      startRestTimer(restSec);
    } else {
      btn.classList.remove("checked");
    }

    updateLiveStats();
  });

  // Running shots events
  document.getElementById("runningModule").addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-check-set");
    if (!btn) return;
    initAudio();

    const item = btn.closest(".sprint-item");
    const shotIdx = parseInt(item.dataset.shotIdx);
    const restSec = parseInt(btn.dataset.rest) || 90;

    const currentStatus = activeWorkoutState.runningShots[shotIdx].done;
    activeWorkoutState.runningShots[shotIdx].done = !currentStatus;

    if (!currentStatus) {
      btn.classList.add("checked");
      item.classList.add("done");
      startRestTimer(restSec);
    } else {
      btn.classList.remove("checked");
      item.classList.remove("done");
    }

    updateLiveStats();
  });

  // Finish Workout
  document.getElementById("btnFinishWorkout").addEventListener("click", () => {
    const allWorkouts = getWorkoutsData(appState.athleteWeight, appState.currentWeek);
    const wData = allWorkouts[activeDayKey];

    let totalVol = 0;
    let totalSetsDone = 0;

    if (wData.type === "gym") {
      Object.keys(activeWorkoutState.exercises).forEach(exId => {
        activeWorkoutState.exercises[exId].forEach(s => {
          if (s.done) {
            totalSetsDone++;
            totalVol += (s.weight * s.reps);
          }
        });
      });
    } else if (wData.type === "running") {
      totalSetsDone = activeWorkoutState.runningShots.filter(s => s.done).length;
    }

    if (totalSetsDone === 0) {
      alert("Conclua ao menos uma série antes de finalizar o treino!");
      return;
    }

    // Monta detalhe completo de exercícios para persistência
    let exercisesDetail = [];
    let runningDetail = [];

    if (wData.type === "gym") {
      wData.exercises.forEach(ex => {
        const sets = activeWorkoutState.exercises[ex.id] || [];
        const doneSets = sets.filter(s => s.done);
        const exTotalVol = doneSets.reduce((acc, s) => acc + (s.weight * s.reps), 0);
        if (doneSets.length > 0) {
          exercisesDetail.push({
            id: ex.id,
            name: ex.name,
            totalVolume: Math.round(exTotalVol),
            completedSets: doneSets.length,
            sets: sets.map(s => ({
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
              volume: Math.round(s.weight * s.reps),
              done: s.done
            }))
          });
        }
      });
    } else if (wData.type === "running") {
      runningDetail = activeWorkoutState.runningShots.map(s => ({
        roundNumber: s.roundNumber,
        timeSec: s.timeSec,
        done: s.done
      }));
    }

    const sessionRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      dayKey: activeDayKey,
      workoutTitle: wData.title,
      totalVolume: Math.round(totalVol),
      totalSets: totalSetsDone,
      week: appState.currentWeek,
      athleteWeight: appState.athleteWeight,
      exercises: exercisesDetail,
      runningShots: runningDetail
    };

    appState.history.push(sessionRecord);
    updatePRs(sessionRecord); // Atualiza Personal Records
    saveState();
    playFinishBeep();
    showToast(`Treino Salvo! Volume: ${Math.round(totalVol)} kg • ${totalSetsDone} séries`);

    // Reset current workout checks
    initActiveDayState(wData);
    renderActiveWorkout();
  });

  // Rest Timer Controls
  document.getElementById("btnTimerMinus").addEventListener("click", () => {
    restTimeRemaining = Math.max(5, restTimeRemaining - 30);
    updateTimerDisplay();
  });
  document.getElementById("btnTimerPlus").addEventListener("click", () => {
    restTimeRemaining += 30;
    updateTimerDisplay();
  });
  document.getElementById("btnTimerSkip").addEventListener("click", () => {
    clearInterval(restTimerInterval);
    document.getElementById("floatingTimerWidget").classList.add("hidden");
  });

  // Cadence metronome buttons
  document.getElementById("btnStartSpeedMetronome").addEventListener("click", () => {
    startCadence(2, "pulseSpeed", "cadenceTimeSpeed");
  });
  document.getElementById("btnStartForceMetronome").addEventListener("click", () => {
    startCadence(1, "pulseForce", "cadenceTimeForce");
  });
  document.getElementById("btnStopMetronome").addEventListener("click", () => {
    stopCadence();
  });

  // Settings Save
  document.getElementById("btnSaveSettings").addEventListener("click", () => {
    const w = parseFloat(document.getElementById("inputAthleteWeight").value);
    const wk = parseInt(document.getElementById("selectCurrentWeek").value);
    const snd = document.getElementById("toggleAudioBeep").checked;

    if (w > 0) appState.athleteWeight = w;
    if (wk >= 1 && wk <= 9) appState.currentWeek = wk;
    appState.soundEnabled = snd;

    saveState();
    updateHeaderBadges();
    renderSettingsPreview();

    const allWorkouts = getWorkoutsData(appState.athleteWeight, appState.currentWeek);
    initActiveDayState(allWorkouts[activeDayKey]);
    renderActiveWorkout();

    showToast("Configurações salvas e cargas recalculadas!");
  });

  // Quick settings modal
  const qModal = document.getElementById("quickModal");
  document.getElementById("btnQuickSettings").addEventListener("click", () => {
    document.getElementById("quickWeightInput").value = appState.athleteWeight;
    document.getElementById("quickWeekSelect").value = appState.currentWeek;
    qModal.classList.remove("hidden");
  });
  document.getElementById("btnQuickClose").addEventListener("click", () => {
    qModal.classList.add("hidden");
  });
  document.getElementById("btnQuickConfirm").addEventListener("click", () => {
    const w = parseFloat(document.getElementById("quickWeightInput").value);
    const wk = parseInt(document.getElementById("quickWeekSelect").value);
    if (w > 0) appState.athleteWeight = w;
    if (wk >= 1 && wk <= 9) appState.currentWeek = wk;
    saveState();
    updateHeaderBadges();
    renderSettingsPreview();
    const allWorkouts = getWorkoutsData(appState.athleteWeight, appState.currentWeek);
    initActiveDayState(allWorkouts[activeDayKey]);
    renderActiveWorkout();
    qModal.classList.add("hidden");
    showToast("Ciclo atualizado!");
  });

  // Export JSON Backup
  document.getElementById("btnExportData").addEventListener("click", () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: 2,
      state: appState
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `combatfit_backup_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
    showToast(`Backup exportado: ${appState.history.length} treinos`);
  });

  // Import JSON Backup
  document.getElementById("btnImportData").addEventListener("click", () => {
    document.getElementById("fileImportInput").click();
  });

  document.getElementById("fileImportInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        // Suporta formato v2 (com wrapper) e v1 (state direto)
        const importedState = parsed.state || parsed;
        if (!importedState.history || !Array.isArray(importedState.history)) {
          throw new Error('Formato de backup inválido.');
        }
        const mergedHistory = [...appState.history];
        let added = 0;
        importedState.history.forEach(session => {
          const exists = mergedHistory.some(h => h.id === session.id);
          if (!exists) {
            mergedHistory.push(session);
            added++;
          }
        });
        mergedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        appState.history = mergedHistory;
        // Mescla PRs importados
        if (importedState.prs) {
          if (!appState.prs) appState.prs = {};
          Object.keys(importedState.prs).forEach(exId => {
            const imported = importedState.prs[exId];
            const current = appState.prs[exId];
            if (!current || imported.volume > current.volume) {
              appState.prs[exId] = imported;
            }
          });
        }
        // Recalcula PRs de sessões que não tinham dados completos
        appState.history.forEach(session => updatePRs(session));
        saveState();
        showToast(`Importado: +${added} treino(s) mesclados!`);
        renderReports();
      } catch (err) {
        alert('Erro ao importar backup: ' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // Clear data
  document.getElementById("btnClearData").addEventListener("click", () => {
    if (confirm("Deseja realmente zerar todo o histórico de treinos e PRs?")) {
      appState.history = [];
      appState.prs = {};
      saveState();
      renderReports();
      showToast("Histórico e PRs zerados.");
    }
  });
}

// ==========================================
// 10. INITIALIZATION
// ==========================================

window.addEventListener("DOMContentLoaded", () => {
  loadState();

  // Preenche inputs de configurações
  document.getElementById("inputAthleteWeight").value = appState.athleteWeight;
  document.getElementById("selectCurrentWeek").value = appState.currentWeek;
  document.getElementById("toggleAudioBeep").checked = appState.soundEnabled;

  updateHeaderBadges();
  renderSettingsPreview();

  // Dia inicial baseado no dia da semana atual
  const dayIndex = new Date().getDay();
  const dayMap = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  activeDayKey = dayMap[dayIndex] || "seg";

  // Ativa o chip correspondente
  document.querySelectorAll(".day-chip").forEach(c => {
    if (c.dataset.day === activeDayKey) c.classList.add("active");
    else c.classList.remove("active");
  });

  const allWorkouts = getWorkoutsData(appState.athleteWeight, appState.currentWeek);
  initActiveDayState(allWorkouts[activeDayKey]);
  renderActiveWorkout();
  setupEventListeners();

  // Registra Service Worker se suportado
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW registration error:', err);
    });
  }
});
