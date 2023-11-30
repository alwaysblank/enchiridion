import {FrontMatterCache, TFile} from 'obsidian';
import {get} from 'lodash';
import {DocumentTree, Empty, parseFile} from './markdown';
import Enchiridion from '../main';

export interface EFile {
    tree: DocumentTree,
    settings: {
        system: string,
        type: string,
    }
}

export async function getFileData(file: TFile, plugin: Enchiridion): Promise<null | EFile> {
    const {
		app: {
			metadataCache: metacache,
		},
		settings: {
			tracking: {
				system,
				type,
			}
		}
	} = plugin;
    if (!isEnchiridionFile(file, plugin)) {
        throw new TypeError('File is not a valid Enchiridion file.');
    }
    const frontmatter = get(metacache.getFileCache(file), 'frontmatter', {});
    const data: DocumentTree | Empty = await parseFile(file, plugin);
    if (data.type !== 'empty') {
        return {
            tree: data,
            settings: {
                system: get(frontmatter, system, 'custom'),
                type: get(frontmatter, type, 'generic'),
            }
        }
    }
    return null; // File is empty.
}


export function isEnchiridionFile(file: TFile, plugin: Enchiridion): boolean {
    const {metadataCache: metacache} = plugin.app;
    const cache = metacache.getFileCache(file) || {};
    if (!('frontmatter' in cache) || typeof cache.frontmatter === 'undefined') {
        return false;
    }
    return isEnchiridionFrontmatter(cache.frontmatter);
}

export function isEnchiridionFrontmatter(frontmatter: FrontMatterCache): boolean {
    return !!get(frontmatter, ['enchiridion'], false);
}

export function getTracked(plugin: Enchiridion): Array<TFile> {
    const {vault} = plugin.app;
    return vault.getMarkdownFiles().filter((file: TFile) => {
        return isEnchiridionFile(file, plugin);
    });
}
