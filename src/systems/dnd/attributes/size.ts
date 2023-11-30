import {cleanString} from '../../../utils';
import {Attribute} from './attributes';
import {BasicTypes} from '../../../markdown';
import {toString} from 'mdast-util-to-string';
import {Creature} from '../defs/creature';

export type Size = typeof sizes[number];

export const sizes = ['microscopic', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'inconceivable'] as const;

export const getSize = (size: string): Size | undefined => {
    return sizes.find(s => s === cleanString(size));
}

const size: Attribute<'size'> = {
    key: 'size',
    handle: (node: BasicTypes): Creature['size'] => getSize(toString(node)),
}

export default size;
