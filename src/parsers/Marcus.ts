import {App, getLinkpath, parseLinktext, resolveSubpath, TFile} from 'obsidian';
import {fromMarkdown} from 'mdast-util-from-markdown'
import {Heading as MarkdownHeading, List, ListItem, Paragraph, RootContent} from 'mdast';
import {Node, Parent} from 'unist';
import {toString} from 'mdast-util-to-string';
import {snakeCase} from 'lodash';
import {toMarkdown} from 'mdast-util-to-markdown';
import {u} from 'unist-builder'
import {normalizeHeadings} from 'mdast-normalize-headings'

export interface SectionNode extends Node, Parent {
	type: 'section',
	depth: number,
}

export interface KeyNode extends Node, Parent {
	type: 'key',
}

export interface ValueNode extends Node, Parent {
	type: 'value',
}

export interface KeyValueNode extends Node, Parent {
	type: 'key-value',
}

export interface TextNode extends Node {
	type: 'text',
}

export interface EmptyNode extends Node {
	type: 'empty',
}

export type ValidNode = SectionNode|KeyNode|ValueNode|KeyValueNode|TextNode|EmptyNode;

export default class Marcus {
	app: App;
	constructor( app: App ) {
		this.app = app;
	}

	async parseFile( file: TFile) {
		// Collected all the content chunks for embeds so we can easily get them later.
		const embedContent = await this.getEmbedContent(file)

		let doc = await this.app.vault.cachedRead( file );

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

		// Parse document that has been enhanced with includes.
		return this.parseDocument(doc);
	}


	/**
	 * Returns a simplified tree containing data parsed from Markdown.
	 *
	 * Embedded notes are inserted into the file before parsing, so their
	 * content will appear in this tree.
	 */
	parseDocument( document: string): Node {
		// Strip the frontmatter from the string. If frontmatter is being used, it is being used elsewhere.
		const doc = document.replace(/---\n.*?\n---/s, '');
		const tree = fromMarkdown(doc)

		// Make sure all heading structures make sense.
		normalizeHeadings(tree);

		// Being parsing the list of nodes.
		const nodes: Array<ValidNode> = tree.children.map(child => this.processNode(child));
		if (nodes.length === 0) {
			return u('empty');
		}
		const stack: Array<SectionNode> = [];
		for (let i = 0; i < nodes.length; i++) {
			let tip = stack.pop();
			const thisNode = nodes[i];
			if(thisNode.type === 'section') {
				const section: SectionNode = thisNode;
				if (tip) {
					while (tip.depth >= section.depth && stack.length > 0) {
						const parent = stack.pop() as SectionNode;
						parent.children.push(tip);
						tip = parent;
					}

					// We're a level below, so add as a child and proceed.
					stack.push(tip);
					stack.push(section);
				} else {
					// This is the top level.
					stack.push(section);
				}
			} else {
				if (tip) {
					if (thisNode.type === 'value' || thisNode.type === 'key-value') {
						tip.children = [...tip.children, ...thisNode.children]
					} else if (thisNode.type === 'key') {
						const nextNode = nodes[i+1];
						if (nextNode && nextNode.type !== 'section') {
							if (nextNode.type === 'text' || nextNode.type === 'empty') {
								thisNode.children = [nextNode]
							} else {
								thisNode.children = nextNode.children
							}
							tip.children = [...tip.children, thisNode]
							i++;
						}
					} else {
						tip.children = [...tip.children, thisNode]
					}
					stack.push(tip);
				}
			}
		}
		if (stack.length < 1) {
			// Nothing to return.
			return u('empty');
		}
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
		return stack[0];
	}

	async getEmbedContent( file: TFile ) {
		const metacache = this.app.metadataCache.getFileCache(file);
		if (!metacache) {
			return Promise.resolve([]);
		}
		return Promise.all( (metacache.embeds || []).map( async embed => {
			const {original, link} = embed;
			const {subpath} = parseLinktext(link);
			let content = '';
			const thisFile = this.app.metadataCache.getFirstLinkpathDest(getLinkpath(link), file.path);
			if (!thisFile) {
				return {original, content}
			}
			if (subpath) {
				const section = resolveSubpath(this.app.metadataCache.getFileCache(thisFile) || {}, subpath)
				if (section.type === 'heading') {
					content = await this.getSectionText(section.current.heading, thisFile);
				}
			} else {
				content = await this.app.vault.cachedRead(thisFile);
			}
			return {original, content};
		}) );
	}

	async getSectionText( name: string, file: TFile ) {
		const {headings} = this.app.metadataCache.getFileCache(file) || {};
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
		const document = await this.app.vault.cachedRead(file);
		const byLine = document.split('\n');
		const section = byLine.slice(startLine, endLine);
		return section.join('\n');
	}


	processNode( node: RootContent ): ValidNode {
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

	processHeading( heading: MarkdownHeading ): SectionNode {
		return u('section', {depth: heading.depth,  children: []}, toString(heading));
	}

	processParagraph( paragraph: Paragraph ): KeyNode|KeyValueNode|TextNode {
		const {children} = paragraph;
		if (children[0].type === 'strong') {
			if (children.length === 1) {
				return u('key', {children: []}, toString(paragraph))
			}
			const key = toString(children.shift());
			const value = children.map(child => toMarkdown(child)).join('');
			return u('key-value', [u('pair',{key, value})]);
		}

		return u('text', toMarkdown(paragraph))
	}

	processList( list: List ): ValueNode|KeyValueNode|EmptyNode {
		const type = this.getListType(list);
		switch (type) {
			case 'array':
				return u('value', list.children.map(node => u('row', toString(node))))
			case 'key-value':
				return u(
					'key-value', list.children.map(node => {
						const {key, value} = this.getListItemKeyValue(node) || {};
						return u('pair', {key, value})
					})
				)
		}
		return u('empty');
	}

	getListItemKeyValue( listItem: ListItem ): {key: string, value: string|ValueNode|KeyValueNode|EmptyNode} {
		const {children} = listItem;
		let key, value;
		if (children.length > 1) {
			// this is nested.
			key = this.cleanKey(toString(children[0]));
			value = this.processList(children[1] as List);
		} else {
			// this is not nested.
			const text = (children[0] as Paragraph).children.map( child => toString( child ) );
			key = text.shift() || '';
			key = this.cleanKey(key);
			value = this.cleanValue(text.join(' '));
		}
		return {key, value};
	}

	/**
	 * Determine the type of list we're dealing with.
	 * @param list
	 */
	getListType( list: List ): 'array' | 'key-value' | 'nested' | 'empty' | 'mixed' | 'invalid' {
		if ( list.children.length === 0 ) {
			return 'empty';
		}
		const types = list.children.map(child => this.getListItemType(child));
		const unique = [...new Set(types)];

		if ( unique.length === 1 ) {
			// If all items are the same, we can return early because we know the type.
			// Note that this in the only context in which we can return 'array'.
			if ( unique[0] === 'unidentified' ) {
				return 'invalid';
			}
			return unique[0];
		}

		if ( unique.length > 1 && unique.includes('array') ) {
			// Arrays cannot be part of mixed lists.
			return 'invalid';
		}

		return 'key-value';
	}

	/**
	 * Determine the type of list item we're dealing with.
	 * @param listItem
	 */
	getListItemType( listItem: ListItem ): 'nested' | 'key-value' | 'array' | 'unidentified' {
		const { children } = listItem;
		if ( children.length === 2 && children[0].type === 'paragraph' && children[1].type === 'list' ) {
			return 'nested';
		}
		const childValue = children[0];
		if ( children.length === 1 && childValue.type === 'paragraph' ) {
			// This is either an array or a key-value pair.
			if (childValue.children.length > 1 && childValue.children[0].type === 'strong') {
				return 'key-value';
			} else {
				return 'array';
			}
		}
		return 'unidentified';
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
}
