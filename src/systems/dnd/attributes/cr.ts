import {Attribute} from './attributes';
import {BasicTypes} from '../../../markdown';
import {Creature} from '../entity/creature';
import {toString} from 'mdast-util-to-string';
import {toInteger} from 'lodash';

const cr: Attribute<'cr'> = {
    key: 'cr',
    aliases: ['challenge rating', 'challenge', 'challenge rate'],
    handle: (node: BasicTypes): Creature['cr'] => {
        const str = toString(node);
        const found = str.match(/(\d+)\s*[/\\]?\s*(\d)?/);
        if (!found) {
            return 0;
        }
        let result: number;
        switch (typeof found[2]) {
            case 'undefined':
                result = toInteger(found[1]);
                break;
            case 'string':
                result = toInteger(found[1]) / toInteger(found[2]);
                break;
            default:
                // Ganbare!
                result = toInteger(toString(node));
                break;
        }
        return result > 0 ? result : 0;
    },
}

export default cr;
