
import "dotenv/config";
import { Sandbox } from "e2b";

const sandbox = await Sandbox.create();

try {
  // 1. Verify that Node.js exists
  const runtime = await sandbox.commands.run("node --version");

  if (runtime.exitCode !== 0) {
    throw new Error("Node.js is not installed in the sandbox.");
  }

  console.log("Node.js version:", runtime.stdout.trim());

  // 2. Execute JavaScript
  const result = await sandbox.commands.run(
    'node -e "console.log(10 + 20)"'
  );

  // 3. Verify execution succeeded
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Code execution failed");
  }

  console.log("Output:", result.stdout.trim());
} catch (error) {
  console.error("Sandbox error:", error.message);
} finally {
  await sandbox.kill();
}
