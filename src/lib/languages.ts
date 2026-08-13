export interface LanguageOption {
  code: string;
  name: string;
  native: string;
  flag: string;
  speakers: string;
}

export const TOP_20_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸', speakers: '1.5B' },
  { code: 'zh', name: 'Mandarin Chinese', native: '中文', flag: '🇨🇳', speakers: '1.1B' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', speakers: '600M' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', speakers: '550M' },
  { code: 'ar', name: 'Standard Arabic', native: 'العربية', flag: '🇸🇦', speakers: '330M' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇧🇩', speakers: '275M' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', speakers: '275M' },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺', speakers: '255M' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷', speakers: '260M' },
  { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇵🇰', speakers: '230M' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩', speakers: '200M' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', speakers: '135M' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵', speakers: '125M' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳', speakers: '99M' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳', speakers: '96M' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷', speakers: '88M' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳', speakers: '85M' },
  { code: 'yue', name: 'Cantonese', native: '粵語', flag: '🇭🇰', speakers: '85M' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳', speakers: '85M' },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷', speakers: '82M' },
];
