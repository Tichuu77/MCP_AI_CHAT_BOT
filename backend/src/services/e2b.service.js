import createSandbox from "../config/e2b.js";

const languageRunners = {
  javascript: {
    file: "/home/user/main.js",
    command: "NODE_PATH=/home/user/node_modules node /home/user/main.js",
  },
  python: { file: "/home/user/main.py", command: "python3 /home/user/main.py" },
  java: {
    file: "/home/user/Main.java",
    command: "javac /home/user/Main.java && java -cp /home/user Main",
  },
  c: {
    file: "/home/user/main.c",
    command: "gcc /home/user/main.c -o /home/user/main && /home/user/main",
  },
  cpp: {
    file: "/home/user/main.cpp",
    command: "g++ /home/user/main.cpp -o /home/user/main && /home/user/main",
  },
  ruby: { file: "/home/user/main.rb", command: "ruby /home/user/main.rb" },
  go: { file: "/home/user/main.go", command: "go run /home/user/main.go" },
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

    // 2. Auto-detect packages from code, files, and commands (e.g. axios, supertest)
    const allCodeText = [
      code || "",
      ...(files || []).map((f) => f.content || ""),
      ...(commands || []),
    ].join("\n");

    const effectiveDependencies = [...(dependencies || [])];
    const detectedPackages = [
      "axios",
      "supertest",
      "cors",
      "dotenv",
      "bcryptjs",
      "jsonwebtoken",
      "mongoose",
      "express-async-handler",
      "node-fetch",
    ];

    for (const pkg of detectedPackages) {
      if (
        (allCodeText.includes(`'${pkg}'`) ||
          allCodeText.includes(`"${pkg}"`) ||
          allCodeText.includes(`${pkg}.`)) &&
        !effectiveDependencies.includes(pkg)
      ) {
        effectiveDependencies.push(pkg);
      }
    }

    if (effectiveDependencies.length > 0) {
      const depList = effectiveDependencies.join(" ");
      let installCmd = "";

      if (["javascript", "typescript"].includes(language)) {
        installCmd = `npm install --no-audit --no-fund --legacy-peer-deps --ignore-engines ${depList}`;
      } else if (language === "python") {
        installCmd = `pip install --quiet ${depList}`;
      }

      if (installCmd) {
        console.log(`Installing dependencies in sandbox: ${depList}`);
        try {
          const installRes = await sandboxObj.commands.run(installCmd, {
            timeoutMs: 60000,
          });

          if (installRes.exitCode !== 0) {
            console.warn("Dependency install warning:", installRes.stderr);
          }
        } catch (installErr) {
          console.warn(
            "Dependency installation warning/non-zero exit:",
            installErr.message,
            installErr.stderr || ""
          );
        }
      }
    }

    // 3. Write files to sandbox
    if (files && files.length > 0) {
      // Ensure parent directories exist before writing
      const dirs = new Set();
      for (const f of files) {
        const filePath = f.path.startsWith("/") ? f.path : `/home/user/${f.path}`;
        const lastSlash = filePath.lastIndexOf("/");
        if (lastSlash > 0) {
          dirs.add(filePath.substring(0, lastSlash));
        }
      }
      for (const dir of dirs) {
        try {
          await sandboxObj.commands.run(`mkdir -p "${dir}"`);
        } catch {
          // Ignore directory creation warnings
        }
      }

      for (const f of files) {
        const filePath = f.path.startsWith("/") ? f.path : `/home/user/${f.path}`;
        await sandboxObj.files.write(filePath, f.content);
      }
    }

    if (hasCode) {
      const runner = languageRunners[language] || languageRunners.javascript;
      await sandboxObj.files.write(runner.file, code);
    }

    // 4. Determine command(s) to execute & convert any inline 'node -e' scripts to safe files
    const rawCommands = [];
    if (commands && commands.length > 0) {
      rawCommands.push(...commands);
    } else if (hasCode) {
      const runner = languageRunners[language] || languageRunners.javascript;
      rawCommands.push(runner.command);
    } else if (hasFiles) {
      const entryFile = files.find((f) =>
        /^(index|main|app|server)\.(js|ts|py|rb|go)$/i.test(f.path) ||
        /^src\/(index|main|app|server)\.(js|ts|py|rb|go)$/i.test(f.path)
      );
      if (entryFile) {
        const fullEntryPath = entryFile.path.startsWith("/") ? entryFile.path : `/home/user/${entryFile.path}`;
        if (entryFile.path.endsWith(".py")) {
          rawCommands.push(`python3 ${fullEntryPath}`);
        } else {
          rawCommands.push(`NODE_PATH=/home/user/node_modules node ${fullEntryPath}`);
        }
      } else {
        const runner = languageRunners[language] || languageRunners.javascript;
        rawCommands.push(runner.command);
      }
    } else {
      const runner = languageRunners[language] || languageRunners.javascript;
      rawCommands.push(runner.command);
    }

    const execCommands = [];
    let inlineCounter = 0;

    for (const cmd of rawCommands) {
      const trimmed = cmd.trim();
      if (trimmed.startsWith("node -e ") || trimmed.startsWith('node -e"')) {
        inlineCounter++;
        let jsBody = trimmed.replace(/^node\s+-e\s*["']?/, "");
        // Remove trailing quote if present
        if (jsBody.endsWith('"') || jsBody.endsWith("'")) {
          jsBody = jsBody.slice(0, -1);
        }

        // If the inline script tests endpoints on localhost:5000 and src/server.js exists,
        // automatically ensure the server is started in the background so HTTP calls succeed
        if (
          (jsBody.includes("localhost:") || jsBody.includes("base+'/api") || jsBody.includes("base + '/api")) &&
          !jsBody.includes("./src/server") &&
          files &&
          files.some((f) => f.path.includes("server.js"))
        ) {
          jsBody = `try { require('./src/server'); } catch (err) {}\nsetTimeout(async () => {\n${jsBody}\n}, 800);\n`;
        }

        const inlineFileName = `_inline_test_${inlineCounter}.js`;
        await sandboxObj.files.write(`/home/user/${inlineFileName}`, jsBody);
        execCommands.push(`node ${inlineFileName}`);
      } else {
        execCommands.push(cmd);
      }
    }

    // 5. Execute commands sequentially
    let allStdout = "";
    let allStderr = "";
    let lastExitCode = 0;
    let allSuccess = true;

    for (const cmd of execCommands) {
      const finalCmd =
        cmd.startsWith("node ") && !cmd.includes("NODE_PATH")
          ? `NODE_PATH=/home/user/node_modules ${cmd}`
          : cmd;
      console.log(`Running sandbox command: ${finalCmd}`);
      try {
        const result = await sandboxObj.commands.run(finalCmd, {
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
    // Sessions with a sessionId are cached in activeSandboxes and managed by the 5-minute inactivity timer.
    // Only kill immediately if there was NO sessionId attached to this execution.
    if (!sessionId && sandboxObj) {
      try {
        await sandboxObj.kill();
      } catch (kErr) {
        console.error("Error killing sandbox:", kErr.message);
      }
    }
  }
};