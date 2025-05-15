-- Drop the existing functions if they exist
DROP FUNCTION IF EXISTS public.match_pdf_chunks(query_embedding vector, match_threshold double precision, match_count integer);
DROP FUNCTION IF EXISTS public.match_pdf_chunks(query_embedding vector, match_threshold double precision, match_count integer, p_product_id uuid);

-- Create a function that searches across all products
CREATE OR REPLACE FUNCTION public.match_pdf_chunks_all(
    query_embedding vector,
    match_threshold double precision,
    match_count integer
) 
RETURNS TABLE(
    id int,
    product_id uuid,
    content text,
    similarity double precision,
    metadata jsonb
) 
AS $$
SELECT 
    id,
    product_id,
    content,
    1 - (embedding <=> query_embedding) AS similarity,
    metadata
FROM 
    pdf_chunks
WHERE 
    embedding IS NOT NULL AND
    (embedding <=> query_embedding) < match_threshold
ORDER BY 
    embedding <=> query_embedding
LIMIT 
    match_count;
$$ LANGUAGE SQL STABLE;

-- Create a function that searches for a specific product
CREATE OR REPLACE FUNCTION public.match_pdf_chunks_by_product(
    query_embedding vector,
    match_threshold double precision,
    match_count integer,
    p_product_id uuid
) 
RETURNS TABLE(
    id int,
    product_id uuid,
    content text,
    similarity double precision,
    metadata jsonb
) 
AS $$
SELECT 
    id,
    product_id,
    content,
    1 - (embedding <=> query_embedding) AS similarity,
    metadata
FROM 
    pdf_chunks
WHERE 
    embedding IS NOT NULL AND
    (p_product_id IS NULL OR product_id = p_product_id) AND
    (embedding <=> query_embedding) < match_threshold
ORDER BY 
    embedding <=> query_embedding
LIMIT 
    match_count;
$$ LANGUAGE SQL STABLE;

-- Create a backward-compatible function that calls the appropriate function based on parameters
CREATE OR REPLACE FUNCTION public.match_pdf_chunks(
    query_embedding vector,
    match_threshold double precision,
    match_count integer,
    p_product_id uuid DEFAULT NULL
) 
RETURNS TABLE(
    id int,
    product_id uuid,
    content text,
    similarity double precision,
    metadata jsonb
) 
AS $$
    SELECT * FROM public.match_pdf_chunks_by_product(
        query_embedding, 
        match_threshold, 
        match_count, 
        p_product_id
    );
$$ LANGUAGE SQL STABLE; 