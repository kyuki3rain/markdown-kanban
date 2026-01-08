import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { useCallback, useState } from 'react';
import { cn } from '../../lib/utils';
import type { KanbanConfig } from '../../types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

type SortBy = KanbanConfig['sortBy'];

interface SortByDropdownProps {
	sortBy: SortBy;
	onSortByChange: (sortBy: SortBy) => void;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
	{ value: 'markdown', label: 'Markdown Order' },
	{ value: 'priority', label: 'Priority' },
	{ value: 'due', label: 'Due Date' },
	{ value: 'alphabetical', label: 'Alphabetical' },
];

/**
 * ソート方式ドロップダウン
 */
export function SortByDropdown({ sortBy, onSortByChange }: SortByDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);

	const handleSelect = useCallback(
		(value: SortBy) => {
			onSortByChange(value);
			setIsOpen(false);
		},
		[onSortByChange],
	);

	const currentLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? 'Markdown Order';

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
					<ArrowUpDown className="h-4 w-4 shrink-0" />
					<span className="truncate">Sort: {currentLabel}</span>
					<ChevronDown
						className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
					/>
				</button>
			</PopoverTrigger>

			<PopoverContent align="end" className="w-50 p-0">
				{SORT_OPTIONS.map((option) => (
					<button
						key={option.value}
						type="button"
						role="option"
						aria-selected={sortBy === option.value}
						onClick={() => handleSelect(option.value)}
						className={cn(
							'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
							'hover:bg-muted transition-colors',
							sortBy === option.value && 'bg-muted/50',
						)}
					>
						<input
							type="radio"
							checked={sortBy === option.value}
							readOnly
							tabIndex={-1}
							aria-hidden="true"
							className="h-4 w-4 pointer-events-none"
						/>
						<span>{option.label}</span>
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}
