import {createSqlTag} from 'slonik';
import {z} from 'zod';

export const sql = createSqlTag({
	typeAliases: {
		number: z.object({
			number: z.number(),
		}),
		void: z.object({}).strict(),
		string: z.object({string: z.string()}),
	},
});
