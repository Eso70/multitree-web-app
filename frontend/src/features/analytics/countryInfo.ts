export interface CountryInfo {
  name: string;
  flag: string;
  lat: number;
  lng: number;
}

// Approximate country centroids (for a lightweight world dot-map) plus a
// display name/flag. Not exhaustive — unlisted codes fall back gracefully.
const COUNTRY_INFO: Record<string, CountryInfo> = {
  IQ: { name: "عێراق", flag: "🇮🇶", lat: 33.2, lng: 43.7 },
  TR: { name: "تورکیا", flag: "🇹🇷", lat: 38.9, lng: 35.2 },
  IR: { name: "ئێران", flag: "🇮🇷", lat: 32.4, lng: 53.7 },
  SY: { name: "سووریا", flag: "🇸🇾", lat: 34.8, lng: 38.9 },
  SA: { name: "سعودیە", flag: "🇸🇦", lat: 23.9, lng: 45.1 },
  AE: { name: "ئیمارات", flag: "🇦🇪", lat: 23.4, lng: 53.8 },
  KW: { name: "کوێت", flag: "🇰🇼", lat: 29.3, lng: 47.5 },
  QA: { name: "قەتەر", flag: "🇶🇦", lat: 25.3, lng: 51.2 },
  BH: { name: "بەحرەین", flag: "🇧🇭", lat: 26.0, lng: 50.5 },
  OM: { name: "عومان", flag: "🇴🇲", lat: 21.5, lng: 55.9 },
  JO: { name: "ئوردن", flag: "🇯🇴", lat: 30.6, lng: 36.2 },
  LB: { name: "لوبنان", flag: "🇱🇧", lat: 33.9, lng: 35.9 },
  EG: { name: "میسر", flag: "🇪🇬", lat: 26.8, lng: 30.8 },
  YE: { name: "یەمەن", flag: "🇾🇪", lat: 15.6, lng: 48.0 },
  IL: { name: "ئیسرائیل", flag: "🇮🇱", lat: 31.0, lng: 34.8 },
  PS: { name: "فەلەستین", flag: "🇵🇸", lat: 31.9, lng: 35.2 },
  US: { name: "ئەمریکا", flag: "🇺🇸", lat: 39.8, lng: -98.6 },
  CA: { name: "کەنەدا", flag: "🇨🇦", lat: 56.1, lng: -106.3 },
  GB: { name: "بەریتانیا", flag: "🇬🇧", lat: 55.4, lng: -3.4 },
  DE: { name: "ئەڵمانیا", flag: "🇩🇪", lat: 51.2, lng: 10.5 },
  FR: { name: "فەرەنسا", flag: "🇫🇷", lat: 46.6, lng: 2.2 },
  NL: { name: "هۆڵەندا", flag: "🇳🇱", lat: 52.1, lng: 5.3 },
  SE: { name: "سویدن", flag: "🇸🇪", lat: 60.1, lng: 18.6 },
  NO: { name: "نەرویج", flag: "🇳🇴", lat: 60.5, lng: 8.5 },
  FI: { name: "فینلەند", flag: "🇫🇮", lat: 61.9, lng: 25.7 },
  DK: { name: "دانمارک", flag: "🇩🇰", lat: 56.3, lng: 9.5 },
  IT: { name: "ئیتالیا", flag: "🇮🇹", lat: 41.9, lng: 12.6 },
  ES: { name: "ئیسپانیا", flag: "🇪🇸", lat: 40.5, lng: -3.7 },
  PT: { name: "پورتوگال", flag: "🇵🇹", lat: 39.4, lng: -8.2 },
  BE: { name: "بەلجیکا", flag: "🇧🇪", lat: 50.5, lng: 4.5 },
  CH: { name: "سویسرا", flag: "🇨🇭", lat: 46.8, lng: 8.2 },
  AT: { name: "نەمسا", flag: "🇦🇹", lat: 47.5, lng: 14.6 },
  GR: { name: "یۆنان", flag: "🇬🇷", lat: 39.1, lng: 21.8 },
  PL: { name: "پۆڵەندا", flag: "🇵🇱", lat: 51.9, lng: 19.1 },
  RO: { name: "ڕۆمانیا", flag: "🇷🇴", lat: 45.9, lng: 24.9 },
  RU: { name: "ڕووسیا", flag: "🇷🇺", lat: 61.5, lng: 105.3 },
  UA: { name: "ئۆکرانیا", flag: "🇺🇦", lat: 48.4, lng: 31.2 },
  AU: { name: "ئوسترالیا", flag: "🇦🇺", lat: -25.3, lng: 133.8 },
  NZ: { name: "نیوزیلەندا", flag: "🇳🇿", lat: -41.0, lng: 174.9 },
  IN: { name: "هیندستان", flag: "🇮🇳", lat: 22.4, lng: 78.7 },
  PK: { name: "پاکستان", flag: "🇵🇰", lat: 30.4, lng: 69.3 },
  BD: { name: "بەنگلادیش", flag: "🇧🇩", lat: 23.7, lng: 90.4 },
  AF: { name: "ئەفغانستان", flag: "🇦🇫", lat: 33.9, lng: 67.7 },
  CN: { name: "چین", flag: "🇨🇳", lat: 35.9, lng: 104.2 },
  JP: { name: "ژاپۆن", flag: "🇯🇵", lat: 36.2, lng: 138.3 },
  KR: { name: "کۆریای باشوور", flag: "🇰🇷", lat: 36.5, lng: 127.8 },
  ID: { name: "ئیندۆنیزیا", flag: "🇮🇩", lat: -0.8, lng: 113.9 },
  MY: { name: "مالیزیا", flag: "🇲🇾", lat: 4.2, lng: 101.9 },
  PH: { name: "فیلیپین", flag: "🇵🇭", lat: 12.9, lng: 121.8 },
  TH: { name: "تایلەند", flag: "🇹🇭", lat: 15.9, lng: 100.9 },
  VN: { name: "ڤیەتنام", flag: "🇻🇳", lat: 14.1, lng: 108.3 },
  BR: { name: "بەرازیل", flag: "🇧🇷", lat: -14.2, lng: -51.9 },
  MX: { name: "مەکسیک", flag: "🇲🇽", lat: 23.6, lng: -102.5 },
  AR: { name: "ئەرجەنتین", flag: "🇦🇷", lat: -38.4, lng: -63.6 },
  CO: { name: "کۆڵۆمبیا", flag: "🇨🇴", lat: 4.6, lng: -74.3 },
  CL: { name: "چیلی", flag: "🇨🇱", lat: -35.7, lng: -71.5 },
  ZA: { name: "ئەفریقای باشوور", flag: "🇿🇦", lat: -30.6, lng: 22.9 },
  NG: { name: "نایجیریا", flag: "🇳🇬", lat: 9.1, lng: 8.7 },
  KE: { name: "کینیا", flag: "🇰🇪", lat: -0.0, lng: 37.9 },
  MA: { name: "مەغریب", flag: "🇲🇦", lat: 31.8, lng: -7.1 },
  DZ: { name: "جەزائیر", flag: "🇩🇿", lat: 28.0, lng: 1.7 },
  TN: { name: "توونس", flag: "🇹🇳", lat: 33.9, lng: 9.5 },
  Unknown: { name: "نەزانراو", flag: "🏳️", lat: 15, lng: 0 },
};

const DEFAULT_INFO: CountryInfo = {
  name: "نەزانراو",
  flag: "🏳️",
  lat: 0,
  lng: 0,
};

export function getCountryInfo(code: string): CountryInfo {
  return COUNTRY_INFO[code.toUpperCase()] || COUNTRY_INFO[code] || DEFAULT_INFO;
}
