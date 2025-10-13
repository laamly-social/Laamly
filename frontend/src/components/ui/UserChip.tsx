import Avatar from "./Avatar";

export default function UserChip({ avatar, handle, fullName, onClickName }: { avatar: string; handle: string; fullName: string; onClickName?: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar src={avatar} alt={handle} size="sm" />
      <div className="flex flex-col">
        <span className="font-semibold linkline text-linklike dark:text-linklike-dark" onClick={onClickName}>{fullName}</span>
        <span className="text-sm text-sub dark:text-sub-dark">@{handle}</span>
      </div>
    </div>
  );
}