import {App, TFile} from 'obsidian';
import localforage from "localforage";
import Enchiridion from '../main';
import {Node} from 'unist';

export type Cached<T> = {
	timestamp: number,
	content: T,
}

export default class Cache {
	app: App & {appId: number};
	plugin: Enchiridion;
	cache: LocalForage;
	constructor(app: App, plugin: Enchiridion) {
		this.app = app as App & {appId: number};
		this.plugin = plugin;
		this.cache = localforage.createInstance({
			name: `enchiridion/cache/${this.app.appId}`,
			driver: [localforage.INDEXEDDB],
			description: 'Cached derived data from Enchridion-tracked files.'
		})
	}

	async getFile(file: TFile): Promise<Node> {
		const cached = await this.cache.getItem<Cached<Node>>(file.path);
		if (cached && cached.timestamp === file.stat.mtime) {
			return cached.content;
		}
		return this.updateFile(file);
	}

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
