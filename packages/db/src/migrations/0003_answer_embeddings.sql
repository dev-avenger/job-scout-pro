-- Store an embedding of each saved answer's question label so semantically
-- similar questions ("Why this role?" vs "Why are you interested?") reuse the
-- same answer instead of paying the LLM again. Nullable: existing rows and
-- runs without an embeddings provider simply skip semantic matching.
ALTER TABLE saved_answers ADD COLUMN IF NOT EXISTS question_embedding jsonb;
