import React from 'react';
import { Combobox } from '@/components/ui/combobox';
import { useCountries, useRegions } from '../hooks/useLocations';
import { SPAIN_COUNTRY_ID } from '../api/locationsApi';

interface CountrySelectorProps {
  value: string | null;
  onChange: (value: string | null, countryName?: string) => void;
  className?: string;
}

export function CountrySelector({ value, onChange, className }: CountrySelectorProps) {
  const { data: countries = [], isLoading } = useCountries();

  // Resolve ID se o valor passado for o nome (ex: 'España')
  const matchedCountry = countries.find(c => c.id === value || c.name.toLowerCase() === (value || '').toLowerCase());
  const selectedId = matchedCountry ? matchedCountry.id : value;

  const options = countries.map(country => ({
    value: country.id,
    label: country.name,
  }));

  return (
    <Combobox
      options={options}
      value={selectedId}
      onChange={(val) => {
        const found = countries.find(c => c.id === val);
        onChange(val, found?.name);
      }}
      placeholder={isLoading ? "Carregando..." : "Selecione o País..."}
      emptyText="Nenhum país encontrado."
      className={className}
    />
  );
}

interface RegionSelectorProps {
  countryId?: string | null;
  countryName?: string | null;
  value: string | null;
  onChange: (value: string | null, regionName?: string) => void;
  className?: string;
  disabled?: boolean;
}

export function RegionSelector({ countryId, countryName, value, onChange, className, disabled }: RegionSelectorProps) {
  const { data: countries = [] } = useCountries();

  // Resolve countryId a partir de countryName se necessário
  let resolvedCountryId = countryId;
  if (!resolvedCountryId && countryName) {
    const foundC = countries.find(c => c.name.toLowerCase() === countryName.toLowerCase() || (countryName.toLowerCase().includes('espa') && c.name.includes('Espa')));
    if (foundC) resolvedCountryId = foundC.id;
  }
  if (!resolvedCountryId) resolvedCountryId = SPAIN_COUNTRY_ID;

  const { data: regions = [], isLoading } = useRegions(resolvedCountryId || undefined);

  // Resolve ID se o valor passado for o nome (ex: 'Girona')
  const matchedRegion = regions.find(r => r.id === value || r.name.toLowerCase() === (value || '').toLowerCase());
  const selectedId = matchedRegion ? matchedRegion.id : value;

  const options = regions.map(region => ({
    value: region.id,
    label: region.name,
  }));

  const isDisabled = disabled || !resolvedCountryId;

  return (
    <div className="flex flex-col gap-1">
      <Combobox
        options={options}
        value={selectedId}
        onChange={(val) => {
          const found = regions.find(r => r.id === val);
          onChange(val, found?.name);
        }}
        placeholder={isDisabled ? "Selecione o País primeiro" : isLoading ? "Carregando..." : "Selecione a Província..."}
        emptyText="Nenhuma província encontrada."
        className={className}
      />
    </div>
  );
}
