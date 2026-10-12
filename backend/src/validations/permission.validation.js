import { z } from "zod";
import { PERMISSIONS } from "../config/permissions.js";

const permissionValues = Object.values(PERMISSIONS);

export const updateRolePermissionsSchema = z.object({
  permissions: z.array(z.enum(permissionValues)),
});

export const updateUserPermissionsSchema = z.object({
  allow: z.array(z.enum(permissionValues)).optional().default([]),
  deny: z.array(z.enum(permissionValues)).optional().default([]),
});
