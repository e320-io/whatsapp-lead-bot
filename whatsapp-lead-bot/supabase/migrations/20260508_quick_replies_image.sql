alter table quick_replies
  add column if not exists image_url text,
  alter column content drop not null;
