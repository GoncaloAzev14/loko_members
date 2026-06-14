import { Injectable, signal, computed } from '@angular/core';
import { translations, Lang, TranslationKey } from '../i18n/translations';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly STORAGE_KEY = 'lang';

  lang = signal<Lang>(
    (localStorage.getItem(this.STORAGE_KEY) as Lang | null) ?? 'en'
  );

  private dict = computed(() => translations[this.lang()]);

  t(key: TranslationKey | string, params?: Record<string, string>): string {
    const dict = this.dict() as Record<string, string>;
    let value = dict[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{{${k}}}`, v);
      }
    }
    return value;
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
  }
}
