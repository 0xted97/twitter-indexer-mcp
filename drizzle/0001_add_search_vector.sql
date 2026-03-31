-- Add tsvector column and GIN index for full-text search
ALTER TABLE tweets ALTER COLUMN search_vector TYPE tsvector USING to_tsvector('english', coalesce(full_text, text, ''));

CREATE INDEX tweets_search_vector_idx ON tweets USING GIN(search_vector);

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION tweets_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.full_text, NEW.text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tweets_search_vector_trigger
  BEFORE INSERT OR UPDATE ON tweets
  FOR EACH ROW EXECUTE FUNCTION tweets_search_vector_update();
