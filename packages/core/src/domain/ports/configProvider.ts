import { DEFAULT_CONFIG, type KanbanConfig } from '@md-tasks/shared';

export type { KanbanConfig };
export { DEFAULT_CONFIG };

/**
 * 設定プロバイダポート
 * 設定の取得を定義する
 */
export interface ConfigProvider {
	/**
	 * 設定を取得する
	 * フロントマター → VSCode設定 → デフォルト の優先順位で解決する
	 */
	getConfig(): Promise<KanbanConfig>;

	/**
	 * 特定の設定項目を取得する
	 */
	get<K extends keyof KanbanConfig>(key: K): Promise<KanbanConfig[K]>;
}
