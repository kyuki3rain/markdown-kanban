import matter from 'gray-matter';
import type { Root } from 'mdast';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';

/**
 * フロントマター抽出結果
 */
export interface FrontmatterResult {
	/** フロントマターを除いたコンテンツ */
	content: string;
	/** フロントマターのデータ */
	data: Record<string, unknown>;
}

/**
 * RemarkClient
 * remarkライブラリとgray-matterのラッパー
 */
export class RemarkClient {
	private readonly processor = remark().use(remarkGfm);

	/**
	 * MarkdownをASTにパースする
	 */
	parseToAst(content: string): Root {
		return this.processor.parse(content) as Root;
	}

	/**
	 * フロントマターを抽出する
	 */
	parseFrontmatter(markdown: string): FrontmatterResult {
		const { content, data } = matter(markdown);
		return { content, data };
	}

	/**
	 * フロントマターの行数を計算
	 */
	countFrontmatterLines(original: string, content: string): number {
		if (original === content) {
			return 0;
		}
		const frontmatter = original.slice(0, original.length - content.length);
		return frontmatter.split('\n').length - 1;
	}

	/**
	 * フロントマターを更新してMarkdownを返す
	 */
	updateFrontmatter(markdown: string, updates: Record<string, unknown>): string {
		const { content, data } = matter(markdown);

		// 既存のkanbanセクションを取得または作成
		const kanban = (data.kanban as Record<string, unknown>) ?? {};

		// updatesをkanbanセクションにマージ
		const updatedKanban = { ...kanban, ...updates };

		// undefinedの値を削除
		for (const key of Object.keys(updatedKanban)) {
			if (updatedKanban[key] === undefined) {
				delete updatedKanban[key];
			}
		}

		// 更新されたデータ
		const updatedData = { ...data, kanban: updatedKanban };

		// gray-matterのstringifyでフロントマターを再生成
		return matter.stringify(content, updatedData);
	}
}
