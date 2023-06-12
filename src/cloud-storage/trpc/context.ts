import _ from 'lodash';
import {configModule} from '../../common/config/config.module';
import {CloudStorageController} from '../cloud-storage.controller';
import {inferAsyncReturnType} from '@trpc/server';

const initCloudStorageController = _.memoize(() => {
	const {keyId, key, bucket, region, endpoint} =
		configModule.getCloudStorageConfig();
	return new CloudStorageController({
		bucket,
		region,
		endpoint,
		accessKeyId: keyId,
		secretAccessKey: key,
	});
});

export async function createContext() {
	const controller = initCloudStorageController();

	return {
		controller,
	};
}

export type Context = inferAsyncReturnType<typeof createContext>;
