import fileType from 'file-type';
import {readFileSync} from 'fs';
import path from 'path';
import {FileAttributes, UploadFile} from './files.type';
import get from 'got';

const urlToBuffer = async (url: string): Promise<Buffer> => {
	const fimg = await get(url, {
		responseType: 'buffer',
		retry: 5,
	}).buffer();

	return fimg;
};

const getFileExt = (file: UploadFile): string => {
	if ('mimetype' in file && file.buffer) {
		switch (file.mimetype) {
			case 'text/plain':
				return 'txt';
			case 'application/msword':
				return 'doc';
			case 'application/vnd.ms-excel':
				return 'xls';
			case 'text/csv':
				return 'csv';
			default:
				const fileTypeResult = fileType(file.buffer);
				return fileTypeResult?.ext ?? '';
		}
	} else if ('buffer' in file && file.buffer) {
		const fileTypeResult = fileType(file.buffer);
		return fileTypeResult?.ext ?? '';
	}

	return '';
};

const getFileAttributes = (file: UploadFile): FileAttributes => {
	let fileBody;
	let fileExt = '';
	let fileUploadName = '';

	if ('path' in file) {
		fileBody = readFileSync(file.path);
		fileExt = path.extname(file.path);
		if (file.saveName) {
			fileUploadName = path.basename(file.path);
		}

		if (file.name) {
			fileUploadName = file.name;
		}
	} else if (file.buffer) {
		fileBody = file.buffer;
		try {
			fileExt = `.${getFileExt(file)}`;
		} catch (error) {}
		if (file.name) {
			fileUploadName = file.name;
		}
	} else {
		throw new Error('invalid file');
	}

	return {fileBody, fileExt, fileUploadName};
};

export {urlToBuffer, getFileExt, getFileAttributes};
