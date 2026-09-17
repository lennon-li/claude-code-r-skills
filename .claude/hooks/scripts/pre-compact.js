#!/usr/bin/env node
/**
 * PreCompact Hook - Save state before context compaction
 *
 * Runs before Claude compacts context, giving you a chance to
 * preserve important state that might get lost in summarization.
 */

const path = require('path');
const {
  getSessionsDir,
  getDateString,
  getDateTimeString,
  getTimeString,
  findFiles,
  ensureDir,
  readHookInput,
  appendFile,
  log,
  isHookDisabled
} = require('./utils');

async function main() {
  if (isHookDisabled('pre-compact')) process.exit(0);
  const input = readHookInput();
  const sessionsDir = getSessionsDir();
  const compactionLog = path.join(sessionsDir, 'compaction-log.txt');

  ensureDir(sessionsDir);

  // Log compaction event with timestamp
  const timestamp = getDateTimeString();
  const trigger = input.trigger ? ` (${input.trigger})` : '';
  appendFile(compactionLog, `[${timestamp}] Context compaction triggered${trigger}\n`);

  // Note the compaction in this session's file (same naming as session-end.js).
  // Previously this appended to the newest *.tmp, which belonged to an earlier, ended session.
  if (input.session_id) {
    const id = input.session_id.slice(0, 8);
    const existing = findFiles(sessionsDir, `*-${id}-session.tmp`);
    const sessionFile = existing.length > 0
      ? existing[0].path
      : path.join(sessionsDir, `${getDateString()}-${id}-session.tmp`);
    appendFile(sessionFile, `\n---\n**[Compaction at ${getTimeString()}]** - Context was summarized\n`);
  }

  log('[PreCompact] State saved before compaction');
  process.exit(0);
}

main().catch(err => {
  console.error('[PreCompact] Error:', err.message);
  process.exit(0); // Don't block on errors
});
