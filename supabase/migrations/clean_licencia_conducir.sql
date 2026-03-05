-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.clean_licencia_conducir_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the value is not null and looks like the SharePoint JSON payload
  IF NEW.licencia_conducir IS NOT NULL AND NEW.licencia_conducir LIKE '{%odata.type%' THEN
    BEGIN
      -- Try to parse as JSON and extract the "Value"
      NEW.licencia_conducir := (NEW.licencia_conducir::json)->>'Value';
    EXCEPTION WHEN OTHERS THEN
      -- If parsing fails, just keep the original value (silently ignore the error)
      -- This acts as a safe fallback.
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to the table
DROP TRIGGER IF EXISTS trg_clean_licencia_conducir ON public.colaboradores;
CREATE TRIGGER trg_clean_licencia_conducir
BEFORE INSERT OR UPDATE OF licencia_conducir ON public.colaboradores
FOR EACH ROW
EXECUTE FUNCTION public.clean_licencia_conducir_trigger_fn();

-- 3. Update existing records
UPDATE public.colaboradores
SET 
  -- We parse as JSON and extract "Value".
  -- We only do this where it matches the SharePoint pattern.
  licencia_conducir = (licencia_conducir::json)->>'Value'
WHERE 
  licencia_conducir IS NOT NULL 
  AND licencia_conducir LIKE '{%odata.type%';
