import { describe, expect, it } from "vitest";
import {
  WHOLE_BODY,
  initialState,
  summaryRows,
  triageReducer,
  warningSpokenText,
} from "./domain";
import type { TriageState } from "./domain";

describe("triage flow", () => {
  it("starts with the mode choice and opens the first question after a mode is chosen", () => {
    const initial = initialState();
    const selected = triageReducer(initial, { type: "SELECT_MODE", mode: "kid" });

    expect(initial.step).toBe(0);
    expect(selected.step).toBe(1);
    expect(selected.mode).toBe("kid");
    expect(selected.announcement).toBe("Vamos começar.");
    expect(selected.history).toEqual([0]);
  });

  it("preserves the well answer and sends either feeling answer to the pain question", () => {
    const state = triageReducer(initialState(), { type: "SELECT_MODE", mode: "std" });
    const next = triageReducer(state, {
      type: "ANSWER",
      key: "bem",
      value: "Estou bem",
      nextStep: 2,
      spokenLabel: "Sim, estou bem",
    });

    expect(next.step).toBe(2);
    expect(next.answers.bem).toBe("Estou bem");
    expect(next.announcement).toBe("Você respondeu: Sim, estou bem.");
  });

  it("skips pain details when the answer is no and clears any prior body region", () => {
    const state = {
      ...initialState(),
      step: 2 as const,
      answers: { ...initialState().answers, local: ["Cabeça"] },
    };
    const next = triageReducer(state, {
      type: "ANSWER",
      key: "dor",
      value: "Não",
      nextStep: 6,
      spokenLabel: "Não",
    });

    expect(next.step).toBe(6);
    expect(next.answers.dor).toBe("Não");
    expect(next.answers.local).toEqual([]);
  });

  it("keeps whole-body selection mutually exclusive with named regions", () => {
    let state = triageReducer(initialState(), { type: "SET_WHOLE_BODY" });
    expect(state.answers.local).toEqual([WHOLE_BODY]);

    state = triageReducer(state, { type: "TOGGLE_LOCAL", label: "Peito" });
    expect(state.answers.local).toEqual(["Peito"]);
    state = triageReducer(state, { type: "TOGGLE_LOCAL", label: "Peito" });
    expect(state.answers.local).toEqual([]);
  });

  it("retains pain scale, date, and warning sign answers in the original summary wording", () => {
    let state: TriageState = { ...initialState(), step: 3 };
    state = triageReducer(state, { type: "TOGGLE_LOCAL", label: "Cabeça" });
    state = triageReducer(state, { type: "CONTINUE_LOCAL" });
    state = triageReducer(state, { type: "SET_INTENSITY", value: 7 });
    state = triageReducer(state, {
      type: "ANSWER",
      key: "quando",
      value: "Há alguns dias",
      nextStep: 6,
      spokenLabel: "Há alguns dias",
    });
    state = triageReducer(state, { type: "TOGGLE_ALERT", label: "Falta de ar" });
    state = triageReducer(state, { type: "CONTINUE_ALERTS" });

    expect(state.step).toBe(7);
    expect(state.announcement).toBe("Sinais marcados: Falta de ar.");
    expect(summaryRows({
      ...state.answers,
      bem: "Não estou bem",
      dor: "Sim",
    })).toEqual([
      ["Como está", "Não estou bem"],
      ["Sente dor", "Sim"],
      ["Onde dói", "Cabeça"],
      ["Intensidade", "7 de 10"],
      ["Quando começou", "Há alguns dias"],
      ["Sinais de alerta", "Falta de ar"],
    ]);
  });

  it("speaks the no-alert wording and omits pain details when the patient reports no pain", () => {
    expect(warningSpokenText([])).toBe("Nenhum sinal de alerta.");
    expect(summaryRows({
      ...initialState().answers,
      bem: "Estou bem",
      dor: "Não",
    })).toEqual([
      ["Como está", "Estou bem"],
      ["Sente dor", "Não"],
      ["Sinais de alerta", "Nenhum informado"],
    ]);
  });

  it("supports body orientation, a complete rotation, and bounded figure zoom", () => {
    let state = triageReducer(initialState(), { type: "SET_SIDE", side: "back" });
    expect(state.angle).toBe(180);
    state = triageReducer(state, { type: "SET_ANGLE", angle: 360 });
    expect(state.side).toBe("front");
    expect(state.angle).toBe(360);
    state = triageReducer(state, { type: "CHANGE_FIGURE_ZOOM", amount: 10 });
    expect(state.figureZoom).toBe(1.6);
  });

  it("resets answers for correction and a new triage without losing preferences", () => {
    let state = triageReducer(initialState(), { type: "SELECT_MODE", mode: "hc" });
    state = triageReducer(state, {
      type: "ANSWER",
      key: "bem",
      value: "Estou bem",
      nextStep: 2,
      spokenLabel: "Sim, estou bem",
    });
    state = triageReducer(state, { type: "CORRECT" });
    expect(state.step).toBe(1);
    expect(state.mode).toBe("hc");
    expect(state.answers.bem).toBe("");
    expect(state.history).toEqual([0]);

    state = triageReducer(state, { type: "NEW_TRIAGE" });
    expect(state.step).toBe(0);
    expect(state.mode).toBe("hc");
    expect(state.answers.alertas).toEqual([]);
  });
});
