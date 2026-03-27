export const LOCATION_STORAGE_KEY = "selectedCountry";

export const COUNTRY_OPTIONS = [
  { country: "United Kingdom", code: "GB", currency: "GBP", locale: "en-GB", rateFromGBP: 1 },
  { country: "United States", code: "US", currency: "USD", locale: "en-US", rateFromGBP: 1.28 },
  { country: "India", code: "IN", currency: "INR", locale: "en-IN", rateFromGBP: 106 },
  { country: "Canada", code: "CA", currency: "CAD", locale: "en-CA", rateFromGBP: 1.74 },
  { country: "Australia", code: "AU", currency: "AUD", locale: "en-AU", rateFromGBP: 1.96 },
  { country: "Germany", code: "DE", currency: "EUR", locale: "de-DE", rateFromGBP: 1.17 },
  { country: "France", code: "FR", currency: "EUR", locale: "fr-FR", rateFromGBP: 1.17 },
  { country: "United Arab Emirates", code: "AE", currency: "AED", locale: "en-AE", rateFromGBP: 4.7 },
  { country: "Singapore", code: "SG", currency: "SGD", locale: "en-SG", rateFromGBP: 1.71 }
];

const REGION_TO_COUNTRY = {
  GB: "United Kingdom",
  US: "United States",
  IN: "India",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  AE: "United Arab Emirates",
  SG: "Singapore"
};

const DEFAULT_COUNTRY = "United Kingdom";

export const getCountryConfig = (countryName) => {
  return COUNTRY_OPTIONS.find((item) => item.country === countryName) || COUNTRY_OPTIONS[0];
};

export const detectCountryFromLocale = () => {
  const locale = typeof navigator !== "undefined" ? navigator.language || "" : "";
  const region = locale.split("-")[1]?.toUpperCase();

  if (!region) {
    return DEFAULT_COUNTRY;
  }

  return REGION_TO_COUNTRY[region] || DEFAULT_COUNTRY;
};

export const getSavedCountry = () => {
  const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
  if (!saved) {
    return null;
  }

  const exists = COUNTRY_OPTIONS.some((item) => item.country === saved);
  return exists ? saved : null;
};

export const setSavedCountry = (countryName) => {
  const config = getCountryConfig(countryName);
  localStorage.setItem(LOCATION_STORAGE_KEY, config.country);
  window.dispatchEvent(new CustomEvent("location-currency-change", { detail: config.country }));
  return config.country;
};

export const convertFromGBP = (amount, countryName) => {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) {
    return 0;
  }

  const config = getCountryConfig(countryName);
  return value * config.rateFromGBP;
};

export const formatMoneyFromGBP = (amount, countryName, fractionDigits = 2) => {
  const converted = convertFromGBP(amount, countryName);
  const config = getCountryConfig(countryName);

  const localizedNumber = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(converted);

  return `${config.currency} ${localizedNumber}`;
};
