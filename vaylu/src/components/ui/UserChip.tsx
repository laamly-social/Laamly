import Verified from "./Verified";
import { USERS } from "../../data/mock";
import { clsx } from "../../utils";

export default function UserChip({ userId, small, onClickName }: { userId: string; small?: boolean; onClickName?: () => void }) {
  const u = USERS.find(x => x.id === userId) ?? USERS[0];
  return (
    <div className="userchip">
      <img className={clsx("avatar", small && "avatar--sm")} src={u.avatar} alt={u.name} />
      <div className="userchip__meta">
        <div className="userchip__name">
          <button className="linklike" onClick={onClickName}>{u.name}</button>
          {u.verified && <Verified />}
        </div>
        <div className="userchip__handle">{u.handle}</div>
      </div>
    </div>
  );
}
