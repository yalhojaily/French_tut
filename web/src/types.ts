// أنواع المحتوى: تطابق بنية ملفات content/*.json

export interface CurriculumUnit {
  id: string;
  title_fr: string;
  title_ar: string;
  can_do_ar: string;
  grammar: string[];
  vocab_ar: string[];
  pronunciation: string;
}

export interface Stage {
  id: string;
  cefr: string;
  name_ar: string;
  name_fr: string;
  hours: string;
  description_ar: string;
  units: CurriculumUnit[];
}

export interface Curriculum {
  title_ar: string;
  title_fr: string;
  note_ar: string;
  stages: Stage[];
}

/** أي عنصر يمكن نطقه: له معرّف ونص فرنسي */
export interface Speakable {
  id: string;
  say: string;
  slow?: boolean;
  voice?: string;
}

export interface DialogueLine extends Speakable {
  speaker: string;
  ar: string;
}

export interface DialogueSection {
  type: "dialogue";
  key: string;
  title_ar: string;
  context_ar: string;
  speakers: Record<string, { name_ar: string; voice: string }>;
  lines: DialogueLine[];
  tip_ar?: string;
}

export interface Word extends Speakable {
  ar: string;
}

export interface LetterItem extends Speakable {
  letter: string;
  ipa: string;
  ar_hint: string;
  example: Word;
  note_ar?: string;
  tricky?: boolean;
}

export interface LettersSection {
  type: "letters";
  key: string;
  title_ar: string;
  hint_ar: string;
  items: LetterItem[];
}

export interface AccentItem extends Speakable {
  mark: string;
  name_fr: string;
  name_ar: string;
  effect_ar: string;
  examples: Word[];
}

export interface AccentsSection {
  type: "accents";
  key: string;
  title_ar: string;
  hint_ar: string;
  items: AccentItem[];
}

export interface ListenItem extends Speakable {
  options: string[];
  answer: string;
  explain_ar: string;
}

export interface ListenSection {
  type: "listen_choice";
  key: string;
  title_ar: string;
  hint_ar: string;
  items: ListenItem[];
}

export interface SpellingItem extends Speakable {
  answer: string;
  ar: string;
}

export interface SpellingSection {
  type: "spelling";
  key: string;
  title_ar: string;
  hint_ar: string;
  items: SpellingItem[];
}

export interface ShadowingSection {
  type: "shadowing";
  key: string;
  title_ar: string;
  hint_ar: string;
  items: Word[];
  task_ar?: string;
}

export interface FlashCard extends Speakable {
  front: string;
  back_ar: string;
}

export interface FlashcardsSection {
  type: "flashcards";
  key: string;
  title_ar: string;
  hint_ar: string;
  cards: FlashCard[];
}

export type Section =
  | DialogueSection
  | LettersSection
  | AccentsSection
  | ListenSection
  | SpellingSection
  | ShadowingSection
  | FlashcardsSection;

export interface Unit {
  id: string;
  stage: string;
  title_fr: string;
  title_ar: string;
  goals_ar: string[];
  intro_ar: string[];
  sections: Section[];
}
