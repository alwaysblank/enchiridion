import {App, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile} from 'obsidian';
import Marcus from './src/parsers/Marcus';
import Cache from './src/Cache'
import Debug from './src/Debug';

interface EnchiridionSettings {
	debug: {
		log: boolean,
	}
}

const DEFAULT_SETTINGS: EnchiridionSettings = {
	debug: {
		log: false,
	}
}

export default class Enchiridion extends Plugin {
	settings: EnchiridionSettings = DEFAULT_SETTINGS;
	marcus: Marcus = new Marcus(this.app);
	cache: Cache = new Cache(this.app, this);
	debug: Debug = new Debug(this.app, this);

	/**
	 * Runs whenever the plugin starts being used.
	 */
	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EnchiridionSettingsTab(this.app, this));

		this.addRibbonIcon( 'info', 'Parse Current File', async () => {
			const active = this.app.workspace.getActiveFile();
			if (active) {
				const parsed = await this.marcus.parseFile(active);
				this.debug.info('Processed file:', parsed);
			}
		} )

		this.hooks();
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
