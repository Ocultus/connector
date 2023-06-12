import {TRPCError} from '@trpc/server';
import {IdInput} from '../routes/types/base.input';
import {middleware} from '../trpc/middleware';
import {RequestRepository} from '../repository/request.repository';

export const isCustomerRequestGuard = middleware(async opts => {
	const {
		ctx: {db, user},
		next,
		rawInput,
	} = opts;

	const result = IdInput.safeParse(rawInput);
	if (!result.success || !user) {
		throw new TRPCError({code: 'BAD_REQUEST'});
	}

	const customerId = user.id;
	const requestId = result.data.id;
	const isCustomerGateway = await RequestRepository.checkCustomerIdentity(
		db,
		requestId,
		customerId,
	);
	if (!isCustomerGateway) {
		throw new TRPCError({code: 'FORBIDDEN', message: ''});
	}

	return next();
});
