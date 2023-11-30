import {Attribute, genericArrayHandler} from './attributes';

const environment: Attribute<'environment'>= {
    key: 'environment',
    aliases: ['env', 'environs'],
    handle: genericArrayHandler<'environment'>,
}

export default environment;
