const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Chat = require('../models/Chat');

module.exports = function createMessagesRouter(io, userSockets) {

   // GET /api/messages/threads
   router.get('/threads', async (req, res) => {
      try {
         if (!req.session.user) {
            return res.status(401).json({ message: 'You need to be logged in' });
         }

         const userId = String(req.session.user.id);

         const chats = await Chat.find({ members: userId }).sort({ lastMessageTs: -1 }).lean();

         const threadsWithParticipants = await Promise.all(chats.map(async (chat) => {
            const otherMemberIds = chat.members.filter(m => m !== userId);
            const participants = await User.find({ githubId: { $in: otherMemberIds } }).lean();

            const participantData = participants.map(u => ({
               id: u.githubId,
               githubId: u.githubId,
               name: u.profile?.name || u.handle,
               handle: u.handle,
               avatar: u.profile?.avatar || ''
            }));

            const unreadCount = chat.unreadCount?.get?.(userId) || 0;

            return {
               id: chat._id.toString(),
               participantIds: otherMemberIds,
               participants: participantData,
               last: chat.lastMessage || '',
               lastTs: chat.lastMessageTs ? new Date(chat.lastMessageTs).getTime() : Date.now(),
               messages: chat.messages.map(m => ({
                  id: m._id.toString(),
                  from: m.from === userId ? 'me' : m.from,
                  text: m.text || '',
                  ts: new Date(m.ts).getTime(),
                  attachments: m.attachments || [],
                  read: m.read || false,
                  edited: m.edited || false,
                  reactions: m.reactions || []
               })),
               unread: unreadCount > 0,
               isGroup: chat.isGroup || false,
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
         const userId = String(req.session.user.id);

         const chat = await Chat.findById(threadId).lean();
         if (!chat) return res.status(404).json({ message: 'Thread not found' });

         if (!chat.members.includes(userId)) return res.status(403).json({ message: 'Not authorized' });

         await Chat.updateOne(
            { _id: threadId },
            {
               $set: {
                  'messages.$[].read': true,
                  [`unreadCount.${userId}`]: 0
               }
            }
         );

         const messages = chat.messages.map(m => ({
            id: m._id.toString(),
            from: m.from === userId ? 'me' : m.from,
            text: m.text || '',
            ts: new Date(m.ts).getTime(),
            attachments: m.attachments || [],
            read: true,
            edited: m.edited || false,
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
         const userId = String(req.session.user.id);

         const chat = await Chat.findById(threadId);
         if (!chat) return res.status(404).json({ message: 'Thread not found' });

         if (!chat.members.includes(userId)) return res.status(403).json({ message: 'Not authorized' });

         const newMessage = {
            from: userId,
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
            if (memberId !== userId) {
               const currentCount = chat.unreadCount?.get(memberId) || 0;
               chat.unreadCount.set(memberId, currentCount + 1);
            }
         });

         await chat.save();

         const savedMessage = chat.messages[chat.messages.length - 1];
         const sender = await User.findOne({ githubId: userId }).lean();

         const messageData = {
            threadId,
            message: {
               id: savedMessage._id.toString(),
               from: userId,
               text: text || '',
               ts: new Date(savedMessage.ts).getTime(),
               attachments: attachments || [],
               read: false,
               edited: false,
               reactions: [],
               sender: {
                  id: userId,
                  name: sender?.profile?.name || sender?.handle || 'Unknown',
                  handle: sender?.handle || 'unknown',
                  avatar: sender?.profile?.avatar || ''
               }
            }
         };

         // emit to sockets in room, excluding sender
         const socketsInRoom = await io.in(threadId).fetchSockets();
         const senderSocketIds = userSockets.get(userId) || new Set();
         for (const socket of socketsInRoom) {
            if (!senderSocketIds.has(socket.id)) {
               socket.emit('new-message', messageData);
            }
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
         if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

         const { participantIds, isGroup, groupName, groupAvatar } = req.body;
         const userId = String(req.session.user.id);

         const allMembers = [userId, ...participantIds];

         if (!isGroup && participantIds.length === 1) {
            const existingChat = await Chat.findOne({ members: { $all: allMembers, $size: allMembers.length }, isGroup: false });
            if (existingChat) {
               const participants = await User.find({ githubId: { $in: participantIds } }).lean();
               const participantData = participants.map(u => ({ id: u.githubId, githubId: u.githubId, name: u.profile?.name || u.handle, handle: u.handle, avatar: u.profile?.avatar || '' }));
               return res.json({ threadId: existingChat._id.toString(), participants: participantData, existing: true });
            }
         }

         const newChat = new Chat({
            members: allMembers,
            messages: [],
            lastMessage: '',
            lastMessageTs: new Date(),
            isGroup: isGroup || false,
            groupName: groupName || null,
            groupAvatar: groupAvatar || null,
            unreadCount: new Map(),
            createdAt: new Date(),
            updatedAt: new Date()
         });

         await newChat.save();

         const participants = await User.find({ githubId: { $in: participantIds } }).lean();
         const participantData = participants.map(u => ({ id: u.githubId, githubId: u.githubId, name: u.profile?.name || u.handle, handle: u.handle, avatar: u.profile?.avatar || '' }));

         res.json({ threadId: newChat._id.toString(), participants: participantData, isGroup: newChat.isGroup, groupName: newChat.groupName, groupAvatar: newChat.groupAvatar });
      } catch (err) {
         console.error('Error creating thread:', err);
         return res.status(500).json({ message: 'Error creating thread' });
      }
   });

   // POST /api/messages/react
   router.post('/react', async (req, res) => {
      try {
         if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

         const { threadId, messageId, emoji } = req.body;
         const userId = String(req.session.user.id);

         const chat = await Chat.findById(threadId);
         if (!chat) return res.status(404).json({ message: 'Thread not found' });

         if (!chat.members.includes(userId)) return res.status(403).json({ message: 'Not authorized' });

         const message = chat.messages.id(messageId);
         if (!message) return res.status(404).json({ message: 'Message not found' });

         const existingReaction = message.reactions.find(r => r.userId === userId && r.emoji === emoji);

         if (existingReaction) {
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
         const userId = String(req.session.user.id);

         const chat = await Chat.findById(threadId);
         if (!chat) return res.status(404).json({ message: 'Thread not found' });

         const message = chat.messages.id(messageId);
         if (!message) return res.status(404).json({ message: 'Message not found' });

         if (message.from !== userId) return res.status(403).json({ message: 'Can only delete your own messages' });

         message.remove();
         chat.updatedAt = new Date();

         if (chat.messages.length > 0) {
            const lastMsg = chat.messages[chat.messages.length - 1];
            chat.lastMessage = lastMsg.text || `${(lastMsg.attachments || []).length} file${(lastMsg.attachments.length !== 1 ? 's' : '')}`;
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

   return router;
};
