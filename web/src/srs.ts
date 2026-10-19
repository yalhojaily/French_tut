// المراجعة المتباعدة بخوارزمية FSRS (مكتبة ts-fsrs)

import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";
import { load, save } from "./store";
import type { FlashCard } from "./types";

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));

interface StoredCard {
  unitId: string;
  card: FlashCard;
  state: Card;
}

type Deck = Record<string, StoredCard>;

function loadDeck(): Deck {
  const deck = load<Deck>("srs", {});
  // JSON يحوّل التواريخ إلى نصوص، فنعيدها تواريخ
  for (const entry of Object.values(deck)) {
    entry.state.due = new Date(entry.state.due);
    if (entry.state.last_review) entry.state.last_review = new Date(entry.state.last_review);
  }
  return deck;
}

const keyOf = (unitId: string, cardId: string) => `${unitId}:${cardId}`;

/** إضافة بطاقات وحدة إلى المراجعة (البطاقات الموجودة لا تتأثر). تعيد عدد البطاقات الجديدة. */
export function addCards(unitId: string, cards: FlashCard[]): number {
  const deck = loadDeck();
  let added = 0;
  for (const card of cards) {
    const key = keyOf(unitId, card.id);
    if (deck[key]) {
      deck[key].card = card; // تحديث النص إن تغيّر المحتوى
      continue;
    }
    deck[key] = { unitId, card, state: createEmptyCard(new Date()) };
    added++;
  }
  save("srs", deck);
  return added;
}

export function isInDeck(unitId: string, cardId: string): boolean {
  return keyOf(unitId, cardId) in loadDeck();
}

export interface DueCard {
  key: string;
  unitId: string;
  card: FlashCard;
}

export function dueCards(now = new Date()): DueCard[] {
  return Object.entries(loadDeck())
    .filter(([, e]) => e.state.due <= now)
    .sort(([, a], [, b]) => a.state.due.getTime() - b.state.due.getTime())
    .map(([key, e]) => ({ key, unitId: e.unitId, card: e.card }));
}

export function deckStats(now = new Date()) {
  const entries = Object.values(loadDeck());
  return {
    total: entries.length,
    due: entries.filter((e) => e.state.due <= now).length,
    // بطاقة «ثابتة» إن كانت فترتها التالية أسبوعاً أو أكثر
    mature: entries.filter((e) => e.state.scheduled_days >= 7).length,
  };
}

export const grades: { rating: Grade; label: string; tone: string }[] = [
  { rating: Rating.Again, label: "نسيت", tone: "again" },
  { rating: Rating.Hard, label: "صعبة", tone: "hard" },
  { rating: Rating.Good, label: "جيدة", tone: "good" },
  { rating: Rating.Easy, label: "سهلة", tone: "easy" },
];

/** متى ستظهر البطاقة مجدداً لكل تقييم (لعرضه على الأزرار) */
export function previewIntervals(key: string, now = new Date()): Record<number, string> {
  const entry = loadDeck()[key];
  const out: Record<number, string> = {};
  if (!entry) return out;
  const preview = scheduler.repeat(entry.state, now);
  for (const g of grades) out[g.rating] = humanInterval(preview[g.rating].card.due.getTime() - now.getTime());
  return out;
}

export function review(key: string, rating: Grade, now = new Date()) {
  const deck = loadDeck();
  const entry = deck[key];
  if (!entry) return;
  entry.state = scheduler.next(entry.state, now, rating).card;
  save("srs", deck);
}

function humanInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} د`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} س`;
  const days = Math.round(hours / 24);
  if (days < 31) return days === 1 ? "يوم" : `${days} يوم`;
  const months = Math.round(days / 30);
  return months === 1 ? "شهر" : `${months} شهر`;
}
