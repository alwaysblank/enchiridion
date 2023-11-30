export interface Roll {
    dice: Array<Die>,
    mods?: Array<Mod>,
}

export interface Die {
    sides: 2 | 4 | 6 | 8 | 10 | 12 | 20 | 100;
    count: number;
    operator?: '+' | '-',
}

export interface Mod {
    operator?: '+' | '-',
    value: number,
    source?: Array<[string, Mod]>
}
