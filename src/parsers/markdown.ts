import {getLinkpath, MetadataCache, parseLinktext, resolveSubpath, TFile, Vault} from 'obsidian';
import {fromMarkdown} from 'mdast-util-from-markdown'
import {Heading, List, ListItem, Paragraph, RootContent} from 'mdast';
import {Parent, Literal} from 'unist';
import {toString} from 'mdast-util-to-string';
import {snakeCase, difference, isEqual} from 'lodash';
import {toMarkdown} from 'mdast-util-to-markdown';
import {u} from 'unist-builder'
import {normalizeHeadings} from 'mdast-normalize-headings'

export interface Keyed {
	key: string,
}

export type BasicTypes = Section | Collection | Pair | Row | Text;

export interface Root extends Parent {
	type: 'root',
	name: string,
	children: Array<BasicTypes>
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
	children: Array<BasicTypes>,
}

/**
 * Generic container for mixed or complex content.
 */
export interface Collection extends Parent {
	type: 'collection',
	children: Array<BasicTypes>,
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


export async function parseFile(file: TFile, vault: Vault, metadataCache: MetadataCache) {
	// Collected all the content chunks for embeds, so we can easily get them later.
	const embedContent = await getEmbedContent(file, vault, metadataCache)

	let doc = await vault.cachedRead( file );

	// Strip the frontmatter from the string. If frontmatter is being used, it is being used elsewhere.
	doc = doc.replace(/---\n.*?\n---/s, '');

	// If there are embeds to replace, use a regex to do so.
	if (embedContent.length > 0) {
		doc = doc.replaceAll(/!\[\[([^#|\]]*)(?:#([^|\]]*))?(?:\|([^\]]*))?]]/g, (original) => {
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
	return parseDocument(doc);
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
export function parseDocument( document: string): Root|Empty {
	const tree = fromMarkdown(document)

	// Make sure all heading structures make sense.
	normalizeHeadings(tree);

	// Begin parsing the list of nodes.
	const nodes = tree.children.map(child => processNode(child));
	if (nodes.length === 0) {
		return makeEmptyNode();
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
		return makeEmptyNode();
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

export async function getEmbedContent(file: TFile, vault: Vault, metadataCache: MetadataCache) {
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
				content = await getSectionText(section.current.heading, thisFile, vault, metadataCache);
			}
		} else {
			content = await vault.cachedRead(thisFile);
		}
		return {original, content};
	}) );
}

export async function getSectionText(name: string, file: TFile, vault: Vault, metadataCache: MetadataCache) {
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

export function processNode( node: RootContent ): Section | Collection | Pair | Text | Empty  {
	switch (node.type) {
		case 'heading':
			return processHeading(node);
		case 'list':
			return processList(node)
		case 'paragraph':
			return processParagraph(node);
		// case 'table':
			// TODO
		default:
			return u('text', toMarkdown(node))
	}
}

export function processHeading( heading: Heading ): Section {
	return u('section', {
		depth: heading.depth,
		key: cleanKey(toString(heading)),
	}, []);
}

export function processParagraph( paragraph: Paragraph ): Section | Pair | Text {
	const {children} = paragraph;
	if (children[0].type === 'strong') {
		if (children.length === 1) {
			return u('section', {key: toString(paragraph)}, [])
		}
		const key = cleanKey(toString(children.shift()));
		const value = cleanValue(children.map(child => toMarkdown(child)).join(''));
		return u('pair', {key}, value);
	}

	return u('text', toMarkdown(paragraph))
}

export function processList( list: List ): Collection | Empty {
	const type: ListType = getListType(list.children);
	switch (type) {
		case 'row':
			return u(
				'collection',
				list.children
					.map(getListItemRow)
					.filter((child): child is Row => 'row' === child.type)
			);
		case 'pair':
			return u(
				'collection', {},
				list.children
					.map(getListItemPair)
					.filter((child): child is Pair => 'pair' === child.type)
			);
		case 'nested':
			return u(
				'collection', {},
				list.children
					.map(getListItemNested)
					.filter((child): child is Exclude<ReturnType<typeof getListItemNested>, Empty> => 'empty' !== child.type)
			)
		case 'mixed':
			return u(
				'collection', {},
				list.children
					.map(getListItem)
					.filter((child): child is Exclude<ReturnType<typeof getListItem>, Empty> => 'empty' !== child.type)
			)
		default:
			return makeEmptyNode();
	}
}

export function getListItem(listItem: ListItem): Row | Pair | Collection | Section | Empty {
	switch (getListItemType(listItem)) {
		case 'pair':
			return getListItemPair(listItem);
		case 'row':
			return getListItemRow(listItem);
		case 'nested':
			return getListItemNested(listItem);
		default:
			return makeEmptyNode();
	}
}

export function getListItemPair(listItem: ListItem): Pair | Empty {
	const stringified = (listItem.children[0] as Paragraph).children
		.map((child) => toString(child));
	let key = stringified.shift();
	if (!key || stringified.length === 0) {
		return makeEmptyNode();
	}
	let value = stringified.join('');
	key = cleanKey(key);
	value = cleanValue(value);
	return u('pair', {key}, value);
}

export function getListItemRow(listItem: ListItem): Row | Empty {
	const value = toString(listItem);
	if (value.length === 0) {
		return makeEmptyNode();
	}
	return u('row', value);
}

export function getListItemNested(listItem: ListItem): Empty | Pair | Section {
	const {children} = listItem;
	if (children.length === 2 && children[0].type === 'paragraph' && children[1].type === 'list') {
		const key = cleanKey(toString(children[0]));
		const value = processList(children[1]);
		// if(value.type === 'collection' && value.children.length === 1 && !('children' in value.children[0])) {
		// 	// In specific case, we can collapse the structure a bit.
		// 	return u('pair', {key, value: value.children[0]});
		// }
		if(value.type !== 'empty') {
			return u('section', {key}, value.children);
		}
	}
	return makeEmptyNode();
}

export function getListType( items: Array<ListItem> ): ListType {
	if ( items.length === 0 ) {
		return 'empty';
	}
	const types = items.map(child => getListItemType(child));
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
export function getListItemType( listItem: ListItem ): ListItemType {
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

export function cleanKey( key: string ): string {
	return key.replace( /^(\W+)|(\W+)$/gm, '' );
}

export function cleanValue( value: string ): string {
	return value.replace( /^(\W+)/gm, '' );
}

export function normalizeKey( key: string ): string {
	return snakeCase(key);
}

export function makeEmptyNode(): Empty {
	return <Empty>u('empty', '');
}

export function keysMatch(key: string, compare: string): boolean {
	return normalizeKey(cleanKey(key)) === normalizeKey(cleanKey(compare));
}

/**
 * Attempts to merge results of {@link Markdown.findByKey()} or {@link Markdown.findByPath()}.
 *
 * This combines all item results in a single set of items, de-duplicating
 * items that appear to be the same. It determines
 *
 * @param results
 */
export function mergeResults(results: Array<BasicTypes>) {
	const compiled: Array<BasicTypes> = [];
	results.forEach((node) => {
		if('value' in node) {
			compiled.push(node)
		} else if ('children' in node) {
			node.children.forEach(node => {
				compiled.push(node);
			});
		}
	});
	return deduplicateNodeList(compiled);
}

/**
 * Remove duplicates from a list.
 *
 * Attempts to preserve order, prioritizing the first occurrence of a
 * value in the list.
 *
 * Note that this is probably not especially fast, so you shouldn't use
 * it for parsing large lists of complex objects.
 *
 * @param list
 */
export function deduplicateNodeList(list: Array<BasicTypes>): Array<BasicTypes> {
	let stack: Array<BasicTypes> = list;
	const deduped: Array<BasicTypes> = [];

	while (stack.length > 0) {
		const current = stack.shift();
		if (typeof current === 'undefined') continue;
		stack = stack.filter(item => !isEqual(current, item))
		deduped.push(current);
	}

	return deduped;
}

export function findByKey(key: string, root: BasicTypes | Root) {
	let results: Array<BasicTypes> = [];
	if ('children' in root) {
		root.children.forEach(node => {
			if ('key' in node && keysMatch(node.key, key)) {
				return results.push(node);
			}
			if('children' in node) {
				const innerResults = findByKey(key, node);
				if (innerResults.length > 0) {
					results = [...results, ...innerResults];
				}
			}
		})
	}
	return results;
}

/**
 * Retrieves results from the specified path.
 *
 * This allows us to limit searching to particular areas, but bear in mind
 * the fill path must match.
 *
 * @param {Array<string>} path A path of key names.
 * @param {BasicTypes | Root} root The tree to search.
 */
export function findByPath(path: Array<string>, root: BasicTypes | Root): Array<BasicTypes> {
	if (path.length === 1) {
		return findByKey(path[0], root);
	}
	let result: Array<BasicTypes> = [];
	const key = path.shift();
	if (!key) return result;
	if('children' in root) {
		root.children.forEach(node => {
			if('key' in node && keysMatch(node.key, key)) {
				if(path.length === 0) {
					// This is the final segment, so is our match.
					return result.push(node);
				}
				if ('children' in node) {
					const innerResults = findByPath(path, node);
					if(innerResults.length > 0) result = [...result,...innerResults];
				}
			}
		})
	}
	return result;
}
