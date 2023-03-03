import {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import {v4 as uuidv4} from 'uuid';
import {lookup} from 'mime-types';
import {getFileAttributes, urlToBuffer} from './utils/files';
import {UploadFileResponse} from './utils/files.type';
import {CloudStorageControllerOptions} from './cloud-storage.type';

export class CloudStorageController {
	private client: S3Client;
	private bucket: string;
	constructor(readonly options: CloudStorageControllerOptions) {
		const {bucket, endpoint, accessKeyId, secretAccessKey, region} = options;
		const s3Options = {
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
			region,
			endpoint,
		};

		this.bucket = bucket;
		this.client = new S3Client(s3Options);
	}

	public async uploadObject(
		file: UploadFileResponse,
		route: string,
	): Promise<string> {
		if (typeof route !== 'string') {
			throw new Error('route (2nd argument) is not defined');
		}

		if ('url' in file && file.url) {
			const buffer = await urlToBuffer(file.url);
			file = {
				...file,
				buffer,
			};
		}

		const fileAttributes = await getFileAttributes(file);
		const {fileBody, fileExt} = fileAttributes;
		let {fileUploadName} = fileAttributes;

		route = route.replace(/\\/g, '/');

		if (route.slice(-1) !== '/') {
			route += '/';
		}

		if (route[0] === '/') {
			route = route.slice(1);
		}

		if (!fileUploadName) {
			const uniqueName = uuidv4();
			fileUploadName = `${uniqueName}${fileExt}`;
		}

		const Key = `${route}${fileUploadName}`;
		const {bucket} = this;
		const ContentType = lookup(fileUploadName) || 'text/plain';

		const putObjectCommand = new PutObjectCommand({
			Bucket: bucket,
			Key,
			Body: fileBody,
			ContentType,
		});

		try {
			const objectUploadResponse = await this.client.send(putObjectCommand);
			if (objectUploadResponse.$metadata.httpStatusCode === 200) {
				const url = [this.options.endpoint, this.options.bucket, Key].join('/');
				return url;
			}
		} catch (error) {
			console.error({
				event: this.uploadObject,
				message: (error as Error).message,
			});
		}

		return '';
	}

	public async deleteObject(key: string): Promise<void> {
		const {bucket} = this;

		const deleteObjectCommand = new DeleteObjectCommand({
			Bucket: bucket,
			Key: key,
		});

		try {
			await this.client.send(deleteObjectCommand);
		} catch (error) {
			console.error({
				event: this.uploadObject,
				message: (error as Error).message,
			});
		}
	}
}
