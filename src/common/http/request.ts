import fetch from 'node-fetch';

export const Post = async <T, B=any>(url: string, body: B) => {
	const res = await fetch(url, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: {
			'Content-Type': 'application/json',
		},
	});
	
  return res.json() as T;
};
