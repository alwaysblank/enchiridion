import {TFile} from 'obsidian';
import localforage from "localforage";
import Enchiridion from '../main';
import {Node} from 'unist';

export type Cached<T> = {
	timestamp: number,
	content: T,
}

export default class Cache {
	plugin: Enchiridion
	cache: LocalForage;
	constructor(plugin: Enchiridion) {
		this.plugin = plugin;
		this.cache = localforage.createInstance({
			name: `enchiridion/cache/${this.plugin.app.appId}`,
			driver: [localforage.INDEXEDDB],
			description: 'Cached derived data from Enchridion-tracked files.'
		})
	}

	async sync() {
		Promise.allSettled(this.plugin.files.getTracked().map(async (file: TFile) => {
			const isSynced = await this.isFileSynced(file);
			if (isSynced) return;
			try {
				await this.updateFile(file);
			} catch (e) {
				this.plugin.debug.error('Could not update file', e, file);
			} finally {
				this.plugin.debug.info('File updated', file);
			}}))
			.then(() => this.plugin.debug.info('Sync complete'))
			.catch(e => this.plugin.debug.error('Sync failed', e))
	}

	/**
	 * Is this file up-to-date in the cache?
	 */
	async isFileSynced(file: TFile): Promise<boolean> {
		const cached = await this.cache.getItem<Cached<Node>>(file.path);
		if (!cached) {
			return false;
		}
		return cached.timestamp === file.stat.mtime
	}

	/**
	 * Return the cached representation of the file.
	 *
	 * Note that this will automatically trigger and update if the file is out
	 * of date, so this method can be trusted to always return "correct" data.
	 */
	async getFile(file: TFile): Promise<Node> {
		const cached = await this.cache.getItem<Cached<Node>>(file.path);
		if (cached && cached.timestamp === file.stat.mtime) {
			return cached.content;
		}
		return this.updateFile(file);
	}

	/**
	 * Remove a file from the cache.
	 *
	 * Does *not* affect the actual note; we're just using the file to look up
	 * the cached data.
	 */
	async deleteFile(file: TFile) {
		return this.deleteByPath(file.path);
	}

	async deleteByPath(path: string) {
		return this.cache.removeItem(path);
	}

	async updateFile(file: TFile): Promise<Node> {
		const fresh = await this.plugin.marcus.parseFile(file);
		const updated = await this.cache.setItem<Cached<Node>>(file.path, {
			timestamp: file.stat.mtime,
			content: fresh,
		})
		return updated.content;
	}
}
