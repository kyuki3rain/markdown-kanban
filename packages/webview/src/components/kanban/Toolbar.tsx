import { Lock, Unlock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { KanbanConfig } from '../../types';
import { PathFilterDropdown } from './PathFilterDropdown';
import { SortByDropdown } from './SortByDropdown';

interface ToolbarProps {
	config: KanbanConfig;
	paths: string[][];
	isLocked: boolean;
	onFilterPathsChange: (filterPaths: string[]) => void;
	onSortByChange: (sortBy: KanbanConfig['sortBy']) => void;
	onToggleLock: () => void;
}

/**
 * ツールバーコンポーネント
 * フィルター、ソート、ロック状態の切り替えなどの操作を提供する
 */
export function Toolbar({
	config,
	paths,
	isLocked,
	onFilterPathsChange,
	onSortByChange,
	onToggleLock,
}: ToolbarProps) {
	return (
		<div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
			<div className="flex items-center gap-4">
				<PathFilterDropdown
					paths={paths}
					selectedPaths={config.filterPaths}
					onSelectionChange={onFilterPathsChange}
				/>
			</div>
			<div className="flex items-center gap-4">
				<SortByDropdown sortBy={config.sortBy} onSortByChange={onSortByChange} />
				<button
					type="button"
					onClick={onToggleLock}
					className={cn(
						'flex items-center gap-1.5 px-2 py-1 rounded-md text-sm',
						'transition-colors',
						isLocked
							? 'bg-primary/10 text-primary hover:bg-primary/20'
							: 'text-muted-foreground hover:text-foreground hover:bg-muted',
					)}
					title={isLocked ? 'Unlock panel (follow active editor)' : 'Lock panel to current file'}
					aria-label={isLocked ? 'Unlock panel (follow active editor)' : 'Lock panel to current file'}
				>
					{isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
					<span className="hidden sm:inline">{isLocked ? 'Locked' : 'Unlocked'}</span>
				</button>
			</div>
		</div>
	);
}
