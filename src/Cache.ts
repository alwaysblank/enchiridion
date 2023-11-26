import {TFile} from 'obsidian';
import Enchiridion from '../main';
import {Node} from 'unist';
import { Database } from './vendor/obsidian-database-library';
import {u} from 'unist-builder';

export type Cached<T> = {
	timestamp: number,
	content: T,
}

export default class Cache {
	plugin: Enchiridion
	cache: Database<Node>;
	constructor(plugin: Enchiridion) {
		this.plugin = plugin;
		this.cache = new Database(
			this.plugin,
			`enchiridion/cache/${this.plugin.app.appId}`,
			'Enchiridion Cache',
			1,
			'Contains files converted into generic trees.',
			(): Node => u('empty'),
			async (file: TFile) => this.plugin.marcus.parseFile(file),
			(file: TFile) => {
				const { app: {metadataCache}} = this.plugin;
				const {frontmatter} = metadataCache.getFileCache(file) || {frontmatter: {enchiridion: false}};
				return !!frontmatter?.enchiridion;
			},
			2
		)
	}

	/**
	 * Is this file up-to-date in the cache?
	 */
	isCached(file: TFile)  {
		return !!this.cache.getItem(file.path);

	}

	/**
	 * Return the cached representation of the file.
	 *
	 * Note that this will automatically trigger and update if the file is out
	 * of date, so this method can be trusted to always return "correct" data.
	 */
	async getFile(file: TFile): Promise<Node> {
		const cached = this.maybeGetFile(file);
		if (null !== cached) {
			return cached;
		}
		const fresh = await this.plugin.marcus.parseFile(file);
		this.cache.storeKey(file.path, fresh, file.stat.mtime)
		return fresh;
	}

	/**
	 * Get the file if it's in the cache; null otherwise.
	 *
	 * The advantage of this method over {@link Cache.getFile()} is that its synchronous
	 * and doesn't require you to wait.
	 */
	maybeGetFile(file: TFile): Node|null {
		const item = this.cache.getItem(file.path);
		if (item) {
			return item.data;
		}
		return null;
	}

	/**
	 * Remove a file from the cache.
	 *
	 * Does *not* affect the actual note; we're just using the file to look up
	 * the cached data.
	 */
	deleteFile(file: TFile) {
		return this.deleteByPath(file.path);
	}

	deleteByPath(path: string) {
		return this.cache.deleteKey(path);
	}

	async updateFile(file: TFile): Promise<Node> {
		const fresh = await this.plugin.marcus.parseFile(file);
		this.cache.storeKey(file.path, fresh, file.stat.mtime)
		return fresh;
	}
}
