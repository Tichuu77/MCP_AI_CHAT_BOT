import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

import { requirePermission } from "./permission.service.js";

// CREATE CONVERSATION
export const createConversation = async ({
  currentUser,
  title,
}) => {
  await requirePermission(
    currentUser,
    "conversation:create"
  );

  const conversation = await Conversation.create({
    organizationId: currentUser.organizationId,
    userId: currentUser.userId,
    title: title || "New conversation",
    messages: [],
  });

  return conversation;
};

// GET CONVERSATION BY ID
export const getConversation = async ({
  currentUser,
  conversationId,
}) => {
  await requirePermission(
    currentUser,
    "conversation:read"
  );

  const conversation =
    await Conversation.findOne({
      _id: conversationId,
      organizationId: currentUser.organizationId,
    });

  if (!conversation) {
    const error = new Error(
      "Conversation not found"
    );
    error.statusCode = 404;
    throw error;
  }

  await checkConversationAccess({
    currentUser,
    conversation,
  });

  return conversation;
};

// LIST CONVERSATIONS
export const listConversations = async ({
  currentUser,
}) => {
  await requirePermission(
    currentUser,
    "conversation:read"
  );

  const query = {
    organizationId: currentUser.organizationId,
  };

  // MEMBER → only own conversations
  if (currentUser.role === "member") {
    query.userId = currentUser.userId;
  }

  // MANAGER → own conversations
  // + conversations of own members
  if (currentUser.role === "manager") {
    const members = await User.find({
      organizationId: currentUser.organizationId,
      role: "member",
      managerId: currentUser.userId,
    }).select("_id");

    const memberIds = members.map(
      (member) => member._id
    );

    query.userId = {
      $in: [
        currentUser.userId,
        ...memberIds,
      ],
    };
  }

  // ADMIN → all organization conversations

  const conversations =
    await Conversation.find(query)
      .select("-messages -__v")
      .sort({ updatedAt: -1 });

  return conversations;
};

// ADD MESSAGE
export const addMessage = async ({
  currentUser,
  conversationId,
  role,
  content,
}) => {
  await requirePermission(
    currentUser,
    "conversation:update"
  );

  const conversation =
    await Conversation.findOne({
      _id: conversationId,
      organizationId: currentUser.organizationId,
    });

  if (!conversation) {
    const error = new Error(
      "Conversation not found"
    );
    error.statusCode = 404;
    throw error;
  }

  await checkConversationAccess({
    currentUser,
    conversation,
  });

  conversation.messages.push({
    role,
    content,
  });

  await conversation.save();

  return conversation;
};

// DELETE CONVERSATION
export const deleteConversation = async ({
  currentUser,
  conversationId,
}) => {
  await requirePermission(
    currentUser,
    "conversation:delete"
  );

  const conversation =
    await Conversation.findOne({
      _id: conversationId,
      organizationId: currentUser.organizationId,
    });

  if (!conversation) {
    const error = new Error(
      "Conversation not found"
    );
    error.statusCode = 404;
    throw error;
  }

  await checkConversationAccess({
    currentUser,
    conversation,
  });

  await conversation.deleteOne();

  return {
    conversationId,
    deleted: true,
  };
};

// CHECK CONVERSATION ACCESS
const checkConversationAccess = async ({
  currentUser,
  conversation,
}) => {
  // ADMIN → everything
  if (currentUser.role === "admin") {
    return true;
  }

  // MEMBER → own conversations only
  if (currentUser.role === "member") {
    if (
      conversation.userId.toString() !==
      currentUser.userId.toString()
    ) {
      const error = new Error(
        "Access denied"
      );
      error.statusCode = 403;
      throw error;
    }

    return true;
  }

  // MANAGER → own conversations
  // + conversations of own members
  if (currentUser.role === "manager") {
    if (
      conversation.userId.toString() ===
      currentUser.userId.toString()
    ) {
      return true;
    }

    const member = await User.findOne({
      _id: conversation.userId,
      organizationId:
        currentUser.organizationId,
      role: "member",
      managerId: currentUser.userId,
    });

    if (!member) {
      const error = new Error(
        "Access denied"
      );
      error.statusCode = 403;
      throw error;
    }

    return true;
  }

  const error = new Error("Access denied");
  error.statusCode = 403;
  throw error;
};