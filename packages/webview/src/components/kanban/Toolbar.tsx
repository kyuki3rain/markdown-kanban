import type { KanbanConfig } from '../../types';
import { PathFilterDropdown } from './PathFilterDropdown';
import { SortByDropdown } from './SortByDropdown';

interface ToolbarProps {
	config: KanbanConfig;
	paths: string[][];
	onFilterPathsChange: (filterPaths: string[]) => void;
	onSortByChange: (sortBy: KanbanConfig['sortBy']) => void;
}

/**
 * ツールバーコンポーネント
 * フィルター、ソートなどの操作を提供する
 */
export function Toolbar({ config, paths, onFilterPathsChange, onSortByChange }: ToolbarProps) {
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
			</div>
		</div>
	);
}
