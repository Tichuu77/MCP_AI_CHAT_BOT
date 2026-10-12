import bcrypt from "bcrypt";
import mongoose from "mongoose";

import User from "../models/User.js";
import Organization from "../models/Organization.js";

import { requirePermission } from "./permission.service.js";

// GET CURRENT ORGANIZATION
export const getMyOrganization = async ({
  currentUser,
}) => {
  await requirePermission(
    currentUser,
    "organization:read"
  );

  const organization = await Organization.findById(
    currentUser.organizationId
  ).select("-__v");

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  return organization;
};

// CREATE MEMBER
// CREATE MEMBER
export const createMember = async ({
  currentUser,
  name,
  email,
  password,
  managerId,
}) => {
  await requirePermission(currentUser, "member:create");

  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    const error = new Error(
      "User with this email already exists"
    );
    error.statusCode = 409;
    throw error;
  }

  // Manager can only create members under himself
  if (currentUser.role === "manager") {
    managerId = currentUser.userId;
  }

  // Validate manager assignment
  if (managerId) {
    const manager = await User.findOne({
      _id: managerId,
      organizationId: currentUser.organizationId,
      role: "manager",
    });

    if (!manager) {
      const error = new Error("Invalid manager");
      error.statusCode = 400;
      throw error;
    }
  }

  const hashedPassword = await bcrypt.hash(
    password,
    12
  );

  const member = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    organizationId: currentUser.organizationId,
    role: "member",
    managerId: managerId || null,
  });

  return member;
};

// GET SINGLE MEMBER
export const getMember = async ({
  currentUser,
  memberId,
}) => {
  await requirePermission(currentUser, "member:read");

  const member = await User.findOne({
    _id: memberId,
    organizationId: currentUser.organizationId,
    role: "member",
  })
    .select("-password -__v")
    .populate("managerId", "name email");

  if (!member) {
    const error = new Error("Member not found");
    error.statusCode = 404;
    throw error;
  }

  if (
    currentUser.role === "manager" &&
    member.managerId?._id.toString() !==
      currentUser.userId.toString()
  ) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  return member;
};

// GET MEMBERS BY ARGS
export const getMembersByArgs = async ({
  currentUser,
  args,
}) => {
  await requirePermission(currentUser, "member:read");

  const query = {
    organizationId: currentUser.organizationId,
    role: "member",
  };

  if (currentUser.role === "manager") {
    query.managerId = currentUser.userId;
  }

    // Add filters based on args
    for (const [key, value] of Object.entries(args)) {
        if (key === "name" && value) {
            query.name = { $regex: value, $options: "i" };
        } else if (key === "email" && value) {
            query.email = { $regex: value, $options: "i" };
        } else if (key === "id" && value) {
            query._id = value;
        } else if (key === "role" && value) {
            query.role = value;
        }
    }

  const members = await User.find(query)
    .select("-password -__v")
    .sort({ createdAt: -1 });

  return members;
};

   
// LIST MEMBERS
export const listMembers = async ({
  currentUser,
}) => {
  await requirePermission(currentUser, "member:read");

  const query = {
    organizationId: currentUser.organizationId,
    role: "member",
  };

  if (currentUser.role === "manager") {
    query.managerId = currentUser.userId;
  }

  const members = await User.find(query)
    .select("-password -__v")
    .populate("managerId", "name email")
    .sort({ createdAt: -1 });

  return members;
};

// UPDATE MEMBER
// UPDATE MEMBER
export const updateMember = async ({
  currentUser,
  memberId,
  updates,
}) => {
  await requirePermission(currentUser, "member:update");

  const member = await User.findOne({
    _id: memberId,
    organizationId: currentUser.organizationId,
    role: "member",
  });

  if (!member) {
    const error = new Error("Member not found");
    error.statusCode = 404;
    throw error;
  }

  // Manager can only update his own members
  if (
    currentUser.role === "manager" &&
    member.managerId?.toString() !==
      currentUser.userId.toString()
  ) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  const allowedUpdates = {};

  if (updates.name !== undefined) {
    allowedUpdates.name = updates.name;
  }

  if (updates.email !== undefined) {
    const normalizedEmail =
      updates.email.toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: memberId },
    });

    if (existingUser) {
      const error = new Error(
        "User with this email already exists"
      );
      error.statusCode = 409;
      throw error;
    }

    allowedUpdates.email = normalizedEmail;
  }

  // Only admin can change manager assignment
  if (updates.managerId !== undefined) {
    if (currentUser.role !== "admin") {
      const error = new Error(
        "Only admin can change member manager"
      );
      error.statusCode = 403;
      throw error;
    }

    if (updates.managerId !== null) {
      const manager = await User.findOne({
        _id: updates.managerId,
        organizationId: currentUser.organizationId,
        role: "manager",
      });

      if (!manager) {
        const error = new Error("Invalid manager");
        error.statusCode = 400;
        throw error;
      }
    }

    allowedUpdates.managerId =
      updates.managerId;
  }

  Object.assign(member, allowedUpdates);

  await member.save();

  return member;
};

// DELETE MEMBER
export const deleteMember = async ({
  currentUser,
  memberId,
}) => {
  await requirePermission(currentUser, "member:delete");

  const member = await User.findOne({
    _id: memberId,
    organizationId: currentUser.organizationId,
    role: "member",
  });

  if (!member) {
    const error = new Error("Member not found");
    error.statusCode = 404;
    throw error;
  }

  if (
    currentUser.role === "manager" &&
    member.managerId?.toString() !==
      currentUser.userId.toString()
  ) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  await member.deleteOne();

  return {
    memberId,
    deleted: true,
  };
};


export const organizationSummary = async (context) => {
  const currentUser = context?.currentUser ?? context;

  await requirePermission(currentUser, "organization:read");

  const organizationId = mongoose.Types.ObjectId.isValid(currentUser.organizationId)
    ? new mongoose.Types.ObjectId(currentUser.organizationId)
    : currentUser.organizationId;

  const organization = await Organization.aggregate([{
    $match: {
      _id: organizationId,
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "organizationId",
      as: "members",
      pipeline: [
        {
           $project: {
              name: 1,
              email: 1,
              role: 1,
           },
        },
      ],
    },
  },
  {
    $lookup: {
      from: "conversations",
      localField: "_id",
      foreignField: "organizationId",
      as: "conversations",
      pipeline: [
        {
          $project: {
            messages:{
              $size: "$messages"
            }
          },
        },
      ],
    },
  },
  {
    $unwind: {
      path: "$members",
    },
  },
  {
    $unwind: {
      path: "$conversations",
    },
  },
   {
    $project: {
      name: 1,
      ownerId: 1,
      members: 1,
      conversations: 1,
      createdAt: 1,
      updatedAt: 1,
      
    },
  }]);

  return organization;
};

export const membersSummary = async (context) => {
  const currentUser = context?.currentUser ?? context;

  await requirePermission(currentUser, "member:read");

  const organizationId = mongoose.Types.ObjectId.isValid(currentUser.organizationId)
    ? new mongoose.Types.ObjectId(currentUser.organizationId)
    : currentUser.organizationId;

    const isManager = currentUser.role === "manager";
    let query = {};

    if (isManager) {
      query.managerId = currentUser.userId;
    }

    query.organizationId = organizationId;

    query.role = "member";

  const members = await User.aggregate([{
    $match: {
      ...query,
    },
  },
  {
    $project: {
      name: 1,
      email: 1,
      role: 1,
    },
  }]);

  return members;
};