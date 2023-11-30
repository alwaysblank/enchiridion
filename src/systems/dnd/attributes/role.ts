import {Attribute} from './attributes';
import {toString} from 'mdast-util-to-string';
import {BasicTypes} from '../../../markdown';

const role: Attribute<'role'> = {
    key: 'role',
    handle: (node: BasicTypes) => toString(node),
}

export default role;
