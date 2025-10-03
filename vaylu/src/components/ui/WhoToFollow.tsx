import React from "react";
import { USERS } from "../../data/mock";
import UserChip from "./UserChip";
import GenericButton from "./GenericButton";
import Card from "./Card";
import { clsx } from "../../utils";

interface WhoToFollowProps {
  meId: string;
  followMap: { [id: string]: Set<string> };
  followToggle: (uid: string) => void;
  openProfile: (uid: string) => void;
}

export default function WhoToFollow({ meId, followMap, followToggle, openProfile }: WhoToFollowProps) {
  const myFollowings = followMap[meId] || new Set<string>();
  return (
    <Card>
      <div className="card_header border-b-1 border-border dark:border-border-dark">Who to follow</div>
      <div className="card__body side__list">
        {USERS.filter(u => u.id !== meId && !myFollowings.has(u.id)).map(u => (
          <div key={u.id} className="side__row">
            <UserChip userId={u.id} small onClickName={() => openProfile(u.id)} />
            <GenericButton className={clsx("btn", myFollowings.has(u.id) ? "" : "bg-transparent text-text dark:text-text-dark hover:bg-muted dark:hover:bg-muted-dark")} onClick={() => followToggle(u.id)}>
              {myFollowings.has(u.id) ? "Following" : "Follow"}
            </GenericButton>
          </div>
        ))}
        {USERS.filter(u => u.id !== meId && !myFollowings.has(u.id)).length === 0 && (
          <div className="muted">You're following everyone here!</div>
        )}
      </div>
    </Card>
  );
}
