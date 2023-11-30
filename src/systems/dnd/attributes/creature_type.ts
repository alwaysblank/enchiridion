import {Attribute} from './attributes';
import {BasicTypes} from '../../../markdown';
import {Creature} from '../defs/creature';
import {toString} from 'mdast-util-to-string';

const creatureType: Attribute<'creature_type'> = {
    key: 'creature_type',
    aliases: ['type', 'creature type', 'npc type', 'classification'],
    handle: (node: BasicTypes): Creature['creature_type'] => toString(node),
}

export default creatureType;
