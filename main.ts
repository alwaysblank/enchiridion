import {App, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile} from 'obsidian';
import Marcus from './src/parsers/Marcus';
import Cache from './src/Cache'
import Debug from './src/Debug';
import Files from './src/Files';

interface EnchiridionSettings {
	debug: {
		log: boolean,
	}
}

export type EnhancedApp = App & {
	appId: number, // This prop exists, but is not officially documented, so we must add it.
}

const DEFAULT_SETTINGS: EnchiridionSettings = {
	debug: {
		log: false,
	}
}

export default class Enchiridion extends Plugin {
	app!: EnhancedApp;
	settings: EnchiridionSettings = DEFAULT_SETTINGS;
	marcus: Marcus = new Marcus(this);
	cache: Cache = new Cache(this);
	debug: Debug = new Debug(this);
	files: Files = new Files(this);

	/**
	 * Runs whenever the plugin starts being used.
	 */
	async onload() {
		await this.loadSettings();

		/**
		 * We start this early so it will sync data, but we don't await it
		 * because we don't actually need the results.
		 */
		this.cache.sync();

		this.hooks();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EnchiridionSettingsTab(this.app, this));

		this.addRibbonIcon( 'info', 'Parse Current File', async () => {
			const active = this.app.workspace.getActiveFile();
			if (active) {
				const parsed = await this.marcus.parseFile(active);
				this.debug.info('Processed file:', parsed);
			}
		} )

		this.addRibbonIcon('info', 'Sync', () => {
			this.cache.sync();
		})

	}

	/**
	 * Attach any necessary hooks.
	 */
	hooks() {
		this.registerEvent(this.app.vault.on('create', (file: TAbstractFile) => {
			if (file instanceof TFile) {
				this.cache.updateFile(file)
					.then(() => this.debug.info(`${file.path} add to Enchiridion database.`))
					.catch((reason) => this.debug.error(reason))
			}
		}));
		this.registerEvent(this.app.vault.on('modify', (file: TAbstractFile) => {
			if (file instanceof TFile) {
				this.cache.updateFile(file)
					.then(() => this.debug.info(`${file.path} updated in Enchiridion database.`))
					.catch((reason) => this.debug.error(reason))
			}
		}));
		this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
			if (file instanceof TFile) {
				this.cache.deleteByPath(oldPath)
					.then(() => {
						this.debug.info(`${oldPath} removed from Enchiridion database.`)
						return this.cache.updateFile(file)
					})
					.then(() => this.debug.info(`${file.path} updated in Enchiridion database.`))
					.catch((reason) => this.debug.error(reason))
			}
		}));
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
