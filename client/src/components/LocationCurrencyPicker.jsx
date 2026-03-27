function LocationCurrencyPicker({
  selectedCountry,
  setSelectedCountry,
  countryOptions,
  currencyCode,
  compact = false
}) {
  return (
    <div className={compact ? "location-picker compact" : "location-picker"}>
      <label>
        Location
        <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)}>
          {countryOptions.map((item) => (
            <option key={item.code} value={item.country}>
              {item.country}
            </option>
          ))}
        </select>
      </label>
      <p className="switch-text">Currency: {currencyCode}</p>
    </div>
  );
}

export default LocationCurrencyPicker;
