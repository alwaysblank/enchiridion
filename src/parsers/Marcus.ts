import {App, getLinkpath, HeadingCache, parseLinktext, resolveSubpath, TFile} from 'obsidian';
import {fromMarkdown} from 'mdast-util-from-markdown'
import {Heading as MarkdownHeading, List, ListItem, Root, RootContent} from 'mdast';
import {toString} from 'mdast-util-to-string';
import {get, set, snakeCase} from 'lodash';
import {toMarkdown} from 'mdast-util-to-markdown';
import {replaceKey} from '../utils';

type ParsedHeadingContent = {
	key: string,
	depth: number,
};

type ParsedArrayContent = Array<string>;

type ParsedObjectContent = {
	[index: string]: ParsedContent
};

type ParsedStringContent = string;

/**
 * Exhaustive list of all types that can be in a section.
 */
type SectionContent = Array<string> | string | object;

type SectionMeta = {
	name: string;
}

type ParsedContent = ParsedHeadingContent | ParsedArrayContent | ParsedObjectContent | ParsedStringContent
type ParsedMeta = {
	name?: string,
}
type ParsedType = 'array' | 'object' | 'string' | 'undefined';

class Parsed<T> {
	readonly content: T;
	readonly type: ParsedType;
	readonly meta?: ParsedMeta;


	constructor(content: T, type: ParsedType, meta: ParsedMeta = {}) {
		this.content = content;
		this.type = type;
		this.meta = meta;
	}
}

class ParsedHeading extends Parsed<ParsedHeadingContent> {
	content: ParsedHeadingContent | null = null;
}

class ParsedArray extends Parsed<ParsedArrayContent> {
	content: ParsedArrayContent | null = null;

	constructor(content: ParsedArrayContent) {
		super(content);
	}
}

class ParsedObject extends Parsed<ParsedObjectContent> {
	content: ParsedObjectContent | null = null;
}

class ParsedString extends Parsed<ParsedStringContent> {
	content: ParsedStringContent | null = null;
}

export class Section {
	name: string;
	#content: SectionContent|undefined = undefined;


	constructor({ name }: SectionMeta) {
		this.name = name;
	}

	update( parsedValue: Parsed<ParsedContent> ) {
		switch (parsedValue.type) {
			case 'string':
				this.#content = `${String.isString(this.content) ? `${this.content}\n` : ''}${parsedValue.content as ParsedStringContent}`;
				break;
			case 'array':
				this.#content = [...Array.isArray(this.content) ? this.content : [], ...parsedValue.content as ParsedArrayContent]
				break;
			case 'object':
				this.#content = {...typeof this.content === 'object' ? this.content : {}, ...parsedValue.content as ParsedObjectContent}
				break;
			default:
				console.error('Cannot determine content type, so I don\'t know how to add it.', parsedValue);
				break;
		}
	}

	type() : 'array' | 'string' | 'object' | 'empty' | 'unknown' {
		switch (typeof this.#content) {
			case 'undefined':
				return 'empty';
			case 'string':
				return 'string';
			case 'object':
				return Array.isArray(this.#content) ? 'array' : 'object';
			default:
				return 'unknown';
		}
	}

	get content() {
		return this.#content;
	}
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
		const tree = fromMarkdown(doc)
		return this.parseTree(tree);
	}

	parseTree( tree: Root ) {
		const path: {sectionName: string, depth: number}[] = [];
		const result: object = {};
		const getPath = () => {
			return path.map(p => this.normalizeKey(p.sectionName));
		}
		tree.children.forEach( node => {
			const parsed = this.processNode(node);
			console.log(parsed);
			let thisSegment: any = {};

			if (typeof parsed.content === 'undefined' || parsed.content === null) {
				return;
			}
			if ( parsed.content ) {
				const {depth, sectionName} = parsed.content
				const {depth: currentDepth} = this.getArrayLast( path ) || {};
				if (1 === depth) {
					// Top-level heading is a special case.
					set(result, ['name'], sectionName)
					return;
				}
				if ( path.length > 0 && currentDepth >= depth ) {
					while( this.getArrayLast( path ) && this.getArrayLast( path ).depth >= depth ) {
						path.pop()
					}
				}
				path.push({sectionName, depth});
				thisSegment = new Section({name:sectionName})
			} else {
				const original: string | Section | undefined = get(result, getPath());
				console.log(getPath(), path, result)
				if (original instanceof Section) {
					original.update(parsed);
					thisSegment = original;
				}
				// if (original instanceof Section && typeof original.content !== 'undefined') {
				// 	switch (original.type()) {
				// 		case 'array':
				// 			if (parsed instanceof ParsedArray && Array.isArray(original.content)) {
				// 				thisSegment = [...original.content, ...parsed.content];
				// 			} else {
				// 				console.error('Array sections cannot have mixed content!', {original, parsed})
				// 			}
				// 			break;
				// 		case 'string':
				// 			if (parsed instanceof ParsedString && String.isString(original.content)) {
				// 				thisSegment = `${original.content}\n${parsed.content}`;
				// 			} else {
				// 				console.error('String sections cannot have mixed content!', {original, parsed})
				// 			}
				// 			break;
				// 		case 'object':
				// 			if (parsed instanceof ParsedObject && typeof original.content === 'object') {
				// 				thisSegment = {...original.content, ...parsed.content};
				// 			} else {
				// 				console.error('I got no idea what\'s going on here.', {original, parsed})
				// 			}
				// 			break;
				// 		default:
				// 			console.error('I don\'t know how to handle this type of content.', {original, parsed})
				// 	}
				// }
			}
			set(result, getPath(), thisSegment);
		} );
		return result;
	}


	getArrayLast<T>( arr: Array<T> ): T {
		return arr[arr.length -1];
	}

	mergeObjectArray( arr: Array<{[index: string]: any}|null> ): {[index:string]: any} {
		return arr.reduce((obj: object, item: {[index:string]: any}|null ): object => {
			if (null === item) {
				return obj;
			}
			return {...obj, ...item};
		}, {})
	}

	processNode( node: RootContent ): Parsed<ParsedContent> {
		switch (node.type) {
			case 'list':
				return this.processList(node)
			case 'heading':
				// handle limited special case
				return this.processHeading(node);
			// case 'table':
				// TODO
			default:
				return new Parsed<ParsedStringContent>(toMarkdown(node), 'string');
		}
	}

	processHeading( heading: MarkdownHeading ):  Parsed<ParsedHeadingContent> {
		const name = toString(heading);
		return new Parsed<ParsedHeadingContent>({
			key: this.normalizeKey(this.cleanKey(name)),
			depth: heading.depth,
		}, 'object', {name: toString(heading)});
	}

	processList( list: List ): Parsed<ParsedObjectContent> | Parsed<ParsedArrayContent> {
		const type = this.getListType(list);
		switch (type) {
			case 'array':
				return new Parsed<ParsedArrayContent>(
					list.children.map(child => toString(child)),
					'array'
				);
			case 'key-value':
				return new Parsed<ParsedObjectContent>(
					this.mergeObjectArray(list.children.map(child => this.getListItemKeyValue(child))),
					'object'
				)
			case 'mixed':
				return new Parsed<ParsedObjectContent>(
					this.mergeObjectArray(list.children.map( child => {
					switch (this.getListItemType(child)) {
						case 'key-value':
							return this.getListItemKeyValue(child);
						case 'nested':
							return this.getlistItemNested(child);
						default:
							return null;
					}
				})),
					'object'
				);

		}
		return new Parsed<ParsedObjectContent>({}, 'object');
	}

	getlistItemNested( listItem: ListItem ): null | object {
		const {children} = listItem;
		const key = children[0];
		const nestedList = children[1];
		if (nestedList?.type !== 'list' || typeof key === 'undefined') {
			return null;
		}
		let parsedKey = toString(key);
		parsedKey = this.normalizeKey(this.cleanKey(parsedKey));

		return { [parsedKey]: {...this.processList(nestedList)} }
	}

	getListItemKeyValue( listItem: ListItem ) {
		const content = listItem.children[0] || null;
		if ( ! content || content.type !== 'paragraph' ) {
			// Currently we only support paragraphs and inner warppers.
			return null
		}
		const children = content.children.map( child => toString( child ) );
		let parsedKey = children.shift();
		let parsedValue = children.join(' ');

		if (typeof parsedKey === 'undefined' || parsedValue.length === 0) {
			return null;
		}

		parsedKey = this.cleanKey(parsedKey);
		parsedValue = this.cleanValue(parsedValue);

		return { [parsedKey]: parsedValue };
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

		return 'mixed';
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
