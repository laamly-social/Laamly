import Avatar from "./Avatar";
import GenericButton from "./GenericButton";
import Verified from "./Verified";
import { USERS } from "../../data/mock";
import { clsx } from "../../utils";

export default function UserChip({ userId, small, onClickName }: { userId: string; small?: boolean; onClickName?: () => void }) {
  const u = USERS.find(x => x.id === userId) ?? USERS[0];
  return (
    <div className="flex gap-2 items-center">
         <Avatar src={u.avatar} alt={u.name} size={small ? "sm" : undefined} className={clsx("avatar", small && "avatar--sm")} />
      <div className="leading-none">
        <div className="flex gap-1.5 items-center font-bold text-xs">
          <button className="linklike text-linklike dark:text-linklike-dark" onClick={onClickName}>{u.name}</button>
          {u.verified && <Verified />}
        </div>
        <div className="text-xs text-sub dark:text-sub-dark">{u.handle}</div>
      </div>
    </div>
  );
}
