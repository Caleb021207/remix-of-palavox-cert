
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { it } from './it';
import { pt } from './pt';
import { zh } from './zh';
import { ja } from './ja';
import { ko } from './ko';
import { ru } from './ru';
import { ar } from './ar';
import { hi } from './hi';
import { vi } from './vi';
import { uk } from './uk';
import { id } from './id';
import { fa } from './fa';
import { ur } from './ur';
import { ps } from './ps';
import { sw } from './sw';

export const translations = {
  en,
  es,
  fr,
  de,
  it,
  pt,
  zh,
  ja,
  ko,
  ru,
  ar,
  hi,
  vi,
  uk,
  id,
  fa,
  ur,
  ps,
  sw
};

export type Language = keyof typeof translations;
export type TranslationKeys = typeof en;
