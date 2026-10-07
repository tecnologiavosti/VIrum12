-- Audit AI related settings in DB
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (table_name ILIKE '%settings%' OR table_name ILIKE '%config%' OR column_name ILIKE '%ai%' OR column_name ILIKE '%provider%' OR column_name ILIKE '%model%');

SELECT * FROM public.seo_settings LIMIT 10;

