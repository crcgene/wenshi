// @/components/Annotator/config.ts

export interface AnnotationMark {
  count?: number;
  tags: string[];
}

export interface ParsedAnnotation {
  start: number;
  end: number;
  text: string;
  mark: AnnotationMark;
}

export interface AnnotationTagConfig {
  label: string;
  desc: string;
  group: 'ЧлПред' | 'Служ' | 'ЧасРеч';
}

export const ANNOTATION_TAGS: Record<string, AnnotationTagConfig> = {
  // Таблица 1: Члены предложения
  subj: { label: 'П', desc: 'Подлежащее', group: 'ЧлПред' }, // Subject
  pred: { label: 'Ск', desc: 'Сказуемое', group: 'ЧлПред' }, // Predicate
  obj: { label: 'Д', desc: 'Дополнение', group: 'ЧлПред' }, // Object
  advm: { label: 'Об', desc: 'Обстоятельство', group: 'ЧлПред' }, // Adverbial modifier
  attr: { label: 'Оп', desc: 'Определение', group: 'ЧлПред' }, // Attribute/Modifier
  pattr: { label: 'Оск', desc: 'Определение к сказуемому', group: 'ЧлПред' }, // Predicate attribute
  nom: { label: 'ИЧ', desc: 'Именная часть сказуемого', group: 'ЧлПред' }, // Nominal part of predicate

  // Таблица 2: Части речи служебные
  prep: { label: 'Пр', desc: 'Предлог', group: 'Служ' }, // Preposition
  conj: { label: 'Сз', desc: 'Союз', group: 'Служ' }, // Conjunction
  epart: { label: 'Вч', desc: 'Выделительная частица', group: 'Служ' }, // Excretory particle
  mpart: { label: 'Мч', desc: 'Модальная частица', group: 'Служ' }, // Modal particle
  neg: { label: 'Отр', desc: 'Отрицание', group: 'Служ' }, // Negation
  cop: { label: 'Св', desc: 'Связка', group: 'Служ' }, // Copula

  // Таблица 3: Части речи кроме служебных
  n: { label: 'Cущ', desc: 'Существительное', group: 'ЧасРеч' }, // Noun
  v: { label: 'Гл', desc: 'Глагол', group: 'ЧасРеч' }, // Verb
  adj: { label: 'Прл', desc: 'Прилагательное', group: 'ЧасРеч' }, // Adjective
  adv: { label: 'Нар', desc: 'Наречие', group: 'ЧасРеч' }, // Adverb
  pron: { label: 'Мст', desc: 'Местоимение', group: 'ЧасРеч' }, // Pronoun
  num: { label: 'Чсл', desc: 'Числительное', group: 'ЧасРеч' }, // Numeral
  intrj: { label: 'Мж', desc: 'Междометие', group: 'ЧасРеч' }, // Interjection
} as const;

export type AnnotationTag = keyof typeof ANNOTATION_TAGS;

// Color palette for annotations (15 distinct colors)
export const ANNOTATION_COLORS = [
  "#F44336", // Red
  "#2196F3", // Blue
  "#FF9800", // Orange
  "#9C27B0", // Purple
  "#4CAF50", // Green
  "#E91E63", // Pink
  "#00BCD4", // Cyan
  "#FF5722", // Deep Orange
  "#3F51B5", // Indigo
  "#8BC34A", // Light Green
  "#795548", // Brown
  "#009688", // Teal
  "#FFC107", // Amber
  "#607D8B", // Blue Grey
  "#673AB7", // Deep Purple
];

// Make sure to export everything properly
export default {
  ANNOTATION_TAGS,
  ANNOTATION_COLORS,
};
