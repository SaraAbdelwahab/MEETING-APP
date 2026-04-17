-- Enterprise Secure Video Platform: Migration 001
-- Creates core tables with append-only protection for audit and integrity records

SET FOREIGN_KEY_CHECKS = 0;

-- 1. session_keys
CREATE TABLE IF NOT EXISTS session_keys (
  id            CHAR(36)     NOT NULL,
  session_id    CHAR(36)     NOT NULL,
  meeting_id    INT          NOT NULL,
  user_id       INT          NOT NULL,
  key_material  BLOB         NOT NULL,
  algorithm     VARCHAR(64)  NOT NULL DEFAULT 'HYBRID_X25519_MLKEM768',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME     NOT NULL,
  rotated_at    DATETIME     NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_id (session_id),
  INDEX idx_meeting_user (meeting_id, user_id),
  CONSTRAINT fk_session_keys_meeting
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_keys_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. device_bindings
CREATE TABLE IF NOT EXISTS device_bindings (
  id                  CHAR(36)     NOT NULL,
  session_id          CHAR(36)     NOT NULL,
  user_id             INT          NOT NULL,
  fingerprint_hash    CHAR(64)     NOT NULL,
  bound_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at          DATETIME     NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_session (session_id),
  INDEX idx_user (user_id),
  CONSTRAINT fk_device_bindings_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. recording_chunks
CREATE TABLE IF NOT EXISTS recording_chunks (
  id            CHAR(36)     NOT NULL,
  recording_id  CHAR(36)     NOT NULL,
  meeting_id    INT          NOT NULL,
  chunk_index   INT          NOT NULL,
  sha256_hash   CHAR(64)     NOT NULL,
  storage_path  VARCHAR(512) NOT NULL,
  duration_ms   INT          NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recording_chunk (recording_id, chunk_index),
  INDEX idx_recording (recording_id),
  CONSTRAINT fk_recording_chunks_meeting
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. recording_merkle_roots (append-only)
CREATE TABLE IF NOT EXISTS recording_merkle_roots (
  id            CHAR(36)     NOT NULL,
  recording_id  CHAR(36)     NOT NULL,
  meeting_id    INT          NOT NULL,
  merkle_root   CHAR(64)     NOT NULL,
  chunk_count   INT          NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recording_id (recording_id),
  INDEX idx_meeting_created (meeting_id, created_at),
  CONSTRAINT fk_merkle_roots_meeting
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS trg_merkle_roots_no_update;
DROP TRIGGER IF EXISTS trg_merkle_roots_no_delete;

DELIMITER $$

CREATE TRIGGER trg_merkle_roots_no_update
BEFORE UPDATE ON recording_merkle_roots
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'recording_merkle_roots is append-only';
END$$

CREATE TRIGGER trg_merkle_roots_no_delete
BEFORE DELETE ON recording_merkle_roots
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'recording_merkle_roots is append-only';
END$$

DELIMITER ;

-- 5. audit_log (append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type              VARCHAR(64)     NOT NULL,
  user_id                 INT             NULL,
  meeting_id              INT             NULL,
  device_fingerprint_hash CHAR(64)        NULL,
  metadata                JSON            NULL,
  created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_user_ts    (user_id, created_at),
  INDEX idx_meeting_ts (meeting_id, created_at),
  INDEX idx_event_ts   (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS trg_audit_log_no_update;
DROP TRIGGER IF EXISTS trg_audit_log_no_delete;

DELIMITER $$

CREATE TRIGGER trg_audit_log_no_update
BEFORE UPDATE ON audit_log
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_log is append-only';
END$$

CREATE TRIGGER trg_audit_log_no_delete
BEFORE DELETE ON audit_log
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_log is append-only';
END$$

DELIMITER ;

-- 6. shadow_sessions
CREATE TABLE IF NOT EXISTS shadow_sessions (
  id                  CHAR(36)     NOT NULL,
  user_id             INT          NOT NULL,
  meeting_id          INT          NOT NULL,
  socket_id           VARCHAR(128) NOT NULL,
  device_fingerprint  CHAR(64)     NOT NULL,
  registered_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_synced_at      DATETIME     NULL,
  is_active           TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  INDEX idx_user_meeting (user_id, meeting_id),
  CONSTRAINT fk_shadow_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_shadow_sessions_meeting
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. session_state_snapshots
CREATE TABLE IF NOT EXISTS session_state_snapshots (
  id                      CHAR(36)     NOT NULL,
  user_id                 INT          NOT NULL,
  meeting_id              INT          NOT NULL,
  mute_state              TINYINT(1)   NOT NULL,
  camera_state            TINYINT(1)   NOT NULL,
  screen_share_state      TINYINT(1)   NOT NULL,
  active_speaker_id       INT          NULL,
  chat_scroll_message_id  VARCHAR(64)  NULL,
  elapsed_ms              BIGINT       NOT NULL,
  captured_at             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_user_meeting_ts (user_id, meeting_id, captured_at),
  CONSTRAINT fk_session_snapshots_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_snapshots_meeting
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. biometric_device_keys
CREATE TABLE IF NOT EXISTS biometric_device_key (
  id            CHAR(36)     NOT NULL,
  user_id       INT          NOT NULL,
  device_id     VARCHAR(128) NOT NULL,
  public_key_jwk JSON        NOT NULL,
  enrolled_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at  DATETIME     NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_device (user_id, device_id),
  CONSTRAINT fk_biometric_device_keys_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;