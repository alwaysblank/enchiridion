import {getLinkpath, parseLinktext, resolveSubpath, TFile} from 'obsidian';
import {fromMarkdown} from 'mdast-util-from-markdown'
import {Heading, List, ListItem, Paragraph, RootContent} from 'mdast';
import {Parent, Literal} from 'unist';
import {toString} from 'mdast-util-to-string';
import {snakeCase, difference} from 'lodash';
import {toMarkdown} from 'mdast-util-to-markdown';
import {u} from 'unist-builder'
import {normalizeHeadings} from 'mdast-normalize-headings'
import Enchiridion from '../../main';

export interface Keyed {
	key: string,
}

export interface Root extends Parent {
	type: 'root',
	name: string,
}

export interface Row extends Literal {
	type: 'row',
}

export interface Text extends Literal {
	type: 'text',
}

export interface Pair extends Literal, Keyed {
	type: 'pair',
}

/**
 * A generic keyed container for content.
 */
export interface Section extends Keyed, Parent {
	type: 'section',
	depth?: number,
}

/**
 * Generic container for mixed or complex content.
 */
export interface Collection extends Parent {
	type: 'collection',
}

/**
 * This is used as a "fail" value, and should generally be filtered out.
 */
export interface Empty extends Literal {
	type: 'empty',
	value: '',
}

export type ListItemType = 'nested' | 'pair' | 'row' | 'invalid' | 'empty';
export type ListType = 'row' | 'pair' | 'nested' | 'empty' | 'mixed' | 'invalid';

export default class Marcus {
	plugin: Enchiridion;

	constructor(plugin: Enchiridion) {
		this.plugin = plugin;
	}

	async parseFile( file: TFile) {
		const {vault, metadataCache} = this.plugin.app;
		// Collected all the content chunks for embeds, so we can easily get them later.
		const embedContent = await this.getEmbedContent(file)

		let doc = await vault.cachedRead( file );

		// Strip the frontmatter from the string. If frontmatter is being used, it is being used elsewhere.
		doc = doc.replace(/---\n.*?\n---/s, '');

		// If there are embeds to replace, use a regex to do so.
		if (embedContent.length > 0) {
			doc = doc.replaceAll(/!\[\[([^#|\]]*)(?:#([^|\]]*))?(?:\|([^\]]*))?\]\]/g, (original) => {
				const embedData = embedContent.find(entry => { return entry.original === original })

				if (typeof embedData === 'undefined') {
					return original;
				}

				return embedData.content
			});
		}

		// If this file doesn't have a top-level heading, use the filename.
		const fileCache = metadataCache.getFileCache(file);
		if (null !== fileCache) {
			const {headings = []} = fileCache;
			const hasTopLevel = headings.some(heading => heading.level === 1);
			if (!hasTopLevel) {
				const title = file.basename;
				doc = `# ${title}\n${doc}`;
			}
		}

		// Parse document that has been enhanced with includes.
		return this.parseDocument(doc);
	}


	/**
	 * Returns a simplified tree containing data parsed from Markdown.
	 *
	 * Embedded notes are inserted into the file before parsing, so their
	 * content will appear in this tree.
	 *
	 * This expects *only* Markdown; Strip frontmatter before passing to this
	 * method.
	 */
	parseDocument( document: string): Root|Empty {
		const tree = fromMarkdown(document)

		// Make sure all heading structures make sense.
		normalizeHeadings(tree);

		// Begin parsing the list of nodes.
		const nodes = tree.children.map(child => this.processNode(child));
		if (nodes.length === 0) {
			return this.makeEmptyNode();
		}
		const stack: Array<Section> = [];
		for (let i = 0; i < nodes.length; i++) {
			let tip = stack.pop();
			const currentNode = nodes[i];
			if(currentNode.type === 'section') {
				if (tip) {
					while ((!tip.depth || (currentNode.depth && tip.depth >= currentNode.depth)) && stack.length > 0) {
						const parent = stack.pop() as Section;
						parent.children.push(tip);
						tip = parent;
					}

					stack.push(tip);
					stack.push(currentNode);
				} else {
					// This is the top level.
					stack.push(currentNode);
				}
			} else {
				if (tip) {
					if ('children' in currentNode) {
						tip.children = [...tip.children, ...currentNode.children];
					} else if ('value' in currentNode && currentNode.type !== 'empty') {
						tip.children = [...tip.children, currentNode]
					}
					stack.push(tip);
				}
			}
		}
		if (stack.length < 1) {
			// Nothing to return.
			return this.makeEmptyNode();
		}

		// Collapse the stack down to close out any sections.
		while(stack.length > 1) {
			const oldSection = stack.pop();
			if (oldSection) {
				const parent = stack.pop();
				if (parent) {
					parent.children.push(oldSection);
					stack.push(parent);
				}
			}
		}
		return u('root', {name: stack[0].key}, stack[0].children)
	}

	async getEmbedContent( file: TFile ) {
		const {metadataCache, vault} = this.plugin.app;
		const metacache = metadataCache.getFileCache(file);
		if (!metacache) {
			return Promise.resolve([]);
		}
		return Promise.all( (metacache.embeds || []).map( async embed => {
			const {original, link} = embed;
			const {subpath} = parseLinktext(link);
			let content = '';
			const thisFile = metadataCache.getFirstLinkpathDest(getLinkpath(link), file.path);
			if (!thisFile) {
				return {original, content}
			}
			if (subpath) {
				const section = resolveSubpath(metadataCache.getFileCache(thisFile) || {}, subpath)
				if (section.type === 'heading') {
					content = await this.getSectionText(section.current.heading, thisFile);
				}
			} else {
				content = await vault.cachedRead(thisFile);
			}
			return {original, content};
		}) );
	}

	async getSectionText( name: string, file: TFile ) {
		const {metadataCache, vault} = this.plugin.app;
		const {headings} = metadataCache.getFileCache(file) || {};
		if (!headings) {
			// There are no headings to define sections.
			return ''
		}
		let startLine = -1;
		let endLine = -1;
		let i = 0;
		while (headings[i] && headings[i].heading !== name) {
			i++
		}
		if (!headings[i]) {
			return '';
		}
		const requestedHeading = headings[i];
		startLine = requestedHeading.position.start.line;
		i++; // Move to the next heading to start testing.
		while (headings[i] && headings[i].level > requestedHeading.level) {
			i++
		}
		if (!headings[i]) {
			// we reached the end of the file, so return everything after the startLine.
			endLine = Infinity;
		} else {
			endLine = headings[i].position.start.line;
		}

		if ( startLine < 0 || endLine < 0 ) {
			// this isn't a valid segment.
			return '';
		}
		const document = await vault.cachedRead(file);
		const byLine = document.split('\n');
		const section = byLine.slice(startLine, endLine);
		return section.join('\n');
	}

	processNode( node: RootContent ): Section | Collection | Pair | Text | Empty  {
		switch (node.type) {
			case 'heading':
				return this.processHeading(node);
			case 'list':
				return this.processList(node)
			case 'paragraph':
				return this.processParagraph(node);
			// case 'table':
				// TODO
			default:
				return u('text', toMarkdown(node))
		}
	}

	processHeading( heading: Heading ): Section {
		return u('section', {
			depth: heading.depth,
			key: this.cleanKey(toString(heading)),
		}, []);
	}

	processParagraph( paragraph: Paragraph ): Section | Pair | Text {
		const {children} = paragraph;
		if (children[0].type === 'strong') {
			if (children.length === 1) {
				return u('section', {key: toString(paragraph)}, [])
			}
			const key = this.cleanKey(toString(children.shift()));
			const value = this.cleanValue(children.map(child => toMarkdown(child)).join(''));
			return u('pair', {key}, value);
		}

		return u('text', toMarkdown(paragraph))
	}

	processList( list: List ): Collection | Empty {
		const type: ListType = this.getListType(list.children);
		switch (type) {
			case 'row':
				return u(
					'collection',
					list.children
						.map(this.getListItemRow, this)
						.filter((child): child is Row => 'row' === child.type)
				);
			case 'pair':
				return u(
					'collection', {},
					list.children
						.map(this.getListItemPair, this)
						.filter((child): child is Pair => 'pair' === child.type)
				);
			case 'nested':
				return u(
					'collection', {},
					list.children
						.map(this.getListItemNested, this)
						.filter((child): child is Exclude<ReturnType<Marcus['getListItemNested']>, Empty> => 'empty' !== child.type)
				)
			case 'mixed':
				return u(
					'collection', {},
					list.children
						.map(this.getListItem, this)
						.filter((child): child is Exclude<ReturnType<Marcus['getListItem']>, Empty> => 'empty' !== child.type)
				)
			default:
				return this.makeEmptyNode();
		}
	}

	getListItem(listItem: ListItem): Row | Pair | Collection | Section | Empty {
		switch (this.getListItemType(listItem)) {
			case 'pair':
				return this.getListItemPair(listItem);
			case 'row':
				return this.getListItemRow(listItem);
			case 'nested':
				return this.getListItemNested(listItem);
			default:
				return this.makeEmptyNode();
		}
	}

	getListItemPair(listItem: ListItem): Pair | Empty {
		const stringified = (listItem.children[0] as Paragraph).children
			.map((child) => toString(child));
		let key = stringified.shift();
		if (!key || stringified.length === 0) {
			return this.makeEmptyNode();
		}
		let value = stringified.join('');
		key = this.cleanKey(key);
		value = this.cleanValue(value);
		return u('pair', {key}, value);
	}

	getListItemRow(listItem: ListItem): Row | Empty {
		const value = toString(listItem);
		if (value.length === 0) {
			return this.makeEmptyNode();
		}
		return u('row', value);
	}

	getListItemNested(listItem: ListItem): Empty | Pair | Section {
		const {children} = listItem;
		if (children.length === 2 && children[0].type === 'paragraph' && children[1].type === 'list') {
			const key = this.cleanKey(toString(children[0]));
			const value = this.processList(children[1]);
			// if(value.type === 'collection' && value.children.length === 1 && !('children' in value.children[0])) {
			// 	// In this specific case, we can collapse the structure a bit.
			// 	return u('pair', {key, value: value.children[0]});
			// }
			if(value.type !== 'empty') {
				return u('section', {key}, value.children);
			}
		}
		return this.makeEmptyNode();
	}

	getListType( items: Array<ListItem> ): ListType {
		if ( items.length === 0 ) {
			return 'empty';
		}
		const types = items.map(child => this.getListItemType(child));
		const unique = [...new Set(types)];

		if (unique.length === 1 && ['row', 'pair', 'nested', 'empty'].includes(unique[0])) {
			// If all items are the same, we can return early because we know the type.
			// Note that this in the only context in which we can return 'row'.
			return unique[0];
		}

		if (difference(unique, ['row', 'empty']).length === 0) {
			// Arrays can include empty nodes, because they will be removed.
			return 'row';
		}

		if (unique.length > 1 && unique.includes('row')) {
			// Arrays cannot be part of mixed lists.
			return 'invalid';
		}

		if (unique.length > 1 && difference(unique,['pair', 'nested', 'empty']).length === 0) {
			// Mixed lists can only contain types that have their own keys.
			return 'mixed';
		}

		return 'invalid';
	}

	/**
	 * Determine the type of list item we're dealing with.
	 * @param listItem
	 */
	getListItemType( listItem: ListItem ): ListItemType {
		const { children } = listItem;
		if (children.length === 0) {
			return 'empty';
		}
		if ( children.length === 2 && children[0].type === 'paragraph' && children[1].type === 'list' ) {
			return 'nested';
		}
		const childValue = children[0];
		if ( children.length === 1 && childValue.type === 'paragraph' ) {
			// This is either an array or a key-value pair.
			if (childValue.children.length > 1 && childValue.children[0].type === 'strong') {
				return 'pair';
			} else {
				return 'row';
			}
		}
		return 'invalid';
	}

	cleanKey( key: string ): string {
		return key.replace( /^(\W+)|(\W+)$/gm, '' );
	}

	cleanValue( value: string ): string {
		return value.replace( /^(\W+)/gm, '' );
	}

	normalizeKey( key: string ): string {
		return snakeCase(key);
	}

	makeEmptyNode(): Empty {
		return <Empty>u('empty', '');
	}

	// findByKey(key: string, tree: ValidNode): ValidNode {
	// 	tree.value
	// 	if ('children' in tree) {
	// 	}
	// }
}
