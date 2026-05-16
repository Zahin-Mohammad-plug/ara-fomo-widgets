const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TIMEOUT_MS = 45000;

async function runClaudeCode(prompt) {
  return new Promise((resolve, reject) => {
    // Use -p (print/non-interactive). Pipe prompt via stdin to avoid
    // shell arg-length limits and ensure Claude never waits for terminal input.
    const claude = spawn('claude', ['-p', '--dangerously-skip-permissions'], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errOutput = '';

    // Hard-kill after timeout — spawn's timeout option doesn't kill
    const timer = setTimeout(() => {
      claude.kill('SIGKILL');
      reject(new Error(`Claude timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    claude.stdout.on('data', d => output += d.toString());
    claude.stderr.on('data', d => errOutput += d.toString());

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

    // Write prompt to stdin then close so Claude knows input is done
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
