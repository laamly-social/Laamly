const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Chat = require('../models/Chat');
const { sendNotification } = require('../utils/notifications');

const qByUuid = (uuid) => ({ uuid });
const qInUuids = (uuids) => ({ uuid: { $in: uuids } });

module.exports = function createMessagesRouter(io, userSockets) {

  // GET /api/messages/threads
  router.get('/threads', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });
      const userUuid = String(req.session.user.uuid);

      const chats = await Chat.find({ members: userUuid }).sort({ lastMessageTs: -1 }).lean();

      const threadsWithParticipants = await Promise.all(chats.map(async (chat) => {
        const otherMemberUuids = chat.members.filter(m => m !== userUuid);
        const participants = otherMemberUuids.length
          ? await User.find(qInUuids(otherMemberUuids)).lean()
          : [];

        const participantData = participants.map(u => ({
          id: u.uuid,
          uuid: u.uuid,
          name: u.profile?.name || u.handle,
          handle: u.handle,
          avatar: u.profile?.avatar || ''
        }));

        const unreadCount =
          (chat.unreadCount && typeof chat.unreadCount.get === 'function'
            ? chat.unreadCount.get(userUuid)
            : chat.unreadCount?.[userUuid]) || 0;

        return {
          id: chat._id.toString(),
          participantIds: otherMemberUuids,
          participants: participantData,
          last: chat.lastMessage || '',
          lastTs: chat.lastMessageTs ? new Date(chat.lastMessageTs).getTime() : Date.now(),
          messages: (chat.messages || []).map(m => ({
            id: m._id.toString(),
            from: m.from === userUuid ? 'me' : m.from,
            text: m.text || '',
            ts: new Date(m.ts).getTime(),
            attachments: m.attachments || [],
            read: !!m.read,
            edited: !!m.edited,
            reactions: m.reactions || []
          })),
          unread: unreadCount > 0,
          isGroup: !!chat.isGroup,
          groupName: chat.groupName,
          groupAvatar: chat.groupAvatar
        };
      }));

      res.json({ threads: threadsWithParticipants });
    } catch (err) {
      console.error('Error fetching threads:', err);
      return res.status(500).json({ message: 'Error fetching threads' });
    }
  });

  // GET /api/messages/threads/:threadId
  router.get('/threads/:threadId', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { threadId } = req.params;
      const userId = String(req.session.user.uuid);
      const userGithubId = String(req.session.user.id);

      const chat = await Chat.findById(threadId).lean();
      if (!chat) return res.status(404).json({ message: 'Thread not found' });
      // Check both uuid and githubId for backward compatibility
      if (!chat.members.includes(userId) && !chat.members.includes(userGithubId)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      await Chat.updateOne(
        { _id: threadId },
        { $set: { 'messages.$[].read': true, [`unreadCount.${userId}`]: 0 } }
      );

      const messages = (chat.messages || []).map(m => ({
        id: m._id.toString(),
        from: m.from === userId ? 'me' : m.from,
        text: m.text || '',
        ts: new Date(m.ts).getTime(),
        attachments: m.attachments || [],
        read: true,
        edited: !!m.edited,
        reactions: m.reactions || []
      }));

      res.json({ messages });
    } catch (err) {
      console.error('Error fetching thread messages:', err);
      return res.status(500).json({ message: 'Error fetching messages' });
    }
  });

  // POST /api/messages/send
  router.post('/send', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { threadId, text, attachments } = req.body;
      const userUuid = String(req.session.user.uuid);
      const userGithubId = String(req.session.user.id);

      const chat = await Chat.findById(threadId);
      if (!chat) return res.status(404).json({ message: 'Thread not found' });
      // Check both uuid and githubId for backward compatibility
      if (!chat.members.includes(userUuid) && !chat.members.includes(userGithubId)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const newMessage = {
        from: userUuid,
        text: text || '',
        attachments: attachments || [],
        ts: new Date(),
        read: false,
        edited: false,
        reactions: []
      };

      chat.messages.push(newMessage);
      chat.lastMessage = text || `${(attachments || []).length} file${(attachments || []).length === 1 ? '' : 's'}`;
      chat.lastMessageTs = new Date();
      chat.updatedAt = new Date();

      chat.members.forEach(memberId => {
        if (memberId !== userUuid) {
          try {
            if (typeof chat.unreadCount.get === 'function') {
              const current = chat.unreadCount.get(memberId) || 0;
              chat.unreadCount.set(memberId, current + 1);
            } else {
              chat.unreadCount = chat.unreadCount || {};
              chat.unreadCount[memberId] = (chat.unreadCount[memberId] || 0) + 1;
            }
          } catch {
            chat.unreadCount = chat.unreadCount || {};
            chat.unreadCount[memberId] = (chat.unreadCount[memberId] || 0) + 1;
          }
        }
      });

      await chat.save();

      const savedMessage = chat.messages[chat.messages.length - 1];
      const sender = await User.findOne(qByUuid(userUuid)).lean();

      const messageData = {
        threadId,
        message: {
          id: savedMessage._id.toString(),
          from: userUuid,
          text: text || '',
          ts: new Date(savedMessage.ts).getTime(),
          attachments: attachments || [],
          read: false,
          edited: false,
          reactions: [],
          sender: {
            id: userUuid,
            name: sender?.profile?.name || sender?.handle || 'Unknown',
            handle: sender?.handle || 'unknown',
            avatar: sender?.profile?.avatar || ''
          }
        }
      };

      // emit to others in the room
      const socketsInRoom = await io.in(threadId).fetchSockets();
      const senderSocketIds = userSockets.get(userUuid) || new Set();
      for (const socket of socketsInRoom) {
        if (!senderSocketIds.has(socket.id)) {
          socket.emit('new-message', messageData);
        }
      }

      // notifications
      const otherMembers = chat.members.filter(memberId => memberId !== userUuid);
      for (const memberId of otherMembers) {
        await sendNotification(io, userSockets, {
          to: memberId,
          type: 'message',
          from: userUuid,
          fromName: sender?.profile?.name || sender?.handle || 'Someone',
          fromAvatar: sender?.profile?.avatar || '',
          contentId: threadId,
          contentType: 'message',
          message: `${sender?.profile?.name || sender?.handle || 'Someone'} sent you a message`
        });
      }

      res.json({ message: 'Message sent', messageId: savedMessage._id, attachments: attachments || [] });
    } catch (err) {
      console.error('Error sending message:', err);
      return res.status(500).json({ message: 'Error sending message' });
    }
  });

  // POST /api/messages/threads/create
  router.post('/threads/create', async (req, res) => {
    try {
      if (!req.session.user) {
        console.log('Create thread failed: User not logged in');
        return res.status(401).json({ message: 'You need to be logged in' });
      }

      const { participantIds, isGroup, groupName, groupAvatar } = req.body;
      const userUuid = String(req.session.user.uuid);

      console.log('Creating thread:', {
        creator: userUuid,
        participantIds,
        isGroup,
        groupName,
        hasGroupAvatar: !!groupAvatar
      });

      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        console.log('Create thread failed: Invalid participantIds');
        return res.status(400).json({ message: 'participantIds must be a non-empty array' });
      }

      const allMembers = [userUuid, ...(participantIds || [])];

      // Check for existing chat with same members (now always as group)
      if (participantIds?.length === 1) {
        const existingChat = await Chat.findOne({ 
          members: { $all: allMembers, $size: allMembers.length }
        });
        if (existingChat) {
          const participants = await User.find(qInUuids(participantIds)).lean();
          const participantData = participants.map(u => ({
            id: u.uuid,
            uuid: u.uuid,
            name: u.profile?.name || u.handle,
            handle: u.handle,
            avatar: u.profile?.avatar || ''
          }));
          return res.json({ 
            threadId: existingChat._id.toString(), 
            participants: participantData, 
            existing: true,
            isGroup: existingChat.isGroup,
            groupName: existingChat.groupName,
            groupAvatar: existingChat.groupAvatar
          });
        }
      }

      // Get participant info for generating default group name
      const participants = await User.find(qInUuids(participantIds || [])).lean();
      
      console.log(`Found ${participants.length} participants out of ${participantIds.length} requested`);

      if (participants.length === 0) {
        console.log('Create thread failed: No valid participants found');
        return res.status(400).json({ message: 'No valid participants found' });
      }
      
      // Generate default group name if not provided
      let finalGroupName = groupName;
      if (!finalGroupName) {
        finalGroupName = participants
          .map(u => u.profile?.name || u.handle)
          .filter(Boolean)
          .join(", ") || "Unnamed Chat";
      }

      console.log('Final group name:', finalGroupName);

      // Always create as group chat now
      const newChat = new Chat({
        members: allMembers,
        messages: [],
        lastMessage: '',
        lastMessageTs: new Date(),
        isGroup: true, // Always true now
        groupName: finalGroupName,
        groupAvatar: groupAvatar || null,
        unreadCount: new Map(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await newChat.save();

      console.log('Chat created successfully:', newChat._id.toString());

      // Get creator info
      const creator = await User.findOne(qByUuid(userUuid)).lean();

      // Include creator in participant data
      const participantData = [
        {
          id: creator.uuid,
          uuid: creator.uuid,
          name: creator.profile?.name || creator.handle,
          handle: creator.handle,
          avatar: creator.profile?.avatar || ''
        },
        ...participants.map(u => ({
          id: u.uuid,
          uuid: u.uuid,
          name: u.profile?.name || u.handle,
          handle: u.handle,
          avatar: u.profile?.avatar || ''
        }))
      ];

      // Send notifications to users added to a group chat
      if (Array.isArray(participantIds)) {
        for (const memberId of participantIds) {
          // Don't notify the creator
          if (memberId !== userUuid) {
            const user = participants.find(u => u.uuid === memberId);
            await sendNotification(io, userSockets, {
              to: memberId,
              type: 'group-add',
              from: userUuid,
              fromName: req.session.user?.profile?.name || req.session.user?.handle || 'Someone',
              fromAvatar: req.session.user?.profile?.avatar || '',
              contentId: newChat._id.toString(),
              contentType: 'group',
              message: `${req.session.user?.profile?.name || req.session.user?.handle || 'Someone'} added you to the group "${newChat.groupName || 'Group'}"`,
              link: `/messages/${newChat._id.toString()}`
            });
          }
        }
      }

      console.log('Sending response with threadId:', newChat._id.toString());

      res.json({
        threadId: newChat._id.toString(),
        participants: participantData,
        isGroup: newChat.isGroup,
        groupName: newChat.groupName,
        groupAvatar: newChat.groupAvatar
      });
    } catch (err) {
      console.error('Error creating thread:', err);
      console.error('Stack trace:', err.stack);
      return res.status(500).json({ message: 'Error creating thread', error: err.message });
    }
  });

  // POST /api/messages/react
  router.post('/react', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { threadId, messageId, emoji } = req.body;
      const userId = String(req.session.user.id);
      const userUuid = String(req.session.user.uuid);

      const chat = await Chat.findById(threadId);
      if (!chat) return res.status(404).json({ message: 'Thread not found' });
      // Check both uuid and githubId for backward compatibility
      if (!chat.members.includes(userId) && !chat.members.includes(userUuid)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const message = chat.messages.id(messageId);
      if (!message) return res.status(404).json({ message: 'Message not found' });

      const existing = message.reactions.find(r => r.userId === userId && r.emoji === emoji);
      if (existing) {
        message.reactions = message.reactions.filter(r => !(r.userId === userId && r.emoji === emoji));
      } else {
        message.reactions.push({ userId, emoji });
      }

      await chat.save();
      io.to(threadId).emit('message-reaction', { threadId, messageId, reactions: message.reactions });
      res.json({ message: 'Reaction updated', reactions: message.reactions });
    } catch (err) {
      console.error('Error reacting to message:', err);
      return res.status(500).json({ message: 'Error reacting to message' });
    }
  });

  // POST /api/messages/edit
  router.post('/edit', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { threadId, messageId, text } = req.body;
      const userId = String(req.session.user.id);

      const chat = await Chat.findById(threadId);
      if (!chat) return res.status(404).json({ message: 'Thread not found' });

      const message = chat.messages.id(messageId);
      if (!message) return res.status(404).json({ message: 'Message not found' });
  if (message.from !== userId) return res.status(403).json({ message: 'Can only edit your own messages' });

      message.text = text;
      message.edited = true;
      chat.updatedAt = new Date();

      await chat.save();
      res.json({ message: 'Message edited' });
    } catch (err) {
      console.error('Error editing message:', err);
      return res.status(500).json({ message: 'Error editing message' });
    }
  });

  // POST /api/messages/delete
  router.post('/delete', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { threadId, messageId } = req.body;
  const userId = String(req.session.user.uuid);

      const chat = await Chat.findById(threadId);
      if (!chat) return res.status(404).json({ message: 'Thread not found' });

      const message = chat.messages.id(messageId);
      if (!message) return res.status(404).json({ message: 'Message not found' });
  if (message.from !== userId) return res.status(403).json({ message: 'Can only delete your own messages' });

      message.remove();
      chat.updatedAt = new Date();

      if (chat.messages.length > 0) {
        const lastMsg = chat.messages[chat.messages.length - 1];
        chat.lastMessage = lastMsg.text || `${(lastMsg.attachments || []).length} file${(lastMsg.attachments?.length !== 1 ? 's' : '')}`;
        chat.lastMessageTs = lastMsg.ts;
      } else {
        chat.lastMessage = '';
        chat.lastMessageTs = new Date();
      }

      await chat.save();
      res.json({ message: 'Message deleted' });
    } catch (err) {
      console.error('Error deleting message:', err);
      return res.status(500).json({ message: 'Error deleting message' });
    }
  });

  // POST /api/messages/group/add-member
  router.post('/group/add-member', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { threadId, userId } = req.body;
      const currentUserUuid = String(req.session.user.uuid);
      const currentUserGithubId = String(req.session.user.id);

      if (!threadId || !userId) return res.status(400).json({ message: 'Missing threadId or userId' });

      const chat = await Chat.findById(threadId);
      if (!chat) return res.status(404).json({ message: 'Chat not found' });
      // Check both uuid and githubId for backward compatibility
      if (!chat.members.includes(currentUserUuid) && !chat.members.includes(currentUserGithubId)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Convert to group chat if it's not already
      if (!chat.isGroup) {
        chat.isGroup = true;
        if (!chat.groupName) {
          // Generate a default group name from existing members
          const existingMembers = await User.find(qInUuids(chat.members)).lean();
          chat.groupName = existingMembers.map(u => u.profile?.name || u.handle).join(", ");
        }
      }

      if (chat.members.includes(userId)) {
        return res.status(400).json({ message: 'User is already a member' });
      }

      chat.members.push(userId);
      chat.updatedAt = new Date();
      await chat.save();

      const newMember = await User.findOne(qByUuid(userId)).lean();
      const currentUser = await User.findOne(qByUuid(currentUserUuid)).lean();

      // Notify the added user
      await sendNotification(io, userSockets, {
        to: userId,
        type: 'group-add',
        from: currentUserUuid,
        fromName: currentUser?.profile?.name || currentUser?.handle || 'Someone',
        fromAvatar: currentUser?.profile?.avatar || '',
        contentId: threadId,
        contentType: 'group',
        message: `${currentUser?.profile?.name || currentUser?.handle || 'Someone'} added you to the group "${chat.groupName || 'Group'}"`,
        link: `/messages/${threadId}`
      });

      res.json({
        message: 'Member added successfully',
        isGroup: chat.isGroup,
        groupName: chat.groupName,
        member: {
          id: newMember?.uuid,
          uuid: newMember?.uuid,
          name: newMember?.profile?.name || newMember?.handle,
          handle: newMember?.handle,
          avatar: newMember?.profile?.avatar || ''
        }
      });
    } catch (err) {
      console.error('Error adding member:', err);
      return res.status(500).json({ message: 'Error adding member' });
    }
  });

  // POST /api/messages/group/remove-member
  router.post('/group/remove-member', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { threadId, userId } = req.body;
      const currentUserUuid = String(req.session.user.uuid);
      const currentUserGithubId = String(req.session.user.id);

      if (!threadId || !userId) return res.status(400).json({ message: 'Missing threadId or userId' });

      const chat = await Chat.findById(threadId);
      if (!chat) return res.status(404).json({ message: 'Chat not found' });
      // Check both uuid and githubId for backward compatibility
      if (!chat.members.includes(currentUserUuid) && !chat.members.includes(currentUserGithubId)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      if (!chat.members.includes(currentUserUuid)) return res.status(403).json({ message: 'Not authorized' });

      if (chat.members.length <= 2) {
        return res.status(400).json({ message: 'Cannot remove members from a group with only 2 members' });
      }

      chat.members = chat.members.filter(m => m !== userId);
      chat.updatedAt = new Date();
      await chat.save();

      res.json({ message: 'Member removed successfully' });
    } catch (err) {
      console.error('Error removing member:', err);
      return res.status(500).json({ message: 'Error removing member' });
    }
  });

  // POST /api/messages/group/update-name
  router.post('/group/update-name', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { threadId, groupName } = req.body;
      const currentUserUuid = String(req.session.user.uuid);
      const currentUserGithubId = String(req.session.user.id);

      if (!threadId || !groupName) return res.status(400).json({ message: 'Missing threadId or groupName' });

      const chat = await Chat.findById(threadId);
      if (!chat) return res.status(404).json({ message: 'Chat not found' });
      // Check both uuid and githubId for backward compatibility
      if (!chat.members.includes(currentUserUuid) && !chat.members.includes(currentUserGithubId)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Convert to group chat if it's not already (since they're setting a name)
      if (!chat.isGroup) {
        chat.isGroup = true;
      }

      chat.groupName = groupName;
      chat.updatedAt = new Date();
      await chat.save();

      res.json({ message: 'Group name updated successfully', groupName, isGroup: chat.isGroup });
    } catch (err) {
      console.error('Error updating group name:', err);
      return res.status(500).json({ message: 'Error updating group name' });
    }
  });

  // POST /api/messages/group/update-avatar
  router.post('/group/update-avatar', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { threadId, groupAvatar } = req.body;
      const currentUserUuid = String(req.session.user.uuid);
      const currentUserGithubId = String(req.session.user.id);

      if (!threadId || !groupAvatar) return res.status(400).json({ message: 'Missing threadId or groupAvatar' });

      const chat = await Chat.findById(threadId);
      if (!chat) return res.status(404).json({ message: 'Chat not found' });
      // Check both uuid and githubId for backward compatibility
      if (!chat.members.includes(currentUserUuid) && !chat.members.includes(currentUserGithubId)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      chat.groupAvatar = groupAvatar;
      chat.updatedAt = new Date();
      await chat.save();

      res.json({ message: 'Group avatar updated successfully', groupAvatar });
    } catch (err) {
      console.error('Error updating group avatar:', err);
      return res.status(500).json({ message: 'Error updating group avatar' });
    }
  });

  // POST /api/messages/group/delete
  router.post('/group/delete', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { threadId } = req.body;
      const currentUserUuid = String(req.session.user.uuid);
      const currentUserGithubId = String(req.session.user.id);

      if (!threadId) return res.status(400).json({ message: 'Missing threadId' });

      const chat = await Chat.findById(threadId);
      if (!chat) return res.status(404).json({ message: 'Chat not found' });
      // Check both uuid and githubId for backward compatibility
      if (!chat.members.includes(currentUserUuid) && !chat.members.includes(currentUserGithubId)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Allow deletion of any chat (group or individual)
      await Chat.deleteOne({ _id: threadId });

      res.json({ message: chat.isGroup ? 'Group deleted successfully' : 'Chat deleted successfully' });
    } catch (err) {
      console.error('Error deleting chat:', err);
      return res.status(500).json({ message: 'Error deleting chat' });
    }
  });

  return router;
};
