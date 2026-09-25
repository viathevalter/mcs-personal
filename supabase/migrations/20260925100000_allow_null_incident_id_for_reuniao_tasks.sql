-- Allow incident_id to be nullable so tasks created directly from meetings (reuniao_id) can be inserted without requiring an incident
ALTER TABLE public.mcs_incident_tasks 
ALTER COLUMN incident_id DROP NOT NULL;
