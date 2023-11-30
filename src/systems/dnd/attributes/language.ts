import {Attribute, genericArrayHandler} from './attributes';

const language: Attribute<'language'>= {
    key: 'language',
    aliases: ['languages', 'speech'],
    handle: genericArrayHandler<'language'>,
}

export default language;
