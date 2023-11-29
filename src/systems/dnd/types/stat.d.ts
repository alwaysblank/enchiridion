import {Mod} from '../../../dataTypes/dice';

export interface Stat<Name extends StatName> {
    name: Name,
    score: number,
    mod: Mod,
}

export type StatName = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
