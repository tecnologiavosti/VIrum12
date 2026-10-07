-- 1. Check if table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'diagnoses';

-- 2. Check Primary Key
SELECT
    a.attname AS column_name
FROM
    pg_index i
JOIN
    pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE
    i.indrelid = 'public.diagnoses'::regclass
    AND i.indisprimary;

-- 3. Check Foreign Keys
SELECT
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.key_column_usage AS kcu
JOIN 
    information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = kcu.constraint_name
WHERE 
    kcu.table_name = 'diagnoses' 
    AND kcu.table_schema = 'public';

-- 4. Check Indices
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename = 'diagnoses';

-- 5. Check RLS
SELECT 
    relname, 
    relrowsecurity 
FROM 
    pg_class 
WHERE 
    oid = 'public.diagnoses'::regclass;

SELECT * FROM pg_policies WHERE tablename = 'diagnoses';

-- 6. Check Grants
SELECT 
    grantee, 
    privilege_type 
FROM 
    information_schema.role_table_grants 
WHERE 
    table_name = 'diagnoses' 
    AND table_schema = 'public';

-- 7. Count records
SELECT count(*) FROM public.diagnoses;
