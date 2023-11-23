import {Token, tokenize} from '@airjp73/dice-notation';

export default class DiceDefinition {
	tokens: Token[];
	constructor( value: string|DiceDefinition ) {
		if ( typeof value === 'string' ) {
			this.tokens = this.parseString(value);
		} else {
			this.tokens = value.tokens;
		}
	}

	parseString( value: string ): Token[] {
		return tokenize(value)
	}

	toString(): string {
		return this.tokens.map(t => t.content).join(' ');
	}
}
