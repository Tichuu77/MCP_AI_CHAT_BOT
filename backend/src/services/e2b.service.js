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

export const getSandbox = async () => createSandbox();

export const runCodeInSandbox = async (code, language) => {
  if (typeof code !== "string" || !code.trim()) {
    throw new Error("Code is required.");
  }

  const runner = Object.hasOwn(languageRunners, language)
    ? languageRunners[language]
    : undefined;
  if (!runner) {
    throw new Error(`${language} is not supported.`);
  }

  let sandbox;
  try {
    sandbox = await getSandbox();
    await sandbox.files.write(runner.file, code);

    const result = await sandbox.commands.run(runner.command, {
      timeoutMs: 20000,
    });

    const isSuccess = result.exitCode === 0;
    const stdout = (result.stdout || "").trim();
    const stderr = (result.stderr || result.error || (!isSuccess ? `Process exited with code ${result.exitCode}` : "")).trim();

    return {
      success: isSuccess,
      stdout,
      stderr,
      exitCode: result.exitCode,
    };
  } catch (error) {
    if (error.exitCode !== undefined || error.stderr || error.stdout) {
      return {
        success: false,
        stdout: (error.stdout || "").trim(),
        stderr: (error.stderr || error.message || "Command execution failed").trim(),
        exitCode: error.exitCode ?? 1,
      };
    }

    console.error("Error running code in sandbox:", error.message);
    return {
      success: false,
      stdout: "",
      stderr: error.message || "Code execution failed",
      exitCode: -1,
    };
  } finally {
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch (killError) {
        console.error("Error killing sandbox:", killError.message);
      }
    }
  }
};
