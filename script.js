const A = document.getElementById('app'), ROOT = document.documentElement;
const S = { m: 'std', theme: 'auto', snd: true, z: 1, i: 0, h: [], a: { where: [], alerts: [] }, pre: '', view: 'front', help: false };
const FACES = ['😀', '🙂', '🙂', '😐', '😐', '😕', '🙁', '😣', '😖', '😭', '😭'];
const BODY = {
  front: [
    ['Cabeça', 74, 8, 52, 52, 26],
    ['Peito', 62, 66, 76, 56, 12],
    ['Barriga', 66, 124, 68, 54, 12],
    ['Braço direito', 32, 70, 26, 110, 13],
    ['Braço esquerdo', 142, 70, 26, 110, 13],
    ['Perna direita', 66, 184, 30, 150, 14],
    ['Perna esquerda', 104, 184, 30, 150, 14]
  ],
  back: [
    ['Cabeça (atrás)', 74, 8, 52, 52, 26],
    ['Costas (em cima)', 62, 66, 76, 56, 12],
    ['Costas (embaixo)', 66, 124, 68, 54, 12],
    ['Braço esquerdo', 32, 70, 26, 110, 13],
    ['Braço direito', 142, 70, 26, 110, 13],
    ['Perna esquerda', 66, 184, 30, 150, 14],
    ['Perna direita', 104, 184, 30, 150, 14]
  ]
};
const ALERTS = [['😮‍💨', 'Falta de ar'], ['🫀', 'Dor no peito'], ['😵', 'Desmaio'], ['🩸', 'Sangramento']];

function say(t) {
  if (!S.snd || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = 'pt-BR';
  u.rate = .9;
  speechSynthesis.speak(u);
}

function go(i, pre) {
  S.h.push(S.i);
  S.i = i;
  S.pre = pre || '';
  draw(true);
}

function back() {
  if (S.h.length) {
    S.i = S.h.pop();
    S.pre = '';
    draw(true);
  }
}

function M(m) {
  S.m = m;
  ROOT.dataset.mode = m;
  S.z = m === 'hc' ? 1.2 : 1;
  ROOT.style.setProperty('--z', S.z);
  go(1, 'Vamos começar.');
}

function toggleTheme() {
  if (S.theme === 'auto') {
    S.theme = 'light';
  } else if (S.theme === 'light') {
    S.theme = 'dark';
  } else {
    S.theme = 'auto';
  }
  
  if (S.theme === 'auto') {
    delete ROOT.dataset.theme;
  } else {
    ROOT.dataset.theme = S.theme;
  }
  draw(false);
}

function Z() {
  S.z = S.z >= 1.4 ? 1 : +(S.z + .2).toFixed(1);
  ROOT.style.setProperty('--z', S.z);
  draw(false);
}

function SND() {
  S.snd = !S.snd;
  if (!S.snd && 'speechSynthesis' in window) speechSynthesis.cancel();
  draw(false);
}

function P(k, v, next, label) {
  S.a[k] = v;
  if (k === 'dor' && v === 'Não') S.a.where = [];
  go(next, 'Você respondeu: ' + label + '.');
}

function L(n) {
  S.a.lvl = n;
  go(5, 'Dor número ' + n + ' de 10.');
}

function T(l) {
  const w = S.a.where, i = w.indexOf(l);
  i < 0 ? w.push(l) : w.splice(i, 1);
  draw(false);
  say(i < 0 ? l + ' marcado.' : l + ' desmarcado.');
}

function ALL() {
  S.a.where = ['Corpo todo ou não sei'];
  draw(false);
  say('Corpo todo ou não sei.');
}

function AL(l) {
  const x = S.a.alerts, i = x.indexOf(l);
  i < 0 ? x.push(l) : x.splice(i, 1);
  draw(false);
  say(i < 0 ? l + ' marcado.' : l + ' desmarcado.');
}

function V(v) {
  S.view = v;
  draw(false);
  say(v === 'front' ? 'Vendo a frente do corpo.' : 'Vendo as costas.');
}

function H() {
  S.help = true;
  draw(false);
  say('Preciso de ajuda. Mostre esta tela a um profissional de saúde.');
}

function NEW() {
  S.a = { where: [], alerts: [] };
  S.h = [];
  S.i = 0;
  S.help = false;
  draw(true);
}

function FIX() {
  S.a = { where: [], alerts: [] };
  S.h = [0];
  S.i = 1;
  S.pre = 'Vamos corrigir.';
  draw(true);
}

function lines() {
  const a = S.a, r = [['Como está', a.bem || '—'], ['Sente dor', a.dor || '—']];
  if (a.dor === 'Sim') r.push(['Onde dói', a.where.join(', ') || '—'], ['Intensidade', (a.lvl ?? '—') + ' de 10'], ['Quando começou', a.t || '—']);
  r.push(['Sinais de alerta', a.alerts.length ? a.alerts.join(', ') : 'Nenhum informado']);
  return r;
}

function sumText() {
  return lines().map(([k, v]) => k + ': ' + v + '.').join(' ');
}

const o = (ic, t, c, p) => `<button class="opt" aria-pressed="${!!p}" onclick="${c}"><span class="ic" aria-hidden="true">${ic}</span><span>${t}</span></button>`;
const card = () => `<div class="card${S.a.alerts.length ? ' alert' : ''}">${lines().map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>`;
const svg = () => `<svg id="body" viewBox="0 0 200 340" role="group" aria-label="Mapa do corpo">${BODY[S.view].map(([l, x, y, w, h, r]) => `<rect class="reg${S.a.where.includes(l) ? ' on' : ''}" data-l="${l}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" tabindex="0" role="button" aria-pressed="${S.a.where.includes(l)}" aria-label="${l}"/>`).join('')}</svg>`;

function screen() {
  const a = S.a;
  switch (S.i) {
    case 0:
      return ['Olá! Escolha como quer usar.', `<div class="opts">${o('🙂', 'Normal', 'M(\'std\')')}${o('🎈', 'Criança', 'M(\'kid\')')}${o('🔍', 'Letra grande e alto contraste', 'M(\'hc\')')}</div>`];
    case 1:
      return ['Você está se sentindo bem?', `<div class="opts">${o('😊', 'Sim, estou bem', "P('bem','Estou bem',2,'Sim, estou bem')")}${o('😟', 'Não estou bem', "P('bem','Não estou bem',2,'Não estou bem')")}</div>`];
    case 2:
      return ['Você está sentindo dor?', `<div class="opts">${o('✅', 'Sim', "P('dor','Sim',3,'Sim')")}${o('❌', 'Não', "P('dor','Não',6,'Não')")}</div>`];
    case 3:
      return ['Onde está doendo? Toque no corpo.', `<div class="seg"><button class="sm" aria-pressed="${S.view === 'front'}" onclick="V('front')">Frente</button><button class="sm" aria-pressed="${S.view === 'back'}" onclick="V('back')">Costas</button></div>${svg()}<p class="chips" aria-live="polite">${a.where.join(' · ') || 'Nada marcado ainda'}</p><div class="opts">${o('🧍', 'Corpo todo ou não sei', 'ALL()', a.where[0] === 'Corpo todo ou não sei')}<button class="opt go" ${a.where.length ? '' : 'disabled'} onclick="go(4,'Local marcado: '+S.a.where.join(', ')+'.')">Continuar</button></div>`];
    case 4:
      return ['Qual a força da dor? 0 é sem dor. 10 é a pior dor.', `<div class="lvl">${FACES.map((f, n) => `<button class="opt" aria-pressed="${a.lvl === n}" style="border-bottom-color:hsl(${120 - n * 12},70\%,42\%)" onclick="L(${n})"><span class="ic" aria-hidden="true">${f}</span><b>${n}</b></button>`).join('')}</div><div class="leg"><span>0 = sem dor</span><span>10 = pior dor</span></div>`];
    case 5:
      return ['Quando a dor começou?', `<div class="opts">${o('🕐', 'Hoje', "P('t','Hoje',6,'Hoje')")}${o('📅', 'Há alguns dias', "P('t','Há alguns dias',6,'Há alguns dias')")}${o('🗓️', 'Há semanas ou mais', "P('t','Há semanas ou mais',6,'Há semanas ou mais')")}</div>`];
    case 6:
      return ['Você sente algum destes sinais?', `<div class="opts">${ALERTS.map(([ic, t]) => o(ic, t, `AL('${t}')`, a.alerts.includes(t))).join('')}<button class="opt go" onclick="go(7,a_()+'')">${a.alerts.length ? 'Continuar' : 'Nenhum desses — continuar'}</button></div>`];
    case 7:
      return ['Confira suas respostas.', `${card()}<div class="opts"><button class="opt go" onclick="go(8,'Enviado.')">Está certo — mostrar ao profissional</button>${o('↩️', 'Corrigir', 'FIX()')}</div>`];
    default:
      return ['Pronto! Mostre esta tela ao profissional de saúde.', `${card()}<div class="opts">${o('🔄', 'Nova triagem', 'NEW()')}</div>`];
  }
}

function a_() {
  return S.a.alerts.length ? 'Sinais marcados: ' + S.a.alerts.join(', ') + '.' : 'Nenhum sinal de alerta.';
}

function themeLabel() {
  if (S.theme === 'light') return '☀️ Claro';
  if (S.theme === 'dark') return '🌙 Escuro';
  return '🌓 Auto';
}

function draw(speak) {
  if (S.help) {
    A.innerHTML = `<div class="ov" role="alertdialog" aria-label="Pedido de ajuda"><div style="font-size:4em">🚨</div><h1>PRECISO DE AJUDA</h1><p>Mostre esta tela a um profissional de saúde ou levante a mão.</p><button class="sm" onclick="S.help=false;draw(false)">Voltar</button></div>`;
    return;
  }
  const [q, body] = screen();
  A.innerHTML = `<header>${S.i > 0 && S.h.length ? '<button class="sm" onclick="back()">← Voltar</button>' : ''}<span class="sp"></span><button class="sm" onclick="toggleTheme()">${themeLabel()}</button><button class="sm" aria-pressed="${S.snd}" onclick="SND()">${S.snd ? '🔊 Voz ligada' : '🔇 Voz desligada'}</button><button class="sm" onclick="Z()" aria-label="Aumentar letra">A+</button></header>
<main>${S.i > 0 && S.i < 8 ? `<p class="step">Passo ${S.i} de 7</p>` : ''}<h1>${q}</h1>
${body}<p><button class="sm" onclick="say(S.pre+' '+document.querySelector('h1').textContent)">🔊 Ouvir de novo</button></p></main>
<footer><button class="help" onclick="H()">🚨 Preciso de ajuda agora</button></footer>`;
  if (speak) {
    window.scrollTo(0, 0);
    say((S.pre ? S.pre + ' ' : '') + q + (S.i === 7 ? ' ' + sumText() : ''));
  }
}

A.addEventListener('click', e => {
  const r = e.target.closest('.reg');
  if (r) T(r.dataset.l);
});

A.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    const r = e.target.closest && e.target.closest('.reg');
    if (r) {
      e.preventDefault();
      T(r.dataset.l);
    }
  }
});

draw(false);