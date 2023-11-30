import {Attribute, genericIntegerHandler} from './attributes';

const hp: Attribute<'hp'> = {
    key: 'hp',
    aliases: ['hp', 'hit points'],
    handle: genericIntegerHandler<'hp'>,
}

export default hp;
