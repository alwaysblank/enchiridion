import {Mod} from '../../../dataTypes/dice';
import {StatName} from './stat';

export interface Skill {
    name: string,
    modifier: Mod,
    stat: StatName,
    passive: number,
    proficient: boolean,
}
