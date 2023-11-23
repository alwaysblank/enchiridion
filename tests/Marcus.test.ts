import {expect, test} from '@jest/globals';
import Marcus from "../src/parsers/Marcus";
import {App} from 'obsidian';

const app = {} as App;

test('load', () => {
	new Marcus( app );
	expect(true).toBe(true);
})

