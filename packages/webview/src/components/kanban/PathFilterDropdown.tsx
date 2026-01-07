import { ChevronDown, Filter } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

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
	const dropdownRef = useRef<HTMLDivElement>(null);

	// パスツリーを構築
	const pathTree = useMemo(() => buildPathTree(paths), [paths]);
	const flatPaths = useMemo(() => flattenTree(pathTree), [pathTree]);

	// 選択中のパスをSetで管理（高速検索用）
	const selectedPathsSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

	// ドロップダウン外クリックで閉じる
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen]);

	// Escapeで閉じる
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleKeyDown);
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen]);

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
		<div ref={dropdownRef} className="relative">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				className={cn(
					'flex items-center gap-2 px-3 py-1.5 rounded-md',
					'text-sm font-medium',
					'bg-secondary text-secondary-foreground',
					'hover:bg-secondary/80 transition-colors',
					'border border-border',
				)}
			>
				<Filter className="h-4 w-4" />
				<span>Filter: {label}</span>
				<ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
			</button>

			{isOpen && (
				<div
					role="listbox"
					className={cn(
						'absolute left-0 top-full mt-1 z-50',
						'min-w-[200px] max-h-[300px] overflow-auto',
						'bg-popover border border-border rounded-md shadow-lg',
					)}
				>
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
				</div>
			)}
		</div>
	);
}
