import {PluginSettingTab, Setting} from 'obsidian';
import Enchiridion from '../../main';
import {DEFAULT_SETTINGS} from './defaults';
import {getSetting, putSetting} from './api';
import {get} from 'lodash';

export class SettingsUI extends PluginSettingTab {
    #getSetting = <T,>(key: string | Array<string>, fallback?: T): T => {
        return getSetting<T>(
            key,
            fallback || get(DEFAULT_SETTINGS, key),
            this.plugin
        );
    }
    #putSetting = <T,>(key: string | Array<string>, value: T) => {
        return putSetting<T>(key, value, this.plugin);
    }

    constructor(
        public plugin: Enchiridion,
    ) {
        super(plugin.app, plugin);
    }

    display(): void {
        const {containerEl} = this;
        const onChange = <T,>(key: string | Array<string>) => {
            return (value: T) => this.#putSetting<T>(key, value);
        }

        containerEl.empty();


        new Setting(containerEl)
            .setName('Show debug logs')
            .setDesc('Output debug logging to console (otherwise logs are suppressed).')
            .addToggle( toggle => {
                const path = ['debug', 'log'];
                toggle
                    .setValue(this.#getSetting(path))
                    .onChange(onChange<boolean>(path))
                }
            );

        new Setting(containerEl)
            .setName('Properties')
            .setDesc('Optionally specify the names of YAML properties in frontmatter that are used by Enchiridion for various purposes. You might customize these to integration with other plugins, such as Metadata Menu.')
            .setHeading()

        new Setting(containerEl)
            .setName('Should track')
            .setDesc('The frontmatter property Enchiridion looks for to see if this is a note it should track.')
            .addText(text => {
                const path = ['tracking', 'enchiridion'];
                text
                    .setValue(this.#getSetting<string>(path))
                    .onChange(onChange<string>(path))
                    .setPlaceholder(get(DEFAULT_SETTINGS, path))
                }
            );

        new Setting(containerEl)
            .setName('System')
            .setDesc('The frontmatter property Enchiridion uses to determine the system this item is for.')
            .addText(text => {
                const path = ['tracking', 'system'];
                text
                    .setValue(this.#getSetting(path))
                    .onChange(onChange<string>(path))
                    .setPlaceholder(get(DEFAULT_SETTINGS, path))
                }
            );

        new Setting(containerEl)
            .setName('Type')
            .setDesc('The frontmatter property Enchiridion uses to determine what type of item this is (i.e. creature, equipment, etc).')
            .addText(text => {
                    const path = ['tracking', 'type'];
                    text
                        .setValue(this.#getSetting(path))
                        .onChange(onChange<string>(path))
                        .setPlaceholder(get(DEFAULT_SETTINGS, path))
                }
            );
    }
}
