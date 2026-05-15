// Country flags are reused across newspaper and calendar views, so keep the
// mapping in one shared module instead of copying it into render-specific code.
export const COUNTRY_FLAGS = {
  "Argentina": "🇦🇷",
  "Australia": "🇦🇺",
  "Austria": "🇦🇹",
  "Belgium": "🇧🇪",
  "Bolivia": "🇧🇴",
  "Brazil": "🇧🇷",
  "Bulgaria": "🇧🇬",
  "CANADA": "🇨🇦",
  "Canada": "🇨🇦",
  "Catalonia": "🏴",
  "China": "🇨🇳",
  "Colombia": "🇨🇴",
  "Croatia": "🇭🇷",
  "Czech Republic": "🇨🇿",
  "Denmark": "🇩🇰",
  "Egypt": "🇪🇬",
  "Finland": "🇫🇮",
  "France": "🇫🇷",
  "Germany": "🇩🇪",
  "Hong Kong": "🇭🇰",
  "Hungary": "🇭🇺",
  "India": "🇮🇳",
  "Ireland": "🇮🇪",
  "Israel": "🇮🇱",
  "Italy": "🇮🇹",
  "Latvia": "🇱🇻",
  "Luxembourg": "🇱🇺",
  "Mexico": "🇲🇽",
  "Nepal": "🇳🇵",
  "Netherlands": "🇳🇱",
  "New Zealand": "🇳🇿",
  "Nigeria": "🇳🇬",
  "Norway": "🇳🇴",
  "Pakistan": "🇵🇰",
  "Poland": "🇵🇱",
  "Romania": "🇷🇴",
  "Russian Federation": "🇷🇺",
  "Slovenia": "🇸🇮",
  "South Africa": "🇿🇦",
  "Spain": "🇪🇸",
  "Sweden": "🇸🇪",
  "Switzerland": "🇨🇭",
  "Togo": "🇹🇬",
  "Türkiye": "🇹🇷",
  "Ukraine": "🇺🇦",
  "USA": "🇺🇸",
  "United Kingdom": "🇬🇧",
  "United States of America": "🇺🇸",
};

export function getCountryFlag(countryName) {
  if (!countryName) {
    return null;
  }

  return COUNTRY_FLAGS[countryName] || null;
}
