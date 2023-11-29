import {App, Plugin} from 'obsidian';
import Cache from './src/Cache.js'
import Debug from './src/Debug.js';
import {getFileData} from './src/files.js';
import Search from './src/Search.js';
import {EnchiridionSettingsTab} from './src/settings/ui';
import {EnchiridionSettings} from './src/settings/settings';
import {DEFAULT_SETTINGS} from './src/settings/defaults';


export type EnhancedApp = App & {
	appId: number, // This prop exists, but is not officially documented, so we must add it.
	loadLocalStorage: (key: string) => any, // Undocumented core function.
	saveLocalStorage: (key: string, value: any) => void, // Undocumented core function.
}

export default class Enchiridion extends Plugin {
	app!: EnhancedApp;
	settings: EnchiridionSettings = DEFAULT_SETTINGS;
	cache: Cache = new Cache(this);
	debug: Debug = new Debug(this);
	search: Search = new Search(this);

	/**
	 * Runs whenever the plugin starts being used.
	 */
	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EnchiridionSettingsTab(this));

		this.addRibbonIcon( 'info', 'Parse Current File', async () => {
			const active = this.app.workspace.getActiveFile();
			if (active) {
				const parsed = await getFileData(active, this);
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


