import {EFile} from '../../files';
import {creature} from './entity/creature';

export function ingest(document: EFile | null) {
    if (!document || !('settings' in document)) {
        return;
    }
    switch (document.settings.type) {
        case 'creature':
            return creature(document.tree);
    }
}
