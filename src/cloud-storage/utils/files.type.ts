type DefaultIgnoreList = string[];

type UploadUrlBuffer = {
	name?: string;
	url?: string;
	mimetype?: string;
};

type UploadFileBuffer = {
	name?: string;
	buffer?: Buffer;
	mimetype?: string;
};

type UploadFilePath = {
	name?: string;
	path: string;
	saveName?: boolean;
	ignore?: DefaultIgnoreList;
};

type UploadFile = UploadFileBuffer | UploadFilePath;
type UploadFileResponse = UploadFileBuffer | UploadFilePath | UploadUrlBuffer;

type FileAttributes = {
	fileBody: Buffer;
	fileExt: string;
	fileUploadName: string;
};

export type {
	UploadFile,
	UploadFileResponse,
	UploadFileBuffer,
	DefaultIgnoreList,
	FileAttributes,
};
