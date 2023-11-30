import {Attribute} from './attributes';
import {BasicTypes} from '../../../markdown';
import {Creature} from '../defs/creature';
import {toString} from 'mdast-util-to-string';
import {toInteger} from 'lodash';

const source: Attribute<'source'> = {
    key: 'source',
    handle: (node: BasicTypes): Creature['source'] => {
        const result: Creature['source'] = {};
        if ('value' in node) {
            result.name = toString(node);
        } else if ('children' in node) {
            node.children.forEach(child => {
                if ('key' in child && 'value' in child) {
                    switch (child.key) {
                        case 'name':
                            result.name = toString(child);
                            return;
                        case 'page':
                            try {
                                const url = new URL(toString(child));
                                result.page = url;
                            } catch (e) {
                                result.page = toInteger(child.value);
                            }
                            return;
                    }
                }
            })
        }
        return result;
    }
}

export default source;
