import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import {fromMarkdown} from 'mdast-util-from-markdown'
import {Heading, HeadingData, Root, RootContent, Text} from 'mdast';
import {toString} from 'mdast-util-to-string';
// Remember to rename these classes and interfaces!

interface EnchiridionSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: EnchiridionSettings = {
	mySetting: 'default'
}

interface ParsedNode {
	parent?: ParsedNode,
	children?: Array<any>,
	content?: string,
	depth?: number,
}

export default class Enchiridion extends Plugin {
	settings: EnchiridionSettings;

	/**
	 * Runs whenever the plugin starts being used.
	 */
	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EnchiridionSettingsTab(this.app, this));

		this.addRibbonIcon( 'info', 'do the thing', async () => {
			const { vault, metadataCache } = this.app;

			const fileContents: string[] = await Promise.all(
				vault.getMarkdownFiles().map(async (file) => {
					const doc = await vault.cachedRead( file );
					return this.parseAst( fromMarkdown( doc.replace( /---\n.*?\n---/s, '' ) ) );
				})
			);

			console.dir(fileContents);
		} )
	}

	getLast( arr: Array<any> ): any {
		return arr[arr.length - 1];
	}

	parseAst( ast: Root ) {
		const headings: ParsedNode[] = [];
		const tree: ParsedNode[] = [];
		ast.children.forEach( node => {
			if ( 'heading' === node.type ) {
				const lastHeading = this.getLast( headings );
				const { heading, depth } = this.getHeadingData( node );
				const parsedHeading: ParsedNode = {
					content: heading,
					depth,
					children: [],
				}
				if ( lastHeading?.depth && lastHeading.depth < depth ) {
					lastHeading.children.push(parsedHeading);
				} if ( headings.length > 0 && lastHeading.depth >= depth ) {
					while( this.getLast( headings ).depth >= depth ) {
						headings.pop()
					}
					if ( this.getLast(headings) ) {
						this.getLast(headings).children.push(parsedHeading);
					}
				}
				headings.push( parsedHeading );
				if ( 1 === depth ) {
					tree.push(parsedHeading);
				}
			} else {
				const parsedNode: ParsedNode = {
					content: toString( node ),
				}
				if ( this.getLast(headings) ) {
					this.getLast(headings).children.push(parsedNode);
				}
			}
		} );
		return tree;
	}

	getHeadingData( node: Heading ): {heading: string, depth: number} {
		const heading = toString( node );
		const depth = node.depth;
		return {
			heading,
			depth,
		};
	}

	// thinking() {
	// 	const source = [
	// 		{ type: 'heading', depth: 1,  }
	// 	];
	// 	/**
	// 	 * Let's say I'm writing a recursive algo to process this. It would
	// 	 * probably look something like:
	// 	 */
	// 	function process( item: object, statblock: object ) {
	// 		if ( item.children.length > 0 ) {
	//
	// 		}
	// 		/**
	// 		 * switch based on item.type to do different things:
	// 		 * what if with headings we augmented each heading object with a
	// 		 * parent field that pointed to the heading above it (i.e. the
	// 		 * last heading we'd processed)?
	// 		 *
	// 		 * If the top level of our document is made up solely of headings,
	// 		 * they we can use those as keys for other objects.
	// 		 * i.e.
	// 		 * {
	// 		 *     "Creature Name": {
	// 		 *         "Stats": [10, 10, 10, 10, 10, 10],
	// 		 *         "Actions": {
	// 		 *             "Ritual Drum": {
	// 		 *                 "text": "Do whatever ritual drum does"
	// 		 *             }
	// 		 *         }
	// 		 *     }
	// 		 * }
	// 		 */
	// 		let heading: { depth: number, parent?: object } = { depth: 4 }; // don't complain
	// 		let lastHeading: { depth: number, parent?: object } = { depth: 3 };
	// 		if ( lastHeading && lastHeading.depth < heading.depth ) {
	// 			// If there is a last heading && it is above us in hierarchy
	// 			heading.parent = lastHeading;
	// 			lastHeading = heading;
	// 		} else if ( ! lastHeading || lastHeading.depth === heading.depth ) {
	// 			// These are the same level, so just move to current heading
	// 			lastHeading = heading;
	// 		} else if ( lastHeading && lastHeading.depth > heading.depth ) {
	// 			// The last heading is below us in the hierarchy, so we need
	// 			// to move up.
	// 			lastHeading = heading;
	// 		}
	// 	}
	// }

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
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
