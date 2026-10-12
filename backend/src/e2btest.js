import "dotenv/config";
import { Sandbox } from "e2b";

const sandbox = await Sandbox.create();

try {
  const result = await sandbox.commands.run(
    "node -e \"console.log(10 + 20)\""
  );

  console.log(result.stdout); // 30
} finally {
  await sandbox.kill();
}