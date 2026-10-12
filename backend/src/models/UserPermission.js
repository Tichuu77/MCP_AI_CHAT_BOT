import mongoose from "mongoose";

const userPermissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "User",
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Organization",
    },

    allow: {
      type: [String],
      default: [],
    },

    deny: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

userPermissionSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true }
);

const UserPermission =
  mongoose.model(
    "UserPermission",
    userPermissionSchema
  );

export default UserPermission;