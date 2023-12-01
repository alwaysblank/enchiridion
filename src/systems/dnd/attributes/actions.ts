import {Attribute, genericActionHandler} from './attributes';

export interface Action {
    name: string,
    type?: string,
    text: string,
}

export const actions: Attribute<'actions'> = {
    key: 'actions',
    handle: genericActionHandler<'actions'>,
}

export default actions;
