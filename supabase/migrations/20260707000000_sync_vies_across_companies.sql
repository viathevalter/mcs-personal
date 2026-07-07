-- Function for AFTER UPDATE trigger: propagates changes to other companies' records sharing same NIF
CREATE OR REPLACE FUNCTION core_common.fn_sync_client_vies_and_details()
RETURNS TRIGGER AS $$
BEGIN
    -- Check trigger depth to avoid infinite recursion loops
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Only sync if general data or VIES data has changed
    IF (OLD.vies_applicable IS DISTINCT FROM NEW.vies_applicable OR
        OLD.vies_status IS DISTINCT FROM NEW.vies_status OR
        OLD.vies_valid IS DISTINCT FROM NEW.vies_valid OR
        OLD.vies_returned_name IS DISTINCT FROM NEW.vies_returned_name OR
        OLD.vies_returned_address IS DISTINCT FROM NEW.vies_returned_address OR
        OLD.vies_request_date IS DISTINCT FROM NEW.vies_request_date OR
        OLD.vies_request_identifier IS DISTINCT FROM NEW.vies_request_identifier OR
        OLD.vies_last_checked_at IS DISTINCT FROM NEW.vies_last_checked_at OR
        OLD.vies_last_checked_by IS DISTINCT FROM NEW.vies_last_checked_by OR
        OLD.vies_requires_review IS DISTINCT FROM NEW.vies_requires_review OR
        OLD.vies_last_error_code IS DISTINCT FROM NEW.vies_last_error_code OR
        OLD.vies_last_error_message IS DISTINCT FROM NEW.vies_last_error_message OR
        OLD.eu_vat_number IS DISTINCT FROM NEW.eu_vat_number OR
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.legal_name IS DISTINCT FROM NEW.legal_name OR
        OLD.trade_name IS DISTINCT FROM NEW.trade_name OR
        OLD.email IS DISTINCT FROM NEW.email OR
        OLD.phone IS DISTINCT FROM NEW.phone OR
        OLD.city IS DISTINCT FROM NEW.city OR
        OLD.province IS DISTINCT FROM NEW.province OR
        OLD.postal_code IS DISTINCT FROM NEW.postal_code OR
        OLD.address_line IS DISTINCT FROM NEW.address_line OR
        OLD.country_id IS DISTINCT FROM NEW.country_id OR
        OLD.region_id IS DISTINCT FROM NEW.region_id)
    THEN
        -- Update other companies' clients that share the same tax_id (NIF)
        UPDATE core_common.clients
        SET 
            vies_applicable = NEW.vies_applicable,
            vies_status = NEW.vies_status,
            vies_valid = NEW.vies_valid,
            vies_returned_name = NEW.vies_returned_name,
            vies_returned_address = NEW.vies_returned_address,
            vies_request_date = NEW.vies_request_date,
            vies_request_identifier = NEW.vies_request_identifier,
            vies_last_checked_at = NEW.vies_last_checked_at,
            vies_last_checked_by = NEW.vies_last_checked_by,
            vies_requires_review = NEW.vies_requires_review,
            vies_last_error_code = NEW.vies_last_error_code,
            vies_last_error_message = NEW.vies_last_error_message,
            eu_vat_number = NEW.eu_vat_number,
            status = NEW.status,
            legal_name = NEW.legal_name,
            trade_name = NEW.trade_name,
            email = NEW.email,
            phone = NEW.phone,
            city = NEW.city,
            province = NEW.province,
            postal_code = NEW.postal_code,
            address_line = NEW.address_line,
            country_id = NEW.country_id,
            region_id = NEW.region_id,
            updated_at = NOW()
        WHERE tax_id = NEW.tax_id
          AND id <> NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop update trigger if exists
DROP TRIGGER IF EXISTS trg_sync_client_vies_and_details ON core_common.clients;

-- Create AFTER UPDATE trigger
CREATE TRIGGER trg_sync_client_vies_and_details
AFTER UPDATE ON core_common.clients
FOR EACH ROW
EXECUTE FUNCTION core_common.fn_sync_client_vies_and_details();


-- Function for BEFORE INSERT trigger: copies existing VIES and general details if same NIF already exists
CREATE OR REPLACE FUNCTION core_common.fn_sync_client_vies_insert()
RETURNS TRIGGER AS $$
DECLARE
    existing_client RECORD;
BEGIN
    -- Check if another client with same NIF exists (prefer active/checked VIES records)
    SELECT * INTO existing_client
    FROM core_common.clients
    WHERE tax_id = NEW.tax_id
      AND id <> NEW.id
    ORDER BY vies_last_checked_at DESC NULLS LAST, status ASC, created_at DESC
    LIMIT 1;

    IF existing_client.id IS NOT NULL THEN
        -- Copy VIES data and general details from the existing record to the new record
        NEW.vies_applicable := existing_client.vies_applicable;
        NEW.vies_status := existing_client.vies_status;
        NEW.vies_valid := existing_client.vies_valid;
        NEW.vies_returned_name := existing_client.vies_returned_name;
        NEW.vies_returned_address := existing_client.vies_returned_address;
        NEW.vies_request_date := existing_client.vies_request_date;
        NEW.vies_request_identifier := existing_client.vies_request_identifier;
        NEW.vies_last_checked_at := existing_client.vies_last_checked_at;
        NEW.vies_last_checked_by := existing_client.vies_last_checked_by;
        NEW.vies_requires_review := existing_client.vies_requires_review;
        NEW.vies_last_error_code := existing_client.vies_last_error_code;
        NEW.vies_last_error_message := existing_client.vies_last_error_message;
        NEW.eu_vat_number := existing_client.eu_vat_number;
        NEW.status := existing_client.status;
        NEW.legal_name := existing_client.legal_name;
        NEW.trade_name := existing_client.trade_name;
        NEW.email := existing_client.email;
        NEW.phone := existing_client.phone;
        NEW.city := existing_client.city;
        NEW.province := existing_client.province;
        NEW.postal_code := existing_client.postal_code;
        NEW.address_line := existing_client.address_line;
        NEW.country_id := existing_client.country_id;
        NEW.region_id := existing_client.region_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop insert trigger if exists
DROP TRIGGER IF EXISTS trg_sync_client_vies_insert ON core_common.clients;

-- Create BEFORE INSERT trigger
CREATE TRIGGER trg_sync_client_vies_insert
BEFORE INSERT ON core_common.clients
FOR EACH ROW
EXECUTE FUNCTION core_common.fn_sync_client_vies_insert();
