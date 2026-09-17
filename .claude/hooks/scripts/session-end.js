#!/usr/bin/env node
/**
 * SessionEnd Hook - Persist session state
 *
 * Runs when a Claude session ends. Saves state for continuity
 * across sessions.
 */

const path = require('path');
const {
  getSessionsDir,
  getDateString,
  getDateTimeString,
  shortId,
  ensureDir,
  appendFile,
  readHookInput,
  pruneFiles,
  log,
  isHookDisabled
} = require('./utils');

async function main() {
  if (isHookDisabled('session-end')) process.exit(0);
  const input = readHookInput();
  const sessionsDir = getSessionsDir();
  ensureDir(sessionsDir);

  // One file per session, keyed by Claude's session_id (shared with pre-compact.js).
  // Hooks run from the home directory, so take cwd from the payload, not process.cwd().
  const id = (input.session_id || shortId()).slice(0, 8);
  const cwd = input.cwd || process.cwd();
  const sessionFile = path.join(sessionsDir, `${getDateString()}-${id}-session.tmp`);

  const timestamp = getDateTimeString();
  const reason = input.reason ? ` (${input.reason})` : '';
  appendFile(sessionFile, `Session ended at ${timestamp}${reason}\nWorking directory: ${cwd}\n`);

  // Also append to session log
  const sessionLog = path.join(sessionsDir, 'session-log.txt');
  appendFile(sessionLog, `[${timestamp}] Session ended - ${cwd}\n`);

  // Stop session files accumulating forever
  pruneFiles(sessionsDir, '*-session.tmp', 50);

  log('[SessionEnd] Session state persisted');
  process.exit(0);
}

main().catch(err => {
  console.error('[SessionEnd] Error:', err.message);
  process.exit(0); // Don't block on errors
});
