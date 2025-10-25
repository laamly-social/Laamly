import { useState, useEffect } from "react";
import { X, Search, Check } from "lucide-react";
import GenericButton from "../ui/GenericButton";
import Avatar from "../ui/Avatar";
import { searchUsers } from "../../utils/messages";
import type { User } from "../../types";

interface NewChatModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreateChat: (userIds: string[], options?: { isGroup?: boolean; groupName?: string; groupAvatar?: string }) => void;
}

export default function NewChatModal({ isOpen, onClose, onCreateChat }: NewChatModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [users, setUsers] = useState<User[]>([]);
	const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
	const [isSearching, setIsSearching] = useState(false);
	const [isGroup, setIsGroup] = useState(false);
	const [groupName, setGroupName] = useState("");

	useEffect(() => {
		if (!isOpen) {
			setSearchQuery("");
			setUsers([]);
			setSelectedUsers(new Set());
			setIsGroup(false);
			setGroupName("");
			return;
		}
	}, [isOpen]);

	useEffect(() => {
		if (searchQuery.trim().length < 2) {
			setUsers([]);
			return;
		}

		const timer = setTimeout(async () => {
			setIsSearching(true);
			try {
				const results = await searchUsers(searchQuery);
				setUsers(results);
			} catch (error) {
				console.error("Failed to search users:", error);
			} finally {
				setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	const toggleUser = (userId: string) => {
		const newSet = new Set(selectedUsers);
		if (newSet.has(userId)) {
			newSet.delete(userId);
		} else {
			newSet.add(userId);
		}
		setSelectedUsers(newSet);
	};

	const handleCreate = () => {
		if (selectedUsers.size === 0) return;

		const userIds = Array.from(selectedUsers);
		const options = isGroup ? { isGroup: true, groupName: groupName || undefined } : undefined;

		onCreateChat(userIds, options);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
			<div
				className="bg-panel dark:bg-panel-dark rounded-xl border border-border dark:border-border-dark w-full max-w-md mx-4 overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
					<h2 className="text-lg font-semibold text-text dark:text-text-dark">New Message</h2>
					<button
						onClick={onClose}
						className="text-sub dark:text-sub-dark hover:text-text dark:hover:text-text-dark transition"
						aria-label="Close"
					>
						<X size={20} />
					</button>
				</div>

				{/* Search bar */}
				<div className="p-4 border-b border-border dark:border-border-dark">
					{/* Group chat toggle */}
					<label className="flex items-center gap-2 mb-3 cursor-pointer">
						<input
							type="checkbox"
							checked={isGroup}
							onChange={(e) => setIsGroup(e.target.checked)}
							className="w-4 h-4 accent-accent"
						/>
						<span className="text-sm text-text dark:text-text-dark">Create group chat</span>
					</label>

					{/* Group name input */}
					{isGroup && (
						<input
							type="text"
							placeholder="Group name (optional)"
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
							className="w-full mb-3 px-3 py-2 bg-muted dark:bg-muted-dark rounded-xl border-none outline-none text-text dark:text-text-dark placeholder:text-sub dark:placeholder:text-sub-dark"
						/>
					)}

					{/* User search */}
					<div className="flex items-center gap-2 bg-muted dark:bg-muted-dark rounded-xl px-3 py-2">
						<Search size={18} className="text-sub dark:text-sub-dark" />
						<input
							type="text"
							placeholder="Search users..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="flex-1 bg-transparent border-none outline-none text-text dark:text-text-dark placeholder:text-sub dark:placeholder:text-sub-dark"
							autoFocus
						/>
					</div>
					{selectedUsers.size > 0 && (
						<div className="mt-2 text-sm text-sub dark:text-sub-dark">
							{selectedUsers.size} user{selectedUsers.size !== 1 ? "s" : ""} selected
						</div>
					)}
				</div>

				{/* User list */}
				<div className="max-h-96 overflow-y-auto">
					{isSearching ? (
						<div className="p-4 text-center text-sub dark:text-sub-dark">Searching...</div>
					) : users.length === 0 && searchQuery.trim().length >= 2 ? (
						<div className="p-4 text-center text-sub dark:text-sub-dark">No users found</div>
					) : users.length === 0 ? (
						<div className="p-4 text-center text-sub dark:text-sub-dark">
							Type at least 2 characters to search
						</div>
					) : (
						users.map((user) => {
							const isSelected = selectedUsers.has(user.id);
							return (
								<div
									key={user.id}
									className="flex items-center gap-3 p-3 hover:bg-muted dark:hover:bg-muted-dark cursor-pointer transition"
									onClick={() => toggleUser(user.id)}
								>
									<Avatar src={user.avatar} alt={user.handle} size="sm" />
									<div className="flex-1">
										<div className="font-medium text-text dark:text-text-dark">{user.name}</div>
										<div className="text-sm text-sub dark:text-sub-dark">@{user.handle}</div>
									</div>
									{isSelected && (
										<div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
											<Check size={16} className="text-white" />
										</div>
									)}
								</div>
							);
						})
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t border-border dark:border-border-dark flex gap-2 justify-end">
					<GenericButton
						onClick={onClose}
						className="px-4 py-2 bg-transparent hover:bg-muted dark:hover:bg-muted-dark text-text dark:text-text-dark"
					>
						Cancel
					</GenericButton>
					<GenericButton
						onClick={handleCreate}
						disabled={selectedUsers.size === 0}
						className="px-4 py-2 bg-accent text-white disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Create Chat
					</GenericButton>
				</div>
			</div>
		</div>
	);
}
