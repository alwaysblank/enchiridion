import {App, getLinkpath, HeadingCache, parseLinktext, resolveSubpath, TFile} from 'obsidian';
import {fromMarkdown} from 'mdast-util-from-markdown'
import {Heading, Heading as MarkdownHeading, List, ListItem, Paragraph, RootContent} from 'mdast';
import {Node, Parent} from 'unist';
import {toString} from 'mdast-util-to-string';
import {get, set, snakeCase} from 'lodash';
import {toMarkdown} from 'mdast-util-to-markdown';
import {u} from 'unist-builder'


type Section = Node & Parent & {
	depth: number,
}

export default class Marcus {
	app: App;
	constructor( app: App ) {
		this.app = app;
	}

	async parseFile( file: TFile, parseFrontmatter = false ) {
		const {embeds} = this.app.metadataCache.getFileCache(file) || {};
		let doc = await this.app.vault.cachedRead( file );

		// Collected all the content chunks for embeds so we can easily get them later.
		const embedContent = await Promise.all( (embeds || []).map( async embed => {
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

		// If there are embeds to replace, use a regex to do so.
		if (embedContent.length > 0) {
			doc = doc.replaceAll(/(?:!\[\[([^#|\]]*)(?:#([^|\]]*))?(?:\|([^\]]*))?\]\])/g, (original) => {
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

	parseDocument( document: string, parseFrontmatter = false ) {
		let doc = document;
		if ( ! parseFrontmatter ) {
			// Strip the frontmatter from the string.
			doc = doc.replace(/---\n.*?\n---/s, '')
		}
		const tree = fromMarkdown(doc);
		const nodes = tree.children.map(child => this.processNode(child));
		const stack: Array<Section> = [];
		for (let i = 0; i < nodes.length; i++) {
			let tip = stack.pop();
			if(nodes[i].type === 'heading') {
				const section: Section = {...(nodes[i] as Node & {depth: number}), children: []};
				if (tip) {
					while (tip.depth >= section.depth) {
						const parent = stack.pop() as Section;
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
				// console.log(tip, stack);
				if (tip) {
					tip.children.push(nodes[i]);
					stack.push(tip);
				} else {
					console.error('Expected a parent but could not find one!');
				}
			}
		}
		if (stack.length < 1) {
			// Nothing to return.
			return null;
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

		// console.log(this.extractAllSections(u('root', tree.children.map(child => this.processNode(child)))));
		// console.log(this.extractAllSections(tree))
		// const indexOf = tree.children.findIndex(node => {
		// 	return node.type === 'heading' && toString(node) === 'Actions';
		// })
		// if ( indexOf >= 0) {
		// 	const sliced = tree.children.slice(indexOf);
		// 	const section = [];
		// 	let i = 1;
		// 	while (sliced[i] && (sliced[i].type !== 'heading' || sliced[i].depth > tree.children[indexOf].depth)) {
		// 		section.push(sliced[i])
		// 		i++
		// 	}
		// }
	}


	extractAllSections( tree ) {
		const nodes = tree.children;
		const sections = new Map<RootContent, Array<RootContent>>()
		let openSections: Array<Heading> = [];
		for (let i = 0; i < nodes.length; i++) {
			if(nodes[i].type === 'heading') {
				// Remove 'closed' headings.
				openSections = openSections.filter(heading => (nodes[i] as Heading).depth > heading.depth)
				openSections.push(nodes[i] as Heading);
				continue;
			}
			openSections.map(heading => {
				let sectionContent = sections.get(heading);
				if (!sectionContent) {
					sectionContent = [];
				}
				sectionContent.push(nodes[i])
				sections.set(heading, sectionContent);
			})
		}
		return sections;
	}

	getArrayLast<T>( arr: Array<T> ): T|undefined {
		return arr[arr.length -1] || undefined;
	}

	mergeObjectArray( arr: Array<{[index: string]: any}|null> ): {[index:string]: any} {
		return arr.reduce((obj: object, item: {[index:string]: any}|null ): object => {
			if (null === item) {
				return obj;
			}
			return {...obj, ...item};
		}, {})
	}

	processNode( node: RootContent ): Node {
		switch (node.type) {
			case 'list':
				return this.processList(node)
			case 'heading':
				// handle limited special case
				return this.processHeading(node);
			// case 'table':
				// TODO
			default:
				return u('text', toMarkdown(node))
		}
	}

	processHeading( heading: MarkdownHeading ) {
		return u('heading', {depth: heading.depth}, toString(heading));
	}

	processList( list: List ): Node {
		const type = this.getListType(list);
		switch (type) {
			case 'array':
				return u('array', list.children.map(node => u('row', toString(node))))
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

	getListItemKeyValue( listItem: ListItem ): {key: string, value: string|Node} {
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
