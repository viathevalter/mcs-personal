
import { Combobox } from '@/components/ui/combobox';
import { useCountries, useRegions } from '../hooks/useLocations';

interface CountrySelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function CountrySelector({ value, onChange, className }: CountrySelectorProps) {
  const { data: countries = [], isLoading } = useCountries();

  const options = countries.map(country => ({
    value: country.id,
    label: country.name,
  }));

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={isLoading ? "Carregando..." : "Selecione o País..."}
      emptyText="Nenhum país encontrado."
      className={className}
    />
  );
}

interface RegionSelectorProps {
  countryId?: string | null;
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  disabled?: boolean;
}

export function RegionSelector({ countryId, value, onChange, className, disabled }: RegionSelectorProps) {
  const { data: regions = [], isLoading } = useRegions(countryId || undefined);

  const options = regions.map(region => ({
    value: region.id,
    label: region.name,
  }));

  const isDisabled = disabled || !countryId;

  return (
    <div className="flex flex-col gap-2">
      <Combobox
        options={options}
        value={value}
        onChange={onChange}
        placeholder={isDisabled ? "Selecione o País primeiro" : isLoading ? "Carregando..." : "Selecione a Região..."}
        emptyText={
          countryId 
            ? "Este país ainda não possui regiões cadastradas. Use o campo Província/Cidade para detalhar o endereço ou peça ao administrador para cadastrar regiões." 
            : "Nenhuma região encontrada."
        }
        className={className}
      />
      {countryId && !isLoading && regions.length === 0 && (
        <span className="text-[11px] text-amber-600 dark:text-amber-500 leading-tight">
          Este país ainda não possui regiões cadastradas. Use Província/Cidade ou peça ao administrador.
        </span>
      )}
    </div>
  );
}
