import {App} from 'obsidian';
import Enchiridion from '../main';

export type MessageLevel = 'log' | 'info' | 'debug' | 'warning' | 'error';

export default class Debug {
	app: App;
	plugin: Enchiridion;

	constructor(app: App, plugin: Enchiridion) {
		this.app = app;
		this.plugin = plugin;
	}

	shouldLog(): boolean {
		return this.plugin.settings.debug.log;
	}

	msg( message: string, level: MessageLevel = 'log', ...data: any[] ): void {
		/**
		 * Only certain log types are suppressible: We should always be showing
		 * errors and warnings.
		 */
		if (['log', 'info', 'debug'].includes(level) && !this.shouldLog()) {
			return;
		}
		const args = [message, ...data];
		switch (level) {
			case 'log':
				console.log(...args);
				break;
			case 'info':
				console.info(...args);
				break;
			case 'debug':
				console.debug(...args);
				break;
			case 'warning':
				console.warn(...args);
				break;
			case 'error':
				console.error(...args);
				break;
		}
	}

	log( message: string, ...data: any[] ): void {
		this.msg(message, 'log', ...data);
	}

	info( message: string, ...data: any[] ): void {
		this.msg(message, 'info', ...data);
	}

	debug( message: string, ...data: any[] ): void {
		this.msg(message, 'debug', ...data);
	}

	warning( message: string, ...data: any[] ): void {
		this.msg(message, 'warning', ...data);
	}

	error( message: string, ...data: any[] ): void {
		this.msg(message, 'error', ...data);
	}
}
