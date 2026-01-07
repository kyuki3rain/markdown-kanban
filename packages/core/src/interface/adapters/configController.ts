import { err, type Result } from 'neverthrow';
import type {
	GetConfigUseCase,
	UpdateConfigInput,
	UpdateConfigUseCase,
} from '../../application/usecases';
import { UpdateConfigError } from '../../application/usecases';
import type { KanbanConfig } from '../../domain/ports/configProvider';

/**
 * ConfigController
 * 設定操作のエントリーポイント
 */
export class ConfigController {
	constructor(
		private readonly getConfigUseCase: GetConfigUseCase,
		private readonly updateConfigUseCase?: UpdateConfigUseCase,
	) {}

	/**
	 * 設定を取得する
	 */
	async getConfig(): Promise<KanbanConfig> {
		return this.getConfigUseCase.execute();
	}

	/**
	 * 特定の設定項目を取得する
	 */
	async get<K extends keyof KanbanConfig>(key: K): Promise<KanbanConfig[K]> {
		return this.getConfigUseCase.get(key);
	}

	/**
	 * 設定を更新する
	 */
	async updateConfig(updates: UpdateConfigInput): Promise<Result<void, UpdateConfigError>> {
		if (!this.updateConfigUseCase) {
			return err(new UpdateConfigError('UpdateConfigUseCaseが設定されていません'));
		}

		const result = await this.updateConfigUseCase.execute(updates);
		return result.map(() => undefined);
	}
}
