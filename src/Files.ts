import Enchiridion from '../main';
import {TFile} from 'obsidian';
import {get} from 'lodash';

export default class Files {
	plugin: Enchiridion;

	constructor(plugin: Enchiridion) {
		this.plugin = plugin;
	}

	/**
	 * Get all files that Enchiridion is paying attention to.
	 */
	getTracked(): Array<TFile> {
		const {vault, metadataCache} = this.plugin.app;
		return vault.getMarkdownFiles().filter((file: TFile) => {
			return get(metadataCache.getFileCache(file), ['frontmatter', 'enchiridion'], false);
		});
	}
}
