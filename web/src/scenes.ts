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
  // ألوان مأخوذة من اللوحات نفسها
  "0": { img: "cafe", place_fr: "Au café", place_ar: "في المقهى", color: "#c8323f", ink: "#a8242f" },
  A1: { img: "boulangerie", place_fr: "À la boulangerie", place_ar: "عند المخبز", color: "#2f6b50", ink: "#245640" },
  A2: { img: "quais", place_fr: "Sur les quais", place_ar: "على ضفاف السين", color: "#d9822b", ink: "#a85a12" },
  B1: { img: "montmartre", place_fr: "À Montmartre", place_ar: "في مونمارتر", color: "#9a4f8e", ink: "#7c3a72" },
  B2: { img: "eiffel", place_fr: "Au pied de la tour", place_ar: "عند البرج", color: "#3f62b0", ink: "#2f4d92" },
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
