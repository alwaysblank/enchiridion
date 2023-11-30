import {Mod} from '../../../dataTypes/dice';

export interface Stat {
    name: StatName,
    score: number,
    mod: Mod,
}

export type StatName = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
