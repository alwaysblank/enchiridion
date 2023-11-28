import {App, Plugin, PluginSettingTab, Setting} from 'obsidian';
import Cache from './src/Cache.js'
import Debug from './src/Debug.js';
import Files from './src/Files.js';
import Search from './src/Search.js';
import {parseFile} from './src/parsers/markdown.js';

interface EnchiridionSettings {
	debug: {
		log: boolean,
	}
}

export type EnhancedApp = App & {
	appId: number, // This prop exists, but is not officially documented, so we must add it.
	loadLocalStorage: (key: string) => any, // Undocumented core function.
	saveLocalStorage: (key: string, value: any) => void, // Undocumented core function.
}

const DEFAULT_SETTINGS: EnchiridionSettings = {
	debug: {
		log: false,
	}
}

export default class Enchiridion extends Plugin {
	app!: EnhancedApp;
	settings: EnchiridionSettings = DEFAULT_SETTINGS;
	cache: Cache = new Cache(this);
	debug: Debug = new Debug(this);
	files: Files = new Files(this);
	search: Search = new Search(this);

	/**
	 * Runs whenever the plugin starts being used.
	 */
	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EnchiridionSettingsTab(this.app, this));

		this.addRibbonIcon( 'info', 'Parse Current File', async () => {
			const {vault, metadataCache} = this.app;
			const active = this.app.workspace.getActiveFile();
			if (active) {
				const parsed = await parseFile(active, vault, metadataCache);
				this.debug.info('Processed file:', parsed);
			}
		} )

		this.addRibbonIcon('info', 'Search', () => {
			this.search.open();
		})
	}

	/**
	 * Runs whenever the plugin is disabled.
	 */
	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class EnchiridionSettingsTab extends PluginSettingTab {
	plugin: Enchiridion;

	constructor(app: App, plugin: Enchiridion) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Show Debug Logs')
			.setDesc('Output debug logging to console (otherwise logs are suppressed).')
			.addToggle( toggle => toggle
				.setValue(this.plugin.settings.debug.log)
				.onChange(value => {
					this.plugin.settings.debug.log = value
					this.plugin.saveSettings();
				})
			);
	}
}
