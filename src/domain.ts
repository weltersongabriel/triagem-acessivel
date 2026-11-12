export const WHOLE_BODY = "Corpo todo ou não sei";

export const PAIN_FACES = ["🙂", "😐", "😕", "😣", "😭"] as const;

export const WARNING_SIGNS = [
  { icon: "😮‍💨", label: "Falta de ar" },
  { icon: "🫀", label: "Dor no peito" },
  { icon: "😵", label: "Desmaio" },
  { icon: "🤕", label: "Dor de cabeça" },
  { icon: "🪨", label: "Cólica renal" },
  { icon: "🦷", label: "Dor de dente" },
  { icon: "🤒", label: "Febre Alta" },
] as const;

export type Mode = "std" | "kid" | "hc";
export type Theme = "auto" | "light" | "dark";
export type Side = "front" | "back";
export type Gender = "female" | "male";
export type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type AnswerKey = "bem" | "dor" | "quando";

export interface Answers {
  bem: string;
  dor: string;
  local: string[];
  intensidade: number | undefined;
  quando: string;
  alertas: string[];
}

export interface TriageState {
  mode: Mode;
  theme: Theme;
  voiceEnabled: boolean;
  zoom: number;
  step: Step;
  history: Step[];
  answers: Answers;
  announcement: string;
  side: Side;
  gender: Gender;
  angle: number;
  figureZoom: number;
  helpOpen: boolean;
}

export type TriageAction =
  | { type: "SELECT_MODE"; mode: Mode }
  | { type: "ANSWER"; key: AnswerKey; value: string; nextStep: Step; spokenLabel: string }
  | { type: "SET_INTENSITY"; value: number }
  | { type: "TOGGLE_LOCAL"; label: string }
  | { type: "SET_WHOLE_BODY" }
  | { type: "CONTINUE_LOCAL" }
  | { type: "TOGGLE_ALERT"; label: string }
  | { type: "CONTINUE_ALERTS" }
  | { type: "SET_SIDE"; side: Side }
  | { type: "SET_GENDER"; gender: Gender }
  | { type: "SET_ANGLE"; angle: number }
  | { type: "CHANGE_FIGURE_ZOOM"; amount: number }
  | { type: "TOGGLE_THEME" }
  | { type: "INCREASE_TEXT" }
  | { type: "TOGGLE_VOICE" }
  | { type: "BACK" }
  | { type: "NEW_TRIAGE" }
  | { type: "CORRECT" }
  | { type: "SHOW_FINAL" }
  | { type: "OPEN_HELP" }
  | { type: "CLOSE_HELP" };

export function emptyAnswers(): Answers {
  return {
    bem: "",
    dor: "",
    local: [],
    intensidade: undefined,
    quando: "",
    alertas: [],
  };
}

export function initialState(): TriageState {
  return {
    mode: "std",
    theme: "auto",
    voiceEnabled: true,
    zoom: 1,
    step: 0,
    history: [],
    answers: emptyAnswers(),
    announcement: "",
    side: "front",
    gender: "female",
    angle: 0,
    figureZoom: 1,
    helpOpen: false,
  };
}

function goTo(state: TriageState, step: Step, announcement: string): TriageState {
  return {
    ...state,
    history: [...state.history, state.step],
    step,
    announcement,
  };
}

function toggleList(items: string[], label: string): string[] {
  return items.includes(label) ? items.filter((item) => item !== label) : [...items, label];
}

export function triageReducer(state: TriageState, action: TriageAction): TriageState {
  switch (action.type) {
    case "SELECT_MODE":
      return goTo(
        {
          ...state,
          mode: action.mode,
          zoom: action.mode === "hc" ? 1.2 : 1,
        },
        1,
        "Vamos começar.",
      );
    case "ANSWER": {
      const answers = { ...state.answers, [action.key]: action.value };
      if (action.key === "dor" && action.value === "Não") answers.local = [];
      return goTo(
        { ...state, answers },
        action.nextStep,
        `Você respondeu: ${action.spokenLabel}.`,
      );
    }
    case "SET_INTENSITY":
      return goTo(
        { ...state, answers: { ...state.answers, intensidade: action.value } },
        5,
        `Dor número ${action.value} de 5.`,
      );
    case "TOGGLE_LOCAL": {
      const withoutWholeBody = state.answers.local.filter((item) => item !== WHOLE_BODY);
      return {
        ...state,
        answers: { ...state.answers, local: toggleList(withoutWholeBody, action.label) },
      };
    }
    case "SET_WHOLE_BODY":
      return { ...state, answers: { ...state.answers, local: [WHOLE_BODY] } };
    case "CONTINUE_LOCAL":
      return goTo(
        state,
        4,
        `Local marcado: ${state.answers.local.join(", ")}.`,
      );
    case "TOGGLE_ALERT":
      return {
        ...state,
        answers: {
          ...state.answers,
          alertas: toggleList(state.answers.alertas, action.label),
        },
      };
    case "CONTINUE_ALERTS":
      return goTo(
        state,
        7,
        state.answers.alertas.length
          ? `Sinais marcados: ${state.answers.alertas.join(", ")}.`
          : "Nenhum sinal de alerta.",
      );
    case "SET_SIDE":
      return {
        ...state,
        side: action.side,
        angle: action.side === "front" ? 0 : 180,
      };
    case "SET_GENDER":
      return { ...state, gender: action.gender };
    case "SET_ANGLE": {
      const angle = Math.max(0, Math.min(360, action.angle));
      return {
        ...state,
        angle,
        side: angle >= 90 && angle <= 270 ? "back" : "front",
      };
    }
    case "CHANGE_FIGURE_ZOOM":
      return {
        ...state,
        figureZoom: Math.max(0.75, Math.min(1.6, +(state.figureZoom + action.amount).toFixed(2))),
      };
    case "TOGGLE_THEME": {
      const order: Theme[] = ["auto", "light", "dark"];
      const next = order[(order.indexOf(state.theme) + 1) % order.length];
      return { ...state, theme: next };
    }
    case "INCREASE_TEXT": {
      const zoom = state.zoom >= 1.4 ? 1 : +(state.zoom + 0.2).toFixed(1);
      return { ...state, zoom };
    }
    case "TOGGLE_VOICE":
      return { ...state, voiceEnabled: !state.voiceEnabled };
    case "BACK": {
      if (!state.history.length) return state;
      const history = [...state.history];
      const step = history.pop()!;
      return { ...state, history, step, announcement: "" };
    }
    case "NEW_TRIAGE":
      return {
        ...state,
        step: 0,
        history: [],
        answers: emptyAnswers(),
        announcement: "",
        helpOpen: false,
      };
    case "CORRECT":
      return {
        ...state,
        step: 1,
        history: [0],
        answers: emptyAnswers(),
        announcement: "Vamos corrigir.",
      };
    case "SHOW_FINAL":
      return goTo(state, 8, "Enviado.");
    case "OPEN_HELP":
      return { ...state, helpOpen: true };
    case "CLOSE_HELP":
      return { ...state, helpOpen: false };
  }
}

export function summaryRows(answers: Answers): [string, string][] {
  const rows: [string, string][] = [
    ["Como está", answers.bem || "—"],
    ["Sente dor", answers.dor || "—"],
  ];

  if (answers.dor === "Sim") {
    rows.push(
      ["Onde dói", answers.local.join(", ") || "—"],
      ["Intensidade", `${answers.intensidade ?? "—"} de 5`],
      ["Quando começou", answers.quando || "—"],
    );
  }

  rows.push([
    "Sinais de alerta",
    answers.alertas.length ? answers.alertas.join(", ") : "Nenhum informado",
  ]);
  return rows;
}

export function summarySpokenText(answers: Answers): string {
  return summaryRows(answers)
    .map(([label, value]) => `${label}: ${value}.`)
    .join(" ");
}

export function warningSpokenText(alerts: string[]): string {
  return alerts.length ? `Sinais marcados: ${alerts.join(", ")}.` : "Nenhum sinal de alerta.";
}
