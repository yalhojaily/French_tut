import curriculumJson from "../../content/curriculum.json";
import type { Curriculum, CurriculumUnit, Stage, Unit } from "./types";

export const curriculum = curriculumJson as Curriculum;

// كل ملف في content/units يصبح وحدة جاهزة تلقائياً، دون تسجيل يدوي
const unitModules = import.meta.glob<Unit>("../../content/units/*.json", {
  eager: true,
  import: "default",
});

export const units: Record<string, Unit> = {};
for (const mod of Object.values(unitModules)) units[mod.id] = mod;

export function isReady(unitId: string): boolean {
  return unitId in units;
}

/** ترتيب كل الوحدات في المنهج من الأولى إلى الأخيرة */
export const unitOrder: { stage: Stage; unit: CurriculumUnit }[] = curriculum.stages.flatMap(
  (stage) => stage.units.map((unit) => ({ stage, unit })),
);

export function findUnit(unitId: string) {
  return unitOrder.find((u) => u.unit.id === unitId);
}
