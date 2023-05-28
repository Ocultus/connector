import {createSqlTag} from 'slonik';
import {z} from 'zod';

export const sql = createSqlTag({
	typeAliases: {
		id: z.object({
			id: z.number(),
		}),
		void: z.object({}).strict(),
		string: z.string(),
	},
});
