#!/usr/bin/env node
/**
 * Strategic Compact Suggester
 *
 * Suggests manual /compact at strategic points rather than relying on
 * arbitrary auto-compaction which can happen mid-task.
 *
 * Why strategic compaction matters:
 * - Auto-compact happens at arbitrary points, often mid-task
 * - Strategic compacting preserves context through logical phases
 * - Compact after exploration, before execution
 * - Compact after completing a milestone, before starting next
 */

const path = require('path');
const { getTempDir, readFile, writeFile, readHookInput, isHookDisabled } = require('./utils');

// stderr from an exit-0 hook is never shown, so emit a systemMessage on stdout instead
function suggest(message) {
  process.stdout.write(JSON.stringify({ systemMessage: message }) + '\n');
}

async function main() {
  if (isHookDisabled('suggest-compact')) process.exit(0);
  // Session-specific counter keyed by the session_id Claude passes on stdin
  const input = readHookInput();
  const sessionId = input.session_id || 'default';
  const counterFile = path.join(getTempDir(), `claude-tool-count-${sessionId}`);
  const threshold = parseInt(process.env.COMPACT_THRESHOLD || '50', 10);

  let count = 1;

  // Read existing count or start at 1
  const existing = readFile(counterFile);
  if (existing) {
    count = parseInt(existing.trim(), 10) + 1;
  }

  // Save updated count
  writeFile(counterFile, String(count));

  // Suggest compact at threshold
  if (count === threshold) {
    suggest(`[StrategicCompact] ${threshold} tool calls reached - consider /compact if transitioning phases. ` +
      'Good times to compact: after exploration, after debugging, before new task');
  }

  // Remind at regular intervals after threshold
  if (count > threshold && count % 25 === 0) {
    suggest(`[StrategicCompact] ${count} tool calls - good checkpoint for /compact if context is stale`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('[StrategicCompact] Error:', err.message);
  process.exit(0); // Don't block on errors
});
