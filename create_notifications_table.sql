-- =====================================================
-- NOTIFICATIONS TABLE — Lago Realty In-App Notifications
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_tab TEXT,
  link_record_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. Policies: users can only see/update their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Any authenticated user can insert (notifications are created by the system/other users)
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Performance indexes
CREATE INDEX idx_notifications_user_unread 
  ON notifications (user_id, is_read) 
  WHERE is_read = false;

CREATE INDEX idx_notifications_created 
  ON notifications (created_at DESC);

-- 5. Enable Realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
