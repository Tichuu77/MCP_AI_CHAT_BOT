import { registerUserTools } from "./user.tools.js";
import { registerMemberTools } from "./member.tools.js";
import { registerPermissionTools } from "./permission.tools.js";
import { registerOrganizationTools } from "./organization.tools.js";
import { registerSandboxTools } from "./e2b.tools.js";

export const registerAllTools = (server) => {
  registerUserTools(server);
  registerMemberTools(server);
  registerPermissionTools(server);
  registerOrganizationTools(server);
  registerSandboxTools(server);
};
