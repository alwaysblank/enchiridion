import {Attribute} from './attributes';
import {cleanString, stringsProbablyMatch} from '../../../utils';
import {BasicTypes} from '../../../markdown';
import {Creature} from '../defs/creature';
import {toString} from 'mdast-util-to-string';

export type Alignment = typeof alignments[number];

export const alignment: Attribute<'alignment'> = {
    key: 'alignment',
    handle: (node: BasicTypes): Creature['alignment'] => {
        return getAlignment(toString(node));
    }
}

export const alignments = ['cg', 'ng', 'lg', 'cn', 'n', 'ln', 'ce', 'ne', 'le'] as const;

export const alignmentMap: Array<{key: Alignment, name: string, aliases: Array<string>}> = [
    {key: 'cg', name: 'chaotic good', aliases: ['chaotic good', 'good chaotic']},
    {key: 'ng', name: 'neutral good', aliases: ['neutral good', 'good neutral', 'good']},
    {key: 'lg', name: 'lawful good', aliases: ['lawful good', 'good lawful']},
    {key: 'cn', name: 'chaotic neutral', aliases: ['chaotic neutral', 'neutral chaotic']},
    {key: 'n', name: 'true neutral', aliases: ['neutral', 'true neutral']},
    {key: 'ln', name: 'lawful neutral', aliases: ['lawful neutral', 'neutral lawful']},
    {key: 'ce', name: 'chaotic evil', aliases: ['chaotic evil', 'evil chaotic']},
    {key: 'ne', name: 'neutral evil', aliases: ['neutral evil', 'evil neutral', 'evil']},
    {key: 'le', name: 'lawful evil', aliases: ['lawful evil', 'evil lawful']},
]

export const getAlignment = (str: string): undefined | Alignment => {
    const found = alignmentMap.find(alignment => {
        if (stringsProbablyMatch(str, alignment.key)) return true;
        if (stringsProbablyMatch(str, alignment.name)) return true;
        if (alignment.aliases.contains(cleanString(str))) return true;
    });
    if (found) {
        return found.key;
    }
}

export default alignment;
