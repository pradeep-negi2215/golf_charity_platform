import { useEffect, useMemo, useState } from "react";
import {
  COUNTRY_OPTIONS,
  detectCountryFromLocale,
  formatMoneyFromGBP,
  getCountryConfig,
  getSavedCountry,
  setSavedCountry
} from "../utils/location-currency";

export const useLocationCurrency = () => {
  const [selectedCountry, setSelectedCountryState] = useState(() => {
    return getSavedCountry() || detectCountryFromLocale();
  });

  useEffect(() => {
    const existing = getSavedCountry();
    if (!existing) {
      setSavedCountry(selectedCountry);
    }
  }, [selectedCountry]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === "selectedCountry" && event.newValue) {
        setSelectedCountryState(event.newValue);
      }
    };

    const onLocationChange = (event) => {
      if (event.detail) {
        setSelectedCountryState(event.detail);
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("location-currency-change", onLocationChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("location-currency-change", onLocationChange);
    };
  }, []);

  const updateCountry = (countryName) => {
    const nextCountry = setSavedCountry(countryName);
    setSelectedCountryState(nextCountry);
  };

  const currencyConfig = useMemo(() => getCountryConfig(selectedCountry), [selectedCountry]);

  return {
    selectedCountry,
    setSelectedCountry: updateCountry,
    countryOptions: COUNTRY_OPTIONS,
    currencyCode: currencyConfig.currency,
    formatMoney: (amount, fractionDigits = 2) => formatMoneyFromGBP(amount, selectedCountry, fractionDigits)
  };
};
