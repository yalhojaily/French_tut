// لكل مرحلة مكان في باريس: لوحة مائية، ولون، واسم المكان بالفرنسية.

export interface Scene {
  img: string;
  place_fr: string;
  place_ar: string;
  /** اللون الزاهي للمرحلة، ولون أغمق منه للنصوص */
  color: string;
  ink: string;
  /** لون النص فوق اللون الزاهي */
  on?: string;
}

const BASE = import.meta.env.BASE_URL;

export const SCENES: Record<string, Scene> = {
  "0": { img: "cafe", place_fr: "Au café", place_ar: "في المقهى", color: "#e8445f", ink: "#c22a47" },
  A1: { img: "boulangerie", place_fr: "À la boulangerie", place_ar: "عند المخبز", color: "#f2a10c", ink: "#a86600", on: "#3b2400" },
  A2: { img: "quais", place_fr: "Sur les quais", place_ar: "على ضفاف السين", color: "#0fa39c", ink: "#0a7a74" },
  B1: { img: "montmartre", place_fr: "À Montmartre", place_ar: "في مونمارتر", color: "#7a5ae0", ink: "#5b3cc4" },
  B2: { img: "eiffel", place_fr: "Au pied de la tour", place_ar: "عند البرج", color: "#2f7fe0", ink: "#1f5fb5" },
};

export function sceneOf(stageId: string): Scene {
  return SCENES[stageId] ?? SCENES["0"];
}

export function artUrl(name: string): string {
  return `${BASE}art/${name}.webp`;
}

/** متغيرات CSS لون المرحلة */
export function stageStyle(stageId: string): string {
  const s = sceneOf(stageId);
  return `--stage:${s.color};--stage-deep:${s.ink};--on-stage:${s.on ?? "#fff"}`;
}
