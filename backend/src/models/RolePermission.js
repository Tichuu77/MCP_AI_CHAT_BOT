import mongoose from "mongoose";

const rolePermissionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Organization",
    },

    role: {
      type: String,
      enum: ["manager", "member"],
      required: true,
    },

    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

rolePermissionSchema.index(
  { organizationId: 1, role: 1 },
  { unique: true }
);

const RolePermission =
  mongoose.model(
    "RolePermission",
    rolePermissionSchema
  );

export default RolePermission;