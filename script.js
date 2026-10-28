/* =====================================================================
   TRIAGEM ACESSÍVEL – script.js
   Como o app funciona, em resumo:
   1. Tudo que o paciente respondeu fica guardado no objeto `estado`.
   2. Cada tela é uma função (telaXxx) que devolve a pergunta + o HTML dela.
   3. `desenhar()` pega a tela do passo atual e escreve na página.
   4. Cada botão chama uma função (onclick) que muda o `estado`
      e chama `desenhar()` de novo.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. ELEMENTOS DA PÁGINA E ESTADO
   --------------------------------------------------------------------- */
const elementoApp = document.getElementById('app'); // <div id="app"> do index.html
const raiz = document.documentElement;              // a tag <html> (usada para temas)

const CORPO_TODO = 'Corpo todo ou não sei';

// Cria o "caderno" de respostas vazio (usado no início e em "Nova triagem").
function respostasVazias() {
  return {
    bem: '',          // "Estou bem" / "Não estou bem"
    dor: '',          // "Sim" / "Não"
    local: [],        // partes do corpo marcadas
    intensidade: undefined, // número de 0 a 10
    quando: '',       // "Hoje", "Há alguns dias"...
    alertas: []       // sinais de alerta marcados
  };
}

// O estado guarda TUDO o que muda durante o uso do app.
const estado = {
  modo: 'std',          // 'std' (normal), 'kid' (criança) ou 'hc' (alto contraste)
  tema: 'auto',         // 'auto', 'light' ou 'dark'
  vozLigada: true,      // leitura em voz alta ligada?
  zoom: 1,              // tamanho da letra (1 = normal, 1.2, 1.4...)
  passo: 0,             // número da tela atual (0 a 8)
  historico: [],        // passos já visitados (serve para o botão "Voltar")
  respostas: respostasVazias(),
  frasePrefixo: '',     // frase falada antes da pergunta ("Você respondeu: Sim.")
  lado: 'front',        // boneco: 'front' (frente) ou 'back' (costas)
  ajudaAberta: false    // tela vermelha "Preciso de ajuda" aberta?
};


/* ---------------------------------------------------------------------
   2. DADOS FIXOS
   --------------------------------------------------------------------- */

// Carinhas da escala de dor (posição 0 = sem dor ... posição 10 = pior dor).
const CARINHAS = ['😀', '🙂', '🙂', '😐', '😐', '😕', '🙁', '😣', '😖', '😭', '😭'];

// Sinais de alerta: [ícone, texto].
const ALERTAS = [
  ['😮‍💨', 'Falta de ar'],
  ['🫀', 'Dor no peito'],
  ['😵', 'Desmaio'],
  ['🩸', 'Sangramento']
];

// Partes do corpo clicáveis. Cada item é [nome, tipo da forma SVG, medidas].
// "front" = visto de frente, "back" = visto de costas.
const CORPO = {
  front: [
    ["Cabeça", "ellipse", "cx=\"100\" cy=\"34\" rx=\"25\" ry=\"29\""],
    ["Pescoço", "rect", "x=\"89\" y=\"60\" width=\"22\" height=\"20\" rx=\"8\""],
    ["Peito", "rect", "x=\"62\" y=\"78\" width=\"76\" height=\"60\" rx=\"22\""],
    ["Barriga", "rect", "x=\"66\" y=\"140\" width=\"68\" height=\"56\" rx=\"20\""],
    ["Braço direito", "rect", "x=\"36\" y=\"84\" width=\"24\" height=\"96\" rx=\"12\" transform=\"rotate(7 48 90)\""],
    ["Braço esquerdo", "rect", "x=\"140\" y=\"84\" width=\"24\" height=\"96\" rx=\"12\" transform=\"rotate(-7 152 90)\""],
    ["Mão direita", "ellipse", "cx=\"36\" cy=\"194\" rx=\"12\" ry=\"14\""],
    ["Mão esquerda", "ellipse", "cx=\"164\" cy=\"194\" rx=\"12\" ry=\"14\""],
    ["Perna direita", "rect", "x=\"68\" y=\"198\" width=\"30\" height=\"130\" rx=\"15\""],
    ["Perna esquerda", "rect", "x=\"102\" y=\"198\" width=\"30\" height=\"130\" rx=\"15\""],
    ["Pé direito", "ellipse", "cx=\"78\" cy=\"340\" rx=\"18\" ry=\"10\""],
    ["Pé esquerdo", "ellipse", "cx=\"122\" cy=\"340\" rx=\"18\" ry=\"10\""]
  ],
  back: [
    ["Cabeça (atrás)", "ellipse", "cx=\"100\" cy=\"34\" rx=\"25\" ry=\"29\""],
    ["Pescoço (atrás)", "rect", "x=\"89\" y=\"60\" width=\"22\" height=\"20\" rx=\"8\""],
    ["Costas (em cima)", "rect", "x=\"62\" y=\"78\" width=\"76\" height=\"60\" rx=\"22\""],
    ["Costas (embaixo)", "rect", "x=\"66\" y=\"140\" width=\"68\" height=\"40\" rx=\"16\""],
    ["Bumbum", "rect", "x=\"66\" y=\"182\" width=\"68\" height=\"32\" rx=\"16\""],
    ["Braço esquerdo", "rect", "x=\"36\" y=\"84\" width=\"24\" height=\"96\" rx=\"12\" transform=\"rotate(7 48 90)\""],
    ["Braço direito", "rect", "x=\"140\" y=\"84\" width=\"24\" height=\"96\" rx=\"12\" transform=\"rotate(-7 152 90)\""],
    ["Mão esquerda", "ellipse", "cx=\"36\" cy=\"194\" rx=\"12\" ry=\"14\""],
    ["Mão direita", "ellipse", "cx=\"164\" cy=\"194\" rx=\"12\" ry=\"14\""],
    ["Perna esquerda", "rect", "x=\"68\" y=\"216\" width=\"30\" height=\"112\" rx=\"15\""],
    ["Perna direita", "rect", "x=\"102\" y=\"216\" width=\"30\" height=\"112\" rx=\"15\""],
    ["Pé esquerdo", "ellipse", "cx=\"78\" cy=\"340\" rx=\"18\" ry=\"10\""],
    ["Pé direito", "ellipse", "cx=\"122\" cy=\"340\" rx=\"18\" ry=\"10\""]
  ]
};

// Enfeites do boneco (não clicáveis): rosto na frente, cabelo nas costas.
const ROSTO = '<g class="deco"><circle cx="91" cy="32" r="2.6"/><circle cx="109" cy="32" r="2.6"/><path d="M92 43q8 7 16 0" fill="none" stroke-linecap="round"/></g>';
const CABELO = '<path class="deco" d="M76 30a24 26 0 0 1 48 0q-24-10-48 0z"/>';


/* ---------------------------------------------------------------------
   3. VOZ (leitura em voz alta)
   --------------------------------------------------------------------- */
function falar(texto) {
  const navegadorSuportaVoz = 'speechSynthesis' in window;
  if (!estado.vozLigada || !navegadorSuportaVoz) return;

  speechSynthesis.cancel(); // para qualquer fala anterior
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = 'pt-BR';
  fala.rate = 0.9; // um pouco mais devagar que o normal
  speechSynthesis.speak(fala);
}

// Botão "🔊 Ouvir de novo": repete a pergunta que está na tela.
function ouvirDeNovo() {
  const pergunta = document.querySelector('h1').textContent;
  falar(estado.frasePrefixo + ' ' + pergunta);
}


/* ---------------------------------------------------------------------
   4. NAVEGAÇÃO ENTRE TELAS
   --------------------------------------------------------------------- */

// Vai para outro passo. `frase` é falada antes da nova pergunta.
function irParaPasso(novoPasso, frase) {
  estado.historico.push(estado.passo); // lembra de onde veio
  estado.passo = novoPasso;
  estado.frasePrefixo = frase || '';
  desenhar(true);
}

// Botão "← Voltar": volta para o último passo do histórico.
function voltar() {
  if (estado.historico.length === 0) return;
  estado.passo = estado.historico.pop();
  estado.frasePrefixo = '';
  desenhar(true);
}

// Apaga as respostas e recomeça do passo 0.
function novaTriagem() {
  estado.respostas = respostasVazias();
  estado.historico = [];
  estado.passo = 0;
  estado.ajudaAberta = false;
  desenhar(true);
}

// "Corrigir": apaga as respostas e volta ao passo 1 (sem trocar o modo).
function corrigirRespostas() {
  estado.respostas = respostasVazias();
  estado.historico = [0];
  estado.passo = 1;
  estado.frasePrefixo = 'Vamos corrigir.';
  desenhar(true);
}


/* ---------------------------------------------------------------------
   5. PREFERÊNCIAS (modo, tema, letra, voz)
   --------------------------------------------------------------------- */

// Passo 0: escolhe Normal, Criança ou Alto contraste.
function escolherModo(modo) {
  estado.modo = modo;
  raiz.dataset.mode = modo; // o CSS usa [data-mode="..."] para trocar as cores
  estado.zoom = (modo === 'hc') ? 1.2 : 1; // alto contraste já começa com letra maior
  raiz.style.setProperty('--z', estado.zoom);
  irParaPasso(1, 'Vamos começar.');
}

// Botão do tema: Auto → Claro → Escuro → Auto...
function alternarTema() {
  const ordem = ['auto', 'light', 'dark'];
  const posicaoAtual = ordem.indexOf(estado.tema);
  estado.tema = ordem[(posicaoAtual + 1) % ordem.length];

  if (estado.tema === 'auto') {
    delete raiz.dataset.theme; // sem atributo = segue o tema do celular
  } else {
    raiz.dataset.theme = estado.tema;
  }
  desenhar(false);
}

function nomeDoTema() {
  if (estado.tema === 'light') return '☀️ Claro';
  if (estado.tema === 'dark') return '🌙 Escuro';
  return '🌓 Auto';
}

// Botão "A+": aumenta a letra em 0.2 até 1.4 e depois volta para 1.
function aumentarLetra() {
  const passouDoLimite = estado.zoom >= 1.4;
  estado.zoom = passouDoLimite ? 1 : +(estado.zoom + 0.2).toFixed(1);
  raiz.style.setProperty('--z', estado.zoom);
  desenhar(false);
}

// Botão de voz: liga/desliga.
function alternarVoz() {
  estado.vozLigada = !estado.vozLigada;
  if (!estado.vozLigada && 'speechSynthesis' in window) speechSynthesis.cancel();
  desenhar(false);
}


/* ---------------------------------------------------------------------
   6. RESPOSTAS DO PACIENTE
   --------------------------------------------------------------------- */

// Guarda uma resposta simples e avança.
//   chave: 'bem' | 'dor' | 'quando'   valor: o que será mostrado no resumo
function responder(chave, valor, proximoPasso, rotuloFalado) {
  estado.respostas[chave] = valor;

  // Se disse que não tem dor, apaga o local marcado antes.
  if (chave === 'dor' && valor === 'Não') estado.respostas.local = [];

  irParaPasso(proximoPasso, 'Você respondeu: ' + rotuloFalado + '.');
}

// Escala de dor (0 a 10) → vai para "Quando começou?".
function definirIntensidade(numero) {
  estado.respostas.intensidade = numero;
  irParaPasso(5, 'Dor número ' + numero + ' de 10.');
}

// Se o item está na lista, remove; se não está, adiciona.
// Devolve true se acabou de MARCAR e false se acabou de DESMARCAR.
function alternarNaLista(lista, item) {
  const posicao = lista.indexOf(item);
  if (posicao < 0) {
    lista.push(item);
    return true;
  }
  lista.splice(posicao, 1);
  return false;
}

// Toque em uma parte do boneco.
function alternarLocal(nomeDaParte) {
  const lista = estado.respostas.local;

  // "Corpo todo" não combina com partes específicas: ao marcar uma parte, tira o "corpo todo".
  const posicaoCorpoTodo = lista.indexOf(CORPO_TODO);
  if (posicaoCorpoTodo >= 0) lista.splice(posicaoCorpoTodo, 1);

  const marcou = alternarNaLista(lista, nomeDaParte);
  desenhar(false);
  falar(nomeDaParte + (marcou ? ' marcado.' : ' desmarcado.'));
}

// Botão "Corpo todo ou não sei": substitui tudo por essa opção.
function marcarCorpoTodo() {
  estado.respostas.local = [CORPO_TODO];
  desenhar(false);
  falar(CORPO_TODO + '.');
}

// Botão "Continuar" da tela do boneco.
function continuarDoLocal() {
  irParaPasso(4, 'Local marcado: ' + estado.respostas.local.join(', ') + '.');
}

// Marca/desmarca um sinal de alerta.
function alternarAlerta(nome) {
  const marcou = alternarNaLista(estado.respostas.alertas, nome);
  desenhar(false);
  falar(nome + (marcou ? ' marcado.' : ' desmarcado.'));
}

// Botão "Continuar" da tela de alertas.
function continuarDosAlertas() {
  irParaPasso(7, textoDosAlertas());
}

// Botão "Frente / Costas" do boneco.
function mudarLado(lado) {
  estado.lado = lado;
  desenhar(false);
  falar(lado === 'front' ? 'Vendo a frente do corpo.' : 'Vendo as costas.');
}

// Botão "Está certo — mostrar ao profissional".
function enviarParaProfissional() {
  irParaPasso(8, 'Enviado.');
}

// Botão vermelho de ajuda (sempre visível no rodapé).
function pedirAjuda() {
  estado.ajudaAberta = true;
  desenhar(false);
  falar('Preciso de ajuda. Mostre esta tela a um profissional de saúde.');
}

function fecharAjuda() {
  estado.ajudaAberta = false;
  desenhar(false);
}


/* ---------------------------------------------------------------------
   7. RESUMO DAS RESPOSTAS
   --------------------------------------------------------------------- */

// Lista de [título, valor] para mostrar no cartão de resumo.
function linhasDoResumo() {
  const r = estado.respostas;
  const linhas = [
    ['Como está', r.bem || '—'],
    ['Sente dor', r.dor || '—']
  ];

  // Só mostra os detalhes da dor se o paciente disse que sente dor.
  if (r.dor === 'Sim') {
    linhas.push(
      ['Onde dói', r.local.join(', ') || '—'],
      ['Intensidade', (r.intensidade ?? '—') + ' de 10'],
      ['Quando começou', r.quando || '—']
    );
  }

  linhas.push(['Sinais de alerta', r.alertas.length ? r.alertas.join(', ') : 'Nenhum informado']);
  return linhas;
}

// O mesmo resumo, em forma de frase para a voz ler.
function textoDoResumo() {
  return linhasDoResumo().map(([titulo, valor]) => titulo + ': ' + valor + '.').join(' ');
}

function textoDosAlertas() {
  const alertas = estado.respostas.alertas;
  return alertas.length ? 'Sinais marcados: ' + alertas.join(', ') + '.' : 'Nenhum sinal de alerta.';
}


/* ---------------------------------------------------------------------
   8. PEÇAS DE HTML REUTILIZÁVEIS
   --------------------------------------------------------------------- */

// Botão grande de opção (ícone + texto).
//   aoClicar: texto com a função a chamar, ex.: "escolherModo('kid')"
//   marcado:  true deixa o botão com aparência de selecionado
function botaoOpcao(icone, texto, aoClicar, marcado) {
  return `<button class="opt" aria-pressed="${!!marcado}" onclick="${aoClicar}">
    <span class="ic" aria-hidden="true">${icone}</span><span>${texto}</span></button>`;
}

// Cartão com o resumo (fica vermelho se houver sinal de alerta).
function cartaoResumo() {
  const classe = estado.respostas.alertas.length ? 'card alert' : 'card';
  const linhas = linhasDoResumo()
    .map(([titulo, valor]) => `<div><span>${titulo}</span><strong>${valor}</strong></div>`)
    .join('');
  return `<div class="${classe}">${linhas}</div>`;
}

// O boneco: uma forma SVG clicável para cada parte do corpo.
function desenharBoneco() {
  const partes = CORPO[estado.lado].map(([nome, forma, medidas]) => {
    const marcada = estado.respostas.local.includes(nome);
    return `<${forma} class="reg${marcada ? ' on' : ''}" data-l="${nome}" ${medidas}
      tabindex="0" role="button" aria-pressed="${marcada}" aria-label="${nome}"/>`;
  }).join('');

  const enfeite = (estado.lado === 'front') ? ROSTO : CABELO;
  const descricao = (estado.lado === 'front') ? 'vista de frente' : 'vista de costas';

  return `<div class="fig"><svg id="body" viewBox="0 0 200 356" role="group"
    aria-label="Mapa do corpo, ${descricao}">${partes}${enfeite}</svg></div>`;
}


/* ---------------------------------------------------------------------
   9. AS TELAS
   Cada função devolve [pergunta, htmlDoCorpo].
   --------------------------------------------------------------------- */

// Passo 0
function telaEscolherModo() {
  return ['Olá! Escolha como quer usar.', `<div class="opts">
    ${botaoOpcao('🙂', 'Normal', "escolherModo('std')")}
    ${botaoOpcao('🎈', 'Criança', "escolherModo('kid')")}
    ${botaoOpcao('🔍', 'Letra grande e alto contraste', "escolherModo('hc')")}
  </div>`];
}

// Passo 1
function telaComoEstaSe() {
  return ['Você está se sentindo bem?', `<div class="opts">
    ${botaoOpcao('😊', 'Sim, estou bem', "responder('bem','Estou bem',2,'Sim, estou bem')")}
    ${botaoOpcao('😟', 'Não estou bem', "responder('bem','Não estou bem',2,'Não estou bem')")}
  </div>`];
}

// Passo 2: "Sim" vai para o boneco (3); "Não" pula direto para os alertas (6).
function telaTemDor() {
  return ['Você está sentindo dor?', `<div class="opts">
    ${botaoOpcao('✅', 'Sim', "responder('dor','Sim',3,'Sim')")}
    ${botaoOpcao('❌', 'Não', "responder('dor','Não',6,'Não')")}
  </div>`];
}

// Passo 3: boneco
function telaOndeDoi() {
  const local = estado.respostas.local;
  const semNada = local.length === 0;

  return ['Onde está doendo? Toque no corpo.', `
    <div class="seg">
      <button class="sm" aria-pressed="${estado.lado === 'front'}" onclick="mudarLado('front')">Frente</button>
      <button class="sm" aria-pressed="${estado.lado === 'back'}" onclick="mudarLado('back')">Costas</button>
    </div>
    ${desenharBoneco()}
    <p class="chips" aria-live="polite">${local.join(' · ') || 'Nada marcado ainda'}</p>
    <div class="opts">
      ${botaoOpcao('🧍', CORPO_TODO, 'marcarCorpoTodo()', local[0] === CORPO_TODO)}
      <button class="opt go" ${semNada ? 'disabled' : ''} onclick="continuarDoLocal()">Continuar</button>
    </div>`];
}

// Passo 4: escala de dor
function telaIntensidade() {
  const botoes = CARINHAS.map((carinha, numero) => {
    const corDaBorda = `hsl(${120 - numero * 12},70%,42%)`; // verde (0) até vermelho (10)
    return `<button class="opt" aria-pressed="${estado.respostas.intensidade === numero}"
      style="border-bottom-color:${corDaBorda}" onclick="definirIntensidade(${numero})">
      <span class="ic" aria-hidden="true">${carinha}</span><b>${numero}</b></button>`;
  }).join('');

  return ['Qual a força da dor? 0 é sem dor. 10 é a pior dor.', `
    <div class="lvl">${botoes}</div>
    <div class="leg"><span>0 = sem dor</span><span>10 = pior dor</span></div>`];
}

// Passo 5
function telaQuando() {
  return ['Quando a dor começou?', `<div class="opts">
    ${botaoOpcao('🕐', 'Hoje', "responder('quando','Hoje',6,'Hoje')")}
    ${botaoOpcao('📅', 'Há alguns dias', "responder('quando','Há alguns dias',6,'Há alguns dias')")}
    ${botaoOpcao('🗓️', 'Há semanas ou mais', "responder('quando','Há semanas ou mais',6,'Há semanas ou mais')")}
  </div>`];
}

// Passo 6
function telaAlertas() {
  const alertas = estado.respostas.alertas;
  const botoes = ALERTAS
    .map(([icone, nome]) => botaoOpcao(icone, nome, `alternarAlerta('${nome}')`, alertas.includes(nome)))
    .join('');
  const textoDoBotao = alertas.length ? 'Continuar' : 'Nenhum desses — continuar';

  return ['Você sente algum destes sinais?', `<div class="opts">
    ${botoes}
    <button class="opt go" onclick="continuarDosAlertas()">${textoDoBotao}</button>
  </div>`];
}

// Passo 7: conferir
function telaConferir() {
  return ['Confira suas respostas.', `${cartaoResumo()}
    <div class="opts">
      <button class="opt go" onclick="enviarParaProfissional()">Está certo — mostrar ao profissional</button>
      ${botaoOpcao('↩️', 'Corrigir', 'corrigirRespostas()')}
    </div>`];
}

// Passo 8: tela final
function telaFinal() {
  return ['Pronto! Mostre esta tela ao profissional de saúde.', `${cartaoResumo()}
    <div class="opts">${botaoOpcao('🔄', 'Nova triagem', 'novaTriagem()')}</div>`];
}

// A posição na lista = número do passo.
const TELAS = [
  telaEscolherModo, // 0
  telaComoEstaSe,   // 1
  telaTemDor,       // 2
  telaOndeDoi,      // 3
  telaIntensidade,  // 4
  telaQuando,       // 5
  telaAlertas,      // 6
  telaConferir,     // 7
  telaFinal         // 8
];


/* ---------------------------------------------------------------------
   10. DESENHAR NA PÁGINA
   --------------------------------------------------------------------- */

// Barra no topo com Voltar, tema, voz e letra.
function montarCabecalho() {
  const podeVoltar = estado.passo > 0 && estado.historico.length > 0;
  return `<header>
    ${podeVoltar ? '<button class="sm" onclick="voltar()">← Voltar</button>' : ''}
    <span class="sp"></span>
    <button class="sm" onclick="alternarTema()">${nomeDoTema()}</button>
    <button class="sm" aria-pressed="${estado.vozLigada}" onclick="alternarVoz()">
      ${estado.vozLigada ? '🔊 Voz ligada' : '🔇 Voz desligada'}</button>
    <button class="sm" onclick="aumentarLetra()" aria-label="Aumentar letra">A+</button>
  </header>`;
}

// "Passo 3 de 7" + barrinha de progresso (só nos passos 1 a 7).
function montarProgresso() {
  const mostrar = estado.passo > 0 && estado.passo < 8;
  if (!mostrar) return '';

  const segmentos = Array.from({ length: 7 }, (_, n) => `<i${n < estado.passo ? ' class="on"' : ''}></i>`).join('');
  return `<p class="step">Passo ${estado.passo} de 7</p><div class="bar" aria-hidden="true">${segmentos}</div>`;
}

// Tela vermelha de pedido de ajuda.
function montarTelaDeAjuda() {
  return `<div class="ov" role="alertdialog" aria-label="Pedido de ajuda">
    <div style="font-size:4em">🚨</div>
    <h1>PRECISO DE AJUDA</h1>
    <p>Mostre esta tela a um profissional de saúde ou levante a mão.</p>
    <button class="sm" onclick="fecharAjuda()">Voltar</button>
  </div>`;
}

// Redesenha tudo. `lerEmVozAlta` = true quando acabou de mudar de tela.
function desenhar(lerEmVozAlta) {
  if (estado.ajudaAberta) {
    elementoApp.innerHTML = montarTelaDeAjuda();
    return;
  }

  const construirTela = TELAS[estado.passo] || telaFinal;
  const [pergunta, corpo] = construirTela();

  elementoApp.innerHTML = `${montarCabecalho()}
    <main>
      ${montarProgresso()}
      <h1>${pergunta}</h1>
      ${corpo}
      <p><button class="sm" onclick="ouvirDeNovo()">🔊 Ouvir de novo</button></p>
    </main>
    <footer><button class="help" onclick="pedirAjuda()">🚨 Preciso de ajuda agora</button></footer>`;

  if (lerEmVozAlta) {
    window.scrollTo(0, 0);
    const prefixo = estado.frasePrefixo ? estado.frasePrefixo + ' ' : '';
    const resumo = (estado.passo === 7) ? ' ' + textoDoResumo() : '';
    falar(prefixo + pergunta + resumo);
  }
}


/* ---------------------------------------------------------------------
   11. EVENTOS DO BONECO
   As partes do corpo são recriadas a cada desenho, então escutamos o clique
   no #app inteiro e descobrimos qual parte (.reg) foi tocada.
   --------------------------------------------------------------------- */
elementoApp.addEventListener('click', (evento) => {
  const parte = evento.target.closest('.reg');
  if (parte) alternarLocal(parte.dataset.l);
});

// Teclado: Enter ou Espaço também marcam a parte que está com foco.
elementoApp.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Enter' && evento.key !== ' ') return;

  const parte = evento.target.closest && evento.target.closest('.reg');
  if (parte) {
    evento.preventDefault(); // evita rolar a página com a barra de espaço
    alternarLocal(parte.dataset.l);
  }
});


/* ---------------------------------------------------------------------
   12. INÍCIO
   --------------------------------------------------------------------- */
desenhar(false);