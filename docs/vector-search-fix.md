# Vector Search Function Overloading Fix

## Problem

We encountered an error with the PostgreSQL vector search function when having two `match_pdf_chunks` functions with different parameter signatures:

```
[API] Error with vector search: {
  code: 'PGRST203',
  details: null,
  hint: 'Try renaming the parameters or the function itself in the database so function overloading can be resolved',
  message: 'Could not choose the best candidate function between: public.match_pdf_chunks(query_embedding => public.vector, match_threshold => double precision, match_count => integer), public.match_pdf_chunks(query_embedding => public.vector, match_threshold => double precision, match_count => integer, p_product_id => uuid)'
}
```

This is a common issue with PostgreSQL function overloading when using PostgREST (which Supabase uses). When two functions have the same name but different parameters, PostgREST may not be able to determine which one to call.

## Solution

We implemented a multi-part solution:

1. Created distinct function names for each use case:
   - `match_pdf_chunks_all` - Searches across all products
   - `match_pdf_chunks_by_product` - Filters by product ID

2. Maintained a backward-compatible `match_pdf_chunks` function with a default parameter value for `p_product_id`.

3. Updated all function call sites to use the appropriate named function.

## SQL Migration

The SQL migration script in `scripts/fix-match-pdf-chunks.sql` contains the following changes:

1. Drops the existing overloaded functions
2. Creates specific named functions for each case
3. Creates a backward-compatible function with default parameter

## Code Changes

Updated the following:

1. `utils/vectorDB.ts` - Uses the specific function name based on whether a product ID is provided
2. `app/api/iqr/chat/route.ts` - Uses `match_pdf_chunks_all` when not filtering by product

## Running the Migration

To apply the SQL changes to your Supabase database:

```bash
# Option 1: Use Supabase CLI
supabase db push --db-url=your_supabase_db_url scripts/fix-match-pdf-chunks.sql

# Option 2: Run through the Supabase Dashboard SQL Editor
# Copy the contents of scripts/fix-match-pdf-chunks.sql and paste into the SQL Editor
```

## Testing

After applying these changes, the vector search should work correctly without the function overloading error. 