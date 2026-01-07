import { ChevronDown, Filter } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface PathFilterDropdownProps {
	paths: string[][];
	selectedPaths: string[];
	onSelectionChange: (paths: string[]) => void;
}

interface PathNode {
	segment: string;
	fullPath: string[];
	children: PathNode[];
	depth: number;
}

/**
 * パス配列からツリー構造を構築
 */
function buildPathTree(paths: string[][]): PathNode[] {
	const root: PathNode[] = [];

	for (const path of paths) {
		if (path.length === 0) continue;

		let currentLevel = root;
		for (let i = 0; i < path.length; i++) {
			const segment = path[i];
			const fullPath = path.slice(0, i + 1);

			let existingNode = currentLevel.find((n) => n.segment === segment);
			if (!existingNode) {
				existingNode = {
					segment,
					fullPath,
					children: [],
					depth: i,
				};
				currentLevel.push(existingNode);
			}
			currentLevel = existingNode.children;
		}
	}

	return root;
}

/**
 * ツリーをフラット化（深さ優先）
 */
function flattenTree(nodes: PathNode[]): PathNode[] {
	const result: PathNode[] = [];
	for (const node of nodes) {
		result.push(node);
		result.push(...flattenTree(node.children));
	}
	return result;
}

/**
 * パスによる絞込みドロップダウン
 */
export function PathFilterDropdown({
	paths,
	selectedPaths,
	onSelectionChange,
}: PathFilterDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);

	// パスツリーを構築
	const pathTree = useMemo(() => buildPathTree(paths), [paths]);
	const flatPaths = useMemo(() => flattenTree(pathTree), [pathTree]);

	// 選択中のパスをSetで管理（高速検索用）
	const selectedPathsSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

	// パスの選択/解除
	const togglePath = useCallback(
		(pathStr: string) => {
			const newSelected = selectedPathsSet.has(pathStr)
				? selectedPaths.filter((p) => p !== pathStr)
				: [...selectedPaths, pathStr];
			onSelectionChange(newSelected);
		},
		[selectedPaths, selectedPathsSet, onSelectionChange],
	);

	// すべて表示（選択解除）
	const showAll = useCallback(() => {
		onSelectionChange([]);
	}, [onSelectionChange]);

	// 表示ラベル
	const label = useMemo(() => {
		if (selectedPaths.length === 0) {
			return 'All';
		}
		if (selectedPaths.length === 1) {
			return selectedPaths[0];
		}
		return `${selectedPaths.length} selected`;
	}, [selectedPaths]);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-expanded={isOpen}
					aria-haspopup="listbox"
					className={cn(
						'flex items-center gap-2 px-3 py-1.5 rounded-md',
						'text-sm font-medium',
						'bg-secondary text-secondary-foreground',
						'hover:bg-secondary/80 transition-colors',
						'border border-border',
						'min-w-35',
					)}
				>
					<Filter className="h-4 w-4 shrink-0" />
					<span className="truncate">Filter: {label}</span>
					<ChevronDown
						className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
					/>
				</button>
			</PopoverTrigger>

			<PopoverContent align="start" className="w-70 max-h-75 overflow-auto p-0">
				{/* すべて表示オプション */}
				<button
					type="button"
					role="option"
					aria-selected={selectedPaths.length === 0}
					onClick={showAll}
					className={cn(
						'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
						'hover:bg-muted transition-colors',
						selectedPaths.length === 0 && 'bg-muted/50',
					)}
				>
					<input
						type="checkbox"
						checked={selectedPaths.length === 0}
						readOnly
						className="h-4 w-4 rounded border-border"
					/>
					<span>Show All</span>
				</button>

				{flatPaths.length > 0 && <div className="border-t border-border" />}

				{/* パス一覧 */}
				{flatPaths.map((node) => {
					const pathStr = node.fullPath.join(' / ');
					const isSelected = selectedPathsSet.has(pathStr);

					return (
						<button
							key={pathStr}
							type="button"
							role="option"
							aria-selected={isSelected}
							onClick={() => togglePath(pathStr)}
							className={cn(
								'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
								'hover:bg-muted transition-colors',
								isSelected && 'bg-muted/50',
							)}
							style={{ paddingLeft: `${12 + node.depth * 16}px` }}
						>
							<input
								type="checkbox"
								checked={isSelected}
								readOnly
								className="h-4 w-4 rounded border-border"
							/>
							<span>{node.segment}</span>
						</button>
					);
				})}

				{flatPaths.length === 0 && (
					<div className="px-3 py-2 text-sm text-muted-foreground">No paths available</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
