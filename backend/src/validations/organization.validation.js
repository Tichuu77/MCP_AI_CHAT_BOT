import { z } from "zod";

export const createMemberSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Enter a valid email address")
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must not exceed 100 characters"),
  role: z.enum(["manager", "member"]).optional().default("member"),
  managerId: z.string().nullable().optional(),
});

export const updateMemberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .toLowerCase()
    .optional(),
  managerId: z.string().nullable().optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["manager", "member"], {
    required_error: "Role is required",
    invalid_type_error: "Role must be either manager or member",
  }),
});