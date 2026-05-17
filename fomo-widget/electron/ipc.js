const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TIMEOUT_MS = 45000;

// Spawns the local `claude` CLI as a child process and returns its stdout.
//
// Three non-obvious choices here that all matter:
//
// 1. `-p` flag (not `--print`): puts Claude into non-interactive "print" mode
//    so it exits after one response instead of waiting for follow-up input.
//
// 2. Prompt via stdin, not a CLI argument: routing prompts include JSON-encoded
//    event arrays that can exceed shell arg-length limits (~128KB on macOS).
//    Stdin has no such limit and avoids shell quoting nightmares.
//
// 3. `stdio: ['pipe','pipe','pipe']` is mandatory: omitting it leaves stdin
//    attached to the parent terminal, causing Claude to block forever waiting
//    for keystrokes that never come.
async function runClaudeCode(prompt) {
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', ['-p', '--dangerously-skip-permissions'], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errOutput = '';

    // spawn's built-in `timeout` option sends SIGTERM but does NOT guarantee
    // the process exits — Claude catches it. SIGKILL is the only reliable kill.
    const timer = setTimeout(() => {
      claude.kill('SIGKILL');
      reject(new Error(`Claude timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    claude.stdout.on('data', d => output += d.toString());
    claude.stderr.on('data', d => errOutput += d.toString());

    // Accept output even on non-zero exit: Claude sometimes exits 1 on warnings
    // while still emitting valid JSON to stdout.
    claude.on('close', code => {
      clearTimeout(timer);
      if (code === 0 || output.trim().length > 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Claude exited ${code}: ${errOutput.slice(0, 300)}`));
      }
    });

    claude.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });

    // Close stdin immediately after writing so Claude knows the prompt is
    // complete and doesn't block waiting for more input.
    claude.stdin.write(prompt);
    claude.stdin.end();
  });
}

async function writeRoute(routeData) {
  const outPath = path.join(os.homedir(), '.fomo-widget', 'route.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(routeData, null, 2));
  return outPath;
}

module.exports = { runClaudeCode, writeRoute };
