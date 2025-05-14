Below is a “battle-tested” way to add **reliable PDF → chunks → embeddings** to your Next 14 app, keeping the stack lightweight enough for Vercel serverless functions and Supabase Storage / pgvector.

---

## 1. Does Supabase come with a PDF parser?

No.
Supabase gives you:

* **Storage** (S3-compatible bucket) – where the PDF can live
* **Edge / Serverless Functions** – where you *can* run parsing logic
* **pgvector** + SQL/RPC – where you store & search embeddings

…but you still need a Node-side library to turn a PDF into plain text.
So we handle extraction inside a Next.js API/Route Handler or Supabase Function, then push the chunks back to Postgres.

---

## 2. Recommended parser for Node ≥ 20 / 22

| Library                                            | Why it works well on Vercel                                                                                                    | Typical Output                       | Install                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | --------------------------- |
| **`pdf-parse`** (wraps a headless build of pdf.js) | • Pure Node (no DOM shim needed)  <br>• \~400 kB install size  <br>• Works in serverless/Edge                                  | `{ text, numpages, info, metadata }` | `npm i pdf-parse`           |
| **`langchain/document-loaders` → `PdfLoader`**     | Same engine as above but returns ready-made **Document** objects that you can pipe straight into your chunker / embedding loop | `[{ pageContent, metadata }]`        | `npm i langchain pdf-parse` |

I strongly recommend **`pdf-parse`** (or LangChain’s thin wrapper) instead of the raw `pdfjs-dist` build you tried:

* `pdfjs-dist`’s **modern** build expects browser globals like `DOMMatrix`, which is why you saw `ReferenceError: DOMMatrix is not defined`.
* The **legacy** build does run in Node, but adds 3 – 4 MB to your bundle and still needs extra worker plumbing.

---

### Quick extraction example (Next 14 / app router)

```ts
// app/api/scan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import pdf from 'pdf-parse'          //  <-- lightweight, pure Node
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI()
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON!)

export async function POST(req: NextRequest) {
  // 1. Pull the PDF from Supabase Storage (or req.body if just uploaded)
  const { filepath, businessId } = await req.json()
  const { data, error } = await supabase.storage
    .from('docs')
    .download(filepath)

  if (error) return NextResponse.json({ error }, { status: 500 })

  // 2. Extract text
  const dataBuffer = Buffer.from(await data.arrayBuffer())
  const { text } = await pdf(dataBuffer)

  // 3. Chunk (simple sliding window; tweak as needed)
  const CHUNK_SIZE = 1000
  const chunks = text
    .match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? []

  // 4. Embed & upsert
  for (const [i, chunk] of chunks.entries()) {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk
    })

    await supabase
      .from('pdf_chunks')
      .upsert({
        business_id: businessId,
        chunk_index: i,
        content: chunk,
        embedding: embedding.data[0].embedding          // pgvector column
      })
  }

  return NextResponse.json({ success: true, chunks: chunks.length })
}
```

---

## 3. Fixing the runtime errors you posted

| Log message                                                                                    | Root cause                                                                                                                   | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DOMMatrix is not defined` from `pdfjs-dist/build/pdf.mjs`                                     | Browser-only build of pdf.js                                                                                                 | Switch to `pdf-parse` **or** import the legacy build:  <br>`import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'` <br>and polyfill `canvas` – but this is heavier.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `Could not find the function public.match_pdf_chunks(...)`                                     | The Postgres RPC signature you’re calling (`match_count, match_threshold, product_id_filter, query_embedding`) doesn’t exist | 1. Make sure pgvector extension is enabled.  <br>2. Create the function with the exact parameter ordering:  `sql CREATE OR REPLACE FUNCTION public.match_pdf_chunks(   match_count int,   match_threshold float,   p_product_id uuid,   query_embedding vector(1536) ) RETURNS TABLE(id uuid, content text, similarity float) AS $$ SELECT id, content, 1 - (embedding <=> query_embedding) AS similarity FROM pdf_chunks WHERE product_id = p_product_id AND (embedding <=> query_embedding) < match_threshold ORDER BY embedding <=> query_embedding LIMIT match_count; $$ LANGUAGE SQL STABLE;` |
| `punycode module is deprecated`                                                                | Node ≥ 22 warning inside a dependency                                                                                        | Harmless – ignore or pin Node 20 (Vercel default) until the lib updates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `TypeError: Object.defineProperty called on non-object` after switching to `pdfjs-dist/legacy` | Mixed ESM/CJS import inside serverless bundle                                                                                | Again: easiest path is totally avoiding pdf.js and using `pdf-parse`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

---

## 4. Production-grade workflow (scalable & future-proof)

```
Client ➜  Upload PDF
        ➜  Next API Route (/scan)             ➜  pdf-parse
                                             ➜  Chunker
                                             ➜  OpenAI embeddings
                                             ➜  Supabase table (content + pgvector)

Query time
Client ➜  Next API Route (/chat)  ➜  Supabase RPC match_pdf_chunks()
                                   ➜  Top-K chunks
                                   ➜  OpenAI chat completion
```

* **Stateless functions only do lightweight work**. For very large PDFs/many pages, push a message to a queue (e.g. Upstash Redis) and let a background worker handle extraction so you don’t hit Vercel’s 10 s cold-start or 30 s exec limits.
* **Store the original file in Supabase Storage**, not in your repo.
* **Use pgvector** for similarity search; the SQL function above is the only “moving part” you need.

---

## 5. Node version note

Vercel runtime as of May 2025 is Node 20 LTS.
If you run Node 22 locally you can keep doing so, but set `"engines": { "node": "20.x" }` in `package.json` (or the `NODE_VERSION` in `vercel.json`) so your prod build matches Vercel’s environment and you avoid subtle polyfill mismatches.

---

### TL;DR

* **Supabase doesn’t ship a parser** – use **`pdf-parse`** (or LangChain’s `PdfLoader`) inside your API route / function.
* Fix the `DOMMatrix` error by avoiding the browser-only pdf.js build.
* Create the `match_pdf_chunks` RPC with the right signature to remove the `PGRST202` error.
* Stick to Node 20 for deployment; Node 22 is fine locally but be consistent.

Once the above pieces are in place, you’ll have a clean, low-latency PDF-to-vector pipeline that scales to thousands of documents without drowning your serverless functions.
