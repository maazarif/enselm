CREATE TABLE relay_mailboxes (
  identity TEXT PRIMARY KEY NOT NULL,
  created INTEGER NOT NULL
);
CREATE TABLE relay_grants (
  recipient TEXT NOT NULL,
  sender TEXT NOT NULL,
  PRIMARY KEY (recipient, sender)
);
CREATE TABLE relay_nonces (
  identity TEXT NOT NULL,
  nonce TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (identity, nonce)
);
CREATE INDEX relay_nonces_created ON relay_nonces (created);
CREATE TABLE relay_messages (
  sender TEXT NOT NULL,
  id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  digest TEXT NOT NULL,
  envelope TEXT,
  created INTEGER NOT NULL,
  expires INTEGER NOT NULL,
  PRIMARY KEY (sender, id)
);
CREATE INDEX relay_messages_recipient ON relay_messages (recipient, expires);
CREATE INDEX relay_messages_created ON relay_messages (sender, created);
CREATE INDEX relay_messages_expires ON relay_messages (expires);
