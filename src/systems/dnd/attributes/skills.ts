import {Attribute} from './attributes';
import {BasicTypes} from '../../../markdown';
import {Creature} from '../entity/creature';
import {StatName} from '../defs/stat';
import {Mod} from '../../../types/dice';
import {stringsProbablyMatch} from '../../../utils';
import {toString} from 'mdast-util-to-string';

export type SkillName = typeof skillNames[number];

export interface Skill {
    name: SkillName,
    modifier?: Mod,
    stat?: StatName,
    passive?: number,
    proficient?: boolean,
}

const skills: Attribute<'skills'> = {
    key: 'skills',
    handle: (node: BasicTypes): Creature['skills'] => {
        let found: Array<Skill> = [];
        if ('value' in node && typeof node.value === 'string' && isSkill(node.value)) {
            found = [hydrateSkill(node.value as SkillName)];
        } else if ('children' in node) {
            found = node.children.map(n => toString(n))
                .filter((s): s is SkillName => isSkill(s))
                .map(hydrateSkill);
        }
        if (found && found.length > 0) {
            return found;
        }
    }
}

const isSkill = (skill: string): boolean => {
    return !!skillNames.find(s => stringsProbablyMatch(s, skill))
}

const hydrateSkill = (skill: SkillName): Skill => {
    return {
        name: skill,
        stat: skillList[skill],
    }
}

export const skillNames = [
    'athletics',
    'acrobatics',
    'sleight of hand',
    'stealth',
    'arcana',
    'history',
    'investigation',
    'nature',
    'religion',
    'animal handling',
    'insight',
    'medicine',
    'perception',
    'survival',
    'deception',
    'intimidation',
    'performance',
    'persuasion',
] as const;

export const skillList: {[Property in SkillName]: StatName} = {
    'athletics': 'str',
    'acrobatics': 'dex',
    'sleight of hand': 'dex',
    'stealth': 'dex',
    'arcana': 'int',
    'history': 'int',
    'investigation': 'int',
    'nature': 'int',
    'religion': 'wis',
    'animal handling': 'wis',
    'insight': 'wis',
    'medicine': 'wis',
    'perception': 'wis',
    'survival': 'wis',
    'deception': 'cha',
    'intimidation': 'cha',
    'performance': 'cha',
    'persuasion': 'cha',
};

export default skills;
