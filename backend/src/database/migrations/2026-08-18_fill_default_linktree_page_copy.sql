-- Fills in the copy that `POST /linktrees/default` used to leave empty.
--
-- The server-side seeder wrote only the name, image, colours and footer, so a
-- business default page arrived with no helper text and no WhatsApp prompts,
-- while a page built in the link editor arrived with both. On the pages list
-- that read as a half-filled card next to a complete one.
--
-- `createDefaultLinktree` seeds these now. This backfills the pages created
-- before it did.
--
-- Only empty columns are touched: a business that wrote its own helper text
-- keeps it. `subtitle` is deliberately left alone — the editor's default for it
-- is the empty string, so there is nothing to fill.
--
-- `footer_text` is also left alone. The old seeder put the business name there
-- instead of the footer credit, but that is live page content on pages the
-- owner may have since reviewed; rewriting it would change what visitors see.
--
-- Idempotent: a second run matches nothing.

UPDATE public.linktrees
   SET description = 'بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە',
       updated_at = now()
 WHERE is_default = true
   AND coalesce(btrim(description), '') = '';

-- The same starter prompts the editor seeds, for default pages that have no
-- questions at all. A page with even one question is left untouched.
INSERT INTO public.whatsapp_questions (linktree_id, question_text, message, display_order)
SELECT lt.id, seed.question_text, seed.message, seed.display_order
  FROM public.linktrees lt
 CROSS JOIN (
        VALUES ('داواکردن', 'سڵاو بەڕێز دەمەوێت داوا بکەم.', 0),
               ('زانینی نرخ', 'سڵاو بەڕێز، نرخی چەندە ؟', 1),
               ('پرسیارێکی تر', 'سڵاو', 2)
       ) AS seed(question_text, message, display_order)
 WHERE lt.is_default = true
   AND NOT EXISTS (
         SELECT 1 FROM public.whatsapp_questions q WHERE q.linktree_id = lt.id
       );
