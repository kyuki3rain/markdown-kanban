import type { ReactNode } from 'react';
import { vi } from 'vitest';

// Mock for useDroppable hook
export const mockUseDroppable = vi.fn().mockReturnValue({
	isOver: false,
	setNodeRef: vi.fn(),
});

// Mock for useDraggable hook
export const mockUseDraggable = vi.fn().mockReturnValue({
	attributes: {},
	listeners: {},
	setNodeRef: vi.fn(),
	isDragging: false,
});

// Mock for useSensors hook
export const mockUseSensors = vi.fn().mockReturnValue([]);

// Mock for useSensor hook
export const mockUseSensor = vi.fn().mockReturnValue({});

/**
 * Reset dnd-kit mocks
 */
export function resetDndKitMocks(): void {
	mockUseDroppable.mockClear().mockReturnValue({
		isOver: false,
		setNodeRef: vi.fn(),
	});
	mockUseDraggable.mockClear().mockReturnValue({
		attributes: {},
		listeners: {},
		setNodeRef: vi.fn(),
		isDragging: false,
	});
	mockUseSensors.mockClear().mockReturnValue([]);
	mockUseSensor.mockClear().mockReturnValue({});
}

/**
 * DndContext mock component
 */
export function MockDndContext({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

/**
 * DragOverlay mock component
 */
export function MockDragOverlay({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
