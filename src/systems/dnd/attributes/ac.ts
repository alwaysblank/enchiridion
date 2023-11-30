import {Attribute, genericIntegerHandler} from './attributes';

const ac: Attribute<'ac'> = {
    key: 'ac',
    aliases: ['ac', 'armor class'],
    handle: genericIntegerHandler<'ac'>,
}

export default ac;
