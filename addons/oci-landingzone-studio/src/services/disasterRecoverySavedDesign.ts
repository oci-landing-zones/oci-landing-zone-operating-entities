import type { LzModel } from '../model/types';
import type { DrDesignDraft } from './disasterRecoveryDesign';
import type { LzOutputs, LzRecord } from './lzStore';
import { serializeConfig } from './lzConfig';

export function drDesignFingerprint(model: LzModel, draft: DrDesignDraft): string {
  return JSON.stringify({ home: serializeConfig(model), draft });
}

export function isCurrentDrOutputSet(record: LzRecord, outputs: LzOutputs): boolean {
  return !!record.disasterRecovery
    && outputs.config === drDesignFingerprint(record.model, record.disasterRecovery.draft)
    && ['Home/config.jsonnet', 'Home/network.json', 'DR/config.jsonnet', 'DR/network.json'].every((path) => Object.hasOwn(outputs.files, path))
    && !['Home/network_pre.json', 'DR/network_pre.json'].some((path) => Object.hasOwn(outputs.files, path));
}
