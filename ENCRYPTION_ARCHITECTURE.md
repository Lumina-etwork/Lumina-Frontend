# End-to-End Encryption Architecture

## Overview

This repository now includes a client-side end-to-end encryption layer for sensitive payload fields. The encryption architecture is designed so that:

- sensitive payload fields are encrypted in the browser before persistence or outbound sync,
- the server never receives plaintext values for encrypted fields,
- decryption is only possible with the client-side session token used to derive the encryption key,
- the encryption envelope preserves versioning, IV, and salt metadata.

## Key Derivation

A 256-bit AES-GCM key is derived from the active user session token using PBKDF2.

- The root PBKDF2 salt is deterministic by default, so the same session token produces the same key across app reloads.
- The derived key is non-extractable and kept in memory only.
- The key derivation parameters are deliberate for client-side security and reuse across the session.

## Envelope Format

Each encrypted field is stored as an `EncryptedEnvelope` structure:

- `iv`: a unique AES-GCM IV per encryption operation,
- `salt`: a Base64-encoded salt used for key derivation,
- `ciphertext`: Base64-encoded AES-GCM ciphertext,
- `version`: envelope version for future migration.

## Schema-Based Payload Encryption

Sensitive fields are encoded via a schema-driven payload transformation.

- `encryptSensitiveObject()` walks payloads and encrypts fields marked `true` in the schema.
- `decryptSensitiveObject()` restores plaintext values from envelopes using a session key.
- The schema supports nested object structures for future expansion.

## Current Implementation

The primary encryption integration is:

- `src/lib/crypto/cryptoEngine.ts`
  - key derivation
  - field encryption and decryption
  - schema-aware payload transformation helpers
- `src/hooks/useNodeConfig.ts`
  - encrypts sensitive node configuration fields before IndexedDB persistence
  - decrypts persisted configuration while loading

## Backwards Compatibility

The engine supports decryption with an envelope-embedded salt, so older or migrated envelopes can still be recovered if the same session token is present.

## Monitoring and Runbook Notes

For production deployments, the following monitoring and alerting strategy is recommended:

- instrument client-side encryption failure rates as telemetry events,
- create dashboard widgets for encryption error spikes,
- alert when decryption failures exceed a low threshold or when bogus envelope formats are observed,
- include recovery instructions for operators to inspect affected session tokens and rotate keys if needed.

## Security Notes

- Sensitive plaintext fields are wiped from application state after encryption.
- The server-side telemetry endpoint remains separate from encrypted field persistence.
- The architecture is intended for browser-based client-side confidentiality, not server-side secret management.
