import {getLinkpath, parseLinktext, resolveSubpath, TFile} from 'obsidian';
import {fromMarkdown} from 'mdast-util-from-markdown'
import {Heading as MarkdownHeading, List, ListItem, Paragraph, RootContent} from 'mdast';
import {Parent, Literal, Node} from 'unist';
import {toString} from 'mdast-util-to-string';
import {snakeCase} from 'lodash';
import {toMarkdown} from 'mdast-util-to-markdown';
import {u} from 'unist-builder'
import {normalizeHeadings} from 'mdast-normalize-headings'
import Enchiridion from '../../main';

interface Keyed {
	key: string,
}

export interface SectionNode extends Keyed, Parent {
	type: 'section',
	depth: number,
}

/**
 * This is essentially a {@link KeyedContainerNode} but without any defined children.
 * Generally this means that children will be added to it later.
 * (Is there then a distinction between this and a key-value node...?)
 */
export interface KeyNode extends Keyed {
	type: 'key',
}

export interface CollectionNode<Child extends Node> extends Parent {
	children: Array<Child>
}

export interface KeyedCollectionNode<Child extends Node> extends CollectionNode<Child>, Keyed {}

export interface RowCollectionNode extends CollectionNode<RowNode> {
	type: 'rows',
}

export interface KeyedRowCollectionNode extends KeyedCollectionNode<RowNode> {
	type: 'keyed-rows',
}

export interface PairCollectionNode extends CollectionNode<PairNode> {
	type: 'pairs',
}

export interface KeyedPairCollectionNode extends KeyedCollectionNode<PairNode> {
	type: 'keyed-pairs',
}

export interface KeyedContainerNode extends KeyedCollectionNode<TreeNode> {
	type: 'keyed-container',
}

export interface ContainerNode extends CollectionNode<TreeNode> {
	type: 'container',
}

export interface PairNode extends Literal, Keyed {
	type: 'pair';
}

export interface RowNode extends Literal {
	type: 'row';
}

export interface TextNode extends Literal {
	type: 'text',
}

export interface EmptyNode extends Literal {
	type: 'empty',
	value: '',
}

export type KeyedNode = PairNode | KeyedContainerNode | KeyedPairCollectionNode | KeyedRowCollectionNode | KeyNode | SectionNode;

export type CollectedNode = PairCollectionNode | RowCollectionNode | ContainerNode;

export type ValueNode = EmptyNode | TextNode | RowNode;

export type TreeNode = EmptyNode | ValueNode | KeyedNode | CollectedNode | CollectionNode<TreeNode> | KeyedCollectionNode<TreeNode>;

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
	parseDocument( document: string): TreeNode {
		const tree = fromMarkdown(document)

		// Make sure all heading structures make sense.
		normalizeHeadings(tree);

		// Being parsing the list of nodes.
		const nodes: Array<TreeNode> = tree.children.map(child => this.processNode(child));
		if (nodes.length === 0) {
			return this.makeEmptyNode();
		}
		const stack: Array<SectionNode> = [];
		for (let i = 0; i < nodes.length; i++) {
			let tip = stack.pop();
			const thisNode = nodes[i];
			if('depth' in thisNode) {
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
					if ('children' in thisNode && 'key' in thisNode) {
						tip.children = [...tip.children, thisNode];
					} else if ('children' in thisNode) {
						tip.children = [...tip.children, ...thisNode.children];
					} else if ('key' in thisNode) {
						switch(thisNode.type) {
							case 'pair':
								tip.children
						}
						const consumeChildren = (key: string) => {
							const nextNode = nodes[i+1];
							const collection: KeyedContainerNode = u('keyed-container', {key}, []);
							if (nextNode.type === 'section' && 'depth' in nextNode) {
								collection.children = [this.makeEmptyNode()];
								return collection;
							}
							if (nextNode) {
								i++; // Advance, since we're consuming the next node.
								if ('children' in nextNode && 'key' in nextNode) {
									collection.children = [...collection.children, nextNode];
								} else if ('children' in nextNode) {
									collection.children = [...collection.children, ...nextNode.children]
								} else if ('key' in nextNode) {
									collection.children = [...collection.children, consumeChildren(nextNode.key)]
								}
							}
							return collection;
						}
						tip.children = [...tip.children, consumeChildren(thisNode.key)];
					} else {
						tip.children = [...tip.children, thisNode]
					}
					stack.push(tip);
				}
			}
		}
		if (stack.length < 1) {
			// Nothing to return.
			return this.makeEmptyNode();
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

	processNode( node: RootContent ): TreeNode|EmptyNode {
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
		return u('section', {depth: heading.depth,  key: toString(heading)}, []);
	}

	processParagraph( paragraph: Paragraph ): KeyNode|PairNode|TextNode {
		const {children} = paragraph;
		if (children[0].type === 'strong') {
			if (children.length === 1) {
				return u('key', {key: toString(paragraph)})
			}
			const key = this.cleanKey(toString(children.shift()));
			const value = this.cleanValue(children.map(child => toMarkdown(child)).join(''));
			return u('pair', {key}, value);
		}

		return u('text', toMarkdown(paragraph))
	}

	processList( list: List ): CollectionNode<TreeNode>|EmptyNode {
		const type = this.getListType(list);
		switch (type) {
			case 'array':
				return u(
					'list',
					list.children
						.map(this.getListItemRow, this)
						.filter((child): child is RowNode => 'row' === child.type)
				);
			case 'nested':
				return u(
					'container', {},
					list.children
						.map(this.getListItemNested, this)
						.filter((child): child is KeyedCollectionNode<TreeNode> => 'empty' !== child.type)
				);
			case 'pairs':
				return u(
					'pairs', {},
					list.children
						.map(this.getListItemPair, this)
						.filter((child): child is PairNode => 'pair' === child.type)
				);
			case 'mixed':
				return u(
					'container', {},
					list.children
						.map(this.getListItem, this)
						.filter((child): child is PairNode|RowNode|KeyedCollectionNode<TreeNode> => 'empty' !== child.type)
				);
		}
		return this.makeEmptyNode();
	}

	getListItem(listItem: ListItem): PairNode|RowNode|KeyedCollectionNode<TreeNode>|EmptyNode {
		switch (this.getListItemType(listItem)) {
			case 'pair':
				return this.getListItemPair(listItem);
			case 'nested':
				return this.getListItemNested(listItem);
			case 'row':
				return this.getListItemRow(listItem);
			default:
				return this.makeEmptyNode();
		}
	}

	getListItemPair(listItem: ListItem): PairNode|EmptyNode {
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

	getListItemRow(listItem: ListItem): RowNode|EmptyNode {
		const value = toString(listItem);
		if (value.length === 0) {
			return this.makeEmptyNode();
		}
		return u('row', value);
	}

	getListItemNested(listItem: ListItem): KeyedCollectionNode<TreeNode>|EmptyNode {
		const {children} = listItem;
		if (children.length === 2 && children[0].type === 'paragraph' && children[1].type === 'list') {
			const key = toString(children[0]);
			const value = this.processList(children[1]);
			switch (value.type) {
				case 'pairs':
					return u('keyed-pairs', {key}, value.children);
				case 'list':
					return u('keyed-rows', {key}, value.children);
				case 'container':
					return u('keyed-container', {key}, value.children )
			}
		}
		return this.makeEmptyNode();
	}

	/**
	 * Determine the type of list we're dealing with.
	 * @param list
	 */
	getListType( list: List ): 'array' | 'pairs' | 'nested' | 'empty' | 'mixed' | 'invalid' {
		if ( list.children.length === 0 ) {
			return 'empty';
		}
		const types = list.children.map(child => this.getListItemType(child));
		const unique = [...new Set(types)];

		if ( unique.length === 1 ) {
			// If all items are the same, we can return early because we know the type.
			// Note that this in the only context in which we can return 'array'.
			switch (unique[0]) {
				case 'nested':
					return 'nested';
				case 'row':
					return 'array';
				case 'pair':
					return 'pairs';
				default:
					return 'invalid';
			}
		}

		if ( unique.length > 1 && unique.includes('row') ) {
			// Arrays cannot be part of mixed lists.
			return 'invalid';
		}

		return 'pairs';
	}

	/**
	 * Determine the type of list item we're dealing with.
	 * @param listItem
	 */
	getListItemType( listItem: ListItem ): 'nested' | 'pair' | 'row' | 'unidentified' {
		const { children } = listItem;
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

	makeEmptyNode(): EmptyNode {
		return <EmptyNode>u('empty', '');
	}

	// findByKey(key: string, tree: ValidNode): ValidNode {
	// 	tree.value
	// 	if ('children' in tree) {
	// 	}
	// }
}
