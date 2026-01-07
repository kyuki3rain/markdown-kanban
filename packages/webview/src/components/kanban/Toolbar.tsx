import type { KanbanConfig } from '../../types';
import { PathFilterDropdown } from './PathFilterDropdown';

interface ToolbarProps {
	config: KanbanConfig;
	paths: string[][];
	onFilterPathsChange: (filterPaths: string[]) => void;
}

/**
 * ツールバーコンポーネント
 * フィルター、ソートなどの操作を提供する
 */
export function Toolbar({ config, paths, onFilterPathsChange }: ToolbarProps) {
	return (
		<div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
			<div className="flex items-center gap-4">
				<PathFilterDropdown
					paths={paths}
					selectedPaths={config.filterPaths}
					onSelectionChange={onFilterPathsChange}
				/>
			</div>
			<div className="flex items-center gap-4">{/* 将来の拡張: SortByドロップダウン等 */}</div>
		</div>
	);
}
