-- =====================================================
-- TASK COMMENTS TABLE — Lago Hub Trello Chat History
-- Run this in Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all task comments" 
  ON task_comments FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert comments" 
  ON task_comments FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete own comments" 
  ON task_comments FOR DELETE 
  USING (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_created ON task_comments(created_at ASC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
