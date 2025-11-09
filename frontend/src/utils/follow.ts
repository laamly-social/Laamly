// @ts-nocheck

import { apiEndpoint } from "../config";

export type FollowState = {
  isFollowing: boolean;
  followerCount?: number;
  followingCount?: number;
};

/** Fetch follow state for a given user (by uuid or handle) */
export async function fetchFollowState(
  userIdOrHandle: string
): Promise<FollowState> {
  try {
    const res = await fetch(
      apiEndpoint(`/api/users/${encodeURIComponent(userIdOrHandle)}`),
      { credentials: "include" }
    );

    if (!res.ok) {
      return { isFollowing: false };
    }

    const data = await res.json();
    return {
      isFollowing: !!data?.user?.isFollowing,
      followerCount: data?.user?.followerCount ?? 0,
      followingCount: data?.user?.followingCount ?? 0,
    };
  } catch (err) {
    console.error("fetchFollowState failed:", err);
    return { isFollowing: false };
  }
}

/** Toggle follow / unfollow for a target user (by uuid or handle) */
export async function toggleFollow(
  userIdOrHandle: string
): Promise<FollowState> {
  const res = await fetch(
    apiEndpoint(`/api/users/${encodeURIComponent(userIdOrHandle)}/follow`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await res.json()
    : { message: await res.text() };

  if (!res.ok) {
    const msg =
      (data as any)?.message ||
      (res.status === 401
        ? "You need to be logged in to follow users."
        : `Failed to toggle follow: ${res.status}`);
    throw new Error(msg);
  }

  return {
    isFollowing: !!data.isFollowing,
    followerCount: data.followerCount ?? 0,
    followingCount: data.followingCount ?? 0,
  };
}
