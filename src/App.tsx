import { lazy, Suspense, useEffect, useReducer, useRef } from "react";
import type { Dispatch } from "react";
import {
  PAIN_FACES,
  WARNING_SIGNS,
  WHOLE_BODY,
  initialState,
  summaryRows,
  summarySpokenText,
  triageReducer,
} from "./domain";
import type { Step, TriageAction, TriageState } from "./domain";
import { BACK_LABELS, BODY_REGIONS } from "./bodyRegions";

const ThreeBodyCanvas = lazy(() => import("./ThreeBodyCanvas"));
type ChoiceProps = {
  icon: string;
  label: string;
  onClick: () => void;
  selected?: boolean;
};

function Choice({ icon, label, onClick, selected = false }: ChoiceProps) {
  return (
    <button className="choice-card" type="button" aria-pressed={selected} onClick={onClick}>
      <span className="choice-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="choice-label">{label}</span>
      {selected && <span className="choice-check" aria-hidden="true">✓</span>}
    </button>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 42 42" fill="none">
        <path d="M21 36S5 26.4 5 15.6C5 6 17 4 21 12c4-8 16-6 16 3.6C37 26.4 21 36 21 36Z" fill="currentColor" />
        <path d="M11 21h6l3-6 4.2 12 3.1-6H32" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function BodyFigure({
  state,
  dispatch,
  speak,
}: {
  state: TriageState;
  dispatch: Dispatch<TriageAction>;
  speak: (text: string) => void;
}) {
  const isFront = state.side === "front";

  function chooseRegion(label: string) {
    const marked = state.answers.local.includes(label);
    dispatch({ type: "TOGGLE_LOCAL", label });
    speak(`${label}${marked ? " desmarcado." : " marcado."}`);
  }

  return (
    <div className="figure-card">
      <div className="figure-toolbar">
        <div className="segmented-control" role="group" aria-label="Escolha a figura">
          <button
            type="button"
            aria-pressed={state.gender === "female"}
            onClick={() => dispatch({ type: "SET_GENDER", gender: "female" })}
          >
            Feminino
          </button>
          <button
            type="button"
            aria-pressed={state.gender === "male"}
            onClick={() => dispatch({ type: "SET_GENDER", gender: "male" })}
          >
            Masculino
          </button>
        </div>
        <span className="figure-caption">{isFront ? "Vista frontal" : "Vista posterior"}</span>
      </div>

      <div className="figure-stage">
        <Suspense fallback={<span className="model-status" role="status">Preparando o modelo 3D...</span>}>
          <ThreeBodyCanvas state={state} dispatch={dispatch} speak={speak} />
        </Suspense>
      </div>
      <details className="body-region-picker">
        <summary>Selecionar região pela lista</summary>
        <div className="body-region-options" role="group" aria-label="Regiões do corpo">
          {(isFront
            ? BODY_REGIONS
            : [
                ...BODY_REGIONS.map((label) => BACK_LABELS[label] ?? label),
                "Bumbum",
              ]
          ).map((label) => (
            <button
              key={label}
              type="button"
              className="body-region-option"
              aria-pressed={state.answers.local.includes(label)}
              onClick={() => chooseRegion(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </details>

      <div className="figure-controls">
        <div className="rotation-buttons" role="group" aria-label="Girar figura">
          <button
            type="button"
            className="small-control"
            onClick={() => dispatch({ type: "SET_ANGLE", angle: state.angle - 30 })}
            aria-label="Girar 30 graus para a esquerda"
          >
            −30°
          </button>
          <button
            type="button"
            className="small-control"
            onClick={() => dispatch({ type: "SET_SIDE", side: "front" })}
          >
            Frente
          </button>
          <button
            type="button"
            className="small-control"
            onClick={() => dispatch({ type: "SET_SIDE", side: "back" })}
          >
            Costas
          </button>
          <button
            type="button"
            className="small-control"
            onClick={() => dispatch({ type: "SET_ANGLE", angle: state.angle + 30 })}
            aria-label="Girar 30 graus para a direita"
          >
            +30°
          </button>
        </div>
        <label className="range-control">
          <span>
            <span>Rotação</span>
            <strong>{state.angle}°</strong>
          </span>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            value={state.angle}
            aria-label={`Rotação do corpo: ${state.angle} graus`}
            onChange={(event) => dispatch({ type: "SET_ANGLE", angle: Number(event.target.value) })}
          />
        </label>
        <div className="zoom-row" role="group" aria-label="Zoom da figura">
          <span>Aproximar figura</span>
          <button
            type="button"
            className="zoom-button"
            onClick={() => dispatch({ type: "CHANGE_FIGURE_ZOOM", amount: -0.1 })}
            aria-label="Afastar figura"
          >
            −
          </button>
          <button
            type="button"
            className="zoom-button"
            onClick={() => dispatch({ type: "CHANGE_FIGURE_ZOOM", amount: 0.1 })}
            aria-label="Aproximar figura"
          >
            +
          </button>
        </div>
      </div>
      <p className="figure-note">
        Modelo 3D interativo para indicar regiões. É uma referência visual e não substitui avaliação profissional.
      </p>
    </div>
  );
}

function AnswerSummary({ state }: { state: TriageState }) {
  const rows = summaryRows(state.answers);
  return (
    <div className={`summary-card${state.answers.alertas.length ? " summary-card-alert" : ""}`}>
      {state.answers.bem === "Estou bem" && (
        <div className="well-response" role="status">
          <span aria-hidden="true">😊</span>
          <div>
            <strong>Que bom saber que você está bem.</strong>
            <p>Você informou: Estou bem</p>
          </div>
        </div>
      )}
      {state.answers.alertas.length > 0 && (
        <div className="warning-note" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>Sinais de alerta selecionados. Mostre este resumo ao profissional de saúde.</span>
        </div>
      )}
      <dl>
        {rows.map(([label, value]) => (
          <div className="summary-row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function questionForStep(step: Step): string {
  const questions: Record<Step, string> = {
    0: "Olá! Escolha como quer usar.",
    1: "Você está se sentindo bem?",
    2: "Você está sentindo dor?",
    3: "Onde está doendo? Toque no corpo.",
    4: "Qual a força da dor? 1 é pouca dor. 5 é muita dor.",
    5: "Quando a dor começou?",
    6: "Você sente algum destes sinais?",
    7: "Confira suas respostas.",
    8: "Pronto! Mostre esta tela ao profissional de saúde.",
  };
  return questions[step];
}

function completedAnswer(state: TriageState, step: Step): string {
  switch (step) {
    case 0:
      return state.mode === "kid"
        ? "Criança"
        : state.mode === "hc"
          ? "Letra grande e alto contraste"
          : "Normal";
    case 1:
      return state.answers.bem || "—";
    case 2:
      return state.answers.dor || "—";
    case 3:
      return state.answers.local.join(", ") || "—";
    case 4:
      return state.answers.intensidade === undefined ? "—" : `${state.answers.intensidade} de 5`;
    case 5:
      return state.answers.quando || "—";
    case 6:
      return state.answers.alertas.length
        ? state.answers.alertas.join(", ")
        : "Nenhum informado";
    case 7:
      return "Respostas conferidas";
    case 8:
      return "Resumo pronto";
  }
}

function App() {
  const [state, dispatch] = useReducer(triageReducer, undefined, initialState);
  const previousStep = useRef<Step>(state.step);
  const closeHelpRef = useRef<HTMLButtonElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const helpWasOpen = useRef(false);

  function speak(text: string) {
    if (!state.voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mode = state.mode;
    if (state.theme === "auto") delete root.dataset.theme;
    else root.dataset.theme = state.theme;
    root.style.setProperty("--text-zoom", String(state.zoom));
  }, [state.mode, state.theme, state.zoom]);

  useEffect(() => {
    if (state.helpOpen) {
      helpWasOpen.current = true;
      closeHelpRef.current?.focus();
      speak("Preciso de ajuda. Mostre esta tela a um profissional de saúde.");
      return;
    }
    if (helpWasOpen.current) {
      helpWasOpen.current = false;
      helpTriggerRef.current?.focus();
    }
    if (previousStep.current !== state.step) {
      const question = questionForStep(state.step);
      const prefix = state.announcement ? `${state.announcement} ` : "";
      const summary = state.step === 7 ? ` ${summarySpokenText(state.answers)}` : "";
      speak(`${prefix}${question}${summary}`);
      document.getElementById("triage-question")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "center",
      });
      previousStep.current = state.step;
    }
  }, [state.step, state.announcement, state.answers, state.helpOpen]);

  useEffect(() => {
    if (!state.voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [state.voiceEnabled]);

  useEffect(() => {
    if (!state.helpOpen) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") dispatch({ type: "CLOSE_HELP" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.helpOpen]);

  function repeatQuestion() {
    const prefix = state.announcement ? `${state.announcement} ` : "";
    const summary = state.step === 7 ? ` ${summarySpokenText(state.answers)}` : "";
    speak(`${prefix}${questionForStep(state.step)}${summary}`);
  }

  function modeChoice(mode: TriageState["mode"]) {
    dispatch({ type: "SELECT_MODE", mode });
  }

  function answer(key: "bem" | "dor" | "quando", value: string, nextStep: Step, spokenLabel: string) {
    dispatch({ type: "ANSWER", key, value, nextStep, spokenLabel });
  }

  function renderChoices() {
    switch (state.step) {
      case 0:
        return (
          <div className="choice-list">
            <Choice icon="🙂" label="Normal" onClick={() => modeChoice("std")} />
            <Choice icon="🎈" label="Criança" onClick={() => modeChoice("kid")} />
            <Choice icon="🔍" label="Letra grande e alto contraste" onClick={() => modeChoice("hc")} />
          </div>
        );
      case 1:
        return (
          <>
            <div className="choice-list">
              <Choice
                icon="😊"
                label="Sim, estou bem"
                onClick={() => answer("bem", "Estou bem", 2, "Sim, estou bem")}
              />
              <Choice
                icon="😟"
                label="Não estou bem"
                onClick={() => answer("bem", "Não estou bem", 2, "Não estou bem")}
              />
            </div>
            <p className="question-hint">Responda no seu tempo. Você pode mudar de ideia antes de mostrar o resumo.</p>
          </>
        );
      case 2:
        return (
          <>
            {state.answers.bem === "Estou bem" && (
              <div className="well-nudge" role="status">
                <span aria-hidden="true">🌞</span>
                <span>😊 Você informou que está bem.</span>
              </div>
            )}
            <div className="choice-list choice-list-two">
              <Choice icon="✅" label="Sim" onClick={() => answer("dor", "Sim", 3, "Sim")} />
              <Choice icon="❌" label="Não" onClick={() => answer("dor", "Não", 6, "Não")} />
            </div>
          </>
        );
      case 3: {
        const selected = state.answers.local;
        const wholeBody = selected.includes(WHOLE_BODY);
        return (
          <div className="body-step">
            <div className="segmented-control view-toggle" role="group" aria-label="Vista do corpo">
              <button
                type="button"
                aria-pressed={state.side === "front"}
                onClick={() => {
                  dispatch({ type: "SET_SIDE", side: "front" });
                  speak("Vendo a frente do corpo.");
                }}
              >
                Frente
              </button>
              <button
                type="button"
                aria-pressed={state.side === "back"}
                onClick={() => {
                  dispatch({ type: "SET_SIDE", side: "back" });
                  speak("Vendo as costas.");
                }}
              >
                Costas
              </button>
            </div>
            <BodyFigure state={state} dispatch={dispatch} speak={speak} />
            <p className="selected-regions" aria-live="polite">
              {selected.join(" · ") || "Nada marcado ainda"}
            </p>
            <div className="choice-list">
              <Choice
                icon="🧍"
                label={WHOLE_BODY}
                selected={wholeBody}
                onClick={() => {
                  dispatch({ type: "SET_WHOLE_BODY" });
                  speak(`${WHOLE_BODY}.`);
                }}
              />
              <button
                className="primary-button"
                type="button"
                disabled={selected.length === 0}
                onClick={() => dispatch({ type: "CONTINUE_LOCAL" })}
              >
                Continuar <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        );
      }
      case 4:
        return (
          <>
            <div className="pain-scale" role="group" aria-label="Escala de dor de um a cinco">
              {PAIN_FACES.map((face, index) => {
                const level = index + 1;
                return (
                  <button
                    className="pain-option"
                    key={level}
                    type="button"
                    aria-label={`${level} de 5${level === 1 ? ", pouca dor" : level === 5 ? ", muita dor" : ""}`}
                    aria-pressed={state.answers.intensidade === level}
                    style={{ borderBottomColor: `hsl(${120 - index * 30} 65% 48%)` }}
                    onClick={() => dispatch({ type: "SET_INTENSITY", value: level })}
                  >
                    <span aria-hidden="true">{face}</span>
                    <strong>{level}</strong>
                  </button>
                );
              })}
            </div>
            <div className="scale-legend"><span>1 = pouca dor</span><span>5 = muita dor</span></div>
          </>
        );
      case 5:
        return (
          <div className="choice-list">
            <Choice icon="🕐" label="Hoje" onClick={() => answer("quando", "Hoje", 6, "Hoje")} />
            <Choice
              icon="📅"
              label="Há alguns dias"
              onClick={() => answer("quando", "Há alguns dias", 6, "Há alguns dias")}
            />
            <Choice
              icon="🗓️"
              label="Há semanas ou mais"
              onClick={() => answer("quando", "Há semanas ou mais", 6, "Há semanas ou mais")}
            />
            <Choice
              icon="⌛"
              label="Há muito tempo"
              onClick={() => answer("quando", "Há muito tempo", 6, "Há muito tempo")}
            />
            <Choice
              icon="🤷"
              label="Não sei"
              onClick={() => answer("quando", "Não sei", 6, "Não sei")}
            />
          </div>
        );
      case 6:
        return (
          <div className="choice-list">
            {WARNING_SIGNS.map(({ icon, label }) => (
              <Choice
                key={label}
                icon={icon}
                label={label}
                selected={state.answers.alertas.includes(label)}
                onClick={() => {
                  const marked = state.answers.alertas.includes(label);
                  dispatch({ type: "TOGGLE_ALERT", label });
                  speak(`${label}${marked ? " desmarcado." : " marcado."}`);
                }}
              />
            ))}
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                dispatch({ type: "CONTINUE_ALERTS" });
              }}
            >
              {state.answers.alertas.length ? "Continuar" : "Nenhum desses — continuar"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        );
      case 7:
        return (
          <>
            <AnswerSummary state={state} />
            <div className="choice-list summary-actions">
              <button className="primary-button" type="button" onClick={() => dispatch({ type: "SHOW_FINAL" })}>
                Está certo — mostrar ao profissional <span aria-hidden="true">→</span>
              </button>
              <Choice icon="↩️" label="Corrigir" onClick={() => dispatch({ type: "CORRECT" })} />
            </div>
          </>
        );
      case 8:
        return (
          <>
            <AnswerSummary state={state} />
            <div className="done-message" role="status">
              <span aria-hidden="true">💚</span>
              <p>Suas respostas estão prontas para serem mostradas ao profissional de saúde.</p>
            </div>
            <div className="choice-list">
              <Choice icon="🔄" label="Nova triagem" onClick={() => dispatch({ type: "NEW_TRIAGE" })} />
            </div>
          </>
        );
    }
  }

  const canGoBack = state.step > 0 && state.history.length > 0;
  const displayTheme = state.theme === "light" ? "☀️ Claro" : state.theme === "dark" ? "🌙 Escuro" : "🌓 Auto";
  const stepIndex = Math.max(0, Math.min(7, state.step - 1));

  return (
    <div className="page-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Triagem Acessível, início">
          <BrandMark />
          <span>
            <strong>triagem</strong>
            <small>ACESSÍVEL</small>
          </span>
        </a>
        <div className="toolbar" aria-label="Preferências de acessibilidade">
          {canGoBack && (
            <button className="toolbar-button back-button" type="button" onClick={() => dispatch({ type: "BACK" })}>
              <span aria-hidden="true">←</span> Voltar
            </button>
          )}
          <button
            className="toolbar-button"
            type="button"
            onClick={() => dispatch({ type: "TOGGLE_THEME" })}
            aria-label={`Tema: ${displayTheme}. Alternar tema`}
          >
            {displayTheme}
          </button>
          <button
            className="toolbar-button"
            type="button"
            aria-pressed={state.voiceEnabled}
            onClick={() => dispatch({ type: "TOGGLE_VOICE" })}
          >
            {state.voiceEnabled ? "🔊 Voz ligada" : "🔇 Voz desligada"}
          </button>
          <button
            className="toolbar-button zoom-text"
            type="button"
            onClick={() => dispatch({ type: "INCREASE_TEXT" })}
            aria-label="Aumentar tamanho da letra"
          >
            A+
          </button>
        </div>
      </header>

      <main id="inicio" className="main-content">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> UM JEITO MAIS ACESSÍVEL DE SE CUIDAR</span>
            <h1 id="hero-title">
              Seu bem-estar,
              <br />
              <span>no seu tempo.</span>
            </h1>
            <p>
              Conte como você está se sentindo e organize suas respostas para mostrar a um profissional de saúde.
            </p>
            <div className="privacy-note">
              <span aria-hidden="true">✦</span>
              <span>Suas respostas ficam nesta página.</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-sun" />
            <div className="hero-sparkle sparkle-one">✳</div>
            <div className="hero-sparkle sparkle-two">✦</div>
            <div className="hero-petal petal-one" />
            <div className="hero-petal petal-two" />
            <div className="hero-orbit">
              <span className="hero-heart">♡</span>
              <span className="hero-orbit-dot" />
            </div>
            <div className="hero-ground" />
          </div>
        </section>

        <section className="triage-section" aria-label="Questionário de triagem">
          <div className="section-intro">
            <div>
              <span className="section-kicker">UMA PERGUNTA DE CADA VEZ</span>
              <p>Você escolhe o ritmo. Suas respostas aparecem no resumo.</p>
            </div>
            <div className="progress-ring" aria-label={state.step > 0 && state.step < 8 ? `Passo ${state.step} de 7` : "Início da triagem"}>
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <circle className="progress-track" cx="22" cy="22" r="18" />
                <circle
                  className="progress-value"
                  cx="22"
                  cy="22"
                  r="18"
                  style={{ strokeDashoffset: `${state.step === 8 ? 0 : 113 - (state.step > 0 && state.step < 8 ? (stepIndex / 7) * 113 : 0)}` }}
                />
              </svg>
              <span>{state.step > 0 && state.step < 8 ? `0${state.step}` : state.step === 8 ? "✓" : "♡"}</span>
            </div>
          </div>

          <article id="triage-question" className="question-card" aria-labelledby="question-title">
            {state.history.length > 0 && (
              <ol className="journey-list" aria-label="Etapas anteriores da triagem">
                {state.history.map((visitedStep, index) => (
                  <li className="journey-item" key={`${index}-${visitedStep}`}>
                    <span className="journey-check" aria-hidden="true">✓</span>
                    <div className="journey-copy">
                      <span>{visitedStep === 0 ? "INÍCIO" : `PASSO ${visitedStep} DE 7`}</span>
                      <strong>{questionForStep(visitedStep)}</strong>
                      <p>{completedAnswer(state, visitedStep)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {state.step > 0 && state.step < 8 && (
              <div className="step-progress">
                <div className="step-copy"><span>PASSO {state.step} <i>DE</i> 7</span><span>{Math.round((state.step / 7) * 100)}%</span></div>
                <div className="step-track" aria-hidden="true">
                  <span style={{ width: `${(state.step / 7) * 100}%` }} />
                </div>
              </div>
            )}
            <div className="question-heading">
              <div className="question-icon" aria-hidden="true">{state.step === 0 ? "✦" : state.step === 7 || state.step === 8 ? "♡" : "✳"}</div>
              <div>
                <span className="question-label">{state.step === 0 ? "SEJA BEM-VINDO(A)" : state.step === 8 ? "RESUMO PRONTO" : "SUA TRIAGEM"}</span>
                <h2 id="question-title">{questionForStep(state.step)}</h2>
              </div>
            </div>

            {renderChoices()}

            <div className="question-footer">
              <button className="listen-button" type="button" onClick={repeatQuestion}>
                <span aria-hidden="true">◖)))</span> Ouvir de novo
              </button>
              <span className="private-label"><span aria-hidden="true">🔒</span> Sem envio de dados</span>
            </div>
          </article>
        </section>

        <section className="comfort-strip" aria-label="Informações importantes">
          <div className="comfort-icon" aria-hidden="true">🫶</div>
          <div>
            <strong>Um apoio para a conversa.</strong>
            <p>Esta triagem ajuda a organizar o que você conta. Ela não faz diagnóstico nem substitui a avaliação de um profissional.</p>
          </div>
          <span className="comfort-flower" aria-hidden="true">✳</span>
        </section>

        <footer className="page-footer">
          <span>Triagem Acessível <b>·</b> feita para acolher diferentes formas de comunicação</span>
          <button type="button" onClick={repeatQuestion}>Ouvir a pergunta atual</button>
        </footer>
      </main>

      <div className="urgent-bar">
        <button ref={helpTriggerRef} type="button" className="urgent-button" onClick={() => dispatch({ type: "OPEN_HELP" })}>
          <span className="urgent-icon" aria-hidden="true">!</span>
          <span>Preciso de ajuda agora</span>
          <span className="urgent-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      {state.helpOpen && (
        <div className="urgent-overlay" role="alertdialog" aria-modal="true" aria-labelledby="urgent-title">
          <div className="urgent-dialog">
            <div className="urgent-symbol" aria-hidden="true">!</div>
            <span className="urgent-dialog-kicker">MOSTRE ESTA MENSAGEM</span>
            <h2 id="urgent-title">PRECISO DE AJUDA</h2>
            <p>Mostre esta tela a um profissional de saúde ou levante a mão.</p>
            <button ref={closeHelpRef} type="button" className="urgent-close" onClick={() => dispatch({ type: "CLOSE_HELP" })}>
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
