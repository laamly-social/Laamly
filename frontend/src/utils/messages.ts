import { apiEndpoint } from '../config';
import type { Thread, User } from '../types';

/**
 * Fetch all message threads for the current user
 */
export async function fetchThreads(): Promise<Thread[]> {
  const res = await fetch(apiEndpoint('/api/messages/threads'), {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch threads');
  const data = await res.json();
  return data.threads || [];
}

/**
 * Fetch messages for a specific thread
 */
export async function fetchThreadMessages(threadId: string) {
  const res = await fetch(apiEndpoint(`/api/messages/threads/${threadId}`), {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch thread messages');
  const data = await res.json();
  return data;
}

/**
 * Send a message in a thread
 */
export async function sendMessage(threadId: string, text: string, attachments?: string[]) {
  const res = await fetch(apiEndpoint('/api/messages/send'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, text, attachments }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

/**
 * Create a new chat thread with one or more users
 */
export async function createThread(
  participantIds: string[],
  options?: { isGroup?: boolean; groupName?: string; groupAvatar?: string }
) {
  const res = await fetch(apiEndpoint('/api/messages/threads/create'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      participantIds,
      ...(options?.isGroup && { isGroup: options.isGroup }),
      ...(options?.groupName && { groupName: options.groupName }),
      ...(options?.groupAvatar && { groupAvatar: options.groupAvatar }),
    }),
  });
  if (!res.ok) throw new Error('Failed to create thread');
  return res.json();
}

/**
 * Search for users by name or handle
 */
export async function searchUsers(query: string): Promise<User[]> {
  const res = await fetch(apiEndpoint(`/api/users/search?q=${encodeURIComponent(query)}`), {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to search users');
  const data = await res.json();
  return data.users || [];
}

/**
 * Add or remove a reaction to/from a message
 */
export async function reactToMessage(threadId: string, messageId: string, emoji: string) {
  const res = await fetch(apiEndpoint('/api/messages/react'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, messageId, emoji }),
  });
  if (!res.ok) throw new Error('Failed to react to message');
  return res.json();
}

/**
 * Edit a message
 */
export async function editMessage(threadId: string, messageId: string, text: string) {
  const res = await fetch(apiEndpoint('/api/messages/edit'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, messageId, text }),
  });
  if (!res.ok) throw new Error('Failed to edit message');
  return res.json();
}

/**
 * Delete a message
 */
export async function deleteMessage(threadId: string, messageId: string) {
  const res = await fetch(apiEndpoint('/api/messages/delete'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, messageId }),
  });
  if (!res.ok) throw new Error('Failed to delete message');
  return res.json();
}
