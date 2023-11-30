import {stringsProbablyMatch} from '../../../utils';
import {Attribute} from './attributes';
import {BasicTypes} from '../../../markdown';
import {Creature} from '../defs/creature';
import {toInteger} from 'lodash';

export const speedTypes = ['walk', 'fly', 'burrow', 'swim', 'jump', 'climb'] as const;

export type SpeedType = typeof speedTypes[number];
export interface Speed {
    name: SpeedType,
    distance: number,
    units?: string,
}

export const isSpeedType = (str: string): boolean => {
    return !!speedTypes.find(s => stringsProbablyMatch(s, str));
}

const speed: Attribute<'speed'> = {
    key: 'speed',
    handle: (node: BasicTypes): Creature['speed'] => {
        const results: {[index: string]: Speed} = {};
        if ('value' in node) {
            let distance = 0;
            let units = 'ft';
            // speed: something is effectively an alias for 'walk'
            if (typeof node.value === 'string') {
                const matches = node.value.match(/(\d+)\s*(\w*)?/);
                if (matches) {
                    distance = toInteger(matches[1]);
                    units = matches[2];
                }
            } else if (typeof node.value === 'number') {
                distance = node.value;
            }
            results.walk = {
                name: 'walk',
                distance,
                units,
            }
        } else if ('children' in node) {
            node.children.map(child => {
                if ('value' in child && 'key' in child && typeof child.key === 'string' && isSpeedType(child.key)) {
                    let distance = 0;
                    let units = 'ft';
                    if (typeof child.value === 'string') {
                        const matches = child.value.match(/(\d+)\s*(\w*)?/);
                        if (matches) {
                            distance = toInteger(matches[1]);
                            units = matches[2];
                        }
                    } else if (typeof child.value === 'number') {
                        distance = child.value;
                    }
                    results[child.key] = {
                        name: child.key as SpeedType,
                        distance,
                        units,
                    }
                }
            })
        }
        return results;
    }
}

export default speed;
