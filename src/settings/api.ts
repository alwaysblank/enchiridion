import Enchiridion from '../../main';
import {get, set} from 'lodash';

export function getSetting<T>(key: string | Array<string>, fallback: T, plugin: Enchiridion): T {
    const {settings} = plugin;
    return get(settings, key, fallback);
}

/**
 * Set a plugin value and save it.
 *
 * This is async so that it can return the promise returned by
 * {@link Enchiridion.saveSettings()} in case you want to know what happened,
 * but generally it's fine to run this without waiting for the outcome.
 */
export async function putSetting<T>(key: string | Array<string>, value: T, plugin: Enchiridion) {
    const {settings} = plugin;
    set(settings, key, value);
    return plugin.saveSettings();
}
