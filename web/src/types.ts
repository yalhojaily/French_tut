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
  /** معنى كل كلمة أو تعبير، بترتيب الجملة: [النص الفرنسي، المعنى] */
  gloss?: [string, string][];
}

export interface DialogueSection extends SectionBase {
  type: "dialogue";
  context_ar: string;
  speakers: Record<string, { name_ar: string; voice: string }>;
  lines: DialogueLine[];
  tip_ar?: string;
}

export interface Word extends Speakable {
  ar: string;
  /** معنى كل كلمة أو تعبير (لجمل الترديد) */
  gloss?: [string, string][];
}

export interface LetterItem extends Speakable {
  letter: string;
  ipa: string;
  ar_hint: string;
  example: Word;
  note_ar?: string;
  tricky?: boolean;
}

/** حقول اختيارية مشتركة: اسم قصير في شريط الأقسام */
interface SectionBase {
  key: string;
  title_ar: string;
  short_ar?: string;
}

export interface LettersSection extends SectionBase {
  type: "letters";
  hint_ar: string;
  play_all_ar?: string;
  items: LetterItem[];
}

export interface AccentItem extends Speakable {
  mark: string;
  name_fr: string;
  name_ar: string;
  effect_ar: string;
  examples: Word[];
}

export interface AccentsSection extends SectionBase {
  type: "accents";
  hint_ar: string;
  items: AccentItem[];
}

export interface ListenItem extends Speakable {
  options: string[];
  answer: string;
  explain_ar: string;
}

export interface ListenSection extends SectionBase {
  type: "listen_choice";
  hint_ar: string;
  prompt_ar?: string;
  start_ar?: string;
  items: ListenItem[];
}

export interface SpellingItem extends Speakable {
  answer: string;
  ar: string;
}

export interface SpellingSection extends SectionBase {
  type: "spelling";
  hint_ar: string;
  prompt_ar?: string;
  start_ar?: string;
  /** إظهار معنى الكلمة قبل الإجابة (للإملاء بكلمات كاملة) */
  show_meaning?: boolean;
  result_ar?: string;
  items: SpellingItem[];
}

export interface ShadowingSection extends SectionBase {
  type: "shadowing";
  hint_ar: string;
  items: Word[];
  task_ar?: string;
}

export interface FlashCard extends Speakable {
  front: string;
  back_ar: string;
}

export interface FlashcardsSection extends SectionBase {
  type: "flashcards";
  hint_ar: string;
  cards: FlashCard[];
}

/** قائمة مفردات مقسّمة إلى مجموعات */
export interface VocabItem extends Speakable {
  /** النص المعروض إن اختلف عن المنطوق */
  fr?: string;
  ar: string;
  note_ar?: string;
}

export interface VocabSection extends SectionBase {
  type: "vocab";
  hint_ar: string;
  groups: { title_ar: string; items: VocabItem[] }[];
}

/** جدول قواعد (تصريف فعل مثلاً) مع نقاط شرح */
export interface GrammarRow extends Speakable {
  cells: string[];
  ar: string;
}

export interface GrammarSection extends SectionBase {
  type: "grammar";
  intro_ar: string;
  tables: { title_fr: string; title_ar: string; head_ar: string[]; rows: GrammarRow[]; note_ar?: string }[];
  points_ar?: string[];
}

/** اختر الكلمة الناقصة: جملة فيها ___ وخيارات */
export interface FillItem extends Speakable {
  text: string;
  options: string[];
  answer: string;
  ar: string;
  explain_ar: string;
  /** سياق قبل الجملة: لمن تقولها مثلاً */
  context_ar?: string;
}

export interface FillSection extends SectionBase {
  type: "fill_choice";
  hint_ar: string;
  items: FillItem[];
}

export type Section =
  | VocabSection
  | GrammarSection
  | FillSection
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
