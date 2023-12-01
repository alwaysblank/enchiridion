import {Attribute} from './attributes';
import {BasicTypes} from '../../../markdown';
import {Creature} from '../entity/creature';
import {toString} from 'mdast-util-to-string';

const creatureTags: Attribute<'creature_tags'> = {
    key: 'creature_tags',
    aliases: ['tags', 'creature tags', 'subtype', 'subtypes', 'subrace', 'subspecies'],
    handle: (node: BasicTypes): Creature['creature_tags'] => {
        const result: Array<string> = [];
        if ('value' in node) {
            result.push(toString(node));
        } else if ('children' in node) {
            node.children.forEach(child => {
                result.push(toString(child));
            })
        }
        return result;
    }
}

export default creatureTags;
