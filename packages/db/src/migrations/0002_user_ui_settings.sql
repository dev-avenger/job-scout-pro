-- Free-form bag for UI-level settings (LLM provider config, job source
-- toggles, notification prefs) sent by the Settings page.
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS ui_settings jsonb;
