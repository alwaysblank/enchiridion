import {TFile} from 'obsidian';
import Enchiridion from '../main.js';
import {Node} from 'unist';
import {Database} from './vendor/obsidian-database-library/index.js'
import {u} from 'unist-builder';
import {parseFile} from './markdown.js';

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
			`enchiridion/data/${this.plugin.app.appId}`,
			'Enchiridion Data Cache',
			1,
			'Caches node trees after parsing from markdown.',
			(): Node => u('empty'),
			async (file: TFile) => parseFile(file, this.plugin.app.vault, this.plugin.app.metadataCache),
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
	 * Note that this will automatically trigger an update if the file is out
	 * of date or doesn't exist in the cache.
	 */
	async getFile(file: TFile): Promise<Node> {
		const cached = this.cache.getItem(file.path);
		if (null !== cached && cached.mtime === file.stat.mtime) {
			return cached.data;
		}
		const fresh = await parseFile(file, this.plugin.app.vault, this.plugin.app.metadataCache);
		this.cache.storeKey(file.path, fresh, file.stat.mtime)
		return fresh;
	}

	/**
	 * Get the file if it's in the cache; null otherwise.
	 *
	 * The advantage of this method over {@link Cache.getFile()} is that it's
	 * synchronous and doesn't require you to wait.
	 */
	maybeGetFile(file: TFile): Node|null {
		return this.cache.getValue(file.path);
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
		const fresh = await parseFile(file, this.plugin.app.vault, this.plugin.app.metadataCache);
		this.cache.storeKey(file.path, fresh, file.stat.mtime)
		return fresh;
	}
}
