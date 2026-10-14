import createSandbox from "../config/e2b.js";

const languageRunners = {
  javascript: { file: "/tmp/main.js", command: "node /tmp/main.js" },
  python: { file: "/tmp/main.py", command: "python3 /tmp/main.py" },
  java: {
    file: "/tmp/Main.java",
    command: "javac /tmp/Main.java && java -cp /tmp Main",
  },
  c: {
    file: "/tmp/main.c",
    command: "gcc /tmp/main.c -o /tmp/main && /tmp/main",
  },
  cpp: {
    file: "/tmp/main.cpp",
    command: "g++ /tmp/main.cpp -o /tmp/main && /tmp/main",
  },
  ruby: { file: "/tmp/main.rb", command: "ruby /tmp/main.rb" },
  go: { file: "/tmp/main.go", command: "go run /tmp/main.go" },
};

// Map of active sandbox sessions: sessionId -> { sandbox, timer, lastUsed }
const activeSandboxes = new Map();
const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes inactivity timeout

/**
 * Retrieves an existing sandbox for this session, or creates a new one.
 */
async function getOrCreateSessionSandbox(sessionId) {
  if (sessionId && activeSandboxes.has(sessionId)) {
    const session = activeSandboxes.get(sessionId);
    // Reset inactivity timer
    clearTimeout(session.timer);
    session.timer = setTimeout(
      () => destroySandboxSession(sessionId),
      SESSION_IDLE_TIMEOUT_MS
    );
    session.lastUsed = Date.now();
    return { sandbox: session.sandbox, isReused: true };
  }

  const sandbox = await createSandbox();

  if (sessionId) {
    const timer = setTimeout(
      () => destroySandboxSession(sessionId),
      SESSION_IDLE_TIMEOUT_MS
    );
    activeSandboxes.set(sessionId, {
      sandbox,
      timer,
      lastUsed: Date.now(),
    });
  }

  return { sandbox, isReused: false };
}

/**
 * Manually kills and removes a sandbox session.
 */
export async function destroySandboxSession(sessionId) {
  if (!sessionId || !activeSandboxes.has(sessionId)) return;

  const session = activeSandboxes.get(sessionId);
  clearTimeout(session.timer);
  activeSandboxes.delete(sessionId);

  try {
    await session.sandbox.kill();
    console.log(`Sandbox session ${sessionId} killed due to timeout/close.`);
  } catch (err) {
    console.error(`Error killing sandbox session ${sessionId}:`, err.message);
  }
}

/**
 * Runs code, multi-file projects, test suites, and installs packages in E2B.
 */
export const runCodeInSandbox = async ({
  code,
  language = "javascript",
  files = [],
  dependencies = [],
  commands = [],
  sessionId = null,
  keepAlive = false,
}) => {
  const hasCode = Boolean(code && typeof code === "string" && code.trim().length > 0);
  const hasFiles = Boolean(files && Array.isArray(files) && files.length > 0);
  const hasCommands = Boolean(commands && Array.isArray(commands) && commands.length > 0);

  // Validate that there is something to execute before starting VM
  if (!hasCode && !hasFiles && !hasCommands) {
    return {
      success: false,
      stdout: "",
      stderr: "Error: No code, files, or execution commands were provided to run_code.",
      exitCode: 1,
    };
  }

  let sandboxObj;
  let isReused = false;

  try {
    // 1. Get existing session sandbox or create a new one
    const res = await getOrCreateSessionSandbox(sessionId);
    sandboxObj = res.sandbox;
    isReused = res.isReused;

    // 2. Install dependencies if provided (and not already installed in reused session)
    if (dependencies && dependencies.length > 0) {
      const depList = dependencies.join(" ");
      let installCmd = "";

      if (["javascript", "typescript"].includes(language)) {
        installCmd = `npm install --no-audit --no-fund ${depList}`;
      } else if (language === "python") {
        installCmd = `pip install --quiet ${depList}`;
      }

      if (installCmd) {
        console.log(`Installing dependencies in sandbox: ${depList}`);
        const installRes = await sandboxObj.commands.run(installCmd, {
          timeoutMs: 45000,
        });

        if (installRes.exitCode !== 0) {
          console.warn("Dependency install warning:", installRes.stderr);
        }
      }
    }

    // 3. Write files to sandbox
    if (files && files.length > 0) {
      for (const f of files) {
        const filePath = f.path.startsWith("/") ? f.path : `/tmp/${f.path}`;
        await sandboxObj.files.write(filePath, f.content);
      }
    } else if (hasCode) {
      // Single-file fallback
      const runner = languageRunners[language] || languageRunners.javascript;
      await sandboxObj.files.write(runner.file, code);
    }

    // 4. Determine command(s) to execute
    const execCommands = [];
    if (commands && commands.length > 0) {
      execCommands.push(...commands);
    } else if (hasFiles) {
      const entryFile = files.find((f) =>
        /^(index|main|app|server)\.(js|ts|py|rb|go)$/i.test(f.path) ||
        /^src\/(index|main|app|server)\.(js|ts|py|rb|go)$/i.test(f.path)
      );
      if (entryFile) {
        const fullEntryPath = entryFile.path.startsWith("/") ? entryFile.path : `/tmp/${entryFile.path}`;
        if (entryFile.path.endsWith(".py")) {
          execCommands.push(`python3 ${fullEntryPath}`);
        } else {
          execCommands.push(`node ${fullEntryPath}`);
        }
      } else {
        const runner = languageRunners[language] || languageRunners.javascript;
        execCommands.push(runner.command);
      }
    } else {
      const runner = languageRunners[language] || languageRunners.javascript;
      execCommands.push(runner.command);
    }

    // 5. Execute commands sequentially
    let allStdout = "";
    let allStderr = "";
    let lastExitCode = 0;
    let allSuccess = true;

    for (const cmd of execCommands) {
      console.log(`Running sandbox command: ${cmd}`);
      try {
        const result = await sandboxObj.commands.run(cmd, {
          timeoutMs: 30000,
        });

        if (result.stdout) allStdout += `${result.stdout}\n`;
        if (result.stderr) allStderr += `${result.stderr}\n`;

        if (result.exitCode !== 0) {
          allSuccess = false;
          lastExitCode = result.exitCode;
          break; // Stop on first failing command/test
        }
      } catch (cmdErr) {
        allSuccess = false;
        lastExitCode = cmdErr.exitCode ?? 1;
        if (cmdErr.stdout) allStdout += `${cmdErr.stdout}\n`;
        if (cmdErr.stderr) allStderr += `${cmdErr.stderr}\n`;
        allStderr += cmdErr.message ? `${cmdErr.message}\n` : "";
        break;
      }
    }

    return {
      success: allSuccess,
      stdout: allStdout.trim(),
      stderr: allStderr.trim(),
      exitCode: lastExitCode,
    };
  } catch (error) {
    console.error("Error executing in sandbox:", error.message);
    return {
      success: false,
      stdout: "",
      stderr: error.message || "Failed to execute in sandbox",
      exitCode: -1,
    };
  } finally {
    // If not configured to keep session alive, kill sandbox immediately
    if (!keepAlive && (!sessionId || !isReused)) {
      if (sessionId) {
        await destroySandboxSession(sessionId);
      } else if (sandboxObj) {
        try {
          await sandboxObj.kill();
        } catch (kErr) {
          console.error("Error killing sandbox:", kErr.message);
        }
      }
    }
  }
};