import {visitParents} from 'unist-util-visit-parents'
import {Creature} from '../defs/creature';
import {
    DocumentTree,
    normalizeKey
} from '../../../markdown';
import {toString} from 'mdast-util-to-string';
import attributes, {Attribute} from '../attributes/attributes';

export function creature(document: DocumentTree): Partial<Creature> {
    const name = document.name;
    const creature: Partial<Creature> = {name};
    const aliasLookup: {[index: string]: Attribute<keyof Creature>} = {};
    attributes.forEach( (attr: Attribute<keyof Creature>) => {
        const aliases: Array<string> = attr.aliases || [];
        [...aliases, attr.key as string].forEach(alias => aliasLookup[normalizeKey(alias)] = attr)
    })
    visitParents(document, (node, parents) => {
        if ('key' in node) {
            const key = normalizeKey(node.key);
            const attr: Attribute<keyof Creature> | null = aliasLookup[key] || null;
            if (attr) {
                const handler = attr.handle || toString;
                const value = handler(node, parents);
                if (value) {
                    if (creature[attr.key]) {
                        // If this exists, assume we want to append.
                        if (Array.isArray(creature[attr.key]) && Array.isArray(value)) {
                            // We should also deduplicate array values, at least naively.
                            creature[attr.key] = [...new Set([...creature[attr.key] as Array<any>, ...value])]
                            return;
                        } else if (typeof creature[attr.key] === 'object' && typeof value === 'object') {
                            creature[attr.key] = {...creature[attr.key] as object, ...value}
                            return;
                        }
                    }
                    creature[attr.key] = value;
                }
            }
        }
    });

    return creature;
}

