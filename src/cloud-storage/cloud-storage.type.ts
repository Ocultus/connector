export type CloudStorageControllerOptions = {
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	region: string;
	bucket: string;
};

export type UploadFile = {
	buffer?: Uint8Array;
	url?: string;
	mimetype?: string;
	route: string;
}

export type UploadFileResponseBody = {
	url: string
}

